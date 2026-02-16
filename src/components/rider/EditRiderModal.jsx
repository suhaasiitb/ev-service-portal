import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function EditRiderModal({ open, onClose, onSuccess, rider }) {
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        bank_account_no: "",
        ifsc_code: "",
        station_id: "",
    });

    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState("");
    const [stations, setStations] = useState([]);

    useEffect(() => {
        if (rider) {
            setFormData({
                name: rider.name || "",
                phone: rider.phone || "",
                bank_account_no: rider.bank_account_no || "",
                ifsc_code: rider.ifsc_code || "",
                station_id: rider.station_id || "",
            });
        }
    }, [rider]);

    useEffect(() => {
        async function fetchStations() {
            const { data } = await supabase.from("stations").select("id, name").order("name");
            setStations(data || []);
        }
        fetchStations();
    }, []);

    if (!open || !rider) return null;

    async function handleSubmit(e) {
        e.preventDefault();
        setMessage("");
        setSubmitting(true);

        try {
            const { error } = await supabase
                .from("riders")
                .update({
                    name: formData.name,
                    phone: formData.phone,
                    bank_account_no: formData.bank_account_no,
                    ifsc_code: formData.ifsc_code,
                    station_id: formData.station_id || null,
                })
                .eq("id", rider.id);

            if (error) throw error;

            setMessage("✅ Rider updated successfully!");
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1000);
        } catch (err) {
            console.error("Error updating rider:", err);
            setMessage("❌ Error: " + err.message);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex justify-center items-center z-[110] p-4">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl transform transition-all animate-in fade-in zoom-in duration-300">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-blue-50/30 rounded-t-3xl text-blue-700">
                    <h2 className="text-xl font-bold">Edit Rider Details</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="bg-gray-50 p-3 rounded-2xl mb-2 flex justify-between items-center border border-gray-100">
                        <div>
                            <p className="text-[10px] uppercase font-bold text-gray-400">Fixed Aadhar</p>
                            <p className="text-gray-900 font-mono text-sm">{rider.aadhar_no}</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
                            Full Name *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
                            Phone Number *
                        </label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
                                Bank Account
                            </label>
                            <input
                                type="text"
                                value={formData.bank_account_no}
                                onChange={(e) => setFormData({ ...formData, bank_account_no: e.target.value })}
                                className="w-full border border-gray-200 rounded-2xl px-4 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                                placeholder="Acc No."
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
                                IFSC Code
                            </label>
                            <input
                                type="text"
                                value={formData.ifsc_code}
                                onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value })}
                                className="w-full border border-gray-200 rounded-2xl px-4 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs uppercase"
                                placeholder="IFSC"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
                            Home Station
                        </label>
                        <select
                            value={formData.station_id}
                            onChange={(e) => setFormData({ ...formData, station_id: e.target.value })}
                            className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                        >
                            <option value="">Select Station</option>
                            {stations.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    {message && (
                        <div className={`p-3 rounded-2xl text-xs font-bold border flex items-center gap-2 ${message.includes("✅") ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-700 border-red-100"}`}>
                            {message}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 rounded-2xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-100 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-8 py-2 rounded-2xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2"
                        >
                            {submitting ? "Updating..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
