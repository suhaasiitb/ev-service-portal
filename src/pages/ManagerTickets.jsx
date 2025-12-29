import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

const ITEMS_PER_PAGE = 15;
const SLA_WARNING_HRS = 24;
const SLA_CRITICAL_HRS = 48;

export default function ManagerTickets() {
  const navigate = useNavigate();

  const [tickets, setTickets] = useState([]);
  const [stations, setStations] = useState({});
  const [engineers, setEngineers] = useState({});

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // Filters
  const [stationFilter, setStationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Pagination
  const [page, setPage] = useState(1);

  async function fetchData() {
    setLoading(true);
    setMessage("");

    // 1️⃣ Fetch tickets
    const { data: ticketData, error: tErr } = await supabase
      .from("tickets")
      .select(`
        id,
        ticket_no,
        bike_number_text,
        issue_description,
        status,
        reported_at,
        closed_at,
        station_id,
        closed_by
      `)
      .order("reported_at", { ascending: false });

    if (tErr) {
      setMessage("Failed to load tickets: " + tErr.message);
      setLoading(false);
      return;
    }

    // 2️⃣ Fetch stations
    const { data: stationData, error: sErr } = await supabase
        .from("stations")
        .select("id, name");

    if (sErr) {
        setMessage("Failed to load stations: " + sErr.message);
    }

    const stationMap = {};
    (stationData || []).forEach(s => {
        stationMap[s.id] = s.name;
    });

    setStations(stationMap);

    // 3️⃣ Fetch engineers
    const engineerIds = [
      ...new Set((ticketData || []).map(t => t.closed_by).filter(Boolean)),
    ];

    const { data: engineerData } = await supabase
      .from("engineers")
      .select("id, name")
      .in("id", engineerIds);

    const engineerMap = {};
    (engineerData || []).forEach(e => {
      engineerMap[e.id] = e.name;
    });

    setTickets(ticketData || []);
    setStations(stationMap);
    setEngineers(engineerMap);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  // 🔢 Derived + filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      if (stationFilter && t.station_id !== stationFilter) return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;

      if (search) {
        const q = search.toLowerCase();
        return (
          t.ticket_no?.toLowerCase().includes(q) ||
          t.bike_number_text?.toLowerCase().includes(q) ||
          t.issue_description?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [tickets, stationFilter, statusFilter, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTickets.length / ITEMS_PER_PAGE)
  );

  const pageSafe = Math.min(page, totalPages);
  const pageItems = filteredTickets.slice(
    (pageSafe - 1) * ITEMS_PER_PAGE,
    pageSafe * ITEMS_PER_PAGE
  );

  function computeTAT(ticket) {
    const start = new Date(ticket.reported_at);
    const end = ticket.closed_at ? new Date(ticket.closed_at) : new Date();
    return (end - start) / (1000 * 60 * 60);
  }

  function slaClass(tat) {
    if (tat >= SLA_CRITICAL_HRS) return "text-red-600 font-semibold";
    if (tat >= SLA_WARNING_HRS) return "text-amber-600 font-semibold";
    return "";
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* Main */}
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-bold text-blue-700 mb-4">
          Tickets
        </h1>

        {message && <p className="mb-4 text-red-600">{message}</p>}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <select
            value={stationFilter}
            onChange={e => {
              setStationFilter(e.target.value);
              setPage(1);
            }}
            className="border px-3 py-1 text-sm"
          >
            <option value="">All Stations</option>
            {Object.entries(stations).map(([id, code]) => (
              <option key={id} value={id}>
                {code}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={e => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="border px-3 py-1 text-sm"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>

          <input
            type="text"
            placeholder="Search ticket / bike / issue"
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="border px-3 py-1 text-sm flex-1"
          />
        </div>

        {/* Table */}
        {loading ? (
          <p>Loading tickets...</p>
        ) : (
          <>
            <table className="w-full border bg-white text-sm">
              <thead>
                <tr className="bg-gray-200">
                  <th className="p-2 border">Ticket</th>
                  <th className="p-2 border">Station</th>
                  <th className="p-2 border">Bike</th>
                  <th className="p-2 border">Issue</th>
                  <th className="p-2 border">Status</th>
                  <th className="p-2 border">Engineer</th>
                  <th className="p-2 border">TAT (hrs)</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map(t => {
                  const tat = computeTAT(t);
                  return (
                    <tr key={t.id} className="border-t">
                      <td className="p-2 border">{t.ticket_no}</td>
                      <td className="p-2 border">
                        {stations[t.station_id] || "-"}
                      </td>
                      <td className="p-2 border">{t.bike_number_text}</td>
                      <td className="p-2 border">{t.issue_description}</td>
                      <td className="p-2 border">{t.status}</td>
                      <td className="p-2 border">
                        {engineers[t.closed_by] || "-"}
                      </td>
                      <td className={`p-2 border ${slaClass(tat)}`}>
                        {tat.toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-3 text-sm">
              <span>
                Showing {(pageSafe - 1) * ITEMS_PER_PAGE + 1}–
                {Math.min(pageSafe * ITEMS_PER_PAGE, filteredTickets.length)} of{" "}
                {filteredTickets.length}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={pageSafe === 1}
                  className="px-2 py-1 border rounded disabled:opacity-50"
                >
                  Prev
                </button>
                <span>
                  Page {pageSafe} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={pageSafe === totalPages}
                  className="px-2 py-1 border rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
