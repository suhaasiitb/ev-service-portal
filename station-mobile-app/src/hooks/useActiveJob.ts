import { useState, useEffect } from "react";
import { DeviceEventEmitter } from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../providers/AuthProvider";

export type ActiveJob = {
  id: string;
  technician_id: string;
  job_type: 'ticket' | 'walkin' | 'pdi' | 'repair';
  job_id: string;
  bike_number_text: string;
  started_at: string;
  completed_at: string | null;
  status: 'active' | 'completed';
};

export function useActiveJob() {
  const { session } = useAuth();
  const [activeJob, setActiveJob] = useState<ActiveJob | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchActiveJob() {
    if (!session?.user) {
      setActiveJob(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("technician_jobs")
      .select("*")
      .eq("technician_id", session.user.id)
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      setActiveJob(data as ActiveJob);
    } else {
      setActiveJob(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchActiveJob();
    const sub = DeviceEventEmitter.addListener('refetchActiveJob', fetchActiveJob);
    return () => {
      sub.remove();
    };
  }, [session]);

  const startJob = async (job_type: string, job_id: string, bike_number_text: string) => {
    if (!session?.user) return null;
    
    // Check if there's already an active job
    if (activeJob) {
      throw new Error("You already have an active job. Please complete it first.");
    }

    const { data, error } = await supabase
      .from("technician_jobs")
      .insert([{
        technician_id: session.user.id,
        job_type,
        job_id,
        bike_number_text,
        status: "active"
      }])
      .select()
      .single();

    if (error) throw error;
    setActiveJob(data as ActiveJob);
    DeviceEventEmitter.emit('refetchActiveJob');
    return data;
  };

  const completeActiveJob = async () => {
    if (!activeJob) return;
    
    const { error } = await supabase
      .from("technician_jobs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString()
      })
      .eq("id", activeJob.id);

    if (error) throw error;
    setActiveJob(null);
    DeviceEventEmitter.emit('refetchActiveJob');
  };

  return { activeJob, loading, refetchActiveJob: fetchActiveJob, startJob, completeActiveJob };
}
