import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import ManagerLayout from "../layouts/ManagerLayout";

const ITEMS_PER_PAGE = 15;

export default function ManagerWalkins() {
  const [walkins, setWalkins] = useState([]);
  const [stations, setStations] = useState({});
  const [engineers, setEngineers] = useState({});
  const [models, setModels] = useState({});

  const [stationFilter, setStationFilter] = useState("");
  const [engineerFilter, setEngineerFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    setLoading(true);

    // 1️⃣ Walk-ins
    const { data: walkinData } = await supabase
      .from("walkins")
      .select(`
        id,
        station_id,
        bike_number_text,
        engineer_id,
        model_id,
        issue_description,
        logged_at,
        cost_charged
      `)
      .order("logged_at", { ascending: false });

    // 2️⃣ Walk-in parts (aggregate)
    const { data: partData } = await supabase
      .from("walkin_parts")
      .select("walkin_id, part_id ,quantity");

    // parts catalog (cost)
    const { data: partsCatalog } = await supabase
      .from("parts_catalog")
      .select("id, part_name ,unit_cost");

    const partNameLookup = {};
    (partsCatalog || []).forEach(p => {
      partNameLookup[p.id] = p.part_name;
    });

    // Build parts-used map per walk-in
    const partsUsedMap = {};
    (partData || []).forEach(p => {
      const name = partNameLookup[p.part_id];
      if (!name) return;

      if (!partsUsedMap[p.walkin_id]) {
        partsUsedMap[p.walkin_id] = [];
      }

      partsUsedMap[p.walkin_id].push(name);
    });
    
    const partCostLookup = {};
    (partsCatalog || []).forEach(p => {
      partCostLookup[p.id] = p.unit_cost || 0;
    });

    const partCostMap = {};
    (partData || []).forEach(p => {
      const unitCost = partCostLookup[p.part_id] || 0;
      const cost = unitCost * (p.quantity || 0);
      partCostMap[p.walkin_id] =
        (partCostMap[p.walkin_id] || 0) + cost;
    });

    // 3️⃣ Stations
    const { data: stationData } = await supabase
      .from("stations")
      .select("id, name");

    const stationMap = {};
    (stationData || []).forEach(s => {
      stationMap[s.id] = s.name;
    });

    // 4️⃣ Engineers
    const { data: engineerData } = await supabase
      .from("engineers")
      .select("id, name");

    const engineerMap = {};
    (engineerData || []).forEach(e => {
      engineerMap[e.id] = e.name;
    });

    // 5️⃣ Models
    const { data: modelData } = await supabase
      .from("bike_models")
      .select("id, model_name");

    const modelMap = {};
    (modelData || []).forEach(m => {
      modelMap[m.id] = m.model_name;
    });

    setStations(stationMap);
    setEngineers(engineerMap);
    setModels(modelMap);

    setWalkins(
      (walkinData || []).map(w => ({
        ...w,
        parts_cost: partCostMap[w.id] || 0,
        parts_used: partsUsedMap[w.id] || [],
      }))
    );

    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  // 🔍 Filters
  const filtered = useMemo(() => {
    return walkins.filter(w => {
      if (stationFilter && w.station_id !== stationFilter) return false;
      if (engineerFilter && w.engineer_id !== engineerFilter) return false;

      if (fromDate && new Date(w.logged_at) < new Date(fromDate)) return false;
      if (toDate && new Date(w.logged_at) > new Date(toDate)) return false;

      return true;
    });
  }, [walkins, stationFilter, engineerFilter, fromDate, toDate]);

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / ITEMS_PER_PAGE)
  );

  const pageItems = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  // 📊 KPIs (today)
  const todayStr = new Date().toISOString().split("T")[0];
  
  const kpiSource = useMemo(() => {
    //No date selected -> today
    if (!fromDate && !toDate) {
      return walkins.filter(w => w.logged_at.startsWith(todayStr));
    }
    //date range selected
    return walkins.filter(w => {
        if (fromDate && new Date(w.logged_at) < new Date(fromDate)) return false;
        if (toDate && new Date(w.logged_at) > new Date(toDate)) return false;
        return true;
    });
  }, [walkins, fromDate, toDate]);

  const walkinsCount = kpiSource.length;

  const costCharged = kpiSource.reduce(
    (sum, w) => sum + (w.cost_charged || 0),
    0
  );

  const partsCost = kpiSource.reduce(
    (sum, w) => sum + (w.parts_cost || 0),
    0
  );


  return (
    <ManagerLayout>
      <h2 className="text-xl font-bold mb-4">Walk-Ins</h2>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4 text-sm">
        <div className="bg-white p-4 rounded shadow">
          <p className="text-gray-500">
            Walk-ins {fromDate || toDate ? "Selected Period" : "Today"}</p>
          <p className="text-2xl font-bold">{walkinsCount}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <p className="text-gray-500">
            Cost Charged {fromDate || toDate ? "Selected Period" : "Today"}</p>
          <p className="text-2xl font-bold">₹{costCharged.toFixed(0)}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <p className="text-gray-500">
            Parts Cost {fromDate || toDate ? "Selected Period" : "Today"}</p>
          <p className="text-2xl font-bold">
            ₹{partsCost.toFixed(0)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={stationFilter}
          onChange={e => setStationFilter(e.target.value)}
          className="border px-3 py-1 text-sm"
        >
          <option value="">All Stations</option>
          {Object.entries(stations).map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>

        <select
          value={engineerFilter}
          onChange={e => setEngineerFilter(e.target.value)}
          className="border px-3 py-1 text-sm"
        >
          <option value="">All Engineers</option>
          {Object.entries(engineers).map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>

        <input
          type="date"
          value={fromDate}
          onChange={e => setFromDate(e.target.value)}
          className="border px-3 py-1 text-sm"
        />
        <input
          type="date"
          value={toDate}
          onChange={e => setToDate(e.target.value)}
          className="border px-3 py-1 text-sm"
        />
      </div>

      {/* Table */}
      {loading ? (
        <p>Loading walk-ins…</p>
      ) : (
        <table className="w-full border bg-white text-sm">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2 border">Station</th>
              <th className="p-2 border">Bike</th>
              <th className="p-2 border">Model</th>
              <th className="p-2 border">Engineer</th>
              <th className="p-2 border">Parts Used</th>
              <th className="p-2 border">Parts Cost</th>
              <th className="p-2 border">Charged</th>
              <th className="p-2 border">Logged At</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map(w => (
              <tr key={w.id} className="border-t">
                <td className="p-2 border">{stations[w.station_id]}</td>
                <td className="p-2 border">{w.bike_number_text}</td>
                <td className="p-2 border">{models[w.model_id] || "-"}</td>
                <td className="p-2 border">{engineers[w.engineer_id]}</td>
                <td className="p-2 border">
                  {w.parts_used.length > 0
                    ? w.parts_used.join(", ")
                    : "-"}
                </td>
                <td className="p-2 border">₹{w.parts_cost}</td>
                <td className="p-2 border">₹{w.cost_charged}</td>
                <td className="p-2 border">
                  {new Date(w.logged_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </ManagerLayout>
  );
}
