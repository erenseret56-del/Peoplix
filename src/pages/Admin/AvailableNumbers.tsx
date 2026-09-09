import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, Phone, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getAvailablePhoneNumbers } from "../../api/api";

interface AvailableNumber { id: string; phone_number: string; twilio_sid: string; status: string; }

export default function AvailableNumbers() {
  const navigate = useNavigate();
  const [numbers, setNumbers] = useState<AvailableNumber[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNumbers = async () => {
    setLoading(true);
    try {
      const response = await getAvailablePhoneNumbers();
      setNumbers(response.data || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load available numbers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadNumbers(); }, []);

  return <main className="min-h-screen bg-slate-50 p-4 sm:p-6"><div className="mx-auto max-w-6xl"><header className="mb-8 flex items-center justify-between gap-4"><div className="flex items-center gap-4"><button onClick={() => navigate("/admin/portal")} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950"><ArrowLeft size={17} /> Back to Portal</button><div className="h-6 w-px bg-slate-200" /><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-600">Super Admin</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Available Numbers</h1></div></div><button onClick={() => void loadNumbers()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600"><RefreshCw size={15} /> Refresh</button></header><section className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><p className="text-sm font-semibold text-emerald-800">Reusable inventory: {numbers.length}</p><p className="mt-1 text-sm text-emerald-700">These Twilio numbers are not assigned to any client. The next Generate Number action reuses one of them before purchasing a new number.</p></section><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><table className="w-full text-left"><thead className="bg-slate-50"><tr><th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">Number</th><th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">Twilio SID</th><th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">Status</th></tr></thead><tbody>{loading ? <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-500">Loading available numbers...</td></tr> : numbers.map((number) => <tr key={number.id} className="border-t border-slate-100"><td className="px-6 py-5"><div className="flex items-center gap-3 font-semibold text-slate-900"><span className="rounded-full bg-cyan-100 p-2 text-cyan-600"><Phone size={17} /></span>{number.phone_number}</div></td><td className="px-6 py-5 font-mono text-sm text-slate-600">{number.twilio_sid}</td><td className="px-6 py-5"><span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700"><CalendarDays size={13} /> AVAILABLE</span></td></tr>)} </tbody></table>{!loading && numbers.length === 0 && <div className="px-6 py-16 text-center text-slate-500">No reusable Twilio numbers are currently available.</div>}</div></div></main>;
}
