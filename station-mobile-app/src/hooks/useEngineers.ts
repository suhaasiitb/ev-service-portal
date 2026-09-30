import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export type Engineer = {
  id: string;
  name: string;
  station_id: string;
};

export function useEngineers() {
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchEngineers() {
    setLoading(true);
    const { data, error } = await supabase
      .from("engineers")
      .select("id, name, station_id");

    if (!error) {
      setEngineers(data || []);
    } else {
      console.error("Error fetching engineers:", error);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchEngineers();
  }, []);

  return { engineers, loading, refetchEngineers: fetchEngineers };
}
