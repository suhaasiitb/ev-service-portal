import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useLocation } from "react-router-dom";
import ManagerLayout from "../layouts/ManagerLayout.jsx";
import ManagerInventoryDashboard from "./ManagerInventoryDashboard";
import ManagerTickets from "./ManagerTickets";
import ManagerWalkins from "./ManagerWalkins.jsx";

export default function ManagerWrapper() {
  const [session, setSession] = useState(null);
  const [roleChecked, setRoleChecked] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        navigate("/");
        return;
      }

      setSession(data.session);

      const { data: profile, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", data.session.user.id)
        .maybeSingle();

      if (error || !profile || profile.role !== "manager") {
        console.warn("Not a manager, redirecting to station dashboard");
        navigate("/dashboard");
        return;
      }

      setRoleChecked(true);
    }

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) navigate("/");
      }
    );

    return () => listener.subscription.unsubscribe();
  }, [location.pathname]);

  if (!session || !roleChecked) {
    return <p className="p-10 text-center">Loading manager dashboard...</p>;
  }

  let content = <ManagerInventoryDashboard/>;

  // route-based rendering for manager pages
  if (location.pathname === "/manager/tickets") {
    content = <ManagerTickets />;
  }

  if (location.pathname === "/manager/walkins") {
    return<ManagerWalkins />;
  }

  //default manager landing page
  return <ManagerLayout>{content}</ManagerLayout>;
}
