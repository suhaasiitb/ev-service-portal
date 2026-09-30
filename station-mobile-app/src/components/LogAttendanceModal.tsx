import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Image,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import {
  X,
  CheckCircle2,
  MapPin,
  Camera as CameraIcon,
  AlertTriangle,
} from "lucide-react-native";
import { supabase } from "../lib/supabase";
import { decode } from "base64-arraybuffer";

// Haversine formula to calculate distance in meters
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // meters
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userProfile: any;
  stationLocation: { lat: number; lng: number } | null;
  attendanceState?:
    "not_logged" | "pending_approval" | "started" | "completed" | "rejected";
  attendanceRecord?: any;
};

export default function LogAttendanceModal({
  visible,
  onClose,
  onSuccess,
  userProfile,
  stationLocation,
  attendanceState,
  attendanceRecord,
}: Props) {
  const [camPermission, requestCamPermission] = useCameraPermissions();
  const [locPermission, setLocPermission] =
    useState<Location.PermissionStatus | null>(null);

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"verifying" | "camera" | "uploading">(
    "verifying",
  );
  const [distance, setDistance] = useState<number | null>(null);
  const [currentLoc, setCurrentLoc] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const cameraRef = useRef<any>(null);

  useEffect(() => {
    if (visible) {
      setStep("verifying");
      setDistance(null);
      setCurrentLoc(null);
      verifyLocation();
    }
  }, [visible]);

  const verifyLocation = async () => {
    try {
      if (!stationLocation) {
        Alert.alert(
          "Error",
          "Station location is not set in the database. Please update it first.",
        );
        onClose();
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocPermission(status);
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location permission is required for attendance.",
        );
        onClose();
        return;
      }

      setLoading(true);
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const lat = location.coords.latitude;
      const lng = location.coords.longitude;
      setCurrentLoc({ lat, lng });

      const dist = getDistance(
        lat,
        lng,
        stationLocation.lat,
        stationLocation.lng,
      );
      setDistance(dist);

      if (!camPermission?.granted) {
        await requestCamPermission();
      }

      if (dist <= 150) {
        // Location within 150m: proceed to camera directly
        setStep("camera");
      }
      // If dist > 150m, stay on 'verifying' step to display the warning banner with choices
    } catch (err: any) {
      Alert.alert("Location Error", err.message || "Failed to get location");
    } finally {
      setLoading(false);
    }
  };

  const handleTakePicture = async () => {
    if (!cameraRef.current || !userProfile || !currentLoc || distance === null)
      return;

    setLoading(true);
    setStep("uploading");

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: true,
      });

      if (!photo.base64) throw new Error("Failed to capture image base64");

      const fileName = `${userProfile.id}_${Date.now()}.jpg`;
      const filePath = `${new Date().toISOString().split("T")[0]}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("attendance_selfies")
        .upload(filePath, decode(photo.base64), {
          contentType: "image/jpeg",
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("attendance_selfies")
        .getPublicUrl(filePath);

      const today = new Date().toISOString().split("T")[0];
      const isOutRange = distance > 150;

      if (
        (attendanceState === "started" ||
          attendanceState === "pending_approval") &&
        attendanceRecord
      ) {
        // Shift End Logout
        const { error: dbError } = await supabase
          .from("technician_attendance")
          .update({
            check_out_time: new Date().toISOString(),
            check_out_latitude: currentLoc?.lat,
            check_out_longitude: currentLoc?.lng,
            check_out_distance: distance,
            check_out_selfie_url: publicUrlData.publicUrl,
            check_out_approval_status: isOutRange ? "pending" : "approved",
          })
          .eq("id", attendanceRecord.id);

        if (dbError) throw dbError;

        if (isOutRange) {
          Alert.alert(
            "Shift End Logged",
            `Shift end logged! Note: Check-out was ${Math.round(distance)}m from station (pending manager approval).`,
          );
        } else {
          Alert.alert("Success", "Shift end logged successfully!");
        }
      } else {
        // Shift Start Login
        const approvalStatus = isOutRange ? "pending" : "approved";

        const { error: dbError } = await supabase
          .from("technician_attendance")
          .insert({
            technician_id: userProfile.id,
            station_id: userProfile.station_id,
            date: today,
            latitude: currentLoc?.lat,
            longitude: currentLoc?.lng,
            distance_from_station: distance,
            selfie_url: publicUrlData.publicUrl,
            check_in_time: new Date().toISOString(),
            approval_status: approvalStatus,
            requires_approval: isOutRange,
          });

        if (dbError) throw dbError;

        if (isOutRange) {
          Alert.alert(
            "Shift Start Logged (Pending Approval)",
            `Your shift start has been recorded (${Math.round(distance)}m from station). It is currently pending manager approval.`,
          );
        } else {
          Alert.alert("Success", "Shift start logged successfully!");
        }
      }

      onSuccess();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to log attendance");
      setStep("camera"); // let them retry
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/90 justify-center">
        {/* Header */}
        <View className="absolute top-12 left-0 right-0 px-6 flex-row justify-between items-center z-50">
          <Text className="text-white text-xl font-bold">
            {attendanceState === "started" ||
            attendanceState === "pending_approval"
              ? "Log Out"
              : "Start Shift"}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            className="bg-white/20 p-2 rounded-full"
          >
            <X size={20} color="white" />
          </TouchableOpacity>
        </View>

        {step === "verifying" && (
          <View className="items-center px-6">
            <View className="bg-blue-500/20 p-6 rounded-full mb-6">
              <MapPin size={48} color="#3b82f6" />
            </View>
            <Text className="text-white text-2xl font-bold mb-2 text-center">
              Verifying Location
            </Text>

            {loading ? (
              <View className="items-center mt-4">
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text className="text-slate-400 mt-4 text-center">
                  Checking GPS coordinates...
                </Text>
              </View>
            ) : distance !== null && distance > 150 ? (
              <View className="bg-amber-500/20 p-6 rounded-3xl mt-4 w-full border border-amber-500/40">
                <View className="flex-row items-center justify-center mb-2">
                  <AlertTriangle
                    size={24}
                    color="#f59e0b"
                    style={{ marginRight: 8 }}
                  />
                  <Text className="text-amber-400 text-lg font-bold text-center">
                    Manager Approval Required
                  </Text>
                </View>
                <Text className="text-slate-300 text-center mb-6">
                  You are{" "}
                  <Text className="font-bold text-white">
                    {Math.round(distance)} meters
                  </Text>{" "}
                  away from the station (over 150m limit). You can still log
                  attendance, but your shift will be flagged for Manager
                  Approval.
                </Text>
                <TouchableOpacity
                  className="bg-amber-600 py-3.5 px-4 rounded-xl items-center mb-3 flex-row justify-center"
                  onPress={() => setStep("camera")}
                >
                  <CameraIcon
                    size={18}
                    color="white"
                    style={{ marginRight: 8 }}
                  />
                  <Text className="text-white font-bold text-base">
                    Proceed to Take Selfie
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="bg-white/10 py-3 rounded-xl items-center"
                  onPress={verifyLocation}
                >
                  <Text className="text-slate-300 font-semibold">
                    Retry GPS Location
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text className="text-slate-400 text-center">Please wait...</Text>
            )}
          </View>
        )}

        {step === "camera" && camPermission?.granted && (
          <View className="flex-1">
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="front"
              ref={cameraRef}
            />
            <View className="absolute bottom-0 left-0 right-0 p-8 pb-12 items-center bg-black/50">
              <Text className="text-white text-center font-medium mb-6">
                Please take a clear selfie at the station.
              </Text>
              <TouchableOpacity
                className="w-20 h-20 rounded-full bg-white border-4 border-slate-300 justify-center items-center shadow-lg"
                onPress={handleTakePicture}
              >
                <View className="w-16 h-16 rounded-full bg-white border-2 border-slate-900 justify-center items-center">
                  <CameraIcon size={28} color="#0f172a" />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === "uploading" && (
          <View className="items-center px-6">
            <View className="bg-emerald-500/20 p-6 rounded-full mb-6">
              <CheckCircle2 size={48} color="#10b981" />
            </View>
            <Text className="text-white text-2xl font-bold mb-2 text-center">
              Saving Attendance
            </Text>
            <View className="mt-4">
              <ActivityIndicator size="large" color="#10b981" />
            </View>
            <Text className="text-slate-400 mt-4 text-center">
              Uploading photo and saving record...
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}
