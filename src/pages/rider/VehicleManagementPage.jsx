import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import RiderSidebar from "../../components/rider/RiderSidebar";
import StatusBadge from "../../components/common/StatusBadge";
import AssignVehicleModal from "../../components/rider/AssignVehicleModal";
import { useVehicles } from "../../hooks/useVehicles";
import { useTeamLeads } from "../../hooks/useTeamLeads";
import { useClients } from "../../hooks/useClients";

export default function VehicleManagementPage({ session }) {
    const { vehicles, loading, refetchVehicles } = useVehicles();
    const { teamLeads } = useTeamLeads();
    const { clients } = useClients();

    const [stations, setStations] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState(null);

    // Fetch stations
    useEffect(() => {
        async function fetchStations() {
            const { data } = await supabase.from("stations").select("*").order("name");
            setStations(data || []);
        }
        fetchStations();
    }, []);

    // Filter vehicles
    const filteredVehicles = vehicles.filter((vehicle) => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            vehicle.bike_number?.toLowerCase().includes(search) ||
            vehicle.model_name?.toLowerCase().includes(search) ||
            vehicle.assignee_name?.toLowerCase().includes(search) ||
            vehicle.battery_code?.toLowerCase().includes(search)
        );
    });

    async function handleUnassign(assignmentId) {
        if (!confirm("Are you sure you want to unassign this rider?")) return;

        try {
            // Delete the assignment record (no status column exists)
            const { error } = await supabase
                .from("rider_bike_assignments")
                .delete()
                .eq("id", assignmentId);

            if (error) throw error;

            alert("Vehicle unassigned successfully");
            refetchVehicles();
        } catch (err) {
            console.error("Error unassigning:", err);
            alert("Failed to unassign vehicle: " + err.message);
        }
    }

    function handleAssignClick(vehicle) {
        setSelectedVehicle(vehicle);
        setShowAssignModal(true);
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
                            Manage all vehicles ({filteredVehicles.length} total)
                        </p>
                    </div>

                    <div className="flex gap-3 items-center">
                        <span className="text-sm text-gray-600">
                            Welcome, {session?.user?.email}
                        </span>
                        <button
                            onClick={() => supabase.auth.signOut()}
                            className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                        >
                            🚪 Sign Out
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="mb-6">
                    <input
                        type="text"
                        placeholder="🔍 Search Vehicle"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
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
                                        Reg No
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                                        Battery No
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
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                            {vehicle.bike_number}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {vehicle.battery_code}
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
                                                        onClick={() => handleUnassign(vehicle.assignment_id)}
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
                                        <td className="px-4 py-3 text-center">
                                            <button className="text-gray-600 hover:text-gray-900">
                                                ⋯
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {filteredVehicles.length === 0 && (
                            <div className="text-center py-10 text-gray-500">
                                No vehicles found
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
            </div>
        </div>
    );
}
