import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, router } from "expo-router";
import { useUnderRepair, RepairTicket } from "../../hooks/useUnderRepair";
import { useEngineers } from "../../hooks/useEngineers";
import { usePartsCatalog } from "../../hooks/usePartsCatalog";
import RepairCard from "../../components/RepairCard";
import CloseRepairModal from "../../components/CloseRepairModal";
import ActiveJobWidget from "../../components/ActiveJobWidget";

export default function RepairScreen() {
  const {
    repairTickets,
    loading: loadingRepair,
    refetchRepair,
  } = useUnderRepair();
  const { engineers } = useEngineers();
  const { parts } = usePartsCatalog();

  const [closeRepairModalVisible, setCloseRepairModalVisible] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState<RepairTicket | null>(
    null,
  );
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refetchRepair();
    }, []),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchRepair();
    setRefreshing(false);
  }, [refetchRepair]);

  const params = useLocalSearchParams();
  React.useEffect(() => {
    if (params.action === "complete" && params.id && repairTickets.length > 0) {
      const repair = repairTickets.find((t) => t.id === params.id);
      if (repair) {
        setSelectedRepair(repair);
        setCloseRepairModalVisible(true);
      }
    }
  }, [params.action, params.id, repairTickets]);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#f8fafc" }}
      edges={["top", "left", "right"]}
    >
      {/* Header */}
      <View className="px-6 py-4 bg-white border-b border-slate-100">
        <Text className="text-2xl font-bold text-slate-900 tracking-tight">
          Active Repairs
        </Text>
        <Text className="text-slate-500 text-sm mt-1">
          Vehicles currently tagged as Under Repair
        </Text>
      </View>

      <View className="px-6 pt-4">
        <ActiveJobWidget
          hideWhenIdle={true}
          onCompletePress={(job) => {
            if (job.job_type === "ticket") {
              router.push(
                `/tasks?tab=tickets&action=complete&id=${job.job_id}`,
              );
            } else if (job.job_type === "walkin") {
              router.push(
                `/tasks?tab=walkins&action=complete&id=${job.job_id}`,
              );
            } else if (job.job_type === "pdi") {
              router.push(`/pdi?action=complete&id=${job.job_id}`);
            } else if (job.job_type === "repair") {
              const r = repairTickets.find((t) => t.id === job.job_id);
              if (r) {
                setSelectedRepair(r);
                setCloseRepairModalVisible(true);
              } else {
                router.push(`/repair?action=complete&id=${job.job_id}`);
              }
            }
          }}
        />
      </View>

      {/* Main Content */}
      <View className="flex-1 px-6 pt-4">
        {loadingRepair && !refreshing ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#f97316" />
          </View>
        ) : repairTickets.length === 0 ? (
          <View className="flex-1 justify-center items-center">
            <Text className="text-slate-500 text-base font-medium">
              No vehicles under repair.
            </Text>
          </View>
        ) : (
          <FlatList
            data={repairTickets}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#3b82f6"
              />
            }
            renderItem={({ item }) => (
              <RepairCard
                repairTicket={item}
                onPress={(ticket) => {
                  setSelectedRepair(ticket);
                  setCloseRepairModalVisible(true);
                }}
              />
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        )}
      </View>

      {/* Close Repair Modal */}
      <CloseRepairModal
        visible={closeRepairModalVisible}
        onClose={() => setCloseRepairModalVisible(false)}
        repairTicket={selectedRepair}
        partsCatalog={parts}
        onSuccess={() => {
          setCloseRepairModalVisible(false);
          refetchRepair();
        }}
      />
    </SafeAreaView>
  );
}
