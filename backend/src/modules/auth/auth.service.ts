import bcrypt from 'bcryptjs';
import { config } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { authRepository } from './auth.repository.js';
import { generateToken, generateRefreshToken } from '../../middleware/auth.js';
import {
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} from '../../middleware/errorHandler.js';
import { UserRole, UserStatus, JWTPayload } from '../../types/index.js';
import { getCollection, Collections } from '../../infrastructure/database/index.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export interface LoginResult {
  accessToken: string;
  refreshToken?: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
    firstName?: string;
    lastName?: string;
    companyId?: string;
  };
}

export class AuthService {

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<LoginResult> {
    const user = await authRepository.findByEmail(email);

    if (!user) {
      // Prevent timing attacks - still hash even if user not found
      await bcrypt.compare(password, '$2b$10$invalid.hash.for.timing.attack.prevention');
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check if account is locked
    if (user.locked_until && user.locked_until > new Date()) {
      const minutesLeft = Math.ceil(
        (user.locked_until.getTime() - Date.now()) / 60000
      );
      throw new ForbiddenError(
        `Account locked due to too many failed attempts. Try again in ${minutesLeft} minute(s).`
      );
    }

    // Check account status
    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenError('Account is inactive or suspended');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      const attempts = await authRepository.incrementFailedAttempts(user._id!.toString());

      if (attempts >= MAX_FAILED_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60000);
        await authRepository.lockAccount(user._id!.toString(), lockUntil);
        logger.warn({ userId: user._id, attempts }, 'Account locked due to failed attempts');
        throw new ForbiddenError(
          `Too many failed attempts. Account locked for ${LOCKOUT_MINUTES} minutes.`
        );
      }

      throw new UnauthorizedError('Invalid email or password');
    }

    // Get company association for non-super-admin users
    let companyId: string | undefined;
    if (user.role !== UserRole.SUPER_ADMIN) {
      const companyUser = await getCollection(Collections.COMPANY_USERS).findOne({
        user_id: user._id!.toString(),
        status: 'active',
      });
      companyId = companyUser?.company_id?.toString();
    }

    // Update last login
    await authRepository.updateLastLogin(user._id!.toString());

    // Write audit log (non-blocking)
    const { writeAuditLog } = await import('../audit/audit.logger.js');
    writeAuditLog({
      company_id: companyId,
      user_id: user._id!.toString(),
      action: 'auth.login',
      description: `User logged in: ${user.email}`,
    });

    // Generate tokens
    const payload: JWTPayload = {
      userId: user._id!.toString(),
      email: user.email,
      role: user.role,
      companyId,
    };

    const accessToken = generateToken(payload);
    const refreshToken = config.jwt.refreshSecret
      ? generateRefreshToken(payload)
      : undefined;

    logger.info({
      userId: user._id,
      role: user.role,
      companyId,
    }, 'User logged in successfully');

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id!.toString(),
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        companyId,
      },
    };
  }

  /**
   * Create super admin (called on first startup)
   */
  async createSuperAdmin(email: string, password: string): Promise<void> {
    const exists = await authRepository.existsByEmail(email);
    if (exists) {
      logger.info('Super admin already exists, skipping creation');
      return;
    }

    if (password.length < 8) {
      throw new ValidationError('Admin password must be at least 8 characters');
    }

    const passwordHash = await bcrypt.hash(password, config.security.bcryptRounds);

    await authRepository.create({
      email,
      password_hash: passwordHash,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      email_verified: true,
      failed_login_attempts: 0,
      deleted_at: null,
    });

    logger.info({ email }, 'Super admin created');
  }

  /**
   * Register a new company user (done by super admin or company admin)
   */
  async registerUser(data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    role?: UserRole;
    companyId?: string;
  }): Promise<{ id: string; email: string }> {
    const exists = await authRepository.existsByEmail(data.email);
    if (exists) {
      throw new ConflictError('A user with this email already exists');
    }

    if (data.password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters');
    }

    const passwordHash = await bcrypt.hash(data.password, config.security.bcryptRounds);

    const user = await authRepository.create({
      email: data.email,
      password_hash: passwordHash,
      first_name: data.firstName,
      last_name: data.lastName,
      role: data.role || UserRole.COMPANY_USER,
      status: UserStatus.ACTIVE,
      email_verified: false,
      failed_login_attempts: 0,
      deleted_at: null,
    });

    // If company provided, link user to company
    if (data.companyId) {
      await getCollection(Collections.COMPANY_USERS).insertOne({
        company_id: data.companyId,
        user_id: user._id!.toString(),
        role: data.role || UserRole.COMPANY_USER,
        status: 'active',
        joined_at: new Date(),
        created_at: new Date(),
      });
    }

    logger.info({ email: data.email, role: data.role }, 'New user registered');

    return {
      id: user._id!.toString(),
      email: user.email,
    };
  }

  /**
   * Change password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await authRepository.findById(userId);
    if (!user) throw new UnauthorizedError('User not found');

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) throw new UnauthorizedError('Current password is incorrect');

    if (newPassword.length < 8) {
      throw new ValidationError('New password must be at least 8 characters');
    }

    const newHash = await bcrypt.hash(newPassword, config.security.bcryptRounds);
    await authRepository.updatePassword(userId, newHash);

    logger.info({ userId }, 'Password changed successfully');
  }
}

export const authService = new AuthService();
