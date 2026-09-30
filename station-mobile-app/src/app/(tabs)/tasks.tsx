import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
  Platform,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Plus,
  LogOut,
  ChevronDown,
  Calendar as CalendarIcon,
} from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { supabase } from "../../lib/supabase";
import { useWalkins } from "../../hooks/useWalkins";
import { useEngineers } from "../../hooks/useEngineers";
import { usePartsCatalog } from "../../hooks/usePartsCatalog";
import WalkInCard from "../../components/WalkInCard";
import CreateWalkInModal from "../../components/CreateWalkInModal";
import TicketCard from "../../components/TicketCard";
import CloseTicketModal from "../../components/CloseTicketModal";
import { useTickets, Ticket } from "../../hooks/useTickets";
import ActiveJobWidget from "../../components/ActiveJobWidget";
import CompleteWalkInModal from "../../components/CompleteWalkInModal";
import { useLocalSearchParams, useFocusEffect, router } from "expo-router";

export default function DashboardScreen() {
  const { walkins, loading: loadingWalkins, refetchWalkins } = useWalkins();
  const { engineers } = useEngineers();
  const { parts } = usePartsCatalog();
  const { tickets, loading: loadingTickets, refetchTickets } = useTickets();

  const [modalVisible, setModalVisible] = useState(false);
  const [closeTicketModalVisible, setCloseTicketModalVisible] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const [activeTab, setActiveTab] = useState<"tickets" | "walkins">("walkins");
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refetchWalkins();
      refetchTickets();
    }, []),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchWalkins(), refetchTickets()]);
    setRefreshing(false);
  }, [refetchWalkins, refetchTickets]);
  const [completeWalkInModalVisible, setCompleteWalkInModalVisible] =
    useState(false);
  const [selectedActiveJob, setSelectedActiveJob] = useState<any>(null);
  const [selectedWalkin, setSelectedWalkin] = useState<any>(null);

  const params = useLocalSearchParams();

  React.useEffect(() => {
    if (params.tab === "tickets") {
      setActiveTab("tickets");
    } else if (params.tab === "walkins") {
      setActiveTab("walkins");
    }

    if (params.action === "complete" && params.id) {
      if (params.tab === "walkins" && walkins.length > 0) {
        const walkin = walkins.find((w) => w.id === params.id);
        if (walkin) {
          setSelectedWalkin(walkin);
          setCompleteWalkInModalVisible(true);
        }
      } else if (params.tab === "tickets" && tickets.length > 0) {
        const ticket = tickets.find((t) => t.id === params.id);
        if (ticket) {
          setSelectedTicket(ticket);
          setCloseTicketModalVisible(true);
        }
      }
    }
  }, [params.tab, params.action, params.id, walkins, tickets]);

  // Date Range Filter States
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [tempFromDate, setTempFromDate] = useState<Date | null>(null);
  const [tempToDate, setTempToDate] = useState<Date | null>(null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  // Filter walkins based on date selection
  const filteredWalkins = useMemo(() => {
    if (!fromDate && !toDate) return walkins;

    return walkins.filter((w) => {
      if (!w.logged_at) return false;
      const wDate = new Date(w.logged_at).getTime();

      let isAfterFrom = true;
      let isBeforeTo = true;

      if (fromDate) {
        const fromStartOfDay = new Date(fromDate);
        fromStartOfDay.setHours(0, 0, 0, 0);
        isAfterFrom = wDate >= fromStartOfDay.getTime();
      }

      if (toDate) {
        const toEndOfDay = new Date(toDate);
        toEndOfDay.setHours(23, 59, 59, 999);
        isBeforeTo = wDate <= toEndOfDay.getTime();
      }

      return isAfterFrom && isBeforeTo;
    });
  }, [walkins, fromDate, toDate]);

  const selectedFilterLabel =
    fromDate || toDate
      ? `${fromDate ? fromDate.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Start"} - ${toDate ? toDate.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "End"}`
      : "All Time";

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#f8fafc" }}
      edges={["top", "left", "right"]}
    >
      {/* Header */}
      <View className="px-6 py-4 bg-white border-b border-slate-100 flex-row justify-between items-center z-20">
        <View>
          <Text className="text-2xl font-bold text-slate-900 tracking-tight">
            Tickets & Walk-Ins
          </Text>
          <Text className="text-slate-500 text-sm mt-1">
            Manage station operations
          </Text>
        </View>
      </View>

      {/* Active Job Widget */}
      <View className="px-6 pt-4">
        <ActiveJobWidget
          hideWhenIdle={true}
          onCompletePress={(job) => {
            setSelectedActiveJob(job);
            if (job.job_type === "ticket") {
              setActiveTab("tickets");
              const t = tickets.find((t) => t.id === job.job_id);
              if (t) {
                setSelectedTicket(t);
                setCloseTicketModalVisible(true);
              }
            } else if (job.job_type === "walkin") {
              setActiveTab("walkins");
              const w = walkins.find((w) => w.id === job.job_id);
              if (w) {
                setSelectedWalkin(w);
                setCompleteWalkInModalVisible(true);
              }
            } else if (job.job_type === "pdi") {
              router.push(`/pdi?action=complete&id=${job.job_id}`);
            } else if (job.job_type === "repair") {
              router.push(`/repair?action=complete&id=${job.job_id}`);
            }
          }}
        />
      </View>

      {/* Segmented Control & Dropdown */}
      <View className="bg-white border-b border-slate-100 px-6 py-4 z-10">
        {/* Toggle Tickets / Walkins */}
        <View className="flex-row bg-slate-100 rounded-xl p-1 mb-4">
          <TouchableOpacity
            onPress={() => setActiveTab("tickets")}
            style={[
              {
                flex: 1,
                paddingVertical: 8,
                borderRadius: 8,
                alignItems: "center",
              },
              activeTab === "tickets"
                ? {
                    backgroundColor: "#ffffff",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 2,
                  }
                : {},
            ]}
          >
            <Text
              style={{
                fontWeight: "600",
                color: activeTab === "tickets" ? "#0f172a" : "#64748b",
              }}
            >
              Tickets
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("walkins")}
            style={[
              {
                flex: 1,
                paddingVertical: 8,
                borderRadius: 8,
                alignItems: "center",
              },
              activeTab === "walkins"
                ? {
                    backgroundColor: "#ffffff",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 2,
                  }
                : {},
            ]}
          >
            <Text
              style={{
                fontWeight: "600",
                color: activeTab === "walkins" ? "#0f172a" : "#64748b",
              }}
            >
              Walk-Ins
            </Text>
          </TouchableOpacity>
        </View>

        {/* Date Dropdown */}
        <View className="flex-row justify-between items-center">
          <Text className="text-sm font-semibold text-slate-700">
            Filter Period
          </Text>
          <TouchableOpacity
            onPress={() => {
              setTempFromDate(fromDate);
              setTempToDate(toDate);
              setDropdownVisible(true);
            }}
            className="flex-row items-center bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg"
          >
            <Text className="text-sm font-medium text-slate-700 mr-2">
              {selectedFilterLabel}
            </Text>
            <CalendarIcon size={16} color="#64748b" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <View className="flex-1 px-6 pt-4">
        {activeTab === "tickets" ? (
          <>
            {loadingTickets && !refreshing ? (
              <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#3b82f6" />
              </View>
            ) : tickets.length === 0 ? (
              <View className="flex-1 justify-center items-center">
                <Text className="text-slate-500 text-base font-medium">
                  No tickets found.
                </Text>
              </View>
            ) : (
              <FlatList
                data={tickets}
                keyExtractor={(item) => item.id}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor="#3b82f6"
                  />
                }
                renderItem={({ item }) => (
                  <TicketCard
                    ticket={item}
                    onPress={(t) => {
                      setSelectedTicket(t);
                      setCloseTicketModalVisible(true);
                    }}
                  />
                )}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
              />
            )}
          </>
        ) : (
          <>
            {loadingWalkins && !refreshing ? (
              <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#3b82f6" />
              </View>
            ) : filteredWalkins.length === 0 ? (
              <View className="flex-1 justify-center items-center">
                <Text className="text-slate-500 text-base font-medium">
                  No walk-ins found for this period.
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredWalkins}
                keyExtractor={(item) => item.id}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor="#3b82f6"
                  />
                }
                renderItem={({ item }) => (
                  <WalkInCard
                    walkin={item}
                    engineers={engineers}
                    onPress={(w) => {
                      setSelectedWalkin(w);
                      setCompleteWalkInModalVisible(true);
                    }}
                  />
                )}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
              />
            )}
          </>
        )}
      </View>

      {/* Floating Action Button (Only show for Walkins for now) */}
      {activeTab === "walkins" && (
        <View className="absolute bottom-6 right-6">
          <TouchableOpacity
            className="bg-blue-600 h-16 px-6 rounded-full flex-row items-center justify-center shadow-lg shadow-blue-500/40"
            onPress={() => setModalVisible(true)}
          >
            <View style={{ marginRight: 8 }}>
              <Plus size={24} color="white" />
            </View>
            <Text className="text-white font-bold text-lg">Walk-In Job</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Date Dropdown Overlay */}
      {dropdownVisible && (
        <View className="absolute inset-0 z-50">
          <TouchableWithoutFeedback onPress={() => setDropdownVisible(false)}>
            <View className="flex-1 bg-black/40 justify-center items-center p-6">
              <TouchableWithoutFeedback>
                <View className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden">
                  <View className="p-5 border-b border-slate-100 bg-slate-50">
                    <Text className="text-lg font-bold text-slate-900 text-center">
                      Select Date Range
                    </Text>
                  </View>

                  <View className="p-5 gap-y-5">
                    {/* From Date */}
                    <View>
                      <Text className="text-sm font-semibold text-slate-700 mb-2">
                        From Date
                      </Text>
                      <TouchableOpacity
                        onPress={() => setShowFromPicker(true)}
                        className="bg-slate-50 border border-slate-200 px-4 py-3.5 rounded-xl flex-row justify-between items-center"
                      >
                        <Text
                          className={`font-medium ${tempFromDate ? "text-slate-900" : "text-slate-400"}`}
                        >
                          {tempFromDate
                            ? tempFromDate.toLocaleDateString()
                            : "Select Start Date"}
                        </Text>
                        <CalendarIcon size={18} color="#94a3b8" />
                      </TouchableOpacity>
                    </View>

                    {/* To Date */}
                    <View>
                      <Text className="text-sm font-semibold text-slate-700 mb-2">
                        To Date
                      </Text>
                      <TouchableOpacity
                        onPress={() => setShowToPicker(true)}
                        className="bg-slate-50 border border-slate-200 px-4 py-3.5 rounded-xl flex-row justify-between items-center"
                      >
                        <Text
                          className={`font-medium ${tempToDate ? "text-slate-900" : "text-slate-400"}`}
                        >
                          {tempToDate
                            ? tempToDate.toLocaleDateString()
                            : "Select End Date"}
                        </Text>
                        <CalendarIcon size={18} color="#94a3b8" />
                      </TouchableOpacity>
                    </View>

                    {/* Actions */}
                    <View className="flex-row gap-x-3 mt-2">
                      <TouchableOpacity
                        onPress={() => {
                          setFromDate(null);
                          setToDate(null);
                          setDropdownVisible(false);
                        }}
                        className="flex-1 bg-slate-100 py-3.5 rounded-xl items-center"
                      >
                        <Text className="text-slate-600 font-bold">
                          Clear All
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          setFromDate(tempFromDate);
                          setToDate(tempToDate);
                          setDropdownVisible(false);
                        }}
                        className="flex-1 bg-blue-600 py-3.5 rounded-xl items-center shadow-sm shadow-blue-500/40"
                      >
                        <Text className="text-white font-bold">Apply</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </View>
      )}

      {/* Date Pickers */}
      {showFromPicker && (
        <DateTimePicker
          value={tempFromDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, date) => {
            if (Platform.OS === "android") setShowFromPicker(false);
            else if (event.type === "set" || event.type === "dismissed")
              setShowFromPicker(false);
            if (date) setTempFromDate(date);
          }}
        />
      )}
      {showToPicker && (
        <DateTimePicker
          value={tempToDate || new Date()}
          mode="date"
          display="default"
          minimumDate={tempFromDate || undefined}
          onChange={(event, date) => {
            if (Platform.OS === "android") setShowToPicker(false);
            else if (event.type === "set" || event.type === "dismissed")
              setShowToPicker(false);
            if (date) setTempToDate(date);
          }}
        />
      )}

      {/* Modal */}
      {modalVisible && (
        <CreateWalkInModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSuccess={() => {
            setModalVisible(false);
            refetchWalkins();
          }}
        />
      )}

      {/* Close Ticket Modal */}
      <CloseTicketModal
        visible={closeTicketModalVisible}
        onClose={() => setCloseTicketModalVisible(false)}
        ticket={selectedTicket}
        onSuccess={() => {
          setCloseTicketModalVisible(false);
          refetchTickets();
        }}
      />
      <CompleteWalkInModal
        visible={completeWalkInModalVisible}
        onClose={() => {
          setCompleteWalkInModalVisible(false);
          setSelectedWalkin(null);
        }}
        walkinId={
          selectedWalkin?.id ||
          (selectedActiveJob?.job_type === "walkin"
            ? selectedActiveJob.job_id
            : null)
        }
        bikeNumber={
          selectedWalkin?.bike_number_text ||
          selectedActiveJob?.bike_number_text ||
          ""
        }
        partsCatalog={parts}
        onSuccess={() => {
          setCompleteWalkInModalVisible(false);
          setSelectedWalkin(null);
          refetchWalkins();
        }}
      />
    </SafeAreaView>
  );
}
