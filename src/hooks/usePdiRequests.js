import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export function usePdiRequests(stationId) {
    const [pdiRequests, setPdiRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    async function fetchPdiRequests() {
        if (!stationId) {
            setPdiRequests([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
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
                .eq("station_id", stationId)
                .eq("status", "pending")
                .order("created_at", { ascending: false });

            if (error) throw error;

            const formatted = (data || []).map((pdi) => ({
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
    }, [stationId]);

    return { pdiRequests, loading, refetchPdi: fetchPdiRequests };
}
