import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Image, Dimensions } from 'react-native';
import { useAuth } from '../../../providers/AuthProvider';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '../../../components/ui/ScreenWrapper';
import { Wrench } from 'lucide-react-native';

const { width } = Dimensions.get('window');

type CustomerProfile = {
  id: string;
  phone_number: string;
  full_name: string;
  email: string | null;
};

const SERVICES = [
  { id: 'puncture', title: 'Puncture Repair', image: require('../../../../assets/images/services/puncture.jpg') },
  { id: 'washing', title: 'Washing & Cleaning', image: require('../../../../assets/images/services/washing.jpg') },
  { id: 'oil', title: 'Engine Oil Change', image: require('../../../../assets/images/services/engine_oil.jpg') },
  { id: 'motor', title: 'Motor Repairing', image: require('../../../../assets/images/services/motor_repair.jpg') },
];

export default function B2CHome() {
  const { session } = useAuth();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  
  // Onboarding state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (session?.user?.id) {
      checkProfile();
    }
  }, [session]);

  const checkProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', session?.user?.id)
        .single();
        
      if (data) {
        setProfile(data);
      }
    } catch (e) {
      console.log('No profile found, onboarding needed');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = async () => {
    setErrorMsg('');
    if (fullName.trim().length < 3) {
      setErrorMsg('Full name must be at least 3 characters.');
      return;
    }
    
    if (email.trim().length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setErrorMsg('Please enter a valid email address.');
        return;
      }
    }

    setLoading(true);
    
    const newProfile = {
      id: session?.user?.id,
      phone_number: session?.user?.phone || '',
      full_name: fullName.trim(),
      email: email.trim() || null,
    };

    const { error } = await supabase
      .from('customers')
      .insert([newProfile]);
      
    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    } else {
      setProfile(newProfile as CustomerProfile);
      setLoading(false);
    }
  };

  const navigateToService = (serviceTitle: string) => {
    router.push({ pathname: '/(auth)/b2c/ticket', params: { presetService: serviceTitle } });
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-zinc-50 dark:bg-zinc-950">
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  // 1. Onboarding Flow if no profile
  if (!profile) {
    return (
      <ScreenWrapper className="bg-zinc-50 dark:bg-zinc-950" withKeyboard>
        <View className="flex-1 px-8 justify-center">
          <Text className="text-4xl font-extrabold text-zinc-900 dark:text-white mb-2 tracking-tight">
            Welcome to UrbanConnect
          </Text>
          <Text className="text-base text-zinc-500 dark:text-zinc-400 mb-8 font-medium">
            Let's create your profile
          </Text>
          
          {errorMsg ? <Text className="text-red-500 font-semibold mb-6">{errorMsg}</Text> : null}

          <View className="mb-6">
            <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Full Name *</Text>
            <View className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 h-16 justify-center shadow-sm">
              <TextInput
                className="flex-1 text-base font-medium text-zinc-900 dark:text-white"
                placeholder="John Doe"
                placeholderTextColor="#a1a1aa"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
            </View>
          </View>
          
          <View className="mb-10">
            <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Email Address (Optional)</Text>
            <View className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 h-16 justify-center shadow-sm">
              <TextInput
                className="flex-1 text-base font-medium text-zinc-900 dark:text-white"
                placeholder="john@example.com"
                placeholderTextColor="#a1a1aa"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>
          
          <TouchableOpacity 
            className="bg-brand h-16 rounded-2xl items-center justify-center shadow-lg shadow-brand/30" 
            onPress={handleCreateProfile}
            activeOpacity={0.8}
          >
            <Text className="text-white text-lg font-bold tracking-wide">Complete Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            className="mt-8 py-3 items-center" 
            onPress={() => supabase.auth.signOut()}
            activeOpacity={0.7}
          >
            <Text className="text-red-500 font-semibold text-base">Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  // 2. Dashboard Flow
  return (
    <ScreenWrapper className="bg-zinc-50 dark:bg-zinc-950">
      <View className="flex-row items-start justify-between px-6 pt-6 pb-2">
        <View>
          <Text className="text-base text-zinc-500 dark:text-zinc-400 font-medium">Welcome back,</Text>
          <Text className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">{profile.full_name}</Text>
        </View>
      </View>

      <ScrollView contentContainerClassName="px-6 pb-32 pt-4">
        {/* Hero Banner */}
        <View className="bg-zinc-900 dark:bg-zinc-800 rounded-3xl p-8 mb-8 shadow-xl shadow-zinc-900/20">
          <Text className="text-white text-2xl font-bold tracking-tight mb-2">Need a quick fix?</Text>
          <Text className="text-zinc-400 text-sm font-medium leading-relaxed">
            Book a 2-wheeler service in under 10 minutes. Our experts come to you.
          </Text>
        </View>

        <Text className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight mb-4">Our Services</Text>
        
        <View className="flex-row flex-wrap justify-between">
          {SERVICES.map((service) => (
            <TouchableOpacity 
              key={service.id} 
              className="bg-white dark:bg-zinc-900 rounded-3xl mb-4 overflow-hidden border border-zinc-200/60 dark:border-zinc-800/80 shadow-sm"
              style={{ width: (width - 64) / 2 }}
              activeOpacity={0.7}
              onPress={() => navigateToService(service.title)}
            >
              <Image source={service.image} className="w-full h-32" resizeMode="cover" />
              <View className="p-4 items-center justify-center h-16">
                <Text className="text-[13px] font-bold text-zinc-800 dark:text-zinc-200 text-center tracking-tight leading-tight">
                  {service.title}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
          
          {/* Custom Ticket Option */}
          <TouchableOpacity 
            className="bg-zinc-100 dark:bg-zinc-800/50 rounded-3xl mb-4 border border-dashed border-zinc-300 dark:border-zinc-700 shadow-sm items-center justify-center"
            style={{ width: (width - 64) / 2 }}
            activeOpacity={0.7}
            onPress={() => navigateToService('')}
          >
            <View className="w-full h-32 items-center justify-center">
              <Wrench size={32} color="#10B981" strokeWidth={2} />
            </View>
            <View className="p-4 items-center justify-center h-16 w-full">
              <Text className="text-[13px] font-bold text-zinc-800 dark:text-zinc-200 text-center tracking-tight">
                Other Repairs
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
