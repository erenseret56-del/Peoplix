import { useEffect, useState } from "react";
import { Phone, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { getMyPhoneAssignments } from "../../api/api";
import Spinner from "../../components/Spinner";

interface PhoneAssignment {
  id: string;
  phone_number: string;
  twilio_sid?: string;
  status: string;
  assigned_at?: string;
}

export default function ReservedNumber() {
  const [assignments, setAssignments] = useState<PhoneAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNumbers = async () => {
    setLoading(true);
    try {
      const response = await getMyPhoneAssignments();
      setAssignments(response.data || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load reserved number");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadNumbers(); }, []);

  return (
    <main className="min-h-screen bg-[#FCFAF5] p-4 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Telephony</p>
            <h1 className="mt-2 text-3xl font-extrabold text-gray-900">Reserved Phone Number</h1>
            <p className="mt-2 text-gray-500">The Twilio number assigned to your company by the super admin.</p>
          </div>
          <button onClick={() => void loadNumbers()} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700"><RefreshCw size={16} /> Refresh</button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {loading && <div className="flex min-h-32 items-center justify-center rounded-2xl bg-white p-8"><Spinner color="#8B7355" /></div>}
          {!loading && assignments.map((assignment) => (
            <div key={assignment.id} className="rounded-2xl border border-[#E4DAC3] bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 text-[#8B7355]"><span className="rounded-xl bg-[#F8F4EC] p-3"><Phone size={24} /></span><span className="text-sm font-semibold uppercase tracking-wide">Active number</span></div>
              <p className="mt-6 text-3xl font-extrabold text-gray-900">{assignment.phone_number}</p>
              <p className="mt-3 font-mono text-xs text-gray-500">Twilio SID: {assignment.twilio_sid || "Not available"}</p>
              <p className="mt-2 text-sm text-gray-500">Assigned {assignment.assigned_at ? new Date(assignment.assigned_at).toLocaleDateString() : "--"}</p>
            </div>
          ))}
          {!loading && assignments.length === 0 && <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">No phone number has been assigned yet.</div>}
        </div>
      </div>
    </main>
  );
}
