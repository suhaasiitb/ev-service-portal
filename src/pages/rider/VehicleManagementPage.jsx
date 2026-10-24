import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import RiderSidebar from "../../components/rider/RiderSidebar";
import StatusBadge from "../../components/common/StatusBadge";
import AssignVehicleModal from "../../components/rider/AssignVehicleModal";
import UnassignVehicleModal from "../../components/rider/UnassignVehicleModal";
import ChangeStationModal from "../../components/rider/ChangeStationModal";
import { useVehicles } from "../../hooks/useVehicles";
import { useTeamLeads } from "../../hooks/useTeamLeads";
import { useClients } from "../../hooks/useClients";

export default function VehicleManagementPage({ session }) {
    const { vehicles, loading, refetchVehicles } = useVehicles();
    const { teamLeads } = useTeamLeads();
    const { clients } = useClients();

    const [stations, setStations] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'active' | 'idle'
    const [activeFirst, setActiveFirst] = useState(true); // Toggle to place active/assigned vehicles first
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showUnassignModal, setShowUnassignModal] = useState(false);
    const [showChangeStationModal, setShowChangeStationModal] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [activeMenuId, setActiveMenuId] = useState(null);
    const [submittingPdi, setSubmittingPdi] = useState(null); // stores bike_id being processed

    // Fetch stations
    useEffect(() => {
        async function fetchStations() {
            const { data } = await supabase.from("stations").select("*").order("name");
            setStations(data || []);
        }
        fetchStations();
    }, []);

    // Helper to determine if vehicle has an active assignment
    const isVehicleActive = (v) => v.assignment_status === "active";

    // Counts for active (with assignee) and idle
    const activeCount = vehicles.filter(isVehicleActive).length;
    const idleCount = vehicles.length - activeCount;

    // Filter and sort vehicles
    const filteredVehicles = vehicles
        .filter((vehicle) => {
            const isActive = isVehicleActive(vehicle);

            // Status filter
            if (statusFilter === "active" && !isActive) return false;
            if (statusFilter === "idle" && isActive) return false;

            // Search filter
            if (!searchTerm) return true;
            const search = searchTerm.toLowerCase();
            const stationName = stations.find((s) => s.id === vehicle.station_id)?.name || "";
            return (
                vehicle.bike_number?.toLowerCase().includes(search) ||
                vehicle.model_name?.toLowerCase().includes(search) ||
                vehicle.assignee_name?.toLowerCase().includes(search) ||
                vehicle.battery_code?.toLowerCase().includes(search) ||
                stationName.toLowerCase().includes(search)
            );
        })
        .sort((a, b) => {
            if (activeFirst) {
                const aIsActive = isVehicleActive(a) ? 1 : 0;
                const bIsActive = isVehicleActive(b) ? 1 : 0;
                if (aIsActive !== bIsActive) {
                    return bIsActive - aIsActive; // Active / assigned (1) appears before idle (0)
                }
            }
            // Secondary alphabetical/numerical sort by bike number
            return (a.bike_number || "").localeCompare(b.bike_number || "", undefined, { numeric: true });
        });

    function handleUnassignClick(vehicle) {
        setSelectedVehicle(vehicle);
        setShowUnassignModal(true);
    }

    function handleAssignClick(vehicle) {
        setSelectedVehicle(vehicle);
        setShowAssignModal(true);
    }

    async function handleRaisePdi(vehicle) {
        if (!vehicle.station_id) {
            alert("This vehicle has no assigned station. Please assign a station first.");
            return;
        }

        if (!confirm(`Send vehicle ${vehicle.bike_number} for PDI?`)) return;

        setSubmittingPdi(vehicle.id);
        setActiveMenuId(null);

        try {
            const { error } = await supabase.from("pdi_requests").insert({
                bike_id: vehicle.id,
                station_id: vehicle.station_id,
                status: "pending",
                // assignment_id remains null for idle vehicles
            });

            if (error) throw error;

            alert("✅ PDI request raised successfully!");
            refetchVehicles();
        } catch (err) {
            console.error("Error raising PDI:", err);
            alert("❌ Failed: " + err.message);
        } finally {
            setSubmittingPdi(null);
        }
    }

    function toggleMenu(id) {
        setActiveMenuId(activeMenuId === id ? null : id);
    }



    return (
        <div className="flex min-h-screen bg-gray-50">
            <RiderSidebar />

            <div className="flex-1 p-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            Vehicle Management
                        </h1>
                        <p className="text-gray-600 mt-1">
                            Manage all vehicles ({vehicles.length} total • <span className="text-emerald-700 font-semibold">{activeCount} active with assignee</span> • <span className="text-gray-600 font-medium">{idleCount} idle</span>)
                        </p>
                    </div>

                    <div className="flex gap-3 items-center">
                        <span className="text-sm text-gray-600 font-bold">
                            Welcome, {session?.user?.email}
                        </span>
                    </div>
                </div>

                {/* Search Bar & Filters */}
                <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex flex-1 flex-wrap gap-3 items-center w-full md:w-auto">
                        <input
                            type="text"
                            placeholder="🔍 Search Chassis, Model, Assignee, Station..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full md:w-72 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                        />

                        {/* Status Filter Segmented Controls */}
                        <div className="flex items-center gap-1 bg-gray-200/80 p-1 rounded-xl">
                            <button
                                type="button"
                                onClick={() => setStatusFilter("all")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    statusFilter === "all"
                                        ? "bg-white text-gray-900 shadow-xs"
                                        : "text-gray-600 hover:text-gray-900"
                                }`}
                            >
                                All ({vehicles.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter("active")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                    statusFilter === "active"
                                        ? "bg-emerald-600 text-white shadow-xs"
                                        : "text-gray-600 hover:text-gray-900"
                                }`}
                            >
                                <span className={`w-2 h-2 rounded-full ${statusFilter === "active" ? "bg-white" : "bg-emerald-500"}`}></span>
                                Active / Assigned ({activeCount})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter("idle")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                    statusFilter === "idle"
                                        ? "bg-blue-600 text-white shadow-xs"
                                        : "text-gray-600 hover:text-gray-900"
                                }`}
                            >
                                <span className={`w-2 h-2 rounded-full ${statusFilter === "idle" ? "bg-white" : "bg-blue-500"}`}></span>
                                Idle ({idleCount})
                            </button>
                        </div>

                        {/* Active First Sort Toggle */}
                        <button
                            type="button"
                            onClick={() => setActiveFirst(prev => !prev)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer ${
                                activeFirst
                                    ? "bg-blue-50 border-blue-300 text-blue-700 shadow-2xs"
                                    : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
                            }`}
                            title="Toggle to view active vehicles with assignees first"
                        >
                            <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                                activeFirst ? "bg-blue-600 text-white" : "border border-gray-400 text-transparent"
                            }`}>
                                ✓
                            </span>
                            <span>Active First</span>
                        </button>
                    </div>

                    <div className="text-xs text-gray-500 font-medium">
                        Showing {filteredVehicles.length} of {vehicles.length} vehicles
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="text-center py-10">Loading vehicles...</div>
                ) : (
                    <div className="bg-white rounded-xl shadow overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-100 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                                        Chassis No
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                                        Model
                                    </th>

                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                                        Station
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                                        Assignee
                                    </th>
                                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredVehicles.map((vehicle) => (
                                    <tr key={vehicle.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                            {vehicle.bike_number}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {vehicle.model_name}
                                        </td>

                                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                                            {stations.find(s => s.id === vehicle.station_id)?.name || "Unassigned"}
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusBadge status={vehicle.assignment_status} />
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {vehicle.assignment_status === "active" ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                                                        {vehicle.assignee_name}
                                                    </span>
                                                    <button
                                                        onClick={() => handleUnassignClick(vehicle)}
                                                        className="text-red-500 hover:text-red-700 font-bold"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleAssignClick(vehicle)}
                                                    className="text-blue-600 hover:text-blue-800 text-xl font-bold"
                                                >
                                                    +
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center relative">
                                            <button
                                                onClick={() => toggleMenu(vehicle.id)}
                                                className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors"
                                            >
                                                ⋯
                                            </button>

                                            {activeMenuId === vehicle.id && (
                                                <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-white border border-gray-100 shadow-xl rounded-2xl py-2 w-48 z-10 animate-in fade-in slide-in-from-right-2 duration-200">
                                                    {vehicle.assignment_status === "idle" && (
                                                        <button
                                                            onClick={() => vehicle.has_pending_pdi ? null : handleRaisePdi(vehicle)}
                                                            disabled={submittingPdi === vehicle.id || vehicle.has_pending_pdi}
                                                            className={`w-full px-4 py-2.5 text-left text-sm font-bold flex items-center gap-2 ${vehicle.has_pending_pdi ? "text-gray-400 cursor-not-allowed hover:bg-white" : "text-gray-700 hover:bg-gray-50"}`}
                                                        >
                                                            📋 {submittingPdi === vehicle.id ? "Sending..." : vehicle.has_pending_pdi ? "PDI Raised" : "Send for PDI"}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            setSelectedVehicle(vehicle);
                                                            setShowChangeStationModal(true);
                                                            setActiveMenuId(null);
                                                        }}
                                                        className="w-full px-4 py-2.5 text-left text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                    >
                                                        ⚙️ Change Station
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {filteredVehicles.length === 0 && (
                            <div className="text-center py-12 text-gray-500 font-medium">
                                No vehicles found matching current filter or search criteria.
                            </div>
                        )}
                    </div>
                )}

                {/* Modal */}
                <AssignVehicleModal
                    open={showAssignModal}
                    onClose={() => {
                        setShowAssignModal(false);
                        setSelectedVehicle(null);
                    }}
                    onSuccess={refetchVehicles}
                    prefilledBikeId={selectedVehicle?.id}
                    stations={stations}
                    teamLeads={teamLeads}
                    clients={clients}
                />

                <UnassignVehicleModal
                    open={showUnassignModal}
                    onClose={() => {
                        setShowUnassignModal(false);
                        setSelectedVehicle(null);
                    }}
                    onSuccess={refetchVehicles}
                    assignmentId={selectedVehicle?.assignment_id}
                    bikeId={selectedVehicle?.id}
                    stationId={selectedVehicle?.station_id}
                    session={session}
                />
                {/* Change Station Modal */}
                <ChangeStationModal
                    open={showChangeStationModal}
                    onClose={() => {
                        setShowChangeStationModal(false);
                        setSelectedVehicle(null);
                    }}
                    onSuccess={refetchVehicles}
                    vehicle={selectedVehicle}
                    stations={stations}
                />
            </div>
        </div>
    );
}
