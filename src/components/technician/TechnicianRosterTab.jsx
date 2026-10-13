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
    onUpdateStation,
    onUpdateShift 
}) {
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
                <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                    <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Technicians</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">{totalCount}</div>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                        👨‍🔧
                    </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
                    <div>
                        <div className="text-xs font-semibold text-green-700 uppercase tracking-wider">Logged Today</div>
                        <div className="text-2xl font-bold text-green-700 mt-1">{loggedTodayCount}</div>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-green-100 text-green-700 flex items-center justify-center font-bold text-lg">
                        ✅
                    </div>
                </div>

                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between">
                    <div>
                        <div className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Not Logged Today</div>
                        <div className="text-2xl font-bold text-rose-700 mt-1">{notLoggedTodayCount}</div>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-lg">
                        ⏳
                    </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center justify-between">
                    <div>
                        <div className="text-xs font-semibold text-purple-700 uppercase tracking-wider">On a Job</div>
                        <div className="text-2xl font-bold text-purple-700 mt-1">{onJobCount}</div>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-lg">
                        ⚡
                    </div>
                </div>
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
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm w-full md:w-72 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />

                        {/* Today's Attendance Filter */}
                        <select
                            value={attendanceFilter}
                            onChange={(e) => setAttendanceFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                        >
                            <option value="all">All Attendance</option>
                            <option value="logged">✅ Logged Today</option>
                            <option value="not_logged">❌ Not Logged Today</option>
                        </select>

                        {/* Job Activity Filter */}
                        <select
                            value={jobStatusFilter}
                            onChange={(e) => setJobStatusFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                        >
                            <option value="all">All Job Statuses</option>
                            <option value="on_job">⚡ On a Job</option>
                            <option value="idle">☕ Idle</option>
                        </select>

                        {/* Station Filter */}
                        <select
                            value={stationFilter}
                            onChange={(e) => setStationFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
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
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
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
                        <thead className="bg-gray-100/70 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Technician</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Today's Attendance</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Shift Tracking</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Job Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Jobs Done Today</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider text-right">Actions</th>
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
                                        <tr key={tech.id} className="hover:bg-gray-50/70 transition-colors">
                                            {/* Technician Name & Current Assignment Badges */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0">
                                                        {tech.name?.charAt(0)?.toUpperCase() || "T"}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900 text-sm">{tech.name || "Unnamed Technician"}</div>
                                                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                                                                tech.station?.name ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                                                            }`}>
                                                                📍 {tech.station?.name || "Unassigned"}
                                                            </span>
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                                                                ⏰ {tech.assigned_shift || DEFAULT_SHIFT}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Today's Attendance Column */}
                                            <td className="px-6 py-4">
                                                {tech.has_logged_today ? (
                                                    <div>
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                                                            <span className="w-2 h-2 rounded-full bg-green-600"></span>
                                                            Logged Today
                                                        </span>
                                                        {tech.today_attendance?.check_in_time && (
                                                            <div className="text-[11px] text-gray-500 font-medium mt-1">
                                                                In: {new Date(tech.today_attendance.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                                        Not Logged
                                                    </span>
                                                )}
                                            </td>

                                            {/* Shift Tracking (Login Adherence & 10 Hours Clocked) */}
                                            <td className="px-6 py-4">
                                                {tech.has_logged_today ? (
                                                    <div className="space-y-1.5">
                                                        {/* Check-In Timing Window Adherence (+/- 30 min) */}
                                                        {tech.check_in_adherence && (
                                                            <div>
                                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${tech.check_in_adherence.badgeClass}`}>
                                                                    {tech.check_in_adherence.isCompliant ? "✓" : "⚠️"} {tech.check_in_adherence.label}
                                                                </span>
                                                            </div>
                                                        )}

                                                        {/* 10-Hour Shift Duration Progress */}
                                                        {tech.shift_duration && (
                                                            <div className="flex items-center gap-1.5">
                                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${tech.shift_duration.badgeClass}`}>
                                                                    ⏱️ {tech.shift_duration.statusLabel}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400 font-medium italic">Pending Login</span>
                                                )}
                                            </td>

                                            {/* Job Status Column with Elapsed Duration */}
                                            <td className="px-6 py-4">
                                                {tech.is_on_job ? (
                                                    <div>
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                                            <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
                                                            On a Job {tech.current_job?.job_type ? `(${tech.current_job.job_type})` : ''}
                                                        </span>
                                                        {tech.current_job?.started_at && (
                                                            <div className="text-[11px] text-purple-700 font-bold mt-1 flex items-center gap-1">
                                                                <span>⏱️</span>
                                                                <span>Active for {getElapsedTime(tech.current_job.started_at)}</span>
                                                                <span className="text-gray-400 font-normal">({new Date(tech.current_job.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
                                                        <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                                                        Idle
                                                    </span>
                                                )}
                                            </td>

                                            {/* Jobs Done Today Column */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setJobsModalTech(tech)}
                                                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold transition-all shadow-xs ${
                                                            (tech.completed_jobs_today_count || 0) > 0
                                                                ? "bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200 hover:scale-105 cursor-pointer"
                                                                : "bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200 cursor-pointer"
                                                        }`}
                                                        title="Click to view jobs details"
                                                    >
                                                        🛠️ {tech.completed_jobs_today_count || 0} {tech.completed_jobs_today_count === 1 ? 'job' : 'jobs'} done
                                                        <span className="ml-1 text-[10px] opacity-70">↗</span>
                                                    </button>
                                                </div>
                                            </td>

                                            {/* Actions Column with Toggle Button */}
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => setConfigModalTech(tech)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors shadow-xs"
                                                >
                                                    ⚙️ Manage Assignment
                                                </button>
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
                                        Jobs Done Today: {jobsModalTech.name || "Technician"}
                                        <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
                                            {jobsModalTech.completed_jobs_today_count || 0} Total
                                        </span>
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Completed repairs and service logs for today ({new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})
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
                                    <p className="text-sm font-bold text-gray-700">No jobs completed today</p>
                                    <p className="text-xs text-gray-500 mt-1">This technician hasn't completed any repair jobs on the current day yet.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-gray-200">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-gray-100/80 border-b border-gray-200">
                                            <tr>
                                                <th className="px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider">#</th>
                                                <th className="px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider">Bike No</th>
                                                <th className="px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider">Job Type</th>
                                                <th className="px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider">Time Spent</th>
                                                <th className="px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider">Parts Used</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 bg-white">
                                            {jobsModalTech.completed_jobs_today.map((job, idx) => (
                                                <tr key={job.id || idx} className="hover:bg-gray-50/70 transition-colors">
                                                    <td className="px-4 py-3 text-xs font-semibold text-gray-400">
                                                        {idx + 1}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-bold text-blue-700">
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 font-mono tracking-tight">
                                                            🛵 {job.bike_number_text || job.bike_number || "N/A"}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs font-semibold text-gray-700">
                                                        {job.job_type || "Repair"}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 font-bold text-xs border border-purple-200">
                                                            ⏱️ {job.duration || "-"}
                                                        </span>
                                                        {job.completed_at && (
                                                            <div className="text-[10px] text-gray-400 mt-0.5">
                                                                Done at {new Date(job.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {job.parts_used && job.parts_used.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1.5 max-w-xs">
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
