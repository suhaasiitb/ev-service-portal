import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import TicketDashboard from "./TicketDashboard";
import { useNavigate } from "react-router-dom";

export default function DashboardWrapper() {
  const [session, setSession] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate("/");
      else setSession(data.session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate("/");
      else setSession(session);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (!session) return <p className="p-10 text-center">Loading...</p>;
  return <TicketDashboard session={session} />;
}
