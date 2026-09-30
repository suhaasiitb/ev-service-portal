import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { X, CheckCircle2, Clock, MapPin, Play } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { Ticket } from '../hooks/useTickets';
import { useUserSession } from '../hooks/useUserSession';
import { useActiveJob } from '../hooks/useActiveJob';

type Props = {
  visible: boolean;
  onClose: () => void;
  ticket: Ticket | null;
  onSuccess: () => void;
};

export default function CloseTicketModal({ visible, onClose, ticket, onSuccess }: Props) {
  const { userProfile } = useUserSession();
  const { activeJob, startJob, completeActiveJob, refetchActiveJob } = useActiveJob();
  
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [cost, setCost] = useState('');
  const [loading, setLoading] = useState(false);
  const [durationString, setDurationString] = useState('');

  const scrollViewRef = useRef<ScrollView>(null);

  const handleInputFocus = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Check if this specific ticket is the currently active job
  const isThisJobActive = activeJob?.job_type === 'ticket' && activeJob?.job_id === ticket?.id;
  const isAnotherJobActive = activeJob !== null && !isThisJobActive;

  useEffect(() => {
    if (visible && ticket) {
      if (isThisJobActive && activeJob) {
        const start = new Date(activeJob.started_at);
        const end = new Date();
        const diffMs = end.getTime() - start.getTime();
        
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        let duration = '';
        if (diffHrs > 0) duration += `${diffHrs} hour${diffHrs > 1 ? 's' : ''} `;
        duration += `${diffMins} min${diffMins > 1 ? 's' : ''}`;
        
        setDurationString(duration.trim() || 'Just started');
      } else {
        setDurationString('');
      }
      
      setResolutionNotes('');
      setCost('');
      refetchActiveJob(); // Refresh job status when modal opens
    }
  }, [visible, ticket, isThisJobActive, activeJob]);

  const handleBeginJob = async () => {
    if (!ticket) return;
    if (isAnotherJobActive) {
      Alert.alert('Error', 'You already have another active job. Please complete it first.');
      return;
    }
    
    setLoading(true);
    try {
      await startJob('ticket', ticket.id, ticket.bike_number_text);
      Alert.alert('Job Started', 'Timer has started for this ticket!');
      // We don't close the modal automatically, just let the state update
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to start job.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!ticket) return;
    if (!isThisJobActive) {
      Alert.alert('Validation Error', 'You must begin the job before completing it.');
      return;
    }

    setLoading(true);
    try {
      const closedAt = new Date().toISOString();
      const costCharged = parseFloat(cost || '0');

      const { error } = await supabase
        .from('tickets')
        .update({
          status: 'closed',
          closed_by: userProfile?.id,
          closed_at: closedAt,
          resolution_notes: resolutionNotes.trim(),
          cost_charged: costCharged,
          service_duration: durationString,
        })
        .eq('id', ticket.id);

      if (error) throw new Error(error.message);

      await completeActiveJob();

      Alert.alert('Success', 'Ticket marked as resolved and closed successfully!');
      onSuccess();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to close ticket.');
    } finally {
      setLoading(false);
    }
  };

  if (!ticket) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-black/40"
      >
        <View className="bg-white rounded-t-[32px] h-[85%] shadow-2xl overflow-hidden">
          {/* Header */}
          <View className="flex-row justify-between items-center p-6 border-b border-slate-100">
            <Text className="text-2xl font-bold text-slate-900">Resolve Ticket</Text>
            <TouchableOpacity onPress={onClose} className="bg-slate-100 p-2 rounded-full">
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollViewRef}
            className="p-6"
            contentContainerStyle={{ paddingBottom: 160 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Read-Only Context */}
            <View className="bg-slate-50 p-4 rounded-2xl mb-6 border border-slate-100">
              <View className="flex-row justify-between mb-2">
                <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ticket No</Text>
                <Text className="text-sm font-bold text-slate-900">{ticket.ticket_no || 'TICKET'}</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bike No</Text>
                <Text className="text-sm font-bold text-slate-900">{ticket.bike_number_text}</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reported</Text>
                <Text className="text-sm font-medium text-slate-700">
                  {new Date(ticket.reported_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </Text>
              </View>
              <View className="flex-col mt-2 pt-2 border-t border-slate-200">
                <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Issue Description</Text>
                <Text className="text-sm font-medium text-slate-800 leading-5">
                  {ticket.issue_description || 'No description provided.'}
                </Text>
              </View>
              {ticket.location && (
                <View className="flex-col mt-2 pt-2 border-t border-slate-200">
                  <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Customer Location</Text>
                  <TouchableOpacity 
                    className="flex-row items-center bg-blue-50 p-3 rounded-xl border border-blue-100"
                    onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ticket.location!)}`)}
                  >
                    <MapPin size={16} color="#3b82f6" />
                    <Text className="text-sm font-medium text-blue-700 ml-2 flex-1" numberOfLines={2}>
                      {ticket.location}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Begin Job Button */}
            {!isThisJobActive && (
              <View className="mb-6">
                <TouchableOpacity 
                  className={`h-14 rounded-2xl justify-center items-center shadow-lg flex-row ${isAnotherJobActive ? 'bg-slate-400' : 'bg-emerald-600 shadow-emerald-500/30'}`}
                  onPress={handleBeginJob}
                  disabled={loading || isAnotherJobActive}
                >
                  <View style={{ marginRight: 8 }}>
                    {loading ? <ActivityIndicator color="white" /> : <Play size={20} color="white" />}
                  </View>
                  <Text className="text-white font-bold text-lg tracking-wide">Begin Job</Text>
                </TouchableOpacity>
                {isAnotherJobActive && (
                  <Text className="text-red-500 text-sm text-center mt-2">You already have an active job in progress.</Text>
                )}
              </View>
            )}

            {/* Form Fields - Only enabled if job is active */}
            <View className={`mb-5 ${!isThisJobActive ? 'opacity-50' : ''}`} pointerEvents={isThisJobActive ? 'auto' : 'none'}>
              <Text className="text-sm font-semibold text-slate-700 mb-2">Assigned To</Text>
              <View className="bg-slate-100 border border-slate-200 rounded-2xl px-4 py-4">
                <Text className="text-base font-medium text-slate-900">{userProfile?.name || 'Loading...'}</Text>
              </View>
            </View>

            <View className={`mb-5 ${!isThisJobActive ? 'opacity-50' : ''}`} pointerEvents={isThisJobActive ? 'auto' : 'none'}>
              <Text className="text-sm font-semibold text-slate-700 mb-2">Resolution Notes</Text>
              <TextInput 
                className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-base text-slate-900"
                placeholder="What was done to fix the issue?"
                placeholderTextColor="#94a3b8"
                value={resolutionNotes}
                onChangeText={setResolutionNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                onFocus={handleInputFocus}
              />
            </View>

            <View className={`mb-5 ${!isThisJobActive ? 'opacity-50' : ''}`} pointerEvents={isThisJobActive ? 'auto' : 'none'}>
              <Text className="text-sm font-semibold text-slate-700 mb-2">Cost Charged (₹)</Text>
              <TextInput 
                className="bg-slate-50 border border-slate-200 rounded-2xl px-4 h-14 text-base text-slate-900"
                placeholder="0.00"
                placeholderTextColor="#94a3b8"
                value={cost}
                onChangeText={setCost}
                keyboardType="numeric"
                onFocus={handleInputFocus}
              />
            </View>

            {/* Service Duration display */}
            {isThisJobActive && (
              <View className="flex-row items-center justify-center p-4 bg-emerald-50 rounded-2xl border border-emerald-100 mb-4">
                <Clock size={18} color="#10b981" />
                <Text className="text-emerald-700 font-medium ml-2">
                  Total Service Time: <Text className="font-bold">{durationString}</Text>
                </Text>
              </View>
            )}

          </ScrollView>

          {/* Footer Action */}
          <View className={`p-6 border-t border-slate-100 bg-white ${!isThisJobActive ? 'opacity-50' : ''}`} pointerEvents={isThisJobActive ? 'auto' : 'none'}>
             <TouchableOpacity 
                className={`bg-blue-600 h-14 rounded-2xl justify-center items-center shadow-lg shadow-blue-500/30 flex-row ${loading ? 'opacity-70' : ''}`}
                onPress={handleSubmit}
                disabled={loading || !isThisJobActive}
              >
                <View style={{ marginRight: 8 }}>
                  {loading ? <ActivityIndicator color="white" /> : <CheckCircle2 size={20} color="white" />}
                </View>
                <Text className="text-white font-bold text-lg tracking-wide">Complete Job</Text>
             </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
