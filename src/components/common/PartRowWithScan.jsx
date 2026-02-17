import { useState } from "react";
import SearchablePartSelect from "./SearchablePartSelect";
import ScannerModal from "./ScannerModal";

/**
 * PartRowWithScan – a single part row with search dropdown + QR scan button.
 *
 * Props:
 *   parts          – array of { id, part_name, sku }
 *   partId         – currently selected part_id
 *   quantity       – current quantity value
 *   onPartChange   – (partId) => void
 *   onQtyChange    – (quantity) => void
 *   onRemove       – () => void  (null for the first row)
 *   showRemove     – boolean
 */
export default function PartRowWithScan({
    parts,
    partId,
    quantity,
    onPartChange,
    onQtyChange,
    onRemove,
    showRemove = false,
}) {
    const [showScanner, setShowScanner] = useState(false);
    const [scanError, setScanError] = useState("");

    function handleScanResult(scannedSku) {
        setScanError("");

        // Match scanned SKU to parts_catalog
        const match = parts.find(
            (p) => p.sku?.toLowerCase() === scannedSku.toLowerCase()
        );

        if (match) {
            onPartChange(match.id);
        } else {
            setScanError(`Part not found for SKU: ${scannedSku}`);
            setTimeout(() => setScanError(""), 4000);
        }

        setShowScanner(false);
    }

    return (
        <>
            <div className="flex gap-2 mb-2 items-center">
                {/* Searchable Part Dropdown */}
                <SearchablePartSelect
                    parts={parts}
                    value={partId}
                    onChange={onPartChange}
                    placeholder="Search Part"
                />

                {/* Quantity */}
                <input
                    type="number"
                    min="1"
                    className="border border-slate-700 bg-slate-950/60 text-slate-100 text-sm rounded-xl w-20 px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={quantity}
                    onChange={(e) => onQtyChange(e.target.value)}
                />

                {/* Scan Button */}
                <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-md shadow-emerald-500/20"
                    title="Scan QR / Data Matrix"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-4 h-4"
                    >
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                        <rect x="14" y="14" width="7" height="7" rx="1" />
                    </svg>
                </button>

                {/* Remove */}
                {showRemove && (
                    <button
                        className="text-red-400 text-lg px-2 hover:text-red-300 transition flex-shrink-0"
                        onClick={onRemove}
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Scan error feedback */}
            {scanError && (
                <div className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-1.5 mb-2">
                    ⚠️ {scanError}
                </div>
            )}

            {/* Scanner Modal */}
            <ScannerModal
                open={showScanner}
                onClose={() => setShowScanner(false)}
                onScan={handleScanResult}
            />
        </>
    );
}
