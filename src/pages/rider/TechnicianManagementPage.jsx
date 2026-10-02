import { useState } from "react";
import RiderSidebar from "../../components/rider/RiderSidebar";
import TechnicianRosterTab from "../../components/technician/TechnicianRosterTab";
import PendingApprovalsTab from "../../components/technician/PendingApprovalsTab";
import AttendanceHistoryTab from "../../components/technician/AttendanceHistoryTab";
import TechnicianDetailsDrawer from "../../components/technician/TechnicianDetailsDrawer";
import RejectAttendanceModal from "../../components/technician/RejectAttendanceModal";
import { useTechnicianAttendance } from "../../hooks/useTechnicianAttendance";
import { useTechnicians } from "../../hooks/useTechnicians";

export default function TechnicianManagementPage({ session }) {
    // Attendance data & actions
    const { attendance, pendingCount, loading: loadingAttendance, approveAttendance, disapproveAttendance } = useTechnicianAttendance(null);
    
    // Technicians roster & station tagging data
    const { technicians, stations, loading: loadingTechnicians, updatingId, updateTechnicianStation } = useTechnicians();

    // Active Tab: 'roster' (Technicians & Tagged Stations), 'pending' (Pending Approvals), 'history' (Attendance History)
    const [activeTab, setActiveTab] = useState("roster");

    // Modals & Drawers state
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [rejectRecord, setRejectRecord] = useState(null);
    const [rejectIsCheckOut, setRejectIsCheckOut] = useState(false);

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
                        <p className="text-gray-600 mt-1">Manage technician station tagging, shift tracking, and attendance approvals</p>
                    </div>
                </div>

                {/* Tabs Header */}
                <div className="flex border-b border-gray-200 mb-6 gap-6">
                    <button
                        onClick={() => setActiveTab("roster")}
                        className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
                            activeTab === "roster"
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        👨‍🔧 Technicians & Tagged Stations
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">
                            {technicians.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab("pending")}
                        className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
                            activeTab === "pending"
                                ? "border-amber-500 text-amber-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        Pending Approvals Queue
                        {pendingCount > 0 && (
                            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs">
                                {pendingCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab("history")}
                        className={`pb-4 text-sm font-bold border-b-2 transition-colors ${
                            activeTab === "history"
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        Attendance History & Logs
                    </button>
                </div>

                {/* Main Content Area */}
                <div>
                    {activeTab === "roster" && (
                        <TechnicianRosterTab
                            technicians={technicians}
                            stations={stations}
                            loading={loadingTechnicians}
                            updatingId={updatingId}
                            onUpdateStation={updateTechnicianStation}
                        />
                    )}

                    {activeTab === "pending" && (
                        loadingAttendance ? (
                            <div className="text-center py-20 text-gray-500 font-medium">Loading attendance data...</div>
                        ) : (
                            <PendingApprovalsTab 
                                attendance={attendance} 
                                onApprove={handleApprove}
                                onReject={handleRejectClick}
                                onViewDetails={openDrawer}
                            />
                        )
                    )}

                    {activeTab === "history" && (
                        loadingAttendance ? (
                            <div className="text-center py-20 text-gray-500 font-medium">Loading attendance data...</div>
                        ) : (
                            <AttendanceHistoryTab 
                                attendance={attendance}
                                onViewDetails={openDrawer}
                            />
                        )
                    )}
                </div>
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
