import type { JSX } from "react";
import SkeletonCard from "./SkeletonLoader/SkeletonCard";

interface StatCard {
  label:
  | "Total Calls"
  | "Answered Calls"
  | "Missed Calls"
  | "Avg Call Duration"
  | "Total Talk Time"
  | "Conversions";
  value: string;
  change: string;
  icon: string;
}

interface StatCardIconProps {
  label: StatCard["label"];
}

const PhoneIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
    />
  </svg>
);

const StatCardIcon = ({ label }: StatCardIconProps): JSX.Element => {
  const iconMap = {
    "Total Calls": (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
        />
      </svg>
    ),
    "Answered Calls": (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M16 3h5m0 0v5m0-5l-6 6M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z"
        />
      </svg>
    ),
    "Missed Calls": (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    "Avg Call Duration": (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    "Total Talk Time": (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
        />
      </svg>
    ),
    Conversions: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
    ),
  };
  return iconMap[label] || <PhoneIcon />;
};

interface DashboardStats {
  kpis: {
    total_calls: { value: number | string; trend: number };
    answered_calls: { value: number | string; trend: number };
    missed_calls: { value: number | string; trend: number };
    avg_call_duration_seconds: { value: number | string; trend: number };
    total_talk_time_minutes: { value: number | string; trend: number };
    conversions: { value: number | string; trend: number };
  };
}

interface StatCardsProps {
  stats: DashboardStats | null;
  loading: boolean;
}

const StatCards = ({ stats, loading }: StatCardsProps) => {
  const formatValue = (value: number | string, unit?: string): string => {
    if (typeof value === "string") return value;
    if (unit === "duration") {
      const m = Math.floor(value / 60);
      const s = Math.floor(value % 60);
      return `${m}m ${s}s`;
    }
    if (unit === "mins") {
      return `${value} mins`;
    }
    return value.toLocaleString();
  };

  const formatTrend = (trend: number): string =>
    trend >= 0 ? `+${trend}%` : `${trend}%`;

  const getTrendColor = (trend: number): string =>
    trend >= 0 ? "text-emerald-500 bg-emerald-50" : "text-red-500 bg-red-50";

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const cardData = [
    {
      label: "Total Calls" as const,
      value: formatValue(stats.kpis.total_calls.value),
      trend: stats.kpis.total_calls.trend,
    },
    {
      label: "Answered Calls" as const,
      value: formatValue(stats.kpis.answered_calls.value),
      trend: stats.kpis.answered_calls.trend,
    },
    {
      label: "Missed Calls" as const,
      value: formatValue(stats.kpis.missed_calls.value),
      trend: stats.kpis.missed_calls.trend,
    },
    {
      label: "Avg Call Duration" as const,
      value: formatValue(stats.kpis.avg_call_duration_seconds.value, "duration"),
      trend: stats.kpis.avg_call_duration_seconds.trend,
    },
    {
      label: "Total Talk Time" as const,
      value: formatValue(stats.kpis.total_talk_time_minutes.value, "mins"),
      trend: stats.kpis.total_talk_time_minutes.trend,
    },
    {
      label: "Conversions" as const,
      value: formatValue(stats.kpis.conversions.value),
      trend: stats.kpis.conversions.trend,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
      {cardData.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-[#F8F4EC] flex items-center justify-center text-[#8B7355]">
              <StatCardIcon label={card.label} />
            </div>
            <span
              className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${getTrendColor(card.trend)}`}
            >
              {formatTrend(card.trend)}
            </span>
          </div>
          <p className="text-sm text-gray-400 mb-0.5">{card.label}</p>
          <p className="text-xl font-bold text-gray-800">{card.value}</p>
        </div>
      ))}
    </div>
  );
};

export default StatCards;