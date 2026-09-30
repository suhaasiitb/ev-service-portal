import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../providers/AuthProvider';
import { supabase } from '../../../lib/supabase';
import { ScreenWrapper } from '../../../components/ui/ScreenWrapper';
import { ModernCard } from '../../../components/ui/ModernCard';
import { LogOut, Navigation, Bike, MapPin, Wrench } from 'lucide-react-native';

type RiderAssignment = {
  id: string;
  bikes: { bike_number: string };
  stations: { name: string };
};

export default function RiderHome() {
  const { session } = useAuth();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [riderName, setRiderName] = useState('');
  const [assignment, setAssignment] = useState<RiderAssignment | null>(null);

  useEffect(() => {
    fetchAssignment();
  }, []);

  const fetchAssignment = async () => {
    try {
      const phoneNo = session?.user?.phone?.replace(/\D/g, '').slice(-10);
      if (!phoneNo) return;
      
      const { data: rider } = await supabase.from('riders').select('id, name').eq('phone', phoneNo).single();
      
      if (rider) {
        setRiderName(rider.name);
        
        const { data: assign } = await supabase
          .from('rider_bike_assignments')
          .select('id, bikes(bike_number), stations(name)')
          .eq('rider_id', rider.id)
          .is('unassigned_at', null)
          .single();
          
        if (assign) setAssignment(assign as unknown as RiderAssignment);
      }
    } catch (e) {
      console.log('Error fetching assignment', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper className="bg-zinc-50 dark:bg-zinc-950">
      <View className="flex-row justify-between items-center px-6 pt-6 pb-6 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <View>
          <Text className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Rider Portal</Text>
          <Text className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
            {riderName || 'Welcome'}
          </Text>
        </View>
        <TouchableOpacity 
          onPress={() => supabase.auth.signOut()}
          className="w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-full justify-center items-center"
        >
          <LogOut size={20} color="#ef4444" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <View className="flex-1 px-6 pt-8">
        
        <TouchableOpacity 
          className="bg-brand rounded-[24px] p-6 flex-row items-center justify-between mb-8 shadow-xl shadow-brand/30"
          onPress={() => router.push('/(auth)/rider/ticket')}
          activeOpacity={0.8}
        >
          <View className="flex-row items-center">
            <View className="w-12 h-12 bg-white/20 rounded-full justify-center items-center mr-4 backdrop-blur-sm">
              <Wrench color="#fff" size={24} strokeWidth={2} />
            </View>
            <View>
              <Text className="text-white text-xl font-bold tracking-tight mb-1">Service Ticket</Text>
              <Text className="text-white/80 font-medium text-sm">Report bike issues quickly</Text>
            </View>
          </View>
          <Navigation color="#fff" size={24} strokeWidth={2.5} className="opacity-80" />
        </TouchableOpacity>

        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#10B981" />
          </View>
        ) : (
          <ModernCard>
            <Text className="text-lg font-bold text-zinc-900 dark:text-white mb-6 tracking-tight">Current Assignment</Text>
            
            {assignment ? (
              <View>
                <View className="flex-row items-center mb-6">
                  <View className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl justify-center items-center mr-4">
                    <Bike color="#3b82f6" size={32} strokeWidth={2} />
                  </View>
                  <View>
                    <Text className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Bike Number</Text>
                    <Text className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 tracking-tight uppercase">
                      {assignment.bikes.bike_number}
                    </Text>
                  </View>
                </View>
                
                <View className="flex-row items-center bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  <MapPin color="#10B981" size={20} className="mr-3" />
                  <View>
                    <Text className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Station</Text>
                    <Text className="text-base font-bold text-zinc-900 dark:text-white">{assignment.stations?.name || 'Unknown'}</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View className="items-center py-6">
                <Bike color="#e4e4e7" size={48} strokeWidth={1} />
                <Text className="text-zinc-500 dark:text-zinc-400 mt-4 font-medium">No active assignment found.</Text>
              </View>
            )}
          </ModernCard>
        )}
      </View>
    </ScreenWrapper>
  );
}
