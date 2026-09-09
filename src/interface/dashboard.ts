export interface CallLog {
  id: number;
  call_id: string;
  agent_id: string;
  call_status: string;
  call_type: string | null;
  direction: string | null;
  from_number: string | null;
  to_number: string | null;
  duration_ms: number | null;
  start_timestamp: string;
  end_timestamp: string | null;
  transcript: string | null;
  recording_url: string | null;
  disconnection_reason: string | null;
  call_analysis: {
    call_summary: string;
    user_sentiment: string;
    call_successful: boolean;
  } | null;
}

export interface DashboardStats {
  kpis: {
    total_calls: { value: number | string; trend: number };
    answered_calls: { value: number | string; trend: number };
    missed_calls: { value: number | string; trend: number };
    avg_call_duration_seconds: { value: number | string; trend: number };
    total_talk_time_minutes: { value: number | string; trend: number };
    conversions: { value: number | string; trend: number };
  };
  chart: {
    trend_percentage: number;
    total_week: number;
    daily_average: number;
    peak_day: string;
    series: { day: string; date: string; total: number; answered: number }[];
  };
}

export interface TopAgent {
  agent_id: string;
  name: string;
  total_calls: number;
  success_rate: number;
  trend: "up" | "down";
}
