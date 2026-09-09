import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import type { TopAgent } from "../interface/dashboard";

interface TopPerformerProps {
  topAgents: TopAgent[];
  agentsLoading: boolean;
  onRefreshAgents: () => void;
  getInitial: (name: string) => string;
}

const TopPerformer = ({
  topAgents,
  agentsLoading,
  onRefreshAgents,
  getInitial,
}: TopPerformerProps) => {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Top Performers</h2>
          <p className="text-sm text-gray-400">This week</p>
        </div>
        <button
          onClick={onRefreshAgents}
          className="p-1.5 rounded-lg hover:bg-[#F8F4EC] text-[#8B7355] transition-colors cursor-pointer"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${agentsLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto">
        {agentsLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2 animate-pulse">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gray-100 shrink-0" />
                <div className="flex-1">
                  <div className="h-3 bg-gray-100 rounded w-1/2 mb-1" />
                  <div className="h-2 bg-gray-100 rounded w-1/4" />
                </div>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full" />
            </div>
          ))
        ) : topAgents.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-6">No agents found.</p>
        ) : (
          topAgents.map((agent) => (
            <div key={agent.agent_id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#8B7355] flex items-center justify-center text-white text-xs font-semibold shrink-0">
                    {getInitial(agent.name)}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-800 capitalize">
                      {agent.name}
                    </p>
                    <p className="text-xs text-gray-400">{agent.total_calls} calls</p>
                  </div>
                </div>
                <span
                  className={
                    agent.trend === "up" ? "text-emerald-500" : "text-red-400"
                  }
                >
                  {agent.trend === "up" ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5" />
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#8B7355] rounded-full transition-all duration-700"
                    style={{ width: `${agent.success_rate}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-gray-600 w-8 text-right">
                  {agent.success_rate}%
                </span>
              </div>
              <p className="text-xs text-gray-400">Success Rate</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TopPerformer;