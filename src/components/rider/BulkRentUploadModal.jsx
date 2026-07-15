import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../../lib/supabaseClient";

const REQUIRED_COLS = ["Aadhar No", "Client ID", "Vehicle No.", "Amount", "Week Start", "Week End"];
const BATCH_SIZE = 100;

export default function BulkRentUploadModal({ open, onClose, onSuccess }) {
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

  function handleDownloadTemplate() {
    const sampleRows = [
      {
        "Aadhar No": "123456789012",
        "Client ID": "C-1001",
        "Vehicle No.": "MH12AB1234",
        "Amount": 1500,
        "Week Start": "2026-07-06",
        "Week End": "2026-07-12"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rent Upload");
    XLSX.writeFile(wb, "rent_upload_template.xlsx");
  }

  // ─── File Parsing & Validation ───────────────────────────────────────────────

  // Format excel serial dates to YYYY-MM-DD
  function formatExcelDate(dateVal) {
    if (!dateVal) return "";
    if (typeof dateVal === "number") {
      // Excel dates are days since 1900-01-01
      const d = new Date(Math.round((dateVal - 25569) * 864e5));
      return d.toISOString().split("T")[0];
    }
    // If it's already a string, return as is (assuming valid format)
    return String(dateVal).trim();
  }

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

      // Fetch all assignments to match
      const { data: assignments } = await supabase
        .from("rider_bike_assignments")
        .select(`
          id, 
          rider_id, 
          clientele_id, 
          created_at,
          unassigned_at,
          riders ( aadhar_no ),
          bikes ( bike_number )
        `)
        .order("created_at", { ascending: false });

      // Build a lookup map based on Aadhar, Client ID, and Vehicle No
      const assignmentMap = {}; // Key: "AADHAR|CLIENTID|VEHICLE" -> Assignment Obj (Latest)

      (assignments || []).forEach((a) => {
        const aadhar = String(a.riders?.aadhar_no || "").trim().toUpperCase();
        const client = String(a.clientele_id || "").trim().toUpperCase();
        const vehicle = String(a.bikes?.bike_number || "").trim().toUpperCase();
        
        if (aadhar && vehicle) {
          const key = `${aadhar}|${client}|${vehicle}`;
          // Since we ordered by created_at DESC, the first one we encounter is the latest
          if (!assignmentMap[key]) {
            assignmentMap[key] = a;
          }
        }
      });

      // Validate each row
      const validated = raw.map((raw_row, i) => {
        const aadhar = String(raw_row["Aadhar No"] || "").trim().toUpperCase();
        const client = String(raw_row["Client ID"] || "").trim().toUpperCase();
        const vehicle = String(raw_row["Vehicle No."] || "").trim().toUpperCase();
        const amount = Number(raw_row["Amount"]);
        const weekStart = formatExcelDate(raw_row["Week Start"]);
        const weekEnd = formatExcelDate(raw_row["Week End"]);

        const errors = [];
        let status = "Ready";

        if (!aadhar) errors.push("Aadhar No is empty");
        if (!vehicle) errors.push("Vehicle No. is empty");
        if (isNaN(amount) || amount < 0) errors.push("Invalid Amount");
        if (!weekStart) errors.push("Invalid Week Start");
        if (!weekEnd) errors.push("Invalid Week End");

        const key = `${aadhar}|${client}|${vehicle}`;
        const match = assignmentMap[key];

        if (!match && aadhar && vehicle) {
            errors.push("No matching assignment found for Aadhar + Client ID + Vehicle");
        }

        if (errors.length > 0) {
            status = "Error";
        }

        return {
          _original: raw_row,
          _row: i + 2,
          aadhar,
          client,
          vehicle,
          amount,
          weekStart,
          weekEnd,
          assignment_id: match?.id || null,
          rider_id: match?.rider_id || null,
          status,
          errors,
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
    
    const { data: authData } = await supabase.auth.getSession();
    const userId = authData?.session?.user?.id || null;

    let successCount = 0, failedCount = 0;
    const finalRows = [...rows];

    // Prepare valid rows for insert
    const validIndexes = finalRows.map((r, idx) => r.status !== "Error" ? idx : -1).filter(idx => idx !== -1);
    
    for (let i = 0; i < validIndexes.length; i += BATCH_SIZE) {
      const batchIndexes = validIndexes.slice(i, i + BATCH_SIZE);
      const batchPayload = batchIndexes.map(idx => {
          const r = finalRows[idx];
          return {
            assignment_id: r.assignment_id,
            rider_id: r.rider_id,
            amount: r.amount,
            week_start: r.weekStart,
            week_end: r.weekEnd,
            created_by: userId
          };
      });

      const { error } = await supabase
        .from("rent_collections")
        .insert(batchPayload);

      if (error) {
        console.error("Batch insert error:", error);
        batchIndexes.forEach(idx => {
            finalRows[idx].status = "Error";
            finalRows[idx].errors.push("DB Insert failed: " + error.message);
        });
        failedCount += batchIndexes.length;
      } else {
        batchIndexes.forEach(idx => {
            finalRows[idx].status = "Success";
        });
        successCount += batchIndexes.length;
      }
    }

    setRows(finalRows);
    setApplyResult({ success: successCount, failed: rows.length - successCount });
    setApplying(false);
    setStep(3);

    // Auto download result
    downloadResultFile(finalRows);
  }

  function downloadResultFile(finalRows) {
      const exportData = finalRows.map(r => {
          const rowData = { ...r._original };
          rowData["Upload Status"] = r.status === "Success" ? "Success" : `Failed: ${r.errors.join("; ")}`;
          return rowData;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Upload Results");
      XLSX.writeFile(wb, `rent_upload_results_${new Date().getTime()}.xlsx`);
  }

  // ─── Stats ───────────────────────────────────────────────────────────────────

  const readyCount = rows.filter((r) => r.status === "Ready").length;
  const errorCount = rows.filter((r) => r.status === "Error").length;
  const hasErrors = errorCount > 0;

  if (!open) return null;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">📤 Bulk Rent Upload</h2>
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
                    Download a sample Excel file with the correct column headers.
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
            </div>
          )}

          {/* ── Step 2: Preview ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 text-xs font-bold rounded-lg">
                  🟢 {readyCount} Ready
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-lg">
                  🔴 {errorCount} Errors
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-100 text-left text-gray-600 font-bold">
                      <th className="px-3 py-2 whitespace-nowrap">Row</th>
                      <th className="px-3 py-2 whitespace-nowrap">Status</th>
                      <th className="px-3 py-2 whitespace-nowrap">Aadhar</th>
                      <th className="px-3 py-2 whitespace-nowrap">Client ID</th>
                      <th className="px-3 py-2 whitespace-nowrap">Vehicle No</th>
                      <th className="px-3 py-2 whitespace-nowrap">Amount</th>
                      <th className="px-3 py-2 whitespace-nowrap">Week</th>
                      <th className="px-3 py-2">Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr
                        key={r._row}
                        className={`border-t ${
                          r.status === "Error" ? "bg-red-50" : "bg-white hover:bg-gray-50"
                        }`}
                      >
                        <td className="px-3 py-2 text-gray-400 font-mono">{r._row}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {r.status === "Ready" && <span className="text-green-600 font-bold">🟢 Ready</span>}
                          {r.status === "Error" && <span className="text-red-600 font-bold">🔴 Error</span>}
                        </td>
                        <td className="px-3 py-2 font-mono font-bold">{r.aadhar}</td>
                        <td className="px-3 py-2 font-mono">{r.client}</td>
                        <td className="px-3 py-2 font-mono font-bold">{r.vehicle}</td>
                        <td className="px-3 py-2 font-bold text-gray-900">₹{r.amount}</td>
                        <td className="px-3 py-2 text-gray-600">{r.weekStart} to {r.weekEnd}</td>
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
                  <p className="text-sm text-gray-500 mb-2">A result file with the status of each row has been downloaded automatically.</p>
                  <div className="flex gap-4 mt-2 text-sm">
                    <span className="bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 rounded-lg font-bold">
                      {applyResult.success} Successfully Added
                    </span>
                    {applyResult.failed > 0 && (
                      <span className="bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 rounded-lg font-bold">
                        {applyResult.failed} Failed / Skipped
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
            onClick={step === 1 ? handleClose : step === 2 ? () => { setStep(1); setRows([]); } : () => onSuccess()}
            className="px-4 py-2 text-sm font-bold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            {step === 1 ? "Cancel" : step === 2 ? "← Back" : "Close"}
          </button>

          {step === 2 && (
            <button
              onClick={applyChanges}
              className="px-6 py-2 text-sm font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-md shadow-green-500/20"
            >
              ✅ Apply Valid Entries ({readyCount})
            </button>
          )}

          {step === 3 && applyResult && (
            <button
              onClick={() => onSuccess()}
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
