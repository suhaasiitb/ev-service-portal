import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  LogOut,
  User,
  Calendar as CalendarIcon,
  ShieldCheck,
} from "lucide-react-native";
import { router } from "expo-router";
import { useUserSession } from "../../hooks/useUserSession";
import { useAuth } from "../../providers/AuthProvider";
import AttendanceCalendar from "../../components/AttendanceCalendar";

const styles = StyleSheet.create({
  tabActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  accountCard: {
    rowGap: 16,
  },
  accountDivider: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
});

export default function ProfileScreen() {
  const { userProfile } = useUserSession();
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<"attendance" | "info">(
    "attendance",
  );

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-[#f8fafc]"
      edges={["top", "left", "right"]}
    >
      {/* Header */}
      <View className="px-6 py-4 bg-white border-b border-slate-100 flex-row items-center">
        <TouchableOpacity
          className="mr-4 p-2 -ml-2 rounded-full"
          onPress={handleBack}
        >
          <ArrowLeft size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-900">Profile</Text>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-6"
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* User Card */}
        <View className="bg-white p-6 rounded-3xl border border-slate-100 mb-6 items-center">
          <View className="bg-blue-50 w-20 h-20 rounded-full items-center justify-center mb-4 border border-blue-100">
            <User size={40} color="#3b82f6" />
          </View>
          <Text className="text-2xl font-bold text-slate-900">
            {userProfile?.name || "Technician"}
          </Text>
          <Text className="text-slate-500 mt-1 uppercase tracking-wider text-xs font-bold">
            {userProfile?.role || "Staff"}
          </Text>
        </View>

        {/* Section Segmented Control */}
        <View className="flex-row bg-slate-200/60 p-1.5 rounded-2xl mb-6">
          <TouchableOpacity
            key="tab-btn-attendance"
            className="flex-1 py-3 rounded-xl flex-row items-center justify-center"
            style={activeTab === "attendance" ? styles.tabActive : undefined}
            onPress={() => setActiveTab("attendance")}
          >
            <View className="mr-1.5">
              <CalendarIcon
                size={18}
                color={activeTab === "attendance" ? "#3b82f6" : "#64748b"}
              />
            </View>
            <Text
              className="font-bold text-sm"
              style={{
                color: activeTab === "attendance" ? "#0f172a" : "#64748b",
              }}
            >
              Attendance
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            key="tab-btn-info"
            className="flex-1 py-3 rounded-xl flex-row items-center justify-center"
            style={activeTab === "info" ? styles.tabActive : undefined}
            onPress={() => setActiveTab("info")}
          >
            <View className="mr-1.5">
              <ShieldCheck
                size={18}
                color={activeTab === "info" ? "#3b82f6" : "#64748b"}
              />
            </View>
            <Text
              className="font-bold text-sm"
              style={{
                color: activeTab === "info" ? "#0f172a" : "#64748b",
              }}
            >
              Account
            </Text>
          </TouchableOpacity>
        </View>

        {/* Attendance Tab Content */}
        {activeTab === "attendance" && (
          <View key="tab-content-attendance">
            {userProfile?.id ? (
              <AttendanceCalendar userId={userProfile.id} />
            ) : null}
          </View>
        )}

        {/* Account Info Content */}
        {activeTab === "info" && (
          <View
            key="tab-content-info"
            className="bg-white p-6 rounded-3xl border border-slate-100 mb-6"
            style={styles.accountCard}
          >
            <View>
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Email Address
              </Text>
              <Text className="text-base font-semibold text-slate-900 mt-1">
                {userProfile?.email || "N/A"}
              </Text>
            </View>
            <View style={styles.accountDivider}>
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                User ID
              </Text>
              <Text className="text-xs font-mono font-medium text-slate-600 mt-1">
                {userProfile?.id || "N/A"}
              </Text>
            </View>
          </View>
        )}

        {/* Log Out Button */}
        <TouchableOpacity
          className="bg-red-50 flex-row items-center justify-center p-4 rounded-2xl border border-red-100 mt-2"
          onPress={handleLogout}
        >
          <LogOut size={20} color="#ef4444" />
          <Text className="text-red-600 font-bold ml-2 text-base">Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
