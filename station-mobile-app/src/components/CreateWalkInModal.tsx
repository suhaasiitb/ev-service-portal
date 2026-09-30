import React, { useState } from 'react';
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
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { X, CheckCircle2, Play } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useUserSession } from '../hooks/useUserSession';
import { useActiveJob } from '../hooks/useActiveJob';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function CreateWalkInModal({ visible, onClose, onSuccess }: Props) {
  const { userProfile } = useUserSession();
  const { activeJob, startJob } = useActiveJob();
  
  const [bikeNumber, setBikeNumber] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedBike, setVerifiedBike] = useState<{ id: string, station_id: string, model_id: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleVerifyBike = async () => {
    if (!bikeNumber.trim()) {
      Alert.alert('Validation Error', 'Please enter a Bike Number.');
      return;
    }
    
    setIsVerifying(true);
    setVerifiedBike(null);
    
    try {
      const { data: bike, error: bikeErr } = await supabase
        .from('bikes')
        .select('id, station_id, model_id')
        .eq('bike_number', bikeNumber.trim())
        .maybeSingle();

      if (bikeErr || !bike) {
        Alert.alert('Error', 'Bike number not found in the system.');
        setIsVerifying(false);
        return;
      }

      let stationName = '';
      if (bike.station_id) {
        const { data: stationData } = await supabase
          .from('stations')
          .select('name')
          .eq('id', bike.station_id)
          .single();
        if (stationData) {
          stationName = stationData.name;
        }
      }

      if (!stationName.toLowerCase().includes('nanded')) {
        Alert.alert('Error', `Bike is tagged to ${stationName || 'an unknown'} station. Only Nanded station bikes are allowed for Walk-in.`);
        setIsVerifying(false);
        return;
      }

      setVerifiedBike(bike);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleBeginJob = async () => {
    if (!verifiedBike) {
      Alert.alert('Validation Error', 'Please verify the Bike Number first.');
      return;
    }
    if (activeJob) {
      Alert.alert('Error', 'You already have an active job. Please complete it first.');
      return;
    }

    setLoading(true);
    try {
      // Create a stub Walk-in record
      const { data: insertedRows, error: wErr } = await supabase
        .from('walkins')
        .insert([{
          bike_id: verifiedBike.id,
          bike_number_text: bikeNumber.trim(),
          engineer_id: userProfile?.id,
          issue_description: '', // to be filled later
          cost_charged: 0,
          station_id: verifiedBike.station_id,
          model_id: verifiedBike.model_id,
          logged_at: new Date().toISOString(),
        }])
        .select();

      if (wErr || !insertedRows || insertedRows.length === 0) {
        throw new Error(wErr?.message || 'Failed to create walk-in');
      }

      const walkinId = insertedRows[0].id;

      // Start the active job timer
      await startJob('walkin', walkinId, bikeNumber.trim());

      Alert.alert('Success', 'Walk-in Job Started!');
      setBikeNumber('');
      setVerifiedBike(null);
      onSuccess();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-black/40"
      >
        <View className="bg-white rounded-t-[32px] max-h-[85%] min-h-[50%] shadow-2xl overflow-hidden">
          {/* Header */}
          <View className="flex-row justify-between items-center p-6 border-b border-slate-100">
            <Text className="text-2xl font-bold text-slate-900">Start Walk-In</Text>
            <TouchableOpacity onPress={onClose} className="bg-slate-100 p-2 rounded-full">
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView
            className="p-6"
            contentContainerStyle={{ paddingBottom: 60 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View className="mb-5">
              <Text className="text-sm font-semibold text-slate-700 mb-2">Bike Number <Text className="text-red-500">*</Text></Text>
              <View className="flex-row gap-2">
                <TextInput 
                  className={`flex-1 bg-slate-50 border rounded-2xl px-4 h-14 text-base text-slate-900 ${verifiedBike ? 'border-green-400 bg-green-50/50' : 'border-slate-200'}`}
                  placeholder="e.g. KA-01-AB-1234"
                  placeholderTextColor="#94a3b8"
                  value={bikeNumber}
                  onChangeText={(val) => {
                    setBikeNumber(val);
                    if (verifiedBike) {
                      setVerifiedBike(null);
                    }
                  }}
                  autoCapitalize="characters"
                />
                <TouchableOpacity 
                  onPress={handleVerifyBike}
                  disabled={isVerifying || !!verifiedBike}
                  className={`px-5 rounded-2xl justify-center items-center flex-row ${verifiedBike ? 'bg-green-100' : 'bg-slate-100'}`}
                >
                  {isVerifying ? (
                    <ActivityIndicator color="#3b82f6" />
                  ) : verifiedBike ? (
                    <CheckCircle2 size={24} color="#16a34a" />
                  ) : (
                    <Text className="text-slate-700 font-semibold">Verify</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View className="mb-5">
              <Text className="text-sm font-semibold text-slate-700 mb-2">Technician</Text>
              <View className="bg-slate-100 border border-slate-200 rounded-2xl px-4 py-4">
                <Text className="text-base font-medium text-slate-900">{userProfile?.name || 'Loading...'}</Text>
              </View>
            </View>
          </ScrollView>

          {/* Footer Action */}
          <View className="p-6 border-t border-slate-100 bg-white">
             <TouchableOpacity 
                className={`h-14 rounded-2xl justify-center items-center shadow-lg flex-row ${!verifiedBike || activeJob ? 'bg-slate-400' : 'bg-emerald-600 shadow-emerald-500/30'}`}
                onPress={handleBeginJob}
                disabled={loading || !verifiedBike || !!activeJob}
              >
                <View style={{ marginRight: 8 }}>
                  {loading ? <ActivityIndicator color="white" /> : <Play size={20} color="white" />}
                </View>
                <Text className="text-white font-bold text-lg tracking-wide">
                  {activeJob ? 'Another job is active' : 'Begin Job'}
                </Text>
             </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
