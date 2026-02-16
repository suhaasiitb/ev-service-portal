import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function UnassignVehicleModal({ open, onClose, onSuccess, assignmentId }) {
    const [formData, setFormData] = useState({
        unassigned_at: new Date().toISOString().split("T")[0],
        unassign_reason: "Rental not affordable",
        return_charger_code: "",
        damage_amount: "",
        vehicle_condition: "",
    });

    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState("");

    if (!open) return null;

    async function handleSubmit(e) {
        e.preventDefault();
        setMessage("");
        setSubmitting(true);

        try {
            // Update the assignment record with unassignment details
            const { error } = await supabase
                .from("rider_bike_assignments")
                .update({
                    unassigned_at: formData.unassigned_at,
                    unassign_reason: formData.unassign_reason,
                    return_charger_code: formData.return_charger_code,
                    damage_amount: parseFloat(formData.damage_amount) || 0,
                    vehicle_condition: formData.vehicle_condition,
                    // If we want to mark it as inactive or similar, we'd do it here.
                    // For now, we'll just log these details as requested.
                })
                .eq("id", assignmentId);

            if (error) throw error;

            setMessage("✅ Vehicle unassigned and details logged!");
            setTimeout(() => {
                onSuccess();
                handleClose();
            }, 1000);
        } catch (err) {
            console.error("Error unassigning vehicle:", err);
            setMessage("❌ Error: " + err.message);
        } finally {
            setSubmitting(false);
        }
    }

    function handleClose() {
        setFormData({
            unassigned_at: new Date().toISOString().split("T")[0],
            unassign_reason: "Rental not affordable",
            return_charger_code: "",
            damage_amount: "",
            vehicle_condition: "",
        });
        setMessage("");
        onClose();
    }

    return (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex justify-center items-center z-[110] p-4">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl transform transition-all animate-in fade-in zoom-in duration-300">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-red-50/30 rounded-t-3xl text-red-700">
                    <h2 className="text-xl font-bold">Unassign Vehicle</h2>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                            Unassigned At *
                        </label>
                        <input
                            type="date"
                            value={formData.unassigned_at}
                            onChange={(e) => setFormData({ ...formData, unassigned_at: e.target.value })}
                            className="w-full border border-gray-200 rounded-2xl px-4 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                            Unassign Reason *
                        </label>
                        <select
                            value={formData.unassign_reason}
                            onChange={(e) => setFormData({ ...formData, unassign_reason: e.target.value })}
                            className="w-full border border-gray-200 rounded-2xl px-4 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                            required
                        >
                            <option value="Rental not affordable">Rental not affordable</option>
                            <option value="Found job else where">Found job else where</option>
                            <option value="Issues with vehicle">Issues with vehicle</option>
                            <option value="Vehicle Recovery">Vehicle Recovery</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                            Return Charger Code
                        </label>
                        <input
                            type="text"
                            value={formData.return_charger_code}
                            onChange={(e) => setFormData({ ...formData, return_charger_code: e.target.value })}
                            placeholder="Enter code"
                            className="w-full border border-gray-200 rounded-2xl px-4 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                                Damage Amount
                            </label>
                            <input
                                type="number"
                                value={formData.damage_amount}
                                onChange={(e) => setFormData({ ...formData, damage_amount: e.target.value })}
                                placeholder="₹ 0.00"
                                className="w-full border border-gray-200 rounded-2xl px-4 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                                Vehicle Condition
                            </label>
                            <input
                                type="text"
                                value={formData.vehicle_condition}
                                onChange={(e) => setFormData({ ...formData, vehicle_condition: e.target.value })}
                                placeholder="e.g. Good, Scratched"
                                className="w-full border border-gray-200 rounded-2xl px-4 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                            />
                        </div>
                    </div>

                    {message && (
                        <div className={`p-3 rounded-2xl text-xs font-bold border flex items-center gap-2 ${message.includes("✅") ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-700 border-red-100"}`}>
                            {message}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-6 py-2 rounded-2xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-100 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-8 py-2 rounded-2xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 disabled:opacity-50 shadow-lg shadow-red-500/30 transition-all flex items-center gap-2"
                        >
                            {submitting ? "Processing..." : "Confirm Unassign"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
