import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export type RepairTicket = {
  id: string;
  bike_id: string;
  pdi_request_id: string;
  pdi_raisedby: string;
  parts_required: { part_id: string; part_name: string; quantity: number }[];
  date_raised: string;
  status: string;
  serviced_by: string;

  // Joined fields
  bike_number: string;
  station_id: string;
  model_id: string;
  pdi_done_by_name: string;
  serviced_by_name: string;
};

export function useUnderRepair() {
  const [repairTickets, setRepairTickets] = useState<RepairTicket[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchRepairTickets() {
    setLoading(true);
    try {
      // 1. Get current session
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }

      // 2. Get user's station_id
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

      // 3. Fetch Repair Tickets for this station
      const { data, error } = await supabase
        .from("under_repair")
        .select(
          `
            *,
            bikes!inner(bike_number, station_id, model_id)
        `,
        )
        .eq("bikes.station_id", userStationId)
        .order("date_raised", { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map((item: any) => ({
        ...item,
        bike_number: item.bikes?.bike_number || "-",
        station_id: item.bikes?.station_id,
        model_id: item.bikes?.model_id,
        pdi_done_by_name: "Technician",
        serviced_by_name: "Technician",
      }));

      const filtered = formatted.filter(
        (t) => t.status !== "closed" && t.status !== "completed",
      );

      setRepairTickets(filtered);
    } catch (err) {
      console.error("Error fetching repair tickets:", err);
      setRepairTickets([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRepairTickets();
  }, []);

  return { repairTickets, loading, refetchRepair: fetchRepairTickets };
}
