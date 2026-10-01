import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { PlayCircle, Clock, CheckCircle2 } from 'lucide-react-native';
import { useActiveJob } from '../hooks/useActiveJob';

export default function ActiveJobWidget({ onCompletePress, hideWhenIdle = false }: { onCompletePress: (job: any) => void, hideWhenIdle?: boolean }) {
  const { activeJob, loading } = useActiveJob();
  const [duration, setDuration] = useState('');

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (activeJob) {
      const updateTimer = () => {
        const start = new Date(activeJob.started_at);
        const now = new Date();
        const diff = now.getTime() - start.getTime();
        
        const hrs = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        
        setDuration(
          `${hrs > 0 ? hrs + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        );
      };
      
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeJob]);

  if (loading) {
    if (hideWhenIdle) return null;
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#3b82f6" />
      </View>
    );
  }

  if (!activeJob) {
    if (hideWhenIdle) return null;
    return (
      <View style={styles.idleContainer}>
        <View style={styles.rowCenter}>
          <View style={styles.idleIconBg}>
            <PlayCircle size={24} color="#64748b" />
          </View>
          <View>
            <Text style={styles.idleTitle}>Status: Idle</Text>
            <Text style={styles.idleSubtitle}>Select a job to begin work</Text>
          </View>
        </View>
      </View>
    );
  }

  const getTypeLabel = () => {
    switch(activeJob.job_type) {
      case 'ticket': return 'Ticket';
      case 'walkin': return 'Walk-In';
      case 'repair': return 'Active Repair';
      case 'pdi': return 'PDI Request';
      default: return 'Job';
    }
  };

  return (
    <View style={styles.activeContainer}>
      <View style={styles.activeHeader}>
        <View style={styles.rowCenter}>
          <View style={styles.activeIconBg}>
            <Clock size={24} color="#10b981" />
          </View>
          <View>
            <Text style={styles.activeTitle}>
              Active {getTypeLabel()}
            </Text>
            <Text style={styles.activeSubtitle}>
              Bike: {activeJob.bike_number_text}
            </Text>
          </View>
        </View>
        <View style={styles.timerBadge}>
          <Text style={styles.timerText}>{duration}</Text>
        </View>
      </View>
      
      <TouchableOpacity 
        style={styles.completeBtn}
        onPress={() => onCompletePress(activeJob)}
      >
        <CheckCircle2 size={18} color="white" />
        <Text style={styles.completeBtnText}>Complete Job</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { backgroundColor: 'white', marginBottom: 16, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'center' },
  idleContainer: { backgroundColor: '#f8fafc', marginBottom: 16, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  idleIconBg: { backgroundColor: '#e2e8f0', padding: 10, borderRadius: 9999, marginRight: 12 },
  idleTitle: { color: '#0f172a', fontWeight: 'bold', fontSize: 16 },
  idleSubtitle: { color: '#64748b', fontSize: 14 },
  activeContainer: { backgroundColor: '#ecfdf5', marginBottom: 16, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#a7f3d0' },
  activeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  activeIconBg: { backgroundColor: '#d1fae5', padding: 10, borderRadius: 9999, marginRight: 12 },
  activeTitle: { color: '#064e3b', fontWeight: 'bold', fontSize: 16 },
  activeSubtitle: { color: '#047857', fontWeight: '600', marginTop: 2 },
  timerBadge: { backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999, borderWidth: 1, borderColor: '#d1fae5' },
  timerText: { color: '#059669', fontWeight: 'bold', fontFamily: 'monospace' },
  completeBtn: { backgroundColor: '#059669', paddingVertical: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  completeBtnText: { color: 'white', fontWeight: 'bold', marginLeft: 8, fontSize: 16 },
});
