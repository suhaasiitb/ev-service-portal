import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export function useTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchTickets() {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("tickets")
      .select(`
        id,
        bike_id,
        bike_number_text,
        station_id,
        closed_by,
        issue_description,
        status,
        reported_at,
        closed_at,
        cost_charged,
        engineers:closed_by ( id, name )
      `)
      .order("reported_at", { ascending: false });

    if (error) {
      setError(error.message);
      setTickets([]);
    } else {
      setTickets(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchTickets();
  }, []);

  return {
    tickets,
    loading,
    error,
    refetchTickets: fetchTickets,
  };
}
