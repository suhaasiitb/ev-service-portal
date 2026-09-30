import React from 'react';
import { View, ViewProps } from 'react-native';

interface ModernCardProps extends ViewProps {
  children: React.ReactNode;
}

export function ModernCard({ children, className = '', ...props }: ModernCardProps) {
  return (
    <View 
      className={`bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-slate-200/80 dark:border-zinc-800/80 ${className}`}
      {...props}
    >
      {children}
    </View>
  );
}
