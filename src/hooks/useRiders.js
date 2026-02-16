import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export function useRiders() {
    const [riders, setRiders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    async function fetchRiders() {
        setLoading(true);
        setError(null);

        try {
            // Fetch all riders first
            const { data: allRiders, error: ridersError } = await supabase
                .from("riders")
                .select("*");

            if (ridersError) throw ridersError;

            // Fetch all assignments (no status column)
            const { data: assignments, error: assignmentsError } = await supabase
                .from("rider_bike_assignments")
                .select(`
          *,
          bikes(bike_number),
          clients(name),
          team_leads(name)
        `);

            if (assignmentsError) throw assignmentsError;

            // Map assignments by rider_id for quick lookup
            const assignmentMap = {};
            (assignments || []).forEach((assignment) => {
                assignmentMap[assignment.rider_id] = assignment;
            });

            // Combine riders with assignment data
            const formattedRiders = (allRiders || []).map((rider) => {
                const assignment = assignmentMap[rider.id];

                if (assignment) {
                    return {
                        ...rider,
                        assignment_id: assignment.id,
                        assignment_status: "active",
                        assigned_vehicle: assignment.bikes?.bike_number || "-",
                        client_name: assignment.clients?.name || "-",
                        clientele_id: assignment.clientele_id || "-",
                        team_lead_name: assignment.team_leads?.name || "-",
                    };
                } else {
                    return {
                        ...rider,
                        assignment_id: null,
                        assignment_status: "idle",
                        assigned_vehicle: null,
                        client_name: "-",
                        clientele_id: "-",
                        team_lead_name: "-",
                    };
                }
            });

            setRiders(formattedRiders);
        } catch (err) {
            console.error("Error fetching riders:", err);
            setError(err.message);
            setRiders([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchRiders();
    }, []);

    return {
        riders,
        loading,
        error,
        refetchRiders: fetchRiders,
    };
}
