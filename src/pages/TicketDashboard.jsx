import { useEffect, useState, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";

const TICKET_PAGE_SIZE = 15;
const WALKIN_PAGE_SIZE = 15;

export default function TicketDashboard({ session }) {
  const [tickets, setTickets] = useState([]);
  const [walkins, setWalkins] = useState([]);

  const [parts, setParts] = useState([]);
  const [engineers, setEngineers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // Pagination
  const [ticketPage, setTicketPage] = useState(1);
  const [walkinPage, setWalkinPage] = useState(1);

  // Date filters
  const [ticketDateFilter, setTicketDateFilter] = useState("");
  const [walkinDateFilter, setWalkinDateFilter] = useState("");

  // Active tab: "tickets" | "walkins"
  const [activeTab, setActiveTab] = useState("tickets");

  // Status sort toggle: false = default (newest first), true = open first (oldest open first)
  const [openFirst, setOpenFirst] = useState(false);

  // -------------------------
  // Ticket Modal State
  // -------------------------
  const [showModal, setShowModal] = useState(false);
  const [activeTicket, setActiveTicket] = useState(null);
  const [partsUsed, setPartsUsed] = useState([{ part_id: "", quantity: 1 }]);
  const [selectedEngineer, setSelectedEngineer] = useState("");
  const [ticketCost, setTicketCost] = useState(0); // cost for ticket

  // -------------------------
  // Walk-In Modal State
  // -------------------------
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInBike, setWalkInBike] = useState("");
  const [walkInIssue, setWalkInIssue] = useState("");
  const [WalkInCost, setWalkInCost] = useState(0);
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
        `
        id,
        bike_id,
        bike_number_text,
        station_id,
        closed_by,
        issue_description,
        status,
        reported_at,
        closed_at,
        cost_charged,
        engineers:closed_by ( id, name )
      `
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

  async function fetchAllEngineers() {
    const { data, error } = await supabase
      .from("engineers")
      .select("id, name, station_id");

    if (!error) setEngineers(data || []);
  }

  useEffect(() => {
    fetchTickets();
    fetchWalkins();
    fetchAllEngineers();
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
  // Fetch Engineers (by station)
  // -------------------------
  async function fetchEngineers(ticketOrStation) {
    const { data, error } = await supabase
      .from("engineers")
      .select("id, name , station_id")
      .eq("station_id", ticketOrStation.station_id);

    if (error) {
      setMessage("Failed to load Engineers");
      setEngineers([]);
    } else {
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
    setTicketCost(ticket.cost_charged ?? 0);

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
  // Close Ticket With Parts + Cost
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
            quantity: parseInt(p.quantity, 10),
          },
        ]);
      }

      await supabase
        .from("tickets")
        .update({
          status: "closed",
          closed_at: new Date().toISOString(),
          closed_by: selectedEngineer,
          cost_charged: parseFloat(ticketCost || 0),
        })
        .eq("id", activeTicket.id);

      setMessage("✅ Ticket closed, parts & cost logged");
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

      if (!walkInBike || !WalkInCost || !walkInEngineer || !walkInIssue) {
        setMessage("❌ Please fill all required fields.");
        return;
      }

      let bike_id = null;
      let station_id = null;
      let model_id = null;

      const { data: bike, error: bikeErr } = await supabase
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
        const eng = engineers.find((e) => e.id === walkInEngineer);
        if (eng && eng.station_id) {
          station_id = eng.station_id;
        }
      }

      if (!station_id) {
        setMessage("❌ Could not determine station for this walk-in.");
        return;
      }

      const { data: insertedRows, error: wErr } = await supabase
        .from("walkins")
        .insert([
          {
            bike_id,
            bike_number_text: walkInBike,
            engineer_id: walkInEngineer,
            issue_description: walkInIssue,
            cost_charged: parseFloat(WalkInCost || 0),
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

      for (let p of walkInParts) {
        if (!p.part_id) continue;

        const { error: pErr } = await supabase.from("walkin_parts").insert([
          {
            walkin_id: walkinRow.id,
            part_id: p.part_id,
            quantity: parseInt(p.quantity, 10),
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
    const todayWalkIns = walkins.filter((w) => w.logged_at?.startsWith(today));

    const weekWalkIns = walkins.filter((w) => {
      if (!w.logged_at) return false;
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
      t.reported_at?.startsWith(today)
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

      const closedAt = new Date(t.closed_at);
      if (closedAt < sevenDaysAgo) return;

      if (!engMap[t.closed_by])
        engMap[t.closed_by] = { tickets: 1, walkins: 0 };
      else engMap[t.closed_by].tickets++;
    });

    walkins.forEach((w) => {
      if (!w.engineer_id || !w.logged_at) return;

      const loggedAt = new Date(w.logged_at);
      if (loggedAt < sevenDaysAgo) return;

      if (!engMap[w.engineer_id])
        engMap[w.engineer_id] = { tickets: 0, walkins: 1 };
      else engMap[w.engineer_id].walkins++;
    });

    return {
      totalToday: todayTickets.length,
      closedToday: todayClosed.length,
      openNow: openNow.length,
      avgTAT,
      engineerPerformance: engMap,
    };
  }, [tickets, walkins]);

  // -------------------------
  // Filtered & Sorted & Paginated Data
  // -------------------------

  const filteredTickets = useMemo(() => {
    const base = tickets.filter((t) => {
      if (!ticketDateFilter) return true;
      return t.reported_at?.startsWith(ticketDateFilter);
    });

    const sorted = [...base];

    sorted.sort((a, b) => {
      const aTime = a.reported_at ? new Date(a.reported_at).getTime() : 0;
      const bTime = b.reported_at ? new Date(b.reported_at).getTime() : 0;

      if (!openFirst) {
        // Default: newest first
        return bTime - aTime;
      }

      const aOpen = a.status === "open";
      const bOpen = b.status === "open";

      if (aOpen && !bOpen) return -1;
      if (!aOpen && bOpen) return 1;

      if (aOpen && bOpen) {
        // Both open → oldest first
        return aTime - bTime;
      }

      // Both closed → newest first
      return bTime - aTime;
    });

    return sorted;
  }, [tickets, ticketDateFilter, openFirst]);

  const filteredWalkins = useMemo(() => {
    return walkins.filter((w) => {
      if (!walkinDateFilter) return true;
      return w.logged_at?.startsWith(walkinDateFilter);
    });
  }, [walkins, walkinDateFilter]);

  const totalTicketPages = Math.max(
    1,
    Math.ceil(filteredTickets.length / TICKET_PAGE_SIZE)
  );
  const totalWalkinPages = Math.max(
    1,
    Math.ceil(filteredWalkins.length / WALKIN_PAGE_SIZE)
  );

  const pagedTickets = useMemo(() => {
    const start = (ticketPage - 1) * TICKET_PAGE_SIZE;
    return filteredTickets.slice(start, start + TICKET_PAGE_SIZE);
  }, [filteredTickets, ticketPage]);

  const pagedWalkins = useMemo(() => {
    const start = (walkinPage - 1) * WALKIN_PAGE_SIZE;
    return filteredWalkins.slice(start, start + WALKIN_PAGE_SIZE);
  }, [filteredWalkins, walkinPage]);

  useEffect(() => {
    if (ticketPage > totalTicketPages) {
      setTicketPage(totalTicketPages);
    }
  }, [ticketPage, totalTicketPages]);

  useEffect(() => {
    if (walkinPage > totalWalkinPages) {
      setWalkinPage(totalWalkinPages);
    }
  }, [walkinPage, totalWalkinPages]);

  // ----------------------------
  // Helpers: per-ticket TAT
  // ----------------------------
  function formatTat(reported_at, closed_at) {
    if (!reported_at || !closed_at) return "-";
    const start = new Date(reported_at);
    const end = new Date(closed_at);
    const diffMins = Math.round((end - start) / 60000);
    if (diffMins < 60) return `${diffMins} min`;
    const hours = (diffMins / 60).toFixed(1);
    return `${hours} h`;
  }

  // ----------------------------
  // UI Rendering
  // ----------------------------
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-100">
              Nanded Station
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Monitor tickets, walk-ins and engineer performance.
            </p>
          </div>

          <button
            onClick={() => {
              setWalkInBike("");
              setWalkInIssue("");
              setWalkInCost(0);
              setWalkInParts([{ part_id: "", quantity: 1 }]);
              setWalkInEngineer("");
              setShowWalkInModal(true);

              if (tickets.length > 0) {
                fetchEngineers(tickets[0]);
                fetchCompatibleParts({ bike_number_text: "" });
              }
            }}
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/30 hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 transition"
          >
            <span className="text-lg">＋</span>
            <span>New Walk-In Job</span>
          </button>
        </div>

        {/* MESSAGE / ALERT */}
        {message && (
          <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-3 text-sm text-blue-100 shadow-sm">
            {message}
          </div>
        )}

        {/* KPI Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <KpiCard label="Tickets Today" value={ticketMetrics.totalToday} />
          <KpiCard label="Closed Today" value={ticketMetrics.closedToday} />
          <KpiCard label="Open Tickets" value={ticketMetrics.openNow} />
          <KpiCard label="Avg TAT (mins)" value={ticketMetrics.avgTAT} />
          <KpiCard label="Walk-Ins Today" value={walkInMetrics.today} />
          <KpiCard label="Walk-Ins (7 Days)" value={walkInMetrics.week} />
        </div>

        {/* ENGINEER PERFORMANCE */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-xl shadow-slate-900/60">
          <h2 className="text-lg font-semibold text-slate-100 mb-2">
            Engineer Performance (Last 7 Days)
          </h2>
          <p className="text-xs text-slate-400 mb-3">
            Includes both ticket closures and walk-in jobs.
          </p>
          <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/40">
            <div className="max-h-60 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-900/80 text-slate-300 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">Engineer</th>
                    <th className="px-3 py-2 text-left">Tickets</th>
                    <th className="px-3 py-2 text-left">Walk-Ins</th>
                    <th className="px-3 py-2 text-left">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(ticketMetrics.engineerPerformance).map(
                    ([engId, stats]) => {
                      const eng = engineers.find((e) => e.id === engId);
                      const ticketsClosed = stats.tickets || 0;
                      const walkinsDone = stats.walkins || 0;
                      const total = ticketsClosed + walkinsDone;

                      return (
                        <tr
                          key={engId}
                          className="border-t border-slate-800/80 hover:bg-slate-900/60 transition"
                        >
                          <td className="px-3 py-2">
                            {eng ? eng.name : "Unknown"}
                          </td>
                          <td className="px-3 py-2">{ticketsClosed}</td>
                          <td className="px-3 py-2">{walkinsDone}</td>
                          <td className="px-3 py-2 font-medium">{total}</td>
                        </tr>
                      );
                    }
                  )}
                  {Object.keys(ticketMetrics.engineerPerformance).length ===
                    0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-4 text-center text-slate-500 text-xs"
                      >
                        No engineer activity in the last 7 days.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* SIDE TABS + CONTENT */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* SIDE TABS */}
          <div className="md:w-48">
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-2 flex md:flex-col gap-2">
              <button
                onClick={() => setActiveTab("tickets")}
                className={`flex-1 md:w-full text-sm px-3 py-2 rounded-xl text-left transition ${
                  activeTab === "tickets"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                    : "bg-slate-950/50 text-slate-300 hover:bg-slate-900"
                }`}
              >
                Tickets
              </button>
              <button
                onClick={() => setActiveTab("walkins")}
                className={`flex-1 md:w-full text-sm px-3 py-2 rounded-xl text-left transition ${
                  activeTab === "walkins"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                    : "bg-slate-950/50 text-slate-300 hover:bg-slate-900"
                }`}
              >
                Walk-In Services
              </button>
            </div>
          </div>

          {/* MAIN TAB CONTENT */}
          <div className="flex-1">
            {activeTab === "tickets" ? (
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-xl shadow-slate-900/60 flex flex-col">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                  <h2 className="text-lg font-semibold text-slate-100">
                    Tickets
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <span>Date filter:</span>
                      <input
                        type="date"
                        className="bg-slate-950/60 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={ticketDateFilter}
                        onChange={(e) => {
                          setTicketPage(1);
                          setTicketDateFilter(e.target.value);
                        }}
                      />
                      {ticketDateFilter && (
                        <button
                          className="text-blue-300 hover:text-blue-200"
                          onClick={() => {
                            setTicketDateFilter("");
                            setTicketPage(1);
                          }}
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setOpenFirst((prev) => !prev);
                        setTicketPage(1);
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-700 px-3 py-1 text-xs hover:bg-slate-800 transition"
                    >
                      <span>Status sort:</span>
                      <span className="font-semibold">
                        {openFirst ? "Open ↑ oldest" : "Default"}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/40 flex-1 flex flex-col">
                  <div className="max-h-[480px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-900/80 text-slate-300 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left">Bike</th>
                          <th className="px-3 py-2 text-left">Issue</th>
                          <th className="px-3 py-2 text-left">Status</th>
                          <th className="px-3 py-2 text-left">Timeline</th>
                          <th className="px-3 py-2 text-left">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedTickets.map((t) => {
                          const reportedText = t.reported_at
                            ? new Date(t.reported_at).toLocaleString()
                            : "-";
                          const closedText = t.closed_at
                            ? new Date(t.closed_at).toLocaleString()
                            : "-";
                          const tat = formatTat(
                            t.reported_at,
                            t.closed_at
                          );

                          return (
                            <tr
                              key={t.id}
                              className="border-t border-slate-800/80 hover:bg-slate-900/60 transition"
                            >
                              <td className="px-3 py-2 whitespace-nowrap">
                                {t.bike_number_text}
                              </td>
                              <td className="px-3 py-2 max-w-[260px] truncate">
                                {t.issue_description}
                              </td>
                              <td className="px-3 py-2">
                                {t.status === "open" ? (
                                  <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-300 ring-1 ring-amber-500/40">
                                    Open
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/40">
                                    Closed
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-xs text-slate-300">
                                <div className="flex flex-col gap-0.5">
                                  <span>Reported: {reportedText}</span>
                                  <span>Closed: {closedText}</span>
                                  <span>TAT: {tat}</span>
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                {t.status === "open" ? (
                                  <button
                                    onClick={() => openModalForTicket(t)}
                                    className="rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 transition"
                                  >
                                    Close with Parts
                                  </button>
                                ) : (
                                  <span className="text-xs text-slate-400">
                                    Closed by:{" "}
                                    {t.engineers?.name || "Unknown"}
                                    {typeof t.cost_charged === "number" &&
                                      !Number.isNaN(
                                        Number(t.cost_charged)
                                      ) && (
                                        <> · Cost: {t.cost_charged}</>
                                      )}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {!loading && pagedTickets.length === 0 && (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-3 py-4 text-center text-slate-500 text-xs"
                            >
                              No tickets for this filter.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify_between px-3 py-2 bg-slate-900/80 text-xs text-slate-300">
                    <span>
                      Page {ticketPage} of {totalTicketPages || 1} (
                      {filteredTickets.length}{" "}
                      {filteredTickets.length === 1 ? "ticket" : "tickets"})
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setTicketPage((p) => Math.max(1, p - 1))
                        }
                        disabled={ticketPage <= 1}
                        className="rounded-full border border-slate-700 px-2.5 py-1 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition"
                      >
                        Prev
                      </button>
                      <button
                        onClick={() =>
                          setTicketPage((p) =>
                            Math.min(totalTicketPages, p + 1)
                          )
                        }
                        disabled={ticketPage >= totalTicketPages}
                        className="rounded-full border border-slate-700 px-2.5 py-1 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-xl shadow-slate-900/60 flex flex-col">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                  <h2 className="text-lg font-semibold text-slate-100">
                    Walk-In Services
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <span>Date filter:</span>
                    <input
                      type="date"
                      className="bg-slate-950/60 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={walkinDateFilter}
                      onChange={(e) => {
                        setWalkinPage(1);
                        setWalkinDateFilter(e.target.value);
                      }}
                    />
                    {walkinDateFilter && (
                      <button
                        className="text-blue-300 hover:text-blue-200"
                        onClick={() => {
                          setWalkinDateFilter("");
                          setWalkinPage(1);
                        }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/40 flex-1 flex flex-col">
                  <div className="max-h-[480px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-900/80 text-slate-300 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left">Bike</th>
                          <th className="px-3 py-2 text-left">Issue</th>
                          <th className="px-3 py-2 text-left">Engineer</th>
                          <th className="px-3 py-2 text-left">Logged</th>
                          <th className="px-3 py-2 text-left">Cost</th>
                        </tr>
                      </thead>

                      <tbody>
                        {pagedWalkins.map((w) => {
                          const eng = engineers.find(
                            (e) => e.id === w.engineer_id
                          );
                          return (
                            <tr
                              key={w.id}
                              className="border-t border-slate-800/80 hover:bg-slate-900/60 transition"
                            >
                              <td className="px-3 py-2 whitespace-nowrap">
                                {w.bike_number_text}
                              </td>
                              <td className="px-3 py-2 max-w-[260px] truncate">
                                {w.issue_description}
                              </td>
                              <td className="px-3 py-2">
                                {eng ? eng.name : "Unknown"}
                              </td>
                              <td className="px-3 py-2 text-xs text-slate-300">
                                {w.logged_at
                                  ? new Date(w.logged_at).toLocaleString()
                                  : "-"}
                              </td>
                              <td className="px-3 py-2">
                                {w.cost_charged ?? 0}
                              </td>
                            </tr>
                          );
                        })}
                        {pagedWalkins.length === 0 && (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-3 py-4 text-center text-slate-500 text-xs"
                            >
                              No walk-in jobs for this filter.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-900/80 text-xs text-slate-300">
                    <span>
                      Page {walkinPage} of {totalWalkinPages || 1} (
                      {filteredWalkins.length}{" "}
                      {filteredWalkins.length === 1 ? "walk-in" : "walk-ins"})
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setWalkinPage((p) => Math.max(1, p - 1))
                        }
                        disabled={walkinPage <= 1}
                        className="rounded-full border border-slate-700 px-2.5 py-1 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition"
                      >
                        Prev
                      </button>
                      <button
                        onClick={() =>
                          setWalkinPage((p) =>
                            Math.min(totalWalkinPages, p + 1)
                          )
                        }
                        disabled={walkinPage >= totalWalkinPages}
                        className="rounded-full border border-slate-700 px-2.5 py-1 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ---------------------------------- */}
        {/* TICKET CLOSE MODAL */}
        {/* ---------------------------------- */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex justify-center items-center z-40">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl shadow-slate-950/80 p-6">
              <h2 className="text-xl font-semibold mb-4 text-slate-100">
                Close Ticket & Log Parts
              </h2>

              <label className="block mb-2 text-sm font-medium text-slate-200">
                Cost Charged
              </label>
              <input
                type="number"
                className="border border-slate-700 bg-slate-950/60 text-slate-100 text-sm rounded-xl w-full mb-4 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={ticketCost}
                onChange={(e) => setTicketCost(e.target.value)}
                placeholder="Total cost for this ticket"
              />

              <label className="block mb-2 text-sm font-medium text-slate-200">
                Engineer
              </label>
              <select
                className="border border-slate-700 bg-slate-950/60 text-slate-100 text-sm rounded-xl w-full mb-4 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

              {partsUsed.map((row, index) => (
                <div key={index} className="flex gap-2 mb-3">
                  <select
                    className="border border-slate-700 bg-slate-950/60 text-slate-100 text-sm rounded-xl flex-1 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="border border-slate-700 bg-slate-950/60 text-slate-100 text-sm rounded-xl w-20 px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={row.quantity}
                    onChange={(e) =>
                      updatePartRow(index, "quantity", e.target.value)
                    }
                  />

                  {index > 0 && (
                    <button
                      className="text-red-400 text-lg px-2 hover:text-red-300 transition"
                      onClick={() => removePartRow(index)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}

              <button
                className="text-blue-400 text-sm underline mb-4 hover:text-blue-300 transition"
                onClick={addPartRow}
              >
                + Add Another Part
              </button>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-full border border-slate-600 text-slate-200 text-sm hover:bg-slate-800 transition"
                >
                  Cancel
                </button>

                <button
                  onClick={handleCloseWithParts}
                  className="px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 transition"
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
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex justify-center items-center z-40">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w_full max-w-lg shadow-2xl shadow-slate-950/80 p-6">
              <h2 className="text-xl font-semibold mb-4 text-slate-100">
                New Walk-In Job
              </h2>

              <label className="block mb-2 text-sm font-medium text-slate-200">
                Bike Number
              </label>
              <input
                className="border border-slate-700 bg-slate-950/60 text-slate-100 text-sm rounded-xl w-full mb-4 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={walkInBike}
                onChange={(e) => setWalkInBike(e.target.value)}
                placeholder="TN12AB3456"
              />

              <label className="block mb-2 text-sm font-medium text-slate-200">
                Issue
              </label>
              <textarea
                className="border border-slate-700 bg-slate-950/60 text-slate-100 text-sm rounded-xl w-full mb-4 px-3 py-2 focus:outline_none focus:ring-2 focus:ring-blue-500"
                value={walkInIssue}
                onChange={(e) => setWalkInIssue(e.target.value)}
                placeholder="Describe issue"
              />

              <label className="block mb-2 text-sm font-medium text-slate-200">
                Cost Charged
              </label>
              <input
                type="number"
                className="border border-slate-700 bg-slate-950/60 text-slate-100 text-sm rounded-xl w-full mb-4 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={WalkInCost}
                onChange={(e) => setWalkInCost(e.target.value)}
              />

              <label className="block mb-2 text-sm font-medium text-slate-200">
                Engineer
              </label>
              <select
                className="border border-slate-700 bg-slate-950/60 text-slate-100 text-sm rounded-xl w-full mb-4 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

              {walkInParts.map((row, index) => (
                <div key={index} className="flex gap-2 mb-3">
                  <select
                    className="border border-slate-700 bg-slate-950/60 text-slate-100 text-sm rounded-xl flex-1 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="border border-slate-700 bg-slate-950/60 text-slate-100 text-sm rounded-xl w-20 px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={row.quantity}
                    onChange={(e) =>
                      updateWalkInPartRow(index, "quantity", e.target.value)
                    }
                  />

                  {index > 0 && (
                    <button
                      className="text-red-400 text-lg px-2 hover:text-red-300 transition"
                      onClick={() => removeWalkInPartRow(index)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}

              <button
                className="text-blue-400 text-sm underline mb-4 hover:text-blue-300 transition"
                onClick={addWalkInPartRow}
              >
                + Add Another Part
              </button>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setShowWalkInModal(false)}
                  className="px-4 py-2 rounded-full border border-slate-600 text-slate-200 text-sm hover:bg-slate-800 transition"
                >
                  Cancel
                </button>

                <button
                  onClick={handleSubmitWalkIn}
                  className="px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 transition"
                >
                  Submit Walk-In
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Simple KPI Card component
 */
function KpiCard({ label, value }) {
  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-lg shadow-slate-950/50">
      <p className="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wide">
        {label}
      </p>
      <p className="text-2xl font-semibold text-slate-50">{value}</p>
    </div>
  );
}
