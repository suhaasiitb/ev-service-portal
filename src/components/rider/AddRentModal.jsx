import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function AddRentModal({ open, onClose, onSuccess, assignment }) {
    const [amount, setAmount] = useState("");
    const [weekStart, setWeekStart] = useState("");
    const [weekEnd, setWeekEnd] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    if (!open || !assignment) return null;

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const { data: authData } = await supabase.auth.getSession();
            const userId = authData?.session?.user?.id || null;

            const { error: insertError } = await supabase
                .from("rent_collections")
                .insert({
                    assignment_id: assignment.id,
                    rider_id: assignment.rider_id,
                    amount: Number(amount),
                    week_start: weekStart,
                    week_end: weekEnd,
                    created_by: userId
                });

            if (insertError) throw insertError;

            onSuccess();
        } catch (err) {
            console.error(err);
            setError("Failed to add rent: " + err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-white">Add Rent Collection</h2>
                        <p className="text-blue-100 text-sm mt-1">
                            {assignment.name} ({assignment.bike_number})
                        </p>
                    </div>
                    <button onClick={onClose} className="text-blue-200 hover:text-white text-xl font-bold">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Amount Received (₹)
                        </label>
                        <input
                            type="number"
                            required
                            min="0"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g. 1500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Week Start Date
                            </label>
                            <input
                                type="date"
                                required
                                value={weekStart}
                                onChange={(e) => setWeekStart(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Week End Date
                            </label>
                            <input
                                type="date"
                                required
                                value={weekEnd}
                                min={weekStart}
                                onChange={(e) => setWeekEnd(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
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
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold disabled:opacity-50 transition"
                        >
                            {loading ? "Saving..." : "Save Rent"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
