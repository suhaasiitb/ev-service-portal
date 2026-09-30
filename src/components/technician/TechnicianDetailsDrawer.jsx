export default function TechnicianDetailsDrawer({ open, onClose, record }) {
    if (!open || !record) return null;

    // Helper to calculate duration
    const getDuration = (start, end) => {
        if (!start || !end) return "-";
        const diff = new Date(end) - new Date(start);
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${mins}m`;
    };

    return (
        <div className="fixed inset-0 z-[110] flex justify-end">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-950/30 backdrop-blur-sm transition-opacity" 
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="relative w-full max-w-xl h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Shift Details</h2>
                        <p className="text-sm text-gray-500 mt-1">{record.date}</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Content scrollable area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    
                    {/* Technician Profile */}
                    <div className="flex items-center gap-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                        <div className="w-14 h-14 bg-blue-600 rounded-full text-white flex items-center justify-center text-xl font-bold">
                            {record.technician?.name?.charAt(0) || "T"}
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-lg">{record.technician?.name || "Unknown"}</h3>
                            <p className="text-sm text-gray-600">📞 {record.technician?.phone || "No phone"}</p>
                            <p className="text-sm text-gray-600">✉️ {record.technician?.email || "No email"}</p>
                        </div>
                    </div>

                    {/* Shift Overview */}
                    <div>
                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Shift Overview</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="border border-gray-200 rounded-xl p-4">
                                <div className="text-xs text-gray-500 font-bold mb-1">Station</div>
                                <div className="font-semibold text-gray-900">{record.station?.name || "Unknown"}</div>
                            </div>
                            <div className="border border-gray-200 rounded-xl p-4">
                                <div className="text-xs text-gray-500 font-bold mb-1">Total Duration</div>
                                <div className="font-semibold text-gray-900">{getDuration(record.check_in_time, record.check_out_time)}</div>
                            </div>
                        </div>
                    </div>

                    {/* Check-In Details */}
                    <div>
                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center justify-between">
                            <span>Check-In Log</span>
                            {record.approval_status === "rejected" ? (
                                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Disapproved</span>
                            ) : record.approval_status === "approved" ? (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Approved</span>
                            ) : null}
                        </h4>
                        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                            <div className="p-4 grid grid-cols-2 gap-4 bg-gray-50 border-b border-gray-100">
                                <div>
                                    <div className="text-xs text-gray-500 mb-1">Time</div>
                                    <div className="font-semibold text-gray-900">
                                        {record.check_in_time ? new Date(record.check_in_time).toLocaleString() : "-"}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 mb-1">Distance from Station</div>
                                    <div className="font-semibold text-gray-900">
                                        {record.distance_from_station ? `${Math.round(record.distance_from_station)} meters` : "-"}
                                    </div>
                                </div>
                            </div>
                            {record.selfie_url && (
                                <div className="p-4 bg-gray-100">
                                    <div className="text-xs text-gray-500 font-bold mb-2">Check-in Proof</div>
                                    <img src={record.selfie_url} alt="Check-in Selfie" className="w-full h-64 object-cover rounded-xl border border-gray-300" />
                                </div>
                            )}
                            {record.approval_status === "rejected" && record.rejection_reason && (
                                <div className="p-4 bg-red-50 border-t border-red-100">
                                    <div className="text-xs text-red-800 font-bold mb-1">Rejection Reason:</div>
                                    <div className="text-sm text-red-600">{record.rejection_reason}</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Check-Out Details */}
                    <div>
                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center justify-between">
                            <span>Check-Out Log</span>
                            {record.check_out_approval_status === "rejected" ? (
                                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Disapproved</span>
                            ) : record.check_out_approval_status === "approved" ? (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Approved</span>
                            ) : null}
                        </h4>
                        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                            <div className="p-4 grid grid-cols-2 gap-4 bg-gray-50 border-b border-gray-100">
                                <div>
                                    <div className="text-xs text-gray-500 mb-1">Time</div>
                                    <div className="font-semibold text-gray-900">
                                        {record.check_out_time ? new Date(record.check_out_time).toLocaleString() : "Not checked out yet"}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 mb-1">Distance from Station</div>
                                    <div className="font-semibold text-gray-900">
                                        {record.check_out_distance ? `${Math.round(record.check_out_distance)} meters` : "-"}
                                    </div>
                                </div>
                            </div>
                            {record.check_out_selfie_url && (
                                <div className="p-4 bg-gray-100">
                                    <div className="text-xs text-gray-500 font-bold mb-2">Check-out Proof</div>
                                    <img src={record.check_out_selfie_url} alt="Check-out Selfie" className="w-full h-64 object-cover rounded-xl border border-gray-300" />
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
