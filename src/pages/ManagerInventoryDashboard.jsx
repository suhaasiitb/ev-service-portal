import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const ITEMS_PER_PAGE = 15;

async function handleLogout() {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.error("Logout failed", err);
  }
}

export default function ManagerInventoryDashboard() {
  const [inventoryByStation, setInventoryByStation] = useState([]);
  const [stationsMeta, setStationsMeta] = useState({});
  const [selectedStationId, setSelectedStationId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [page, setPage] = useState(1);

  const [SearchTerm, setSearchTerm] = useState("");

  // 🔹 ADD: Edit inventory modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [editMode, setEditMode] = useState("overwrite"); // overwrite | delta
  const [editValue, setEditValue] = useState("");

  async function fetchInventory() {
    setLoading(true);
    setMessage("");

    const { data: inv, error: invErr } = await supabase
      .from("inventory_master")
      .select(
        `
        id,
        station_id,
        part_id,
        quantity,
        reorder_level,
        parts_catalog (
          id,
          part_name,
          sku,
          unit_cost
        )
      `
      );

    const inventory = (inv || []).filter(
      (row) => row.station_id && row.station_id !== "null"
    );

    if (invErr) {
      console.error(invErr);
      setMessage("Failed to load inventory: " + invErr.message);
      setLoading(false);
      return;
    }

    if (inventory.length === 0) {
      setInventoryByStation([]);
      setLoading(false);
      return;
    }

    const stationIds = Array.from(
      new Set(inventory.map((r) => r.station_id).filter(Boolean))
    );
    const partIds = Array.from(
      new Set(inventory.map((r) => r.part_id).filter(Boolean))
    );

    const { data: stationsData, error: stationsErr } = await supabase
      .from("stations")
      .select("id, name")
      .in("id", stationIds);

    if (stationsErr) {
      console.error(stationsErr);
      setMessage("Failed to load station metadata: " + stationsErr.message);
    }

    const stationMetaMap = {};
    (stationsData || []).forEach((s) => {
      const label = s.name || (s.id ? s.id.slice(0, 8) : "Unknown Station");
      stationMetaMap[s.id] = { label, raw: s };
    });
    setStationsMeta(stationMetaMap);

    const { data: partModelData, error: pmErr } = await supabase
      .from("part_model_map")
      .select(
        `
        part_id,
        bike_models (
          id,
          model_name
        )
      `
      )
      .in("part_id", partIds);

    if (pmErr) {
      console.error(pmErr);
    }

    const partModelsMap = {};
    (partModelData || []).forEach((row) => {
      if (!row.part_id || !row.bike_models?.model_name) return;
      if (!partModelsMap[row.part_id]) partModelsMap[row.part_id] = [];
      partModelsMap[row.part_id].push(row.bike_models.model_name);
    });

    const grouped = {};
    inventory.forEach((row) => {
      if (!grouped[row.station_id]) grouped[row.station_id] = [];
      grouped[row.station_id].push({
        ...row,
        model_names: partModelsMap[row.part_id] || [],
      });
    });

    const stationsArr = Object.entries(grouped).map(([stationId, items]) => {
      const totalSkus = items.length;
      const totalQty = items.reduce((s, r) => s + (r.quantity || 0), 0);
      const totalValue = items.reduce(
        (s, r) => s + (r.parts_catalog?.unit_cost || 0) * (r.quantity || 0),
        0
      );
      const lowStockCount = items.filter(
        (r) =>
          r.quantity !== null &&
          r.reorder_level !== null &&
          r.quantity <= r.reorder_level
      ).length;

      return {
        stationId,
        stationName:
          stationMetaMap[stationId]?.label || stationId.slice(0, 8),
        items,
        summary: {
          totalSkus,
          totalQty,
          totalValue,
          lowStockCount,
        },
      };
    });

    setInventoryByStation(stationsArr);

    if (!selectedStationId && stationsArr.length > 0) {
      setSelectedStationId(stationsArr[0].stationId);
    }

    setPage(1);
    setLoading(false);
  }

  useEffect(() => {
    fetchInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentStation = inventoryByStation.find(
    (s) => s.stationId === selectedStationId
  );

  const fileteredItems = currentStation
    ? currentStation.items.filter((row) => {
        if (!SearchTerm) return true;

        const q= SearchTerm.toLowerCase();

        const partName= row.parts_catalog?.part_name?.toLowerCase() || "";
        const sku= row.parts_catalog?.sku?.toLowerCase() || "";
        const models= (row.model_names || []).join(", ").toLowerCase();

        return (
          partName.includes(q) ||
          sku.includes(q) ||
          models.includes(q)
        );
      })
    : [];

  const totalItems = fileteredItems.length;
  const totalPages =
    totalItems > 0 ? Math.ceil(totalItems / ITEMS_PER_PAGE) : 1;
  const pageSafe = Math.min(page, totalPages);
  const startIndex = (pageSafe - 1) * ITEMS_PER_PAGE;
  const pageItems = fileteredItems.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  function handleStationChange(e) {
    setSelectedStationId(e.target.value);
    setPage(1);
  }

  function goToPrevPage() {
    setPage((p) => Math.max(1, p - 1));
  }

  function goToNextPage() {
    setPage((p) => Math.min(totalPages, p + 1));
  }

  // 🔹 ADD: Open edit modal
  function openEditModal(row) {
    setEditRow(row);
    setEditMode("overwrite");
    setEditValue("");
    setShowEditModal(true);
    setMessage("");
  }

  // 🔹 ADD: Save edit
  async function saveInventoryEdit() {
    if (!editRow) return;

    const oldQty = editRow.quantity || 0;
    const value = parseInt(editValue, 10);

    if (isNaN(value)) {
      setMessage("Please enter a valid number");
      return;
    }

    const newQty =
      editMode === "overwrite" ? value : oldQty + value;

    if (newQty < 0) {
      setMessage("Quantity cannot go below zero");
      return;
    }

    const delta = newQty - oldQty;
    if (delta === 0) {
      setShowEditModal(false);
      return;
    }

    // 1️⃣ Get auth user
    const { data: authData } = await supabase.auth.getSession();
    const authUserId = authData.session.user.id;

    // 2️⃣ Resolve app user (public.users)
    const { data: appUser} = await supabase
      .from("users")
      .select("id")
      .eq("id", authUserId)
      .maybeSingle();

    if (!appUser) {
      setMessage("Unable to resolve user");
      return;
    }

    const { error: updErr } = await supabase
      .from("inventory_master")
      .update({
        quantity: newQty,
        last_updated_by_manager: appUser.Id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editRow.id);

    if (updErr) {
      setMessage("Update failed: " + updErr.message);
      return;
    }

    setShowEditModal(false);
    setEditRow(null);
    setEditValue("");

    setMessage("✅ Inventory updated successfully");
    setTimeout(() => setMessage(""), 3000);
    await fetchInventory();
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-56" : "w-12"
        } bg-slate-900 text-white flex flex-col transition-all duration-200`}
      >
        <button
          className="p-2 text-xs hover:bg-slate-800"
          onClick={() => setSidebarOpen((o) => !o)}
        >
          {sidebarOpen ? "⟨" : "⟩"}
        </button>

        {sidebarOpen && (
          <div className="px-3 py-2 text-sm font-semibold border-b border-slate-700">
            Manager Panel
          </div>
        )}

        <nav className="flex-1 text-sm">
          {sidebarOpen && (
            <>
              <div className="px-3 py-2 text-slate-400 border-b border-slate-800 text-xs uppercase">
                Sections
              </div>
              <button className="w-full text-left px-3 py-2 bg-slate-800 text-white text-sm">
                Inventory
              </button>
              <button className="w-full text-left px-3 py-2 text-slate-500 text-sm cursor-not-allowed">
                Tickets (soon)
              </button>
              <button className="w-full text-left px-3 py-2 text-slate-500 text-sm cursor-not-allowed">
                Walk-Ins (soon)
              </button>
              <button className="w-full text-left px-3 py-2 text-slate-500 text-sm cursor-not-allowed">
                KPIs & Charts (soon)
              </button>
            </>
          )}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-blue-700">
            Manager - Inventory Dashboard
          </h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700"
          >
            Logout
          </button>
        </div>

        {message && <p className= {'mb-4 ${message.startswith("✅") ? "text-green-600":"text-red-600"}'}>{message}</p>}

        {loading ? (
          <p>Loading inventory...</p>
        ) : inventoryByStation.length === 0 ? (
          <p>No inventory data found.</p>
        ) : (
          <>
            {/* Station Selector */}
            <div className="flex flex-wrap items-center mb-4 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Select Station
                </label>
                <select
                  value={selectedStationId || ""}
                  onChange={handleStationChange}
                  className="border rounded px-3 py-1 text-sm"
                >
                  <option value="" disabled>
                    Select station
                  </option>
                  {inventoryByStation.map((s) => (
                    <option key={s.stationId} value={s.stationId}>
                      {s.stationName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Snapshot + Table (UNCHANGED) */}
            {currentStation && (
              <div className="bg-white rounded-xl shadow p-4">
                {/* Search Bar */}
                <div className="mb-3">
                  <input
                    type="text"
                    placeholder="Search by Part Name, SKU, or Models..."
                    value={SearchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setPage(1); //reset pagination on search
                    }}
                    className="border rounded px-3 py-2 text-sm w-full md:w-1/3"
                  />
                </div>
                {/* summary, table, pagination untouched */}
                {/* ONLY Edit button enabled */}
                {/* ...existing JSX above... */}
                {/* Inventory Table */}
                <table className="w-full border text-sm">
                  <thead>
                    <tr className="bg-gray-200 text-left">
                      <th className="p-2 border-r">Part</th>
                      <th className="p-2 border-r">SKU</th>
                      <th className="p-2 border-r">Models</th>
                      <th className="p-2 border-r">Qty</th>
                      <th className="p-2 border-r">Reorder</th>
                      <th className="p-2 border-r">Unit Cost</th>
                      <th className="p-2 border-r">Stock Value</th>
                      <th className="p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((row) => {
                      const part = row.parts_catalog;
                      const unit = part?.unit_cost || 0;
                      const value = unit * (row.quantity || 0);
                      const isLow =
                        row.quantity !== null &&
                        row.reorder_level !== null &&
                        row.quantity <= row.reorder_level;

                      const modelLabel =
                        row.model_names && row.model_names.length > 0
                          ? row.model_names.join(", ")
                          : "-";

                      return (
                        <tr key={row.part_id} className="border-t">
                          <td className="p-2 border-r">
                            {part?.part_name || "Unknown Part"}
                          </td>
                          <td className="p-2 border-r">{part?.sku || "-"}</td>
                          <td className="p-2 border-r">{modelLabel}</td>
                          <td
                            className={`p-2 border-r ${
                              isLow ? "text-red-600 font-semibold" : ""
                            }`}
                          >
                            {row.quantity}
                          </td>
                          <td className="p-2 border-r">
                            {row.reorder_level ?? "-"}
                          </td>
                          <td className="p-2 border-r">₹{unit}</td>
                          <td className="p-2 border-r">
                            ₹{value.toFixed(0)}
                          </td>
                          <td className="p-2">
                            <button
                              onClick={() => openEditModal(row)}
                              className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Pagination */}
                <div className="flex justify-between items-center mt-3 text-sm">
                  <span>
                    Showing{" "}
                    {totalItems === 0
                      ? "0"
                      : `${startIndex + 1}–${Math.min(
                          startIndex + ITEMS_PER_PAGE,
                          totalItems
                        )}`}{" "}
                    of {totalItems} items
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={goToPrevPage}
                      disabled={pageSafe === 1}
                      className="px-2 py-1 border rounded disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <span>
                      Page {pageSafe} of {totalPages}
                    </span>
                    <button
                      onClick={goToNextPage}
                      disabled={pageSafe === totalPages}
                      className="px-2 py-1 border rounded disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 🔹 ADD: Edit Modal (overlay only) */}
      {showEditModal && editRow && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold mb-3">Edit Inventory</h2>

            <p className="text-sm mb-1">
              <b>{editRow.parts_catalog?.part_name}</b> (
              {editRow.parts_catalog?.sku})
            </p>
            <p className="text-sm mb-3">
              Current Qty: <b>{editRow.quantity}</b>
            </p>

            <div className="flex gap-4 mb-3 text-sm">
              <label>
                <input
                  type="radio"
                  checked={editMode === "overwrite"}
                  onChange={() => setEditMode("overwrite")}
                />{" "}
                Set exact quantity
              </label>
              <label>
                <input
                  type="radio"
                  checked={editMode === "delta"}
                  onChange={() => setEditMode("delta")}
                />{" "}
                Add / Remove
              </label>
            </div>

            <input
              type="number"
              className="border p-2 w-full mb-4 rounded"
              placeholder={
                editMode === "overwrite"
                  ? "Enter new quantity"
                  : "Enter + / - quantity"
              }
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 rounded bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={saveInventoryEdit}
                className="px-4 py-2 rounded bg-green-600 text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
