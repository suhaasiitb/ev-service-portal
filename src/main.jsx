import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage.jsx";
import TicketPage from "./pages/TicketPage.jsx";
import DashboardWrapper from "./pages/DashboardWrapper.jsx";
import { supabase } from "./lib/supabaseClient";
import "./index.css";

console.log("ENV CHECK:", {
  URL: import.meta.env.VITE_SUPABASE_URL,
  KEY: import.meta.env.VITE_SUPABASE_ANON_KEY
});

//
// 🔥 Global Auth Listener
// Redirects user to dashboard after successful login
//
function AuthWatcher({ children }) {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth event:", event, session);

        if (event === "SIGNED_IN") {
          navigate("/dashboard");  // redirect to dashboard
        }

        if (event === "SIGNED_OUT") {
          navigate("/"); // return to login
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  return children;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter basename="/ev-service-portal">
      <AuthWatcher>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/ticket" element={<TicketPage />} />
          <Route path="/dashboard" element={<DashboardWrapper />} />
        </Routes>
      </AuthWatcher>
    </BrowserRouter>
  </React.StrictMode>
);
