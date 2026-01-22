export default function CloseTicketModal({
  open,
  onClose,

  ticket,
  engineers,

  parts,
  partsUsed,
  setPartsUsed,

  selectedEngineer,
  setSelectedEngineer,

  ticketCost,
  setTicketCost,

  onSubmit
}) {
  if (!open || !ticket) return null;

  function addPartRow() {
    setPartsUsed([...partsUsed, { part_id: "", quantity: 1 }]);
  }

  function removePartRow(index) {
    setPartsUsed(partsUsed.filter((_, i) => i !== index));
  }

  function updatePartRow(index, field, value) {
    const updated = [...partsUsed];
    updated[index][field] = value;
    setPartsUsed(updated);
  }

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex justify-center items-center z-40">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl shadow-slate-950/80 p-6">
        <h2 className="text-xl font-semibold mb-4 text-slate-100">
          Close Ticket & Log Parts
        </h2>

        {/* Cost */}
        <label className="block mb-2 text-sm font-medium text-slate-200">
          Cost Charged
        </label>
        <input
          type="number"
          className="border border-slate-700 bg-slate-950/60 text-slate-100 text-sm rounded-xl w-full mb-4 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={ticketCost}
          onChange={(e) => setTicketCost(e.target.value)}
          placeholder="Total cost for this ticket"
        />

        {/* Engineer */}
        <label className="block mb-2 text-sm font-medium text-slate-200">
          Engineer
        </label>
        <select
          className="border border-slate-700 bg-slate-950/60 text-slate-100 text-sm rounded-xl w-full mb-4 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedEngineer}
          onChange={(e) => setSelectedEngineer(e.target.value)}
        >
          <option value="">Select Engineer</option>
          {engineers
            .filter(
              (eng) => ticket && eng.station_id === ticket.station_id
            )
            .map((eng) => (
              <option key={eng.id} value={eng.id}>
                {eng.name}
              </option>
            ))}
        </select>

        {/* Parts */}
        {partsUsed.map((row, index) => (
          <div key={index} className="flex gap-2 mb-3">
            <select
              className="border border-slate-700 bg-slate-950/60 text-slate-100 text-sm rounded-xl flex-1 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={row.part_id}
              onChange={(e) =>
                updatePartRow(index, "part_id", e.target.value)
              }
            >
              <option value="">Select part</option>
              {parts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.part_name} ({p.sku})
                </option>
              ))}
            </select>

            <input
              type="number"
              min="1"
              className="border border-slate-700 bg-slate-950/60 text-slate-100 text-sm rounded-xl w-20 px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={row.quantity}
              onChange={(e) =>
                updatePartRow(index, "quantity", e.target.value)
              }
            />

            {index > 0 && (
              <button
                className="text-red-400 text-lg px-2 hover:text-red-300 transition"
                onClick={() => removePartRow(index)}
              >
                ✕
              </button>
            )}
          </div>
        ))}

        <button
          className="text-blue-400 text-sm underline mb-4 hover:text-blue-300 transition"
          onClick={addPartRow}
        >
          + Add Another Part
        </button>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full border border-slate-600 text-slate-200 text-sm hover:bg-slate-800 transition"
          >
            Cancel
          </button>

          <button
            onClick={onSubmit}
            className="px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 transition"
          >
            Close Ticket
          </button>
        </div>
      </div>
    </div>
  );
}
