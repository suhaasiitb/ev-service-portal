import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export function useDashboardStats() {
    const [stats, setStats] = useState({
        activeRiders: 0,
        totalBikes: 0,
        pendingPDI: 0,
        stationWiseActive: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    async function fetchStats() {
        setLoading(true);
        setError(null);
        try {
            // 1. Active Riders (unassigned_at is null)
            const { count: activeRidersCount, error: err1 } = await supabase
                .from("rider_bike_assignments")
                .select("*", { count: "exact", head: true })
                .is("unassigned_at", null);
            if (err1) throw err1;

            // 2. Total Bikes
            const { count: totalBikesCount, error: err2 } = await supabase
                .from("bikes")
                .select("*", { count: "exact", head: true });
            if (err2) throw err2;

            // 3. Pending PDI
            const { count: pendingPDICount, error: err3 } = await supabase
                .from("pdi_requests")
                .select("*", { count: "exact", head: true })
                .eq("status", "pending");
            if (err3) throw err3;

            // 4. Station Wise Active Riders Count
            // We fetch the active assignments and their station names
            const { data: stationData, error: err4 } = await supabase
                .from("rider_bike_assignments")
                .select(`
                    id,
                    station_id,
                    stations (name)
                `)
                .is("unassigned_at", null);
            if (err4) throw err4;

            // Group by station
            const stationCounts = {};
            stationData.forEach(row => {
                const stationName = row.stations?.name || "Unassigned Station";
                stationCounts[stationName] = (stationCounts[stationName] || 0) + 1;
            });

            // Convert to array and sort by count descending
            const stationWiseActive = Object.keys(stationCounts).map(name => ({
                station: name,
                count: stationCounts[name]
            })).sort((a, b) => b.count - a.count);

            setStats({
                activeRiders: activeRidersCount || 0,
                totalBikes: totalBikesCount || 0,
                pendingPDI: pendingPDICount || 0,
                stationWiseActive
            });
        } catch (err) {
            console.error("Error fetching dashboard stats:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchStats();
    }, []);

    return { stats, loading, error, refetchStats: fetchStats };
}
