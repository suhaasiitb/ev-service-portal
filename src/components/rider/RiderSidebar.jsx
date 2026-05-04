import { Link, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

export default function RiderSidebar() {
    const location = useLocation();

    const navItems = [
        { path: "/rider-dashboard", label: "Dashboard", icon: "📊" },
        { path: "/rider-dashboard/rider-management", label: "Rider Management", icon: "🏍️" },
        { path: "/rider-dashboard/vehicle-management", label: "Vehicle Management", icon: "🚲" },
        { path: "/rider-dashboard/assignment-tracking", label: "Assignment Tracking", icon: "📋" },
    ];

    async function handleLogout() {
        try {
            // Non-blocking logout ensures UI responds immediately
            await supabase.auth.signOut();
        } catch (err) {
            console.error("Logout error:", err);
        } finally {
            // Fallback for immediate redirection
            setTimeout(() => {
                if (window.location.pathname.includes("rider-dashboard")) {
                    window.location.href = "/ev-service-portal/";
                }
            }, 500);
        }
    }

    return (
        <div className="w-64 bg-gray-50 border-r border-gray-200 h-screen sticky top-0 p-4 flex flex-col">
            {/* Logo/Header */}
            <div className="mb-8">
                <div className="flex items-center gap-2 text-gray-800">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                        UC
                    </div>
                    <div>
                        <div className="font-semibold">Urban Connect</div>
                        <div className="text-xs text-gray-500">Management System</div>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="space-y-1 flex-1">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive
                                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                                    : "text-gray-700 hover:bg-gray-100"
                                }`}
                        >
                            <span>{item.icon}</span>
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Logout Button */}
            <div className="pt-4 border-t border-gray-200">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
                >
                    <span>🚪</span>
                    <span>Sign Out</span>
                </button>
            </div>
        </div>
    );
}
