export default function WalkinsTable({
  walkins,
  engineers,
  walkinPage,
  setWalkinPage,
  totalWalkinPages,
  walkinDateFilter,
  setWalkinDateFilter,
}) {
  const WALKIN_PAGE_SIZE = 15;

  const startIndex = (walkinPage - 1) * WALKIN_PAGE_SIZE;
  const pagedWalkins = walkins.slice(
    startIndex,
    startIndex + WALKIN_PAGE_SIZE
  );

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-xl shadow-slate-900/60 flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
        <h2 className="text-lg font-semibold text-slate-100">
          Walk-In Services
        </h2>

        {/* Date Filter */}
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <span>Date filter:</span>
          <input
            type="date"
            className="bg-slate-950/60 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={walkinDateFilter}
            onChange={(e) => {
              setWalkinPage(1);
              setWalkinDateFilter(e.target.value);
            }}
          />
          {walkinDateFilter && (
            <button
              className="text-blue-300 hover:text-blue-200"
              onClick={() => {
                setWalkinDateFilter("");
                setWalkinPage(1);
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/40 flex-1 flex flex-col">
        <div className="max-h-[480px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/80 text-slate-300 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left">Bike</th>
                <th className="px-3 py-2 text-left">Issue</th>
                <th className="px-3 py-2 text-left">Engineer</th>
                <th className="px-3 py-2 text-left">Logged</th>
                <th className="px-3 py-2 text-left">Cost</th>
              </tr>
            </thead>

            <tbody>
              {pagedWalkins.map((w) => {
                const eng = engineers.find(
                  (e) => e.id === w.engineer_id
                );

                return (
                  <tr
                    key={w.id}
                    className="border-t border-slate-800/80 hover:bg-slate-900/60 transition"
                  >
                    <td className="px-3 py-2 whitespace-nowrap">
                      {w.bike_number_text}
                    </td>
                    <td className="px-3 py-2 max-w-[260px] truncate">
                      {w.issue_description}
                    </td>
                    <td className="px-3 py-2">
                      {eng ? eng.name : "Unknown"}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-300">
                      {w.logged_at
                        ? new Date(w.logged_at).toLocaleString()
                        : "-"}
                    </td>
                    <td className="px-3 py-2">
                      {w.cost_charged ?? 0}
                    </td>
                  </tr>
                );
              })}

              {pagedWalkins.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-4 text-center text-slate-500 text-xs"
                  >
                    No walk-in jobs for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-900/80 text-xs text-slate-300">
          <span>
            Page {walkinPage} of {totalWalkinPages || 1} (
            {walkins.length}{" "}
            {walkins.length === 1 ? "walk-in" : "walk-ins"})
          </span>

          <div className="flex gap-2">
            <button
              onClick={() =>
                setWalkinPage((p) => Math.max(1, p - 1))
              }
              disabled={walkinPage <= 1}
              className="rounded-full border border-slate-700 px-2.5 py-1 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition"
            >
              Prev
            </button>

            <button
              onClick={() =>
                setWalkinPage((p) =>
                  Math.min(totalWalkinPages, p + 1)
                )
              }
              disabled={walkinPage >= totalWalkinPages}
              className="rounded-full border border-slate-700 px-2.5 py-1 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
