import { FastifyRequest } from 'fastify';
import { ObjectId } from 'mongodb';

// ============================================
// COMMON TYPES
// ============================================

export type UUID = string | ObjectId;

export type Timestamp = Date;

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// ============================================
// TENANT CONTEXT
// ============================================

export interface TenantContext {
  id: UUID;
  name: string;
  slug: string;
  status: string;
}

export interface UserContext {
  id: UUID;
  email: string;
  role: UserRole;
  companyId?: UUID;
}

export interface AuthenticatedRequest extends FastifyRequest {
  user: UserContext;
  tenant?: TenantContext;
}

// ============================================
// USER & AUTH
// ============================================

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  COMPANY_ADMIN = 'company_admin',
  COMPANY_USER = 'company_user',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export interface User {
  id: UUID;
  email: string;
  password_hash: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  email_verified: boolean;
  last_login_at?: Timestamp;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at?: Timestamp;
}

export interface JWTPayload {
  userId: UUID;
  email: string;
  role: UserRole;
  companyId?: UUID;
}

// ============================================
// COMPANY (TENANT)
// ============================================

export enum CompanyStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  INACTIVE = 'inactive',
}

export interface Company {
  id: UUID;
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  website?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  settings?: Record<string, any>;
  timezone: string;
  status: CompanyStatus;
  subscription_tier: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at?: Timestamp;
}

export interface CompanyUser {
  id: UUID;
  company_id: UUID;
  user_id: UUID;
  role: string;
  permissions?: string[];
  status: string;
  joined_at: Timestamp;
  created_at: Timestamp;
}

// ============================================
// EMPLOYEE
// ============================================

export enum EmployeeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  TERMINATED = 'terminated',
  ON_LEAVE = 'on_leave',
}

export interface Employee {
  id: UUID;
  company_id: UUID;
  employee_number: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  date_of_birth?: Date;
  department_id?: UUID;
  designation_id?: UUID;
  manager_id?: UUID;
  hire_date?: Date;
  termination_date?: Date;
  employment_type?: string;
  status: EmployeeStatus;
  metadata?: Record<string, any>;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface EmployeeWithDetails extends Employee {
  department?: Department;
  designation?: Designation;
  manager?: Partial<Employee>;
}

// ============================================
// DEPARTMENT
// ============================================

export interface Department {
  id: UUID;
  company_id: UUID;
  name: string;
  code?: string;
  description?: string;
  parent_department_id?: UUID;
  manager_id?: UUID;
  status: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// ============================================
// DESIGNATION
// ============================================

export interface Designation {
  id: UUID;
  company_id: UUID;
  title: string;
  code?: string;
  description?: string;
  level?: string;
  status: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// ============================================
// CUSTOMER
// ============================================

export interface Customer {
  id: UUID;
  company_id: UUID;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  metadata?: Record<string, any>;
  status: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// ============================================
// DOCUMENTS & KNOWLEDGE
// ============================================

export enum DocumentType {
  POLICY = 'policy',
  HANDBOOK = 'handbook',
  PROCEDURE = 'procedure',
  FORM = 'form',
  OTHER = 'other',
}

export interface CompanyDocument {
  id: UUID;
  company_id: UUID;
  title: string;
  type?: DocumentType;
  description?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  storage_path?: string;
  content_text?: string;
  visibility: string;
  status: string;
  uploaded_by?: UUID;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface CompanyFAQ {
  id: UUID;
  company_id: UUID;
  question: string;
  answer: string;
  category?: string;
  keywords?: string[];
  priority: number;
  status: string;
  created_by?: UUID;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface CompanyPolicy {
  id: UUID;
  company_id: UUID;
  title: string;
  code?: string;
  category?: string;
  description?: string;
  content: string;
  version: string;
  effective_date?: Date;
  review_date?: Date;
  status: string;
  created_by?: UUID;
  approved_by?: UUID;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// ============================================
// RETELL AI
// ============================================

export interface RetellAgent {
  id: UUID;
  company_id: UUID;
  retell_agent_id: string;
  retell_llm_id?: string;
  name: string;
  description?: string;
  config?: Record<string, any>;
  status: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export enum CallStatus {
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  MISSED = 'missed',
}

export enum CallType {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
  WEB = 'web',
}

export interface CallLog {
  id: UUID;
  company_id: UUID;
  retell_call_id: string;
  retell_agent_id?: UUID;
  caller_phone?: string;
  from_number?: string;
  to_number?: string;
  phone_number?: string;
  phone_assignment_id?: string;
  customer_id?: UUID;
  call_type: CallType;
  call_status: CallStatus;
  started_at?: Timestamp;
  ended_at?: Timestamp;
  duration_seconds?: number;
  metadata?: Record<string, any>;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface CompanyPhoneAssignment {
  id: UUID;
  company_id: UUID;
  phone_number: string;
  normalized_phone_number: string;
  twilio_sid?: string;
  status: 'assigned' | 'released' | 'pending';
  assigned_at?: Timestamp;
  released_at?: Timestamp;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface CallTranscript {
  id: UUID;
  call_log_id: UUID;
  transcript?: string;
  summary?: string;
  sentiment?: string;
  keywords?: string[];
  created_at: Timestamp;
}

// ============================================
// RETELL WEBHOOK PAYLOADS
// ============================================

export interface RetellCallStartedPayload {
  call_id: string;
  agent_id: string;
  from_number?: string;
  to_number?: string;
  call_type: string;
  metadata?: Record<string, any>;
  started_at: string;
}

export interface RetellCallEndedPayload {
  call_id: string;
  agent_id: string;
  ended_at: string;
  duration_seconds: number;
  transcript?: string;
  summary?: string;
  metadata?: Record<string, any>;
}

export interface RetellFunctionCallPayload {
  call_id: string;
  function_name: string;
  parameters: Record<string, any>;
}

// ============================================
// RETELL FUNCTION RESPONSES
// ============================================

export interface RetellFunctionResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface EmployeeSearchResult {
  employee_number: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  department?: string;
  designation?: string;
}

export interface FAQSearchResult {
  question: string;
  answer: string;
  category?: string;
}

export interface PolicySearchResult {
  title: string;
  content: string;
  effective_date?: string;
}

// ============================================
// AUDIT LOG
// ============================================

export interface AuditLog {
  id: UUID;
  company_id?: UUID;
  user_id?: UUID;
  action: string;
  entity_type?: string;
  entity_id?: UUID;
  description?: string;
  changes?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: Timestamp;
}

// ============================================
// DATABASE QUERY HELPERS
// ============================================

export interface QueryFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in';
  value: any;
}

export interface QueryOptions {
  filters?: QueryFilter[];
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}
