import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export function useAnalyticsStats() {
  const [stats, setStats] = useState({
    pendingTickets: 0,
    pendingPDI: 0,
    pendingRepairs: 0,
  });
  const [loading, setLoading] = useState(true);

  async function fetchStats() {
    setLoading(true);
    try {
      // 1. Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }

      // 2. Get user's station_id from users table
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("station_id")
        .eq("id", session.user.id)
        .maybeSingle();

      if (userError || !userData?.station_id) {
        setLoading(false);
        return;
      }

      const userStationId = userData.station_id;

      // 3. Get station name to check if it's Nanded
      const { data: stationData, error: stationError } = await supabase
        .from("stations")
        .select("name")
        .eq("id", userStationId)
        .maybeSingle();

      const stationName = stationData?.name || "";
      const isNanded = stationName.toLowerCase().includes("nanded");

      // 3. Fetch Pending Tickets Count
      let ticketQuery = supabase
        .from("tickets")
        .select("id")
        .eq("status", "open");

      if (isNanded) {
        ticketQuery = ticketQuery.or(`ticket_type.ilike.b2c,and(ticket_type.ilike.b2b,station_id.eq.${userStationId})`);
      } else {
        ticketQuery = ticketQuery.eq("station_id", userStationId).ilike("ticket_type", "b2b");
      }
      
      const { data: ticketData, error: err1 } = await ticketQuery;
      if (err1) throw err1;

      // 4. Fetch Pending PDI Count
      const { data: pdiData, error: err2 } = await supabase
        .from("pdi_requests")
        .select("id")
        .eq("station_id", userStationId)
        .eq("status", "pending");
        
      if (err2) throw err2;

      // 5. Fetch Pending Repairs Count
      const { data: repairData, error: err3 } = await supabase
        .from("under_repair")
        .select("id, bikes!inner(station_id)")
        .eq("bikes.station_id", userStationId)
        .eq("status", "open");
        
      if (err3) throw err3;

      setStats({
        pendingTickets: ticketData?.length || 0,
        pendingPDI: pdiData?.length || 0,
        pendingRepairs: repairData?.length || 0,
      });

    } catch (err) {
      console.error("Error fetching analytics stats:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStats();
  }, []);

  return { stats, loading, refetchStats: fetchStats };
}
