export interface User {
  email: string;
  full_name: string;
  password: string;
  agent_id: string;
  company_name: string;
  role: string;
  custom_sender_email: string;
}

export interface UserListItem {
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  id: number;
  assigned_agent_ids: string[];
  assigned_agents: { id: string; name: string }[];
  stripe_customer_id: string | null;
  subscription_status: string | null;
  onboarding_data: any;
}

export interface AllUsersResponse {
  items: UserListItem[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface UserDetail extends UserListItem {}