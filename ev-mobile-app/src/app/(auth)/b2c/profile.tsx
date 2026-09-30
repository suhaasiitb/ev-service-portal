import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../providers/AuthProvider';
import { ScreenWrapper } from '../../../components/ui/ScreenWrapper';
import { ModernCard } from '../../../components/ui/ModernCard';
import { Settings, LogOut, Ticket, Clock, CheckCircle2 } from 'lucide-react-native';

type TicketData = {
  id: string;
  ticket_no: string;
  issue_description: string;
  status: string;
  created_at: string;
};

export default function ProfileScreen() {
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [tickets, setTickets] = useState<TicketData[]>([]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchProfileAndTickets();
    }
  }, [session]);

  const fetchProfileAndTickets = async () => {
    try {
      const { data: profile } = await supabase
        .from('customers')
        .select('full_name, email')
        .eq('id', session?.user?.id)
        .single();
        
      if (profile) {
        setFullName(profile.full_name || '');
        setEmail(profile.email || '');
      }

      const { data: userTickets } = await supabase
        .from('tickets')
        .select('id, ticket_no, issue_description, status, created_at')
        .eq('customer_id', session?.user?.id)
        .order('created_at', { ascending: false });

      if (userTickets) {
        setTickets(userTickets);
      }
    } catch (e) {
      console.log('Error fetching profile/tickets', e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (fullName.trim().length < 3) {
      Alert.alert('Error', 'Full name must be at least 3 characters.');
      return;
    }
    
    if (email.trim().length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        Alert.alert('Error', 'Please enter a valid email address.');
        return;
      }
    }

    setSaving(true);
    const { error } = await supabase
      .from('customers')
      .update({ full_name: fullName.trim(), email: email.trim() || null })
      .eq('id', session?.user?.id);

    setSaving(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Profile updated successfully!');
    }
  };

  const handleSignOut = () => {
    supabase.auth.signOut();
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open': 
        return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', icon: <Ticket size={12} color="#3b82f6" /> };
      case 'under_repair': 
        return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', icon: <Clock size={12} color="#f59e0b" /> };
      case 'resolved': 
      case 'closed':
        return { bg: 'bg-brand/10 dark:bg-brand/20', text: 'text-brand', icon: <CheckCircle2 size={12} color="#10B981" /> };
      default: 
        return { bg: 'bg-zinc-100 dark:bg-zinc-800', text: 'text-zinc-600 dark:text-zinc-400', icon: <Ticket size={12} color="#71717a" /> };
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-zinc-50 dark:bg-zinc-950">
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <ScreenWrapper className="bg-zinc-50 dark:bg-zinc-950" withKeyboard>
      <View className="flex-row justify-between items-center px-6 pt-6 pb-4">
        <Text className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">My Profile</Text>
        <TouchableOpacity 
          onPress={handleSignOut}
          className="bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-full flex-row items-center"
        >
          <LogOut size={16} color="#ef4444" style={{ marginRight: 6 }} />
          <Text className="text-red-500 font-bold text-sm">Log Out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerClassName="px-6 pb-32 pt-2">
        <ModernCard className="mb-6">
          <View className="flex-row items-center mb-6">
            <Settings size={20} color="#10B981" />
            <Text className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight ml-3">Personal Details</Text>
          </View>
          
          <View className="mb-4">
            <Text className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-wider">Full Name</Text>
            <View className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 h-14 justify-center">
              <TextInput
                className="flex-1 text-base font-semibold text-zinc-900 dark:text-white"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
            </View>
          </View>
          
          <View className="mb-6">
            <Text className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-wider">Email Address</Text>
            <View className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 h-14 justify-center">
              <TextInput
                className="flex-1 text-base font-semibold text-zinc-900 dark:text-white"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <TouchableOpacity 
            className={`h-14 rounded-2xl items-center justify-center ${saving ? 'bg-brand/70' : 'bg-brand'}`} 
            onPress={handleUpdateProfile}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text className="text-white text-base font-bold tracking-wide">Save Changes</Text>}
          </TouchableOpacity>
        </ModernCard>

        <ModernCard>
          <View className="flex-row items-center mb-6">
            <Ticket size={20} color="#10B981" />
            <Text className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight ml-3">Ticket History</Text>
          </View>
          
          {tickets.length === 0 ? (
            <View className="py-8 items-center justify-center">
              <Ticket size={48} color="#e4e4e7" strokeWidth={1} />
              <Text className="text-zinc-500 dark:text-zinc-400 mt-4 font-medium">You haven't raised any tickets yet.</Text>
            </View>
          ) : (
            tickets.map((ticket, index) => {
              const badge = getStatusBadge(ticket.status);
              const isLast = index === tickets.length - 1;
              
              return (
                <View key={ticket.id} className={`py-4 ${!isLast ? 'border-b border-zinc-100 dark:border-zinc-800' : ''}`}>
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">{ticket.ticket_no}</Text>
                    <View className={`flex-row items-center px-2.5 py-1 rounded-full ${badge.bg}`}>
                      {badge.icon}
                      <Text className={`text-[10px] font-black uppercase tracking-wider ml-1.5 ${badge.text}`}>
                        {ticket.status.replace('_', ' ')}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-xs text-zinc-400 dark:text-zinc-500 font-medium mb-1.5">
                    {new Date(ticket.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </Text>
                  <Text className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed" numberOfLines={2}>
                    {ticket.issue_description}
                  </Text>
                </View>
              );
            })
          )}
        </ModernCard>
      </ScrollView>
    </ScreenWrapper>
  );
}
