import { useEffect, useMemo, useState } from "react";
import { Save, Phone, PhoneCall } from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import { RetellWebClient } from "retell-client-js-sdk";
import {
  createCompanyWebCall,
  getMyNumberProfiles,
  getMyRetellModels,
  updateMyNumberProfile,
} from "../../api/api";
import ActiveCallModal from "../../components/LandingPageComponents/ActiveCallModal";

interface NumberProfile {
  display_name: string;
  retell_agent_id: string;
  description: string;
  knowledge_text: string;
  additional_instructions: string;
}

export default function CompanyData() {
  const navigate = useNavigate();
  const { numberId } = useParams<{ numberId: string }>();
  const [numberProfiles, setNumberProfiles] = useState<{ id: string; phone_number: string; profile?: Partial<NumberProfile> | null }[]>([]);
  const [selectedNumberId, setSelectedNumberId] = useState(numberId || "");
  const [numberData, setNumberData] = useState<NumberProfile>({ display_name: "", retell_agent_id: "", description: "", knowledge_text: "", additional_instructions: "" });
  const [savingNumberData, setSavingNumberData] = useState(false);
  const [retellModels, setRetellModels] = useState<{ agent_id: string; agent_name: string }[]>([]);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [isCallConnected, setIsCallConnected] = useState(false);
  const [isCallLoading, setIsCallLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [activeAgentName, setActiveAgentName] = useState("Peoplix AI Agent");
  const sdk = useMemo(() => new RetellWebClient(), []);

  const loadData = async () => {
    try {
      const numberResponse = await getMyNumberProfiles();
      const profiles = numberResponse.data || [];
      setNumberProfiles(profiles);
      const selectedProfile = profiles.find((profile: { id: string }) => profile.id === numberId) || profiles[0];
      if (selectedProfile && (numberId || !selectedNumberId)) {
        setSelectedNumberId(selectedProfile.id);
        setNumberData({ display_name: "", retell_agent_id: "", description: "", knowledge_text: "", additional_instructions: "", ...selectedProfile.profile });
      }
      const modelResponse = await getMyRetellModels(selectedProfile?.id).catch(() => ({ data: [] }));
      setRetellModels(modelResponse.data || []);
      if (modelResponse.data?.[0]) {
        setNumberData((current) => ({ ...current, retell_agent_id: modelResponse.data[0].agent_id }));
      }
    } catch (error) {
      console.error("Failed to load company data:", error);
      toast.error(error instanceof Error ? error.message : "Failed to load company data");
    } finally {
    }
  };

  useEffect(() => {
    void loadData();
  }, [numberId]);

  useEffect(() => {
    sdk.on("call_started", () => {
      setIsCallConnected(true);
      setIsCallLoading(false);
    });
    sdk.on("call_ended", () => {
      setIsCallModalOpen(false);
      setIsCallConnected(false);
      setIsMuted(false);
    });
    sdk.on("error", (error) => {
      console.error("Retell SDK error:", error);
      toast.error("An error occurred during the call.");
      setIsCallModalOpen(false);
      setIsCallLoading(false);
    });
    return () => {
      sdk.off("call_started");
      sdk.off("call_ended");
      sdk.off("error");
    };
  }, [sdk]);

  const selectNumber = (assignmentId: string) => {
    navigate(`/company-data/${assignmentId}`);
  };

  const saveNumberData = async () => {
    if (!selectedNumberId) return;
    setSavingNumberData(true);
    try {
      const response = await updateMyNumberProfile(selectedNumberId, numberData);
      setNumberProfiles((current) => current.map((number) => number.id === selectedNumberId ? { ...number, profile: numberData } : number));
      toast.success(response.warning || "Phone-specific AI data saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save phone-specific data");
    } finally {
      setSavingNumberData(false);
    }
  };

  const startNumberDemoCall = async () => {
    if (!selectedNumberId || isCallLoading) return;
    setIsCallLoading(true);
    try {
      const model = retellModels[0];
      const call = await createCompanyWebCall(selectedNumberId);
      setActiveAgentName(model?.agent_name || "Peoplix AI Agent");
      setIsCallModalOpen(true);
      await sdk.startCall({ accessToken: call.access_token });
    } catch (error) {
      console.error("Failed to start phone-specific demo call:", error);
      toast.error(error instanceof Error ? error.message : "Failed to start demo call");
      setIsCallLoading(false);
    }
  };

  const endNumberDemoCall = () => {
    sdk.stopCall();
    setIsCallModalOpen(false);
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    const internalSdk = sdk as any;
    if (internalSdk.room?.localParticipant) {
      internalSdk.room.localParticipant.setMicrophoneEnabled(!nextMuted);
      setIsMuted(nextMuted);
    }
  };

  const selectedNumber = numberProfiles.find((number) => number.id === selectedNumberId);

  if (!numberId) {
    return (
      <main className="min-h-screen bg-[#FCFAF5] p-4 sm:p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <header>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Knowledge Base</p>
            <h1 className="mt-2 text-3xl font-extrabold text-gray-900">Company Data</h1>
            <p className="mt-2 text-gray-500">Choose a phone number to manage its Retell model and knowledge.</p>
          </header>
          <section className="rounded-2xl border border-[#E4DAC3] bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">Your phone numbers</h2>
            <p className="mt-1 text-sm text-gray-500">Each number has its own description, instructions, model, and company knowledge.</p>
            {numberProfiles.length === 0 ? <p className="mt-5 rounded-xl bg-[#F7F3EB] p-4 text-sm text-gray-500">No phone numbers have been assigned to your company yet.</p> : <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {numberProfiles.map((number) => <button key={number.id} type="button" onClick={() => selectNumber(number.id)} className="flex items-center justify-between rounded-xl border border-gray-200 p-4 text-left transition hover:border-[#C9BC9E] hover:bg-[#F7F3EB]"><span className="flex items-center gap-3"><span className="rounded-lg bg-[#EFE8D8] p-2 text-[#8B7355]"><Phone size={18} /></span><span><span className="block font-bold text-gray-900">{number.phone_number}</span><span className="block text-xs text-gray-500">{number.profile?.display_name || "Configure this number"}</span></span></span><span className="text-sm font-semibold text-[#8B7355]">Open</span></button>)}
            </div>}
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FCFAF5] p-4 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <button type="button" onClick={() => navigate("/company-data")} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#8B7355] hover:text-[#6B5A3E]">&larr; Back to phone numbers</button>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Knowledge Base</p>
          <h1 className="mt-2 text-3xl font-extrabold text-gray-900">{selectedNumber?.phone_number || "Phone number"}</h1>
          <p className="mt-2 text-gray-500">Configure the Retell agent and knowledge used for this number&apos;s calls.</p>
        </header>

        <section className="rounded-2xl border border-[#E4DAC3] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Company data</h2>
              <p className="mt-1 text-sm text-gray-500">Manage the information and knowledge used when callers reach this phone number.</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-xl bg-[#8B7355] px-3 py-2 text-sm font-semibold text-white"><Phone size={15} />{selectedNumber?.phone_number || numberId}</span>
          </div>
          {numberProfiles.length === 0 ? <p className="mt-5 rounded-xl bg-[#F7F3EB] p-4 text-sm text-gray-500">No phone numbers have been assigned to your company yet.</p> : <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-gray-700">Number display name<input value={numberData.display_name} onChange={(event) => setNumberData({ ...numberData, display_name: event.target.value })} className="mt-2 w-full rounded-xl border border-gray-200 p-3 outline-none focus:border-[#8B7355]" placeholder="Support line" /></label>
            <label className="text-sm font-semibold text-gray-700">Retell model<select value={numberData.retell_agent_id} onChange={(event) => setNumberData({ ...numberData, retell_agent_id: event.target.value })} className="mt-2 w-full rounded-xl border border-gray-200 bg-white p-3 outline-none focus:border-[#8B7355]"><option value="">Select a Retell model</option>{retellModels.map((model) => <option key={model.agent_id} value={model.agent_id}>{model.agent_name} ({model.agent_id})</option>)}</select></label>
            <label className="text-sm font-semibold text-gray-700 md:col-span-2">Description for this number<textarea value={numberData.description} onChange={(event) => setNumberData({ ...numberData, description: event.target.value })} className="mt-2 min-h-28 w-full rounded-xl border border-gray-200 p-3 outline-none focus:border-[#8B7355]" placeholder="Describe the service, purpose, hours, and answers for this number." /></label>
            <label className="text-sm font-semibold text-gray-700 md:col-span-2">Company Knowledge<textarea value={numberData.knowledge_text} onChange={(event) => setNumberData({ ...numberData, knowledge_text: event.target.value })} className="mt-2 min-h-40 w-full rounded-xl border border-gray-200 p-3 outline-none focus:border-[#8B7355]" placeholder="Enter everything Ava should know about this company and this phone number: company information, services, hours, FAQs, policies, employees, procedures, and other useful details." /></label>
            <label className="text-sm font-semibold text-gray-700 md:col-span-2">Additional instructions<textarea value={numberData.additional_instructions} onChange={(event) => setNumberData({ ...numberData, additional_instructions: event.target.value })} className="mt-2 min-h-28 w-full rounded-xl border border-gray-200 p-3 outline-none focus:border-[#8B7355]" placeholder="Be professional. If the answer is not in the company information, say it is not available." /></label>
            <div className="flex flex-wrap gap-3 md:col-span-2">
              <button onClick={() => void saveNumberData()} disabled={savingNumberData} className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#8B7355] px-5 py-3 font-semibold text-white disabled:opacity-50"><Save size={17} /> {savingNumberData ? "Saving..." : "Save phone data"}</button>
              <button onClick={() => void startNumberDemoCall()} disabled={isCallLoading || !retellModels.length} className="inline-flex w-fit items-center gap-2 rounded-xl bg-gray-900 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><PhoneCall size={17} /> {isCallLoading ? "Connecting..." : "Start live demo call"}</button>
            </div>
          </div>}
        </section>
      </div>
      <ActiveCallModal isOpen={isCallModalOpen} isConnected={isCallConnected} onClose={endNumberDemoCall} isMuted={isMuted} onToggleMute={toggleMute} agentName={activeAgentName} />
    </main>
  );
}
