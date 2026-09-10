import axiosInstance, { cachedGet } from "./axiosInterceptor";

// ─────────────────────────────────────────────
// COMPANIES (SUPER ADMIN)
// ─────────────────────────────────────────────

export const getCompanies = async (page: number = 1, limit: number = 100) => {
  const response = await cachedGet("/api/companies", { params: { page, limit } });
  return response.data;
};

export const createCompany = async (data: {
  name: string;
  adminEmail: string;
  adminPassword: string;
}) => {
  const response = await axiosInstance.post("/api/companies", data);
  return response.data;
};

export const deleteCompany = async (companyId: string) => {
  const response = await axiosInstance.delete(`/api/companies/${companyId}`);
  return response.data;
};

export const updateCompany = async (companyId: string, data: { billing_due_amount: number }) => {
  const response = await axiosInstance.patch(`/api/companies/${companyId}`, data);
  return response.data;
};

export const purchasePhoneNumber = async (companyId: string, countryCode?: string) => {
  const response = await axiosInstance.post(`/api/admin/phone-numbers/assign/${companyId}`, {
    countryCode,
  });
  return response.data;
};

export const assignExistingPhoneNumber = async (companyId: string, twilioSid: string) => {
  const response = await axiosInstance.post(`/api/admin/phone-numbers/assign-existing/${companyId}`, { twilioSid });
  return response.data;
};

export const getReservedPhoneNumbers = async () => {
  const response = await cachedGet("/api/admin/phone-numbers/reserved");
  return response.data;
};

export const getAvailablePhoneNumbers = async () => {
  const response = await cachedGet("/api/admin/phone-numbers/available-owned");
  return response.data;
};

export const syncPhoneNumbersToTrunk = async () => {
  const response = await axiosInstance.post("/api/admin/phone-numbers/sync-trunk");
  return response.data;
};

export const getRetellModels = async () => {
  const response = await cachedGet("/api/retell/models");
  return response.data;
};

export const assignRetellModelToNumber = async (assignmentId: string, retellAgentId: string) => {
  const response = await axiosInstance.post("/api/retell/models/assign", { assignment_id: assignmentId, retell_agent_id: retellAgentId });
  return response.data;
};

export const getMyCompanyProfile = async () => {
  const response = await cachedGet("/api/companies/my/profile");
  return response.data;
};

export const updateMyCompanyProfile = async (data: { description?: string }) => {
  const response = await axiosInstance.patch("/api/companies/my/profile", data);
  return response.data;
};

export const getMyPhoneAssignments = async () => {
  const response = await cachedGet("/api/calls/phone-assignments");
  return response.data;
};

export const getMyNumberProfiles = async () => {
  const response = await cachedGet("/api/admin/phone-numbers/my");
  return response.data;
};

export const updateMyNumberProfile = async (assignmentId: string, data: { display_name: string; retell_agent_id: string; description: string; knowledge_text: string }) => {
  const response = await axiosInstance.put(`/api/admin/phone-numbers/my/${assignmentId}/profile`, data);
  return response.data;
};

