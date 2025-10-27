import { useState } from "react";

export default function App() {
  const [form, setForm] = useState({
    bike_no: "",
    raised_by_name: "",
    raised_by_contact: "",
    issue_summary: "",
    issue_details: "",
    location_address: "",
  });
  const [image, setImage] = useState(null);
  const [message, setMessage] = useState("");
  const API_URL =
    "https://script.google.com/macros/s/AKfycbxkIHrKrHvnlcJyNELLPTVl4XD1jecqRnkjEog9jyF9Ngvb60pxq8aTlT5C7eJY60tM4w/exec";

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // limit size ~2.5MB for reliability
    if (file.size > 2.5 * 1024 * 1024) {
      setMessage("Image too large (max ~2.5MB). Please compress then upload.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result);
    reader.readAsDataURL(file);
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  setMessage("Submitting...");
  try {
    // We will send as FormData so the browser does NOT send a CORS preflight OPTIONS.
    // Apps Script will read these values via e.parameter.
    const formData = new FormData();
    formData.append('route', 'createTicket');
    formData.append('bike_no', form.bike_no);
    formData.append('raised_by_name', form.raised_by_name);
    formData.append('raised_by_contact', form.raised_by_contact);
    formData.append('issue_summary', form.issue_summary);
    formData.append('issue_details', form.issue_details);
    formData.append('location_address', form.location_address);

    // If you have the File object, you could send the file directly:
    // formData.append('image_file', file); 
    // But Apps Script expects base64, so we append the base64 string if available.
    if (image) {
      // image currently holds data URL like "data:image/png;base64,...."
      formData.append('image_base64', image);
    }

    const res = await fetch(API_URL, {
      method: "POST",
      // IMPORTANT: do NOT set the 'Content-Type' header manually.
      // Let the browser set multipart/form-data with boundary.
      body: formData,
      // mode: 'cors' is default for same-origin; keep default.
    });

    const json = await res.json();
    if (json.ok && json.data && json.data.ticket_id) {
      setMessage("✅ Ticket submitted: " + json.data.ticket_id);
      setForm({
        bike_no: "",
        raised_by_name: "",
        raised_by_contact: "",
        issue_summary: "",
        issue_details: "",
        location_address: "",
      });
      setImage(null);
    } else {
      setMessage("❌ Failed: " + (json.error || JSON.stringify(json)));
    }
  } catch (err) {
    setMessage("⚠️ Error: " + err.message);
  }
};


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-xl p-8 rounded-2xl w-full max-w-lg space-y-4"
      >
        <h1 className="text-2xl font-bold text-center text-green-700">
          EV Service Ticket Portal
        </h1>

        {[
          ["bike_no", "Bike Number"],
          ["raised_by_name", "Your Name"],
          ["raised_by_contact", "Contact Number"],
          ["location_address", "Location Address"],
          ["issue_summary", "Issue Summary"],
          ["issue_details", "Issue Details"],
        ].map(([key, label]) => (
          <div key={key}>
            <label className="block text-sm font-semibold mb-1">{label}</label>
            {key === "issue_details" ? (
              <textarea
                name={key}
                value={form[key]}
                onChange={handleChange}
                className="w-full border rounded p-2"
                required
              />
            ) : (
              <input
                type="text"
                name={key}
                value={form[key]}
                onChange={handleChange}
                className="w-full border rounded p-2"
                required
              />
            )}
          </div>
        ))}

        <div>
          <label className="block text-sm font-semibold mb-1">
            Upload Image (optional)
          </label>
          <input type="file" accept="image/*" onChange={handleImage} />
        </div>

        <button
          type="submit"
          className="w-full bg-green-700 hover:bg-green-800 text-white py-2 rounded-lg font-semibold"
        >
          Submit Ticket
        </button>

        {message && (
          <p className="text-center text-sm font-medium text-gray-700">
            {message}
          </p>
        )}
      </form>
    </div>
  );
}
