import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function TicketDashboard({ session }) {
  const [tickets, setTickets] = useState([]);
  const [parts, setParts] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [activeTicket, setActiveTicket] = useState(null);
  const [partsUsed, setPartsUsed] = useState([{ part_id: "", quantity: 1 }]);
  const [selectedEngineer, setSelectedEngineer] = useState("");

  async function fetchTickets() {
    setLoading(true);
    const { data, error } = await supabase
      .from("tickets")
      .select("id, bike_id, bike_number_text, station_id, issue_description, status, reported_at, closed_at")
      .order("reported_at", { ascending: false });

    if (error) setMessage("Error: " + error.message);
    else setTickets(data);

    setLoading(false);
  }

  useEffect(() => { fetchTickets(); }, []);

  // Resolve the bike model using Option C logic
  async function resolveModelId(ticket) {
    if (ticket.bike_id) {
      const { data: byId } = await supabase
        .from("bikes")
        .select("model_id")
        .eq("id", ticket.bike_id)
        .maybeSingle();
      if (byId?.model_id) return byId.model_id;
    }

    if (ticket.bike_number_text) {
      const { data: byNumber } = await supabase
        .from("bikes")
        .select("model_id")
        .eq("bike_number", ticket.bike_number_text)
        .maybeSingle();
      if (byNumber?.model_id) return byNumber.model_id;
    }

    return null;
  }

  // Fetch compatible parts using model_id
  async function fetchCompatibleParts(ticket) {
    const model_id = await resolveModelId(ticket);

    if (!model_id) {
      setMessage("⚠ Could not determine bike model. Showing all parts.");
      const { data: all } = await supabase.from("parts_catalog").select("id, part_name, sku");
      setParts(all || []);
      return;
    }

    const { data: mappings, error: mapErr } = await supabase
      .from("part_model_map")
      .select("part_id")
      .eq("model_id", model_id);

    if (mapErr) {
      setMessage("⚠ Failed to fetch model-map parts. Showing all parts.");
      const { data: all } = await supabase.from("parts_catalog").select("id, part_name, sku");
      setParts(all || []);
      return;
    }

    const partIds = mappings.map(m => m.part_id);

    if (partIds.length === 0) {
      setMessage("⚠ No parts mapped to this bike model. Showing all parts.");
      const { data: all } = await supabase.from("parts_catalog").select("id, part_name, sku");
      setParts(all || []);
      return;
    }

    const { data: compatible, error: partErr } = await supabase
      .from("parts_catalog")
      .select("id, part_name, sku")
      .in("id", partIds);

    if (partErr) {
      setMessage("⚠ Failed to load compatible parts.");
      setParts([]);
      return;
    }

    setParts(compatible);
  }

  // Fetch engineers for this ticket's station
  async function fetchEngineers(ticket) {
    const { data, error } = await supabase
      .from("engineers")
      .select("id, name")
      .eq("station_id", ticket.station_id);

    if (error) {
      setMessage("⚠ Failed to load engineers");
      setEngineers([]);
    } else {
      setEngineers(data || []);
    }
  }

  function openModalForTicket(ticket) {
    setActiveTicket(ticket);
    setPartsUsed([{ part_id: "", quantity: 1 }]);
    setSelectedEngineer("");

    fetchCompatibleParts(ticket);
    fetchEngineers(ticket);

    setShowModal(true);
  }

  // Add part row
  function addPartRow() {
    setPartsUsed([...partsUsed, { part_id: "", quantity: 1 }]);
  }

  function removePartRow(index) {
    setPartsUsed(partsUsed.filter((_, i) => i !== index));
  }

  function updatePartRow(index, field, value) {
    const updated = [...partsUsed];
    updated[index][field] = value;
    setPartsUsed(updated);
  }

  // Close ticket and log parts + engineer
  async function handleCloseWithParts() {
    try {
      if (!selectedEngineer) {
        setMessage("❌ Please select the engineer who serviced this ticket.");
        return;
      }

      setMessage("");

      // Insert parts
      for (let p of partsUsed) {
        if (!p.part_id) continue;

        const { error } = await supabase.from("ticket_parts").insert([
          {
            ticket_id: activeTicket.id,
            part_id: p.part_id,
            quantity: parseInt(p.quantity)
          }
        ]);

        if (error) throw error;
      }

      // Close ticket with engineer id
      const { error: closeErr } = await supabase
        .from("tickets")
        .update({
          status: "closed",
          closed_at: new Date().toISOString(),
          closed_by: selectedEngineer
        })
        .eq("id", activeTicket.id);

      if (closeErr) throw closeErr;

      setMessage("✅ Ticket closed and parts logged");
      setShowModal(false);
      fetchTickets();

    } catch (err) {
      setMessage("❌ Failed: " + err.message);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold text-blue-600 mb-4">Station Dashboard</h1>

      {message && <p className="mb-3 text-green-600">{message}</p>}

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
                      onClick={() => openModalForTicket(t)}
                      className="bg-blue-600 text-white px-3 py-1 rounded"
                    >
                      Close with Parts
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center">
          <div className="bg-white p-6 rounded-xl w-full max-w-lg shadow-xl">
            <h2 className="text-xl font-bold mb-4">Close Ticket & Log Parts</h2>

            {/* Engineer Selection */}
            <label className="block mb-2 font-semibold">Engineer</label>
            <select
              className="border p-2 rounded w-full mb-4"
              value={selectedEngineer}
              onChange={(e) => setSelectedEngineer(e.target.value)}
            >
              <option value="">Select Engineer</option>
              {engineers.map((eng) => (
                <option key={eng.id} value={eng.id}>
                  {eng.name}
                </option>
              ))}
            </select>

            {/* Parts Section */}
            {partsUsed.map((row, index) => (
              <div key={index} className="flex gap-2 mb-3">
                <select
                  className="border p-2 flex-1 rounded"
                  value={row.part_id}
                  onChange={(e) => updatePartRow(index, "part_id", e.target.value)}
                >
                  <option value="">Select compatible part</option>
                  {parts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.part_name} ({p.sku})
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min="1"
                  className="border p-2 w-20 rounded"
                  value={row.quantity}
                  onChange={(e) => updatePartRow(index, "quantity", e.target.value)}
                />

                {index > 0 && (
                  <button
                    className="text-red-600 font-bold"
                    onClick={() => removePartRow(index)}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            <button
              className="text-blue-600 underline mb-4"
              onClick={addPartRow}
            >
              + Add Another Part
            </button>

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleCloseWithParts}
                className="px-4 py-2 rounded bg-green-600 text-white"
              >
                Close Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
