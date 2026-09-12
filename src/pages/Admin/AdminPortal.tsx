import { useEffect, useMemo, useState } from "react";
import {
  Users, Plus, Trash2, Edit, Mail, Lock,
  Building2, CheckCircle, XCircle, LogOut,
  PhoneCall, ShieldCheck, Bot, Sparkles, Globe, Inbox, Save
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Logo from "../../assets/images/peoplix-logo.png";
import Spinner from "../../components/Spinner";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { assignExistingPhoneNumber, createCompany, deleteCompany, getAvailablePhoneNumbers, getCompanies, purchasePhoneNumber, syncPhoneNumbersToTrunk, updateCompany } from "../../api/api";

interface Client {
  id: string;
  companyName: string;
  email: string;
  status: "active" | "inactive" | "pending";
  createdAt: string;
  employeeCount: number;
  phoneNumber: string;
  twilioSid: string;
  country: string;
  retellAgentId: string;
  billingDueAmount: number;
  phoneNumbers: { id: string; phone_number: string; twilio_sid?: string; assigned_at?: string }[];
}

const AdminPortal = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [creatingClient, setCreatingClient] = useState(false);
  const [availableNumbers, setAvailableNumbers] = useState<{ id: string; phone_number: string; twilio_sid: string }[]>([]);
  const [selectedAvailableSid, setSelectedAvailableSid] = useState("");

  const [newClient, setNewClient] = useState({
    companyName: "",
    email: "",
    password: "",
  });

  const loadClients = async () => {
    try {
      const response = await getCompanies();
      setClients((response.data || []).map((company: any) => ({
        id: company.id,
        companyName: company.name,
        email: company.email || "",
        status: company.status,
        createdAt: company.created_at,
        employeeCount: company.employee_count || 0,
        phoneNumber: company.phone_number || "",
        twilioSid: company.twilio_sid || "",
        country: company.country || "--",
        retellAgentId: company.retell_agent_id || "Not configured",
        billingDueAmount: Number(company.billing_due_amount || 0),
        phoneNumbers: company.phone_numbers || [],
      })));
    } catch (error) {
      console.error("Failed to load companies:", error);
      toast.error("Failed to load clients from the database");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadClients();
    void syncPhoneNumbersToTrunk().catch(() => undefined);
    void getAvailablePhoneNumbers().then((response) => setAvailableNumbers(response.data || [])).catch(() => undefined);
  }, []);

  const stats = useMemo(() => ({
    total: clients.length,
    active: clients.filter((client) => client.status === "active").length,
    pending: clients.filter((client) => client.status === "pending").length,
    assignedNumbers: clients.reduce((total, client) => total + (client.phoneNumbers.length || (client.phoneNumber ? 1 : 0)), 0),
  }), [clients]);

  const handleAddClient = async () => {
    if (creatingClient) return;
    if (!newClient.companyName || !newClient.email || !newClient.password) {
      toast.error("Please fill all fields");
      return;
    }
    if (newClient.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setCreatingClient(true);
    try {
      await createCompany({
        name: newClient.companyName,
        adminEmail: newClient.email,
        adminPassword: newClient.password,
      });
      setNewClient({ companyName: "", email: "", password: "" });
      setShowAddModal(false);
      await loadClients();
      toast.success("Client created successfully");
    } catch (error) {
      console.error("Failed to create company:", error);
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setCreatingClient(false);
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (window.confirm("Permanently delete this client and all of its database data? This cannot be undone.")) {
      try {
        await deleteCompany(id);
        setSelectedClient(null);
        await loadClients();
        toast.success("Client removed");
      } catch (error) {
        console.error("Failed to delete company:", error);
        toast.error(error instanceof Error ? error.message : "Failed to remove client");
      }
    }
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    toast.success(`Editing ${client.companyName}`);
  };

  const handleGenerateNumber = async (client: Client) => {
    try {
      await purchasePhoneNumber(client.id, client.country === "--" ? undefined : client.country);
      await loadClients();
      setSelectedClient(null);
      toast.success("Twilio number purchased and assigned");
    } catch (error) {
      console.error("Failed to purchase Twilio number:", error);
      toast.error(error instanceof Error ? error.message : String(error));
    }
  };

  const handleAssignExistingNumber = async (client: Client) => {
    if (!selectedAvailableSid) {
      toast.error("Select an available number first");
      return;
    }
    try {
      await assignExistingPhoneNumber(client.id, selectedAvailableSid);
      await loadClients();
      const response = await getAvailablePhoneNumbers();
      setAvailableNumbers(response.data || []);
      setSelectedAvailableSid("");
      toast.success("Available Twilio number assigned");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to assign available number");
    }
  };

  const handleSaveBudget = async (client: Client) => {
    try {
      await updateCompany(client.id, { billing_due_amount: client.billingDueAmount });
      await loadClients();
      toast.success(`Budget saved for ${client.companyName}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save client budget");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminUser");
    localStorage.removeItem("adminToken");
    localStorage.removeItem("role");
    toast.success("Logged out successfully");
    navigate("/signin");
  };

  return (
    <div className="min-h-screen" style={{ background: "#F5F0E8" }}>
      <div className="pointer-events-none fixed inset-0" style={{
        background: "radial-gradient(ellipse 100% 55% at 50% 0%, rgba(255,253,247,1) 0%, transparent 100%)",
      }} />

      <svg
        className="pointer-events-none fixed inset-0 w-full h-full opacity-[0.04]"
        preserveAspectRatio="none" viewBox="0 0 1440 900" fill="none"
      >
        {[80, 180, 280, 380, 480].map((y, i) => (
          <path key={i} d={`M0,${y} C360,${y-25} 720,${y+25} 1440,${y}`} stroke="#7C6A50" strokeWidth="0.8" fill="none" />
        ))}
      </svg>

      <div className="relative z-10 border-b" style={{
        background: "rgba(255,255,255,0.75)",
        borderColor: "rgba(0,0,0,0.08)",
        backdropFilter: "blur(12px)",
      }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={Logo} alt="Logo" className="w-8" />
            <span className="ml-4 px-3 py-1 rounded-full text-xs font-bold" style={{ background: "#111827", color: "#FFFFFF" }}>
              ADMIN PORTAL
            </span>
          </div>

          <button
            onClick={() => navigate("/admin/edit-webpage")}
            className="flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all duration-200 hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.9)", border: "1px solid rgba(0,0,0,0.1)", color: "#111827" }}
          >
            <Globe size={16} />
            Edit Website
          </button>

          <button
            onClick={() => navigate("/admin/available-numbers")}
            className="flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all duration-200 hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.9)", border: "1px solid rgba(0,0,0,0.1)", color: "#111827" }}
          >
            <PhoneCall size={16} />
            Available Numbers
          </button>

          <button
            onClick={() => navigate("/admin/available-models")}
            className="flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all duration-200 hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.9)", border: "1px solid rgba(0,0,0,0.1)", color: "#111827" }}
          >
            <Bot size={16} />
            Available Models
          </button>

          <div className="flex flex-col gap-2 min-w-[240px] items-stretch">
            <button
              onClick={() => navigate("/admin/demo-requests")}
              className="flex items-center justify-between gap-2 rounded-full border border-[#D9D3C9] bg-[#F6F4F0] px-4 py-2.5 text-sm font-medium text-[#1F2430] transition-all duration-200 hover:bg-[#EFE9E0]"
            >
              <span className="flex items-center gap-2">
                <Inbox size={16} />
                Demo Requests
              </span>
            </button>

            <button
              onClick={() => navigate("/admin/company-requests")}
              className="flex items-center justify-between gap-2 rounded-full border border-[#D9D3C9] bg-[#F6F4F0] px-4 py-2.5 text-sm font-medium text-[#1F2430] transition-all duration-200 hover:bg-[#EFE9E0]"
            >
              <span className="flex items-center gap-2">
                <Building2 size={16} />
                Company Requests
              </span>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center justify-between gap-2 rounded-full border border-[#D9D3C9] bg-[#F6F4F0] px-4 py-2.5 text-sm font-medium text-[#1F2430] transition-all duration-200 hover:bg-[#EFE9E0]"
            >
              <span className="flex items-center gap-2">
                <LogOut size={16} />
                Logout
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-gray-500 font-bold">Operations Center</p>
            <h1 className="text-4xl font-extrabold mt-2" style={{ color: "#111827", letterSpacing: "-0.02em" }}>
              Client & Phone Management
            </h1>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-semibold text-[15px] transition-all duration-200 hover:shadow-lg"
            style={{ background: "#111827", color: "#FFFFFF" }}
          >
            <Plus size={18} />
            Add Client
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
          {[
            { label: "Total Clients", value: stats.total, icon: Building2, color: "#111827", bg: "rgba(17, 24, 39, 0.08)", text: "#111827" },
            { label: "Active", value: stats.active, icon: CheckCircle, color: "#16a34a", bg: "#dcfce7", text: "#166534" },
            { label: "Pending", value: stats.pending, icon: ShieldCheck, color: "#d97706", bg: "#fef3c7", text: "#92400e" },
            { label: "Assigned Numbers", value: stats.assignedNumbers, icon: PhoneCall, color: "#2563eb", bg: "#dbeafe", text: "#1d4ed8" },
          ].map((item) => (
            <div key={item.label} className="p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(0,0,0,0.08)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{item.label}</p>
                  <p className="text-3xl font-extrabold mt-2" style={{ color: item.text }}>{item.value}</p>
                </div>
                <div className="p-3 rounded-full" style={{ background: item.bg, color: item.color }}>
                  <item.icon size={22} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {selectedClient && (
          <div className="mb-8 rounded-3xl p-6" style={{ background: "rgba(255,255,255,0.85)", border: "1px solid rgba(0,0,0,0.08)" }}>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-gray-500 font-bold">Selected Company</p>
                <h2 className="text-2xl font-bold mt-2" style={{ color: "#111827" }}>{selectedClient.companyName}</h2>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <select value={selectedAvailableSid} onChange={(event) => setSelectedAvailableSid(event.target.value)} className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 outline-none">
                  <option value="">Select available number</option>
                  {availableNumbers.map((number) => <option key={number.twilio_sid} value={number.twilio_sid}>{number.phone_number}</option>)}
                </select>
                <button onClick={() => void handleAssignExistingNumber(selectedClient)} disabled={!selectedAvailableSid} className="flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><PhoneCall size={17} /> Assign Selected</button>
                <button onClick={() => void handleGenerateNumber(selectedClient)} className="flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold" style={{ background: "#111827", color: "#fff" }}><PhoneCall size={17} /> Generate New Number</button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div className="p-4 rounded-2xl" style={{ background: "#f8fafc", border: "1px solid rgba(0,0,0,0.06)" }}>
                <p className="text-gray-500">Assigned Numbers</p>
                <p className="mt-2 font-bold text-gray-900">{selectedClient.phoneNumbers.length || (selectedClient.phoneNumber ? 1 : 0)}</p>
              </div>
              <div className="p-4 rounded-2xl" style={{ background: "#f8fafc", border: "1px solid rgba(0,0,0,0.06)" }}>
                <p className="text-gray-500">Numbers</p>
                <p className="mt-2 break-words font-bold text-gray-900">{selectedClient.phoneNumbers.map((number) => number.phone_number).join(", ") || "--"}</p>
              </div>
              <div className="p-4 rounded-2xl" style={{ background: "#f8fafc", border: "1px solid rgba(0,0,0,0.06)" }}>
                <p className="text-gray-500">AI Agent</p>
                <p className="mt-2 font-bold text-gray-900">{selectedClient.retellAgentId}</p>
              </div>
              <div className="p-4 rounded-2xl" style={{ background: "#f8fafc", border: "1px solid rgba(0,0,0,0.06)" }}>
                <p className="text-gray-500">Region</p>
                <p className="mt-2 font-bold text-gray-900">{selectedClient.country}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#E4DAC3] bg-[#F8F4EC] p-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B7355]">Client budget</p>
                <p className="mt-1 text-sm text-gray-600">Set the amount this client will see as due on their billing page.</p>
              </div>
              <div className="flex items-center gap-2">
                <input type="number" min="0" step="0.01" value={selectedClient.billingDueAmount} onChange={(event) => setSelectedClient({ ...selectedClient, billingDueAmount: Number(event.target.value) })} className="w-36 rounded-xl border border-[#E4DAC3] bg-white px-4 py-3 text-right font-semibold text-gray-900 outline-none focus:border-[#8B7355]" aria-label="Client amount due" />
                <button onClick={() => void handleSaveBudget(selectedClient)} className="inline-flex items-center gap-2 rounded-xl bg-[#8B7355] px-4 py-3 text-sm font-semibold text-white hover:bg-[#6B5A3E]"><Save size={16} /> Save</button>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.9)", border: "1px solid rgba(0,0,0,0.08)" }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ background: "rgba(17,24,39,0.05)" }}>
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Client</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Phone Number</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">AI Agent</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Created</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center"><Spinner color="#8B7355" /></td>
                  </tr>
                ) : clients.map((client, index) => (
                  <motion.tr key={client.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} className="border-t" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white" style={{ background: "#111827" }}>
                          {client.companyName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{client.companyName}</div>
                          <div className="text-xs text-gray-500">{client.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-700">
                        <PhoneCall size={16} className="text-gray-500" />
                        <span>{client.phoneNumber || "Not assigned"}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Bot size={16} className="text-gray-500" />
                        <span>{client.retellAgentId}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                        style={{
                          background: client.status === "active" ? "#dcfce7" : client.status === "pending" ? "#fef3c7" : "#fee2e2",
                          color: client.status === "active" ? "#16a34a" : client.status === "pending" ? "#a16207" : "#dc2626",
                        }}
                      >
                        {client.status === "active" ? <CheckCircle size={12} /> : client.status === "pending" ? <Sparkles size={12} /> : <XCircle size={12} />}
                        {client.status.toUpperCase()}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-gray-600">{new Date(client.createdAt).toLocaleDateString()}</td>

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEditClient(client)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" title="Edit">
                          <Edit size={18} className="text-gray-600" />
                        </button>
                        <button onClick={() => handleDeleteClient(client.id)} className="p-2 rounded-lg hover:bg-red-50 transition-colors" title="Delete">
                          <Trash2 size={18} className="text-red-600" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

                {clients.length === 0 && (
            <div className="py-12 text-center">
              <Users size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 font-medium">No clients found</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} onClick={() => !creatingClient && setShowAddModal(false)}>
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 260 }} className="relative h-full w-full max-w-md overflow-y-auto rounded-l-3xl p-8" style={{ background: "#F5F0E8", boxShadow: "-12px 0 40px -18px rgba(0,0,0,0.45)" }} onClick={(e) => e.stopPropagation()}>
              <h2 className="text-2xl font-bold mb-6" style={{ color: "#111827" }}>Create Client</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Company Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input disabled={creatingClient} type="text" placeholder="Acme Corporation" value={newClient.companyName} onChange={(e) => setNewClient({ ...newClient, companyName: e.target.value })} className="w-full pl-12 pr-4 py-3 rounded-full border-2 text-gray-900 placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-60" style={{ borderColor: "#E5E7EB", background: "rgba(255,255,255,0.9)" }} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Admin Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input disabled={creatingClient} type="email" placeholder="admin@acme.com" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} className="w-full pl-12 pr-4 py-3 rounded-full border-2 text-gray-900 placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-60" style={{ borderColor: "#E5E7EB", background: "rgba(255,255,255,0.9)" }} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input disabled={creatingClient} type="password" placeholder="••••••••" value={newClient.password} onChange={(e) => setNewClient({ ...newClient, password: e.target.value })} className="w-full pl-12 pr-4 py-3 rounded-full border-2 text-gray-900 placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-60" style={{ borderColor: "#E5E7EB", background: "rgba(255,255,255,0.9)" }} />
                  </div>
                </div>

              </div>

              <div className="flex gap-3 mt-8">
                <button disabled={creatingClient} onClick={() => setShowAddModal(false)} className="flex-1 py-3 rounded-full font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60" style={{ background: "rgba(255,255,255,0.9)", border: "1px solid rgba(0,0,0,0.1)", color: "#111827" }}>
                  Cancel
                </button>
                <button disabled={creatingClient} onClick={handleAddClient} className="flex-1 py-3 rounded-full font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-70" style={{ background: "#111827", color: "#FFFFFF" }}>
                  {creatingClient ? <span className="flex items-center justify-center gap-2"><Spinner color="#FFFFFF" /> Creating...</span> : "Add Client"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPortal;
