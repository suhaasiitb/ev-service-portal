import React, { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import {
  Camera,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
} from "lucide-react-native";
import { useAttendance } from "../hooks/useAttendance";
import LogAttendanceModal from "./LogAttendanceModal";

export default function AttendanceWidget() {
  const {
    attendanceState,
    attendanceRecord,
    loading,
    refetchAttendance,
    stationLocation,
    userProfile,
  } = useAttendance();
  const [modalVisible, setModalVisible] = useState(false);

  if (loading) {
    return (
      <View className="bg-white p-5 rounded-3xl border border-slate-100 flex-row justify-center mb-6">
        <ActivityIndicator color="#3b82f6" />
      </View>
    );
  }

  const getContainerStyle = () => {
    switch (attendanceState) {
      case "completed":
        return "bg-emerald-50 border-emerald-100";
      case "pending_approval":
        return "bg-amber-50 border-amber-200";
      case "started":
        return "bg-amber-50 border-amber-100";
      case "rejected":
        return "bg-red-50 border-red-200";
      default:
        return "bg-blue-50 border-blue-100";
    }
  };

  return (
    <View>
      <View className={`mb-6 p-5 rounded-3xl border ${getContainerStyle()}`}>
        {attendanceState === "completed" ? (
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <View className="bg-emerald-100 p-2.5 rounded-full mr-3">
                <CheckCircle2 size={24} color="#10b981" />
              </View>
              <View>
                <Text className="text-emerald-900 font-bold text-base">
                  Shift Completed
                </Text>
                <Text className="text-emerald-700 text-sm mt-0.5">
                  Great job today!
                </Text>
              </View>
            </View>
          </View>
        ) : attendanceState === "pending_approval" ? (
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 pr-2">
              <View className="bg-amber-200 p-2.5 rounded-full mr-3">
                <Clock size={24} color="#d97706" />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text className="text-amber-950 font-bold text-base mr-1.5">
                    Shift Pending Approval
                  </Text>
                </View>
                <Text className="text-amber-800 text-xs mt-0.5 font-medium">
                  Logged{" "}
                  {Math.round(attendanceRecord?.distance_from_station || 0)}m
                  from station. Waiting for manager review.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              className="bg-amber-600 px-4 py-2.5 rounded-xl shadow-sm"
              onPress={() => setModalVisible(true)}
            >
              <Text className="text-white font-bold text-sm">Log Out</Text>
            </TouchableOpacity>
          </View>
        ) : attendanceState === "started" ? (
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 pr-2">
              <View className="bg-amber-200 p-2.5 rounded-full mr-3">
                <Camera size={24} color="#d97706" />
              </View>
              <View>
                <Text className="text-amber-900 font-bold text-base">
                  Active Shift
                </Text>
                <Text className="text-amber-700 text-sm mt-0.5">
                  Log out when your shift ends
                </Text>
              </View>
            </View>
            <TouchableOpacity
              className="bg-amber-600 px-4 py-2.5 rounded-xl shadow-sm"
              onPress={() => setModalVisible(true)}
            >
              <Text className="text-white font-bold text-sm">Log Out</Text>
            </TouchableOpacity>
          </View>
        ) : attendanceState === "rejected" ? (
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 pr-2">
              <View className="bg-red-200 p-2.5 rounded-full mr-3">
                <AlertCircle size={24} color="#dc2626" />
              </View>
              <View className="flex-1">
                <Text className="text-red-950 font-bold text-base">
                  Shift Disapproved
                </Text>
                <Text className="text-red-800 text-xs mt-0.5">
                  Reason:{" "}
                  {attendanceRecord?.rejection_reason || "Rejected by manager."}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              className="bg-red-600 px-4 py-2.5 rounded-xl shadow-sm"
              onPress={() => setModalVisible(true)}
            >
              <Text className="text-white font-bold text-sm">Start Shift</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 pr-2">
              <View className="bg-blue-200 p-2.5 rounded-full mr-3">
                <Camera size={24} color="#1d4ed8" />
              </View>
              <View>
                <Text className="text-blue-900 font-bold text-base">
                  Start Shift
                </Text>
                <Text className="text-blue-700 text-sm mt-0.5">
                  Take a selfie to log attendance
                </Text>
              </View>
            </View>
            <TouchableOpacity
              className="bg-blue-600 px-4 py-2.5 rounded-xl shadow-sm"
              onPress={() => setModalVisible(true)}
            >
              <Text className="text-white font-bold text-sm">Start</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <LogAttendanceModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={() => {
          setModalVisible(false);
          refetchAttendance();
        }}
        userProfile={userProfile}
        stationLocation={stationLocation}
        attendanceState={attendanceState}
        attendanceRecord={attendanceRecord}
      />
    </View>
  );
}
