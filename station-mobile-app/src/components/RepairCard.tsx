import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Wrench, User, Calendar, ClipboardList } from 'lucide-react-native';
import { RepairTicket } from '../hooks/useUnderRepair';

type Props = {
  repairTicket: RepairTicket;
  onPress?: (ticket: RepairTicket) => void;
};

export default function RepairCard({ repairTicket, onPress }: Props) {
  const formattedDate = new Date(repairTicket.date_raised).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const partsReqDisplay = (repairTicket.parts_required || [])
    .map((p) => `${p.part_name} (×${p.quantity})`)
    .join(", ") || "None";

  return (
    <TouchableOpacity 
      className="bg-white p-4 rounded-2xl mb-4 shadow-sm border border-slate-100 relative overflow-hidden"
      onPress={() => onPress && onPress(repairTicket)}
      activeOpacity={0.7}
    >
      {/* Visual Indicator */}
      <View className="absolute top-0 left-0 bottom-0 w-1 bg-orange-500" />

      <View className="pl-2">
        {/* Header Row */}
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1">
            <View className="flex-row items-center mb-1">
              <Wrench size={16} color="#64748b" />
              <Text className="text-slate-500 font-semibold text-sm ml-2">
                REPAIR TICKET
              </Text>
            </View>
            <Text className="text-xl font-bold text-slate-900 mb-1">
              {repairTicket.bike_number}
            </Text>
          </View>
          
          <View className="items-end">
            <View className="px-2.5 py-1 rounded-full bg-orange-100 border border-orange-200">
              <Text className="text-xs font-bold text-orange-700">
                UNDER REPAIR
              </Text>
            </View>
          </View>
        </View>

        {/* Details Section */}
        <View className="bg-slate-50 p-3 rounded-xl mb-3 border border-slate-100 space-y-2">
          <View className="flex-row items-center">
            <User size={14} color="#64748b" />
            <Text className="text-slate-500 text-xs font-medium ml-2 w-20">PDI By:</Text>
            <Text className="text-slate-700 text-sm font-medium flex-1" numberOfLines={1}>
              {repairTicket.pdi_done_by_name}
            </Text>
          </View>
          
          <View className="flex-row items-start mt-1.5">
            <ClipboardList size={14} color="#64748b" style={{ marginTop: 2 }} />
            <Text className="text-slate-500 text-xs font-medium ml-2 w-20">Parts Req:</Text>
            <Text className="text-slate-700 text-sm font-medium flex-1 leading-5" numberOfLines={2}>
              {partsReqDisplay}
            </Text>
          </View>
        </View>

        {/* Footer info */}
        <View className="flex-row justify-between items-center mt-2 border-t border-slate-100 pt-3">
          <View className="flex-row items-center">
            <Calendar size={14} color="#94a3b8" />
            <Text className="text-slate-500 text-xs font-medium ml-1.5">
              Raised: {formattedDate}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
