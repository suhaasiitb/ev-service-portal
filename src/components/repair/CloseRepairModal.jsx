import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import PartRowWithScan from "../common/PartRowWithScan";

export default function CloseRepairModal({ open, onClose, repairTicket, engineers, onSuccess }) {
    const [partsUsed, setPartsUsed] = useState([{ part_id: "", quantity: 1 }]);
    const [servicedBy, setServicedBy] = useState("");
    const [parts, setParts] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState("");

    // Fetch compatible parts based on bike model
    useEffect(() => {
        if (!open || !repairTicket?.model_id) {
            fetchAllParts();
            return;
        }
        fetchCompatibleParts(repairTicket.model_id);
    }, [open, repairTicket?.model_id]);

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
        setPartsUsed([...partsUsed, { part_id: "", quantity: 1 }]);
    }

    function removePartRow(index) {
        setPartsUsed(partsUsed.filter((_, i) => i !== index));
    }

    function updatePartRow(index, field, value) {
        const updated = [...partsUsed];
        updated[index][field] = value;
        setPartsUsed(updated);
    }

    if (!open || !repairTicket) return null;

    // Filter engineers to station
    const stationEngineers = engineers.filter(
        (eng) => eng.station_id === repairTicket.bikes?.station_id
    );

    const partsReqDisplay = (repairTicket.parts_required || [])
        .map((p) => `${p.part_name} (×${p.quantity})`)
        .join(", ") || "None";

    async function handleSubmit() {
        if (!servicedBy) {
            setMessage("❌ Please select the servicing engineer.");
            return;
        }

        setSubmitting(true);
        setMessage("");

        try {
            // Build parts used data
            const partsData = partsUsed
                .filter((p) => p.part_id)
                .map((p) => {
                    const partInfo = parts.find((pt) => pt.id === p.part_id);
                    return {
                        part_id: p.part_id,
                        part_name: partInfo?.part_name || "",
                        quantity: parseInt(p.quantity, 10),
                    };
                });

            // 1. Update under_repair record
            const { error: repairErr } = await supabase
                .from("under_repair")
                .update({
                    parts_used: partsData,
                    serviced_by: servicedBy,
                    close_date: new Date().toISOString(),
                    status: "closed",
                })
                .eq("id", repairTicket.id);

            if (repairErr) throw repairErr;

            // 2. Deduct parts from inventory (same pattern as walk-in job)
            for (const p of partsData) {
                if (!p.part_id) continue;

                // Get current stock
                const { data: inv, error: invErr } = await supabase
                    .from("inventory_master")
                    .select("id, quantity")
                    .eq("part_id", p.part_id)
                    .eq("station_id", repairTicket.bikes?.station_id)
                    .maybeSingle();

                if (invErr) {
                    console.error("Inventory lookup error:", invErr);
                    continue;
                }

                if (inv) {
                    const newQty = Math.max(0, (inv.quantity || 0) - p.quantity);
                    await supabase
                        .from("inventory_master")
                        .update({ quantity: newQty })
                        .eq("id", inv.id);
                }
            }

            // 3. Update bikes.status to ready_to_deploy
            const { error: bikeErr } = await supabase
                .from("bikes")
                .update({ status: "ready_to_deploy" })
                .eq("id", repairTicket.bike_id);

            if (bikeErr) throw bikeErr;

            setMessage("✅ Repair ticket closed! Vehicle is Ready to Deploy.");
            setTimeout(() => {
                onSuccess();
                handleClose();
            }, 1200);
        } catch (err) {
            console.error("Close repair error:", err);
            setMessage("❌ Error: " + err.message);
        } finally {
            setSubmitting(false);
        }
    }

    function handleClose() {
        setPartsUsed([{ part_id: "", quantity: 1 }]);
        setServicedBy("");
        setMessage("");
        onClose();
    }

    return (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex justify-center items-center z-40">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl shadow-slate-950/80 p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-5">
                    <h2 className="text-xl font-semibold text-slate-100">
                        Close Repair Ticket
                    </h2>
                    <button onClick={handleClose} className="text-slate-400 hover:text-slate-200">✕</button>
                </div>

                {/* Read-Only Details */}
                <div className="bg-slate-800/50 rounded-xl p-4 mb-5 space-y-2 text-xs">
                    <div className="flex justify-between">
                        <span className="text-slate-500 font-bold uppercase">Vehicle No</span>
                        <span className="text-slate-100 font-mono font-bold">{repairTicket.bike_number}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500 font-bold uppercase">PDI Done By</span>
                        <span className="text-slate-200">{repairTicket.pdi_done_by_name}</span>
                    </div>
                    <div className="flex justify-between items-start">
                        <span className="text-slate-500 font-bold uppercase">Parts Required</span>
                        <span className="text-slate-200 text-right max-w-[60%]">{partsReqDisplay}</span>
                    </div>
                </div>

                {/* Parts Used */}
                <label className="block mb-2 text-sm font-medium text-slate-200">
                    Parts Used
                </label>
                {partsUsed.map((row, index) => (
                    <PartRowWithScan
                        key={index}
                        parts={parts}
                        partId={row.part_id}
                        quantity={row.quantity}
                        onPartChange={(partId) => updatePartRow(index, "part_id", partId)}
                        onQtyChange={(val) => updatePartRow(index, "quantity", val)}
                        onRemove={() => removePartRow(index)}
                        showRemove={index > 0}
                    />
                ))}
                <button
                    className="text-blue-400 text-sm underline mb-4 hover:text-blue-300 transition"
                    onClick={addPartRow}
                >
                    + Add Another Part
                </button>

                {/* Serviced By */}
                <label className="block mb-2 text-sm font-medium text-slate-200">
                    Serviced By *
                </label>
                <select
                    className="border border-slate-700 bg-slate-950/60 text-slate-100 text-sm rounded-xl w-full mb-4 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={servicedBy}
                    onChange={(e) => setServicedBy(e.target.value)}
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
                        className="px-5 py-2 rounded-full bg-orange-600 text-white text-sm font-medium hover:bg-orange-500 disabled:opacity-50 transition shadow-md shadow-orange-500/20"
                    >
                        {submitting ? "Closing..." : "Close Ticket"}
                    </button>
                </div>
            </div>
        </div>
    );
}
