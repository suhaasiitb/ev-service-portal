import { useState, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import RiderDashboardPage from "./rider/RiderDashboardPage";
import RiderManagementPage from "./rider/RiderManagementPage";
import VehicleManagementPage from "./rider/VehicleManagementPage";
import AssignmentTrackingPage from "./rider/AssignmentTrackingPage";

export default function RiderManagementWrapper() {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        // Get current session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);

            if (!session) {
                navigate("/");
            }
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (!session) {
                navigate("/");
            }
        });

        return () => subscription.unsubscribe();
    }, [navigate]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="text-xl text-gray-600">Loading...</div>
            </div>
        );
    }

    if (!session) {
        return null;
    }

    return (
        <Routes>
            <Route path="/" element={<RiderDashboardPage session={session} />} />
            <Route
                path="/rider-management"
                element={<RiderManagementPage session={session} />}
            />
            <Route
                path="/vehicle-management"
                element={<VehicleManagementPage session={session} />}
            />
            <Route
                path="/assignment-tracking"
                element={<AssignmentTrackingPage session={session} />}
            />
        </Routes>
    );
}
