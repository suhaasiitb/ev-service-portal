import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter as useExpoRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { StatusBar } from 'expo-status-bar';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';

export default function LoginScreen() {
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useExpoRouter();

  const handleSendOTP = async () => {
    if (!phone) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    setLoading(true);
    let formattedPhone = phone;
    if (!phone.startsWith('+')) {
      const prefix = countryCode.startsWith('+') ? countryCode : `+${countryCode}`;
      formattedPhone = prefix + phone;
    }

    const { error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
    });

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      router.push({ pathname: '/verify', params: { phone: formattedPhone } });
    }
  };

  return (
    <ScreenWrapper className="bg-zinc-950 dark:bg-zinc-950" withKeyboard>
      <StatusBar style="light" />
      
      {/* Header Section with Brand Colors */}
      <View className="flex-1 items-center justify-center px-8">
        <View className="w-20 h-20 bg-brand rounded-3xl justify-center items-center mb-6 shadow-lg shadow-brand/40">
          <Text className="text-white text-3xl font-black tracking-tighter">UC</Text>
        </View>
        <Text className="text-4xl font-extrabold text-white mb-3 tracking-tight text-center">
          UrbanConnect
        </Text>
        <Text className="text-base text-zinc-400 text-center font-medium leading-relaxed">
          Book 2-Wheeler Service in 10 Mins.
        </Text>
      </View>

      {/* Form Section */}
      <View className="bg-white dark:bg-zinc-900 rounded-t-[40px] px-8 pt-10 pb-12 shadow-2xl">
        <Text className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
          Get Started
        </Text>
        <Text className="text-base text-zinc-500 dark:text-zinc-400 mb-8">
          Enter your phone number to login or register
        </Text>

        <View className="flex-row items-center bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 mb-6 h-16">
          <TextInput
            className="text-lg font-semibold text-zinc-900 dark:text-white mr-3 border-r border-zinc-200 dark:border-zinc-700 pr-3 w-16 text-center"
            value={countryCode}
            onChangeText={setCountryCode}
            keyboardType="phone-pad"
            maxLength={4}
          />
          <TextInput
            className="flex-1 text-lg font-semibold text-zinc-900 dark:text-white h-full"
            placeholder="98765 43210"
            placeholderTextColor="#9ca3af"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            autoCapitalize="none"
            maxLength={10}
          />
        </View>

        <TouchableOpacity 
          className={`h-16 rounded-2xl justify-center items-center shadow-lg shadow-brand/30 ${loading ? 'bg-brand/70' : 'bg-brand'}`}
          onPress={handleSendOTP} 
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-lg font-bold tracking-wide">Continue</Text>
          )}
        </TouchableOpacity>
        
        <Text className="mt-6 text-center text-xs text-zinc-400 leading-tight">
          By continuing, you agree to our Terms of Service & Privacy Policy
        </Text>

      </View>
    </ScreenWrapper>
  );
}
