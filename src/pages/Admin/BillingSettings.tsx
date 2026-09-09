import { useEffect, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getBillingSettings, updateBillingSettings } from "../../api/api";

interface BillingSettingsData {
  currency: string;
  twilio_monthly_number_rate: number;
  twilio_voice_per_minute: number;
  retell_per_minute: number;
  storage_per_gb_month: number;
  platform_fee_percent: number;
  tax_percent: number;
}

const defaults: BillingSettingsData = { currency: "USD", twilio_monthly_number_rate: 1.15, twilio_voice_per_minute: 0.013, retell_per_minute: 0.07, storage_per_gb_month: 0.02, platform_fee_percent: 10, tax_percent: 0 };

export default function BillingSettings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void getBillingSettings().then((response) => setSettings({ ...defaults, ...response.data })).catch((error) => toast.error(error instanceof Error ? error.message : "Failed to load billing settings")).finally(() => setLoading(false));
  }, []);

  const update = (key: keyof BillingSettingsData, value: string) => setSettings((current) => ({ ...current, [key]: key === "currency" ? value : Number(value) }));
  const save = async () => {
    setSaving(true);
    try { await updateBillingSettings(settings); toast.success("Billing settings saved"); } catch (error) { toast.error(error instanceof Error ? error.message : "Failed to save billing settings"); } finally { setSaving(false); }
  };

  const fields: { key: keyof BillingSettingsData; label: string; step: string }[] = [
    { key: "twilio_monthly_number_rate", label: "Twilio number monthly rate", step: "0.01" },
    { key: "twilio_voice_per_minute", label: "Twilio voice rate per minute", step: "0.0001" },
    { key: "retell_per_minute", label: "Retell AI rate per minute", step: "0.0001" },
    { key: "storage_per_gb_month", label: "Recording storage per GB/month", step: "0.0001" },
    { key: "platform_fee_percent", label: "Platform fee (%)", step: "0.01" },
    { key: "tax_percent", label: "Tax (%)", step: "0.01" },
  ];

  return <main className="min-h-screen bg-slate-50 p-4 sm:p-6"><div className="mx-auto max-w-3xl"><header className="mb-8 flex items-center gap-4"><button onClick={() => navigate("/admin/portal")} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950"><ArrowLeft size={17} /> Back to Portal</button><div className="h-6 w-px bg-slate-200" /><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-600">Super Admin</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Billing settings</h1></div></header><section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><p className="mb-6 text-sm leading-6 text-slate-500">These persisted rates are used for every company&apos;s monthly billing calculation. Provider charges are calculated from stored tenant usage.</p><label className="mb-5 block text-sm font-semibold text-slate-700">Currency<input value={settings.currency} maxLength={3} onChange={(event) => update("currency", event.target.value.toUpperCase())} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 uppercase outline-none focus:border-cyan-500" /></label><div className="grid gap-5 sm:grid-cols-2">{fields.map((field) => <label key={field.key} className="text-sm font-semibold text-slate-700">{field.label}<input type="number" min="0" step={field.step} disabled={loading} value={settings[field.key]} onChange={(event) => update(field.key, event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-cyan-500" /></label>)}</div><button onClick={() => void save()} disabled={loading || saving} className="mt-8 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white disabled:opacity-50"><Save size={17} /> {saving ? "Saving..." : "Save billing settings"}</button></section></div></main>;
}
