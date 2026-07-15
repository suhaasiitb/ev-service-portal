import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function AddRefundModal({ open, onClose, onSuccess, assignment }) {
    const [status, setStatus] = useState("");
    const [refundDate, setRefundDate] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    if (!open || !assignment) return null;

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const { error: updateError } = await supabase
                .from("rider_bike_assignments")
                .update({
                    refund_status: status,
                    refund_date: refundDate
                })
                .eq("id", assignment.id);

            if (updateError) throw updateError;

            onSuccess();
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                <div className="bg-teal-600 px-6 py-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-white">Update Refund Status</h2>
                        <p className="text-teal-100 text-sm mt-1">
                            {assignment.name} ({assignment.bike_number})
                        </p>
                    </div>
                    <button onClick={onClose} className="text-teal-200 hover:text-white text-xl font-bold">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Refund Status
                        </label>
                        <select
                            required
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-gray-700"
                        >
                            <option value="" disabled>Select status...</option>
                            <option value="Refund Processed">Refund Processed</option>
                            <option value="Client Change">Client Change</option>
                            <option value="Re-Joining">Re-Joining</option>
                            <option value="Vehicle Exchange">Vehicle Exchange</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Refund Date
                        </label>
                        <input
                            type="date"
                            required
                            value={refundDate}
                            onChange={(e) => setRefundDate(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-700"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-bold transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !status || !refundDate}
                            className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 font-bold disabled:opacity-50 transition"
                        >
                            {loading ? "Saving..." : "Save Refund"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
