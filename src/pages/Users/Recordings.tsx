import { useEffect, useState } from "react";
import { Download, Headphones, PhoneCall, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { getMyCallLogs, syncRetellCalls } from "../../api/api";
import Spinner from "../../components/Spinner";

interface CallLog {
  id: string;
  caller_phone?: string;
  call_type?: string;
  call_status?: string;
  started_at?: string;
  duration_seconds?: number;
  recording_url?: string;
}

export default function Recordings() {
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCalls = async () => {
    setLoading(true);
    try {
      const response = await getMyCallLogs();
      setCalls(response.data || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load call recordings");
    } finally {
      setLoading(false);
    }
  };

  const syncCalls = async () => {
    try {
      const response = await syncRetellCalls();
      toast.success(`${response.data?.synced || 0} Retell calls synchronized`);
      await loadCalls();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to synchronize Retell calls");
    }
  };

  useEffect(() => { void loadCalls(); }, []);

  return (
    <main className="min-h-screen bg-[#FCFAF5] p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Call History</p>
            <h1 className="mt-2 text-3xl font-extrabold text-gray-900">Call Recordings</h1>
            <p className="mt-2 text-gray-500">Calls handled for your company phone number.</p>
          </div>
          <div className="flex flex-wrap gap-2"><button onClick={() => void syncCalls()} className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700">Sync Retell Calls</button><button onClick={() => void loadCalls()} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700"><RefreshCw size={16} /> Refresh</button></div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          {loading ? <div className="flex min-h-32 items-center justify-center p-10"><Spinner color="#8B7355" /></div> : calls.length === 0 ? <p className="p-10 text-center text-gray-500">No calls recorded yet.</p> : (
            <div className="divide-y divide-gray-100">
              {calls.map((call) => (
                <div key={call.id} className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_minmax(300px,auto)] md:items-center">
                  <div className="flex min-w-0 items-center gap-3"><span className="shrink-0 rounded-xl bg-[#F8F4EC] p-3 text-[#8B7355]"><PhoneCall size={19} /></span><div className="min-w-0"><p className="truncate font-semibold text-gray-900">{call.caller_phone || "Unknown caller"}</p><p className="text-xs text-gray-500">{call.started_at ? new Date(call.started_at).toLocaleString() : "--"} · {call.call_type || "call"}</p></div></div>
                  <div className="flex min-w-0 flex-wrap items-center justify-start gap-3 md:justify-end"><span className="text-sm text-gray-600">{call.duration_seconds || 0}s</span><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">{call.call_status || "unknown"}</span>{call.recording_url ? <><audio controls src={call.recording_url} className="h-9 w-full max-w-full sm:w-64" /><a href={call.recording_url} download className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50" title="Download recording"><Download size={15} /> Download</a></> : <span className="flex items-center gap-1 text-xs text-gray-400"><Headphones size={16} /> No recording</span>}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
