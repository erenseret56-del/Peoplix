import axiosInstance, { cachedGet } from "./axiosInterceptor";

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────

/** Login – returns access_token + user info. */
export const loginApi = async (data: { email: string; password: string }) => {
  const response = await axiosInstance.post("/api/auth/login", data);
  return response.data?.data ?? response.data;
};

/** Get the currently authenticated user's profile. */
export const getMyProfile = async () => {
  const response = await cachedGet("/api/auth/me");
  return response.data;
};

/** Change password while logged in (requires current password). */
export const resetPassword = async (data: {
  old_password: string;
  new_password: string;
}) => {
  const response = await axiosInstance.post("/api/auth/reset-password", data);
  return response.data;
};

/** Step 1 – request a password-reset email. */
export const forgotPassword = async (email: string) => {
  const response = await axiosInstance.post("/api/auth/forgot-password", { email });
  return response.data;
};

/** Step 2 – verify the reset token from the email link. */
export const verifyResetToken = async (token: string) => {
  const response = await cachedGet("/api/auth/verify-reset-token", {
    params: { token },
  });
  return response.data;
};

/** Step 3 – set a new password using the token. */
export const resetPasswordWithToken = async (data: {
  token: string;
  new_password: string;
}) => {
  const response = await axiosInstance.post("/api/auth/reset-password-with-token", data);
  return response.data;
};