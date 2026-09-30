import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Wrench, Calendar, User, FileText, ChevronDown, ChevronUp, Clock, CheckCircle2 } from 'lucide-react-native';
import { WalkIn } from '../hooks/useWalkins';
import { Engineer } from '../hooks/useEngineers';

type Props = {
  walkin: WalkIn;
  engineers: Engineer[];
  onPress?: (walkin: WalkIn) => void;
};

export default function WalkInCard({ walkin, engineers, onPress }: Props) {
  const [expanded, setExpanded] = useState(false);
  
  // Format Date
  const dateStr = walkin.logged_at ? new Date(walkin.logged_at).toLocaleDateString(undefined, { 
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : 'N/A';

  const isCompleted = walkin.status === 'closed' || !!walkin.issue_description;
  
  let durationStr = 'N/A';
  if (walkin.completed_at && walkin.logged_at) {
    const diffMs = new Date(walkin.completed_at).getTime() - new Date(walkin.logged_at).getTime();
    if (diffMs > 0) {
      const diffMins = Math.floor(diffMs / 60000);
      const h = Math.floor(diffMins / 60);
      const m = diffMins % 60;
      durationStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
    }
  }

  return (
    <TouchableOpacity 
      activeOpacity={0.7}
      onPress={() => {
        if (!isCompleted && onPress) {
          onPress(walkin);
        } else {
          setExpanded(!expanded);
        }
      }}
      className={`bg-white p-5 rounded-[24px] shadow-sm shadow-slate-200/50 border ${!isCompleted ? 'border-amber-200' : 'border-slate-100'} mb-4`}
    >
      {/* Visual Indicator */}
      <View className={`absolute top-0 left-0 bottom-0 w-1 ${!isCompleted ? 'bg-amber-500' : 'bg-emerald-500'}`} />

      {/* Collapsed View Header */}
      <View className="flex-row justify-between items-start">
        {/* Left: Vehicle No */}
        <View className="flex-1 pr-4">
          <View className="flex-row items-center mb-1">
            <Text className="text-xl font-bold text-slate-900 tracking-tight mr-2">
              {walkin.bike_number_text || 'Unknown Bike'}
            </Text>
            {!isCompleted ? (
              <View className="bg-amber-100 px-2 py-0.5 rounded-md">
                <Text className="text-[10px] font-bold text-amber-700">IN PROGRESS</Text>
              </View>
            ) : (
              <View className="bg-emerald-100 px-2 py-0.5 rounded-md">
                <Text className="text-[10px] font-bold text-emerald-700">CLOSED</Text>
              </View>
            )}
          </View>
          
          <View className="flex-row items-center mt-1.5">
            <Calendar size={14} color="#64748b" />
            <Text className="text-sm text-slate-500 ml-1.5 font-medium">{dateStr}</Text>
          </View>
        </View>

        {/* Right: Cost & Chevron */}
        <View className="items-end">
          <Text className="text-xl font-bold text-slate-900 tracking-tight">
            ₹{walkin.cost_charged || 0}
          </Text>
          <View className="mt-3 bg-slate-50 p-1.5 rounded-full">
            {expanded ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
          </View>
        </View>
      </View>

      {/* Expanded Details Section */}
      {expanded && (
        <View className="mt-3 pt-3 border-t border-slate-100 gap-y-2">
          {/* Issue Description */}
          <View className="flex-row items-center">
            <View className="bg-slate-50 p-1.5 rounded-lg mr-2.5 border border-slate-100">
              <FileText size={14} color="#64748b" />
            </View>
            <View className="flex-1 justify-center">
              <Text className="text-sm text-slate-700 leading-5">
                {walkin.issue_description || 'No issue description'}
              </Text>
            </View>
          </View>

          {/* Parts Used */}
          {walkin.parts_used && walkin.parts_used.length > 0 && (
            <View className="flex-row items-center mt-1">
              <View className="bg-slate-50 p-1.5 rounded-lg mr-2.5 border border-slate-100">
                <Wrench size={14} color="#64748b" />
              </View>
              <View className="flex-1 flex-row flex-wrap gap-1.5">
                {walkin.parts_used.map((part, index) => (
                  <View key={index} className="bg-slate-100 px-2 py-0.5 rounded-md">
                    <Text className="text-[11px] font-medium text-slate-600">{part}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Service Time */}
          {isCompleted && walkin.completed_at && (
            <View className="flex-row items-center justify-start mt-1 pt-2 border-t border-slate-100 border-dashed">
              <Clock size={14} color="#64748b" />
              <Text className="text-xs font-medium text-slate-500 ml-1.5">
                Service Time: <Text className="font-bold text-slate-700">{durationStr}</Text>
              </Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}
