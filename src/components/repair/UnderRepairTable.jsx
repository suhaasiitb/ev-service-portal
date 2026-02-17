export default function UnderRepairTable({ repairTickets, loading, onOpenTicket }) {
    if (loading) {
        return (
            <div className="flex justify-center py-10">
                <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (repairTickets.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
                <span className="text-3xl">🔧</span>
                <p className="text-sm text-slate-400 font-medium">No vehicles under repair</p>
            </div>
        );
    }

    return (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-sm">
                <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/50">
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vehicle No</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">PDI Done By</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Parts Required</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date Raised</th>
                        <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                    {repairTickets.map((ticket) => {
                        const partsReq = ticket.parts_required || [];
                        const partsDisplay = partsReq.length > 0
                            ? partsReq.map((p) => `${p.part_name} (×${p.quantity})`).join(", ")
                            : "-";

                        return (
                            <tr key={ticket.id} className="hover:bg-slate-800/30 transition-colors">
                                <td className="px-4 py-3 font-mono text-slate-100 font-bold">{ticket.bike_number}</td>
                                <td className="px-4 py-3 text-slate-300">{ticket.pdi_done_by_name}</td>
                                <td className="px-4 py-3 text-slate-300 text-xs max-w-[200px] truncate" title={partsDisplay}>
                                    {partsDisplay}
                                </td>
                                <td className="px-4 py-3 text-slate-300 text-xs">
                                    {ticket.date_raised ? new Date(ticket.date_raised).toLocaleDateString("en-IN") : "-"}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <button
                                        onClick={() => onOpenTicket(ticket)}
                                        className="px-4 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-bold hover:bg-orange-500 transition shadow-md shadow-orange-500/20"
                                    >
                                        Open
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
