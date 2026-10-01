import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://qxubkvaahbfacabajjwo.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4dWJrdmFhaGJmYWNhYmFqandvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0MzE4NTcsImV4cCI6MjA3ODAwNzg1N30.uKCGo5Qf3txZglK8zQhUe-ZntKOjus_ZCGSABwIe6i4";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFetch() {
    const { data: stationsData, error: stErr } = await supabase.from("stations").select("id, name");
    console.log("Stations:", stationsData?.length, "Err:", stErr);

    const { data: techData, error: techErr } = await supabase
        .from("users")
        .select("id, name, email, phone, role, station_id")
        .ilike("role", "%technician%")
        .order("name");

    console.log("Tech count:", techData?.length, "Tech err:", techErr);

    const formatted = (techData || []).map(tech => {
        const matched = (stationsData || []).find(s => s.id === tech.station_id);
        return {
            ...tech,
            station_name: matched ? matched.name : "Unassigned"
        };
    });

    console.log("Formatted Technicians:", formatted);
}

testFetch();
