import axiosInstance, { cachedGet } from "./axiosInterceptor";

// ─────────────────────────────────────────────
// USERS (Admin only)
// ─────────────────────────────────────────────

/** Onboard (create) a new user and send them a welcome email. */
export const onboardUser = async (userData: {
  email: string;
  full_name: string;
  password: string;
  role?: string;
  agent_ids?: string[];
  company_name?: string;
  custom_sender_email?: string;
}) => {
  const response = await axiosInstance.post("/admin/users/onboard", userData);
  return response.data;
};

/** List all users with cursor-based pagination. */
export const allUsers = async (limit: number = 50, cursor?: string) => {
  const params: Record<string, unknown> = { limit };
  if (cursor) params.cursor = cursor;
  const response = await cachedGet("/admin/users/", { params });
  return response.data;
};

/** Get full detail for a specific user including assigned agents. */
export const userDetail = async (user_id: string) => {
  const response = await cachedGet(`/admin/users/${user_id}`);
  return response.data;
};

/** Delete a user by ID. */
export const deleteUser = async (user_id: string) => {
  const response = await axiosInstance.delete(`/admin/users/${user_id}`);
  return response.data;
};

/** Update a user's name, active status, agent assignments, or onboarding data. */
export const updateUser = async (
  user_id: string,
  data: {
    full_name?: string;
    is_active?: boolean;
    assigned_agent_ids?: string[];
    onboarding_data?: Record<string, unknown>;
  },
) => {
  const response = await axiosInstance.patch(`/admin/users/${user_id}`, data);
  return response.data;
};

/** Assign agents to a user (replaces existing assignment list). */
export const assignAgentsToUser = async (user_id: string, agent_ids: string[]) => {
  const response = await axiosInstance.post(
    `/admin/users/${user_id}/assign-agents`,
    agent_ids,
  );
  return response.data;
};

/** Update the platform SMTP settings. */
export const updateSmtpSettings = async (smtpData: {
  host: string;
  port: number;
  username: string;
  password: string;
  from_email: string;
}) => {
  const response = await axiosInstance.post("/admin/users/settings/smtp", smtpData);
  return response.data;
};