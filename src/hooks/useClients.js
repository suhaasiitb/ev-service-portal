import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export function useClients() {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    async function fetchClients() {
        setLoading(true);
        setError(null);

        try {
            const { data, error: clientsError } = await supabase
                .from("clients")
                .select("*")
                .order("name");

            if (clientsError) throw clientsError;

            setClients(data || []);
        } catch (err) {
            console.error("Error fetching clients:", err);
            setError(err.message);
            setClients([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchClients();
    }, []);

    return {
        clients,
        loading,
        error,
        refetchClients: fetchClients,
    };
}
