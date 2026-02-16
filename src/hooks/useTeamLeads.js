import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export function useTeamLeads() {
    const [teamLeads, setTeamLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    async function fetchTeamLeads() {
        setLoading(true);
        setError(null);

        try {
            const { data, error: tlError } = await supabase
                .from("team_leads")
                .select("*")
                .order("name");

            if (tlError) throw tlError;

            setTeamLeads(data || []);
        } catch (err) {
            console.error("Error fetching team leads:", err);
            setError(err.message);
            setTeamLeads([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchTeamLeads();
    }, []);

    return {
        teamLeads,
        loading,
        error,
        refetchTeamLeads: fetchTeamLeads,
    };
}
