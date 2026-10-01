import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://qxubkvaahbfacabajjwo.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4dWJrdmFhaGJmYWNhYmFqandvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0MzE4NTcsImV4cCI6MjA3ODAwNzg1N30.uKCGo5Qf3txZglK8zQhUe-ZntKOjus_ZCGSABwIe6i4";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function probeMore() {
    const moreCols = [
        "service_request_id", "walkin_id", "repair_id", "pdi_id",
        "notes", "remarks", "location", "rating", "feedback"
    ];

    for (const col of moreCols) {
        const { error } = await supabase.from("technician_jobs").select(col).limit(1);
        if (!error) console.log(`Column '${col}': ✅ Exists`);
    }
}

probeMore();
