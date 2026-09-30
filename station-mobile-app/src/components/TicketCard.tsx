import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ticket as TicketIcon, Clock, Wrench } from 'lucide-react-native';
import { Ticket } from '../hooks/useTickets';

type Props = {
  ticket: Ticket;
  onPress?: (ticket: Ticket) => void;
};

export default function TicketCard({ ticket, onPress }: Props) {
  // Format date correctly
  const formattedDate = new Date(ticket.reported_at).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const isB2C = ticket.ticket_type?.toLowerCase() === 'b2c';
  const isOpen = ticket.status?.toLowerCase() === 'open';

  return (
    <TouchableOpacity 
      className={`bg-white p-4 rounded-2xl mb-4 shadow-sm border border-slate-100 relative overflow-hidden ${!isOpen ? 'opacity-80' : ''}`}
      onPress={() => onPress && onPress(ticket)}
      disabled={!isOpen}
      activeOpacity={0.7}
    >
      {/* Visual Indicator for B2B/B2C */}
      <View 
        className={`absolute top-0 left-0 bottom-0 w-1 ${isB2C ? 'bg-purple-500' : 'bg-blue-500'}`} 
      />

      <View className="pl-2">
        {/* Header Row */}
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1">
            <View className="flex-row items-center mb-1">
              <TicketIcon size={16} color="#64748b" />
              <Text className="text-slate-500 font-semibold text-sm ml-2">
                {ticket.ticket_no || 'TICKET'}
              </Text>
            </View>
            <Text className="text-xl font-bold text-slate-900 mb-1">
              {ticket.bike_number_text}
            </Text>
          </View>
          
          <View className="items-end">
            <View className={`px-2.5 py-1 rounded-full mb-2 ${
              isB2C ? 'bg-purple-100 border border-purple-200' : 'bg-blue-100 border border-blue-200'
            }`}>
              <Text className={`text-xs font-bold ${isB2C ? 'text-purple-700' : 'text-blue-700'}`}>
                {isB2C ? 'B2C' : 'B2B'}
              </Text>
            </View>
            
            <View className={`px-2.5 py-1 rounded-full ${
              ticket.status?.toLowerCase() === 'open' 
                ? 'bg-amber-100 border border-amber-200' 
                : 'bg-emerald-100 border border-emerald-200'
            }`}>
              <Text className={`text-xs font-bold ${
                ticket.status?.toLowerCase() === 'open' 
                  ? 'text-amber-700' 
                  : 'text-emerald-700'
              }`}>
                {ticket.status?.toUpperCase() || 'UNKNOWN'}
              </Text>
            </View>
          </View>
        </View>

        {/* Issue Description */}
        <View className="bg-slate-50 p-3 rounded-xl mb-3 border border-slate-100">
          <View className="flex-row items-start">
            <Wrench size={16} color="#64748b" style={{ marginTop: 2 }} />
            <Text className="text-slate-700 text-sm font-medium ml-2 flex-1 leading-5">
              {ticket.issue_description || 'No description provided.'}
            </Text>
          </View>
        </View>

        {/* Footer info */}
        <View className="flex-row justify-between items-center mt-2 border-t border-slate-100 pt-3">
          <View className="flex-row items-center">
            <Clock size={14} color="#94a3b8" />
            <Text className="text-slate-500 text-xs font-medium ml-1.5">
              {formattedDate}
            </Text>
          </View>
          
          {ticket.cost_charged > 0 && (
            <Text className="text-emerald-600 font-bold text-sm">
              ₹{ticket.cost_charged}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
