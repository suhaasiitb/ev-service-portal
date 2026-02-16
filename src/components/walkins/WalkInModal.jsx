import SearchablePartSelect from "../common/SearchablePartSelect";

export default function WalkInModal({
  open,
  onClose,
  submissionMessage,

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
  isSubmitting,
}) {
  //filter engineers by station 
  const stationEngineers = stationId
    ? engineers.filter((eng) => eng.station_id === stationId)
    : engineers;

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex justify-center items-center z-[100]">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl shadow-slate-950/80 p-6 transform transition-all animate-in fade-in zoom-in duration-300">
        <h2 className="text-xl font-semibold mb-4 text-slate-100 flex items-center gap-2">
          New Walk-In Job
          {isSubmitting && (
            <span className="w-4 h-4 border-2 border-blue-500 border-t-white rounded-full animate-spin"></span>
          )}
        </h2>

        {submissionMessage && (
          <div className={`mb-4 px-3 py-2 rounded-xl text-sm font-medium ${submissionMessage.includes('✅') ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'}`}>
            {submissionMessage}
          </div>
        )}

        {/* Bike Number */}
        <label className="block mb-2 text-sm font-medium text-slate-200">
          Bike Number <span className="text-blue-500">*</span>
        </label>
        <input
          className={`border border-slate-700 bg-slate-950/60 text-slate-100 text-sm rounded-xl w-full mb-4 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}
          value={walkInBike}
          onChange={(e) => setWalkInBike(e.target.value)}
          disabled={isSubmitting}
          placeholder="e.g. MH12AB1234"
        />

        {/* Issue */}
        <label className="block mb-2 text-sm font-medium text-slate-200">
          Issue <span className="text-slate-500 text-xs">(Optional)</span>
        </label>
        <textarea
          className={`border border-slate-700 bg-slate-950/60 text-slate-100 text-sm rounded-xl w-full mb-4 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}
          value={walkInIssue}
          onChange={(e) => setWalkInIssue(e.target.value)}
          placeholder="Describe issue (optional)"
          disabled={isSubmitting}
        />

        {/* Cost */}
        <label className="block mb-2 text-sm font-medium text-slate-200">
          Cost Charged <span className="text-slate-500 text-xs">(Optional)</span>
        </label>
        <input
          type="number"
          className={`border border-slate-700 bg-slate-950/60 text-slate-100 text-sm rounded-xl w-full mb-4 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}
          value={walkInCost}
          onChange={(e) => setWalkInCost(e.target.value)}
          placeholder="0.00"
          disabled={isSubmitting}
        />

        {/* Engineer */}
        <label className="block mb-2 text-sm font-medium text-slate-200">
          Engineer <span className="text-blue-500">*</span>
        </label>
        <select
          className={`border border-slate-700 bg-slate-950/60 text-slate-100 text-sm rounded-xl w-full mb-4 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}
          value={walkInEngineer}
          onChange={(e) => setWalkInEngineer(e.target.value)}
          disabled={isSubmitting}
        >
          <option value="">Select Engineer</option>
          {stationEngineers.map((eng) => (
            <option key={eng.id} value={eng.id}>
              {eng.name}
            </option>
          ))}
        </select>

        {/* Parts */}
        <div className={isSubmitting ? 'opacity-50 pointer-events-none' : ''}>
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
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className={`px-4 py-2 rounded-full border border-slate-600 text-slate-200 text-sm hover:bg-slate-800 transition ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Cancel
          </button>

          <button
            onClick={onSubmit}
            disabled={isSubmitting}
            className={`px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 transition flex items-center gap-2 ${isSubmitting ? 'bg-blue-800 cursor-not-allowed' : ''}`}
          >
            {isSubmitting ? (
              <>
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Submitting...
              </>
            ) : (
              'Submit Walk-In'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
