import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function ChangeStationModal({ open, onClose, vehicle, stations, onSuccess }) {
    const [stationId, setStationId] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (open && vehicle) {
            setStationId(vehicle.station_id || "");
            setMessage("");
        }
    }, [open, vehicle]);

    if (!open || !vehicle) return null;

    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitting(true);
        setMessage("");

        try {
            const { error } = await supabase
                .from("bikes")
                .update({ station_id: stationId || null })
                .eq("id", vehicle.id);

            if (error) throw error;

            setMessage("✅ Station updated successfully!");
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1000);
        } catch (err) {
            console.error("Error updating station:", err);
            setMessage("❌ Failed to update: " + err.message);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex justify-center items-center z-[110] p-4">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-900">Change Station</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <p className="text-sm font-semibold text-gray-700 mb-1">
                            Vehicle: <span className="text-blue-600">{vehicle.bike_number}</span>
                        </p>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                            Select Station
                        </label>
                        <select
                            value={stationId}
                            onChange={(e) => setStationId(e.target.value)}
                            className="w-full border border-gray-200 rounded-2xl px-4 py-3 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                            required
                        >
                            <option value="">Select a station</option>
                            {stations.map(st => (
                                <option key={st.id} value={st.id}>{st.name}</option>
                            ))}
                        </select>
                    </div>

                    {message && (
                        <div className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${message.includes("✅") ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"}`}>
                            {message}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-2xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-100 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-8 py-2.5 rounded-2xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2"
                        >
                            {submitting ? "Saving..." : "Save Station"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
