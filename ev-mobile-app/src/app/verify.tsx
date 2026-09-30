import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import { StatusBar } from 'expo-status-bar';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';

export default function VerifyScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerifyOTP = async () => {
    if (!code || code.length < 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    if (!phone) {
      Alert.alert('Error', 'Phone number missing. Please go back and try again.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: code,
      type: 'sms',
    });

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <ScreenWrapper className="bg-zinc-950 dark:bg-zinc-950" withKeyboard>
      <StatusBar style="light" />
      
      <View className="flex-1 items-center justify-center px-8">
        <View className="w-20 h-20 bg-brand rounded-3xl justify-center items-center mb-6 shadow-lg shadow-brand/40">
          <Text className="text-white text-3xl font-black tracking-tighter">UC</Text>
        </View>
        <Text className="text-4xl font-extrabold text-white mb-3 tracking-tight text-center">
          Verify OTP
        </Text>
        <Text className="text-base text-zinc-400 text-center font-medium leading-relaxed">
          Enter the 6-digit code sent to {phone}
        </Text>
      </View>

      <View className="bg-white dark:bg-zinc-900 rounded-t-[40px] px-8 pt-10 pb-12 shadow-2xl">
        <TextInput
          className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 text-3xl font-bold tracking-[0.5em] text-center text-zinc-900 dark:text-white mb-6 h-20"
          placeholder="000000"
          placeholderTextColor="#9ca3af"
          keyboardType="number-pad"
          value={code}
          onChangeText={setCode}
          maxLength={6}
        />

        <TouchableOpacity 
          className={`h-16 rounded-2xl justify-center items-center shadow-lg shadow-brand/30 ${loading ? 'bg-brand/70' : 'bg-brand'}`}
          onPress={handleVerifyOTP} 
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-lg font-bold tracking-wide">Verify</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}
