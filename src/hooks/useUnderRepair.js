import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export function useUnderRepair(stationId) {
    const [repairTickets, setRepairTickets] = useState([]);
    const [loading, setLoading] = useState(true);

    async function fetchRepairTickets() {
        if (!stationId) {
            setRepairTickets([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("under_repair")
                .select(`
                    *,
                    bikes!inner(bike_number, station_id, model_id),
                    pdi_engineer:engineers!under_repair_pdi_raisedby_fkey(name),
                    service_engineer:engineers!under_repair_serviced_by_fkey(name)
                `)
                .eq("bikes.station_id", stationId)
                .eq("status", "open")
                .order("date_raised", { ascending: false });

            if (error) throw error;

            const formatted = (data || []).map((item) => ({
                ...item,
                bike_number: item.bikes?.bike_number || "-",
                model_id: item.bikes?.model_id,
                pdi_done_by_name: item.pdi_engineer?.name || "-",
                serviced_by_name: item.service_engineer?.name || "-",
            }));

            setRepairTickets(formatted);
        } catch (err) {
            console.error("Error fetching repair tickets:", err);
            setRepairTickets([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchRepairTickets();
    }, [stationId]);

    return { repairTickets, loading, refetchRepair: fetchRepairTickets };
}
