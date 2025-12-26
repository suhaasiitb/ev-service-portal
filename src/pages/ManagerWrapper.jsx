import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import ManagerInventoryDashboard from "./ManagerInventoryDashboard";

export default function ManagerWrapper() {
  const [session, setSession] = useState(null);
  const [roleChecked, setRoleChecked] = useState(false);
  const navigate = useNavigate();

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
  }, []);

  if (!session || !roleChecked) {
    return <p className="p-10 text-center">Loading manager dashboard...</p>;
  }

  return <ManagerInventoryDashboard />;
}
