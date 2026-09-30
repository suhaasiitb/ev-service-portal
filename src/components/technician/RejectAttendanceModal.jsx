import { useState, useEffect } from "react";

export default function RejectAttendanceModal({ open, onClose, onConfirm, record }) {
    const [reason, setReason] = useState("");

    useEffect(() => {
        if (open) setReason("");
    }, [open]);

    if (!open || !record) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!reason.trim()) {
            alert("Please provide a reason for disapproval.");
            return;
        }
        onConfirm(reason);
    };

    return (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex justify-center items-center z-[120] p-4">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="p-6 border-b border-gray-100 bg-red-50 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-red-800">Disapprove Request</h2>
                    <button onClick={onClose} className="text-red-400 hover:text-red-600">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            Reason for Disapproval <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g. Invalid selfie location, unauthorized check-in..."
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm h-32 resize-none"
                            required
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-100 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-8 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 shadow-lg shadow-red-500/30 transition-all"
                        >
                            Confirm Disapproval
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
