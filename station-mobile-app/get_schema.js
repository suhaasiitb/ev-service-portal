const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key) acc[key.trim()] = val.join('=').trim();
  return acc;
}, {});
const supabase = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const { data: assignments, error: err1 } = await supabase.from('rider_bike_assignments').select('*').limit(1);
  console.log("Rider Bike Assignments:", Object.keys(assignments?.[0] || {}), err1);
  const { data: walkins, error: err2 } = await supabase.from('walkins').select('*').limit(1);
  console.log("Walkins:", Object.keys(walkins?.[0] || {}), err2);
  const { data: damages, error: err3 } = await supabase.from('rider_damages').select('*').limit(1);
  console.log("rider_damages:", Object.keys(damages?.[0] || {}), err3);
}
run();
