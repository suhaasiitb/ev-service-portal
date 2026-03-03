import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import RiderSidebar from "../../components/rider/RiderSidebar";
import StatusBadge from "../../components/common/StatusBadge";
import CreateRiderModal from "../../components/rider/CreateRiderModal";
import AssignVehicleModal from "../../components/rider/AssignVehicleModal";
import UnassignVehicleModal from "../../components/rider/UnassignVehicleModal";
import EditRiderModal from "../../components/rider/EditRiderModal";
import EditAssignmentModal from "../../components/rider/EditAssignmentModal";
import { useRiders } from "../../hooks/useRiders";
import { useTeamLeads } from "../../hooks/useTeamLeads";
import { useClients } from "../../hooks/useClients";

export default function RiderManagementPage({ session }) {
    const { riders, loading, refetchRiders } = useRiders();

    const [stations, setStations] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showUnassignModal, setShowUnassignModal] = useState(false);
    const [showEditRiderModal, setShowEditRiderModal] = useState(false);
    const [showEditAssignModal, setShowEditAssignModal] = useState(false);

    const [selectedRider, setSelectedRider] = useState(null);
    const [activeMenuId, setActiveMenuId] = useState(null);

    // Fetch stations
    useEffect(() => {
        async function fetchStations() {
            const { data } = await supabase.from("stations").select("*").order("name");
            setStations(data || []);
        }
        fetchStations();
    }, []);

    // Filter riders
    const filteredRiders = riders.filter((rider) => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            rider.name?.toLowerCase().includes(search) ||
            rider.phone?.includes(search) ||
            rider.clientele_id?.toLowerCase().includes(search)
        );
    });

    function handleUnassignClick(rider) {
        setSelectedRider(rider);
        setShowUnassignModal(true);
    }

    function handleAssignClick(rider) {
        setSelectedRider(rider);
        setShowAssignModal(true);
    }

    function toggleMenu(id) {
        setActiveMenuId(activeMenuId === id ? null : id);
    }

    return (
        <div className="flex min-h-screen bg-gray-50 font-sans">
            <RiderSidebar />

            <div className="flex-1 p-8">
                {/* Header */}
                <div className="flex justify-between items-end mb-10">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight">Rider Desk</h1>
                        <p className="text-gray-500 font-medium mt-1">
                            Operational fleet overview ({filteredRiders.length} units)
                        </p>
                    </div>

                    <div className="flex gap-4 items-center">
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all flex items-center gap-2"
                        >
                            <span className="text-xl">＋</span> Create New Rider
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="mb-8 flex gap-4">
                    <div className="relative flex-1 max-w-md">
                        <input
                            type="text"
                            placeholder="Search by name, phone or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">🔍</span>
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-gray-400 font-bold">Synchronizing fleet data...</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-[2rem] shadow-2xl shadow-gray-200/50 overflow-hidden border border-gray-100">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest">Rider Aadhar</th>
                                    <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest">Rider Name</th>
                                    <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest">Client / ID</th>
                                    <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest">Team Lead</th>
                                    <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest">Vehicle</th>
                                    <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-5 text-center text-[11px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredRiders.map((rider) => (
                                    <tr key={rider.id} className="group hover:bg-blue-50/30 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs text-gray-400">{rider.aadhar_no || "N/A"}</td>
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-gray-900">{rider.name}</p>
                                            <p className="text-xs text-gray-400 font-medium">{rider.phone}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-bold text-gray-700">{rider.client_name}</p>
                                            <p className="text-[10px] text-blue-500 font-black uppercase tracking-tighter">{rider.clientele_id}</p>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-600">{rider.team_lead_name}</td>
                                        <td className="px-6 py-4">
                                            {rider.assignment_status === "active" ? (
                                                <div className="inline-flex items-center gap-2 bg-white border border-blue-100 px-3 py-1.5 rounded-xl shadow-sm">
                                                    <span className="text-xs font-black text-blue-600">{rider.assigned_vehicle}</span>
                                                    <button
                                                        onClick={() => handleUnassignClick(rider)}
                                                        className="w-5 h-5 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all text-[10px] font-black"
                                                        title="Unassign Vehicle"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleAssignClick(rider)}
                                                    className="w-10 h-10 flex items-center justify-center rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all text-xl font-light"
                                                    title="Assign Vehicle"
                                                >
                                                    ＋
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={rider.assignment_status} />
                                        </td>
                                        <td className="px-6 py-4 text-center relative">
                                            <button
                                                onClick={() => toggleMenu(rider.id)}
                                                className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors"
                                            >
                                                ⋯
                                            </button>

                                            {activeMenuId === rider.id && (
                                                <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-white border border-gray-100 shadow-xl rounded-2xl py-2 w-48 z-10 animate-in fade-in slide-in-from-right-2 duration-200">
                                                    <button
                                                        onClick={() => { setShowEditRiderModal(true); setSelectedRider(rider); setActiveMenuId(null); }}
                                                        className="w-full px-4 py-2.5 text-left text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                    >
                                                        👤 Edit Rider Info
                                                    </button>
                                                    {rider.assignment_id && (
                                                        <button
                                                            onClick={() => { setShowEditAssignModal(true); setSelectedRider(rider); setActiveMenuId(null); }}
                                                            className="w-full px-4 py-2.5 text-left text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                        >
                                                            🚲 Modify Assignment
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {filteredRiders.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 gap-2">
                                <span className="text-4xl">🏜️</span>
                                <p className="text-gray-400 font-bold">No riders found in the system</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Modals */}
                <CreateRiderModal
                    open={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={refetchRiders}
                    stations={stations}
                />

                <EditRiderModal
                    open={showEditRiderModal}
                    onClose={() => { setShowEditRiderModal(false); setSelectedRider(null); }}
                    onSuccess={refetchRiders}
                    rider={selectedRider}
                />

                <AssignVehicleModal
                    open={showAssignModal}
                    onClose={() => {
                        setShowAssignModal(false);
                        setSelectedRider(null);
                    }}
                    onSuccess={refetchRiders}
                    prefilledRiderId={selectedRider?.id}
                    stations={stations}
                />

                <UnassignVehicleModal
                    open={showUnassignModal}
                    onClose={() => {
                        setShowUnassignModal(false);
                        setSelectedRider(null);
                    }}
                    onSuccess={refetchRiders}
                    assignmentId={selectedRider?.assignment_id}
                    bikeId={selectedRider?.bike_id}
                    stationId={selectedRider?.station_id}
                    session={session}
                />

                <EditAssignmentModal
                    open={showEditAssignModal}
                    onClose={() => {
                        setShowEditAssignModal(false);
                        setSelectedRider(null);
                    }}
                    onSuccess={refetchRiders}
                    assignmentId={selectedRider?.assignment_id}
                    stations={stations}
                />
            </div>
        </div>
    );
}
