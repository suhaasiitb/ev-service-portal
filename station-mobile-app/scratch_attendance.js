import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qxubkvaahbfacabajjwo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4dWJrdmFhaGJmYWNhYmFqandvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0MzE4NTcsImV4cCI6MjA3ODAwNzg1N30.uKCGo5Qf3txZglK8zQhUe-ZntKOjus_ZCGSABwIe6i4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('technician_attendance').select('*').limit(1);
  if (error) {
    console.log("Error:", error.message);
  } else {
    console.log("Columns:", data.length > 0 ? Object.keys(data[0]) : "No data");
  }
}
check();
