export default function PendingApprovalsTab({ attendance, onApprove, onReject, onViewDetails }) {
    // Filter only records that are pending approval (either check-in or check-out)
    const pendingRecords = attendance.filter(
        (r) => r.approval_status === "pending" || r.check_out_approval_status === "pending"
    );

    if (pendingRecords.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
                <div className="text-4xl mb-4">🎉</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">All Caught Up!</h3>
                <p className="text-gray-500">There are no pending attendance requests requiring your approval right now.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingRecords.map((record) => {
                const isCheckInPending = record.approval_status === "pending";
                const isCheckOutPending = record.check_out_approval_status === "pending";

                // We prioritize showing the pending action (if check-in is pending, show that, else check-out)
                const isHandlingCheckOut = !isCheckInPending && isCheckOutPending;
                
                const timeString = isHandlingCheckOut ? record.check_out_time : record.check_in_time;
                const distance = isHandlingCheckOut ? record.check_out_distance : record.distance_from_station;
                const selfieUrl = isHandlingCheckOut ? record.check_out_selfie_url : record.selfie_url;

                return (
                    <div key={`${record.id}-${isHandlingCheckOut ? 'out' : 'in'}`} className="bg-white rounded-2xl shadow-sm border border-amber-200 overflow-hidden flex flex-col relative animate-in fade-in zoom-in duration-300">
                        {/* Status Badge */}
                        <div className="absolute top-4 right-4 bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-1 rounded-full border border-amber-200 shadow-sm">
                            Requires Approval
                        </div>

                        {/* Top Info */}
                        <div className="p-5 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="text-lg font-bold text-gray-900">{record.technician?.name || "Unknown Technician"}</h3>
                            <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                                <span>📞 {record.technician?.phone || "No phone"}</span>
                            </p>
                        </div>

                        {/* Middle Content */}
                        <div className="p-5 flex-1 space-y-4">
                            <div className="flex gap-4 items-start">
                                {/* Selfie Thumbnail */}
                                <div className="w-24 h-24 rounded-xl bg-gray-100 overflow-hidden shrink-0 border border-gray-200 cursor-pointer shadow-sm relative group" onClick={() => onViewDetails(record)}>
                                    {selfieUrl ? (
                                        <img src={selfieUrl} alt="Selfie" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-3xl text-gray-400">👤</div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">View</div>
                                </div>

                                {/* Details */}
                                <div>
                                    <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">
                                        {isHandlingCheckOut ? "Check-Out Log" : "Check-In Log"}
                                    </div>
                                    <p className="text-sm font-semibold text-gray-900 mb-2">
                                        {new Date(timeString).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                                    </p>
                                    
                                    <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-xs font-medium border border-red-100 inline-block">
                                        <span className="font-bold">⚠️ {distance ? `${Math.round(distance)}m` : 'Unknown distance'}</span> away from {record.station?.name}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="p-4 bg-gray-50 border-t border-gray-100 grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => onApprove(record, isHandlingCheckOut)}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors shadow-sm shadow-green-500/20"
                            >
                                Approve
                            </button>
                            <button 
                                onClick={() => onReject(record, isHandlingCheckOut)}
                                className="w-full bg-red-100 hover:bg-red-200 text-red-700 font-bold py-2.5 rounded-xl text-sm transition-colors"
                            >
                                Disapprove
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
