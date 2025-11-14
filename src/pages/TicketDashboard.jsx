import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function TicketDashboard({ session }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function fetchTickets() {
    setLoading(true);
    const { data, error } = await supabase
      .from("tickets")
      .select("id, bike_number_text, issue_description, status, reported_at, closed_at")
      .order("reported_at", { ascending: false });

    if (error) setMessage("Error: " + error.message);
    else setTickets(data);
    setLoading(false);
  }

  useEffect(() => { fetchTickets(); }, []);

  async function closeTicket(id) {
    const { error } = await supabase
      .from("tickets")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("id", id);

    if (error) setMessage("Failed: " + error.message);
    else {
      setMessage("✅ Ticket closed");
      fetchTickets();
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold text-blue-600 mb-4">Station Dashboard</h1>
      {message && <p className="mb-2 text-green-600">{message}</p>}
      {loading ? (
        <p>Loading tickets...</p>
      ) : (
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-200 text-left">
              <th className="p-2">Bike</th>
              <th className="p-2">Issue</th>
              <th className="p-2">Status</th>
              <th className="p-2">Reported</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id} className="border-b">
                <td className="p-2">{t.bike_number_text}</td>
                <td className="p-2">{t.issue_description}</td>
                <td className="p-2">{t.status}</td>
                <td className="p-2">{new Date(t.reported_at).toLocaleString()}</td>
                <td className="p-2">
                  {t.status === "open" ? (
                    <button
                      onClick={() => closeTicket(t.id)}
                      className="bg-green-600 text-white px-3 py-1 rounded"
                    >
                      Close
                    </button>
                  ) : (
                    <span className="text-gray-500">Closed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
