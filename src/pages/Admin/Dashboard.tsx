import { useEffect, useState, lazy } from "react";
import { getCallLogs, getDashboardStats, getTopAgents } from "../../api/api";
import toast from "react-hot-toast";
import type { CallLog, DashboardStats, TopAgent } from "../../interface/dashboard";

// Dashboard Components
const StatCards = lazy(() => import("../../components/StatCards"));
const CallVolumeChart = lazy(() => import("../../components/CallVolumeChart"));
const CallLogTable = lazy(() => import("../../components/CallLogTable"));
const TranscriptModal = lazy(() => import("../../components/TranscriptModal"));

export default function Dashboard() {
  const getInitial = (name: string): string => {
    const parts = name.split(" ");
    return parts.length > 1 ? parts[1][0] : parts[0][0];
  };

  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [transcriptLog, setTranscriptLog] = useState<CallLog | null>(null);
  const [topAgents, setTopAgents] = useState<TopAgent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const PAGE_SIZE = 10;



  useEffect(() => {
    const fetchLogs = async () => {
      setLogsLoading(true);
      try {
        const data = await getCallLogs(currentPage, PAGE_SIZE);
        setCallLogs(data.data || []);
        setTotalLogs(data.total || 0);
      } catch (err) {
        console.error("Failed to fetch call logs:", err);
      } finally {
        setLogsLoading(false);
      }
    };
    fetchLogs();
  }, [currentPage]);

  useEffect(() => {
    const fetchTopAgents = async () => {
      setAgentsLoading(true);
      try {
        const data = await getTopAgents();
        setTopAgents(data.agents || []);
      } catch (err) {
        console.error("Failed to fetch top agents:", err);
        toast.error("Failed to load top agents.");
      } finally {
        setAgentsLoading(false);
      }
    };
    fetchTopAgents();
  }, []);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setStatsLoading(true);
      try {
        const data = await getDashboardStats();
        setStats(data);
      } catch (err) {
        console.error("Failed to fetch stats:", err);
        toast.error("Failed to load dashboard stats.");
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, []);

  const totalPages = Math.ceil(totalLogs / PAGE_SIZE);

  const handleTranscriptClick = (log: CallLog) => {
    if (!log.transcript) {
      toast.error("No transcript available for this call.");
      return;
    }
    setTranscriptLog(log);
  };

  return (
    <>
      {/* Transcript Modal */}
      {transcriptLog && (
        <TranscriptModal
          log={transcriptLog}
          onClose={() => setTranscriptLog(null)}
        />
      )}

      <main className="p-4 sm:p-6 space-y-6">
        {/* Stat Cards */}
        <StatCards stats={stats} loading={statsLoading} />

        {/* Charts Row */}
        <CallVolumeChart
          stats={stats}
          statsLoading={statsLoading}
          topAgents={topAgents}
          agentsLoading={agentsLoading}
          onRefreshAgents={async () => {
            setAgentsLoading(true);
            try {
              const data = await getTopAgents();
              setTopAgents(data.agents || []);
            } catch (err) {
              console.error("Failed to refresh agents:", err);
              toast.error("Failed to refresh.");
            } finally {
              setAgentsLoading(false);
            }
          }}
          getInitial={getInitial}
        />

        <CallLogTable
          callLogs={callLogs}
          logsLoading={logsLoading}
          currentPage={currentPage}
          totalLogs={totalLogs}
          totalPages={totalPages}
          setCurrentPage={setCurrentPage}
          onTranscriptClick={handleTranscriptClick}
        />
      </main>
    </>
  );
}
