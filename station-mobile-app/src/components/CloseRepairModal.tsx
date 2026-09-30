import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  X,
  CheckCircle2,
  QrCode,
  Trash2,
  Play,
  Clock,
} from "lucide-react-native";
import { supabase } from "../lib/supabase";
import { RepairTicket } from "../hooks/useUnderRepair";
import SearchablePartSelectModal from "./SearchablePartSelectModal";
import ScannerModal from "./ScannerModal";
import { Part } from "../hooks/usePartsCatalog";
import { useUserSession } from "../hooks/useUserSession";
import { useActiveJob } from "../hooks/useActiveJob";

type Props = {
  visible: boolean;
  onClose: () => void;
  repairTicket: RepairTicket | null;
  partsCatalog: Part[];
  onSuccess: () => void;
};

export default function CloseRepairModal({
  visible,
  onClose,
  repairTicket,
  partsCatalog,
  onSuccess,
}: Props) {
  const { userProfile } = useUserSession();
  const { activeJob, startJob, completeActiveJob, refetchActiveJob } =
    useActiveJob();

  const [partsUsed, setPartsUsed] = useState<
    { part_id: string; quantity: string }[]
  >([{ part_id: "", quantity: "1" }]);
  const [compatibleParts, setCompatibleParts] = useState<Part[]>([]);

  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [activePartIndex, setActivePartIndex] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [durationString, setDurationString] = useState("");

  const scrollViewRef = useRef<ScrollView>(null);

  const handleInputFocus = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const isThisJobActive =
    activeJob?.job_type === "repair" && activeJob?.job_id === repairTicket?.id;
  const isAnotherJobActive = activeJob !== null && !isThisJobActive;

  useEffect(() => {
    if (visible && repairTicket?.model_id) {
      fetchCompatibleParts(repairTicket.model_id);
    } else if (visible) {
      setCompatibleParts(partsCatalog);
    }

    if (visible && repairTicket) {
      setPartsUsed([{ part_id: "", quantity: "1" }]);
      refetchActiveJob();
    }
  }, [visible, repairTicket]);

  useEffect(() => {
    if (visible && repairTicket && isThisJobActive && activeJob) {
      const start = new Date(activeJob.started_at);
      const end = new Date();
      const diffMs = end.getTime() - start.getTime();

      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      let duration = "";
      if (diffHrs > 0) duration += `${diffHrs} hour${diffHrs > 1 ? "s" : ""} `;
      duration += `${diffMins} min${diffMins > 1 ? "s" : ""}`;

      setDurationString(duration.trim() || "Just started");
    } else {
      setDurationString("");
    }
  }, [visible, repairTicket, isThisJobActive, activeJob]);

  const fetchCompatibleParts = async (modelId: string) => {
    try {
      const { data: mappings } = await supabase
        .from("part_model_map")
        .select("part_id")
        .eq("model_id", modelId);

      const partIds = (mappings || []).map((m) => m.part_id);

      if (partIds.length > 0) {
        const filtered = partsCatalog.filter((p) => partIds.includes(p.id));
        setCompatibleParts(filtered.length > 0 ? filtered : partsCatalog);
      } else {
        setCompatibleParts(partsCatalog);
      }
    } catch (err) {
      setCompatibleParts(partsCatalog);
    }
  };

  const getPartName = (partId: string) => {
    if (!partId) return "Select a part...";
    const part = partsCatalog.find(
      (p) => p.id.toString() === partId.toString(),
    );
    return part ? part.part_name : "Unknown Part";
  };

  const handleAddPartRow = () => {
    setPartsUsed([...partsUsed, { part_id: "", quantity: "1" }]);
  };

  const handleRemovePartRow = (index: number) => {
    const updated = partsUsed.filter((_, i) => i !== index);
    setPartsUsed(updated);
  };

  const updatePartRow = (
    index: number,
    field: "part_id" | "quantity",
    value: string,
  ) => {
    const updated = [...partsUsed];
    updated[index][field] = value;
    setPartsUsed(updated);
  };

  const handleScanResult = (scannedSku: string) => {
    setShowScannerModal(false);
    if (activePartIndex === null) return;

    const partsList =
      compatibleParts.length > 0 ? compatibleParts : partsCatalog;
    const match = partsList.find(
      (p) => p.sku?.toLowerCase() === scannedSku.toLowerCase(),
    );

    if (match) {
      updatePartRow(activePartIndex, "part_id", match.id);
    } else {
      Alert.alert(
        "Part Not Found",
        `No compatible part found with SKU: ${scannedSku}`,
      );
    }
  };

  const handleBeginJob = async () => {
    if (!repairTicket) return;
    if (isAnotherJobActive) {
      Alert.alert(
        "Error",
        "You already have another active job. Please complete it first.",
      );
      return;
    }

    setLoading(true);
    try {
      await startJob("repair", repairTicket.id, repairTicket.bike_number);
      Alert.alert("Job Started", "Timer has started for this repair!");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to start job.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!repairTicket) return;
    if (!isThisJobActive) {
      Alert.alert(
        "Validation Error",
        "You must begin the job before completing it.",
      );
      return;
    }

    setLoading(true);
    try {
      const partsData = partsUsed
        .filter((p) => p.part_id)
        .map((p) => {
          const partInfo = partsCatalog.find((pt) => pt.id === p.part_id);
          return {
            part_id: p.part_id,
            part_name: partInfo?.part_name || "",
            quantity: parseInt(p.quantity || "1", 10),
          };
        });

      let { error: repairErr } = await supabase
        .from("under_repair")
        .update({
          parts_used: partsData,
          serviced_by: userProfile?.id,
          close_date: new Date().toISOString(),
          status: "closed",
        })
        .eq("id", repairTicket.id);

      // Fallback: If DB table has a legacy FK constraint on serviced_by pointing to old engineers table
      if (
        repairErr &&
        repairErr.message?.includes("under_repair_serviced_by_fkey")
      ) {
        console.warn(
          "Legacy FK constraint on under_repair.serviced_by detected. Retrying without serviced_by field.",
        );
        const fallback = await supabase
          .from("under_repair")
          .update({
            parts_used: partsData,
            close_date: new Date().toISOString(),
            status: "closed",
          })
          .eq("id", repairTicket.id);
        repairErr = fallback.error;
      }

      if (repairErr) throw repairErr;

      for (const p of partsData) {
        if (!p.part_id) continue;

        const { data: inv, error: invErr } = await supabase
          .from("inventory_master")
          .select("id, quantity")
          .eq("part_id", p.part_id)
          .eq("station_id", repairTicket.station_id)
          .maybeSingle();

        if (!invErr && inv) {
          const currentQty = inv.quantity || 0;
          const newQty = currentQty - p.quantity;

          // Log transaction (DB trigger handles inventory_master update)
          await supabase.from("inventory_transactions").insert([
            {
              station_id: repairTicket.station_id,
              part_id: p.part_id,
              delta: -p.quantity,
              reason: "Repair part usage",
              ref_id: repairTicket.id,
              performed_by: userProfile?.id,
              performed_at: new Date().toISOString(),
              balance_after: newQty,
            },
          ]);
        }
      }

      const { error: bikeErr } = await supabase
        .from("bikes")
        .update({ status: "ready_to_deploy" })
        .eq("id", repairTicket.bike_id);

      if (bikeErr) throw bikeErr;

      await completeActiveJob();

      Alert.alert(
        "Success",
        "Repair ticket closed! Vehicle is Ready to Deploy.",
      );
      onSuccess();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to close repair ticket.");
    } finally {
      setLoading(false);
    }
  };

  if (!repairTicket) return null;

  const partsReqDisplay =
    (repairTicket.parts_required || [])
      .map((p) => `${p.part_name} (×${p.quantity})`)
      .join(", ") || "None";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-end bg-black/40"
      >
        <View className="bg-white rounded-t-[32px] h-[90%] shadow-2xl overflow-hidden">
          <View className="flex-row justify-between items-center p-6 border-b border-slate-100">
            <Text className="text-2xl font-bold text-slate-900">
              Close Repair
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="bg-slate-100 p-2 rounded-full"
            >
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollViewRef}
            className="p-6"
            contentContainerStyle={{ paddingBottom: 220 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View className="bg-slate-50 p-4 rounded-2xl mb-6 border border-slate-100 space-y-3">
              <View className="flex-row justify-between items-center">
                <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Vehicle No
                </Text>
                <Text className="text-sm font-bold text-slate-900 font-mono">
                  {repairTicket.bike_number}
                </Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  PDI Done By
                </Text>
                <Text className="text-sm font-medium text-slate-700">
                  {repairTicket.pdi_done_by_name}
                </Text>
              </View>
              <View className="pt-3 border-t border-slate-200">
                <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Parts Required
                </Text>
                <Text className="text-sm font-medium text-slate-800 leading-5">
                  {partsReqDisplay}
                </Text>
              </View>
            </View>

            {!isThisJobActive && (
              <View className="mb-6">
                <TouchableOpacity
                  className={`h-14 rounded-2xl justify-center items-center shadow-lg flex-row ${isAnotherJobActive ? "bg-slate-400" : "bg-emerald-600 shadow-emerald-500/30"}`}
                  onPress={handleBeginJob}
                  disabled={loading || isAnotherJobActive}
                >
                  <View style={{ marginRight: 8 }}>
                    {loading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Play size={20} color="white" />
                    )}
                  </View>
                  <Text className="text-white font-bold text-lg tracking-wide">
                    Begin Job
                  </Text>
                </TouchableOpacity>
                {isAnotherJobActive && (
                  <Text className="text-red-500 text-sm text-center mt-2">
                    You already have an active job in progress.
                  </Text>
                )}
              </View>
            )}

            <View
              className={`mb-5 ${!isThisJobActive ? "opacity-50" : ""}`}
              pointerEvents={isThisJobActive ? "auto" : "none"}
            >
              <Text className="text-sm font-semibold text-slate-700 mb-2">
                Serviced By
              </Text>
              <View className="bg-slate-100 border border-slate-200 rounded-2xl px-4 py-4">
                <Text className="text-base font-medium text-slate-900">
                  {userProfile?.name || "Loading..."}
                </Text>
              </View>
            </View>

            <View
              className={`mb-6 ${!isThisJobActive ? "opacity-50" : ""}`}
              pointerEvents={isThisJobActive ? "auto" : "none"}
            >
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-sm font-semibold text-slate-700">
                  Parts Used
                </Text>
                <TouchableOpacity
                  onPress={handleAddPartRow}
                  className="flex-row items-center bg-blue-50 px-3 py-1.5 rounded-full"
                >
                  <Text className="text-blue-600 font-medium text-xs ml-1">
                    + Add Part
                  </Text>
                </TouchableOpacity>
              </View>

              {partsUsed.map((row, index) => (
                <View
                  key={index}
                  className="flex-row items-center gap-2 mb-3 bg-slate-50 p-3 rounded-2xl border border-slate-200"
                >
                  <View className="flex-1 pr-2 border-r border-slate-200">
                    <Text className="text-xs text-slate-500 mb-1 font-medium">
                      Part Name
                    </Text>
                    <TouchableOpacity
                      className="bg-white border border-slate-200 rounded-xl px-3 h-11 justify-center"
                      onPress={() => {
                        setActivePartIndex(index);
                        setShowSearchModal(true);
                      }}
                    >
                      <Text
                        className={`text-sm ${row.part_id ? "text-slate-900 font-medium" : "text-slate-400"}`}
                      >
                        {getPartName(row.part_id)}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View className="w-14">
                    <Text className="text-xs text-slate-500 mb-1 font-medium text-center">
                      Qty
                    </Text>
                    <TextInput
                      className="bg-white border border-slate-200 rounded-xl h-11 text-center text-sm font-semibold text-slate-900"
                      value={row.quantity}
                      onChangeText={(val) =>
                        updatePartRow(index, "quantity", val)
                      }
                      keyboardType="numeric"
                      onFocus={handleInputFocus}
                    />
                  </View>

                  <View className="flex-row items-center ml-1 mt-5">
                    <TouchableOpacity
                      className="bg-emerald-100 p-2.5 rounded-xl mr-2"
                      onPress={() => {
                        setActivePartIndex(index);
                        setShowScannerModal(true);
                      }}
                    >
                      <QrCode size={18} color="#10b981" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleRemovePartRow(index)}
                      className="p-2"
                    >
                      <Trash2 size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            {isThisJobActive && (
              <View className="flex-row items-center justify-center p-4 bg-emerald-50 rounded-2xl border border-emerald-100 mb-4">
                <Clock size={18} color="#10b981" />
                <Text className="text-emerald-700 font-medium ml-2">
                  Total Service Time:{" "}
                  <Text className="font-bold">{durationString}</Text>
                </Text>
              </View>
            )}
          </ScrollView>

          <View
            className={`p-6 border-t border-slate-100 bg-white ${!isThisJobActive ? "opacity-50" : ""}`}
            pointerEvents={isThisJobActive ? "auto" : "none"}
          >
            <TouchableOpacity
              className={`bg-orange-600 h-14 rounded-2xl justify-center items-center shadow-lg shadow-orange-500/30 flex-row ${loading ? "opacity-70" : ""}`}
              onPress={handleSubmit}
              disabled={loading || !isThisJobActive}
            >
              <View style={{ marginRight: 8 }}>
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <CheckCircle2 size={20} color="white" />
                )}
              </View>
              <Text className="text-white font-bold text-lg tracking-wide">
                Close Repair
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <SearchablePartSelectModal
        visible={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        parts={compatibleParts.length > 0 ? compatibleParts : partsCatalog}
        onSelect={(part) => {
          if (activePartIndex !== null)
            updatePartRow(activePartIndex, "part_id", part.id.toString());
          setShowSearchModal(false);
        }}
      />

      <ScannerModal
        visible={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        onScan={handleScanResult}
      />
    </Modal>
  );
}
