import React from "react";
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ticket, ShieldAlert, Wrench, User } from "lucide-react-native";
import { router } from "expo-router";
import { useAnalyticsStats } from "../../hooks/useAnalyticsStats";
import { useUserSession } from "../../hooks/useUserSession";
import ActiveJobWidget from "../../components/ActiveJobWidget";
import AttendanceWidget from "../../components/AttendanceWidget";

export default function AnalyticsScreen() {
  const { stats, loading, refetchStats } = useAnalyticsStats();
  const { userProfile } = useUserSession();

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#f8fafc" }}
      edges={["top", "left", "right"]}
    >
      {/* Header */}
      <View className="px-6 py-4 bg-white border-b border-slate-100 flex-row justify-between items-center">
        <Text className="text-2xl font-bold text-slate-900 tracking-tight">
          Welcome, {userProfile?.name?.split(" ")[0] || "User"}
        </Text>
        <TouchableOpacity
          className="bg-slate-100 p-2.5 rounded-full"
          onPress={() => router.push("/profile")}
        >
          <User size={20} color="#475569" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 p-6"
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetchStats} />
        }
      >
        <AttendanceWidget />

        <Text className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
          Pending Tasks Overview
        </Text>

        <View className="flex-row flex-wrap justify-between">
          {/* Pending Tickets */}
          <TouchableOpacity
            className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 mb-4"
            style={{ width: "48%" }}
            onPress={() => router.push("/tasks?tab=tickets")}
            activeOpacity={0.7}
          >
            <View className="bg-blue-50 w-12 h-12 rounded-full justify-center items-center mb-3">
              <Ticket size={24} color="#3b82f6" />
            </View>
            <Text className="text-3xl font-black text-slate-900 mb-1">
              {stats.pendingTickets}
            </Text>
            <Text className="text-slate-500 text-sm font-medium">
              Pending Tickets
            </Text>
          </TouchableOpacity>

          {/* Pending PDI */}
          <TouchableOpacity
            className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 mb-4"
            style={{ width: "48%" }}
            onPress={() => router.push("/pdi")}
            activeOpacity={0.7}
          >
            <View className="bg-amber-50 w-12 h-12 rounded-full justify-center items-center mb-3">
              <ShieldAlert size={24} color="#f59e0b" />
            </View>
            <Text className="text-3xl font-black text-slate-900 mb-1">
              {stats.pendingPDI}
            </Text>
            <Text className="text-slate-500 text-sm font-medium">
              Pending PDI
            </Text>
          </TouchableOpacity>

          {/* Pending Repairs */}
          <TouchableOpacity
            className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 mb-4 flex-row items-center w-full"
            onPress={() => router.push("/repair")}
            activeOpacity={0.7}
          >
            <View className="bg-orange-50 w-14 h-14 rounded-full justify-center items-center mr-4">
              <Wrench size={28} color="#f97316" />
            </View>
            <View className="flex-1">
              <Text className="text-4xl font-black text-slate-900 mb-1">
                {stats.pendingRepairs}
              </Text>
              <Text className="text-slate-500 text-sm font-medium">
                Vehicles Under Repair
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View className="mb-4">
          <ActiveJobWidget
            onCompletePress={(job) => {
              if (job.job_type === "ticket")
                router.push(
                  `/tasks?tab=tickets&action=complete&id=${job.job_id}`,
                );
              else if (job.job_type === "walkin")
                router.push(
                  `/tasks?tab=walkins&action=complete&id=${job.job_id}`,
                );
              else if (job.job_type === "pdi")
                router.push(`/pdi?action=complete&id=${job.job_id}`);
              else if (job.job_type === "repair")
                router.push(`/repair?action=complete&id=${job.job_id}`);
            }}
          />
        </View>

        {loading && (
          <View className="mt-8 justify-center items-center">
            <ActivityIndicator size="small" color="#94a3b8" />
            <Text className="text-slate-400 text-xs mt-2">
              Refreshing metrics...
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
