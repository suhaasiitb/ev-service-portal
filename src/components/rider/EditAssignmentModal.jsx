import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function EditAssignmentModal({ open, onClose, onSuccess, assignmentId, stations }) {
    const [formData, setFormData] = useState({
        client_name: "",
        client_id: "",
        clientele_id: "",
        bike_number: "",
        bike_id: "",
        station_name: "",
        station_id: "",
        assigned_at: "",
        hiring_type: "",
        team_lead_name: "",
        team_lead_id: "",
        battery_mode: "",
        area: "",
        battery_code: "",
        charger_code: "",
        deposit_collected: "",
        deposit_utr: "",
    });

    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (open && assignmentId) {
            fetchAssignmentDetails();
        }
    }, [open, assignmentId]);

    async function fetchAssignmentDetails() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("rider_bike_assignments")
                .select(`
                    *,
                    bikes(bike_number),
                    clients(id, name),
                    stations(id, name),
                    team_leads(id, name)
                `)
                .eq("id", assignmentId)
                .single();

            if (error) throw error;

            if (data) {
                setFormData({
                    client_name: data.clients?.name || "",
                    client_id: data.client_id || "",
                    clientele_id: data.clientele_id || "",
                    bike_number: data.bikes?.bike_number || "",
                    bike_id: data.bike_id || "",
                    station_name: data.stations?.name || "",
                    station_id: data.station_id || "",
                    assigned_at: data.assigned_at?.split("T")[0] || "",
                    hiring_type: data.hiring_type || "B2B",
                    team_lead_name: data.team_leads?.name || "",
                    team_lead_id: data.team_lead_id || "",
                    battery_mode: data.battery_mode || "Batterypool-Fixed",
                    area: data.area || "",
                    battery_code: data.battery_code || "",
                    charger_code: data.charger_code || "",
                    deposit_collected: data.deposit_collected || "",
                    deposit_utr: data.deposit_utr || "",
                });
            }
        } catch (err) {
            console.error("Error fetching assignment:", err);
            setMessage("❌ Error loading details");
        } finally {
            setLoading(false);
        }
    }

    async function resolveClient() {
        if (!formData.client_name) return;
        const { data } = await supabase.from("clients").select("id, name").ilike("name", `%${formData.client_name.trim()}%`).maybeSingle();
        if (data) setFormData(prev => ({ ...prev, client_id: data.id, client_name: data.name }));
    }

    async function resolveBike() {
        if (!formData.bike_number) return;
        const { data } = await supabase.from("bikes").select("id, bike_number").eq("bike_number", formData.bike_number.trim()).maybeSingle();
        if (data) setFormData(prev => ({ ...prev, bike_id: data.id }));
    }

    // List of allowed stations for dropdown as requested
    const allowedStationNames = ["Nanded Station", "Kharadi Station", "Hinjewadi Station"];
    const filteredStations = (stations || []).filter(s => allowedStationNames.includes(s.name));

    function handleStationChange(stationId) {
        const station = filteredStations.find(s => s.id === stationId);
        setFormData(prev => ({
            ...prev,
            station_id: stationId,
            station_name: station ? station.name : ""
        }));
    }

    async function resolveTL() {
        if (!formData.team_lead_name) return;
        const { data } = await supabase.from("team_leads").select("id, name").ilike("name", `%${formData.team_lead_name.trim()}%`).maybeSingle();
        if (data) setFormData(prev => ({ ...prev, team_lead_id: data.id, team_lead_name: data.name }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setMessage("");
        setSubmitting(true);

        try {
            const { error } = await supabase
                .from("rider_bike_assignments")
                .update({
                    client_id: formData.client_id || null,
                    clientele_id: formData.clientele_id,
                    bike_id: formData.bike_id,
                    station_id: formData.station_id || null,
                    assigned_at: formData.assigned_at,
                    hiring_type: formData.hiring_type,
                    team_lead_id: formData.team_lead_id || null,
                    battery_mode: formData.battery_mode,
                    area: formData.area,
                    battery_code: formData.battery_code,
                    charger_code: formData.charger_code,
                    deposit_collected: parseFloat(formData.deposit_collected) || 0,
                    deposit_utr: formData.deposit_utr,
                })
                .eq("id", assignmentId);

            if (error) throw error;

            setMessage("✅ Assignment updated successfully!");
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1000);
        } catch (err) {
            console.error("Error updating assignment:", err);
            setMessage("❌ Error: " + err.message);
        } finally {
            setSubmitting(false);
        }
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex justify-center items-center z-[110] p-4 overflow-y-auto font-sans">
            <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] transform transition-all animate-in fade-in zoom-in duration-300">
                <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-[2rem]">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Modify Assignment</h2>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600">
                        <span className="text-xl">✕</span>
                    </button>
                </div>

                {loading ? (
                    <div className="p-20 text-center text-gray-400 font-bold animate-pulse">Fetching assignment data...</div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        <div className="grid grid-cols-2 gap-6 font-medium">
                            <div>
                                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Assigned At</label>
                                <input type="date" value={formData.assigned_at} onChange={(e) => setFormData({ ...formData, assigned_at: e.target.value })} className="w-full border-2 border-gray-100 rounded-2xl px-5 py-3 bg-gray-50 focus:border-blue-500 focus:bg-white transition-all outline-none" required />
                            </div>
                            <div>
                                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Hiring Type</label>
                                <select value={formData.hiring_type} onChange={(e) => setFormData({ ...formData, hiring_type: e.target.value })} className="w-full border-2 border-gray-100 rounded-2xl px-5 py-3 bg-gray-50 focus:border-blue-500 focus:bg-white transition-all outline-none" required>
                                    <option value="B2B">Business 2 Business (B2B)</option>
                                    <option value="B2C">Individual (B2C)</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Client Link</label>
                                <input type="text" value={formData.client_name} onChange={(e) => setFormData({ ...formData, client_name: e.target.value })} onBlur={resolveClient} className="w-full border-2 border-gray-100 rounded-2xl px-5 py-3 bg-gray-50 focus:border-blue-500 focus:bg-white transition-all outline-none" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Clientele ID</label>
                                <input type="text" value={formData.clientele_id} onChange={(e) => setFormData({ ...formData, clientele_id: e.target.value })} className="w-full border-2 border-gray-100 rounded-2xl px-5 py-3 bg-gray-50 focus:border-blue-500 focus:bg-white transition-all outline-none" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Bike Number</label>
                                <input type="text" value={formData.bike_number} onChange={(e) => setFormData({ ...formData, bike_number: e.target.value })} onBlur={resolveBike} className="w-full border-2 border-gray-100 rounded-2xl px-5 py-3 bg-gray-50 focus:border-blue-500 focus:bg-white transition-all outline-none font-bold" required />
                            </div>
                            <div>
                                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Station *</label>
                                <select
                                    value={formData.station_id}
                                    onChange={(e) => handleStationChange(e.target.value)}
                                    className="w-full border-2 border-gray-100 rounded-2xl px-5 py-3 bg-gray-50 focus:border-blue-500 focus:bg-white transition-all outline-none"
                                    required
                                >
                                    <option value="">Select Station</option>
                                    {filteredStations.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Team Lead</label>
                                <input type="text" value={formData.team_lead_name} onChange={(e) => setFormData({ ...formData, team_lead_name: e.target.value })} onBlur={resolveTL} className="w-full border-2 border-gray-100 rounded-2xl px-5 py-3 bg-gray-50 focus:border-blue-500 focus:bg-white transition-all outline-none" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Battery Setup</label>
                                <select value={formData.battery_mode} onChange={(e) => setFormData({ ...formData, battery_mode: e.target.value })} className="w-full border-2 border-gray-100 rounded-2xl px-5 py-3 bg-gray-50 focus:border-blue-500 focus:bg-white transition-all outline-none">
                                    <option value="Batterypool-Fixed">Batterypool-Fixed</option>
                                    <option value="BatteryPool-Swap">BatteryPool-Swap</option>
                                    <option value="EzyEV">EzyEV</option>
                                    <option value="Double Battery">Double Battery</option>
                                </select>
                            </div>
                        </div>

                        {message && (
                            <div className={`p-4 rounded-2xl text-sm font-bold border flex items-center gap-3 ${message.includes("✅") ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-700 border-red-100"}`}>
                                <span>{message}</span>
                            </div>
                        )}

                        <div className="flex justify-end gap-4 pt-6">
                            <button type="button" onClick={onClose} className="px-8 py-3.5 rounded-2xl text-gray-500 font-bold hover:bg-gray-100 transition-colors">Discard</button>
                            <button type="submit" disabled={submitting} className="px-10 py-3.5 rounded-2xl bg-black text-white font-bold hover:bg-gray-800 transition-all shadow-xl disabled:opacity-30">
                                {submitting ? "Applying..." : "Update Assignment"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
