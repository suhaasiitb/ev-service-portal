import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://qxubkvaahbfacabajjwo.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4dWJrdmFhaGJmYWNhYmFqandvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0MzE4NTcsImV4cCI6MjA3ODAwNzg1N30.uKCGo5Qf3txZglK8zQhUe-ZntKOjus_ZCGSABwIe6i4";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectTable() {
    const { data, error } = await supabase.from("technician_jobs").select("*").limit(1);
    console.log("Data:", data, "Error:", error);
}

inspectTable();
