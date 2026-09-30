import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export function useTechnicianAttendance(stationId) {
    const [attendance, setAttendance] = useState([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    async function fetchAttendance() {
        setLoading(true);
        setError(null);
        try {
            let query = supabase
                .from("technician_attendance")
                .select(`
                    *,
                    technician:users!technician_attendance_technician_id_fkey(id, name, email, phone),
                    station:stations(id, name, latitude, longitude)
                `)
                .order("check_in_time", { ascending: false });

            // If a stationId is provided, filter by it (optional for manager level, but good for station managers)
            if (stationId) {
                query = query.eq("station_id", stationId);
            }

            const { data, error: fetchError } = await query;

            if (fetchError) throw fetchError;

            setAttendance(data || []);
            
            // Calculate pending count
            const pending = (data || []).filter(
                (req) => req.approval_status === "pending" || req.check_out_approval_status === "pending"
            ).length;
            setPendingCount(pending);

        } catch (err) {
            console.error("Error fetching technician attendance:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchAttendance();
    }, [stationId]);

    const approveAttendance = async (attendanceId, managerId, isCheckOut = false) => {
        const updateData = isCheckOut
            ? { check_out_approval_status: 'approved', approved_by: managerId, approved_at: new Date().toISOString() }
            : { approval_status: 'approved', approved_by: managerId, approved_at: new Date().toISOString() };

        const { data, error } = await supabase
            .from('technician_attendance')
            .update(updateData)
            .eq('id', attendanceId);

        if (!error) await fetchAttendance();
        return { data, error };
    };

    const disapproveAttendance = async (attendanceId, managerId, reason, isCheckOut = false) => {
        const updateData = isCheckOut
            ? { check_out_approval_status: 'rejected', rejection_reason: reason, approved_by: managerId, approved_at: new Date().toISOString() }
            : { approval_status: 'rejected', rejection_reason: reason, approved_by: managerId, approved_at: new Date().toISOString() };

        const { data, error } = await supabase
            .from('technician_attendance')
            .update(updateData)
            .eq('id', attendanceId);

        if (!error) await fetchAttendance();
        return { data, error };
    };

    return {
        attendance,
        pendingCount,
        loading,
        error,
        refetchAttendance: fetchAttendance,
        approveAttendance,
        disapproveAttendance
    };
}
