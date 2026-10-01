import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://qxubkvaahbfacabajjwo.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4dWJrdmFhaGJmYWNhYmFqandvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0MzE4NTcsImV4cCI6MjA3ODAwNzg1N30.uKCGo5Qf3txZglK8zQhUe-ZntKOjus_ZCGSABwIe6i4";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAttendanceQuery() {
    const todayStr = new Date().toISOString().split("T")[0];
    console.log("Today date string:", todayStr);

    const { data: attData, error: attErr } = await supabase
        .from("technician_attendance")
        .select("id, technician_id, date, check_in_time, check_out_time")
        .eq("date", todayStr);

    console.log("Today attendance records:", attData?.length, "Err:", attErr);
}

testAttendanceQuery();
