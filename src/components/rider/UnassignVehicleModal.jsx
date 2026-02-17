import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function UnassignVehicleModal({ open, onClose, onSuccess, assignmentId, bikeId, stationId, session }) {
    const [formData, setFormData] = useState({
        unassigned_at: new Date().toISOString().split("T")[0],
        unassign_reason: "Rental not affordable",
        return_charger_code: "",
        damage_amount: "",
        vehicle_condition: "",
    });

    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState("");

    // PDI state
    const [pdiStatus, setPdiStatus] = useState(null); // null | 'sending' | 'sent' | 'completed'
    const [pdiError, setPdiError] = useState("");

    // Check for existing PDI request on open
    useEffect(() => {
        if (!open || !assignmentId) return;
        checkExistingPdi();
    }, [open, assignmentId]);

    async function checkExistingPdi() {
        // 1. Fetch assignment details (damage, condition)
        const { data: assignment, error: assignErr } = await supabase
            .from("rider_bike_assignments")
            .select("damage_amount, vehicle_condition")
            .eq("id", assignmentId)
            .maybeSingle();

        if (!assignErr && assignment) {
            setFormData(prev => ({
                ...prev,
                damage_amount: assignment.damage_amount || "",
                vehicle_condition: assignment.vehicle_condition || "",
            }));
        }

        // 2. Fetch PDI request status
        const { data: pdi, error: pdiErr } = await supabase
            .from("pdi_requests")
            .select("id, status")
            .eq("assignment_id", assignmentId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (!pdiErr && pdi) {
            setPdiStatus(pdi.status === "completed" ? "completed" : "sent");
        } else {
            setPdiStatus(null);
        }
    }

    async function handleRaisePdi() {
        if (!assignmentId || !bikeId || !stationId) {
            setPdiError("Missing assignment, bike, or station info.");
            return;
        }

        setPdiStatus("sending");
        setPdiError("");

        try {
            const { error } = await supabase.from("pdi_requests").insert({
                assignment_id: assignmentId,
                bike_id: bikeId,
                station_id: stationId,
                status: "pending",
            });

            if (error) throw error;
            setPdiStatus("sent");
        } catch (err) {
            console.error("Error raising PDI:", err);
            setPdiError("Failed to raise PDI: " + err.message);
            setPdiStatus(null);
        }
    }

    if (!open) return null;

    async function handleSubmit(e) {
        e.preventDefault();
        setMessage("");
        setSubmitting(true);

        try {
            const { error } = await supabase
                .from("rider_bike_assignments")
                .update({
                    unassigned_at: formData.unassigned_at,
                    unassign_reason: formData.unassign_reason,
                    return_charger_code: formData.return_charger_code,
                    damage_amount: parseFloat(formData.damage_amount) || 0,
                    vehicle_condition: formData.vehicle_condition,
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
        setPdiStatus(null);
        setPdiError("");
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

                    {/* PDI Section */}
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex-1">
                                <p className="text-xs font-black text-amber-700 uppercase tracking-widest mb-1">
                                    Pre-Delivery Inspection
                                </p>
                                <p className="text-[11px] text-amber-600">
                                    Raise a PDI request to the assigned station before unassigning.
                                </p>
                            </div>
                            <div className="flex flex-col items-end gap-1.5">
                                {pdiStatus === null && (
                                    <button
                                        type="button"
                                        onClick={handleRaisePdi}
                                        className="px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 shadow-md shadow-amber-500/20 transition-all"
                                    >
                                        📋 Raise PDI
                                    </button>
                                )}
                                {pdiStatus === "sending" && (
                                    <span className="text-xs font-bold text-amber-600 flex items-center gap-1.5">
                                        <span className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></span>
                                        Sending...
                                    </span>
                                )}
                                {pdiStatus === "sent" && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs font-bold">
                                        ✅ PDI Sent to Station
                                    </span>
                                )}
                                {pdiStatus === "completed" && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
                                        ✅ PDI Completed
                                    </span>
                                )}
                            </div>
                        </div>
                        {pdiError && (
                            <p className="text-xs text-red-600 font-medium mt-2">{pdiError}</p>
                        )}
                    </div>

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
