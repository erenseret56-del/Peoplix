import { lazy, Suspense } from "react";
import type { JSX } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  AreaChart,
  ResponsiveContainer,
} from "recharts";
import SkeletonChart from "./SkeletonLoader/SkeletonChart";
import { TrendingUp, TrendingDown } from "lucide-react";

const TopPerformer = lazy(() => import("./TopPerformer"));

interface DashboardStats {
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

interface TopAgent {
  agent_id: string;
  name: string;
  total_calls: number;
  success_rate: number;
  trend: "up" | "down";
}

interface CallVolumeChartProps {
  stats: DashboardStats | null;
  statsLoading: boolean;
  topAgents: TopAgent[];
  agentsLoading: boolean;
  onRefreshAgents: () => void;
  getInitial: (name: string) => string;
}

const CallVolumeChart = ({
  stats,
  statsLoading,
  topAgents,
  agentsLoading,
  onRefreshAgents,
  getInitial,
}: CallVolumeChartProps): JSX.Element => {
  const formatTrend = (trend: number): string =>
    trend >= 0 ? `+${trend}%` : `${trend}%`;

  const getTrendColor = (trend: number): string =>
    trend >= 0 ? "text-emerald-500 bg-emerald-50" : "text-red-500 bg-red-50";

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      {/* Call Volume Trends */}
      <div className="xl:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5 relative min-h-[400px]">
        {statsLoading ? (
          <div className="absolute inset-0 z-10 w-full h-full">
            <SkeletonChart />
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-1">
              <div>
                <h2 className="text-lg font-bold text-gray-800">
                  Call Volume Trends
                </h2>
                <p className="text-sm text-gray-400">
                  7-day performance overview
                </p>
              </div>
              {stats && (
                <span
                  className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md ${getTrendColor(stats.chart.trend_percentage)}`}
                >
                  {stats.chart.trend_percentage >= 0 ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5" />
                  )}
                  {formatTrend(stats.chart.trend_percentage)} vs last week
                </span>
              )}
            </div>

            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={stats?.chart.series || []}
                  margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B7355" stopOpacity={0.25} />
                      <stop
                        offset="95%"
                        stopColor="#8B7355"
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                    <linearGradient id="colorCalls2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C4A882" stopOpacity={0.15} />
                      <stop
                        offset="95%"
                        stopColor="#C4A882"
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f0f0f0"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                      fontSize: "12px",
                    }}
                    labelStyle={{ fontWeight: 600, color: "#374151" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Total Calls"
                    stroke="#8B7355"
                    strokeWidth={2}
                    fill="url(#colorCalls)"
                    dot={{ r: 3, fill: "#8B7355", strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="answered"
                    name="Answered"
                    stroke="#C4A882"
                    strokeWidth={2}
                    fill="url(#colorCalls2)"
                    dot={{ r: 3, fill: "#C4A882", strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Chart Footer */}
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-50">
              {stats
                ? [
                  { label: "PEAK DAY", value: stats.chart.peak_day },
                  {
                    label: "DAILY AVERAGE",
                    value: `${stats.chart.daily_average} calls`,
                  },
                  {
                    label: "TOTAL WEEK",
                    value: `${stats.chart.total_week} calls`,
                  },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-xs text-gray-400 mb-0.5">
                      {item.label}
                    </p>
                    <p className="text-sm font-semibold text-gray-800">
                      {item.value}
                    </p>
                  </div>
                ))
                : null}
            </div>
          </>
        )}
      </div>

      {/* Top Performers (Lazy Loaded) */}
      <Suspense
        fallback={
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col h-full animate-pulse">
            <div className="h-6 bg-gray-100 rounded w-1/3 mb-4" />
            <div className="space-y-4 flex-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gray-100 shrink-0" />
                    <div className="flex-1">
                      <div className="h-3 bg-gray-100 rounded w-1/2 mb-1" />
                      <div className="h-2 bg-gray-100 rounded w-1/4" />
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        }
      >
        <TopPerformer
          topAgents={topAgents}
          agentsLoading={agentsLoading}
          onRefreshAgents={onRefreshAgents}
          getInitial={getInitial}
        />
      </Suspense>
    </div>
  );
};

export default CallVolumeChart;