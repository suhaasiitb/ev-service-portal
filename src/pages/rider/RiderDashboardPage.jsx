import RiderSidebar from "../../components/rider/RiderSidebar";
import { useDashboardStats } from "../../hooks/useDashboardStats";

export default function RiderDashboardPage({ session }) {
    const { stats, loading, error } = useDashboardStats();

    return (
        <div className="flex min-h-screen bg-gray-50">
            <RiderSidebar />

            <div className="flex-1 p-8">
                <div className="max-w-6xl mx-auto">
                    <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>

                    {loading ? (
                        <div className="text-gray-500 text-center py-10">Loading dashboard metrics...</div>
                    ) : error ? (
                        <div className="text-red-500 text-center py-10 bg-red-50 rounded-xl">Failed to load metrics: {error}</div>
                    ) : (
                        <>
                            {/* Quick Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <div className="bg-white rounded-xl shadow p-6 border-l-4 border-blue-500">
                                    <div className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">Active Riders</div>
                                    <div className="text-4xl font-bold text-gray-900">{stats.activeRiders}</div>
                                </div>
                                <div className="bg-white rounded-xl shadow p-6 border-l-4 border-green-500">
                                    <div className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">Total Available Bikes</div>
                                    <div className="text-4xl font-bold text-gray-900">{stats.totalBikes}</div>
                                </div>
                                <div className="bg-white rounded-xl shadow p-6 border-l-4 border-orange-500">
                                    <div className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">Pending PDI</div>
                                    <div className="text-4xl font-bold text-gray-900">{stats.pendingPDI}</div>
                                </div>
                            </div>

                            {/* Station Wise Active Riders */}
                            <div className="bg-white rounded-xl shadow overflow-hidden">
                                <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
                                    <h2 className="text-lg font-bold text-gray-900">
                                        Station Wise Active Riders
                                    </h2>
                                </div>
                                <div className="p-0">
                                    {stats.stationWiseActive.length === 0 ? (
                                        <div className="p-6 text-center text-gray-500">
                                            No active riders found.
                                        </div>
                                    ) : (
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-gray-100 border-b border-gray-200 text-sm text-gray-600 uppercase tracking-wider">
                                                    <th className="px-6 py-3 font-semibold">Station Name</th>
                                                    <th className="px-6 py-3 font-semibold text-right">Active Riders Count</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {stats.stationWiseActive.map((item, index) => (
                                                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-6 py-4 font-medium text-gray-800">{item.station}</td>
                                                        <td className="px-6 py-4 text-right">
                                                            <span className="inline-flex items-center justify-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-bold text-sm">
                                                                {item.count}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
