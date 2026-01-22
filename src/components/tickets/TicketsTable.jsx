export default function TicketsTable({
  loading,
  tickets,
  ticketPage,
  setTicketPage,
  totalTicketPages,
  filteredTicketsLength,

  ticketDateFilter,
  setTicketDateFilter,

  openFirst,
  setOpenFirst,

  openModalForTicket,
  formatTat,
}) {
  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-xl shadow-slate-900/60 flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
        <h2 className="text-lg font-semibold text-slate-100">Tickets</h2>

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <span>Date filter:</span>
            <input
              type="date"
              className="bg-slate-950/60 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={ticketDateFilter}
              onChange={(e) => {
                setTicketPage(1);
                setTicketDateFilter(e.target.value);
              }}
            />
            {ticketDateFilter && (
              <button
                className="text-blue-300 hover:text-blue-200"
                onClick={() => {
                  setTicketDateFilter("");
                  setTicketPage(1);
                }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Status Sort */}
          <button
            onClick={() => {
              setOpenFirst((prev) => !prev);
              setTicketPage(1);
            }}
            className="inline-flex items-center gap-1 rounded-full border border-slate-700 px-3 py-1 text-xs hover:bg-slate-800 transition"
          >
            <span>Status sort:</span>
            <span className="font-semibold">
              {openFirst ? "Open ↑ oldest" : "Default"}
            </span>
          </button>
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
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Timeline</th>
                <th className="px-3 py-2 text-left">Action</th>
              </tr>
            </thead>

            <tbody>
              {tickets.map((t) => {
                const reportedText = t.reported_at
                  ? new Date(t.reported_at).toLocaleString()
                  : "-";
                const closedText = t.closed_at
                  ? new Date(t.closed_at).toLocaleString()
                  : "-";
                const tat = formatTat(t.reported_at, t.closed_at);

                return (
                  <tr
                    key={t.id}
                    className="border-t border-slate-800/80 hover:bg-slate-900/60 transition"
                  >
                    <td className="px-3 py-2 whitespace-nowrap">
                      {t.bike_number_text}
                    </td>
                    <td className="px-3 py-2 max-w-[260px] truncate">
                      {t.issue_description}
                    </td>
                    <td className="px-3 py-2">
                      {t.status === "open" ? (
                        <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-300 ring-1 ring-amber-500/40">
                          Open
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/40">
                          Closed
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-300">
                      <div className="flex flex-col gap-0.5">
                        <span>Reported: {reportedText}</span>
                        <span>Closed: {closedText}</span>
                        <span>TAT: {tat}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {t.status === "open" ? (
                        <button
                          onClick={() => openModalForTicket(t)}
                          className="rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-500 transition"
                        >
                          Close with Parts
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Closed by: {t.engineers?.name || "Unknown"}
                          {typeof t.cost_charged === "number" && (
                            <> · Cost: {t.cost_charged}</>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {!loading && tickets.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-4 text-center text-slate-500 text-xs"
                  >
                    No tickets for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-900/80 text-xs text-slate-300">
          <span>
            Page {ticketPage} of {totalTicketPages} (
            {filteredTicketsLength}{" "}
            {filteredTicketsLength === 1 ? "ticket" : "tickets"})
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setTicketPage((p) => Math.max(1, p - 1))}
              disabled={ticketPage <= 1}
              className="rounded-full border border-slate-700 px-2.5 py-1 disabled:opacity-40 hover:bg-slate-800"
            >
              Prev
            </button>
            <button
              onClick={() =>
                setTicketPage((p) => Math.min(totalTicketPages, p + 1))
              }
              disabled={ticketPage >= totalTicketPages}
              className="rounded-full border border-slate-700 px-2.5 py-1 disabled:opacity-40 hover:bg-slate-800"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
