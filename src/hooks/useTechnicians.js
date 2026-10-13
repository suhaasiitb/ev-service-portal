import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

import { getTechnicianShift, evaluateCheckInAdherence, evaluateShiftDuration } from "../utils/technicianShifts";

// UUID detection helper
const isUuid = (str) => typeof str === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

// Normalizes phone numbers (last 10 digits) to match between users and engineers tables
const normalizePhone = (p) => {
    if (!p) return "";
    const digits = String(p).replace(/\D/g, "");
    return digits.length > 10 ? digits.slice(-10) : digits;
};

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

            // 3. Fetch bikes table to create an in-memory UUID -> bike_number lookup map
            let bikesMap = {};
            try {
                const { data: bData, error: bErr } = await supabase
                    .from("bikes")
                    .select("id, bike_number");
                if (!bErr && bData) {
                    bData.forEach(b => {
                        if (b.id && b.bike_number) {
                            bikesMap[b.id] = b.bike_number;
                        }
                    });
                }
            } catch (bErr) {
                console.warn("Could not query bikes map:", bErr);
            }

            // 4. Fetch engineers table to correlate technicians with engineer_id in walkins/tickets
            let engineersList = [];
            try {
                const { data: engData, error: engErr } = await supabase
                    .from("engineers")
                    .select("id, name, phone, email, station_id");
                if (!engErr && engData) {
                    engineersList = engData;
                }
            } catch (engErr) {
                console.warn("Could not query engineers list:", engErr);
            }

            // 5. Fetch walkin_parts and parts_catalog for parts used in walkin jobs
            let walkinPartsMap = {};
            try {
                const [wpRes, pcRes] = await Promise.all([
                    supabase.from("walkin_parts").select("walkin_id, part_id, quantity"),
                    supabase.from("parts_catalog").select("id, part_name")
                ]);

                const catalogMap = {};
                if (pcRes.data) {
                    pcRes.data.forEach(p => {
                        catalogMap[p.id] = p.part_name;
                    });
                }

                if (wpRes.data) {
                    wpRes.data.forEach(row => {
                        const name = catalogMap[row.part_id] || "Part";
                        if (!walkinPartsMap[row.walkin_id]) {
                            walkinPartsMap[row.walkin_id] = [];
                        }
                        walkinPartsMap[row.walkin_id].push({
                            part_name: name,
                            quantity: row.quantity || 1
                        });
                    });
                }
            } catch (pErr) {
                console.warn("Could not query walkin parts / catalog:", pErr);
            }

            // 6. Fetch walkins (where technicians record walk-in jobs)
            let walkinsData = [];
            try {
                const { data: wData, error: wErr } = await supabase
                    .from("walkins")
                    .select(`
                        id,
                        station_id,
                        bike_id,
                        bike_number_text,
                        engineer_id,
                        issue_description,
                        logged_at,
                        cost_charged,
                        bikes (
                            bike_number
                        )
                    `)
                    .order("logged_at", { ascending: false });
                if (!wErr && wData) {
                    walkinsData = wData;
                }
            } catch (wErr) {
                console.warn("Could not query walkins:", wErr);
            }

            // 7. Fetch closed under_repair jobs
            let underRepairData = [];
            try {
                const { data: urData, error: urErr } = await supabase
                    .from("under_repair")
                    .select(`
                        id,
                        bike_id,
                        parts_used,
                        serviced_by,
                        close_date,
                        date_raised,
                        status,
                        bikes (
                            bike_number
                        )
                    `);
                if (!urErr && urData) {
                    underRepairData = urData;
                }
            } catch (urErr) {
                console.warn("Could not query under_repair for technician jobs:", urErr);
            }

            // 8. Fetch closed tickets
            let ticketsData = [];
            try {
                const { data: tData, error: tErr } = await supabase
                    .from("tickets")
                    .select(`
                        id,
                        bike_id,
                        bike_number_text,
                        station_id,
                        closed_by,
                        issue_description,
                        status,
                        reported_at,
                        closed_at,
                        cost_charged,
                        bikes (
                            bike_number
                        )
                    `)
                    .eq("status", "closed");
                if (!tErr && tData) {
                    ticketsData = tData;
                }
            } catch (tErr) {
                console.warn("Could not query tickets:", tErr);
            }

            // 9. Fetch technician_jobs (custom jobs table)
            let jobsData = [];
            try {
                const { data: jData, error: jError } = await supabase
                    .from("technician_jobs")
                    .select("*");
                if (!jError) {
                    jobsData = jData || [];
                }
            } catch (jErr) {
                console.warn("Could not query technician_jobs:", jErr);
            }

            // 10. Fetch today's attendance records
            const localTodayStr = new Date().toLocaleDateString('en-CA');
            const utcTodayStr = new Date().toISOString().split("T")[0];
            const todayStr = localTodayStr;

            let attendanceData = [];
            try {
                const { data: attData, error: attError } = await supabase
                    .from("technician_attendance")
                    .select("id, technician_id, date, check_in_time, check_out_time, approval_status")
                    .or(`date.eq.${localTodayStr},date.eq.${utcTodayStr}`);
                if (!attError) {
                    attendanceData = attData || [];
                }
            } catch (aErr) {
                console.warn("Could not query technician_attendance:", aErr);
            }

            // Helper to check if a timestamp or date string is from today
            const isToday = (dateVal) => {
                if (!dateVal) return false;
                const d = new Date(dateVal);
                if (!isNaN(d.getTime())) {
                    const local = d.toLocaleDateString("en-CA");
                    const utc = d.toISOString().split("T")[0];
                    if (local === localTodayStr || utc === utcTodayStr || local === utcTodayStr || utc === localTodayStr) {
                        return true;
                    }
                }
                if (typeof dateVal === "string") {
                    const prefix = dateVal.slice(0, 10);
                    if (prefix === localTodayStr || prefix === utcTodayStr) return true;
                }
                return false;
            };

            // Helper to resolve bike number from bike_number_text, joined bikes, or bike_id
            const resolveBikeNumber = (bikeNumberText, bikeId, joinedBike) => {
                if (bikeNumberText && typeof bikeNumberText === "string" && bikeNumberText.trim() && bikeNumberText.trim() !== "-") {
                    return bikeNumberText.trim();
                }
                if (joinedBike && typeof joinedBike === "object" && joinedBike.bike_number) {
                    return joinedBike.bike_number;
                }
                if (bikeId && bikesMap[bikeId]) {
                    return bikesMap[bikeId];
                }
                if (bikeId && typeof bikeId === "string" && !isUuid(bikeId) && bikeId !== "-") {
                    return bikeId;
                }
                return "N/A";
            };

            // Helper to format duration between two timestamps
            const calcDuration = (startDate, endDate, fallbackText = "-") => {
                const start = startDate ? new Date(startDate) : null;
                const end = endDate ? new Date(endDate) : null;
                if (start && end && !isNaN(start.getTime()) && !isNaN(end.getTime())) {
                    const diffMins = Math.max(0, Math.floor((end - start) / (1000 * 60)));
                    const h = Math.floor(diffMins / 60);
                    const m = diffMins % 60;
                    return h > 0 ? `${h}h ${m}m` : `${m}m`;
                }
                return fallbackText;
            };

            // Helper to collect all IDs associated with a technician across users and engineers
            const getMatchingIds = (tech) => {
                const ids = new Set([tech.id]);
                const techPhone = normalizePhone(tech.phone);
                const techName = (tech.name || "").trim().toLowerCase();
                const techEmail = (tech.email || "").trim().toLowerCase();

                engineersList.forEach(eng => {
                    const engPhone = normalizePhone(eng.phone);
                    const engName = (eng.name || "").trim().toLowerCase();
                    const engEmail = (eng.email || "").trim().toLowerCase();

                    const matchPhone = techPhone && engPhone && techPhone === engPhone;
                    const matchEmail = techEmail && engEmail && techEmail === engEmail;
                    const matchName = techName && engName && techName === engName;

                    if (eng.id === tech.id || matchPhone || matchEmail || matchName) {
                        ids.add(eng.id);
                    }
                });

                return ids;
            };

            // Map station object, job status, today's attendance, and completed jobs locally
            const formattedTechs = (techData || []).map(tech => {
                const matchedStation = validStations.find(s => s.id === tech.station_id);
                const techIds = getMatchingIds(tech);

                // Find if technician currently has an active job
                let activeJob = jobsData.find(j => 
                    (techIds.has(j.technician_id) || j.technician_id === tech.id) && 
                    (!j.completed_at && j.status !== 'completed' && j.status !== 'cancelled')
                );

                if (!activeJob) {
                    const openRepair = underRepairData.find(ur => 
                        (techIds.has(ur.serviced_by) || ur.serviced_by === tech.id) && 
                        !ur.close_date && 
                        ur.status !== 'closed' && 
                        ur.status !== 'completed'
                    );
                    if (openRepair) {
                        activeJob = {
                            id: `repair-${openRepair.id}`,
                            bike_number: resolveBikeNumber(null, openRepair.bike_id, openRepair.bikes),
                            job_type: "Under Repair",
                            started_at: openRepair.date_raised
                        };
                    }
                }

                // Find today's attendance log
                const todayAttendance = attendanceData.find(a => techIds.has(a.technician_id) || a.technician_id === tech.id);

                // 1. Completed walk-in jobs today
                const walkinsCompletedToday = walkinsData.filter(w => {
                    if (!techIds.has(w.engineer_id) && w.engineer_id !== tech.id) return false;
                    return isToday(w.logged_at);
                }).map(w => ({
                    id: `walkin-${w.id}`,
                    bike_number: resolveBikeNumber(w.bike_number_text, w.bike_id, w.bikes),
                    bike_number_text: w.bike_number_text || null,
                    bike_id: w.bike_id,
                    job_type: w.issue_description ? `Walk-In: ${w.issue_description}` : "Walk-In Service",
                    started_at: w.logged_at,
                    completed_at: w.logged_at,
                    duration: "Quick Service",
                    cost: w.cost_charged || 0,
                    parts_used: walkinPartsMap[w.id] || []
                }));

                // 2. Completed repairs from under_repair table today
                const underRepairCompletedToday = underRepairData.filter(ur => {
                    if (!techIds.has(ur.serviced_by) && ur.serviced_by !== tech.id) return false;
                    if (!ur.close_date) return false;
                    return isToday(ur.close_date);
                }).map(ur => ({
                    id: `repair-${ur.id}`,
                    bike_number: resolveBikeNumber(null, ur.bike_id, ur.bikes),
                    bike_number_text: null,
                    bike_id: ur.bike_id,
                    job_type: "Under Repair Service",
                    started_at: ur.date_raised,
                    completed_at: ur.close_date,
                    duration: calcDuration(ur.date_raised, ur.close_date, "Service Closed"),
                    parts_used: Array.isArray(ur.parts_used) ? ur.parts_used : []
                }));

                // 3. Completed tickets today
                const ticketsCompletedToday = ticketsData.filter(t => {
                    if (!techIds.has(t.closed_by) && t.closed_by !== tech.id) return false;
                    if (!t.closed_at) return false;
                    return isToday(t.closed_at);
                }).map(t => ({
                    id: `ticket-${t.id}`,
                    bike_number: resolveBikeNumber(t.bike_number_text, t.bike_id, t.bikes),
                    bike_number_text: t.bike_number_text || null,
                    bike_id: t.bike_id,
                    job_type: t.issue_description ? `Ticket: ${t.issue_description}` : "Ticket Closed",
                    started_at: t.reported_at,
                    completed_at: t.closed_at,
                    duration: calcDuration(t.reported_at, t.closed_at, "Ticket Closed"),
                    parts_used: []
                }));

                // 4. Completed jobs from technician_jobs table today
                const techJobsCompletedToday = jobsData.filter(j => {
                    if (!techIds.has(j.technician_id) && j.technician_id !== tech.id) return false;
                    const isCompletedStatus = j.status === 'completed' || (!j.status && j.completed_at);
                    if (!isCompletedStatus || !j.completed_at) return false;
                    return isToday(j.completed_at);
                }).map(j => ({
                    id: `job-${j.id}`,
                    bike_number: resolveBikeNumber(j.bike_number_text || j.bike_number, j.bike_id, j.bikes),
                    bike_number_text: j.bike_number_text || null,
                    job_type: j.job_type || "Repair / Inspection",
                    started_at: j.started_at,
                    completed_at: j.completed_at,
                    duration: calcDuration(j.started_at, j.completed_at, "-"),
                    parts_used: Array.isArray(j.parts_used) ? j.parts_used : (j.parts_used ? [j.parts_used] : [])
                }));

                // Combine all jobs completed by this technician today
                const allCompletedToday = [
                    ...walkinsCompletedToday,
                    ...underRepairCompletedToday,
                    ...ticketsCompletedToday,
                    ...techJobsCompletedToday
                ];

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
                    completed_jobs_today: allCompletedToday,
                    completed_jobs_today_count: allCompletedToday.length,
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

        // Subscribe to realtime changes on technician_jobs, under_repair, technician_attendance, walkins, and tickets
        const channel = supabase
            .channel("technician_management_realtime")
            .on("postgres_changes", { event: "*", schema: "public", table: "technician_jobs" }, () => {
                fetchTechniciansAndStations();
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "under_repair" }, () => {
                fetchTechniciansAndStations();
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "technician_attendance" }, () => {
                fetchTechniciansAndStations();
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "walkins" }, () => {
                fetchTechniciansAndStations();
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, () => {
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
