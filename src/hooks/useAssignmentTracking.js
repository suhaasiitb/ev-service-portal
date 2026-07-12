import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export function useAssignmentTracking() {
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    async function fetchAssignments() {
        setLoading(true);
        setError(null);

        try {
            const { data, error: fetchError } = await supabase
                .from("rider_bike_assignments")
                .select(`
                    *,
                    riders (
                        name,
                        phone,
                        aadhar_no
                    ),
                    bikes (
                        bike_number
                    ),
                    clients (
                        name
                    ),
                    team_leads (
                        name
                    )
                `)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;

            const formatted = (data || []).map(row => {
                let rentalFirstDate = "-";
                if (row.assigned_at) {
                    const d = new Date(row.assigned_at);
                    d.setDate(d.getDate() + 1);
                    rentalFirstDate = d.toLocaleDateString();
                }

                return {
                    id: row.id,
                    // From riders
                    aadhar_no: row.riders?.aadhar_no || "-",
                    name: row.riders?.name || "-",
                    phone: row.riders?.phone || "-",
                    // From clients
                    client_name: row.clients?.name || "-",
                    clientele_id: row.clientele_id || "-",
                    // From bikes
                    bike_number: row.bikes?.bike_number || "-",
                    // Status calculation
                    status: row.unassigned_at ? "Inactive" : "Active",
                    // From team_leads
                    team_lead_name: row.team_leads?.name || "-",
                    // Assignment details
                    deposit_collected: row.deposit_collected || 0,
                    rental_first_date: rentalFirstDate,
                    unassigned_at: row.unassigned_at ? new Date(row.unassigned_at).toLocaleDateString() : "-",
                    unassign_reason: row.unassign_reason || "-",
                    
                    // Fields to calculate later
                    rental_amount: row.rental_amount !== null && row.rental_amount !== undefined ? `₹${row.rental_amount}` : "₹0",
                rent_received: "-",
                rent_received_qr: "-",
                waiver_amount: "-",
                traffic_challan: "-",
                damage_charges: "-",
                difference_amount: "-",
                rental_status: "-",
                refund_status: "-",
                refund_date: "-"
                };
            });

            setAssignments(formatted);
        } catch (err) {
            console.error("Error fetching assignment tracking:", err);
            setError(err.message);
            setAssignments([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchAssignments();
    }, []);

    return {
        assignments,
        loading,
        error,
        refetchAssignments: fetchAssignments,
    };
}
