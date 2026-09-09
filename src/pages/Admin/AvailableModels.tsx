import { useEffect, useState } from "react";
import { ArrowLeft, Bot, Check, RefreshCw, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { assignRetellModelToNumber, getRetellModels } from "../../api/api";

interface RetellModel { agent_id: string; agent_name: string; }
interface NumberModel { assignment_id: string; company_name: string; phone_number: string; retell_agent_id: string | null; }

export default function AvailableModels() {
  const navigate = useNavigate();
  const [models, setModels] = useState<RetellModel[]>([]);
  const [numbers, setNumbers] = useState<NumberModel[]>([]);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const response = await getRetellModels();
      setModels(response.data?.models || []);
      const assignedNumbers = response.data?.numbers || [];
      setNumbers(assignedNumbers);
      setSelected(Object.fromEntries(assignedNumbers.map((number: NumberModel) => [number.assignment_id, number.retell_agent_id || ""])));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load Retell models");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const save = async (number: NumberModel) => {
    const modelId = selected[number.assignment_id];
    if (!modelId) {
      toast.error("Select a Retell model first");
      return;
    }
    setSavingId(number.assignment_id);
    try {
      await assignRetellModelToNumber(number.assignment_id, modelId);
      setNumbers((current) => current.map((item) => item.assignment_id === number.assignment_id ? { ...item, retell_agent_id: modelId } : item));
      toast.success(`Model assigned to ${number.phone_number}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to assign Retell model");
    } finally {
      setSavingId(null);
    }
  };

  return <main className="min-h-screen bg-slate-50 p-4 sm:p-6"><div className="mx-auto max-w-7xl"><header className="mb-8 flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-4"><button onClick={() => navigate("/admin/portal")} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950"><ArrowLeft size={17} /> Back to Portal</button><div className="h-6 w-px bg-slate-200" /><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-600">Super Admin</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Available Models</h1></div></div><button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600"><RefreshCw size={15} /> Refresh</button></header><section className="mb-6 rounded-2xl border border-cyan-100 bg-cyan-50 p-5"><p className="flex items-center gap-2 text-sm font-bold text-cyan-800"><Bot size={18} /> {models.length} live Retell models available</p><p className="mt-1 text-sm text-cyan-700">Assign a different Retell model to each client phone number.</p></section><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[850px] text-left"><thead className="bg-slate-50"><tr><th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">Client</th><th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">Phone number</th><th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">Retell model</th><th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">Action</th></tr></thead><tbody>{loading ? <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500">Loading Retell models...</td></tr> : numbers.length === 0 ? <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500">No assigned phone numbers found.</td></tr> : numbers.map((number) => <tr key={number.assignment_id} className="border-t border-slate-100"><td className="px-6 py-5 font-semibold text-slate-900">{number.company_name}</td><td className="px-6 py-5 text-slate-700">{number.phone_number}</td><td className="px-6 py-5"><select value={selected[number.assignment_id] || ""} onChange={(event) => setSelected((current) => ({ ...current, [number.assignment_id]: event.target.value }))} className="w-full max-w-sm rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-cyan-500"><option value="">Select model</option>{models.map((model) => <option key={model.agent_id} value={model.agent_id}>{model.agent_name} ({model.agent_id})</option>)}</select></td><td className="px-6 py-5"><button onClick={() => void save(number)} disabled={savingId === number.assignment_id} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{savingId === number.assignment_id ? <RefreshCw size={15} className="animate-spin" /> : number.retell_agent_id === selected[number.assignment_id] ? <Check size={15} /> : <Save size={15} />} Save</button></td></tr>)}</tbody></table></div></div></main>;
}
