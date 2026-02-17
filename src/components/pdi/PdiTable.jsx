export default function PdiTable({ pdiRequests, loading, onOpenTicket }) {
    if (loading) {
        return (
            <div className="flex justify-center py-10">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (pdiRequests.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
                <span className="text-3xl">📋</span>
                <p className="text-sm text-slate-400 font-medium">No pending PDI requests</p>
            </div>
        );
    }

    return (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-sm">
                <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/50">
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bike No</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rider</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date Raised</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                        <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                    {pdiRequests.map((pdi) => (
                        <tr key={pdi.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="px-4 py-3 font-mono text-slate-100 font-bold">{pdi.bike_number}</td>
                            <td className="px-4 py-3">
                                <p className="text-slate-200 font-medium">{pdi.rider_name}</p>
                                <p className="text-[10px] text-slate-500">{pdi.rider_phone}</p>
                            </td>
                            <td className="px-4 py-3 text-slate-300 text-xs">
                                {pdi.created_at ? new Date(pdi.created_at).toLocaleDateString("en-IN") : "-"}
                            </td>
                            <td className="px-4 py-3">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                                    Pending
                                </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                                <button
                                    onClick={() => onOpenTicket(pdi)}
                                    className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition shadow-md shadow-blue-500/20"
                                >
                                    Open
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
