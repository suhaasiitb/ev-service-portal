import { useEffect, useState, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";

export default function TicketDashboard({ session }) {
  const [tickets, setTickets] = useState([]);
  const [walkins, setWalkins] = useState([]);

  const [parts, setParts] = useState([]);
  const [engineers, setEngineers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // -------------------------
  // Ticket Modal State
  // -------------------------
  const [showModal, setShowModal] = useState(false);
  const [activeTicket, setActiveTicket] = useState(null);
  const [partsUsed, setPartsUsed] = useState([{ part_id: "", quantity: 1 }]);
  const [selectedEngineer, setSelectedEngineer] = useState("");

  // -------------------------
  // Walk-In Modal State
  // -------------------------
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInBike, setWalkInBike] = useState("");
  const [walkInIssue, setWalkInIssue] = useState("");
  const [walkInCost, setWalkInCost] = useState(0);
  const [walkInParts, setWalkInParts] = useState([
    { part_id: "", quantity: 1 },
  ]);
  const [walkInEngineer, setWalkInEngineer] = useState("");

  // -------------------------
  // Fetch Tickets
  // -------------------------
  async function fetchTickets() {
    setLoading(true);

    const { data, error } = await supabase
      .from("tickets")
      .select(
        "id, bike_id, bike_number_text, station_id, closed_by, issue_description, status, reported_at, closed_at"
      )
      .order("reported_at", { ascending: false });

    if (error) setMessage("Error: " + error.message);
    else setTickets(data);

    setLoading(false);
  }

  // -------------------------
  // Fetch Walk-Ins
  // -------------------------
  async function fetchWalkins() {
    const { data, error } = await supabase
      .from("walkins")
      .select(
        "id, bike_id, bike_number_text, engineer_id, issue_description, cost_charged, logged_at, station_id"
      )
      .order("logged_at", { ascending: false });

    if (error) console.error(error);
    setWalkins(data || []);
  }

  useEffect(() => {
    fetchTickets();
    fetchWalkins();
  }, []);

  // -------------------------
  // Resolve Bike Model
  // -------------------------
  async function resolveModelId(ticketOrWalkIn) {
    if (ticketOrWalkIn.bike_id) {
      const { data: byId } = await supabase
        .from("bikes")
        .select("model_id")
        .eq("id", ticketOrWalkIn.bike_id)
        .maybeSingle();
      if (byId?.model_id) return byId.model_id;
    }

    if (ticketOrWalkIn.bike_number_text) {
      const { data: byNumber } = await supabase
        .from("bikes")
        .select("model_id")
        .eq("bike_number", ticketOrWalkIn.bike_number_text)
        .maybeSingle();
      if (byNumber?.model_id) return byNumber.model_id;
    }

    return null;
  }

  // -------------------------
  // Fetch Compatible Parts
  // -------------------------
  async function fetchCompatibleParts(obj) {
    const model_id = await resolveModelId(obj);

    if (!model_id) {
      const { data: all } = await supabase
        .from("parts_catalog")
        .select("id, part_name, sku");
      setParts(all || []);
      return;
    }

    const { data: mappings } = await supabase
      .from("part_model_map")
      .select("part_id")
      .eq("model_id", model_id);

    const partIds = mappings.map((m) => m.part_id);

    if (partIds.length === 0) {
      const { data: all } = await supabase
        .from("parts_catalog")
        .select("id, part_name, sku");
      setParts(all || []);
      return;
    }

    const { data: compatible } = await supabase
      .from("parts_catalog")
      .select("id, part_name, sku")
      .in("id", partIds);

    setParts(compatible || []);
  }

  // -------------------------
  // Fetch Engineers
  // -------------------------
  async function fetchEngineers(ticketOrStation) {
    const { data, error } = await supabase
      .from("engineers")
      .select("id, name , station_id")
      .eq("station_id", ticketOrStation.station_id);

    if (error) {
        setMessage("Failed to load Engineers");
        setEngineers([]);
    }else {
        setEngineers(data || []);
    }
  }

  // -------------------------
  // Open Ticket Modal
  // -------------------------
  function openModalForTicket(ticket) {
    setActiveTicket(ticket);
    setPartsUsed([{ part_id: "", quantity: 1 }]);
    setSelectedEngineer("");

    fetchCompatibleParts(ticket);
    fetchEngineers(ticket);

    setShowModal(true);
  }

  // -------------------------
  // Ticket Modal — Add/Remove Part Rows
  // -------------------------
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

  // -------------------------
  // Walk-In Modal — Add/Remove Part Rows
  // -------------------------
  function addWalkInPartRow() {
    setWalkInParts([...walkInParts, { part_id: "", quantity: 1 }]);
  }

  function removeWalkInPartRow(index) {
    setWalkInParts(walkInParts.filter((_, i) => i !== index));
  }

  function updateWalkInPartRow(index, field, value) {
    const updated = [...walkInParts];
    updated[index][field] = value;
    setWalkInParts(updated);
  }

  // -------------------------
  // Close Ticket With Parts
  // -------------------------
  async function handleCloseWithParts() {
    try {
      if (!selectedEngineer) {
        setMessage("❌ Please select the engineer.");
        return;
      }

      for (let p of partsUsed) {
        if (!p.part_id) continue;
        await supabase.from("ticket_parts").insert([
          {
            ticket_id: activeTicket.id,
            part_id: p.part_id,
            quantity: parseInt(p.quantity),
          },
        ]);
      }

      await supabase
        .from("tickets")
        .update({
          status: "closed",
          closed_at: new Date().toISOString(),
          closed_by: selectedEngineer,
        })
        .eq("id", activeTicket.id);

      setMessage("✅ Ticket closed and parts logged");
      setShowModal(false);
      fetchTickets();
    } catch (err) {
      setMessage("❌ Failed: " + err.message);
    }
  }

  // -------------------------
  // Submit Walk-In Job
  // -------------------------
  async function handleSubmitWalkIn() {
    try {
      setMessage("");

      if (!walkInBike || !walkInIssue || !walkInEngineer) {
        setMessage("❌ Please fill all required fields.");
        return;
      }

      // Lookup bike for bike_id + station_id + model_id
      let bike_id = null;
      let station_id = null;
      let model_id = null;

      const { data: bike , error: bikeErr } = await supabase
        .from("bikes")
        .select("id, station_id, model_id")
        .eq("bike_number", walkInBike.trim())
        .maybeSingle();
      
      if (bikeErr) {
        console.error("Bike lookup error:", bikeErr); 
      }

      if (bike) {
        bike_id = bike.id;
        station_id = bike.station_id;
        model_id = bike.model_id;
      } else {
        // Station is inferred from engineer
        const eng = engineers.find((e) => e.id === walkInEngineer);
        if (eng && eng.station_id){ 
            station_id = eng.station_id;
        }
      }

      if (!station_id) {
        setMessage("❌ Could not determine station for this walk-in.");
        return;
      }

      // 1. Insert into walkins
      const { data: insertedRows, error: wErr } = await supabase
        .from("walkins")
        .insert([
          {
            bike_id,
            bike_number_text: walkInBike,
            engineer_id: walkInEngineer,
            issue_description: walkInIssue,
            cost_charged: parseFloat(walkInCost || 0),
            station_id,
            model_id,
            logged_at: new Date().toISOString(),
          },
        ])
        .select();

      if (wErr) {
        console.error("Walk-in insert error:", wErr);
        throw wErr;
      }

      const walkinRow = insertedRows && insertedRows[0];
      if (!walkinRow || !walkinRow.id) {
        throw new Error("Walk-in insertion returned no ID");
      }

      // 2. Insert parts
      for (let p of walkInParts) {
        if (!p.part_id) continue;

        const{error:pErr} = await supabase.from("walkin_parts").insert([
           {
            walkin_id: walkinRow.id,
            part_id: p.part_id,
            quantity: parseInt(p.quantity),
           },
        ]);
        if (pErr) {
            console.error("Walk-in part insert error:", pErr);
            throw pErr;
        }
      }

      setMessage("✅ Walk-In job logged");
      setShowWalkInModal(false);
      fetchWalkins();
    } catch (err) {
      console.error("Walk-In flow error:", err);
      setMessage("❌ Failed: " + (err.message || "Unknown error"));
    }
  }

  // -------------------------
  // Metrics (Tickets + Walk-ins)
  // -------------------------
  const today = new Date().toISOString().split("T")[0];

  const walkInMetrics = useMemo(() => {
    const todayWalkIns = walkins.filter((w) => w.logged_at.startsWith(today));

    const weekWalkIns = walkins.filter((w) => {
      const d = new Date(w.logged_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return d >= weekAgo;
    });

    return {
      today: todayWalkIns.length,
      week: weekWalkIns.length,
    };
  }, [walkins]);

  const ticketMetrics = useMemo(() => {
    const todayTickets = tickets.filter((t) =>
      t.reported_at.startsWith(today)
    );

    const todayClosed = tickets.filter(
      (t) => t.closed_at && t.closed_at.startsWith(today)
    );

    const openNow = tickets.filter((t) => t.status === "open");

    const avgTAT =
      todayClosed.length > 0
        ? (
            todayClosed.reduce((sum, t) => {
              const start = new Date(t.reported_at);
              const end = new Date(t.closed_at);
              return sum + (end - start) / 60000;
            }, 0) / todayClosed.length
          ).toFixed(1)
        : 0;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const engMap = {};

    tickets.forEach((t) => {
      if (!t.closed_by || !t.closed_at) return;
      if (new Date(t.closed_at) < sevenDaysAgo) return;

      if (!engMap[t.closed_by]) engMap[t.closed_by] = 1;
      else engMap[t.closed_by]++;
    });

    return {
      totalToday: todayTickets.length,
      closedToday: todayClosed.length,
      openNow: openNow.length,
      avgTAT,
      engineerPerformance: engMap,
    };
  }, [tickets]);

  // ----------------------------
  // UI Rendering
  // ----------------------------
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-blue-600">
          Station Dashboard
        </h1>

        <button
          onClick={() => {
            setWalkInBike("");
            setWalkInIssue("");
            setWalkInCost(0);
            setWalkInParts([{ part_id: "", quantity: 1 }]);
            setWalkInEngineer("");
            setShowWalkInModal(true);

            // Preload engineers + parts (fetch from last ticket)
            if (tickets.length > 0) {
              fetchEngineers(tickets[0]);
              fetchCompatibleParts({ bike_number_text: "" });
            }
          }}
          className="bg-green-700 text-white px-4 py-2 rounded shadow"
        >
          + New Walk-In Job
        </button>
      </div>

      {message && <p className="mb-3 text-green-600">{message}</p>}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <div className="bg-white shadow rounded p-4">
          <p className="text-gray-600 text-sm">Tickets Today</p>
          <p className="text-2xl font-bold">{ticketMetrics.totalToday}</p>
        </div>
        <div className="bg-white shadow rounded p-4">
          <p className="text-gray-600 text-sm">Closed Today</p>
          <p className="text-2xl font-bold">{ticketMetrics.closedToday}</p>
        </div>
        <div className="bg-white shadow rounded p-4">
          <p className="text-gray-600 text-sm">Open Tickets</p>
          <p className="text-2xl font-bold">{ticketMetrics.openNow}</p>
        </div>
        <div className="bg-white shadow rounded p-4">
          <p className="text-gray-600 text-sm">Avg TAT (mins)</p>
          <p className="text-2xl font-bold">{ticketMetrics.avgTAT}</p>
        </div>

        <div className="bg-white shadow rounded p-4">
          <p className="text-gray-600 text-sm">Walk-Ins Today</p>
          <p className="text-2xl font-bold">{walkInMetrics.today}</p>
        </div>

        <div className="bg-white shadow rounded p-4">
          <p className="text-gray-600 text-sm">Walk-Ins (7 Days)</p>
          <p className="text-2xl font-bold">{walkInMetrics.week}</p>
        </div>
      </div>

      {/* ENGINEER PERFORMANCE */}
      <h2 className="text-xl font-bold mb-2">
        Engineer Performance (Last 7 Days)
      </h2>

      <table className="w-full border mb-6">
        <thead>
          <tr className="bg-gray-200 text-left">
            <th className="p-2">Engineer</th>
            <th className="p-2">Tickets Closed</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(ticketMetrics.engineerPerformance).map(
            ([engId, count]) => {
              const eng = engineers.find((e) => e.id === engId);
              return (
                <tr key={engId} className="border-b">
                  <td className="p-2">{eng ? eng.name : "Unknown"}</td>
                  <td className="p-2">{count}</td>
                </tr>
              );
            }
          )}
        </tbody>
      </table>

      {/* TICKET TABLE */}
      <h2 className="text-xl font-bold mb-2">Tickets</h2>

      {loading ? (
        <p>Loading tickets...</p>
      ) : (
        <table className="w-full border mb-6">
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
                <td className="p-2">
                  {new Date(t.reported_at).toLocaleString()}
                </td>
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

      {/* WALK-IN TABLE */}
      <h2 className="text-xl font-bold mb-2">Walk-In Services</h2>

      <table className="w-full border mb-6">
        <thead>
          <tr className="bg-gray-200 text-left">
            <th className="p-2">Bike</th>
            <th className="p-2">Issue</th>
            <th className="p-2">Engineer</th>
            <th className="p-2">Logged</th>
            <th className="p-2">Cost</th>
          </tr>
        </thead>

        <tbody>
          {walkins.map((w) => {
            const eng = engineers.find((e) => e.id === w.engineer_id);
            return (
              <tr key={w.id} className="border-b">
                <td className="p-2">{w.bike_number_text}</td>
                <td className="p-2">{w.issue_description}</td>
                <td className="p-2">{eng ? eng.name : "Unknown"}</td>
                <td className="p-2">
                  {new Date(w.logged_at).toLocaleString()}
                </td>
                <td className="p-2">{w.cost_charged}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ---------------------------------- */}
      {/* TICKET CLOSE MODAL */}
      {/* ---------------------------------- */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center">
          <div className="bg-white p-6 rounded-xl w-full max-w-lg shadow-xl">
            <h2 className="text-xl font-bold mb-4">
              Close Ticket & Log Parts
            </h2>

            {/* Engineer */}
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

            {/* Parts */}
            {partsUsed.map((row, index) => (
              <div key={index} className="flex gap-2 mb-3">
                <select
                  className="border p-2 flex-1 rounded"
                  value={row.part_id}
                  onChange={(e) =>
                    updatePartRow(index, "part_id", e.target.value)
                  }
                >
                  <option value="">Select part</option>
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
                  onChange={(e) =>
                    updatePartRow(index, "quantity", e.target.value)
                  }
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

      {/* ---------------------------------- */}
      {/* WALK-IN MODAL */}
      {/* ---------------------------------- */}
      {showWalkInModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center">
          <div className="bg-white p-6 rounded-xl w-full max-w-lg shadow-xl">
            <h2 className="text-xl font-bold mb-4">New Walk-In Job</h2>

            <label className="block mb-2 font-semibold">Bike Number</label>
            <input
              className="border p-2 rounded w-full mb-4"
              value={walkInBike}
              onChange={(e) => setWalkInBike(e.target.value)}
              placeholder="TN12AB3456"
            />

            <label className="block mb-2 font-semibold">Issue</label>
            <textarea
              className="border p-2 rounded w-full mb-4"
              value={walkInIssue}
              onChange={(e) => setWalkInIssue(e.target.value)}
              placeholder="Describe issue"
            />

            <label className="block mb-2 font-semibold">Cost Charged</label>
            <input
              type="number"
              className="border p-2 rounded w-full mb-4"
              value={walkInCost}
              onChange={(e) => setWalkInCost(e.target.value)}
            />

            <label className="block mb-2 font-semibold">Engineer</label>
            <select
              className="border p-2 rounded w-full mb-4"
              value={walkInEngineer}
              onChange={(e) => setWalkInEngineer(e.target.value)}
            >
              <option value="">Select Engineer</option>
              {engineers.map((eng) => (
                <option key={eng.id} value={eng.id}>
                  {eng.name}
                </option>
              ))}
            </select>

            {/* Walk-In Parts */}
            {walkInParts.map((row, index) => (
              <div key={index} className="flex gap-2 mb-3">
                <select
                  className="border p-2 flex-1 rounded"
                  value={row.part_id}
                  onChange={(e) =>
                    updateWalkInPartRow(index, "part_id", e.target.value)
                  }
                >
                  <option value="">Select part</option>
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
                  onChange={(e) =>
                    updateWalkInPartRow(index, "quantity", e.target.value)
                  }
                />

                {index > 0 && (
                  <button
                    className="text-red-600 font-bold"
                    onClick={() => removeWalkInPartRow(index)}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            <button
              className="text-blue-600 underline mb-4"
              onClick={addWalkInPartRow}
            >
              + Add Another Part
            </button>

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowWalkInModal(false)}
                className="px-4 py-2 rounded bg-gray-300"
              >
                Cancel
              </button>

              <button
                onClick={handleSubmitWalkIn}
                className="px-4 py-2 rounded bg-green-600 text-white"
              >
                Submit Walk-In
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
