import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

const ITEMS_PER_PAGE = 15;
const SLA_WARNING_HRS = 24;
const SLA_CRITICAL_HRS = 48;

export default function ManagerTickets() {
  const navigate = useNavigate();

  const [tickets, setTickets] = useState([]);
  const [stations, setStations] = useState([]);
  const [engineers, setEngineers] = useState({});
  const [customers, setCustomers] = useState({});
  const [riders, setRiders] = useState({});
  const [ridersById, setRidersById] = useState({});

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // Filters
  const [stationFilter, setStationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState(""); // YYYY-MM-DD
  const [search, setSearch] = useState("");

  // Pagination
  const [page, setPage] = useState(1);

  async function fetchData() {
    setLoading(true);
    setMessage("");

    // 1️⃣ Fetch tickets with customer relation & contact
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
        closed_by,
        contact,
        location,
        customer_id,
        customers (
          id,
          full_name,
          phone_number
        )
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
      .select("id, name, is_buffer");

    if (sErr) {
      setMessage("Failed to load stations: " + sErr.message);
    }

    setStations(stationData || []);

    // 3️⃣ Fetch engineers
    const engineerIds = [
      ...new Set((ticketData || []).map(t => t.closed_by).filter(Boolean)),
    ];

    let engineerMap = {};
    if (engineerIds.length > 0) {
      const { data: engineerData } = await supabase
        .from("engineers")
        .select("id, name")
        .in("id", engineerIds);

      (engineerData || []).forEach(e => {
        engineerMap[e.id] = e.name;
      });
    }

    // 4️⃣ Fetch customers directly to guarantee customer_id mapping
    const customerMap = {};

    // First attempt: fetch all customers
    const { data: allCustomers, error: custErr } = await supabase
      .from("customers")
      .select("id, full_name, phone_number");

    if (custErr) {
      console.warn("Direct customers fetch warning (check RLS policy on customers table):", custErr.message);
    } else if (allCustomers) {
      allCustomers.forEach(c => {
        if (c.id) customerMap[c.id] = c;
      });
    }

    // Second attempt: fetch explicitly for ticket customer_ids if any are missing from allCustomers
    const ticketCustIds = [
      ...new Set((ticketData || []).map(t => t.customer_id).filter(Boolean)),
    ];
    const missingCustIds = ticketCustIds.filter(id => !customerMap[id]);
    if (missingCustIds.length > 0) {
      const { data: specificCusts, error: specErr } = await supabase
        .from("customers")
        .select("id, full_name, phone_number")
        .in("id", missingCustIds);

      if (!specErr && specificCusts) {
        specificCusts.forEach(c => {
          if (c.id) customerMap[c.id] = c;
        });
      }
    }

    // 5️⃣ Fetch riders to map customer contact numbers or rider IDs to names
    const { data: riderData } = await supabase
      .from("riders")
      .select("id, name, phone");

    const riderPhoneMap = {};
    const riderIdMap = {};
    (riderData || []).forEach(r => {
      if (r.id) riderIdMap[r.id] = r;
      if (r.phone) {
        const digits = String(r.phone).replace(/\D/g, "");
        const normalized = digits.length > 10 ? digits.slice(-10) : digits;
        if (normalized) {
          riderPhoneMap[normalized] = r.name;
        }
      }
    });

    setTickets(ticketData || []);
    setEngineers(engineerMap);
    setCustomers(customerMap);
    setRiders(riderPhoneMap);
    setRidersById(riderIdMap);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  // Helper to extract customer name and phone
  const getCustomerInfo = (t) => {
    // 1. Direct match by customer_id in customers table map
    if (t.customer_id && customers[t.customer_id]) {
      const c = customers[t.customer_id];
      if (c.full_name) {
        return {
          name: c.full_name,
          phone: c.phone_number || t.contact || null,
        };
      }
    }

    // 2. Embedded joined relation (handle both single object & array)
    const joinedCust = Array.isArray(t.customers) ? t.customers[0] : t.customers;
    if (joinedCust?.full_name) {
      return {
        name: joinedCust.full_name,
        phone: joinedCust.phone_number || t.contact || null,
      };
    }

    // 3. Check if customer_id matches a rider UUID
    if (t.customer_id && ridersById[t.customer_id]) {
      const r = ridersById[t.customer_id];
      return {
        name: r.name,
        phone: r.phone || t.contact || null,
      };
    }

    // 4. Check if contact matches a rider's phone
    if (t.contact) {
      const digits = String(t.contact).replace(/\D/g, "");
      const normalized = digits.length > 10 ? digits.slice(-10) : digits;
      if (normalized && riders[normalized]) {
        return {
          name: riders[normalized],
          phone: t.contact,
        };
      }
      return {
        name: null,
        phone: t.contact,
      };
    }

    return { name: null, phone: null };
  };

  // Date stepper handlers
  const handlePrevDay = () => {
    const current = dateFilter || new Date().toLocaleDateString("en-CA");
    const d = new Date(current + "T00:00:00");
    d.setDate(d.getDate() - 1);
    setDateFilter(d.toLocaleDateString("en-CA"));
    setPage(1);
  };

  const handleNextDay = () => {
    const current = dateFilter || new Date().toLocaleDateString("en-CA");
    const d = new Date(current + "T00:00:00");
    d.setDate(d.getDate() + 1);
    setDateFilter(d.toLocaleDateString("en-CA"));
    setPage(1);
  };

  // 🔢 Derived + filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      if (stationFilter && t.station_id !== stationFilter) return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;

      // Date filter on reported_at (raised date)
      if (dateFilter) {
        if (!t.reported_at) return false;
        const d = new Date(t.reported_at);
        const localDate = !isNaN(d.getTime()) ? d.toLocaleDateString("en-CA") : "";
        const utcDate = !isNaN(d.getTime()) ? d.toISOString().split("T")[0] : "";
        const startsWithDate = typeof t.reported_at === "string" && t.reported_at.startsWith(dateFilter);
        if (localDate !== dateFilter && utcDate !== dateFilter && !startsWithDate) {
          return false;
        }
      }

      if (search) {
        const q = search.toLowerCase();
        const cust = getCustomerInfo(t);
        return (
          t.ticket_no?.toLowerCase().includes(q) ||
          t.bike_number_text?.toLowerCase().includes(q) ||
          t.issue_description?.toLowerCase().includes(q) ||
          cust.name?.toLowerCase().includes(q) ||
          cust.phone?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [tickets, stationFilter, statusFilter, dateFilter, search, riders, ridersById, customers]);

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
      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-blue-700">
              Tickets
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Track and manage service requests and reported issues ({filteredTickets.length} tickets {dateFilter ? `raised on ${new Date(dateFilter + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : "total"})
            </p>
          </div>
        </div>

        {message && <p className="mb-4 text-red-600 text-sm font-semibold">{message}</p>}

        {/* Filters Bar */}
        <div className="flex flex-wrap items-center gap-3 mb-4 bg-white p-3 rounded-lg border border-gray-200 shadow-2xs">
          {/* Station Filter */}
          <select
            value={stationFilter}
            onChange={e => {
              setStationFilter(e.target.value);
              setPage(1);
            }}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Stations</option>
            {stations
              .filter(s => !s.is_buffer)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>

          {/* Date Filter (Raised Date) */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 rounded px-2.5 py-1 text-sm">
            <span className="text-gray-500 text-xs font-semibold">📅 Date:</span>
            <button
              type="button"
              onClick={handlePrevDay}
              className="w-5 h-5 flex items-center justify-center hover:bg-gray-200 rounded text-gray-600 text-xs font-bold transition"
              title="Previous Day"
            >
              ◀
            </button>
            <input
              type="date"
              value={dateFilter}
              onChange={e => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs font-semibold text-gray-800 bg-transparent focus:outline-none cursor-pointer"
            />
            <button
              type="button"
              onClick={handleNextDay}
              className="w-5 h-5 flex items-center justify-center hover:bg-gray-200 rounded text-gray-600 text-xs font-bold transition"
              title="Next Day"
            >
              ▶
            </button>
            {dateFilter && (
              <button
                type="button"
                onClick={() => {
                  setDateFilter("");
                  setPage(1);
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-1"
                title="Clear Date Filter"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setDateFilter(new Date().toLocaleDateString("en-CA"));
                setPage(1);
              }}
              className={`px-2 py-0.5 rounded text-xs font-bold transition cursor-pointer ${
                dateFilter === new Date().toLocaleDateString("en-CA")
                  ? "bg-blue-600 text-white"
                  : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
              }`}
              title="Today's Raised Tickets"
            >
              Today
            </button>
          </div>

          {/* Search Box */}
          <input
            type="text"
            placeholder="🔍 Search ticket, bike, customer, issue..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm flex-1 min-w-[200px] bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-12 text-center text-gray-500 bg-white border border-gray-200 rounded-lg">
            Loading tickets...
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-12 text-center text-gray-500 bg-white border border-gray-200 rounded-lg shadow-2xs">
            <div className="text-3xl mb-2">🎫</div>
            <p className="font-semibold text-gray-700 text-base">No tickets found</p>
            <p className="text-xs text-gray-400 mt-1">
              {dateFilter
                ? `No tickets were raised on ${dateFilter}. Try picking another date or click Clear to view all.`
                : "No tickets matching your current filters."}
            </p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg shadow-2xs overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100/80 text-gray-700 border-b border-gray-200">
                  <th className="p-2.5 border-r border-gray-200 font-semibold">Ticket</th>
                  <th className="p-2.5 border-r border-gray-200 font-semibold">Station</th>
                  <th className="p-2.5 border-r border-gray-200 font-semibold">Bike</th>
                  <th className="p-2.5 border-r border-gray-200 font-semibold">Customer</th>
                  <th className="p-2.5 border-r border-gray-200 font-semibold">Issue</th>
                  <th className="p-2.5 border-r border-gray-200 font-semibold text-center">Status</th>
                  <th className="p-2.5 border-r border-gray-200 font-semibold">Engineer</th>
                  <th className="p-2.5 border-r border-gray-200 font-semibold">Raised At</th>
                  <th className="p-2.5 font-semibold text-center">TAT (hrs)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pageItems.map(t => {
                  const tat = computeTAT(t);
                  const cust = getCustomerInfo(t);

                  return (
                    <tr key={t.id} className="hover:bg-blue-50/20 transition-colors">
                      {/* Ticket Number */}
                      <td className="p-2.5 border-r border-gray-100 font-mono font-semibold text-blue-700 whitespace-nowrap">
                        {t.ticket_no || "-"}
                      </td>

                      {/* Station */}
                      <td className="p-2.5 border-r border-gray-100 text-gray-800 whitespace-nowrap">
                        {stations.find(s => s.id === t.station_id)?.name || "-"}
                      </td>

                      {/* Bike Number */}
                      <td className="p-2.5 border-r border-gray-100 font-mono font-medium text-gray-900 whitespace-nowrap">
                        {t.bike_number_text || "-"}
                      </td>

                      {/* Customer Name & Phone */}
                      <td className="p-2.5 border-r border-gray-100 whitespace-nowrap">
                        {cust.name ? (
                          <div>
                            <div className="font-semibold text-gray-900">{cust.name}</div>
                            {cust.phone && (
                              <div className="text-xs text-gray-500 font-mono">{cust.phone}</div>
                            )}
                          </div>
                        ) : cust.phone ? (
                          <div className="text-xs font-mono text-gray-700">
                            📞 {cust.phone}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Unknown</span>
                        )}
                      </td>

                      {/* Issue Description */}
                      <td className="p-2.5 border-r border-gray-100 text-gray-700 max-w-xs truncate" title={t.issue_description}>
                        {t.issue_description || "-"}
                      </td>

                      {/* Status Badge */}
                      <td className="p-2.5 border-r border-gray-100 text-center whitespace-nowrap">
                        {t.status === "open" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Open
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Closed
                          </span>
                        )}
                      </td>

                      {/* Closed By Engineer */}
                      <td className="p-2.5 border-r border-gray-100 text-gray-700 whitespace-nowrap">
                        {engineers[t.closed_by] || "-"}
                      </td>

                      {/* Raised At (Timestamp) */}
                      <td className="p-2.5 border-r border-gray-100 text-xs text-gray-600 whitespace-nowrap">
                        {t.reported_at
                          ? new Date(t.reported_at).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </td>

                      {/* TAT */}
                      <td className={`p-2.5 text-center font-mono text-xs whitespace-nowrap ${slaClass(tat)}`}>
                        {tat.toFixed(1)}h
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-center p-3 border-t border-gray-200 text-xs text-gray-600 gap-2">
              <span>
                Showing {(pageSafe - 1) * ITEMS_PER_PAGE + 1}–
                {Math.min(pageSafe * ITEMS_PER_PAGE, filteredTickets.length)} of{" "}
                {filteredTickets.length} tickets
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={pageSafe === 1}
                  className="px-2.5 py-1 border border-gray-300 rounded font-semibold hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                <span className="font-semibold text-gray-700">
                  Page {pageSafe} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={pageSafe === totalPages}
                  className="px-2.5 py-1 border border-gray-300 rounded font-semibold hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
