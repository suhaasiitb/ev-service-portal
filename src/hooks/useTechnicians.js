import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export function useTechnicians() {
    const [technicians, setTechnicians] = useState([]);
    const [stations, setStations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [updatingId, setUpdatingId] = useState(null);

    async function fetchTechniciansAndStations() {
        setLoading(true);
        setError(null);
        try {
            // 1. Fetch all stations
            const { data: stationsData, error: stationsError } = await supabase
                .from("stations")
                .select("id, name")
                .order("name");

            if (stationsError) throw stationsError;
            const validStations = stationsData || [];
            setStations(validStations);

            // 2. Fetch technicians from users table where role contains 'technician'
            const { data: techData, error: techError } = await supabase
                .from("users")
                .select("id, name, email, phone, role, station_id")
                .ilike("role", "%technician%")
                .order("name");

            if (techError) throw techError;

            // 3. Fetch technician_jobs to determine active job status
            let jobsData = [];
            try {
                const { data: jData, error: jError } = await supabase
                    .from("technician_jobs")
                    .select("id, technician_id, status, job_type, started_at, completed_at");
                if (!jError) {
                    jobsData = jData || [];
                }
            } catch (jErr) {
                console.warn("Could not query technician_jobs:", jErr);
            }

            // 4. Fetch today's attendance records
            const todayStr = new Date().toISOString().split("T")[0];
            let attendanceData = [];
            try {
                const { data: attData, error: attError } = await supabase
                    .from("technician_attendance")
                    .select("id, technician_id, date, check_in_time, check_out_time, approval_status")
                    .eq("date", todayStr);
                if (!attError) {
                    attendanceData = attData || [];
                }
            } catch (aErr) {
                console.warn("Could not query technician_attendance:", aErr);
            }

            // Map station object, job status, and today's attendance locally
            const formattedTechs = (techData || []).map(tech => {
                const matchedStation = validStations.find(s => s.id === tech.station_id);

                // Find if technician currently has an active job
                const activeJob = jobsData.find(j => 
                    j.technician_id === tech.id && 
                    (!j.completed_at && j.status !== 'completed' && j.status !== 'cancelled')
                );

                // Find today's attendance log
                const todayAttendance = attendanceData.find(a => a.technician_id === tech.id);

                return {
                    ...tech,
                    station: matchedStation ? { id: matchedStation.id, name: matchedStation.name } : null,
                    is_on_job: !!activeJob,
                    current_job: activeJob || null,
                    has_logged_today: !!todayAttendance,
                    today_attendance: todayAttendance || null
                };
            });

            setTechnicians(formattedTechs);
        } catch (err) {
            console.error("Error fetching technicians:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    const updateTechnicianStation = async (technicianId, newStationId) => {
        setUpdatingId(technicianId);
        try {
            const targetStationId = newStationId === "" ? null : newStationId;
            const { error } = await supabase
                .from("users")
                .update({ station_id: targetStationId })
                .eq("id", technicianId);

            if (error) throw error;

            // Optimistically update local state
            setTechnicians(prev => prev.map(tech => {
                if (tech.id === technicianId) {
                    const matchedStation = stations.find(s => s.id === targetStationId);
                    return {
                        ...tech,
                        station_id: targetStationId,
                        station: matchedStation ? { id: matchedStation.id, name: matchedStation.name } : null
                    };
                }
                return tech;
            }));

            return { success: true };
        } catch (err) {
            console.error("Error updating technician station:", err);
            return { success: false, error: err.message };
        } finally {
            setUpdatingId(null);
        }
    };

    useEffect(() => {
        fetchTechniciansAndStations();
    }, []);

    return {
        technicians,
        stations,
        loading,
        error,
        updatingId,
        refetchTechnicians: fetchTechniciansAndStations,
        updateTechnicianStation
    };
}
