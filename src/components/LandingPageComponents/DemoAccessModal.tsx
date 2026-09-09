import { useState } from "react";
import type { FormEvent } from "react";
import { CheckCircle2, Mail, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import Spinner from "../Spinner";
import { verifyDemoAccess } from "../../api/api";

interface DemoAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGranted: () => void;
}

const DemoAccessModal = ({ isOpen, onClose, onGranted }: DemoAccessModalProps) => {
  const [email, setEmail] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsVerifying(true);
    try {
      const granted = await verifyDemoAccess(email);
      if (!granted) {
        toast.error("Access has not been granted for this email yet.");
        return;
      }
      onGranted();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not verify access");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className="w-full max-w-md rounded-[28px] bg-white p-7 shadow-2xl sm:p-9" initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.97 }} onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-600">Access check</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">I&apos;ve got access</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">Enter the same email you used when requesting the demo.</p>
              </div>
              <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Close access verification">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-7 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Approved email address</span>
                <span className="relative block">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10" />
                </span>
              </label>
              <button type="submit" disabled={isVerifying} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
                {isVerifying ? <Spinner color="#ffffff" /> : <><CheckCircle2 size={18} /> Verify and start call</>}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DemoAccessModal;
