import { useEffect, useState } from "react";
import { Phone, RefreshCw, Building2, CalendarDays } from "lucide-react";
import toast from "react-hot-toast";
import { getReservedPhoneNumbers } from "../../api/api";
import Spinner from "../../components/Spinner";

interface ReservedNumber {
  id: string;
  phone_number: string;
  twilio_sid: string;
  company_name: string;
  assigned_at: string;
  status: string;
}

export default function Numbers() {
  const [numbers, setNumbers] = useState<ReservedNumber[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNumbers = async () => {
    setLoading(true);
    try {
      const response = await getReservedPhoneNumbers();
      setNumbers(response.data || []);
    } catch (error) {
      console.error("Failed to load reserved numbers:", error);
      toast.error("Failed to load reserved numbers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNumbers();
  }, []);

  return (
    <main className="min-h-screen p-4 sm:p-6" style={{ background: "#F5F0E8" }}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Twilio Inventory</p>
            <h1 className="mt-2 text-4xl font-extrabold text-gray-900">Reserved Numbers</h1>
            <p className="mt-2 text-gray-600">Numbers purchased from Twilio and assigned to clients.</p>
          </div>
          <button onClick={() => void loadNumbers()} className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm">
            <RefreshCw size={16} /> Refresh
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white/90">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px]">
              <thead className="bg-gray-900/5">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Number</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Client</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Twilio SID</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Reserved</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="px-6 py-12 text-center"><Spinner color="#8B7355" /></td></tr>
                ) : numbers.map((number) => (
                  <tr key={number.id} className="border-t border-black/5">
                    <td className="px-6 py-5"><div className="flex items-center gap-3 font-semibold text-gray-900"><span className="rounded-full bg-blue-100 p-2 text-blue-600"><Phone size={17} /></span>{number.phone_number}</div></td>
                    <td className="px-6 py-5"><div className="flex items-center gap-2 text-gray-700"><Building2 size={16} className="text-gray-400" />{number.company_name}</div></td>
                    <td className="px-6 py-5 font-mono text-sm text-gray-600">{number.twilio_sid}</td>
                    <td className="px-6 py-5"><div className="flex items-center gap-2 text-gray-600"><CalendarDays size={16} className="text-gray-400" />{new Date(number.assigned_at).toLocaleDateString()}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && numbers.length === 0 && <div className="px-6 py-16 text-center text-gray-500">No Twilio numbers have been reserved yet.</div>}
        </div>
      </div>
    </main>
  );
}