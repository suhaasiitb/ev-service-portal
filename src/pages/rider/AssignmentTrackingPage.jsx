import { useState } from "react";
import RiderSidebar from "../../components/rider/RiderSidebar";
import { useAssignmentTracking } from "../../hooks/useAssignmentTracking";

export default function AssignmentTrackingPage({ session }) {
    const { assignments, loading, error } = useAssignmentTracking();
    const [searchTerm, setSearchTerm] = useState("");

    // Filter assignments
    const filteredAssignments = assignments.filter((assignment) => {
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
                        <span className="text-sm text-gray-600 font-bold">
                            Welcome, {session?.user?.email}
                        </span>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="mb-6 shrink-0">
                    <input
                        type="text"
                        placeholder="🔍 Search by Name, Aadhar, Phone, or Vehicle No"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
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
                            <table className="w-full whitespace-nowrap">
                                <thead className="bg-gray-100 border-b border-gray-200 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Aadhar No</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Contact</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Client</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Client ID</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Vehicle No.</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 text-blue-600">Status(Active/Inactive)</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">TL</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Deposit</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 text-blue-600">Rental First Date</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Offboarding Date</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Reason for Offboarding</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 text-blue-600">Rental Amount</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 text-blue-600">Rent Received</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 text-blue-600">Rent Received QR</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 text-blue-600">Waiver Amount</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 text-blue-600">Traffic Challan</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 text-blue-600">Damage Charges</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 text-blue-600">Difference Amount</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 text-blue-600">Rental Status</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 text-blue-600">Refund Status</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 text-blue-600">Refund Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredAssignments.map((row) => (
                                        <tr key={row.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm text-gray-900">{row.aadhar_no}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900 font-medium">{row.name}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{row.phone}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{row.client_name}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{row.clientele_id}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900 font-medium">{row.bike_number}</td>
                                            <td className="px-4 py-3 text-sm text-gray-400 text-center">{row.status}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{row.team_lead_name}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900">₹{row.deposit_collected}</td>
                                            <td className="px-4 py-3 text-sm text-gray-400 text-center">{row.rental_first_date}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{row.unassigned_at}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 truncate max-w-xs" title={row.unassign_reason}>{row.unassign_reason}</td>
                                            <td className="px-4 py-3 text-sm text-gray-400 text-center">{row.rental_amount}</td>
                                            <td className="px-4 py-3 text-sm text-gray-400 text-center">{row.rent_received}</td>
                                            <td className="px-4 py-3 text-sm text-gray-400 text-center">{row.rent_received_qr}</td>
                                            <td className="px-4 py-3 text-sm text-gray-400 text-center">{row.waiver_amount}</td>
                                            <td className="px-4 py-3 text-sm text-gray-400 text-center">{row.traffic_challan}</td>
                                            <td className="px-4 py-3 text-sm text-gray-400 text-center">{row.damage_charges}</td>
                                            <td className="px-4 py-3 text-sm text-gray-400 text-center">{row.difference_amount}</td>
                                            <td className="px-4 py-3 text-sm text-gray-400 text-center">{row.rental_status}</td>
                                            <td className="px-4 py-3 text-sm text-gray-400 text-center">{row.refund_status}</td>
                                            <td className="px-4 py-3 text-sm text-gray-400 text-center">{row.refund_date}</td>
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
        </div>
    );
}

