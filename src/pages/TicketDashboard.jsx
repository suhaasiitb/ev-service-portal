import { useEffect, useState, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";
import KpiCard from "../components/kpi/KpiCard";
import EngineerPerformanceTable from "../components/EngineerPerformanceTable";
import TicketsTable from "../components/tickets/TicketsTable";
import WalkinsTable from "../components/walkins/WalkinsTable";
import CloseTicketModal from "../components/tickets/CloseTicketModal";
import WalkInModal from "../components/walkins/WalkInModal";
import { useTickets } from "../hooks/useTickets";
import { useWalkins } from "../hooks/useWalkins";
import { useEngineers } from "../hooks/useEngineers";
import { useDashboardMetrics } from "../hooks/useDashboardMetrics";


const TICKET_PAGE_SIZE = 15;
const WALKIN_PAGE_SIZE = 15;

export default function TicketDashboard({ session, stationName }) {

  const { tickets, loading, error, refetchTickets } = useTickets();
  const { walkins, refetchWalkins } = useWalkins();

  const { walkInMetrics, ticketMetrics } = useDashboardMetrics(tickets, walkins);

  const [parts, setParts] = useState([]);
  const { engineers } = useEngineers([]);

  const [stationId, setStationId] = useState(null);


  const [message, setMessage] = useState("");

  const [walkinStationid, setWalkinStationid] = useState(null);

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


  useEffect(() => {
    async function resolveStation() {
      if (!session?.user?.id) return;

      const { data, error } = await supabase
        .from("users")
        .select("station_id")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!error && data?.station_id) {
        setStationId(data.station_id);
      }
    }

    resolveStation();
  }, [session]);



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
  // Open Ticket Modal
  // -------------------------
  function openModalForTicket(ticket) {
    setActiveTicket(ticket);
    setPartsUsed([{ part_id: "", quantity: 1 }]);
    setSelectedEngineer("");
    setTicketCost(ticket.cost_charged ?? 0);

    fetchCompatibleParts(ticket);

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
      refetchTickets();
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
      refetchWalkins();
    } catch (err) {
      console.error("Walk-In flow error:", err);
      setMessage("❌ Failed: " + (err.message || "Unknown error"));
    }
  }

  async function resolveWalkInStation(bikeNumber) {
    if (!bikeNumber) return null;

    const { data: bike } = await supabase
      .from("bikes")
      .select("station_id")
      .eq("bike_number", bikeNumber.trim())
      .maybeSingle();

    return bike?.station_id || null;
  }

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
              {stationName}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Monitor tickets, walk-ins and engineer performance.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setWalkInBike("");
                setWalkInIssue("");
                setWalkInCost(0);
                setWalkInParts([{ part_id: "", quantity: 1 }]);
                setWalkInEngineer("");
                setShowWalkInModal(true);
                setWalkinStationid(null);

                // Fetch all parts for walk-in modal
                fetchCompatibleParts({ bike_number_text: "" });
              }}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/30 hover:bg-blue-500 transition"
            >
              <span className="text-lg">＋</span>
              <span>New Walk-In Job</span>
            </button>

            <button
              onClick={async () => {
                await supabase.auth.signOut();
              }}
              className="inline-flex items-center rounded-full border border-slate-600 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800 transition"
            >
              Logout
            </button>
          </div>
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

        <EngineerPerformanceTable
          engineerStats={ticketMetrics.engineerPerformance}
          engineers={engineers}
        />

        {/* SIDE TABS + CONTENT */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* SIDE TABS */}
          <div className="md:w-48">
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-2 flex md:flex-col gap-2">
              <button
                onClick={() => setActiveTab("tickets")}
                className={`flex-1 md:w-full text-sm px-3 py-2 rounded-xl text-left transition ${activeTab === "tickets"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                    : "bg-slate-950/50 text-slate-300 hover:bg-slate-900"
                  }`}
              >
                Tickets
              </button>
              <button
                onClick={() => setActiveTab("walkins")}
                className={`flex-1 md:w-full text-sm px-3 py-2 rounded-xl text-left transition ${activeTab === "walkins"
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
              <TicketsTable
                loading={loading}
                tickets={pagedTickets}
                ticketPage={ticketPage}
                setTicketPage={setTicketPage}
                totalTicketPages={totalTicketPages}
                filteredTicketsLength={filteredTickets.length}
                ticketDateFilter={ticketDateFilter}
                setTicketDateFilter={setTicketDateFilter}
                openFirst={openFirst}
                setOpenFirst={setOpenFirst}
                openModalForTicket={openModalForTicket}
                formatTat={formatTat}
              />
            ) : (
              <WalkinsTable
                walkins={filteredWalkins}
                engineers={engineers}
                walkinPage={walkinPage}
                setWalkinPage={setWalkinPage}
                totalWalkinPages={totalWalkinPages}
                walkinDateFilter={walkinDateFilter}
                setWalkinDateFilter={setWalkinDateFilter}
              />
            )}
          </div>
        </div>

        <CloseTicketModal
          open={showModal}
          onClose={() => setShowModal(false)}
          ticket={activeTicket}

          engineers={engineers}
          parts={parts}

          partsUsed={partsUsed}
          setPartsUsed={setPartsUsed}

          selectedEngineer={selectedEngineer}
          setSelectedEngineer={setSelectedEngineer}

          ticketCost={ticketCost}
          setTicketCost={setTicketCost}

          onSubmit={handleCloseWithParts}
        />

        <WalkInModal
          open={showWalkInModal}
          onClose={() => setShowWalkInModal(false)}

          stationId={stationId}

          walkInBike={walkInBike}
          setWalkInBike={setWalkInBike}

          walkInIssue={walkInIssue}
          setWalkInIssue={setWalkInIssue}

          walkInCost={WalkInCost}
          setWalkInCost={setWalkInCost}

          walkInEngineer={walkInEngineer}
          setWalkInEngineer={setWalkInEngineer}

          walkInParts={walkInParts}
          addWalkInPartRow={addWalkInPartRow}
          removeWalkInPartRow={removeWalkInPartRow}
          updateWalkInPartRow={updateWalkInPartRow}

          engineers={engineers}
          parts={parts}

          onSubmit={handleSubmitWalkIn}
        />

      </div>
    </div>
  );
}


