import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function AddWaiverModal({ open, onClose, onSuccess, assignment }) {
    const [amount, setAmount] = useState("");
    const [reason, setReason] = useState("");
    const [otherReasonDetails, setOtherReasonDetails] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    if (!open || !assignment) return null;

    const maxAmount = assignment.raw_rental_amount || 0;

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError("");

        const submitAmount = Number(amount);

        if (submitAmount > maxAmount) {
            setError(`Waiver amount cannot exceed the total rental amount (₹${maxAmount}).`);
            setLoading(false);
            return;
        }

        if (reason === "Others" && !otherReasonDetails.trim()) {
            setError("Please provide details for the 'Others' reason.");
            setLoading(false);
            return;
        }

        try {
            const { data: authData } = await supabase.auth.getSession();
            const userId = authData?.session?.user?.id || null;

            const { error: insertError } = await supabase
                .from("rent_waivers")
                .insert({
                    assignment_id: assignment.id,
                    rider_id: assignment.rider_id,
                    amount: submitAmount,
                    reason: reason,
                    other_reason_details: reason === "Others" ? otherReasonDetails.trim() : null,
                    issue_start_date: startDate,
                    issue_end_date: endDate,
                    created_by: userId
                });

            if (insertError) throw insertError;

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
                <div className="bg-red-600 px-6 py-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-white">Add Waiver</h2>
                        <p className="text-red-100 text-sm mt-1">
                            {assignment.name} ({assignment.bike_number})
                        </p>
                    </div>
                    <button onClick={onClose} className="text-red-200 hover:text-white text-xl font-bold">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Waive Off Amount (₹)
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                required
                                min="0"
                                max={maxAmount}
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                placeholder={`Max: ₹${maxAmount}`}
                            />
                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                <span className="text-xs text-gray-400 font-bold">Max: ₹{maxAmount}</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Reason
                        </label>
                        <select
                            required
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white text-gray-700"
                        >
                            <option value="" disabled>Select a reason...</option>
                            <option value="Bike Issue">Bike Issue</option>
                            <option value="Battery Issue">Battery Issue</option>
                            <option value="Spare Part Issue">Spare Part Issue</option>
                            <option value="Others">Others</option>
                        </select>
                    </div>

                    {reason === "Others" && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Please specify reason
                            </label>
                            <input
                                type="text"
                                required
                                value={otherReasonDetails}
                                onChange={(e) => setOtherReasonDetails(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                placeholder="Enter specific reason"
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Issue Start Date
                            </label>
                            <input
                                type="date"
                                required
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-700"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Issue End Date
                            </label>
                            <input
                                type="date"
                                required
                                value={endDate}
                                min={startDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-700"
                            />
                        </div>
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
                            disabled={loading || !amount || !reason || !startDate || !endDate}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold disabled:opacity-50 transition"
                        >
                            {loading ? "Saving..." : "Save Waiver"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
