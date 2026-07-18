import { useState } from "react";
import RiderSidebar from "../../components/rider/RiderSidebar";
import { useAssignmentTracking } from "../../hooks/useAssignmentTracking";
import AddRentModal from "../../components/rider/AddRentModal";
import BulkRentUploadModal from "../../components/rider/BulkRentUploadModal";
import AddRentQRModal from "../../components/rider/AddRentQRModal";
import AddWaiverModal from "../../components/rider/AddWaiverModal";
import AddChallanModal from "../../components/rider/AddChallanModal";
import AddRefundModal from "../../components/rider/AddRefundModal";
import AddDepositModal from "../../components/rider/AddDepositModal";

export default function AssignmentTrackingPage({ session }) {
    const { assignments, loading, error, refetchAssignments } = useAssignmentTracking();
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");

    // Modal state
    const [showAddRentModal, setShowAddRentModal] = useState(false);
    const [showAddRentQRModal, setShowAddRentQRModal] = useState(false);
    const [showAddWaiverModal, setShowAddWaiverModal] = useState(false);
    const [showAddChallanModal, setShowAddChallanModal] = useState(false);
    const [showAddRefundModal, setShowAddRefundModal] = useState(false);
    const [showAddDepositModal, setShowAddDepositModal] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [showBulkModal, setShowBulkModal] = useState(false);

    // Filter assignments
    const filteredAssignments = assignments.filter((assignment) => {
        // Status filter
        if (statusFilter !== "All" && assignment.status !== statusFilter) {
            return false;
        }

        // Search text filter
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            assignment.name?.toLowerCase().includes(search) ||
            assignment.aadhar_no?.toLowerCase().includes(search) ||
            assignment.phone?.toLowerCase().includes(search) ||
            assignment.bike_number?.toLowerCase().includes(search)
        );
    });

    return (
        <div className="flex min-h-screen bg-gray-50">
            <RiderSidebar />

            <div className="flex-1 p-8 flex flex-col h-screen overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            Assignment Tracking
                        </h1>
                        <p className="text-gray-600 mt-1">
                            Track and manage all rider-vehicle assignments
                        </p>
                    </div>

                    <div className="flex gap-3 items-center">
                        <span className="text-sm text-gray-600 font-bold hidden md:block">
                            Welcome, {session?.user?.email}
                        </span>
                        <button
                            onClick={() => setShowBulkModal(true)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-md shadow-indigo-500/20"
                        >
                            📤 Bulk Rent Upload
                        </button>
                    </div>
                </div>

                {/* Search Bar & Filters */}
                <div className="mb-6 shrink-0 flex flex-col md:flex-row gap-4 items-center">
                    <input
                        type="text"
                        placeholder="🔍 Search by Name, Aadhar, Phone, or Vehicle No"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-700">Status:</span>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                            <option value="All">All</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 bg-white rounded-xl shadow overflow-hidden flex flex-col">
                    {loading ? (
                        <div className="flex-1 flex items-center justify-center text-gray-500">
                            Loading assignments...
                        </div>
                    ) : error ? (
                        <div className="flex-1 flex items-center justify-center text-red-500">
                            {error}
                        </div>
                    ) : (
                        <div className="overflow-auto flex-1">
                            <table className="w-full whitespace-nowrap table-fixed" style={{ minWidth: "3200px" }}>
                                <thead className="bg-gray-100 border-b border-gray-200 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-[120px]">Aadhar No</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-[150px]">Name</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-[120px]">Contact</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-[120px]">Client</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-[120px]">Client ID</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-[150px]">Vehicle No.</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-[150px]">Battery Mode</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-blue-600 w-[150px]">Status</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-[120px]">TL</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-[100px]">Deposit</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-blue-600 w-[150px]">Rental First Date</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-[150px]">Offboarding Date</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-[200px]">Reason for Offboarding</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-blue-600 w-[120px]">Rental Amount</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-blue-600 w-[150px]">Rent Received</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-blue-600 w-[150px]">Rent Received QR</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-blue-600 w-[120px]">Waiver Amount</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-blue-600 w-[120px]">Traffic Challan</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-blue-600 w-[120px]">Damage Charges</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-blue-600 w-[150px]">Difference Amount</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-blue-600 w-[120px]">Rental Status</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-blue-600 w-[120px]">Refund Status</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-blue-600 w-[120px]">Refund Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredAssignments.map((row) => (
                                        <tr key={row.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm text-gray-900 truncate" title={row.aadhar_no}>{row.aadhar_no}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900 font-medium truncate" title={row.name}>{row.name}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 truncate" title={row.phone}>{row.phone}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 truncate" title={row.client_name}>{row.client_name}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 truncate" title={row.clientele_id}>{row.clientele_id}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900 font-medium truncate" title={row.bike_number}>{row.bike_number}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 truncate" title={row.battery_mode}>{row.battery_mode}</td>
                                            <td className="px-4 py-3 text-sm text-gray-400 text-center truncate">{row.status}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 truncate" title={row.team_lead_name}>{row.team_lead_name}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900 font-bold truncate">
                                                <div className="flex items-center gap-2">
                                                    <span>₹{row.deposit_collected}</span>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedAssignment(row);
                                                            setShowAddDepositModal(true);
                                                        }}
                                                        className="w-5 h-5 rounded-full bg-yellow-50 text-yellow-600 border border-yellow-200 shadow-sm flex shrink-0 items-center justify-center text-sm font-bold hover:bg-yellow-100 hover:scale-105 transition-all"
                                                        title="Add Extra Deposit"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-400 text-center truncate">{row.rental_first_date}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 truncate">{row.unassigned_at}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 truncate" title={row.unassign_reason}>{row.unassign_reason}</td>
                                            <td className="px-4 py-3 text-sm text-gray-400 text-center truncate">{row.rental_amount}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900 font-bold text-center truncate">
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className="truncate" title={row.rent_received}>{row.rent_received}</span>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedAssignment(row);
                                                            setShowAddRentModal(true);
                                                        }}
                                                        className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 shadow-sm flex shrink-0 items-center justify-center text-sm font-bold hover:bg-blue-100 hover:scale-105 transition-all"
                                                        title="Add Rent"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900 font-bold text-center truncate">
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className="truncate" title={row.rent_received_qr}>{row.rent_received_qr}</span>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedAssignment(row);
                                                            setShowAddRentQRModal(true);
                                                        }}
                                                        className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 shadow-sm flex shrink-0 items-center justify-center text-sm font-bold hover:bg-indigo-100 hover:scale-105 transition-all"
                                                        title="Add QR Rent"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900 font-bold text-center truncate">
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className="truncate" title={row.waiver_amount}>{row.waiver_amount}</span>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedAssignment(row);
                                                            setShowAddWaiverModal(true);
                                                        }}
                                                        className="w-5 h-5 rounded-full bg-red-50 text-red-600 border border-red-200 shadow-sm flex shrink-0 items-center justify-center text-sm font-bold hover:bg-red-100 hover:scale-105 transition-all"
                                                        title="Add Waiver"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900 font-bold text-center truncate">
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className="truncate" title={row.traffic_challan}>{row.traffic_challan}</span>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedAssignment(row);
                                                            setShowAddChallanModal(true);
                                                        }}
                                                        className="w-5 h-5 rounded-full bg-orange-50 text-orange-600 border border-orange-200 shadow-sm flex shrink-0 items-center justify-center text-sm font-bold hover:bg-orange-100 hover:scale-105 transition-all"
                                                        title="Add Challan"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-400 text-center truncate">{row.damage_charges}</td>
                                            <td className={`px-4 py-3 text-sm font-bold text-center truncate ${row.raw_difference < 0 ? "text-red-600" : "text-green-600"}`}>
                                                {row.difference_amount}
                                            </td>
                                            <td className={`px-4 py-3 text-sm font-bold text-center truncate ${row.raw_difference < 0 ? "text-red-600" : "text-green-600"}`}>
                                                {row.rental_status}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900 font-bold text-center truncate">
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className="truncate" title={row.refund_status}>{row.refund_status}</span>
                                                    {row.status === "Inactive" && (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedAssignment(row);
                                                                setShowAddRefundModal(true);
                                                            }}
                                                            className="w-5 h-5 rounded-full bg-teal-50 text-teal-600 border border-teal-200 shadow-sm flex shrink-0 items-center justify-center text-sm font-bold hover:bg-teal-100 hover:scale-105 transition-all"
                                                            title="Update Refund"
                                                        >
                                                            +
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-400 text-center truncate">{row.refund_date}</td>
                                        </tr>
                                    ))}
                                    {filteredAssignments.length === 0 && (
                                        <tr>
                                            <td colSpan="22" className="px-4 py-8 text-center text-gray-500">
                                                No assignments found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <AddRentModal
                open={showAddRentModal}
                assignment={selectedAssignment}
                onClose={() => {
                    setShowAddRentModal(false);
                    setSelectedAssignment(null);
                }}
                onSuccess={() => {
                    setShowAddRentModal(false);
                    setSelectedAssignment(null);
                    refetchAssignments();
                }}
            />

            <AddRentQRModal
                open={showAddRentQRModal}
                assignment={selectedAssignment}
                onClose={() => {
                    setShowAddRentQRModal(false);
                    setSelectedAssignment(null);
                }}
                onSuccess={() => {
                    setShowAddRentQRModal(false);
                    setSelectedAssignment(null);
                    refetchAssignments();
                }}
            />

            <AddWaiverModal
                open={showAddWaiverModal}
                assignment={selectedAssignment}
                onClose={() => {
                    setShowAddWaiverModal(false);
                    setSelectedAssignment(null);
                }}
                onSuccess={() => {
                    setShowAddWaiverModal(false);
                    setSelectedAssignment(null);
                    refetchAssignments();
                }}
            />

            <AddChallanModal
                open={showAddChallanModal}
                assignment={selectedAssignment}
                onClose={() => {
                    setShowAddChallanModal(false);
                    setSelectedAssignment(null);
                }}
                onSuccess={() => {
                    setShowAddChallanModal(false);
                    setSelectedAssignment(null);
                    refetchAssignments();
                }}
            />

            <AddRefundModal
                open={showAddRefundModal}
                assignment={selectedAssignment}
                onClose={() => {
                    setShowAddRefundModal(false);
                    setSelectedAssignment(null);
                }}
                onSuccess={() => {
                    setShowAddRefundModal(false);
                    setSelectedAssignment(null);
                    refetchAssignments();
                }}
            />

            <AddDepositModal
                open={showAddDepositModal}
                assignment={selectedAssignment}
                onClose={() => {
                    setShowAddDepositModal(false);
                    setSelectedAssignment(null);
                }}
                onSuccess={() => {
                    setShowAddDepositModal(false);
                    setSelectedAssignment(null);
                    refetchAssignments();
                }}
            />

            <BulkRentUploadModal
                open={showBulkModal}
                onClose={() => setShowBulkModal(false)}
                onSuccess={() => {
                    setShowBulkModal(false);
                    refetchAssignments();
                }}
            />
        </div>
    );
}

