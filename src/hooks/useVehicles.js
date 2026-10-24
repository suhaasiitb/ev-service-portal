import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export function useVehicles() {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    async function fetchVehicles() {
        setLoading(true);
        setError(null);

        try {
            const { data, error: vehiclesError } = await supabase
                .from("bikes")
                .select(`
                    *,
                    bike_models(model_name),
                    assignments:rider_bike_assignments(
                        id,
                        battery_code,
                        rider_id,
                        unassigned_at,
                        riders(name)
                    ),
                    pdi_requests(
                        id,
                        status
                    )
                `)
                .order("bike_number")
                .order("created_at", { foreignTable: "rider_bike_assignments", ascending: false });

            if (vehiclesError) throw vehiclesError;

            // Format data
            const formattedVehicles = (data || []).map(vehicle => {
                // Find currently active assignment (unassigned_at is null)
                const activeAssignment = vehicle.assignments?.find(a => !a.unassigned_at) || null;
                const hasPendingPdi = vehicle.pdi_requests?.some(pdi => pdi.status === 'pending') || false;

                return {
                    ...vehicle,
                    model_name: vehicle.bike_models?.model_name || "-",
                    assignment_id: activeAssignment?.id || null,
                    assignment_status: activeAssignment ? "active" : "idle",
                    battery_code: activeAssignment?.battery_code || "-",
                    assignee_name: activeAssignment?.riders?.name || null,
                    has_pending_pdi: hasPendingPdi,
                };
            });

            setVehicles(formattedVehicles);
        } catch (err) {
            console.error("Error fetching vehicles:", err);
            setError(err.message);
            setVehicles([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchVehicles();
    }, []);

    return {
        vehicles,
        loading,
        error,
        refetchVehicles: fetchVehicles,
    };
}
