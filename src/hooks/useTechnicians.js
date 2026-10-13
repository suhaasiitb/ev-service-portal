import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

import { getTechnicianShift, evaluateCheckInAdherence, evaluateShiftDuration } from "../utils/technicianShifts";

export function useTechnicians() {
    const [technicians, setTechnicians] = useState([]);
    const [stations, setStations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [updatingId, setUpdatingId] = useState(null);
    const [updatingShiftId, setUpdatingShiftId] = useState(null);

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
            let techData = [];
            // Try fetching with shift_timing column if it exists in DB, otherwise fallback
            try {
                const { data: tData, error: tErr } = await supabase
                    .from("users")
                    .select("id, name, email, phone, role, station_id, shift_timing, shift_start, shift_end")
                    .ilike("role", "%technician%")
                    .order("name");
                if (!tErr) {
                    techData = tData || [];
                } else {
                    // Fallback without shift columns if not yet run in migration
                    const { data: fallbackData, error: fbErr } = await supabase
                        .from("users")
                        .select("id, name, email, phone, role, station_id")
                        .ilike("role", "%technician%")
                        .order("name");
                    if (fbErr) throw fbErr;
                    techData = fallbackData || [];
                }
            } catch (err) {
                const { data: fallbackData, error: fbErr } = await supabase
                    .from("users")
                    .select("id, name, email, phone, role, station_id")
                    .ilike("role", "%technician%")
                    .order("name");
                if (fbErr) throw fbErr;
                techData = fallbackData || [];
            }

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

                // Calculate jobs completed today
                // Match jobs where completed_at is today (local time) or date string starts with todayStr
                const completedJobsToday = jobsData.filter(j => {
                    if (j.technician_id !== tech.id) return false;
                    const isCompletedStatus = j.status === 'completed' || (!j.status && j.completed_at);
                    if (!isCompletedStatus || !j.completed_at) return false;
                    
                    const compDate = new Date(j.completed_at);
                    const compDateStr = !isNaN(compDate) ? compDate.toLocaleDateString('en-CA') : (typeof j.completed_at === 'string' ? j.completed_at.slice(0, 10) : "");
                    return compDateStr === todayStr;
                });

                // Shift timing assigned to technician
                const assignedShift = getTechnicianShift(tech);

                // Shift evaluation for today's attendance
                const checkInAdherence = todayAttendance?.check_in_time 
                    ? evaluateCheckInAdherence(todayAttendance.check_in_time, assignedShift, todayStr)
                    : null;
                const shiftDuration = todayAttendance?.check_in_time
                    ? evaluateShiftDuration(todayAttendance.check_in_time, todayAttendance.check_out_time)
                    : null;

                return {
                    ...tech,
                    assigned_shift: assignedShift,
                    station: matchedStation ? { id: matchedStation.id, name: matchedStation.name } : null,
                    is_on_job: !!activeJob,
                    current_job: activeJob || null,
                    completed_jobs_today_count: completedJobsToday.length,
                    has_logged_today: !!todayAttendance,
                    today_attendance: todayAttendance || null,
                    check_in_adherence: checkInAdherence,
                    shift_duration: shiftDuration
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

    const updateTechnicianShift = async (technicianId, newShiftTiming) => {
        setUpdatingShiftId(technicianId);
        try {
            // Parse start and end (e.g., "08:00 - 18:00")
            const parts = newShiftTiming.split("-").map(p => p.trim());
            const start = parts[0] ? `${parts[0]}:00` : "08:00:00";
            const end = parts[1] ? `${parts[1]}:00` : "18:00:00";

            let updatedInDb = false;

            // Attempt 1: Try updating dedicated shift columns in `users`
            try {
                const { error: colErr } = await supabase
                    .from("users")
                    .update({ 
                        shift_timing: newShiftTiming,
                        shift_start: start,
                        shift_end: end
                    })
                    .eq("id", technicianId);

                if (!colErr) {
                    updatedInDb = true;
                }
            } catch (e) {
                // Ignore and proceed to fallback
            }

            // Attempt 2: If dedicated columns do not exist yet, embed in role or metadata
            if (!updatedInDb) {
                const currentTech = technicians.find(t => t.id === technicianId);
                const baseRole = (currentTech?.role || "technician").split(":")[0].trim();
                const encodedRole = `${baseRole}:shift=${newShiftTiming.replace(/\s+/g, '')}`;
                
                const { error: roleErr } = await supabase
                    .from("users")
                    .update({ role: encodedRole })
                    .eq("id", technicianId);

                if (roleErr) {
                    console.warn("Could not encode shift into role, falling back to local storage:", roleErr);
                }
            }

            // Always save to localStorage as well for instant local cache durability
            if (typeof window !== "undefined") {
                localStorage.setItem(`tech_shift_${technicianId}`, newShiftTiming);
            }

            // Optimistically update local state
            setTechnicians(prev => prev.map(tech => {
                if (tech.id === technicianId) {
                    const todayStr = new Date().toISOString().split("T")[0];
                    const checkInAdherence = tech.today_attendance?.check_in_time 
                        ? evaluateCheckInAdherence(tech.today_attendance.check_in_time, newShiftTiming, todayStr)
                        : null;
                    return {
                        ...tech,
                        shift_timing: newShiftTiming,
                        assigned_shift: newShiftTiming,
                        check_in_adherence: checkInAdherence
                    };
                }
                return tech;
            }));

            return { success: true };
        } catch (err) {
            console.error("Error updating technician shift timing:", err);
            return { success: false, error: err.message };
        } finally {
            setUpdatingShiftId(null);
        }
    };

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

        // Subscribe to realtime changes on technician_jobs and technician_attendance
        const channel = supabase
            .channel("technician_management_realtime")
            .on("postgres_changes", { event: "*", schema: "public", table: "technician_jobs" }, () => {
                fetchTechniciansAndStations();
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "technician_attendance" }, () => {
                fetchTechniciansAndStations();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return {
        technicians,
        stations,
        loading,
        error,
        updatingId,
        updatingShiftId,
        refetchTechnicians: fetchTechniciansAndStations,
        updateTechnicianStation,
        updateTechnicianShift
    };
}
