import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ClipboardCheck, User, Phone, Calendar } from 'lucide-react-native';
import { PdiRequest } from '../hooks/usePdiRequests';

type Props = {
  pdiRequest: PdiRequest;
  onPress?: (pdiRequest: PdiRequest) => void;
};

export default function PdiCard({ pdiRequest, onPress }: Props) {
  const formattedDate = new Date(pdiRequest.created_at).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const isProgress = pdiRequest.status === 'in_progress';

  return (
    <TouchableOpacity 
      className={`bg-white p-4 rounded-2xl mb-4 shadow-sm border ${isProgress ? 'border-blue-200' : 'border-slate-100'} relative overflow-hidden`}
      onPress={() => onPress && onPress(pdiRequest)}
      activeOpacity={0.7}
    >
      {/* Visual Indicator */}
      <View className={`absolute top-0 left-0 bottom-0 w-1 ${isProgress ? 'bg-blue-500' : 'bg-amber-500'}`} />

      <View className="pl-2">
        {/* Header Row */}
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1">
            <View className="flex-row items-center mb-1">
              <ClipboardCheck size={16} color="#64748b" />
              <Text className="text-slate-500 font-semibold text-sm ml-2">
                PDI REQUEST
              </Text>
            </View>
            <Text className="text-xl font-bold text-slate-900 mb-1">
              {pdiRequest.bike_number}
            </Text>
          </View>
          
          <View className="items-end">
            <View className={`px-2.5 py-1 rounded-full border ${isProgress ? 'bg-blue-100 border-blue-200' : 'bg-amber-100 border-amber-200'}`}>
              <Text className={`text-xs font-bold ${isProgress ? 'text-blue-700' : 'text-amber-700'}`}>
                {isProgress ? 'IN PROGRESS' : 'PENDING'}
              </Text>
            </View>
          </View>
        </View>

        {/* Rider Info */}
        <View className="bg-slate-50 p-3 rounded-xl mb-3 border border-slate-100 space-y-2">
          <View className="flex-row items-center">
            <User size={14} color="#64748b" />
            <Text className="text-slate-700 text-sm font-medium ml-2 flex-1">
              {pdiRequest.rider_name}
            </Text>
          </View>
          {pdiRequest.rider_phone !== '-' && (
            <View className="flex-row items-center mt-1.5">
              <Phone size={14} color="#64748b" />
              <Text className="text-slate-700 text-sm font-medium ml-2 flex-1">
                {pdiRequest.rider_phone}
              </Text>
            </View>
          )}
        </View>

        {/* Footer info */}
        <View className="flex-row justify-between items-center mt-2 border-t border-slate-100 pt-3">
          <View className="flex-row items-center">
            <Calendar size={14} color="#94a3b8" />
            <Text className="text-slate-500 text-xs font-medium ml-1.5">
              Requested: {formattedDate}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
