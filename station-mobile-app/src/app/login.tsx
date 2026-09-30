import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const passwordInputRef = useRef<TextInput>(null);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 50);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      Alert.alert('Login Failed', error.message);
    }
  };

  const handleFocus = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 50);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <StatusBar style="light" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Hero / Header Section */}
            <View
              className={`items-center justify-center px-8 transition-all ${
                isKeyboardVisible ? 'py-4' : 'flex-1 py-10'
              }`}
            >
              {!isKeyboardVisible && (
                <View className="w-20 h-20 bg-blue-500 rounded-2xl items-center justify-center mb-6 shadow-lg shadow-blue-500/40">
                  <Text className="text-white text-3xl font-black tracking-tighter">
                    UC
                  </Text>
                </View>
              )}
              <Text
                className={`${
                  isKeyboardVisible ? 'text-2xl mb-1' : 'text-4xl mb-3'
                } font-extrabold text-white tracking-tight text-center`}
              >
                Technician Portal
              </Text>
              {!isKeyboardVisible && (
                <Text className="text-base text-slate-400 text-center font-medium leading-6">
                  Manage tickets, walk-ins, and PDIs efficiently.
                </Text>
              )}
            </View>

            {/* Login Card Form */}
            <View
              className={`bg-white rounded-t-[32px] px-8 shadow-2xl shadow-black/10 ${
                isKeyboardVisible ? 'pt-6 pb-8' : 'pt-10 pb-10'
              }`}
            >
              <Text className="text-2xl font-bold text-slate-900 mb-1">
                Technician Login
              </Text>
              <Text
                className={`text-slate-500 ${
                  isKeyboardVisible ? 'text-xs mb-4' : 'text-[15px] mb-6'
                }`}
              >
                Enter your credentials
              </Text>

              <View className="bg-slate-50 border border-slate-200 rounded-2xl px-4 h-14 mb-3 justify-center">
                <TextInput
                  className="flex-1 text-base font-medium text-slate-900"
                  placeholder="Email Address"
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                  onFocus={handleFocus}
                />
              </View>

              <View className="bg-slate-50 border border-slate-200 rounded-2xl px-4 h-14 mb-5 justify-center">
                <TextInput
                  ref={passwordInputRef}
                  className="flex-1 text-base font-medium text-slate-900"
                  placeholder="Password"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  onFocus={handleFocus}
                />
              </View>

              <TouchableOpacity
                className={`bg-blue-500 h-14 rounded-2xl justify-center items-center shadow-lg shadow-blue-500/30 ${
                  loading ? 'opacity-70' : ''
                }`}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white text-base font-bold tracking-wide">
                    Login
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}
