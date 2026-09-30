import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../providers/AuthProvider';
import { ScreenWrapper } from '../../../components/ui/ScreenWrapper';
import { ModernCard } from '../../../components/ui/ModernCard';
import { Wrench, Clock, CheckCircle, AlertCircle, List } from 'lucide-react-native';
type Ticket = {
  id: string;
  ticket_no: string;
  issue_description: string;
  status: string;
  created_at: string;
  bike_number_text: string;
};

export default function RiderHistory() {
  const { session } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTickets = async () => {
    try {
      const contactPhone = session?.user?.phone?.replace('+', '');
      if (!contactPhone) return;

      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('ticket_type', 'rider')
        .eq('contact', contactPhone)
        .order('created_at', { ascending: false });

      if (data) setTickets(data);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [session]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTickets();
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'open': return '#f59e0b'; // Amber
      case 'in-progress': return '#3b82f6'; // Blue
      case 'resolved':
      case 'closed': return '#10b981'; // Emerald
      default: return '#6b7280'; // Gray
    }
  };

  const getStatusIcon = (status: string, color: string) => {
    switch (status?.toLowerCase()) {
      case 'open': return <AlertCircle color={color} size={16} />;
      case 'in-progress': return <Clock color={color} size={16} />;
      case 'resolved':
      case 'closed': return <CheckCircle color={color} size={16} />;
      default: return <Wrench color={color} size={16} />;
    }
  };

  const renderTicket = ({ item }: { item: Ticket }) => {
    const statusColor = getStatusColor(item.status);
    
    return (
      <ModernCard className="mb-4">
        <View className="flex-row justify-between items-start mb-3">
          <View>
            <Text className="text-zinc-900 dark:text-white font-bold text-lg">{item.ticket_no}</Text>
            <Text className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
              {new Date(item.created_at).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              }).replace(',', ' •')}
            </Text>
          </View>
          <View 
            className="flex-row items-center px-2.5 py-1.5 rounded-full" 
            style={{ backgroundColor: `${statusColor}15` }}
          >
            {getStatusIcon(item.status, statusColor)}
            <Text 
              style={{ color: statusColor }} 
              className="font-semibold text-xs ml-1.5 capitalize"
            >
              {item.status}
            </Text>
          </View>
        </View>
        
        <View className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
          <Text className="text-zinc-700 dark:text-zinc-300 font-medium">
            <Text className="font-bold text-zinc-900 dark:text-white">Bike: </Text>
            {item.bike_number_text}
          </Text>
          <Text className="text-zinc-700 dark:text-zinc-300 mt-2 leading-5">
            {item.issue_description}
          </Text>
        </View>
      </ModernCard>
    );
  };

  return (
    <ScreenWrapper className="bg-zinc-50 dark:bg-zinc-950">
      <View className="px-6 pt-6 pb-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shadow-sm z-10">
        <Text className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
          My Tickets
        </Text>
        <Text className="text-zinc-500 dark:text-zinc-400 mt-1">Track your fleet service requests</Text>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item) => item.id}
          renderItem={renderTicket}
          contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />
          }
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center py-12 mt-12">
              <View className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full justify-center items-center mb-4">
                <List color="#9ca3af" size={32} />
              </View>
              <Text className="text-lg font-bold text-zinc-900 dark:text-white">No Tickets Found</Text>
              <Text className="text-zinc-500 dark:text-zinc-400 text-center mt-2 px-8">
                You haven't logged any fleet service tickets yet.
              </Text>
            </View>
          }
        />
      )}
    </ScreenWrapper>
  );
}
