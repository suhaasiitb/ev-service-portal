import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useUserSession } from "./useUserSession";

export type AttendanceState =
  "not_logged" | "pending_approval" | "started" | "completed" | "rejected";

export function useAttendance() {
  const { userProfile, loading: userLoading } = useUserSession();
  const [attendanceRecord, setAttendanceRecord] = useState<any>(null);
  const [attendanceState, setAttendanceState] =
    useState<AttendanceState>("not_logged");
  const [loading, setLoading] = useState<boolean>(true);
  const [stationLocation, setStationLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const checkAttendance = async () => {
    if (!userProfile) return;
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("technician_attendance")
        .select("*")
        .eq("technician_id", userProfile.id)
        .eq("date", today)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error checking attendance:", error);
      }

      setAttendanceRecord(data);
      if (!data) {
        setAttendanceState("not_logged");
      } else if (data.approval_status === "rejected") {
        setAttendanceState("rejected");
      } else if (!data.check_out_time) {
        if (data.approval_status === "pending") {
          setAttendanceState("pending_approval");
        } else {
          setAttendanceState("started");
        }
      } else {
        setAttendanceState("completed");
      }

      if (userProfile.station_id) {
        const { data: stationData, error: stationErr } = await supabase
          .from("stations")
          .select("latitude, longitude")
          .eq("id", userProfile.station_id)
          .maybeSingle();

        if (
          !stationErr &&
          stationData &&
          stationData.latitude &&
          stationData.longitude
        ) {
          setStationLocation({
            lat: stationData.latitude,
            lng: stationData.longitude,
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userLoading) {
      checkAttendance();
    }
  }, [userProfile, userLoading]);

  return {
    attendanceState,
    attendanceRecord,
    loading,
    refetchAttendance: checkAttendance,
    stationLocation,
    userProfile,
  };
}
