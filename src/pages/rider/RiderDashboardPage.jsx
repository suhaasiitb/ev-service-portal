import RiderSidebar from "../../components/rider/RiderSidebar";

export default function RiderDashboardPage({ session }) {
    return (
        <div className="flex min-h-screen bg-gray-50">
            <RiderSidebar />

            <div className="flex-1 p-8">
                <div className="max-w-6xl mx-auto">
                    <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-4 gap-6 mb-8">
                        <div className="bg-white rounded-xl shadow p-6">
                            <div className="text-sm text-gray-600 mb-2">Total Riders</div>
                            <div className="text-3xl font-bold text-gray-900">-</div>
                        </div>
                        <div className="bg-white rounded-xl shadow p-6">
                            <div className="text-sm text-gray-600 mb-2">Active Assignments</div>
                            <div className="text-3xl font-bold text-green-600">-</div>
                        </div>
                        <div className="bg-white rounded-xl shadow p-6">
                            <div className="text-sm text-gray-600 mb-2">Available Vehicles</div>
                            <div className="text-3xl font-bold text-blue-600">-</div>
                        </div>
                        <div className="bg-white rounded-xl shadow p-6">
                            <div className="text-sm text-gray-600 mb-2">Pending Actions</div>
                            <div className="text-3xl font-bold text-yellow-600">-</div>
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white rounded-xl shadow p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            Recent Activity
                        </h2>
                        <div className="text-center py-12 text-gray-500">
                            <div className="text-4xl mb-2">📊</div>
                            <p>Dashboard metrics will be displayed here</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
