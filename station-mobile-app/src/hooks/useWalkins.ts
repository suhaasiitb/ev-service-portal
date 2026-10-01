import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export type WalkIn = {
  id: string;
  bike_id: string;
  bike_number_text: string;
  engineer_id: string;
  issue_description: string;
  cost_charged: number;
  logged_at: string;
  station_id: string;
  parts_used: string[];
  status?: string;
  completed_at?: string;
};

export function useWalkins() {
  const [walkins, setWalkins] = useState<WalkIn[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchWalkins() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }

      // 1. Fetch walkins
      const { data: walkinData, error: walkinError } = await supabase
        .from("walkins")
        .select(
          "id, bike_id, bike_number_text, engineer_id, issue_description, cost_charged, logged_at, station_id, status, completed_at"
        )
        .eq('engineer_id', session.user.id)
        .order("logged_at", { ascending: false });

      if (walkinError) {
        console.error("Error fetching walkins:", walkinError);
        return;
      }

      // 2. Fetch all walkin_parts
      const { data: partData, error: partError } = await supabase
        .from("walkin_parts")
        .select("walkin_id, part_id");

      if (partError) {
        console.error("Error fetching walkin parts:", partError);
        setWalkins((walkinData || []).map((w: any) => ({ ...w, parts_used: [] })));
        return;
      }

      // 3. Fetch parts catalog for names
      const { data: catalogData, error: catalogError } = await supabase
        .from("parts_catalog")
        .select("id, part_name");

      if (catalogError) {
        console.error("Error fetching parts catalog:", catalogError);
        setWalkins((walkinData || []).map((w: any) => ({ ...w, parts_used: [] })));
        return;
      }

      // Lookup table for part names
      const partNameMap: Record<string, string> = {};
      (catalogData || []).forEach(p => {
        partNameMap[p.id] = p.part_name;
      });

      // Map of walkin_id -> list of part names
      const partsByWalkin: Record<string, string[]> = {};
      (partData || []).forEach(p => {
        const name = partNameMap[p.part_id];
        if (!name) return;
        if (!partsByWalkin[p.walkin_id]) {
          partsByWalkin[p.walkin_id] = [];
        }
        partsByWalkin[p.walkin_id].push(name);
      });

      // Final merge
      const finalData: WalkIn[] = (walkinData || []).map(w => ({
        ...w,
        parts_used: partsByWalkin[w.id] || []
      }));

      setWalkins(finalData);
    } catch (err) {
      console.error("useWalkins error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWalkins();
  }, []);

  return {
    walkins,
    loading,
    refetchWalkins: fetchWalkins,
  };
}
