import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qxubkvaahbfacabajjwo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4dWJrdmFhaGJmYWNhYmFqandvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0MzE4NTcsImV4cCI6MjA3ODAwNzg1N30.uKCGo5Qf3txZglK8zQhUe-ZntKOjus_ZCGSABwIe6i4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('walkins').select('id').limit(1);
  if (data && data.length > 0) {
    const id = data[0].id;
    const { data: updateData, error: updateError } = await supabase
      .from('walkins')
      .update({ issue_description: 'Test RLS' })
      .eq('id', id)
      .select();
    console.log("Update Data:", updateData, "Update Error:", updateError);
  } else {
    console.log("No data found or access denied:", error);
  }
}
check();
