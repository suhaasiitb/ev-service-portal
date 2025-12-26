import { useState } from "react";

export default function TicketForm() {
  const [bikeNumber, setBikeNumber] = useState("");
  const [issue, setIssue] = useState("");
  const [location, setLocation] = useState("");
  const [contact, setContact] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const issuePresets = [
    "Bike not working / Stopped",
    "Throttle / Motor symbol",
  ];

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("bike_number_text", bikeNumber.trim());
      formData.append("issue_description", issue.trim());
      formData.append("location", location.trim());
      formData.append("contact", contact.trim());
      if (image) formData.append("image", image);

      const response = await fetch(
        "https://qxubkvaahbfacabajjwo.functions.supabase.co/submit-ticket",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit ticket");
      }

      setMessage("✅ Ticket logged successfully!");
      setBikeNumber("");
      setIssue("");
      setLocation("");
      setContact("");
      setImage(null);
    } catch (err) {
      setMessage("❌ Failed: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto bg-white shadow-lg rounded-2xl p-6 mt-10">
      <h2 className="text-2xl font-bold text-blue-600 mb-4">
        Raise a Service Ticket
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Bike Number"
          value={bikeNumber}
          onChange={(e) => setBikeNumber(e.target.value)}
          required
          className="w-full border p-2 rounded-lg"
        />

        {/* Quick Issue Buttons */}
        <div>
          <p className="text-sm font-medium text-gray-600 mb-2">
            Select issue (optional)
          </p>
          <div className="flex gap-2 flex-wrap">
            {issuePresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setIssue(preset)}
                className="px-3 py-1 text-sm rounded-full border bg-gray-100 hover:bg-blue-100"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Issue Textarea */}
        <textarea
          placeholder="Describe the issue in detail"
          value={issue}
          onChange={(e) => setIssue(e.target.value)}
          required
          className="w-full border p-2 rounded-lg"
        />

        <input
          type="text"
          placeholder="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full border p-2 rounded-lg"
        />

        <input
          type="text"
          placeholder="Contact Number"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          className="w-full border p-2 rounded-lg"
        />

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImage(e.target.files[0])}
          className="w-full"
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 w-full"
        >
          {loading ? "Submitting..." : "Submit Ticket"}
        </button>

        {message && (
          <p
            className={`text-center font-medium mt-3 ${
              message.startsWith("✅") ? "text-green-600" : "text-red-600"
            }`}
          >
            {message}
          </p>
        )}
      </form>
    </div>
  );
}
