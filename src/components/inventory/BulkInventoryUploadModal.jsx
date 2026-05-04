import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../../lib/supabaseClient";

const REQUIRED_COLS = ["station_code", "sku", "quantity"];
const BATCH_SIZE = 100;

export default function BulkInventoryUploadModal({ open, onClose, onSuccess }) {
  const [step, setStep] = useState(1); // 1: Upload, 2: Preview, 3: Applying
  const [rows, setRows] = useState([]);
  const [fileError, setFileError] = useState("");
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  function resetState() {
    setStep(1);
    setRows([]);
    setFileError("");
    setApplying(false);
    setApplyResult(null);
  }

  function handleClose() {
    resetState();
    onClose();
  }

  // ─── Template Download ───────────────────────────────────────────────────────

  async function handleDownloadTemplate() {
    const { data: stations } = await supabase
      .from("stations")
      .select("station_code, name")
      .order("name");

    const sampleRows = (stations || []).map((s) => ({
      station_code: s.station_code,
      sku: "",
      part_name: "",
      unit_cost: "",
      quantity: 0,
      reorder_level: "",
      mode: "set",
    }));

    if (sampleRows.length === 0) {
      sampleRows.push({
        station_code: "KRD",
        sku: "BRK-001",
        part_name: "Brake Pad (only for new SKUs)",
        unit_cost: "450 (only for new SKUs)",
        quantity: 20,
        reorder_level: 5,
        mode: "set",
      });
    }

    const ws = XLSX.utils.json_to_sheet(sampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory Upload");
    XLSX.writeFile(wb, "inventory_upload_template.xlsx");
  }

  // ─── File Parsing & Validation ───────────────────────────────────────────────

  async function parseFile(file) {
    setFileError("");
    setRows([]);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });

      if (!raw || raw.length === 0) {
        setFileError("The file is empty or has no data rows.");
        return;
      }

      // Check required columns
      const missing = REQUIRED_COLS.filter((c) => !(c in raw[0]));
      if (missing.length > 0) {
        setFileError(`Missing required column(s): ${missing.join(", ")}`);
        return;
      }

      // Fetch lookup data
      const { data: stations } = await supabase
        .from("stations")
        .select("id, name, station_code");

      const { data: catalog } = await supabase
        .from("parts_catalog")
        .select("id, sku, part_name");

      const { data: existingInv } = await supabase
        .from("inventory_master")
        .select("id, station_id, part_id, quantity, reorder_level");

      const stationByCode = {};
      (stations || []).forEach((s) => {
        if (s.station_code) stationByCode[s.station_code.trim().toUpperCase()] = s;
      });

      const catalogBySku = {};
      (catalog || []).forEach((p) => {
        if (p.sku) catalogBySku[p.sku.trim().toUpperCase()] = p;
      });

      const invByKey = {};
      (existingInv || []).forEach((r) => {
        invByKey[`${r.station_id}__${r.part_id}`] = r;
      });

      // Validate each row
      const validated = raw.map((raw_row, i) => {
        const station_code = String(raw_row.station_code || "").trim().toUpperCase();
        const sku = String(raw_row.sku || "").trim().toUpperCase();
        const part_name = String(raw_row.part_name || "").trim();
        const unit_cost = raw_row.unit_cost !== "" ? Number(raw_row.unit_cost) : null;
        const quantity = Number(raw_row.quantity);
        const reorder_level = raw_row.reorder_level !== "" ? Number(raw_row.reorder_level) : null;
        const mode = String(raw_row.mode || "set").trim().toLowerCase();

        const errors = [];

        if (!station_code) errors.push("station_code is empty");
        if (!sku) errors.push("sku is empty");
        if (isNaN(quantity)) errors.push("quantity must be a number");

        const station = stationByCode[station_code];
        if (station_code && !station) errors.push(`Unknown station_code: ${station_code}`);

        const catalogPart = catalogBySku[sku];
        let action = "update";
        if (sku && !catalogPart) {
          action = "create_sku";
          if (!part_name) errors.push("part_name required for new SKU");
          if (unit_cost === null || isNaN(unit_cost)) errors.push("unit_cost required for new SKU");
        }

        if (errors.length > 0) action = "error";

        const existingRow = station && catalogPart
          ? invByKey[`${station.id}__${catalogPart.id}`]
          : null;

        const finalQty = mode === "add"
          ? (existingRow?.quantity || 0) + quantity
          : quantity;

        return {
          _row: i + 2,
          station_code,
          station_name: station?.name || "—",
          station_id: station?.id || null,
          sku,
          part_name: catalogPart?.part_name || part_name,
          part_id: catalogPart?.id || null,
          new_part_name: part_name,
          unit_cost,
          quantity,
          reorder_level,
          mode,
          action,
          errors,
          existing_qty: existingRow?.quantity ?? "—",
          final_qty: action === "error" ? "—" : finalQty,
          inv_id: existingRow?.id || null,
        };
      });

      setRows(validated);
      setStep(2);
    } catch (err) {
      console.error(err);
      setFileError("Failed to parse file: " + err.message);
    }
  }

  function handleFileInput(e) {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) parseFile(file);
  }

  // ─── Apply Changes ───────────────────────────────────────────────────────────

  async function applyChanges() {
    setApplying(true);
    setStep(3);

    const { data: authData } = await supabase.auth.getSession();
    const userId = authData?.session?.user?.id || null;

    let created = 0, updated = 0, failed = 0;

    const goodRows = rows.filter((r) => r.action !== "error");

    // Step 1: Create new SKUs in parts_catalog
    const newSkuRows = goodRows.filter((r) => r.action === "create_sku");
    const skuInsertMap = {}; // sku → new part_id

    for (const r of newSkuRows) {
      if (skuInsertMap[r.sku]) {
        r.part_id = skuInsertMap[r.sku];
        continue;
      }
      const { data: inserted, error } = await supabase
        .from("parts_catalog")
        .insert({ part_name: r.new_part_name, sku: r.sku, unit_cost: r.unit_cost })
        .select("id")
        .single();

      if (error) {
        console.error("Failed to create SKU:", r.sku, error);
        r.action = "error";
        r.errors = ["Failed to create SKU: " + error.message];
        failed++;
      } else {
        r.part_id = inserted.id;
        skuInsertMap[r.sku] = inserted.id;
      }
    }

    // Step 2: Upsert inventory_master in batches
    const invRows = goodRows.filter((r) => r.action !== "error" && r.station_id && r.part_id);

    for (let i = 0; i < invRows.length; i += BATCH_SIZE) {
      const batch = invRows.slice(i, i + BATCH_SIZE);

      const upsertPayload = batch.map((r) => ({
        station_id: r.station_id,
        part_id: r.part_id,
        quantity: r.final_qty,
        ...(r.reorder_level !== null ? { reorder_level: r.reorder_level } : {}),
        last_updated_by: userId,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("inventory_master")
        .upsert(upsertPayload, { onConflict: "station_id,part_id" });

      if (error) {
        console.error("Batch upsert error:", error);
        failed += batch.length;
      } else {
        batch.forEach((r) => {
          if (r.action === "create_sku") created++;
          else updated++;
        });
      }
    }

    setApplyResult({ created, updated, failed });
    setApplying(false);
    onSuccess();
  }

  // ─── Stats ───────────────────────────────────────────────────────────────────

  const updateCount = rows.filter((r) => r.action === "update").length;
  const createCount = rows.filter((r) => r.action === "create_sku").length;
  const errorCount = rows.filter((r) => r.action === "error").length;
  const hasErrors = errorCount > 0;

  if (!open) return null;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">📤 Bulk Inventory Upload</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Step {step === 3 && applyResult ? "3" : step} of 3 —{" "}
              {step === 1 ? "Upload File" : step === 2 ? "Preview & Validate" : applyResult ? "Done" : "Applying…"}
            </p>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-700 text-xl font-bold">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── Step 1: Upload ── */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Download template */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                <span className="text-2xl">📋</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-blue-900">Start with the template</p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    Download a pre-filled Excel file with your station codes and the correct column headers.
                  </p>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="shrink-0 px-4 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  ⬇ Download Template
                </button>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                  dragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
                }`}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleFileInput}
                />
                <div className="text-4xl mb-3">📁</div>
                <p className="text-gray-700 font-semibold">Drag & drop your file here</p>
                <p className="text-gray-400 text-sm mt-1">or click to browse — supports .xlsx, .xls, .csv</p>
              </div>

              {fileError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 font-medium">
                  ❌ {fileError}
                </div>
              )}

              {/* Column reference */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Required Columns</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  {[
                    { col: "station_code", req: true, note: "From stations table" },
                    { col: "sku", req: true, note: "Part identifier" },
                    { col: "quantity", req: true, note: "Stock count" },
                    { col: "mode", req: false, note: "set (default) or add" },
                    { col: "part_name", req: false, note: "New SKUs only" },
                    { col: "unit_cost", req: false, note: "New SKUs only" },
                    { col: "reorder_level", req: false, note: "Optional" },
                  ].map(({ col, req, note }) => (
                    <div key={col} className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                      <p className="font-mono font-bold text-gray-800">{col}</p>
                      <p className="text-gray-400 mt-0.5">{note}</p>
                      {req && <span className="text-red-500 font-bold">Required</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Preview ── */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Summary badges */}
              <div className="flex flex-wrap gap-3">
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 text-xs font-bold rounded-lg">
                  🟢 {updateCount} Updates
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs font-bold rounded-lg">
                  🟡 {createCount} New SKUs
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-lg">
                  🔴 {errorCount} Errors
                </span>
                {hasErrors && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold rounded-lg">
                    ⚠️ Fix all errors before applying
                  </span>
                )}
              </div>

              {/* Preview table */}
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-100 text-left text-gray-600 font-bold">
                      <th className="px-3 py-2 whitespace-nowrap">Row</th>
                      <th className="px-3 py-2 whitespace-nowrap">Status</th>
                      <th className="px-3 py-2 whitespace-nowrap">Station</th>
                      <th className="px-3 py-2 whitespace-nowrap">SKU</th>
                      <th className="px-3 py-2 whitespace-nowrap">Part Name</th>
                      <th className="px-3 py-2 whitespace-nowrap">Mode</th>
                      <th className="px-3 py-2 whitespace-nowrap">Current Qty</th>
                      <th className="px-3 py-2 whitespace-nowrap">→ Final Qty</th>
                      <th className="px-3 py-2 whitespace-nowrap">Reorder</th>
                      <th className="px-3 py-2">Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr
                        key={r._row}
                        className={`border-t ${
                          r.action === "error"
                            ? "bg-red-50"
                            : r.action === "create_sku"
                            ? "bg-yellow-50"
                            : "bg-white hover:bg-gray-50"
                        }`}
                      >
                        <td className="px-3 py-2 text-gray-400 font-mono">{r._row}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {r.action === "update" && <span className="text-green-600 font-bold">🟢 Update</span>}
                          {r.action === "create_sku" && <span className="text-yellow-600 font-bold">🟡 New SKU</span>}
                          {r.action === "error" && <span className="text-red-600 font-bold">🔴 Error</span>}
                        </td>
                        <td className="px-3 py-2 font-mono">{r.station_code}
                          {r.station_name !== "—" && (
                            <span className="text-gray-400 font-sans"> ({r.station_name})</span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono font-bold">{r.sku}</td>
                        <td className="px-3 py-2">{r.part_name || r.new_part_name || "—"}</td>
                        <td className="px-3 py-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            r.mode === "add" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                          }`}>{r.mode}</span>
                        </td>
                        <td className="px-3 py-2 text-gray-400">{r.existing_qty}</td>
                        <td className="px-3 py-2 font-bold text-gray-900">{r.final_qty}</td>
                        <td className="px-3 py-2 text-gray-400">{r.reorder_level ?? "—"}</td>
                        <td className="px-3 py-2 text-red-600 text-[10px]">
                          {r.errors.length > 0 ? r.errors.join("; ") : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Step 3: Applying / Done ── */}
          {step === 3 && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              {applying ? (
                <>
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-600 font-semibold">Applying changes, please wait…</p>
                </>
              ) : applyResult ? (
                <>
                  <div className="text-5xl">✅</div>
                  <p className="text-xl font-bold text-gray-900">Upload Complete!</p>
                  <div className="flex gap-4 mt-2 text-sm">
                    <span className="bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 rounded-lg font-bold">
                      {applyResult.updated} Updated
                    </span>
                    <span className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-3 py-1.5 rounded-lg font-bold">
                      {applyResult.created} Created
                    </span>
                    {applyResult.failed > 0 && (
                      <span className="bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 rounded-lg font-bold">
                        {applyResult.failed} Failed
                      </span>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4 flex justify-between items-center">
          <button
            onClick={step === 1 ? handleClose : step === 2 ? () => { setStep(1); setRows([]); } : handleClose}
            className="px-4 py-2 text-sm font-bold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            {step === 1 ? "Cancel" : step === 2 ? "← Back" : "Close"}
          </button>

          {step === 2 && (
            <button
              onClick={applyChanges}
              disabled={hasErrors || rows.length === 0}
              className="px-6 py-2 text-sm font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-md shadow-green-500/20"
            >
              ✅ Apply {updateCount + createCount} Changes
            </button>
          )}

          {step === 3 && applyResult && (
            <button
              onClick={handleClose}
              className="px-6 py-2 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
