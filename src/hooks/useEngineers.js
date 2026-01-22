import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export function useEngineers() {
  const [engineers, setEngineers] = useState([]);

  async function fetchEngineers() {
    const { data, error } = await supabase
      .from("engineers")
      .select("id, name, station_id");

    if (!error) setEngineers(data || []);
  }

  useEffect(() => {
    fetchEngineers();
  }, []);

  return { engineers };
}
