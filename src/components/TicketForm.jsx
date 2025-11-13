import { useState } from "react";

export default function TicketForm() {
  const [bikeNumber, setBikeNumber] = useState("");
  const [issue, setIssue] = useState("");
  const [location, setLocation] = useState("");
  const [contact, setContact] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      // Step 1: Build FormData to send to Edge Function
      const formData = new FormData();
      formData.append("bike_number_text", bikeNumber.trim());
      formData.append("issue_description", issue.trim());
      formData.append("location", location.trim());
      formData.append("contact", contact.trim());
      if (image) formData.append("image", image);

      // Step 2: Send request to Supabase Edge Function
      const response = await fetch(
        "https://qxubkvaahbfacabajjwo.functions.supabase.co/submit-ticket",
        {
          method: "POST",
          headers: {
            // only include Authorization header (do NOT set Content-Type manually for FormData)
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: formData,
        }
      );

      const result = await response.json();
      console.log("Edge Function Response:", result);

      if (!response.ok) {
        console.error("Edge Function Error:", result);
        throw new Error(result.error || result.message || "Failed to submit ticket");
      }

      // Step 3: Clear form after success
      setMessage("✅ Ticket logged successfully!");
      setBikeNumber("");
      setIssue("");
      setLocation("");
      setContact("");
      setImage(null);
    } catch (err) {
      console.error("Submission Error:", err);
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

        <textarea
          placeholder="Describe the issue"
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
