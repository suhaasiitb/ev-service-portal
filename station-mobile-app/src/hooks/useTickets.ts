import { useState, useEffect } from "react";
import { Alert } from "react-native";
import { supabase } from "../lib/supabase";

export type Ticket = {
  id: string;
  ticket_no: string;
  bike_id: string;
  bike_number_text: string;
  station_id: string;
  issue_description: string;
  status: string;
  reported_at: string;
  closed_at: string;
  closed_by: string;
  cost_charged: number;
  ticket_type: string; // 'b2b' or 'b2c'
  location?: string;
};

export function useTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchTickets() {
    setLoading(true);
    try {
      // 1. Get current session
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      if (!session?.user) {
        Alert.alert("Debug", "No user session found " + JSON.stringify(sessionErr));
        setLoading(false);
        return;
      }

      // 2. Get user's station_id from users table
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("station_id")
        .eq("id", session.user.id)
        .maybeSingle();

      if (userError) {
        Alert.alert("Debug", "User Error: " + JSON.stringify(userError));
        setLoading(false);
        return;
      }
      
      if (!userData?.station_id) {
        Alert.alert("Debug", "User has no station_id assigned in users table");
        setLoading(false);
        return;
      }

      const userStationId = userData.station_id;

      // 3. Get station name to check if it's Nanded
      const { data: stationData, error: stationError } = await supabase
        .from("stations")
        .select("name")
        .eq("id", userStationId)
        .maybeSingle();

      if (stationError) {
        Alert.alert("Debug", "Station Error: " + JSON.stringify(stationError));
        setLoading(false);
        return;
      }

      const stationName = stationData?.name || "";
      const isNanded = stationName.toLowerCase().includes("nanded");

      // 4. Fetch tickets based on rules
      let query = supabase
        .from("tickets")
        .select("id, ticket_no, bike_id, bike_number_text, station_id, issue_description, status, reported_at, closed_at, closed_by, cost_charged, ticket_type, location")
        .order("status", { ascending: false }) // 'open' comes before 'closed'
        .order("reported_at", { ascending: false });

      if (isNanded) {
        // Nanded sees ALL b2c tickets + b2b tickets assigned to Nanded
        query = query.or(`ticket_type.ilike.b2c,and(ticket_type.ilike.b2b,station_id.eq.${userStationId})`);
      } else {
        // Others see ONLY b2b tickets assigned to them
        query = query.eq("station_id", userStationId).ilike("ticket_type", "b2b");
      }

      const { data: ticketData, error: ticketError } = await query;

      if (ticketError) {
        Alert.alert("Debug", "Ticket Fetch Error: " + JSON.stringify(ticketError));
        setLoading(false);
        return;
      }
      
      if (!ticketData || ticketData.length === 0) {
         Alert.alert("Debug", `0 tickets found. Your station_id: ${userStationId} | Name: ${stationName} | isNanded: ${isNanded}`);
      }

      const filteredTickets = (ticketData || []).filter(t => {
        if (t.status === 'open') return true;
        // If it's closed, only show if current user closed it
        return t.closed_by === session.user.id;
      });

      setTickets(filteredTickets);
    } catch (err) {
      console.error("useTickets error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTickets();
  }, []);

  return {
    tickets,
    loading,
    refetchTickets: fetchTickets,
  };
}
