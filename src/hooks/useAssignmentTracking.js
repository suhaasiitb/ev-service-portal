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
                    ),
                    rent_collections (
                        amount
                    ),
                    rent_collections_qr (
                        amount
                    ),
                    rent_waivers (
                        amount
                    ),
                    traffic_challans (
                        amount
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

                // Sum up rent received
                const totalRentReceived = (row.rent_collections || []).reduce((sum, coll) => sum + Number(coll.amount), 0);
                const totalRentQR = (row.rent_collections_qr || []).reduce((sum, coll) => sum + Number(coll.amount), 0);
                const totalWaiver = (row.rent_waivers || []).reduce((sum, coll) => sum + Number(coll.amount), 0);
                const totalChallan = (row.traffic_challans || []).reduce((sum, coll) => sum + Number(coll.amount), 0);

                // Difference Amount Calculation
                const raw_rental = Number(row.rental_amount || 0);
                const raw_deposit = Number(row.deposit_collected || 0);
                const raw_damage = 0; // Skipping for now
                
                let diffAmount = 0;
                if (row.unassigned_at) {
                    // Inactive
                    diffAmount = (totalRentReceived + totalRentQR + totalWaiver + raw_deposit) - (raw_rental + totalChallan + raw_damage);
                } else {
                    // Active
                    diffAmount = (totalRentReceived + totalRentQR + totalWaiver) - (raw_rental + totalChallan + raw_damage);
                }

                const isPending = diffAmount < 0;

                return {
                    id: row.id,
                    rider_id: row.rider_id,
                    // From riders
                    aadhar_no: row.riders?.aadhar_no || "-",
                    name: row.riders?.name || "-",
                    phone: row.riders?.phone || "-",
                    // From clients
                    client_name: row.clients?.name || "-",
                    clientele_id: row.clientele_id || "-",
                    // From bikes
                    bike_number: row.bikes?.bike_number || "-",
                    battery_mode: row.battery_mode || "-",
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
                    raw_rental_amount: raw_rental,
                    rent_received: `₹${totalRentReceived}`,
                    rent_received_qr: `₹${totalRentQR}`,
                    waiver_amount: `₹${totalWaiver}`,
                    traffic_challan: `₹${totalChallan}`,
                    damage_charges: "-",
                    difference_amount: `₹${parseFloat(diffAmount.toFixed(1))}`,
                    raw_difference: diffAmount,
                    rental_status: isPending ? "Dues Pending ✖" : "No Pending Dues ✔",
                    refund_status: row.refund_status || "-",
                    refund_date: row.refund_date ? new Date(row.refund_date).toLocaleDateString() : "-"
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
