import { useState } from "react";

const API_URL =
  "https://script.google.com/macros/s/AKfycbxkIHrKrHvnlcJyNELLPTVl4XD1jecqRnkjEog9jyF9Ngvb60pxq8aTlT5C7eJY60tM4w/exec";

const ISSUE_OPTIONS = [
  "Breaking Issue",
  "Slow speed",
  "Horn not working",
  "Fiber broken",
  "Others",
];

export default function App() {
  const [form, setForm] = useState({
    bike_no: "",
    raised_by_name: "",
    raised_by_contact: "",
    issue_summary: ISSUE_OPTIONS[0],
    issue_details: "",
    location_address: "",
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) =>
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2.5 * 1024 * 1024) {
      setMessage("⚠️ Image too large (max 2.5MB). Please compress and retry.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result); // data URL
      setImagePreview(reader.result);
      setMessage("");
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!form.bike_no || !form.issue_summary) {
      setMessage("⚠️ Please enter Bike No and Issue Summary.");
      return;
    }

    setSubmitting(true);
    setMessage("Submitting ticket...");

    try {
      // Build a FormData object (no Content-Type header => browser sets multipart/form-data)
      const fd = new FormData();
      fd.append("route", "createTicket");
      fd.append("bike_no", form.bike_no);
      fd.append("raised_by_name", form.raised_by_name || "");
      fd.append("raised_by_contact", form.raised_by_contact || "");
      fd.append("issue_summary", form.issue_summary);
      fd.append("issue_details", form.issue_details || "");
      fd.append("location_address", form.location_address || "");
      // if you have lat/lng in future: fd.append("location_lat", lat)
      // Append base64 image text as a normal field (Apps Script will receive it)
      if (image) {
        fd.append("image_base64", image);
      }

      // NOTE: do NOT set 'Content-Type' header here — letting the browser set multipart/form-data
      const res = await fetch(API_URL, {
        method: "POST",
        body: fd,
        // mode:'cors' is okay but not necessary; leaving it default avoids issues
      });

      // If the request failed at HTTP level
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server responded ${res.status}: ${text}`);
      }

      // Parse response (Apps Script returns JSON)
      const json = await res.json();

      if (json.ok && json.data?.ticket_id) {
        setMessage(`✅ Ticket submitted successfully: ${json.data.ticket_id}`);
        setForm({
          bike_no: "",
          raised_by_name: "",
          raised_by_contact: "",
          issue_summary: ISSUE_OPTIONS[0],
          issue_details: "",
          location_address: "",
        });
        removeImage();
      } else {
        setMessage("❌ Submit failed: " + (json.error || json.message || "No valid response"));
      }
    } catch (err) {
      // network or server error (or parsing)
      setMessage(`⚠️ Network or server error: ${err.message}`);
      console.error("Ticket submission error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-gradient-to-br from-gray-100 via-white to-gray-200">
      <div className="w-full max-w-3xl">
        <div className="rounded-2xl bg-white shadow-xl p-8 border border-gray-100">
          <h2 className="text-3xl font-semibold text-gray-800 mb-2 text-center">
            Raise a Service Ticket
          </h2>
          <p className="text-center text-gray-500 mb-6 text-sm">
            Enter bike details and describe the problem below.
          </p>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-600">
                Bike Number
              </label>
              <input
                name="bike_no"
                value={form.bike_no}
                onChange={handleChange}
                className="input mt-2 w-full rounded-lg border border-gray-200 p-3 bg-white shadow-sm"
                placeholder="e.g. MH12YE4479"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600">
                Your Name
              </label>
              <input
                name="raised_by_name"
                value={form.raised_by_name}
                onChange={handleChange}
                className="input mt-2 w-full rounded-lg border border-gray-200 p-3 bg-white shadow-sm"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600">
                Contact Number
              </label>
              <input
                name="raised_by_contact"
                value={form.raised_by_contact}
                onChange={handleChange}
                className="input mt-2 w-full rounded-lg border border-gray-200 p-3 bg-white shadow-sm"
                placeholder="+91xxxxxxxxxx"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600">
                Location
              </label>
              <input
                name="location_address"
                value={form.location_address}
                onChange={handleChange}
                className="input mt-2 w-full rounded-lg border border-gray-200 p-3 bg-white shadow-sm"
                placeholder="Pickup location or station"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-600">
                Issue Summary
              </label>
              <select
                name="issue_summary"
                value={form.issue_summary}
                onChange={handleChange}
                className="select mt-2 w-full rounded-lg border border-gray-200 p-3 bg-white shadow-sm"
              >
                {ISSUE_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-600">
                Issue Details
              </label>
              <textarea
                name="issue_details"
                value={form.issue_details}
                onChange={handleChange}
                className="textarea mt-2 w-full min-h-[120px] rounded-lg border border-gray-200 p-3 bg-white shadow-sm"
                placeholder="Describe the problem in detail..."
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-4">
              <input
                id="fileInput"
                type="file"
                accept="image/*,video/*"
                onChange={handleFile}
                className="hidden"
              />
              <label
                htmlFor="fileInput"
                className="file-button inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 shadow-sm cursor-pointer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-600"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V7.414A2 2 0 0017.414 6L14 2.586A2 2 0 0012.586 2H4z" />
                </svg>
                <span className="text-sm text-gray-700">Choose file</span>
              </label>

              {imagePreview ? (
                <div className="flex items-center gap-3">
                  <img
                    src={imagePreview}
                    alt="preview"
                    className="h-16 w-16 object-cover rounded-md border"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="text-sm text-red-500 underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  Optional: upload image or short video (&lt;2.5MB)
                </div>
              )}
            </div>

            <div className="md:col-span-2 mt-4">
              <h4 className="text-sm font-semibold text-gray-800">Quick Tips</h4>
              <ul className="mt-2 text-sm text-gray-600 list-disc pl-5 space-y-1">
                <li>Use a clear photo showing the issue.</li>
                <li>Include contact number so engineer can reach out.</li>
                <li>Add brief details for faster resolution (sounds, speed drop).</li>
              </ul>
            </div>

            <div className="md:col-span-2 mt-8 flex justify-center">
              <div className="w-full max-w-xs">
                <button
                  type="submit"
                  disabled={submitting}
                  className="submit-btn w-full py-3 rounded-lg text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-md font-semibold transition-all duration-200"
                >
                  {submitting ? "Submitting..." : "Submit Ticket"}
                </button>
              </div>
            </div>

            <div className="md:col-span-2 mt-4 text-center">
              <div
                className={`text-sm ${
                  message.startsWith("✅")
                    ? "text-green-600 font-medium"
                    : message.startsWith("⚠️")
                    ? "text-yellow-600 font-medium"
                    : message.startsWith("❌")
                    ? "text-red-600 font-medium"
                    : "text-gray-700"
                }`}
              >
                {message}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
