export default function EngineerPerformanceTable({
  engineerStats,
  engineers
}) {
  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-xl shadow-slate-900/60">
      <h2 className="text-lg font-semibold text-slate-100 mb-2">
        Engineer Performance (Last 7 Days)
      </h2>

      <p className="text-xs text-slate-400 mb-3">
        Includes both ticket closures and walk-in jobs.
      </p>

      <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/40">
        <div className="max-h-60 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/80 text-slate-300 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left">Engineer</th>
                <th className="px-3 py-2 text-left">Tickets</th>
                <th className="px-3 py-2 text-left">Walk-Ins</th>
                <th className="px-3 py-2 text-left">Total</th>
              </tr>
            </thead>

            <tbody>
              {Object.entries(engineerStats).map(([engId, stats]) => {
                const eng = engineers.find((e) => e.id === engId);
                const ticketsClosed = stats.tickets || 0;
                const walkinsDone = stats.walkins || 0;
                const total = ticketsClosed + walkinsDone;

                return (
                  <tr
                    key={engId}
                    className="border-t border-slate-800/80 hover:bg-slate-900/60 transition"
                  >
                    <td className="px-3 py-2">
                      {eng ? eng.name : "Unknown"}
                    </td>
                    <td className="px-3 py-2">{ticketsClosed}</td>
                    <td className="px-3 py-2">{walkinsDone}</td>
                    <td className="px-3 py-2 font-medium">{total}</td>
                  </tr>
                );
              })}

              {Object.keys(engineerStats).length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-4 text-center text-slate-500 text-xs"
                  >
                    No engineer activity in the last 7 days.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
