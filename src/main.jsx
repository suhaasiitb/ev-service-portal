import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage.jsx";
import TicketPage from "./pages/TicketPage.jsx";
import DashboardWrapper from "./pages/DashboardWrapper.jsx";
import ManagerWrapper from "./pages/ManagerWrapper.jsx";
import { supabase } from "./lib/supabaseClient";
import "./index.css";

console.log("ENV CHECK:", {
  URL: import.meta.env.VITE_SUPABASE_URL,
  KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
});

function AuthWatcher({ children }) {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth event:", event, session);

        if (event === "SIGNED_IN") {
          // Always go to /dashboard first,
          // DashboardWrapper will redirect managers to /manager.
          navigate("/dashboard");
        }

        if (event === "SIGNED_OUT") {
          navigate("/");
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, [navigate]);

  return children;
}

ReactDOM.createRoot(document.getElementById("root")).render(
    <BrowserRouter basename="/ev-service-portal">
      <AuthWatcher>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/ticket" element={<TicketPage />} />
          <Route path="/dashboard" element={<DashboardWrapper />} />
          <Route path="/manager" element={<ManagerWrapper />} />
          <Route path="/manager/tickets" element={<ManagerWrapper />} />
          <Route path="/manager/walkins" element={<ManagerWrapper />} />
        </Routes>
      </AuthWatcher>
    </BrowserRouter>
);
