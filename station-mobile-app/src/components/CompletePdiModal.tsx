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
  Play,
  Clock,
  QrCode,
  Trash2,
} from "lucide-react-native";
import { supabase } from "../lib/supabase";
import { PdiRequest } from "../hooks/usePdiRequests";
import { useUserSession } from "../hooks/useUserSession";
import { useActiveJob } from "../hooks/useActiveJob";
import { Part } from "../hooks/usePartsCatalog";
import SearchablePartSelectModal from "./SearchablePartSelectModal";
import ScannerModal from "./ScannerModal";

type Props = {
  visible: boolean;
  onClose: () => void;
  pdiRequest: PdiRequest | null;
  partsCatalog: Part[];
  onSuccess: () => void;
};

export default function CompletePdiModal({
  visible,
  onClose,
  pdiRequest,
  partsCatalog,
  onSuccess,
}: Props) {
  const { userProfile } = useUserSession();
  const { activeJob, startJob, completeActiveJob, refetchActiveJob } =
    useActiveJob();

  const [vehicleCondition, setVehicleCondition] = useState<
    "good" | "damaged" | null
  >(null);
  const [pdiAction, setPdiAction] = useState<
    "ready_to_deploy" | "under_repair" | null
  >(null);
  const [damageAmount, setDamageAmount] = useState("");

  const [partsUsed, setPartsUsed] = useState<
    { part_id: string; quantity: string }[]
  >([{ part_id: "", quantity: "1" }]);
  const [compatibleParts, setCompatibleParts] = useState<Part[]>([]);

  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [activePartIndex, setActivePartIndex] = useState<number | null>(null);

  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [durationString, setDurationString] = useState("");

  const scrollViewRef = useRef<ScrollView>(null);

  const handleInputFocus = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const isThisJobActive =
    activeJob?.job_type === "pdi" && activeJob?.job_id === pdiRequest?.id;
  const isAnotherJobActive = activeJob !== null && !isThisJobActive;

  useEffect(() => {
    if (visible && pdiRequest) {
      setNotes("");
      setVehicleCondition(null);
      setPdiAction(null);
      setDamageAmount("");
      setPartsUsed([{ part_id: "", quantity: "1" }]);
      refetchActiveJob();

      if (pdiRequest.model_id) {
        fetchCompatibleParts(pdiRequest.model_id);
      } else {
        setCompatibleParts(partsCatalog);
      }
    }
  }, [visible, pdiRequest]);

  useEffect(() => {
    if (visible && pdiRequest && isThisJobActive && activeJob) {
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
  }, [visible, pdiRequest, isThisJobActive, activeJob]);

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
    if (!pdiRequest) return;
    if (isAnotherJobActive) {
      Alert.alert(
        "Error",
        "You already have another active job. Please complete it first.",
      );
      return;
    }

    setLoading(true);
    try {
      await startJob("pdi", pdiRequest.id, pdiRequest.bike_number);

      // Update PDI status to in_progress
      await supabase
        .from("pdi_requests")
        .update({ status: "in_progress" })
        .eq("id", pdiRequest.id);

      onSuccess?.(); // Trigger a refetch so the card updates

      Alert.alert("Job Started", "Timer has started for this PDI!");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to start job.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!pdiRequest) return;
    if (!isThisJobActive) {
      Alert.alert(
        "Validation Error",
        "You must begin the job before completing it.",
      );
      return;
    }
    if (!vehicleCondition) {
      Alert.alert("Validation Error", "Please select a vehicle condition.");
      return;
    }
    if (vehicleCondition === "damaged" && !damageAmount.trim()) {
      Alert.alert("Validation Error", "Please enter a damage amount.");
      return;
    }
    if (!pdiAction) {
      Alert.alert("Validation Error", "Please select a PDI action.");
      return;
    }

    setLoading(true);
    try {
      let partsData: any[] = [];
      if (vehicleCondition === "damaged" || pdiAction === "under_repair") {
        partsData = partsUsed
          .filter((p) => p.part_id)
          .map((p) => {
            const partInfo = partsCatalog.find((pt) => pt.id === p.part_id);
            return {
              part_id: p.part_id,
              part_name: partInfo?.part_name || "",
              quantity: parseInt(p.quantity || "1", 10),
            };
          });

        if (partsData.length === 0) {
          Alert.alert(
            "Validation Error",
            "Please add at least one part required for repair.",
          );
          setLoading(false);
          return;
        }
      }

      // 1. Update PDI request
      const { error: pdiErr } = await supabase
        .from("pdi_requests")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          vehicle_condition: vehicleCondition,
          pdi_action: pdiAction,
          pdi_doneby: userProfile?.id,
          parts_required:
            vehicleCondition === "damaged" || pdiAction === "under_repair"
              ? partsData
              : null,
          damage_amount:
            vehicleCondition === "damaged" ? parseFloat(damageAmount) : 0,
          // We could add notes here if we add a column, skipping for now
        })
        .eq("id", pdiRequest.id);

      if (pdiErr) throw pdiErr;

      // 1.5. Update Rider Assignment if active
      if (pdiRequest.bike_id) {
        let assignmentQuery = supabase
          .from("rider_bike_assignments")
          .select("id, damage_amount, damage_parts");

        if (pdiRequest.assignment_id) {
          assignmentQuery = assignmentQuery.eq("id", pdiRequest.assignment_id);
        } else {
          assignmentQuery = assignmentQuery
            .eq("bike_id", pdiRequest.bike_id)
            .is("unassigned_at", null);
        }

        const { data: assignmentData } = await assignmentQuery.maybeSingle();

        if (assignmentData) {
          const costFloat =
            vehicleCondition === "damaged" && damageAmount.trim()
              ? parseFloat(damageAmount)
              : 0;

          if (costFloat > 0 || partsData.length > 0) {
            const currentDamage = parseFloat(
              assignmentData.damage_amount || "0",
            );
            const newDamage = currentDamage + costFloat;

            let newDamageParts = assignmentData.damage_parts || "";
            const partNames = partsData
              .map((p) => `${p.part_name} (x${p.quantity || 1})`)
              .join(", ");

            if (partNames || costFloat > 0) {
              const dateStr = new Date().toLocaleDateString("en-GB");
              const details = partNames || "PDI Damage";
              const costText = costFloat > 0 ? ` - ₹${costFloat}` : "";
              const entry = `[${dateStr}] PDI: ${details}${costText}`;
              newDamageParts = newDamageParts
                ? `${newDamageParts}\n${entry}`
                : entry;
            }

            await supabase
              .from("rider_bike_assignments")
              .update({
                damage_amount: newDamage,
                damage_parts: newDamageParts,
              })
              .eq("id", assignmentData.id);
          }
        }
      }

      // 2. Update Bikes table
      const { error: bikeErr } = await supabase
        .from("bikes")
        .update({ status: pdiAction })
        .eq("id", pdiRequest.bike_id);

      if (bikeErr) throw bikeErr;

      // 3. Create Under Repair entry if needed
      if (pdiAction === "under_repair") {
        const { error: repairErr } = await supabase
          .from("under_repair")
          .insert({
            bike_id: pdiRequest.bike_id,
            pdi_request_id: pdiRequest.id,
            pdi_raisedby: userProfile?.id,
            parts_required: partsData,
            status: "open",
            date_raised: new Date().toISOString(),
          });

        if (repairErr) throw repairErr;
      }

      await completeActiveJob();

      Alert.alert(
        "Success",
        pdiAction === "ready_to_deploy"
          ? "PDI Request completed! Vehicle is Ready to Deploy."
          : "PDI completed and vehicle moved to Under Repair.",
      );
      onSuccess();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to complete PDI request.");
    } finally {
      setLoading(false);
    }
  };

  if (!pdiRequest) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 justify-end bg-black/40"
      >
        <View className="bg-white rounded-t-[32px] h-[90%] shadow-2xl overflow-hidden">
          <View className="flex-row justify-between items-center p-6 border-b border-slate-100">
            <Text className="text-2xl font-bold text-slate-900">
              Complete PDI
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
                  {pdiRequest.bike_number}
                </Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Rider
                </Text>
                <Text className="text-sm font-medium text-slate-700">
                  {pdiRequest.rider_name}
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
                Completed By
              </Text>
              <View className="bg-slate-100 border border-slate-200 rounded-2xl px-4 py-4">
                <Text className="text-base font-medium text-slate-900">
                  {userProfile?.name || "Loading..."}
                </Text>
              </View>
            </View>

            {/* Condition Selection */}
            <View
              className={`mb-5 ${!isThisJobActive ? "opacity-50" : ""}`}
              pointerEvents={isThisJobActive ? "auto" : "none"}
            >
              <Text className="text-sm font-semibold text-slate-700 mb-2">
                Vehicle Condition
              </Text>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  className={`flex-1 py-3 px-4 rounded-xl border ${vehicleCondition === "good" ? "bg-emerald-50 border-emerald-500" : "bg-white border-slate-200"}`}
                  onPress={() => {
                    setVehicleCondition("good");
                    setDamageAmount("");
                  }}
                >
                  <Text
                    className={`text-center font-bold ${vehicleCondition === "good" ? "text-emerald-700" : "text-slate-600"}`}
                  >
                    Good
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`flex-1 py-3 px-4 rounded-xl border ${vehicleCondition === "damaged" ? "bg-red-50 border-red-500" : "bg-white border-slate-200"}`}
                  onPress={() => setVehicleCondition("damaged")}
                >
                  <Text
                    className={`text-center font-bold ${vehicleCondition === "damaged" ? "text-red-700" : "text-slate-600"}`}
                  >
                    Damaged
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            {/* Parts Required */}
            {(vehicleCondition === "damaged" ||
              pdiAction === "under_repair") && (
              <View
                className={`mb-6 ${!isThisJobActive ? "opacity-50" : ""}`}
                pointerEvents={isThisJobActive ? "auto" : "none"}
              >
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-sm font-semibold text-slate-700">
                    Parts Required
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
            )}

            {/* Damage Amount Input */}
            {vehicleCondition === "damaged" && (
              <View
                className={`mb-5 ${!isThisJobActive ? "opacity-50" : ""}`}
                pointerEvents={isThisJobActive ? "auto" : "none"}
              >
                <Text className="text-sm font-semibold text-slate-700 mb-2">
                  Damage Amount (₹)
                </Text>
                <TextInput
                  className="bg-white border border-slate-200 rounded-xl h-12 px-4 text-sm font-semibold text-slate-900"
                  value={damageAmount}
                  onChangeText={setDamageAmount}
                  keyboardType="numeric"
                  placeholder="Enter estimated damage cost"
                  placeholderTextColor="#94a3b8"
                  onFocus={handleInputFocus}
                />
              </View>
            )}

            {/* Action Selection */}
            {vehicleCondition && (
              <View
                className={`mb-5 ${!isThisJobActive ? "opacity-50" : ""}`}
                pointerEvents={isThisJobActive ? "auto" : "none"}
              >
                <Text className="text-sm font-semibold text-slate-700 mb-2">
                  PDI Action
                </Text>
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    className={`flex-1 py-3 px-4 rounded-xl border ${pdiAction === "ready_to_deploy" ? "bg-blue-50 border-blue-500" : "bg-white border-slate-200"}`}
                    onPress={() => setPdiAction("ready_to_deploy")}
                  >
                    <Text
                      className={`text-center font-bold ${pdiAction === "ready_to_deploy" ? "text-blue-700" : "text-slate-600"}`}
                    >
                      Ready to Deploy
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`flex-1 py-3 px-4 rounded-xl border ${pdiAction === "under_repair" ? "bg-orange-50 border-orange-500" : "bg-white border-slate-200"}`}
                    onPress={() => setPdiAction("under_repair")}
                  >
                    <Text
                      className={`text-center font-bold ${pdiAction === "under_repair" ? "text-orange-700" : "text-slate-600"}`}
                    >
                      Under Repair
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

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
              className={`bg-blue-600 h-14 rounded-2xl justify-center items-center shadow-lg shadow-blue-500/30 flex-row ${loading ? "opacity-70" : ""}`}
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
                Complete PDI
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
