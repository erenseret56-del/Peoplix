import { FastifyInstance } from 'fastify';
import { authService } from './auth.service.js';
import { loginSchema, registerSchema, changePasswordSchema } from './auth.schema.js';
import { authenticateJWT } from '../../middleware/auth.js';
import { requireSuperAdmin } from '../../middleware/auth.js';
import { ValidationError } from '../../middleware/errorHandler.js';

export async function authRoutes(fastify: FastifyInstance) {

  /**
   * POST /api/auth/login
   * Public - login with email and password
   */
  fastify.post('/login', { config: { rateLimit: { max: 10, timeWindow: 15 * 60 * 1000 } } }, async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid input', parsed.error.errors);
    }

    const result = await authService.login(
      parsed.data.email,
      parsed.data.password
    );

    return reply.status(200).send({
      success: true,
      data: result,
    });
  });

  /**
   * POST /api/auth/register
   * Protected - super admin only
   */
  fastify.post(
    '/register',
    { preHandler: [authenticateJWT, requireSuperAdmin] },
    async (request, reply) => {
      const parsed = registerSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid input', parsed.error.errors);
      }

      const result = await authService.registerUser(parsed.data);

      return reply.status(201).send({
        success: true,
        data: result,
        message: 'User registered successfully',
      });
    }
  );

  /**
   * POST /api/auth/change-password
   * Protected - any authenticated user
   */
  fastify.post(
    '/change-password',
    { preHandler: [authenticateJWT] },
    async (request, reply) => {
      const parsed = changePasswordSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid input', parsed.error.errors);
      }

      const user = (request as any).user;

      await authService.changePassword(
        user.id,
        parsed.data.currentPassword,
        parsed.data.newPassword
      );

      return reply.status(200).send({
        success: true,
        message: 'Password changed successfully',
      });
    }
  );

  /**
   * GET /api/auth/me
   * Protected - returns current user info
   */
  fastify.get(
    '/me',
    { preHandler: [authenticateJWT] },
    async (request, reply) => {
      const user = (request as any).user;

      return reply.status(200).send({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
        },
      });
    }
  );
}
