import { useState } from "react";

export default function TechnicianRosterTab({ technicians, stations, loading, updatingId, onUpdateStation }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [stationFilter, setStationFilter] = useState("all");
    const [jobStatusFilter, setJobStatusFilter] = useState("all");
    const [attendanceFilter, setAttendanceFilter] = useState("all");
    const [saveFeedback, setSaveFeedback] = useState({}); // { [techId]: 'success' | 'error' }

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
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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

                <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                    <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Assigned Station</div>
                        <div className="text-2xl font-bold text-blue-600 mt-1">{assignedCount}</div>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                        📍
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
                                <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Contact Info</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Today's Attendance</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Job Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Tagged Station (Editable)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredTechnicians.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-medium">
                                        No technicians found matching filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredTechnicians.map(tech => {
                                    const isUpdating = updatingId === tech.id;
                                    const feedback = saveFeedback[tech.id];

                                    return (
                                        <tr key={tech.id} className="hover:bg-gray-50/70 transition-colors">
                                            {/* Technician Name */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0">
                                                        {tech.name?.charAt(0)?.toUpperCase() || "T"}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900 text-sm">{tech.name || "Unnamed Technician"}</div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Contact Info */}
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-900 font-medium">{tech.phone || "No phone"}</div>
                                                <div className="text-xs text-gray-500">{tech.email || "No email"}</div>
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

                                            {/* Job Status Column */}
                                            <td className="px-6 py-4">
                                                {tech.is_on_job ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                                        <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
                                                        On a Job {tech.current_job?.job_type ? `(${tech.current_job.job_type})` : ''}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
                                                        <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                                                        Idle
                                                    </span>
                                                )}
                                            </td>

                                            {/* Tagged Station Editable Dropdown */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 max-w-xs">
                                                    <select
                                                        value={tech.station_id || ""}
                                                        disabled={isUpdating}
                                                        onChange={(e) => handleStationChange(tech.id, e.target.value)}
                                                        className={`w-full border rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                                                            tech.station_id
                                                                ? "bg-blue-50/50 border-blue-200 text-blue-900"
                                                                : "bg-amber-50/50 border-amber-200 text-amber-800"
                                                        } ${isUpdating ? "opacity-50 cursor-wait" : "cursor-pointer hover:border-blue-400"}`}
                                                    >
                                                        <option value="">-- Unassigned --</option>
                                                        {stations.map(st => (
                                                            <option key={st.id} value={st.id}>{st.name}</option>
                                                        ))}
                                                    </select>
                                                    {isUpdating && (
                                                        <span className="text-xs font-bold text-blue-600 animate-pulse">Saving...</span>
                                                    )}
                                                    {feedback === "success" && (
                                                        <span className="text-xs font-bold text-green-600 bg-green-50 border border-green-200 px-2 py-1 rounded-lg animate-in fade-in">
                                                            ✓ Saved
                                                        </span>
                                                    )}
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
        </div>
    );
}
