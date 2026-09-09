import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { getBillingSummary } from "../../api/api";
import Spinner from "../../components/Spinner";

interface BillingSummary {
  currency: string;
  amount_due: number;
}

const money = (value: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value);

export default function Billing() {
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadBilling = async () => {
    setLoading(true);
    try {
      const response = await getBillingSummary();
      setSummary(response.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load billing");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadBilling(); }, []);

  return (
    <main className="min-h-screen bg-[#FCFAF5] p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8B7355]">Account billing</p>
            <h1 className="mt-2 text-3xl font-extrabold text-slate-900">Amount due</h1>
            <p className="mt-2 text-slate-500">Your current balance set by the Peoplix administrator.</p>
          </div>
          <button onClick={() => void loadBilling()} className="self-start rounded-xl border border-slate-200 bg-white p-3 text-slate-600 hover:text-slate-900 sm:self-auto" title="Refresh billing">
            <RefreshCw size={17} />
          </button>
        </header>

        {loading || !summary ? (
          <div className="flex min-h-32 items-center justify-center rounded-2xl border border-slate-100 bg-white p-10"><Spinner color="#8B7355" /></div>
        ) : (
          <section className="max-w-xl rounded-2xl border border-[#E4DAC3] bg-[#F8F4EC] p-8 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8B7355]">Current balance</p>
            <p className="mt-4 text-5xl font-extrabold text-slate-900">{money(summary.amount_due, summary.currency)}</p>
            <p className="mt-4 text-sm text-[#6B5A3E]">This amount is maintained by your administrator.</p>
          </section>
        )}
      </div>
    </main>
  );
}
