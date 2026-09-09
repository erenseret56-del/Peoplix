import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Building2, Mail, Phone, RefreshCw, Trash2, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { deleteCompanyRequests, getCompanyRequests, updateCompanyRequestStatus } from "../../api/api";
import Spinner from "../../components/Spinner";

type RequestStatus = "new" | "contacted" | "closed";

interface CompanyRequest {
  id: string;
  full_name: string;
  company_name: string;
  position_title: string;
  email: string;
  phone?: string;
  status: RequestStatus;
  created_at: string;
}

const statusStyles: Record<RequestStatus, string> = {
  new: "bg-amber-100 text-amber-700",
  contacted: "bg-cyan-100 text-cyan-700",
  closed: "bg-slate-100 text-slate-600",
};

const CompanyRequests = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<CompanyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const response = await getCompanyRequests();
      setRequests(response.data || []);
      setSelectedIds([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load company requests");
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
    const confirmed = window.confirm(`Permanently delete ${selectedIds.length} selected company request${selectedIds.length === 1 ? "" : "s"}? This cannot be undone.`);
    if (!confirmed) return;

    try {
      await deleteCompanyRequests(selectedIds);
      setRequests((current) => current.filter((request) => !selectedIds.includes(request.id)));
      setSelectedIds([]);
      toast.success("Company requests deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete company requests");
    }
  };

  const handleStatusChange = async (request: CompanyRequest, status: RequestStatus) => {
    setUpdatingId(request.id);
    try {
      await updateCompanyRequestStatus(request.id, status);
      setRequests((current) => current.map((item) => item.id === request.id ? { ...item, status } : item));
      toast.success("Company request status updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update company request");
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
            <h1 className="mt-1 text-xl font-bold tracking-tight">Company Requests</h1>
          </div>
          <button onClick={() => void loadRequests()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900">
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-9">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">Companies that asked the Peoplix team to get in touch.</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight">Company request inbox</h2>
          </div>
          <div className="flex items-center gap-3">
            {selectedIds.length > 0 && (
              <button type="button" onClick={() => void handleDelete()} className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-700">
                <Trash2 size={17} /> Delete {selectedIds.length}
              </button>
            )}
            <div className="inline-flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              <Building2 size={18} /> {newCount} new {newCount === 1 ? "request" : "requests"}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="w-12 px-4 py-4"><input type="checkbox" checked={allSelected} onChange={() => setSelectedIds(allSelected ? [] : requests.map((request) => request.id))} aria-label="Select all company requests" /></th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">Person</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">Company</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">Email</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">Phone</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">Received</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-6 py-16 text-center"><Spinner color="#0891B2" /></td></tr>
                ) : requests.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-16 text-center text-sm text-slate-500">No company requests yet.</td></tr>
                ) : requests.map((request) => (
                  <tr key={request.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-5"><input type="checkbox" checked={selectedIds.includes(request.id)} onChange={() => toggleSelection(request.id)} aria-label={`Select request from ${request.email}`} /></td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 font-semibold text-slate-800"><UserRound size={16} className="text-cyan-600" /><span>{request.full_name}</span></div>
                      <p className="ml-6 mt-1 text-xs text-slate-500">{request.position_title}</p>
                    </td>
                    <td className="px-6 py-5"><div className="flex items-center gap-2 text-sm text-slate-700"><Building2 size={15} />{request.company_name}</div></td>
                    <td className="px-6 py-5"><div className="flex items-center gap-2 text-sm text-slate-600"><Mail size={15} />{request.email}</div></td>
                    <td className="px-6 py-5"><div className="flex items-center gap-2 text-sm text-slate-600"><Phone size={15} />{request.phone || "Not provided"}</div></td>
                    <td className="px-6 py-5 text-sm text-slate-500">{new Date(request.created_at).toLocaleString()}</td>
                    <td className="px-6 py-5">
                      <select value={request.status} disabled={updatingId === request.id} onChange={(event) => void handleStatusChange(request, event.target.value as RequestStatus)} className={`rounded-full border-0 px-3 py-2 text-xs font-bold outline-none ${statusStyles[request.status]}`}>
                        <option value="new">NEW</option>
                        <option value="contacted">CONTACTED</option>
                        <option value="closed">CLOSED</option>
                      </select>
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

export default CompanyRequests;
