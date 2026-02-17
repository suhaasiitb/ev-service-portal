import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import SearchablePartSelect from "../common/SearchablePartSelect";

export default function PdiTicketModal({ open, onClose, pdiRequest, engineers, onSuccess }) {
    const [vehicleCondition, setVehicleCondition] = useState("Good");
    const [damageAmount, setDamageAmount] = useState("");
    const [pdiAction, setPdiAction] = useState("Ready to Deploy");
    const [pdiDoneBy, setPdiDoneBy] = useState("");
    const [partsRequired, setPartsRequired] = useState([{ part_id: "", quantity: 1 }]);
    const [parts, setParts] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState("");

    // Fetch compatible parts based on bike model
    useEffect(() => {
        if (!open || !pdiRequest?.model_id) {
            fetchAllParts();
            return;
        }
        fetchCompatibleParts(pdiRequest.model_id);
    }, [open, pdiRequest?.model_id]);

    async function fetchAllParts() {
        const { data } = await supabase
            .from("parts_catalog")
            .select("id, part_name, sku");
        setParts(data || []);
    }

    async function fetchCompatibleParts(modelId) {
        const { data: mappings } = await supabase
            .from("part_model_map")
            .select("part_id")
            .eq("model_id", modelId);

        const partIds = (mappings || []).map((m) => m.part_id);

        if (partIds.length === 0) {
            await fetchAllParts();
            return;
        }

        const { data: compatible } = await supabase
            .from("parts_catalog")
            .select("id, part_name, sku")
            .in("id", partIds);

        setParts(compatible || []);
    }

    function addPartRow() {
        setPartsRequired([...partsRequired, { part_id: "", quantity: 1 }]);
    }

    function removePartRow(index) {
        setPartsRequired(partsRequired.filter((_, i) => i !== index));
    }

    function updatePartRow(index, field, value) {
        const updated = [...partsRequired];
        updated[index][field] = value;
        setPartsRequired(updated);
    }

    if (!open || !pdiRequest) return null;

    // Filter engineers to the same station
    const stationEngineers = engineers.filter(
        (eng) => eng.station_id === pdiRequest.station_id
    );

    async function handleSubmit() {
        if (!pdiDoneBy) {
            setMessage("❌ Please select the PDI done by engineer.");
            return;
        }

        setSubmitting(true);
        setMessage("");

        try {
            // 1. Update pdi_requests
            const { error: pdiErr } = await supabase
                .from("pdi_requests")
                .update({
                    vehicle_condition: vehicleCondition,
                    damage_amount: parseFloat(damageAmount) || 0,
                    pdi_action: pdiAction,
                    pdi_doneby: pdiDoneBy,
                    status: "completed",
                    completed_at: new Date().toISOString(),
                })
                .eq("id", pdiRequest.id);

            if (pdiErr) throw pdiErr;

            // 2. Update rider_bike_assignments
            const { error: assignErr } = await supabase
                .from("rider_bike_assignments")
                .update({
                    vehicle_condition: vehicleCondition,
                    damage_amount: parseFloat(damageAmount) || 0,
                    pdi_doneby: pdiDoneBy,
                })
                .eq("id", pdiRequest.assignment_id);

            if (assignErr) throw assignErr;

            // 3. Update bikes.status
            const bikeStatus = pdiAction === "Under Repair" ? "under_repair" : "ready_to_deploy";
            const { error: bikeErr } = await supabase
                .from("bikes")
                .update({ status: bikeStatus })
                .eq("id", pdiRequest.bike_id);

            if (bikeErr) throw bikeErr;

            // 4. If Under Repair → create under_repair record
            if (pdiAction === "Under Repair") {
                const partsData = partsRequired
                    .filter((p) => p.part_id)
                    .map((p) => {
                        const partInfo = parts.find((pt) => pt.id === p.part_id);
                        return {
                            part_id: p.part_id,
                            part_name: partInfo?.part_name || "",
                            quantity: parseInt(p.quantity, 10),
                        };
                    });

                const { error: repairErr } = await supabase
                    .from("under_repair")
                    .insert({
                        bike_id: pdiRequest.bike_id,
                        pdi_request_id: pdiRequest.id,
                        pdi_raisedby: pdiDoneBy,
                        parts_required: partsData,
                        date_raised: new Date().toISOString(),
                        status: "open",
                    });

                if (repairErr) throw repairErr;
            }

            setMessage("✅ PDI completed successfully!");
            setTimeout(() => {
                onSuccess();
                handleClose();
            }, 1200);
        } catch (err) {
            console.error("PDI submit error:", err);
            setMessage("❌ Error: " + err.message);
        } finally {
            setSubmitting(false);
        }
    }

    function handleClose() {
        setVehicleCondition("Good");
        setDamageAmount("");
        setPdiAction("Ready to Deploy");
        setPdiDoneBy("");
        setPartsRequired([{ part_id: "", quantity: 1 }]);
        setMessage("");
        onClose();
    }

    return (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex justify-center items-center z-40">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl shadow-slate-950/80 p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-5">
                    <h2 className="text-xl font-semibold text-slate-100">
                        PDI Inspection
                    </h2>
                    <button onClick={handleClose} className="text-slate-400 hover:text-slate-200">✕</button>
                </div>

                {/* Bike Info */}
                <div className="bg-slate-800/50 rounded-xl p-3 mb-5 flex gap-4 text-xs">
                    <div>
                        <span className="text-slate-500 font-bold uppercase">Bike</span>
                        <p className="text-slate-100 font-mono font-bold">{pdiRequest.bike_number}</p>
                    </div>
                    <div>
                        <span className="text-slate-500 font-bold uppercase">Rider</span>
                        <p className="text-slate-100 font-medium">{pdiRequest.rider_name}</p>
                    </div>
                </div>

                {/* Vehicle Condition */}
                <label className="block mb-2 text-sm font-medium text-slate-200">
                    Vehicle Condition *
                </label>
                <div className="flex gap-3 mb-4">
                    <button
                        type="button"
                        onClick={() => setVehicleCondition("Good")}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition border ${vehicleCondition === "Good"
                            ? "bg-green-600 border-green-500 text-white shadow-md shadow-green-500/20"
                            : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                            }`}
                    >
                        ✅ Good
                    </button>
                    <button
                        type="button"
                        onClick={() => setVehicleCondition("Damaged")}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition border ${vehicleCondition === "Damaged"
                            ? "bg-red-600 border-red-500 text-white shadow-md shadow-red-500/20"
                            : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                            }`}
                    >
                        ⚠️ Damaged
                    </button>
                </div>

                {/* Damage Amount (conditional) */}
                {vehicleCondition === "Damaged" && (
                    <div className="mb-4">
                        <label className="block mb-2 text-sm font-medium text-slate-200">
                            Damage Amount (₹)
                        </label>
                        <input
                            type="number"
                            className="border border-slate-700 bg-slate-950/60 text-slate-100 text-sm rounded-xl w-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                            value={damageAmount}
                            onChange={(e) => setDamageAmount(e.target.value)}
                            placeholder="Enter damage amount"
                        />
                    </div>
                )}

                {/* PDI Action */}
                <label className="block mb-2 text-sm font-medium text-slate-200">
                    PDI Action *
                </label>
                <select
                    className="border border-slate-700 bg-slate-950/60 text-slate-100 text-sm rounded-xl w-full mb-4 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={pdiAction}
                    onChange={(e) => setPdiAction(e.target.value)}
                >
                    <option value="Ready to Deploy">Ready to Deploy</option>
                    <option value="Under Repair">Under Repair</option>
                </select>

                {/* Parts Required (only when Under Repair) */}
                {pdiAction === "Under Repair" && (
                    <div className="mb-4">
                        <label className="block mb-2 text-sm font-medium text-slate-200">
                            Parts Required
                        </label>
                        {partsRequired.map((row, index) => (
                            <div key={index} className="flex gap-2 mb-2">
                                <SearchablePartSelect
                                    parts={parts}
                                    value={row.part_id}
                                    onChange={(partId) => updatePartRow(index, "part_id", partId)}
                                    placeholder="Search Part"
                                />
                                <input
                                    type="number"
                                    min="1"
                                    className="border border-slate-700 bg-slate-950/60 text-slate-100 text-sm rounded-xl w-20 px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={row.quantity}
                                    onChange={(e) => updatePartRow(index, "quantity", e.target.value)}
                                />
                                {index > 0 && (
                                    <button
                                        className="text-red-400 text-lg px-2 hover:text-red-300 transition"
                                        onClick={() => removePartRow(index)}
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            className="text-blue-400 text-sm underline hover:text-blue-300 transition"
                            onClick={addPartRow}
                        >
                            + Add Another Part
                        </button>
                    </div>
                )}

                {/* PDI Done By */}
                <label className="block mb-2 text-sm font-medium text-slate-200">
                    PDI Done By *
                </label>
                <select
                    className="border border-slate-700 bg-slate-950/60 text-slate-100 text-sm rounded-xl w-full mb-4 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={pdiDoneBy}
                    onChange={(e) => setPdiDoneBy(e.target.value)}
                >
                    <option value="">Select Engineer</option>
                    {stationEngineers.map((eng) => (
                        <option key={eng.id} value={eng.id}>
                            {eng.name}
                        </option>
                    ))}
                </select>

                {/* Message */}
                {message && (
                    <div className={`rounded-xl border px-4 py-3 text-sm mb-4 ${message.includes("✅")
                        ? "border-green-500/40 bg-green-500/10 text-green-300"
                        : "border-red-500/40 bg-red-500/10 text-red-300"
                        }`}>
                        {message}
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 mt-4">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 rounded-full border border-slate-600 text-slate-200 text-sm hover:bg-slate-800 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="px-5 py-2 rounded-full bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition shadow-md shadow-blue-500/20"
                    >
                        {submitting ? "Submitting..." : "Complete PDI"}
                    </button>
                </div>
            </div>
        </div>
    );
}
