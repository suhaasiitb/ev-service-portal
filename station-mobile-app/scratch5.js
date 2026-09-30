import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qxubkvaahbfacabajjwo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4dWJrdmFhaGJmYWNhYmFqandvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0MzE4NTcsImV4cCI6MjA3ODAwNzg1N30.uKCGo5Qf3txZglK8zQhUe-ZntKOjus_ZCGSABwIe6i4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: d1, error: e1 } = await supabase.from('walkins').select('service_duration').limit(1);
  const { data: d2, error: e2 } = await supabase.from('walkins').select('completed_at').limit(1);
  console.log("service_duration:", e1 ? e1.message : "Exists");
  console.log("completed_at:", e2 ? e2.message : "Exists");
}
check();
