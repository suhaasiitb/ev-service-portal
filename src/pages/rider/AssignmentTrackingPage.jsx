import RiderSidebar from "../../components/rider/RiderSidebar";

export default function AssignmentTrackingPage({ session }) {
    return (
        <div className="flex min-h-screen bg-gray-50">
            <RiderSidebar />

            <div className="flex-1 p-8">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">
                        Assignment Tracking
                    </h1>
                    <p className="text-gray-600 mb-8">
                        Track and manage all rider-vehicle assignments
                    </p>

                    <div className="bg-white rounded-xl shadow p-12 text-center">
                        <div className="text-6xl mb-4">🚧</div>
                        <h2 className="text-xl font-semibold text-gray-800 mb-2">
                            Coming Soon
                        </h2>
                        <p className="text-gray-600">
                            Assignment tracking features will be available in the next update.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
