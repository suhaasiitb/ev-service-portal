import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export type Part = {
  id: string;
  part_name: string;
  sku: string;
};

export function usePartsCatalog() {
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchParts() {
    setLoading(true);
    const { data, error } = await supabase
      .from("parts_catalog")
      .select("id, part_name, sku");

    if (!error) {
      setParts(data || []);
    } else {
      console.error("Error fetching parts catalog:", error);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchParts();
  }, []);

  return { parts, loading, refetchParts: fetchParts };
}
