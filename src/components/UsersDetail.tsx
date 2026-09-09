import { useEffect, useState, useRef } from 'react';
import { 
  X, 
  User as UserIcon, 
  Mail, 
  Shield, 
  Building2, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Calendar,
  Hash,
  Contact,
  CreditCard
} from 'lucide-react';
import { userDetail } from '../api/users';
import type { UserDetail as UserDetailType } from '../interface/users';
import toast from 'react-hot-toast';

interface UsersDetailProps {
    isOpen: boolean;
    onClose: () => void;
    userId: number | null;
}

function UsersDetail({ isOpen, onClose, userId }: UsersDetailProps) {
    const [user, setUser] = useState<UserDetailType | null>(null);
    const [loading, setLoading] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchUserData = async () => {
            if (!userId) return;
            try {
                setLoading(true);
                const data = await userDetail(userId.toString());
                setUser(data);
            } catch (err: any) {
                toast.error(err?.message || 'Failed to fetch user details');
                onClose();
            } finally {
                setLoading(false);
            }
        };

        if (isOpen && userId) {
            fetchUserData();
        }
    }, [isOpen, userId, onClose]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const DetailRow = ({ icon: Icon, label, value, colorClass = "text-gray-600" }: any) => (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50/50 border border-gray-100/50">
            <div className="p-2 bg-white rounded-lg shadow-xs border border-gray-100">
                <Icon className="w-4 h-4 text-cyan-500" />
            </div>
            <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
                <p className={`text-sm font-medium mt-0.5 ${colorClass}`}>{value || 'N/A'}</p>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-all duration-300">
            <div
                ref={modalRef}
                className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-gray-100 flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-linear-to-r from-cyan-50 to-white sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-cyan-100 flex items-center justify-center border border-cyan-200 shadow-sm text-cyan-700 font-bold text-lg">
                            {loading ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                (user?.full_name || user?.email || 'U').charAt(0).toUpperCase()
                            )}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 leading-none">
                                {loading ? 'Loading User...' : user?.full_name || 'User Details'}
                            </h2>
                            {!loading && user && (
                                <div className={`inline-flex items-center gap-1.5 text-xs font-bold mt-1.5 ${
                                    user.is_active ? 'text-emerald-600' : 'text-rose-500'
                                }`}>
                                    {user.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                    {user.is_active ? 'Active Account' : 'Deactivated'}
                                </div>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                            <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
                            <p className="text-gray-400 font-medium animate-pulse">Fetching user profile...</p>
                        </div>
                    ) : user ? (
                        <>
                            {/* Section: Basic Info */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <Contact className="w-4 h-4 text-cyan-600" />
                                    Basic Information
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <DetailRow icon={Mail} label="Email Address" value={user.email} />
                                    <DetailRow icon={Shield} label="User Role" value={user.role} />
                                    <DetailRow icon={Hash} label="User ID" value={`#${user.id}`} />
                                    <DetailRow icon={Building2} label="Company" value={user.onboarding_data?.company_name || user.onboarding_data?.company} />
                                </div>
                            </div>

                            {/* Section: Billing/Subscription */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-cyan-600" />
                                    Subscription Status
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <DetailRow 
                                        icon={Calendar} 
                                        label="Subscription" 
                                        value={user.subscription_status} 
                                        colorClass={user.subscription_status === 'active' ? 'text-emerald-600' : 'text-gray-600'}
                                    />
                                    <DetailRow icon={Hash} label="Stripe Customer ID" value={user.stripe_customer_id} />
                                </div>
                            </div>

                            {/* Section: Agents */}
                            {user.assigned_agents && user.assigned_agents.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                        <UserIcon className="w-4 h-4 text-cyan-600" />
                                        Assigned Agents ({user.assigned_agents.length})
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {user.assigned_agents.map((agent: any) => (
                                            <div key={agent.id} className="px-3 py-1.5 rounded-lg bg-cyan-50 border border-cyan-100 text-xs font-bold text-cyan-700">
                                                {agent.name}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-gray-400">User data not found.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end sticky bottom-0 z-10">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl transition-all font-semibold shadow-xs cursor-pointer active:scale-95"
                    >
                        Close Profile
                    </button>
                </div>
            </div>
        </div>
    );
}

export default UsersDetail;
