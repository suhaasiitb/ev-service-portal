import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useState } from "react";

export default function ManagerLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(true);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/");
  }

  const isInventory = location.pathname === "/manager";
  const isTickets = location.pathname === "/manager/tickets";
  const isWalkins = location.pathname === "/manager/walkins";
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-56" : "w-14"
        } bg-slate-900 text-white flex flex-col transition-all duration-200`}
      >
        {/* Toggle */}
        <button
          onClick={() => setSidebarOpen((o) => !o)}
          className="p-2 text-xs hover:bg-slate-800"
          title={sidebarOpen ? "Collapse" : "Expand"}
        >
          {sidebarOpen ? "⟨" : "⟩"}
        </button>

        {sidebarOpen && (
          <div className="px-4 py-3 font-semibold border-b border-slate-700">
            Manager Panel
          </div>
        )}

        <nav className="flex-1 text-sm mt-1">
          <button
            onClick={() => navigate("/manager")}
            className={`w-full flex items-center gap-2 px-4 py-2 ${
              isInventory
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:bg-slate-800"
            }`}
          >
            📦 {sidebarOpen && "Inventory"}
          </button>

          <button
            onClick={() => navigate("/manager/tickets")}
            className={`w-full flex items-center gap-2 px-4 py-2 ${
              isTickets
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:bg-slate-800"
            }`}
          >
            🎫 {sidebarOpen && "Tickets"}
          </button>

          <button
            onClick={()=> navigate("/manager/walkins")}
            className={`w-full flex items-center gap-2 px-4 py-2 ${
              isWalkins
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:bg-slate-800"
            }`}
          >
            🧾 {sidebarOpen && "Walk-Ins"}
          </button>

          <button
            disabled
            className="w-full flex items-center gap-2 px-4 py-2 text-slate-600 cursor-not-allowed"
            title="Coming soon"
          >
            📊 {sidebarOpen && "KPIs & Charts"}
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 bg-white shadow">
          <h1 className="text-xl font-bold text-blue-700">
            Manager Dashboard
          </h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700"
          >
            Logout
          </button>
        </div>

        {/* Page Content */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
