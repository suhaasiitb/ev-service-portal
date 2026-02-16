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
            riders(name)
          )
          ).order("created_at", { ascending: false }).limit(1)
        `)
                .order("bike_number");

            if (vehiclesError) throw vehiclesError;

            // Format data
            const formattedVehicles = (data || []).map(vehicle => {
                // Get the most recent assignment (assuming no status column)
                const activeAssignment = vehicle.assignments?.[0];

                return {
                    ...vehicle,
                    model_name: vehicle.bike_models?.model_name || "-",
                    assignment_id: activeAssignment?.id || null,
                    assignment_status: activeAssignment ? "active" : "idle", // Assuming the first assignment is the active one
                    battery_code: activeAssignment?.battery_code || "-",
                    assignee_name: activeAssignment?.riders?.name || null,
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
