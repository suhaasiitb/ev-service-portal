import SearchablePartSelect from "../common/SearchablePartSelect";

export default function WalkInModal({
  open,
  onClose,

  stationId,

  walkInBike,
  setWalkInBike,

  walkInIssue,
  setWalkInIssue,

  walkInCost,
  setWalkInCost,

  walkInEngineer,
  setWalkInEngineer,

  walkInParts,
  addWalkInPartRow,
  removeWalkInPartRow,
  updateWalkInPartRow,

  engineers,
  parts,

  onSubmit,
}) {
  //filter engineers by station 
  const stationEngineers = stationId
    ? engineers.filter((eng) => eng.station_id === stationId)
    : engineers;

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex justify-center items-center z-40">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl shadow-slate-950/80 p-6">
        <h2 className="text-xl font-semibold mb-4 text-slate-100">
          New Walk-In Job
        </h2>

        {/* Bike Number */}
        <label className="block mb-2 text-sm font-medium text-slate-200">
          Bike Number
        </label>
        <input
          className="border border-slate-700 bg-slate-950/60 text-slate-100 text-sm rounded-xl w-full mb-4 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={walkInBike}
          onChange={(e) => setWalkInBike(e.target.value)}
        />

        {/* Issue */}
        <label className="block mb-2 text-sm font-medium text-slate-200">
          Issue
        </label>
        <textarea
          className="border border-slate-700 bg-slate-950/60 text-slate-100 text-sm rounded-xl w-full mb-4 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={walkInIssue}
          onChange={(e) => setWalkInIssue(e.target.value)}
          placeholder="Describe issue"
        />

        {/* Cost */}
        <label className="block mb-2 text-sm font-medium text-slate-200">
          Cost Charged
        </label>
        <input
          type="number"
          className="border border-slate-700 bg-slate-950/60 text-slate-100 text-sm rounded-xl w-full mb-4 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={walkInCost}
          onChange={(e) => setWalkInCost(e.target.value)}
        />

        {/* Engineer */}
        <label className="block mb-2 text-sm font-medium text-slate-200">
          Engineer
        </label>
        <select
          className="border border-slate-700 bg-slate-950/60 text-slate-100 text-sm rounded-xl w-full mb-4 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={walkInEngineer}
          onChange={(e) => setWalkInEngineer(e.target.value)}
        >
          <option value="">Select Engineer</option>
          {stationEngineers.map((eng) => (
            <option key={eng.id} value={eng.id}>
              {eng.name}
            </option>
          ))}
        </select>

        {/* Parts */}
        {walkInParts.map((row, index) => (
          <div key={index} className="flex gap-2 mb-3">
            <SearchablePartSelect
              parts={parts}
              value={row.part_id}
              onChange={(partId) =>
                updateWalkInPartRow(index, "part_id", partId)
              }
              placeholder="Search Part"
            />

            <input
              type="number"
              min="1"
              className="border border-slate-700 bg-slate-950/60 text-slate-100 text-sm rounded-xl w-20 px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={row.quantity}
              onChange={(e) =>
                updateWalkInPartRow(index, "quantity", e.target.value)
              }
            />

            {index > 0 && (
              <button
                className="text-red-400 text-lg px-2 hover:text-red-300 transition"
                onClick={() => removeWalkInPartRow(index)}
              >
                ✕
              </button>
            )}
          </div>
        ))}

        <button
          className="text-blue-400 text-sm underline mb-4 hover:text-blue-300 transition"
          onClick={addWalkInPartRow}
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
            Submit Walk-In
          </button>
        </div>
      </div>
    </div>
  );
}
