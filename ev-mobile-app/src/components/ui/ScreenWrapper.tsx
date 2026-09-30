import React from 'react';
import { View, KeyboardAvoidingView, Platform, ViewProps } from 'react-native';
import { SafeAreaView, SafeAreaViewProps } from 'react-native-safe-area-context';

interface ScreenWrapperProps extends SafeAreaViewProps {
  children: React.ReactNode;
  withKeyboard?: boolean;
}

export function ScreenWrapper({ children, className = '', withKeyboard = false, ...props }: ScreenWrapperProps) {
  const content = (
    <SafeAreaView 
      className={`flex-1 bg-slate-50 dark:bg-zinc-950 ${className}`} 
      {...props}
    >
      {children}
    </SafeAreaView>
  );

  if (withKeyboard) {
    return (
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }

  return content;
}
