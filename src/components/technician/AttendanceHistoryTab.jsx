import { useState } from "react";

export default function AttendanceHistoryTab({ attendance, onViewDetails }) {
    const [statusFilter, setStatusFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");

    // Calculate metrics for Total Present Today
    const today = new Date().toISOString().split("T")[0];
    const todayRecords = attendance.filter(r => r.date === today);
    const presentTodayCount = todayRecords.length;

    const filteredRecords = attendance.filter(r => {
        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesName = r.technician?.name?.toLowerCase().includes(query);
            const matchesPhone = r.technician?.phone?.includes(query);
            if (!matchesName && !matchesPhone) return false;
        }

        // Status filter
        if (statusFilter !== "all") {
            const overallStatus = r.approval_status === "rejected" || r.check_out_approval_status === "rejected" ? "rejected" : 
                                r.approval_status === "pending" || r.check_out_approval_status === "pending" ? "pending" : "approved";
            
            if (statusFilter !== overallStatus) return false;
        }

        return true;
    });

    const getStatusBadge = (status, checkoutStatus) => {
        if (status === "rejected" || checkoutStatus === "rejected") {
            return <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold border border-red-200">Disapproved</span>;
        }
        if (status === "pending" || checkoutStatus === "pending") {
            return <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-bold border border-amber-200">Pending</span>;
        }
        if (status === "approved" && (!checkoutStatus || checkoutStatus === "approved")) {
             return <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold border border-green-200">Approved</span>;
        }
        return <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold">Unknown</span>;
    };

    return (
        <div className="space-y-6">
            {/* Top Metric Card for Attendance History Tab */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <div className="text-sm font-semibold text-gray-500 mb-1">Total Present Today</div>
                    <div className="text-3xl font-bold text-gray-900">{presentTodayCount}</div>
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Filters */}
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex gap-4 items-center">
                    <input 
                        type="text" 
                        placeholder="🔍 Search name or phone..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                        <option value="all">All Statuses</option>
                        <option value="approved">Approved</option>
                        <option value="pending">Pending</option>
                        <option value="rejected">Disapproved</option>
                    </select>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-100/50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Technician</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Check-In</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Check-Out</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        No attendance records found matching filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredRecords.map(record => (
                                    <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
                                                    {record.technician?.name?.charAt(0) || "T"}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-gray-900 text-sm">{record.technician?.name || "Unknown"}</div>
                                                    <div className="text-xs text-gray-500">{record.technician?.phone}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                            {record.date}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">
                                                {record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                                            </div>
                                            {record.distance_from_station && (
                                                <div className="text-xs text-gray-500">{Math.round(record.distance_from_station)}m away</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">
                                                {record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Not checked out"}
                                            </div>
                                            {record.check_out_distance && (
                                                <div className="text-xs text-gray-500">{Math.round(record.check_out_distance)}m away</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(record.approval_status, record.check_out_approval_status)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => onViewDetails(record)}
                                                className="text-blue-600 hover:text-blue-800 text-sm font-bold bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                                            >
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
