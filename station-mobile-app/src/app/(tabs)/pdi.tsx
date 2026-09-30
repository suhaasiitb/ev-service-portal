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
import { usePdiRequests, PdiRequest } from "../../hooks/usePdiRequests";
import { useEngineers } from "../../hooks/useEngineers";
import { usePartsCatalog } from "../../hooks/usePartsCatalog";
import PdiCard from "../../components/PdiCard";
import CompletePdiModal from "../../components/CompletePdiModal";
import ActiveJobWidget from "../../components/ActiveJobWidget";

export default function PDIScreen() {
  const { pdiRequests, loading: loadingPdi, refetchPdi } = usePdiRequests();
  const { engineers } = useEngineers();
  const { parts } = usePartsCatalog();

  const [completePdiModalVisible, setCompletePdiModalVisible] = useState(false);
  const [selectedPdi, setSelectedPdi] = useState<PdiRequest | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refetchPdi();
    }, []),
  );

  const params = useLocalSearchParams();
  React.useEffect(() => {
    if (params.action === "complete" && params.id && pdiRequests.length > 0) {
      const pdi = pdiRequests.find((p) => p.id === params.id);
      if (pdi) {
        setSelectedPdi(pdi);
        setCompletePdiModalVisible(true);
      }
    }
  }, [params.action, params.id, pdiRequests]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchPdi();
    setRefreshing(false);
  }, [refetchPdi]);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#f8fafc" }}
      edges={["top", "left", "right"]}
    >
      {/* Header */}
      <View className="px-6 py-4 bg-white border-b border-slate-100">
        <Text className="text-2xl font-bold text-slate-900 tracking-tight">
          PDI Requests
        </Text>
        <Text className="text-slate-500 text-sm mt-1">
          Pending Pre-Delivery Inspections
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
              const p = pdiRequests.find((t) => t.id === job.job_id);
              if (p) {
                setSelectedPdi(p);
                setCompletePdiModalVisible(true);
              } else {
                router.push(`/pdi?action=complete&id=${job.job_id}`);
              }
            } else if (job.job_type === "repair") {
              router.push(`/repair?action=complete&id=${job.job_id}`);
            }
          }}
        />
      </View>

      {/* Main Content */}
      <View className="flex-1 px-6 pt-4">
        {loadingPdi && !refreshing ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : pdiRequests.length === 0 ? (
          <View className="flex-1 justify-center items-center">
            <Text className="text-slate-500 text-base font-medium">
              No pending PDI requests.
            </Text>
          </View>
        ) : (
          <FlatList
            data={pdiRequests}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#3b82f6"
              />
            }
            renderItem={({ item }) => (
              <PdiCard
                pdiRequest={item}
                onPress={(pdi) => {
                  setSelectedPdi(pdi);
                  setCompletePdiModalVisible(true);
                }}
              />
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        )}
      </View>

      {/* Complete PDI Modal */}
      <CompletePdiModal
        visible={completePdiModalVisible}
        onClose={() => setCompletePdiModalVisible(false)}
        pdiRequest={selectedPdi}
        partsCatalog={parts}
        onSuccess={() => {
          setCompletePdiModalVisible(false);
          refetchPdi();
        }}
      />
    </SafeAreaView>
  );
}
