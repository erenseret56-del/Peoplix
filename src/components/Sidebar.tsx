import {
    LayoutDashboard,
    Users,
    Phone,
    FileText,
    Headphones,
    Receipt,
    X
} from "lucide-react";
import Logo from "../assets/images/peoplix-logo.png";
import { Link, useLocation } from "react-router-dom";

const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Users, label: "Users", path: "/users" },
    { icon: Users, label: "Agents", path: "/agents" },
    { icon: Phone, label: "Numbers", path: "/numbers" },
    { icon: Phone, label: "Reserved Number", path: "/reserved-number" },
    { icon: FileText, label: "Company Data", path: "/company-data" },
    { icon: Headphones, label: "Recordings", path: "/recordings" },
    { icon: Receipt, label: "Billing", path: "/billing" },
];

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

function Sidebar({ isOpen, onClose }: SidebarProps) {
    const location = useLocation();
    const isSuperAdmin = localStorage.getItem("role") === "super_admin";

    return (
        <>
            {/* Mobile Overlay / Backdrop */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden transition-opacity duration-300"
                    onClick={onClose}
                />
            )}

            <aside className={`fixed left-0 top-0 h-screen w-64 bg-[#F8F4EC] text-[#4A473D] flex flex-col z-40 shadow-xl border-r border-[#E8DDCA] transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {/* Brand Logo & Close Button for Mobile */}
                <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/5">
                            <img src={Logo} alt="Peoplix Logo" className="w-6 h-6 object-contain" />
                        </div>
                        <span className="text-xl font-bold text-[#17150F] tracking-wide">Peoplix</span>
                    </div>
                    {/* Close button - visible only on mobile when sidebar is open */}
                    <button 
                        onClick={onClose}
                        className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation Groups */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-8 scrollbar-hide">
                    {/* Main Navigation */}
                    <div>
                        <p className="px-3 text-[10px] font-bold text-[#8B7355] uppercase tracking-[0.2em] mb-4">
                            Main Menu
                        </p>
                        <nav className="space-y-1">
                            {navItems.filter((item) => (isSuperAdmin && item.path !== "/billing") || (!isSuperAdmin && ["/dashboard", "/company-data", "/reserved-number", "/recordings", "/billing"].includes(item.path))).map((item) => {
                                const isActive = location.pathname === item.path;
                                return (
                                    <Link
                                        key={item.label}
                                        to={item.path}
                                        onClick={() => {
                                            if (window.innerWidth < 1024) onClose();
                                        }}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
                        ${isActive
                                                ? "bg-[#E8DDCA]/45 text-[#6B5A3E] border border-[#E8DDCA] shadow-[0_0_15px_rgba(139,115,85,0.12)]"
                                                : "hover:bg-white/50 hover:text-[#17150F]"
                                            }`}
                                    >
                                        <item.icon size={20} className={`${isActive ? "text-[#8B7355]" : "text-[#8B8170] group-hover:text-[#17150F]"}`} />
                                        <span className="text-sm font-medium">{item.label}</span>
                                        {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#8B7355] shadow-[0_0_10px_rgba(139,115,85,0.7)]"></div>}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                </div>
            </aside>
        </>
    );
}

export default Sidebar;