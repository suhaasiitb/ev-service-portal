import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function CreateRiderModal({ open, onClose, onSuccess, stations }) {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        aadhar_no: "",
        bank_account_no: "",
        ifsc_code: "",
        station_id: "",
    });

    const [aadharError, setAadharError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [validating, setValidating] = useState(false);
    const [message, setMessage] = useState("");

    if (!open) return null;

    async function handleVerifyAadhar() {
        if (!formData.aadhar_no || formData.aadhar_no.length !== 12) {
            setAadharError("Aadhar number must be 12 digits");
            return;
        }

        setValidating(true);
        setAadharError("");

        try {
            const { data, error } = await supabase
                .from("riders")
                .select("id")
                .eq("aadhar_no", formData.aadhar_no)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                setAadharError("❌ Rider already exists with given Aadhar No");
                return;
            }

            // No match found, proceed to step 2
            setStep(2);
        } catch (err) {
            console.error("Aadhar validation error:", err);
            setAadharError("Error validating Aadhar number");
        } finally {
            setValidating(false);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setMessage("");
        setSubmitting(true);

        try {
            const { error } = await supabase.from("riders").insert({
                name: formData.name,
                phone: formData.phone,
                aadhar_no: formData.aadhar_no,
                bank_account_no: formData.bank_account_no,
                ifsc_code: formData.ifsc_code,
                station_id: formData.station_id,
            });

            if (error) throw error;

            setMessage("✅ Rider created successfully!");
            setTimeout(() => {
                onSuccess();
                handleClose();
            }, 1000);
        } catch (err) {
            console.error("Error creating rider:", err);
            setMessage("❌ Failed to create rider: " + err.message);
        } finally {
            setSubmitting(false);
        }
    }

    function handleClose() {
        setFormData({
            name: "",
            phone: "",
            aadhar_no: "",
            bank_account_no: "",
            ifsc_code: "",
            station_id: "",
        });
        setAadharError("");
        setMessage("");
        setStep(1);
        onClose();
    }

    return (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex justify-center items-center z-[100]">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl transform transition-all animate-in fade-in zoom-in duration-300">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900 border-b-2 border-blue-500 pb-1">
                        {step === 1 ? "Verify Aadhar" : "Complete Registration"}
                    </h2>
                    {step === 2 && (
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-bold">
                            Step 2 of 2
                        </span>
                    )}
                </div>

                {step === 1 ? (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                            Enter the 12-digit Aadhar number to check for existing registrations.
                        </p>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                Aadhar Number *
                            </label>
                            <input
                                type="text"
                                maxLength={12}
                                value={formData.aadhar_no}
                                onChange={(e) =>
                                    setFormData({ ...formData, aadhar_no: e.target.value.replace(/\D/g, '') })
                                }
                                placeholder="0000 0000 0000"
                                className={`w-full border rounded-xl px-4 py-3 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${aadharError ? "border-red-500 bg-red-50" : "border-gray-300 bg-gray-50"
                                    }`}
                            />
                            {aadharError && (
                                <p className="text-red-600 text-sm mt-2 font-medium flex items-center gap-1">
                                    {aadharError}
                                </p>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleVerifyAadhar}
                                disabled={validating || formData.aadhar_no.length !== 12}
                                className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 flex items-center gap-2"
                            >
                                {validating ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                        Checking...
                                    </>
                                ) : "Verify & Proceed"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl mb-2 flex justify-between items-center">
                            <div>
                                <p className="text-[10px] uppercase font-bold text-blue-500">Aadhar Verified</p>
                                <p className="text-blue-900 font-mono text-sm">{formData.aadhar_no}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="text-blue-600 text-xs font-bold hover:underline"
                            >
                                Change
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Full Name *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    required
                                    placeholder="Enter full name"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Phone Number *
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    required
                                    placeholder="Enter phone number"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                        Bank Account
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.bank_account_no}
                                        onChange={(e) =>
                                            setFormData({ ...formData, bank_account_no: e.target.value })
                                        }
                                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                                        placeholder="Acc No."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                        IFSC Code
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.ifsc_code}
                                        onChange={(e) =>
                                            setFormData({ ...formData, ifsc_code: e.target.value })
                                        }
                                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm uppercase"
                                        placeholder="IFSC"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Station *
                                </label>
                                <select
                                    value={formData.station_id}
                                    onChange={(e) =>
                                        setFormData({ ...formData, station_id: e.target.value })
                                    }
                                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    required
                                >
                                    <option value="">Select Station</option>
                                    {stations.map((station) => (
                                        <option key={station.id} value={station.id}>
                                            {station.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {message && (
                            <div
                                className={`text-sm p-3 rounded-xl font-medium border ${message.startsWith("✅")
                                    ? "bg-green-50 text-green-700 border-green-100"
                                    : "bg-red-50 text-red-700 border-red-100"
                                    }`}
                            >
                                {message}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-500 disabled:opacity-50 shadow-lg shadow-blue-500/30 flex items-center gap-2"
                            >
                                {submitting ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                        Saving...
                                    </>
                                ) : "Register Rider"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
