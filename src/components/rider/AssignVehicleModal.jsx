import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function AssignVehicleModal({
    open,
    onClose,
    onSuccess,
    prefilledRiderId = null,
    prefilledBikeId = null,
    stations,
    teamLeads,
    clients,
}) {
    const [formData, setFormData] = useState({
        rider_id: prefilledRiderId || "",
        client_name: "",
        client_id: "",
        clientele_id: "",
        bike_number: "",
        bike_id: prefilledBikeId || "",
        station_name: "",
        station_id: "",
        assigned_at: new Date().toISOString().split("T")[0],
        hiring_type: "B2B",
        team_lead_name: "",
        team_lead_id: "",
        battery_mode: "Batterypool-Fixed",
        area: "",
        battery_code: "",
        charger_code: "",
        deposit_collected: "",
        deposit_utr: "",
    });

    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState("");
    const [riderInfo, setRiderInfo] = useState(null);

    // If prefilled, load initial data
    useEffect(() => {
        if (prefilledRiderId && open) {
            loadRiderData(prefilledRiderId);
        }
        // Reset form when modal closes
        if (!open) {
            setRiderInfo(null);
            setMessage("");
        }
    }, [open, prefilledRiderId]);

    // Resolve client from name
    async function resolveClient() {
        if (!formData.client_name) return;
        try {
            const { data } = await supabase
                .from("clients")
                .select("id, name")
                .ilike("name", `%${formData.client_name.trim()}%`)
                .maybeSingle();

            if (data) {
                setFormData(prev => ({ ...prev, client_id: data.id, client_name: data.name }));
            }
        } catch (err) {
            console.error("Error resolving client:", err);
        }
    }

    // Resolve bike from number
    async function resolveBike() {
        if (!formData.bike_number) return;
        try {
            const { data } = await supabase
                .from("bikes")
                .select("id, bike_number, station_id")
                .eq("bike_number", formData.bike_number.trim())
                .maybeSingle();

            if (data) {
                setFormData(prev => ({ ...prev, bike_id: data.id }));
                // If bike has a station, resolve it
                if (data.station_id) {
                    const { data: sData } = await supabase.from("stations").select("id, name").eq("id", data.station_id).single();
                    if (sData) {
                        setFormData(prev => ({ ...prev, station_id: sData.id, station_name: sData.name }));
                    }
                }
            } else {
                setMessage("❌ Bike no. not found");
            }
        } catch (err) {
            console.error("Error resolving bike:", err);
        }
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

    // Resolve TL from name
    async function resolveTL() {
        if (!formData.team_lead_name) return;
        try {
            const { data } = await supabase
                .from("team_leads")
                .select("id, name")
                .ilike("name", `%${formData.team_lead_name.trim()}%`)
                .maybeSingle();

            if (data) {
                setFormData(prev => ({ ...prev, team_lead_id: data.id, team_lead_name: data.name }));
            }
        } catch (err) {
            console.error("Error resolving TL:", err);
        }
    }

    async function loadRiderData(riderId) {
        try {
            const { data } = await supabase
                .from("riders")
                .select("id, name, aadhar_no")
                .eq("id", riderId)
                .single();

            if (data) {
                setRiderInfo(data);
                setFormData((prev) => ({
                    ...prev,
                    rider_id: data.id,
                }));
            }
        } catch (err) {
            console.error("Error loading rider:", err);
        }
    }

    if (!open) return null;

    async function handleSubmit(e) {
        e.preventDefault();
        setMessage("");

        if (!formData.rider_id || !formData.bike_id) {
            setMessage("❌ Valid Rider and Bike No. required");
            return;
        }

        setSubmitting(true);

        try {
            const { error } = await supabase.from("rider_bike_assignments").insert({
                rider_id: formData.rider_id,
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
            });

            if (error) throw error;

            setMessage("✅ Vehicle assigned successfully!");
            setTimeout(() => {
                onSuccess();
                handleClose();
            }, 1000);
        } catch (err) {
            console.error("Error creating assignment:", err);
            setMessage("❌ Error: " + err.message);
        } finally {
            setSubmitting(false);
        }
    }

    function handleClose() {
        setFormData({
            rider_id: "",
            client_name: "",
            client_id: "",
            clientele_id: "",
            bike_number: "",
            bike_id: "",
            station_name: "",
            station_id: "",
            assigned_at: new Date().toISOString().split("T")[0],
            hiring_type: "B2B",
            team_lead_name: "",
            team_lead_id: "",
            battery_mode: "Batterypool-Fixed",
            area: "",
            battery_code: "",
            charger_code: "",
            deposit_collected: "",
            deposit_utr: "",
        });
        setRiderInfo(null);
        setMessage("");
        onClose();
    }

    return (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex justify-center items-center z-[100] overflow-y-auto p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl transform transition-all animate-in fade-in zoom-in duration-300">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-3xl">
                    <h2 className="text-xl font-bold text-gray-900">Assign Vehicle to Rider</h2>
                    {riderInfo && (
                        <div className="flex flex-col items-end">
                            <span className="text-sm font-bold text-blue-600">{riderInfo.name}</span>
                            <span className="text-[10px] text-gray-500 font-mono uppercase tracking-tighter">{riderInfo.aadhar_no}</span>
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Dates and Basics */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
                                Assigned At *
                            </label>
                            <input
                                type="date"
                                value={formData.assigned_at}
                                onChange={(e) => setFormData({ ...formData, assigned_at: e.target.value })}
                                className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
                                Hiring Type *
                            </label>
                            <select
                                value={formData.hiring_type}
                                onChange={(e) => setFormData({ ...formData, hiring_type: e.target.value })}
                                className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
                                required
                            >
                                <option value="B2B">B2B</option>
                                <option value="B2C">B2C</option>
                            </select>
                        </div>
                    </div>

                    {/* Client and Clientele */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
                                Client Name
                            </label>
                            <input
                                type="text"
                                value={formData.client_name}
                                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                                onBlur={resolveClient}
                                placeholder="Type Client Name"
                                className={`w-full border rounded-2xl px-4 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium ${formData.client_id ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}
                            />
                            {formData.client_id && <p className="text-[10px] text-green-600 font-bold mt-1 ml-1 px-1">✅ Client Linked</p>}
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
                                Clientele ID
                            </label>
                            <input
                                type="text"
                                value={formData.clientele_id}
                                onChange={(e) => setFormData({ ...formData, clientele_id: e.target.value })}
                                placeholder="Enter Clientele ID"
                                className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
                            />
                        </div>
                    </div>

                    {/* Bike and Station */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1 text-blue-600">
                                Bike Number *
                            </label>
                            <input
                                type="text"
                                value={formData.bike_number}
                                onChange={(e) => setFormData({ ...formData, bike_number: e.target.value })}
                                onBlur={resolveBike}
                                placeholder="MH12 AB 1234"
                                className={`w-full border rounded-2xl px-4 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-bold ${formData.bike_id ? 'border-green-300 bg-green-50/50' : 'border-gray-200'}`}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
                                Station Name *
                            </label>
                            <select
                                value={formData.station_id}
                                onChange={(e) => handleStationChange(e.target.value)}
                                className={`w-full border rounded-2xl px-4 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium ${formData.station_id ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}
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

                    {/* Team Lead and Battery Mode */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
                                Team Lead
                            </label>
                            <input
                                type="text"
                                value={formData.team_lead_name}
                                onChange={(e) => setFormData({ ...formData, team_lead_name: e.target.value })}
                                onBlur={resolveTL}
                                placeholder="Search Team Lead"
                                className={`w-full border rounded-2xl px-4 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium ${formData.team_lead_id ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
                                Battery Mode *
                            </label>
                            <select
                                value={formData.battery_mode}
                                onChange={(e) => setFormData({ ...formData, battery_mode: e.target.value })}
                                className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
                                required
                            >
                                <option value="Batterypool-Fixed">Batterypool-Fixed</option>
                                <option value="BatteryPool-Swap">BatteryPool-Swap</option>
                                <option value="EzyEV">EzyEV</option>
                                <option value="Double Battery">Double Battery</option>
                            </select>
                        </div>
                    </div>

                    {/* Area and Codes */}
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
                                Operation Area
                            </label>
                            <input
                                type="text"
                                value={formData.area}
                                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                                placeholder="Area"
                                className="w-full border border-gray-200 rounded-2xl px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
                                Battery Code
                            </label>
                            <input
                                type="text"
                                value={formData.battery_code}
                                onChange={(e) => setFormData({ ...formData, battery_code: e.target.value })}
                                placeholder="Code"
                                className="w-full border border-gray-200 rounded-2xl px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
                                Charger Code
                            </label>
                            <input
                                type="text"
                                value={formData.charger_code}
                                onChange={(e) => setFormData({ ...formData, charger_code: e.target.value })}
                                placeholder="Code"
                                className="w-full border border-gray-200 rounded-2xl px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
                            />
                        </div>
                    </div>

                    {/* Deposits */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
                                Deposit Collected
                            </label>
                            <input
                                type="number"
                                value={formData.deposit_collected}
                                onChange={(e) => setFormData({ ...formData, deposit_collected: e.target.value })}
                                placeholder="Amount in ₹"
                                className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
                                Deposit UTR No.
                            </label>
                            <input
                                type="text"
                                value={formData.deposit_utr}
                                onChange={(e) => setFormData({ ...formData, deposit_utr: e.target.value })}
                                placeholder="UTR Number"
                                className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
                            />
                        </div>
                    </div>

                    {/* Message Area */}
                    {message && (
                        <div className={`p-3 rounded-2xl text-xs font-bold border flex items-center gap-2 ${message.includes("✅") ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-700 border-red-100"}`}>
                            {message}
                        </div>
                    )}

                    {/* Submission */}
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-6 py-2.5 rounded-2xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-100 transition-all"
                        >
                            Back
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-8 py-2.5 rounded-2xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    Assigning...
                                </>
                            ) : "Confirm Assignment"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
