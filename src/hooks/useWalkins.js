import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export function useWalkins() {
  const [walkins, setWalkins] = useState([]);

  async function fetchWalkins() {
    // 1. Fetch walkins
    const { data: walkinData, error: walkinError } = await supabase
      .from("walkins")
      .select(
        "id, bike_id, bike_number_text, engineer_id, issue_description, cost_charged, logged_at, station_id"
      )
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
      setWalkins(walkinData || []);
      return;
    }

    // 3. Fetch parts catalog for names
    const { data: catalogData, error: catalogError } = await supabase
      .from("parts_catalog")
      .select("id, part_name");

    if (catalogError) {
      console.error("Error fetching parts catalog:", catalogError);
      setWalkins(walkinData || []);
      return;
    }

    // Lookup table for part names
    const partNameMap = {};
    (catalogData || []).forEach(p => {
      partNameMap[p.id] = p.part_name;
    });

    // Map of walkin_id -> list of part names
    const partsByWalkin = {};
    (partData || []).forEach(p => {
      const name = partNameMap[p.part_id];
      if (!name) return;
      if (!partsByWalkin[p.walkin_id]) {
        partsByWalkin[p.walkin_id] = [];
      }
      partsByWalkin[p.walkin_id].push(name);
    });

    // Final merge
    const finalData = (walkinData || []).map(w => ({
      ...w,
      parts_used: partsByWalkin[w.id] || []
    }));

    setWalkins(finalData);
  }

  useEffect(() => {
    fetchWalkins();
  }, []);

  return {
    walkins,
    refetchWalkins: fetchWalkins,
  };
}
