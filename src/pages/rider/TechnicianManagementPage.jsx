import { useState, useEffect } from "react";
import RiderSidebar from "../../components/rider/RiderSidebar";
import PendingApprovalsTab from "../../components/technician/PendingApprovalsTab";
import AttendanceHistoryTab from "../../components/technician/AttendanceHistoryTab";
import TechnicianDetailsDrawer from "../../components/technician/TechnicianDetailsDrawer";
import RejectAttendanceModal from "../../components/technician/RejectAttendanceModal";
import { useTechnicianAttendance } from "../../hooks/useTechnicianAttendance";

export default function TechnicianManagementPage({ session }) {
    // For now, passing null to fetch all stations, or pass manager's station ID if applicable
    const { attendance, pendingCount, loading, refetchAttendance, approveAttendance, disapproveAttendance } = useTechnicianAttendance(null);
    const [activeTab, setActiveTab] = useState("pending"); // "pending" or "history"
    
    // Modals & Drawers state
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [rejectRecord, setRejectRecord] = useState(null);
    const [rejectIsCheckOut, setRejectIsCheckOut] = useState(false);

    // Filter data for dashboard cards
    const today = new Date().toISOString().split("T")[0];
    const todayRecords = attendance.filter(r => r.date === today);
    const presentTodayCount = todayRecords.length;
    const approvedTodayCount = todayRecords.filter(r => r.approval_status === "approved").length;
    const disapprovedTodayCount = todayRecords.filter(r => r.approval_status === "rejected").length;

    const handleApprove = async (record, isCheckOut = false) => {
        if (!confirm("Are you sure you want to approve this attendance?")) return;
        const { error } = await approveAttendance(record.id, session?.user?.id, isCheckOut);
        if (error) alert("Failed to approve: " + error.message);
        else alert("✅ Successfully approved!");
    };

    const handleRejectClick = (record, isCheckOut = false) => {
        setRejectRecord(record);
        setRejectIsCheckOut(isCheckOut);
        setRejectModalOpen(true);
    };

    const handleConfirmReject = async (reason) => {
        const { error } = await disapproveAttendance(rejectRecord.id, session?.user?.id, reason, rejectIsCheckOut);
        if (error) alert("Failed to reject: " + error.message);
        else {
            alert("❌ Successfully rejected!");
            setRejectModalOpen(false);
            setRejectRecord(null);
        }
    };

    const openDrawer = (record) => {
        setSelectedRecord(record);
        setDrawerOpen(true);
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            <RiderSidebar />

            <div className="flex-1 p-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Technician Management</h1>
                        <p className="text-gray-600 mt-1">Manage shift tracking and attendance approvals</p>
                    </div>
                </div>

                {/* Dashboard Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                        <div className="text-sm font-semibold text-gray-500 mb-1">Total Present Today</div>
                        <div className="text-3xl font-bold text-gray-900">{presentTodayCount}</div>
                    </div>
                    <div className="bg-amber-50 rounded-xl shadow-sm border border-amber-200 p-5">
                        <div className="text-sm font-semibold text-amber-700 mb-1 flex items-center gap-2">
                            Pending Approvals
                            {pendingCount > 0 && <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{pendingCount}</span>}
                        </div>
                        <div className="text-3xl font-bold text-amber-600">{pendingCount}</div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                        <div className="text-sm font-semibold text-gray-500 mb-1">Approved Shifts (Today)</div>
                        <div className="text-3xl font-bold text-green-600">{approvedTodayCount}</div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                        <div className="text-sm font-semibold text-gray-500 mb-1">Disapproved Shifts (Today)</div>
                        <div className="text-3xl font-bold text-red-600">{disapprovedTodayCount}</div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 mb-6 gap-6">
                    <button
                        onClick={() => setActiveTab("pending")}
                        className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === "pending" ? "border-amber-500 text-amber-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                    >
                        Pending Approvals Queue
                        {pendingCount > 0 && (
                            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs">{pendingCount}</span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab("history")}
                        className={`pb-4 text-sm font-bold border-b-2 transition-colors ${activeTab === "history" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                    >
                        Attendance History & Roster
                    </button>
                </div>

                {/* Main Content */}
                {loading ? (
                    <div className="text-center py-20 text-gray-500 font-medium">Loading attendance data...</div>
                ) : (
                    <div>
                        {activeTab === "pending" && (
                            <PendingApprovalsTab 
                                attendance={attendance} 
                                onApprove={handleApprove}
                                onReject={handleRejectClick}
                                onViewDetails={openDrawer}
                            />
                        )}
                        {activeTab === "history" && (
                            <AttendanceHistoryTab 
                                attendance={attendance}
                                onViewDetails={openDrawer}
                            />
                        )}
                    </div>
                )}
            </div>

            {/* Modals & Drawers */}
            <TechnicianDetailsDrawer 
                open={drawerOpen} 
                onClose={() => setDrawerOpen(false)} 
                record={selectedRecord} 
            />
            
            <RejectAttendanceModal 
                open={rejectModalOpen}
                onClose={() => setRejectModalOpen(false)}
                onConfirm={handleConfirmReject}
                record={rejectRecord}
            />
        </div>
    );
}
