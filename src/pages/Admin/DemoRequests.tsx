import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Mail, MapPin, Phone, RefreshCw, ShieldCheck, Trash2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { deleteDemoRequests, getDemoRequests, updateDemoRequestStatus } from "../../api/api";
import Spinner from "../../components/Spinner";

type RequestStatus = "new" | "contacted" | "closed" | "access_granted";

interface DemoRequest {
  id: string;
  email: string;
  phone: string;
  address: string;
  status: RequestStatus;
  created_at: string;
}

const statusStyles: Record<RequestStatus, string> = {
  new: "bg-amber-100 text-amber-700",
  contacted: "bg-cyan-100 text-cyan-700",
  closed: "bg-slate-100 text-slate-600",
  access_granted: "bg-emerald-100 text-emerald-700",
};

const DemoRequests = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<DemoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const response = await getDemoRequests();
      setRequests(response.data || []);
      setSelectedIds([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load demo requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRequests();
  }, []);

  const newCount = useMemo(() => requests.filter((request) => request.status === "new").length, [requests]);
  const allSelected = requests.length > 0 && selectedIds.length === requests.length;

  const toggleSelection = (id: string) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const handleDelete = async () => {
    if (!selectedIds.length) return;
    const confirmed = window.confirm(`Permanently delete ${selectedIds.length} selected demo request${selectedIds.length === 1 ? "" : "s"}? This cannot be undone.`);
    if (!confirmed) return;

    try {
      await deleteDemoRequests(selectedIds);
      setRequests((current) => current.filter((request) => !selectedIds.includes(request.id)));
      setSelectedIds([]);
      toast.success("Demo requests deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete demo requests");
    }
  };

  const handleStatusChange = async (request: DemoRequest, status: RequestStatus) => {
    setUpdatingId(request.id);
    try {
      await updateDemoRequestStatus(request.id, status);
      setRequests((current) => current.map((item) => item.id === request.id ? { ...item, status } : item));
      toast.success("Request status updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update request");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-4">
          <button onClick={() => navigate("/admin/portal")} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950">
            <ArrowLeft size={17} /> Back to Portal
          </button>
          <div className="h-6 w-px bg-slate-200" />
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-600">Super Admin</p>
            <h1 className="mt-1 text-xl font-bold tracking-tight">Demo Requests</h1>
          </div>
          <button onClick={() => void loadRequests()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900">
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-9">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">People who submitted their details before trying the live AI call.</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight">Request inbox</h2>
          </div>
          <div className="flex items-center gap-3">
            {selectedIds.length > 0 && (
              <button type="button" onClick={() => void handleDelete()} className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-700">
                <Trash2 size={17} /> Delete {selectedIds.length}
              </button>
            )}
            <div className="inline-flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              <Users size={18} /> {newCount} new {newCount === 1 ? "request" : "requests"}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="w-12 px-4 py-4"><input type="checkbox" checked={allSelected} onChange={() => setSelectedIds(allSelected ? [] : requests.map((request) => request.id))} aria-label="Select all demo requests" /></th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">Contact</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">Phone</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">Address</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">Received</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">Access</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-6 py-16 text-center"><Spinner color="#0891B2" /></td></tr>
                ) : requests.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-16 text-center text-sm text-slate-500">No demo requests yet.</td></tr>
                ) : requests.map((request) => (
                  <tr key={request.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-5"><input type="checkbox" checked={selectedIds.includes(request.id)} onChange={() => toggleSelection(request.id)} aria-label={`Select request from ${request.email}`} /></td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 font-semibold text-slate-800"><Mail size={16} className="text-cyan-600" />{request.email}</div>
                    </td>
                    <td className="px-6 py-5"><div className="flex items-center gap-2 text-sm text-slate-600"><Phone size={15} />{request.phone}</div></td>
                    <td className="max-w-xs px-6 py-5"><div className="flex items-start gap-2 text-sm text-slate-600"><MapPin size={15} className="mt-0.5 shrink-0" /><span className="whitespace-normal">{request.address}</span></div></td>
                    <td className="px-6 py-5 text-sm text-slate-500">{new Date(request.created_at).toLocaleString()}</td>
                    <td className="px-6 py-5">
                      <select value={request.status} disabled={updatingId === request.id} onChange={(event) => void handleStatusChange(request, event.target.value as RequestStatus)} className={`rounded-full border-0 px-3 py-2 text-xs font-bold outline-none ${statusStyles[request.status]}`}>
                        <option value="new">NEW</option>
                        <option value="contacted">CONTACTED</option>
                        <option value="closed">CLOSED</option>
                        <option value="access_granted">ACCESS GRANTED</option>
                      </select>
                    </td>
                    <td className="px-6 py-5">
                      {request.status === "access_granted" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700"><ShieldCheck size={15} /> Granted</span>
                      ) : (
                        <button type="button" onClick={() => void handleStatusChange(request, "access_granted")} disabled={updatingId === request.id} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
                          <ShieldCheck size={14} /> Grant Access
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DemoRequests;
