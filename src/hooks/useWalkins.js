import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export function useWalkins() {
  const [walkins, setWalkins] = useState([]);

  async function fetchWalkins() {
    const { data, error } = await supabase
      .from("walkins")
      .select(
        "id, bike_id, bike_number_text, engineer_id, issue_description, cost_charged, logged_at, station_id"
      )
      .order("logged_at", { ascending: false });

    if (!error) setWalkins(data || []);
  }

  useEffect(() => {
    fetchWalkins();
  }, []);

  return {
    walkins,
    refetchWalkins: fetchWalkins,
  };
}
