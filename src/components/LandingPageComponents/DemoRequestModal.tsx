import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Mail, MapPin, Phone, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import Spinner from "../Spinner";
import { createDemoRequest } from "../../api/api";

interface DemoRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

const DemoRequestModal = ({ isOpen, onClose, onSubmitted }: DemoRequestModalProps) => {
  const [form, setForm] = useState({ email: "", phone: "", address: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) setForm({ email: "", phone: "", address: "" });
  }, [isOpen]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await createDemoRequest(form);
      onSubmitted();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit demo request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-lg rounded-[28px] bg-white p-7 shadow-2xl sm:p-9"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-900">Before you call</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">Request a live demo</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">Share your details so our team can follow up after your experience.</p>
              </div>
              <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Close demo request form">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Email address</span>
                <span className="relative block">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@company.com" className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10" />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Phone number</span>
                <span className="relative block">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <input required type="tel" minLength={7} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+1 555 123 4567" className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10" />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Address</span>
                <span className="relative block">
                  <MapPin className="absolute left-4 top-4 text-slate-400" size={17} />
                  <textarea required minLength={3} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="Company or office address" rows={3} className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10" />
                </span>
              </label>

              <button type="submit" disabled={isSubmitting} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
                {isSubmitting ? <Spinner color="#ffffff" /> : "Submit demo request"}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DemoRequestModal;
