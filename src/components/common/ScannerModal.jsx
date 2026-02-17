import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";

/**
 * ScannerModal – opens the device camera and scans QR / Data Matrix barcodes.
 *
 * Props:
 *   open      – boolean, controls visibility
 *   onClose   – called when user closes the modal
 *   onScan    – called with the decoded string (the SKU)
 */
const READER_ID = "scanner-viewport";

export default function ScannerModal({ open, onClose, onScan }) {
    const scannerRef = useRef(null);
    const mountedRef = useRef(true);
    const [error, setError] = useState("");
    const [scanning, setScanning] = useState(false);

    // Track mount state to avoid setState on unmounted component
    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    // Cleanup function — stops scanner and releases camera
    const cleanup = useCallback(async () => {
        const instance = scannerRef.current;
        if (!instance) return;

        try {
            // Check if actively scanning before stopping
            if (instance.isScanning) {
                await instance.stop();
            }
        } catch {
            // Already stopped
        }

        try {
            instance.clear();
        } catch {
            // Already cleared
        }

        scannerRef.current = null;
        if (mountedRef.current) {
            setScanning(false);
        }
    }, []);

    // Start scanner when modal opens
    useEffect(() => {
        if (!open) return;

        let cancelled = false;

        async function startScanner() {
            // Give DOM time to render the viewport div
            await new Promise((r) => setTimeout(r, 400));
            if (cancelled || !mountedRef.current) return;

            const el = document.getElementById(READER_ID);
            if (!el) {
                setError("Scanner viewport not found.");
                return;
            }

            // Ensure any leftover instance is cleaned up first
            await cleanup();

            try {
                const html5Qr = new Html5Qrcode(READER_ID, /* verbose= */ false);
                scannerRef.current = html5Qr;

                if (cancelled) {
                    html5Qr.clear();
                    return;
                }

                setError("");
                setScanning(false);

                await html5Qr.start(
                    { facingMode: "environment" },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                    },
                    (decodedText) => {
                        if (cancelled) return;
                        // Success — pass scanned SKU and close
                        onScan(decodedText.trim());
                        // Schedule cleanup AFTER the callback returns
                        setTimeout(() => cleanup(), 50);
                    },
                    () => {
                        // Ignore per-frame failures (no code visible)
                    }
                );

                if (mountedRef.current && !cancelled) {
                    setScanning(true);
                }
            } catch (err) {
                console.error("Scanner start error:", err);
                if (mountedRef.current && !cancelled) {
                    setError(
                        typeof err === "string"
                            ? err
                            : err?.message || "Camera access denied or unavailable."
                    );
                    setScanning(false);
                }
            }
        }

        startScanner();

        return () => {
            cancelled = true;
            cleanup();
        };
    }, [open, cleanup, onScan]);

    // Manual close handler
    function handleClose() {
        cleanup();
        onClose();
    }

    if (!open) return null;

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
                <div className="relative bg-black" style={{ minHeight: 300 }}>
                    <div id={READER_ID} style={{ width: "100%" }} />

                    {!scanning && !error && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                            <span className="w-8 h-8 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                            <span className="text-slate-400 text-sm">
                                Starting camera…
                            </span>
                        </div>
                    )}
                </div>

                {/* Error */}
                {error && (
                    <div className="px-5 py-3 bg-red-500/10 border-t border-red-500/30 text-red-300 text-xs">
                        ⚠️ {error}
                        <button
                            onClick={() => { setError(""); cleanup(); /* re-trigger by toggling open externally */ }}
                            className="ml-3 underline text-red-200 hover:text-white"
                        >
                            Retry
                        </button>
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
