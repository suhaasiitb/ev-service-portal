import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export type PdiRequest = {
  id: string;
  station_id: string;
  bike_id: string;
  assignment_id: string;
  status: string;
  created_at: string;
  // joined fields
  bike_number: string;
  model_id: string;
  rider_name: string;
  rider_phone: string;
};

export function usePdiRequests() {
  const [pdiRequests, setPdiRequests] = useState<PdiRequest[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchPdiRequests() {
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

      // 3. Fetch PDI requests
      const { data, error } = await supabase
        .from("pdi_requests")
        .select(`
            *,
            bikes(id, bike_number, model_id, station_id),
            rider_bike_assignments(
                id,
                rider_id,
                riders(name, phone)
            )
        `)
        .eq("station_id", userStationId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formatted = (data || [])
        .filter((pdi: any) => pdi.status !== "completed")
        .map((pdi: any) => ({
          ...pdi,
        bike_number: pdi.bikes?.bike_number || "-",
        model_id: pdi.bikes?.model_id,
        rider_name: pdi.rider_bike_assignments?.riders?.name || "-",
        rider_phone: pdi.rider_bike_assignments?.riders?.phone || "-",
      }));

      setPdiRequests(formatted);
    } catch (err) {
      console.error("Error fetching PDI requests:", err);
      setPdiRequests([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPdiRequests();
  }, []);

  return { pdiRequests, loading, refetchPdi: fetchPdiRequests };
}
