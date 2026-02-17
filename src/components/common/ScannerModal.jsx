import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

/**
 * ScannerModal – opens the device camera and scans QR / Data Matrix barcodes.
 *
 * Props:
 *   open      – boolean, controls visibility
 *   onClose   – called when user closes the modal
 *   onScan    – called with the decoded string (the SKU)
 */
export default function ScannerModal({ open, onClose, onScan }) {
    const scannerRef = useRef(null);
    const [error, setError] = useState("");
    const [scanning, setScanning] = useState(false);

    useEffect(() => {
        if (!open) return;

        let html5Qr = null;
        const readerId = "qr-reader-" + Date.now();

        // Wait for the DOM element to render
        const timer = setTimeout(async () => {
            try {
                const el = document.getElementById(readerId);
                if (!el) return;

                html5Qr = new Html5Qrcode(readerId);
                scannerRef.current = html5Qr;
                setScanning(true);
                setError("");

                await html5Qr.start(
                    { facingMode: "environment" },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        formatsToSupport: [
                            0,  // QR_CODE
                            11, // DATA_MATRIX
                            4,  // CODE_128
                            2,  // CODE_39
                            8,  // EAN_13
                        ],
                    },
                    (decodedText) => {
                        // On successful scan
                        onScan(decodedText.trim());
                        stopAndClose(html5Qr);
                    },
                    () => {
                        // Ignore scan failures (no code in frame)
                    }
                );
            } catch (err) {
                console.error("Scanner init error:", err);
                setError(
                    typeof err === "string"
                        ? err
                        : err?.message || "Camera access denied or not available."
                );
                setScanning(false);
            }
        }, 300);

        // Store the readerId so we can reference it in cleanup
        scannerRef.current = { readerId };

        return () => {
            clearTimeout(timer);
            if (html5Qr) {
                stopScanner(html5Qr);
            }
        };
    }, [open]);

    async function stopScanner(instance) {
        try {
            const state = instance.getState();
            if (state === 2) {
                // 2 = SCANNING
                await instance.stop();
            }
            instance.clear();
        } catch {
            // Already stopped / cleared
        }
        setScanning(false);
    }

    function stopAndClose(instance) {
        stopScanner(instance);
        onClose();
    }

    function handleClose() {
        if (scannerRef.current instanceof Html5Qrcode) {
            stopScanner(scannerRef.current);
        }
        onClose();
    }

    if (!open) return null;

    // Generate a consistent reader id
    const readerId =
        scannerRef.current?.readerId || "qr-reader-" + Date.now();

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center z-[200] p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center px-5 py-4 border-b border-slate-700">
                    <div>
                        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                            📷 Scan Part Code
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                            Point camera at QR or Data Matrix label
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-slate-400 hover:text-slate-200 text-xl leading-none"
                    >
                        ✕
                    </button>
                </div>

                {/* Scanner viewport */}
                <div className="relative bg-black">
                    <div
                        id={readerId}
                        style={{ width: "100%", minHeight: 280 }}
                    />

                    {!scanning && !error && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-slate-400 text-sm animate-pulse">
                                Starting camera…
                            </span>
                        </div>
                    )}
                </div>

                {/* Error */}
                {error && (
                    <div className="px-5 py-3 bg-red-500/10 border-t border-red-500/30 text-red-300 text-xs">
                        ⚠️ {error}
                    </div>
                )}

                {/* Footer */}
                <div className="px-5 py-3 border-t border-slate-700 flex justify-end">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 rounded-xl border border-slate-600 text-slate-300 text-sm hover:bg-slate-800 transition font-medium"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
