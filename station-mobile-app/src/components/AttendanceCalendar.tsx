import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
} from "lucide-react-native";
import { supabase } from "../lib/supabase";

type Props = {
  userId: string;
};

export default function AttendanceCalendar({ userId }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [records, setRecords] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDayDetails, setSelectedDayDetails] = useState<any | null>(
    null,
  );
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  // Month boundary logic: Current month & past 1 month
  const today = new Date();
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const pastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);

  const selectedMonthStart = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1,
  );

  const canGoPrevious = selectedMonthStart > pastMonthStart;
  const canGoNext = selectedMonthStart < currentMonthStart;

  useEffect(() => {
    fetchMonthAttendance();
  }, [currentDate, userId]);

  const fetchMonthAttendance = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      // Start of month (YYYY-MM-01) and End of month
      const startDateStr = new Date(year, month, 1).toISOString().split("T")[0];
      const endDateStr = new Date(year, month + 1, 0)
        .toISOString()
        .split("T")[0];

      const { data, error } = await supabase
        .from("technician_attendance")
        .select("*")
        .eq("technician_id", userId)
        .gte("date", startDateStr)
        .lte("date", endDateStr);

      if (error) {
        console.error("Error fetching monthly attendance:", error);
      } else {
        const map: Record<string, any> = {};
        (data || []).forEach((item: any) => {
          map[item.date] = item;
        });
        setRecords(map);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const changeMonth = (delta: number) => {
    const newDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + delta,
      1,
    );
    setCurrentDate(newDate);
    setSelectedDayDetails(null);
    setSelectedDateStr(null);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const todayStr = new Date().toISOString().split("T")[0];

  const handleDayPress = (
    dateStr: string,
    record: any,
    isPastOrToday: boolean,
  ) => {
    setSelectedDateStr(dateStr);
    setSelectedDayDetails({ record, isPastOrToday, dateStr });
  };

  return (
    <View className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm mb-6">
      {/* Month Navigation Header */}
      <View className="flex-row items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <Text className="text-lg font-bold text-slate-900">{monthName}</Text>
        <View className="flex-row items-center gap-x-2">
          <TouchableOpacity
            onPress={() => changeMonth(-1)}
            disabled={!canGoPrevious}
            className={`p-2 rounded-xl border ${canGoPrevious ? "bg-slate-50 border-slate-200" : "bg-slate-100 border-slate-100 opacity-40"}`}
          >
            <ChevronLeft
              size={18}
              color={canGoPrevious ? "#0f172a" : "#94a3b8"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => changeMonth(1)}
            disabled={!canGoNext}
            className={`p-2 rounded-xl border ${canGoNext ? "bg-slate-50 border-slate-200" : "bg-slate-100 border-slate-100 opacity-40"}`}
          >
            <ChevronRight size={18} color={canGoNext ? "#0f172a" : "#94a3b8"} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Weekday Labels */}
      <View className="flex-row justify-between mb-2">
        {daysOfWeek.map((day, idx) => (
          <View key={idx} className="flex-1 items-center">
            <Text className="text-xs font-bold text-slate-400 uppercase">
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      {loading ? (
        <View className="py-12 items-center justify-center">
          <ActivityIndicator color="#3b82f6" />
        </View>
      ) : (
        <View className="flex-row flex-wrap">
          {/* Empty padding cells for first day offset */}
          {Array.from({ length: firstDayIndex }).map((_, idx) => (
            <View
              key={`empty-${idx}`}
              className="w-[14.28%] aspect-square p-1"
            />
          ))}

          {/* Month Days */}
          {Array.from({ length: totalDays }).map((_, idx) => {
            const dayNum = idx + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
            const record = records[dateStr];

            const isFuture = dateStr > todayStr;
            const isSelected = dateStr === selectedDateStr;

            let bgCircle = "bg-slate-100";
            let textColor = "text-slate-700";

            if (isFuture) {
              bgCircle = "bg-slate-50 border-transparent";
              textColor = "text-slate-300";
            } else if (record) {
              if (record.approval_status === "pending") {
                // Yellow / Amber for pending manager approval
                bgCircle = "bg-amber-400";
                textColor = "text-white font-bold";
              } else if (record.approval_status === "rejected") {
                // Red for rejected / disapproved
                bgCircle = "bg-red-500";
                textColor = "text-white font-bold";
              } else {
                // Green for logged & approved / present
                bgCircle = "bg-emerald-500";
                textColor = "text-white font-bold";
              }
            } else {
              // Red for not marked / absent on past date
              bgCircle = "bg-red-500";
              textColor = "text-white font-bold";
            }

            return (
              <View
                key={dateStr}
                className="w-[14.28%] aspect-square p-1 items-center justify-center"
              >
                <TouchableOpacity
                  onPress={() => handleDayPress(dateStr, record, !isFuture)}
                  className={`w-9 h-9 rounded-full items-center justify-center ${bgCircle}`}
                  style={
                    isSelected
                      ? {
                          borderWidth: 2.5,
                          borderColor: "#1e40af",
                          transform: [{ scale: 1.08 }],
                        }
                      : undefined
                  }
                >
                  <Text className={`text-xs ${textColor}`}>{dayNum}</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      {/* Color Legend Key */}
      <View className="flex-row items-center justify-around mt-4 pt-4 border-t border-slate-100">
        <View className="flex-row items-center">
          <View className="w-3.5 h-3.5 rounded-full bg-emerald-500 mr-1.5" />
          <Text className="text-xs font-bold text-slate-600">
            Logged (Green)
          </Text>
        </View>
        <View className="flex-row items-center">
          <View className="w-3.5 h-3.5 rounded-full bg-amber-400 mr-1.5" />
          <Text className="text-xs font-bold text-slate-600">
            Pending (Yellow)
          </Text>
        </View>
        <View className="flex-row items-center">
          <View className="w-3.5 h-3.5 rounded-full bg-red-500 mr-1.5" />
          <Text className="text-xs font-bold text-slate-600">
            Not Marked (Red)
          </Text>
        </View>
      </View>

      {/* Selected Day Details Card */}
      {selectedDayDetails && (
        <View className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Details for {selectedDayDetails.dateStr}
          </Text>
          {!selectedDayDetails.isPastOrToday ? (
            <Text className="text-sm font-medium text-slate-400">
              Future date - No attendance required.
            </Text>
          ) : selectedDayDetails.record ? (
            <View className="gap-y-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-semibold text-slate-700">
                  Status:
                </Text>
                {selectedDayDetails.record.approval_status === "pending" ? (
                  <View className="bg-amber-100 px-3 py-1 rounded-full flex-row items-center">
                    <View className="mr-1">
                      <Clock size={12} color="#d97706" />
                    </View>
                    <Text className="text-xs font-bold text-amber-800">
                      Pending Approval
                    </Text>
                  </View>
                ) : selectedDayDetails.record.approval_status === "rejected" ? (
                  <View className="bg-red-100 px-3 py-1 rounded-full flex-row items-center">
                    <View className="mr-1">
                      <XCircle size={12} color="#dc2626" />
                    </View>
                    <Text className="text-xs font-bold text-red-800">
                      Disapproved
                    </Text>
                  </View>
                ) : (
                  <View className="bg-emerald-100 px-3 py-1 rounded-full flex-row items-center">
                    <View className="mr-1">
                      <CheckCircle2 size={12} color="#10b981" />
                    </View>
                    <Text className="text-xs font-bold text-emerald-800">
                      Logged & Approved
                    </Text>
                  </View>
                )}
              </View>

              {selectedDayDetails.record.check_in_time && (
                <View className="flex-row justify-between">
                  <Text className="text-xs text-slate-500 font-medium">
                    Check-In:
                  </Text>
                  <Text className="text-xs font-bold text-slate-900">
                    {new Date(
                      selectedDayDetails.record.check_in_time,
                    ).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {selectedDayDetails.record.distance_from_station !=
                      null && (
                      <Text className="text-slate-400 font-normal">
                        {" "}
                        (
                        {Math.round(
                          selectedDayDetails.record.distance_from_station,
                        )}
                        m away)
                      </Text>
                    )}
                  </Text>
                </View>
              )}

              {selectedDayDetails.record.check_out_time && (
                <View className="flex-row justify-between">
                  <Text className="text-xs text-slate-500 font-medium">
                    Check-Out:
                  </Text>
                  <Text className="text-xs font-bold text-slate-900">
                    {new Date(
                      selectedDayDetails.record.check_out_time,
                    ).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              )}

              {selectedDayDetails.record.rejection_reason && (
                <View className="bg-red-50 p-2.5 rounded-xl border border-red-100 mt-1">
                  <Text className="text-xs text-red-700 font-medium">
                    Reason: {selectedDayDetails.record.rejection_reason}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View className="flex-row items-center">
              <View className="mr-1.5">
                <AlertCircle size={16} color="#ef4444" />
              </View>
              <Text className="text-sm font-semibold text-red-600">
                Attendance Not Logged (Absent)
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
