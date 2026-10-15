import { useState } from "react";
import { STANDARD_SHIFTS, DEFAULT_SHIFT, formatTime12Hr } from "../../utils/technicianShifts";

function getElapsedTime(startedAt) {
    if (!startedAt) return "";
    const start = new Date(startedAt);
    const now = new Date();
    const diffMs = now - start;

    if (diffMs < 0) return "0m";

    const diffMins = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    if (hours > 0) {
        return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
}

export default function TechnicianRosterTab({ 
    technicians, 
    stations, 
    loading, 
    updatingId, 
    updatingShiftId, 
    selectedDate,
    onDateChange,
    onUpdateStation,
    onUpdateShift 
}) {
    const localToday = new Date().toLocaleDateString('en-CA');
    const isSelectedToday = !selectedDate || selectedDate === localToday;

    const formatDateDisplay = (dateStr) => {
        if (!dateStr || dateStr === localToday) return "Today";
        const d = new Date(dateStr + "T00:00:00");
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    };

    const handlePrevDay = () => {
        if (!onDateChange) return;
        const current = selectedDate || localToday;
        const d = new Date(current + "T00:00:00");
        d.setDate(d.getDate() - 1);
        onDateChange(d.toLocaleDateString('en-CA'));
    };

    const handleNextDay = () => {
        if (!onDateChange) return;
        const current = selectedDate || localToday;
        const d = new Date(current + "T00:00:00");
        d.setDate(d.getDate() + 1);
        onDateChange(d.toLocaleDateString('en-CA'));
    };

    const handleTodayReset = () => {
        if (onDateChange) onDateChange(localToday);
    };

    const [searchQuery, setSearchQuery] = useState("");
    const [stationFilter, setStationFilter] = useState("all");
    const [jobStatusFilter, setJobStatusFilter] = useState("all");
    const [attendanceFilter, setAttendanceFilter] = useState("all");
    const [shiftFilter, setShiftFilter] = useState("all");
    const [configModalTech, setConfigModalTech] = useState(null); // Technician being edited
    const [jobsModalTech, setJobsModalTech] = useState(null); // Technician whose jobs are viewed in popup
    const [saveFeedback, setSaveFeedback] = useState({}); // { [techId]: 'success' | 'error' }
    const [shiftSaveFeedback, setShiftSaveFeedback] = useState({}); // { [techId]: 'success' | 'error' }

    const handleStationChange = async (techId, newStationId) => {
        const res = await onUpdateStation(techId, newStationId);
        if (res.success) {
            setSaveFeedback(prev => ({ ...prev, [techId]: "success" }));
            setTimeout(() => {
                setSaveFeedback(prev => {
                    const copy = { ...prev };
                    delete copy[techId];
                    return copy;
                });
            }, 2500);
        } else {
            setSaveFeedback(prev => ({ ...prev, [techId]: "error" }));
            alert("Failed to update station: " + res.error);
        }
    };

    const handleShiftChange = async (techId, newShift) => {
        if (!onUpdateShift) return;
        const res = await onUpdateShift(techId, newShift);
        if (res.success) {
            setShiftSaveFeedback(prev => ({ ...prev, [techId]: "success" }));
            setTimeout(() => {
                setShiftSaveFeedback(prev => {
                    const copy = { ...prev };
                    delete copy[techId];
                    return copy;
                });
            }, 2500);
        } else {
            setShiftSaveFeedback(prev => ({ ...prev, [techId]: "error" }));
            alert("Failed to update shift timing: " + res.error);
        }
    };

    const filteredTechnicians = technicians.filter(tech => {
        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesName = tech.name?.toLowerCase().includes(query);
            const matchesEmail = tech.email?.toLowerCase().includes(query);
            const matchesPhone = tech.phone?.includes(query);
            const matchesStation = tech.station?.name?.toLowerCase().includes(query);
            if (!matchesName && !matchesEmail && !matchesPhone && !matchesStation) return false;
        }

        // Station filter
        if (stationFilter !== "all") {
            if (stationFilter === "unassigned") {
                if (tech.station_id) return false;
            } else {
                if (tech.station_id !== stationFilter) return false;
            }
        }

        // Job Status filter (on_job vs idle)
        if (jobStatusFilter !== "all") {
            if (jobStatusFilter === "on_job") {
                if (!tech.is_on_job) return false;
            } else if (jobStatusFilter === "idle") {
                if (tech.is_on_job) return false;
            }
        }

        // Attendance Filter (logged vs not_logged)
        if (attendanceFilter !== "all") {
            if (attendanceFilter === "logged") {
                if (!tech.has_logged_today) return false;
            } else if (attendanceFilter === "not_logged") {
                if (tech.has_logged_today) return false;
            }
        }

        // Shift Filter
        if (shiftFilter !== "all") {
            if (tech.assigned_shift !== shiftFilter) return false;
        }

        return true;
    });

    const totalCount = technicians.length;
    const assignedCount = technicians.filter(t => t.station_id).length;
    const onJobCount = technicians.filter(t => t.is_on_job).length;
    const loggedTodayCount = technicians.filter(t => t.has_logged_today).length;
    const notLoggedTodayCount = totalCount - loggedTodayCount;
    const totalCompletedJobs = technicians.reduce((sum, t) => sum + (t.completed_jobs_today_count || 0), 0);

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm text-gray-500 font-medium">
                Loading technicians roster...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Quick Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-2xs">
                    <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Technicians</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">{totalCount}</div>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                        👨‍🔧
                    </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between shadow-2xs">
                    <div>
                        <div className="text-xs font-semibold text-green-700 uppercase tracking-wider">
                            {isSelectedToday ? "Logged Today" : "Present on Date"}
                        </div>
                        <div className="text-2xl font-bold text-green-700 mt-1">{loggedTodayCount}</div>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-green-100 text-green-700 flex items-center justify-center font-bold text-lg">
                        ✅
                    </div>
                </div>

                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between shadow-2xs">
                    <div>
                        <div className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
                            {isSelectedToday ? "Not Logged Today" : "Absent on Date"}
                        </div>
                        <div className="text-2xl font-bold text-rose-700 mt-1">{notLoggedTodayCount}</div>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-lg">
                        ⏳
                    </div>
                </div>

                {isSelectedToday ? (
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center justify-between shadow-2xs">
                        <div>
                            <div className="text-xs font-semibold text-purple-700 uppercase tracking-wider">On a Job</div>
                            <div className="text-2xl font-bold text-purple-700 mt-1">{onJobCount}</div>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-lg">
                            ⚡
                        </div>
                    </div>
                ) : (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between shadow-2xs">
                        <div>
                            <div className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">Jobs Completed</div>
                            <div className="text-2xl font-bold text-indigo-700 mt-1">{totalCompletedJobs}</div>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg">
                            🛠️
                        </div>
                    </div>
                )}
            </div>

            {/* Table Container */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Search & Filters */}
                <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex flex-1 flex-wrap gap-3 items-center w-full md:w-auto">
                        <input
                            type="text"
                            placeholder="🔍 Search technician name, email, phone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />

                        {/* Date Filter Controls */}
                        <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 shadow-2xs">
                            <span className="text-sm mr-1">📅</span>
                            <button
                                type="button"
                                onClick={handlePrevDay}
                                className="w-6 h-6 rounded flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 text-xs font-bold transition-colors cursor-pointer"
                                title="Previous Day"
                            >
                                ◀
                            </button>
                            <input
                                type="date"
                                value={selectedDate || localToday}
                                onChange={(e) => onDateChange && onDateChange(e.target.value)}
                                className="text-xs font-bold text-gray-800 bg-transparent focus:outline-none cursor-pointer"
                            />
                            <button
                                type="button"
                                onClick={handleNextDay}
                                className="w-6 h-6 rounded flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 text-xs font-bold transition-colors cursor-pointer"
                                title="Next Day"
                            >
                                ▶
                            </button>
                            {!isSelectedToday && (
                                <button
                                    type="button"
                                    onClick={handleTodayReset}
                                    className="ml-1.5 px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[11px] font-bold transition-colors cursor-pointer"
                                    title="Reset to Today"
                                >
                                    Today
                                </button>
                            )}
                        </div>

                        {/* Attendance Filter */}
                        <select
                            value={attendanceFilter}
                            onChange={(e) => setAttendanceFilter(e.target.value)}
                            className="px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                        >
                            <option value="all">All Attendance</option>
                            <option value="logged">{isSelectedToday ? "✅ Logged Today" : "✅ Present on Date"}</option>
                            <option value="not_logged">{isSelectedToday ? "❌ Not Logged Today" : "❌ Absent on Date"}</option>
                        </select>

                        {/* Job Activity Filter */}
                        <select
                            value={jobStatusFilter}
                            onChange={(e) => setJobStatusFilter(e.target.value)}
                            className="px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                        >
                            <option value="all">All Job Statuses</option>
                            <option value="on_job">⚡ On a Job</option>
                            <option value="idle">☕ Idle</option>
                        </select>

                        {/* Station Filter */}
                        <select
                            value={stationFilter}
                            onChange={(e) => setStationFilter(e.target.value)}
                            className="px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                        >
                            <option value="all">All Stations</option>
                            <option value="unassigned">Unassigned Only</option>
                            {stations.map(st => (
                                <option key={st.id} value={st.id}>{st.name}</option>
                            ))}
                        </select>

                        {/* Shift Timing Filter */}
                        <select
                            value={shiftFilter}
                            onChange={(e) => setShiftFilter(e.target.value)}
                            className="px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                        >
                            <option value="all">All Shifts (10 hrs)</option>
                            {STANDARD_SHIFTS.map(s => (
                                <option key={s.id} value={s.id}>{s.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="text-xs text-gray-500 font-medium">
                        Showing {filteredTechnicians.length} of {totalCount} technicians
                    </div>
                </div>

                {/* Data Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/90 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Technician</th>
                                <th className="px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">
                                    {isSelectedToday ? "Today's Attendance" : `Attendance (${formatDateDisplay(selectedDate)})`}
                                </th>
                                <th className="px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Shift Tracking</th>
                                <th className="px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">
                                    {isSelectedToday ? "Job Status" : "Work Status"}
                                </th>
                                <th className="px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">
                                    {isSelectedToday ? "Jobs Done Today" : `Jobs Done (${formatDateDisplay(selectedDate)})`}
                                </th>
                                <th className="px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredTechnicians.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 font-medium">
                                        No technicians found matching filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredTechnicians.map(tech => {
                                    const isUpdating = updatingId === tech.id;
                                    const feedback = saveFeedback[tech.id];

                                    return (
                                        <tr key={tech.id} className="hover:bg-blue-50/20 transition-colors">
                                            {/* Technician Name & Details */}
                                            <td className="px-6 py-4 align-middle">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                                                        {tech.name?.charAt(0)?.toUpperCase() || "T"}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-semibold text-gray-900 text-sm truncate">
                                                            {tech.name || "Unnamed Technician"}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500 flex-wrap">
                                                            <span className="inline-flex items-center text-gray-600 font-medium">
                                                                <span className="mr-1 text-[11px]">📍</span>
                                                                {tech.station?.name || "Unassigned"}
                                                            </span>
                                                            <span className="text-gray-300">•</span>
                                                            <span className="inline-flex items-center text-gray-500 font-mono text-[11px]">
                                                                <span className="mr-1 text-[11px]">⏰</span>
                                                                {tech.assigned_shift ? tech.assigned_shift.replace(' - ', '–') : DEFAULT_SHIFT}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Today's Attendance Column (Centered) */}
                                            <td className="px-4 py-4 text-center align-middle">
                                                <div className="flex flex-col items-center justify-center gap-1">
                                                    {tech.has_logged_today ? (
                                                        <>
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                                                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                                                {isSelectedToday ? "Logged In" : "Present"}
                                                            </span>
                                                            {tech.today_attendance?.check_in_time && (
                                                                <span className="text-[11px] text-gray-500 font-medium">
                                                                    at {new Date(tech.today_attendance.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200/80 shadow-2xs">
                                                            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                                            {isSelectedToday ? "Not Logged" : "Absent"}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Shift Tracking (Login Adherence & 10 Hours Clocked - Centered) */}
                                            <td className="px-4 py-4 text-center align-middle">
                                                <div className="flex flex-col items-center justify-center gap-1.5">
                                                    {tech.has_logged_today ? (
                                                        <>
                                                            {tech.check_in_adherence && (
                                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-2xs ${tech.check_in_adherence.badgeClass}`}>
                                                                    <span>{tech.check_in_adherence.isCompliant ? "✓" : "⚠️"}</span>
                                                                    <span>{tech.check_in_adherence.label}</span>
                                                                </span>
                                                            )}
                                                            {tech.shift_duration && (
                                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shadow-2xs ${tech.shift_duration.badgeClass}`}>
                                                                    <span>⏱️</span>
                                                                    <span>{tech.shift_duration.statusLabel}</span>
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 font-medium italic">
                                                            {isSelectedToday ? "Pending Login" : "No Attendance"}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Job Status Column with Elapsed Duration (Centered) */}
                                            <td className="px-4 py-4 text-center align-middle">
                                                <div className="flex flex-col items-center justify-center gap-1">
                                                    {isSelectedToday ? (
                                                        tech.is_on_job ? (
                                                            <>
                                                                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs">
                                                                    <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
                                                                    On a Job {tech.current_job?.job_type ? `(${tech.current_job.job_type})` : ''}
                                                                </span>
                                                                {tech.current_job?.started_at && (
                                                                    <span className="text-[11px] text-purple-700 font-medium flex items-center gap-1">
                                                                        <span>⏱️</span>
                                                                        <span>Active for {getElapsedTime(tech.current_job.started_at)}</span>
                                                                    </span>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200 shadow-2xs">
                                                                <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                                                                Idle
                                                            </span>
                                                        )
                                                    ) : (
                                                        tech.completed_jobs_today_count > 0 ? (
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                                                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                                                Completed {tech.completed_jobs_today_count} {tech.completed_jobs_today_count === 1 ? 'job' : 'jobs'}
                                                            </span>
                                                        ) : tech.has_logged_today ? (
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
                                                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                                                Present
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200 shadow-2xs">
                                                                <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                                                                Absent
                                                            </span>
                                                        )
                                                    )}
                                                </div>
                                            </td>

                                            {/* Jobs Done Today Column (Centered) */}
                                            <td className="px-4 py-4 text-center align-middle">
                                                <div className="flex items-center justify-center">
                                                    <button
                                                        onClick={() => setJobsModalTech(tech)}
                                                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all shadow-xs cursor-pointer ${
                                                            (tech.completed_jobs_today_count || 0) > 0
                                                                ? "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 hover:scale-105"
                                                                : "bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100"
                                                        }`}
                                                        title="Click to view jobs details"
                                                    >
                                                        <span>🛠️</span>
                                                        <span>{tech.completed_jobs_today_count || 0} {tech.completed_jobs_today_count === 1 ? 'job' : 'jobs'} done</span>
                                                        <span className="text-[10px] text-blue-500 font-bold ml-0.5">↗</span>
                                                    </button>
                                                </div>
                                            </td>

                                            {/* Actions Column (Centered) */}
                                            <td className="px-4 py-4 text-center align-middle">
                                                <div className="flex items-center justify-center">
                                                    <button
                                                        onClick={() => setConfigModalTech(tech)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-gray-200 transition-all shadow-xs cursor-pointer active:scale-95"
                                                        title="Manage station and shift assignment"
                                                    >
                                                        <span>⚙️</span>
                                                        <span>Manage</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal for Changing Station & Shift Timings */}
            {configModalTech && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
                        onClick={() => setConfigModalTech(null)}
                    />

                    {/* Dialog Container */}
                    <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
                        {/* Header */}
                        <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-base">
                                    {configModalTech.name?.charAt(0)?.toUpperCase() || "T"}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-base">{configModalTech.name || "Technician"}</h3>
                                    <p className="text-xs text-gray-500">Edit station assignment and shift timing</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setConfigModalTech(null)}
                                className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Body Form */}
                        <div className="p-6 space-y-5">
                            {/* Tagged Station Field */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                    📍 Tagged Station
                                </label>
                                <select
                                    value={configModalTech.station_id || ""}
                                    disabled={updatingId === configModalTech.id}
                                    onChange={async (e) => {
                                        const newStationId = e.target.value;
                                        await handleStationChange(configModalTech.id, newStationId);
                                        const matched = stations.find(s => s.id === newStationId);
                                        setConfigModalTech(prev => ({
                                            ...prev,
                                            station_id: newStationId,
                                            station: matched ? { id: matched.id, name: matched.name } : null
                                        }));
                                    }}
                                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                                >
                                    <option value="">-- Unassigned --</option>
                                    {stations.map(st => (
                                        <option key={st.id} value={st.id}>{st.name}</option>
                                    ))}
                                </select>
                                {saveFeedback[configModalTech.id] === "success" && (
                                    <p className="text-xs text-green-600 font-bold mt-1.5 flex items-center gap-1">
                                        ✓ Station updated successfully!
                                    </p>
                                )}
                            </div>

                            {/* Assigned Shift Timings Field */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                    ⏰ Shift Timing (10 Hours)
                                </label>
                                <select
                                    value={configModalTech.assigned_shift || DEFAULT_SHIFT}
                                    disabled={updatingShiftId === configModalTech.id}
                                    onChange={async (e) => {
                                        const newShift = e.target.value;
                                        await handleShiftChange(configModalTech.id, newShift);
                                        setConfigModalTech(prev => ({
                                            ...prev,
                                            assigned_shift: newShift,
                                            shift_timing: newShift
                                        }));
                                    }}
                                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                                >
                                    {STANDARD_SHIFTS.map(s => (
                                        <option key={s.id} value={s.id}>{s.label}</option>
                                    ))}
                                </select>
                                {shiftSaveFeedback[configModalTech.id] === "success" && (
                                    <p className="text-xs text-green-600 font-bold mt-1.5 flex items-center gap-1">
                                        ✓ Shift timing updated successfully!
                                    </p>
                                )}
                                <p className="text-[11px] text-gray-500 mt-1">
                                    Check-in allowed within ±30 minutes of shift start. Clocking 10 hours required.
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={() => setConfigModalTech(null)}
                                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal for Jobs Done Today in Tabular Form */}
            {jobsModalTech && (
                <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
                        onClick={() => setJobsModalTech(null)}
                    />

                    {/* Modal Dialog */}
                    <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        {/* Header */}
                        <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg">
                                    🛠️
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                                        Jobs Done: {jobsModalTech.name || "Technician"}
                                        <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
                                            {jobsModalTech.completed_jobs_today_count || 0} Total
                                        </span>
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Completed repairs and service logs for {formatDateDisplay(selectedDate)}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setJobsModalTech(null)}
                                className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Content Body: Tabular form */}
                        <div className="p-6 overflow-y-auto flex-1">
                            {!jobsModalTech.completed_jobs_today || jobsModalTech.completed_jobs_today.length === 0 ? (
                                <div className="p-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                    <div className="text-3xl mb-2">☕</div>
                                    <p className="text-sm font-bold text-gray-700">No jobs completed on this date</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        This technician has no completed repair jobs recorded for {formatDateDisplay(selectedDate)}.
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-gray-200">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-50 border-b border-gray-200">
                                            <tr>
                                                <th className="px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center w-12">#</th>
                                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Bike No</th>
                                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Job Type</th>
                                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Time Spent</th>
                                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Parts Used</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 bg-white">
                                            {jobsModalTech.completed_jobs_today.map((job, idx) => (
                                                <tr key={job.id || idx} className="hover:bg-slate-50/70 transition-colors">
                                                    <td className="px-3 py-3.5 text-xs font-semibold text-gray-400 text-center align-middle">
                                                        {idx + 1}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-center align-middle">
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-mono text-xs font-bold tracking-tight">
                                                            🛵 {job.bike_number_text || job.bike_number || "N/A"}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-xs font-semibold text-gray-800 align-middle">
                                                        {job.job_type || "Repair"}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-center align-middle">
                                                        <div className="flex flex-col items-center justify-center gap-0.5">
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 font-semibold text-xs border border-purple-200">
                                                                ⏱️ {job.duration || "-"}
                                                            </span>
                                                            {job.completed_at && (
                                                                <span className="text-[10px] text-gray-400 font-medium">
                                                                    Done at {new Date(job.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3.5 align-middle">
                                                        {job.parts_used && job.parts_used.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1.5 max-w-sm">
                                                                {job.parts_used.map((part, pIdx) => {
                                                                    const partName = typeof part === "string" ? part : (part.part_name || part.name || "Part");
                                                                    const qty = part.quantity ? ` (${part.quantity}x)` : "";
                                                                    return (
                                                                        <span 
                                                                            key={pIdx} 
                                                                            className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-900 border border-amber-200"
                                                                        >
                                                                            🔩 {partName}{qty}
                                                                        </span>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-gray-400 italic">None used</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={() => setJobsModalTech(null)}
                                className="px-5 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-sm font-bold shadow-xs transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
