import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../providers/AuthProvider";

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  role: string;
  station_id: string;
};

export function useUserSession() {
  const { session } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserProfile() {
      if (!session?.user) {
        setUserProfile(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("id, email, name, role, station_id")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!error && data) {
        setUserProfile(data as UserProfile);
      } else {
        console.error("Error fetching user profile:", error);
      }
      setLoading(false);
    }

    fetchUserProfile();
  }, [session]);

  return { userProfile, loading };
}