export const uploadMyNumberProfilePdf = async (assignmentId: string, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await axiosInstance.post(`/api/admin/phone-numbers/my/${assignmentId}/profile/pdf`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const getMyRetellModels = async (assignmentId?: string) => {
  const response = await cachedGet("/api/retell/my/models", { params: assignmentId ? { assignment_id: assignmentId } : undefined });
  return response.data;
};

export const createCompanyWebCall = async (assignmentId: string): Promise<{ access_token: string; call_id: string }> => {
  const response = await axiosInstance.post("/api/retell/create-web-call", { assignment_id: assignmentId });
  return response.data.data;
};

export const getCompanyPhoneAssignments = async (companyId: string) => {
  const response = await cachedGet(`/api/admin/phone-numbers/company/${companyId}`);
  return response.data;
};

export const getMyCallLogs = async (page = 1, limit = 50) => {
  const response = await cachedGet("/api/calls", { params: { page, limit } });
  return response.data;
};

export const syncRetellCalls = async () => {
  const response = await axiosInstance.post("/api/calls/sync-retell");
  return response.data;
};

export const getMyDocuments = async () => {
  const response = await cachedGet("/api/documents", { params: { limit: 100 } });
  return response.data;
};

export const getBillingSummary = async (month?: string) => {
  const response = await cachedGet("/api/billing/summary", { params: month ? { month } : undefined });
  return response.data;
};

export const getBillingSettings = async () => {
  const response = await cachedGet("/api/billing/settings");
  return response.data;
};

export const updateBillingSettings = async (data: {
  currency: string;
  twilio_monthly_number_rate: number;
  twilio_voice_per_minute: number;
  retell_per_minute: number;
  storage_per_gb_month: number;
  platform_fee_percent: number;
  tax_percent: number;
}) => {
  const response = await axiosInstance.put("/api/billing/settings", data);
  return response.data;
};

export const createMyDocument = async (data: {
  title: string;
  description?: string;
  content_text?: string;
  file_name?: string;
  visibility?: "private" | "public" | "restricted";
}) => {
  const response = await axiosInstance.post("/api/documents", data);
  return response.data;
};

export const uploadMyDocument = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await axiosInstance.post("/api/documents/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const deleteMyDocument = async (documentId: string) => {
  const response = await axiosInstance.delete(`/api/documents/${documentId}`);
  return response.data;
};

// ─────────────────────────────────────────────
// CALL LOGS
// ─────────────────────────────────────────────

/** List paginated call logs. Optionally filter by status or agent_id. */
export const getCallLogs = async (
  page: number = 1,
  page_size: number = 20,
  status?: string,
  agent_id?: string,
) => {
  const params: Record<string, unknown> = { page, limit: page_size };
  if (status) params.status = status;
  if (agent_id) params.agent_id = agent_id;
  const response = await cachedGet("/api/calls", { params });
  return {
    ...response.data,
    total: response.data.pagination?.total || 0,
  };
};

/** Get a single call log by ID. */
export const getCallLog = async (call_id: string) => {
  const response = await cachedGet(`/api/calls/${call_id}`);
  return response.data;
};

/** Get Workday activities for a specific call. */
export const getCallActivities = async (call_id: string) => {
  const response = await cachedGet(`/api/calls/${call_id}/activities`);
  return response.data;
};

/** Get the global activity feed (Workday updates). */
export const getActivities = async (limit: number = 50, offset: number = 0) => {
  const response = await cachedGet("/api/calls/activities", {
    params: { limit, offset },
  });
  return response.data;
};

// ─────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────

/** Dashboard KPI stats (total calls, answered, missed, avg duration, etc.). */
export const getDashboardStats = async () => {
  const response = await cachedGet("/api/calls/stats/summary");
  return response.data.data;
};

/** Top performing agents. */
export const getTopAgents = async () => {
  const response = await cachedGet("/api/calls/stats/agents");
  return { agents: response.data.data || [] };
};

// ─────────────────────────────────────────────
// AGENTS (Admin only)
// ─────────────────────────────────────────────

/** List all Retell AI agents with cursor-based pagination. */
export const getAgents = async (limit: number = 50, cursor?: string) => {
  const params: Record<string, unknown> = { limit };
  if (cursor) params.cursor = cursor;
  const response = await cachedGet("/admin/agents/", { params });
  return response.data;
};

// ─────────────────────────────────────────────
// IDENTITY VERIFICATION (Retell tool calls)
// ─────────────────────────────────────────────

/** Look up a worker by employee ID. */
export const lookupWorker = async (employee_id: string) => {
  const response = await axiosInstance.post("/identity/lookup", { employee_id });
  return response.data;
};

/** Verify a worker's identity. */
export const verifyWorkerIdentity = async (data: {
  employee_id: string;
  worker_id: string;
  field: string;
  value: string;
}) => {
  const response = await axiosInstance.post("/identity/verify", data);
  return response.data;
};

// ─────────────────────────────────────────────
// WEBSOCKET – Create Web Call
// ─────────────────────────────────────────────

/**
 * Opens a WebSocket and retrieves Retell web call credentials.
 * Returns the access token and call ID.
 */
export const createWebCall = (): Promise<{ access_token: string; call_id: string }> => {
  return new Promise((resolve, reject) => {
    const wsUrl = import.meta.env.VITE_WS_URL as string;
    const ws = new WebSocket(wsUrl);

    const timer = setTimeout(() => {
      ws.close();
      reject(new Error("WebSocket connection timed out"));
    }, 10_000);

    ws.onmessage = (event) => {
      clearTimeout(timer);
      try {
        const data = JSON.parse(event.data);
        if (data.error) reject(new Error(data.error));
        else resolve(data);
      } catch {
        reject(new Error("Invalid response from server"));
      }
      ws.close();
    };

    ws.onerror = () => {
      clearTimeout(timer);
      reject(new Error("WebSocket error"));
    };
  });
};

// ─────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────

/** Check if the API server is online. */
export const healthCheck = async () => {
  const response = await cachedGet("/health");
  return response.data;
};


// ─────────────────────────────────────────────
// SITE CONFIG (Super Admin)
// ─────────────────────────────────────────────

export const getSiteConfig = async () => {
  const response = await cachedGet("/api/site-config");
  return response.data;
};

export const uploadSiteLogo = async (file: File) => {
  const formData = new FormData();
  formData.append("logo", file);
  const response = await axiosInstance.post("/api/site-config/logo", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const deleteSiteLogo = async () => {
  const response = await axiosInstance.delete("/api/site-config/logo");
  return response.data;
};

export const updateSiteVideoUrl = async (video_url: string) => {
  const response = await axiosInstance.put("/api/site-config/video", { video_url });
  return response.data;
};

export const uploadSiteVideo = async (file: File) => {
  const formData = new FormData();
  formData.append("video", file);
  const response = await axiosInstance.post("/api/site-config/video/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const deleteSiteVideo = async () => {
  const response = await axiosInstance.delete("/api/site-config/video");
  return response.data;
};

export const getSiteDocuments = async () => {
  const response = await cachedGet("/api/site-config/documents");
  return response.data;
};

export const uploadSiteDocument = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await axiosInstance.post("/api/site-config/documents/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const deleteSiteDocument = async (id: string) => {
  const response = await axiosInstance.delete(`/api/site-config/documents/${encodeURIComponent(id)}`);
  return response.data;
};

// Public demo call — no auth required, called from landing page
export const startPublicDemoCall = async (): Promise<{ access_token: string; call_id: string; agent_id?: string; agent_name?: string }> => {
  const API_BASE = (import.meta.env.VITE_BASE_URL as string | undefined)?.replace(/\/$/, "") || window.location.origin;
  const response = await fetch(`${API_BASE}/api/site-config/public/start-call`, { method: "POST" });
  const json = await response.json();
  if (!json.success) throw new Error(json.error?.message ?? "Failed to start demo call");
  return json.data;
};

export const createDemoRequest = async (data: { email: string; phone: string; address: string }) => {
  const API_BASE = (import.meta.env.VITE_BASE_URL as string | undefined)?.replace(/\/$/, "") || window.location.origin;
  const response = await fetch(`${API_BASE}/api/demo-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await response.json();
  if (!response.ok || !json.success) throw new Error(json.error?.message ?? "Failed to submit demo request");
  return json.data;
};

export const verifyDemoAccess = async (email: string): Promise<boolean> => {
  const API_BASE = (import.meta.env.VITE_BASE_URL as string | undefined)?.replace(/\/$/, "") || window.location.origin;
  const response = await fetch(`${API_BASE}/api/demo-requests/verify-access`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const json = await response.json();
  if (!response.ok || !json.success) throw new Error(json.error?.message ?? "Failed to verify demo access");
  return Boolean(json.data?.granted);
};

export const getDemoRequests = async (status?: string) => {
  const response = await cachedGet("/api/demo-requests", { params: { limit: 100, status } });
  return response.data;
};

export const updateDemoRequestStatus = async (id: string, status: "new" | "contacted" | "closed" | "access_granted") => {
  const response = await axiosInstance.patch(`/api/demo-requests/${id}`, { status });
  return response.data;
};

export const deleteDemoRequests = async (ids: string[]) => {
  const response = await axiosInstance.delete("/api/demo-requests", { data: { ids } });
  return response.data;
};

export const createCompanyRequest = async (data: {
  fullName: string;
  companyName: string;
  positionTitle: string;
  email: string;
  phoneNumber?: string;
}) => {
  const API_BASE = (import.meta.env.VITE_BASE_URL as string | undefined)?.replace(/\/$/, "") || window.location.origin;
  const response = await fetch(`${API_BASE}/api/company-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await response.json();
  if (!response.ok || !json.success) throw new Error(json.error?.message ?? "Failed to submit company request");
  return json.data;
};

export const getCompanyRequests = async (status?: string) => {
  const response = await cachedGet("/api/company-requests", { params: { limit: 100, status } });
  return response.data;
};

export const updateCompanyRequestStatus = async (id: string, status: "new" | "contacted" | "closed") => {
  const response = await axiosInstance.patch(`/api/company-requests/${id}`, { status });
  return response.data;
};

export const deleteCompanyRequests = async (ids: string[]) => {
  const response = await axiosInstance.delete("/api/company-requests", { data: { ids } });
  return response.data;
};

// ─────────────────────────────────────────────
// SUPER ADMIN — Knowledge documents for public demo
// ─────────────────────────────────────────────

export const getSuperAdminDocuments = async () => {
  const response = await cachedGet("/api/documents", { params: { limit: 100 } });
  return response.data;
};

export const uploadSuperAdminDocument = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await axiosInstance.post("/api/documents/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const deleteSuperAdminDocument = async (id: string) => {
  const response = await axiosInstance.delete(`/api/documents/${id}`);
  return response.data;
};
