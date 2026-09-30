import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qxubkvaahbfacabajjwo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4dWJrdmFhaGJmYWNhYmFqandvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0MzE4NTcsImV4cCI6MjA3ODAwNzg1N30.uKCGo5Qf3txZglK8zQhUe-ZntKOjus_ZCGSABwIe6i4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: cols1, error: err1 } = await supabase.from('inventory_transactions').select('*').limit(1);
  const { data: cols2, error: err2 } = await supabase.from('walkin_parts').select('*').limit(1);
  console.log("inventory_transactions:", cols1 ? Object.keys(cols1[0] || {}) : err1);
  console.log("walkin_parts:", cols2 ? Object.keys(cols2[0] || {}) : err2);
}
check();
