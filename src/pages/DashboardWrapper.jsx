import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import TicketDashboard from "./TicketDashboard";

export default function DashboardWrapper() {
  const [session, setSession] = useState(null);
  const [checkingRole, setCheckingRole] = useState(true);
  const [stationName, setStationName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        navigate("/");
        return;
      }

      const currentSession = data.session;

      // Fetch user role + station_id
      const { data: profile, error } = await supabase
        .from("users")
        .select("role, station_id")
        .eq("id", currentSession.user.id)
        .maybeSingle();

      if (error || !profile) {
        console.error("Error fetching user profile:", error);
        navigate("/");
        return;
      }

      if (profile.role === "manager") {
        navigate("/manager");
        return;
      }

      // Fetch station name
      if (profile.station_id) {
        const { data: station, error: stationErr } = await supabase
          .from("stations")
          .select("name")
          .eq("id", profile.station_id)
          .maybeSingle();

        if (!stationErr && station?.name) {
          setStationName(station.name);
        }
      }

      setSession(currentSession);
      setCheckingRole(false);
    }

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) navigate("/");
      }
    );

    return () => listener.subscription.unsubscribe();
  }, [navigate]);

  if (!session || checkingRole) {
    return <p className="p-10 text-center">Loading dashboard...</p>;
  }

  return (
    <TicketDashboard
      session={session}
      stationName={stationName || "Station"}
    />
  );
}
