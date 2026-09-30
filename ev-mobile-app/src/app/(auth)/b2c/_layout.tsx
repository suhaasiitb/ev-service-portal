import React from 'react';
import { Tabs } from 'expo-router';
import { useAuth } from '../../../providers/AuthProvider';
import { Platform, View } from 'react-native';
import { Home, User } from 'lucide-react-native'; // Standardized on Lucide React Native

export default function B2CLayout() {
  const { session } = useAuth();
  
  return (
    <Tabs screenOptions={{ 
      headerShown: false,
      tabBarActiveTintColor: '#10B981', // Emerald 500
      tabBarInactiveTintColor: '#a1a1aa', // Zinc 400
      tabBarStyle: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 24 : 16,
        left: 24,
        right: 24,
        height: 64,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 32,
        borderWidth: 1,
        borderColor: 'rgba(228, 228, 231, 0.8)', // Zinc 200
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
        paddingBottom: Platform.OS === 'ios' ? 0 : 0, // Fix alignment
      },
      tabBarItemStyle: {
        paddingVertical: 10,
      },
      tabBarLabelStyle: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 4,
      },
      tabBarBackground: () => (
        // Glassmorphism effect context for future BlurView implementation if needed
        <View className="absolute inset-0 bg-white/90 dark:bg-zinc-900/90 rounded-[32px]" />
      ),
    }}>
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={22} strokeWidth={2.5} />,
        }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{ 
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={22} strokeWidth={2.5} />,
        }} 
      />
      <Tabs.Screen 
        name="ticket" 
        options={{ 
          href: null, 
        }} 
      />
    </Tabs>
  );
}
