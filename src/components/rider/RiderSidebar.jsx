import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

export default function RiderSidebar() {
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const navItems = [
        { path: "/rider-dashboard", label: "Dashboard", icon: "📊" },
        { path: "/rider-dashboard/rider-management", label: "Rider Management", icon: "👤" },
        { path: "/rider-dashboard/vehicle-management", label: "Vehicle Management", icon: "🏍️" },
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
        <div className={`bg-gray-50 border-r border-gray-200 h-screen sticky top-0 p-4 flex flex-col transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
            {/* Logo/Header */}
            <div className="mb-8 flex items-center justify-between">
                <div className={`flex items-center gap-2 text-gray-800 ${isCollapsed ? 'justify-center w-full' : ''}`}>
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex shrink-0 items-center justify-center text-white font-bold">
                        UC
                    </div>
                    {!isCollapsed && (
                        <div>
                            <div className="font-semibold whitespace-nowrap">Urban Connect</div>
                            <div className="text-xs text-gray-500 whitespace-nowrap">Management System</div>
                        </div>
                    )}
                </div>
                {!isCollapsed && (
                    <button 
                        onClick={() => setIsCollapsed(true)}
                        className="text-gray-400 hover:text-gray-600 p-1"
                        title="Collapse Sidebar"
                    >
                        ❮
                    </button>
                )}
            </div>

            {/* Expand Button when Collapsed */}
            {isCollapsed && (
                <button
                    onClick={() => setIsCollapsed(false)}
                    className="mb-6 w-full flex justify-center text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-200"
                    title="Expand Sidebar"
                >
                    ❯
                </button>
            )}

            {/* Navigation */}
            <nav className="space-y-1 flex-1">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            title={isCollapsed ? item.label : ""}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive
                                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                                    : "text-gray-700 hover:bg-gray-100"
                                } ${isCollapsed ? 'justify-center px-0' : ''}`}
                        >
                            <span className="text-xl">{item.icon}</span>
                            {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* Logout Button */}
            <div className="pt-4 border-t border-gray-200">
                <button
                    onClick={handleLogout}
                    title={isCollapsed ? "Sign Out" : ""}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold text-red-600 hover:bg-red-50 transition-colors ${isCollapsed ? 'justify-center px-0' : ''}`}
                >
                    <span className="text-xl">🚪</span>
                    {!isCollapsed && <span className="whitespace-nowrap">Sign Out</span>}
                </button>
            </div>
        </div>
    );
}
