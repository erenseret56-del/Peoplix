import { useState } from "react";
import { 
    Menu, 
    ChevronDown, 
    LogOut,
    UserCircle 
} from "lucide-react";

interface NavbarProps {
    onToggleSidebar: () => void;
}

function Navbar({ onToggleSidebar }: NavbarProps) {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("role");
        window.location.href = "/signin";
    };

    return (
        <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-30">
            <div className="flex items-center gap-4">
                {/* Hamburger Menu Button - Mobile Only */}
                <button
                    onClick={onToggleSidebar}
                    className="lg:hidden p-2 rounded-lg hover:bg-gray-50 text-gray-500 transition-colors cursor-pointer"
                    aria-label="Toggle Sidebar"
                >
                    <Menu size={24} />
                </button>
                
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800 tracking-tight">
                    Dashboard
                </h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
                <div
                    className="relative flex items-center gap-2 cursor-pointer group"
                    onClick={() => setDropdownOpen((prev) => !prev)}
                >
                    <div className="w-9 h-9 rounded-xl bg-linear-to-br from-[#C9BC9E] to-[#8B7355] flex items-center justify-center text-white text-xs font-semibold shadow-md shadow-[#8B7355]/20 group-hover:scale-105 transition-transform">
                        {storedUser.email?.[0].toUpperCase() || <UserCircle size={20} />}
                    </div>
                    
                    <div className="hidden sm:block text-right">
                        <p className="text-xs font-bold text-gray-800 leading-tight">
                            {storedUser.email || "Unknown User"}
                        </p>
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mt-0.5">
                            {storedUser.role || "Role"}
                        </p>
                    </div>

                    <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />

                    {/* Dropdown */}
                    {dropdownOpen && (
                        <>
                            {/* Backdrop for explicit click-away */}
                            <div
                                className="fixed inset-0 z-10"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setDropdownOpen(false);
                                }}
                            />
                            <div className="absolute right-0 top-full mt-3 w-52 bg-white rounded-2xl border border-gray-100 shadow-xl z-20 overflow-hidden py-1 animate-in fade-in zoom-in duration-200 origin-top-right">
                                {/* User Info Header */}
                                <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                                    <p className="text-xs font-bold text-gray-800 truncate">
                                        {storedUser.email || "Unknown User"}
                                    </p>
                                    <p className="text-[10px] text-gray-400 capitalize mt-0.5">
                                        Logged in as {storedUser.role || "Role"}
                                    </p>
                                </div>
                                
                                {/* Logout Button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleLogout();
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors font-medium cursor-pointer"
                                >
                                    <LogOut size={16} />
                                    Logout
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}

export default Navbar;