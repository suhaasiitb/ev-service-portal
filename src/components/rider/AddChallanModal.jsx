import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function AddChallanModal({ open, onClose, onSuccess, assignment }) {
    const [amount, setAmount] = useState("");
    const [reason, setReason] = useState("");
    const [dateOfIssue, setDateOfIssue] = useState("");
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
                .from("traffic_challans")
                .insert({
                    assignment_id: assignment.id,
                    rider_id: assignment.rider_id,
                    amount: Number(amount),
                    offense_reason: reason.trim(),
                    date_of_issue: dateOfIssue,
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
                <div className="bg-orange-500 px-6 py-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-white">Add Traffic Challan</h2>
                        <p className="text-orange-100 text-sm mt-1">
                            {assignment.name} ({assignment.bike_number})
                        </p>
                    </div>
                    <button onClick={onClose} className="text-orange-200 hover:text-white text-xl font-bold">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Challan Amount (₹)
                        </label>
                        <input
                            type="number"
                            required
                            min="0"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            placeholder="e.g. 500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Offense Reason
                        </label>
                        <input
                            type="text"
                            required
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            placeholder="e.g. Red Light Jump"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Date of Issue
                        </label>
                        <input
                            type="date"
                            required
                            value={dateOfIssue}
                            onChange={(e) => setDateOfIssue(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-700"
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
                            disabled={loading || !amount || !reason.trim() || !dateOfIssue}
                            className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 font-bold disabled:opacity-50 transition"
                        >
                            {loading ? "Saving..." : "Save Challan"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
