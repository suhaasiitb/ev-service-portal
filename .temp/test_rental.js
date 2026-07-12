import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env manually
const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value.length) {
    env[key.trim()] = value.join('=').trim().replace(/['"]/g, '');
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugSQL() {
  console.log("Calling calculate_daily_rentals() function directly via RPC...");
  
  const { data: rpcData, error: rpcError } = await supabase.rpc('calculate_daily_rentals');
  
  if (rpcError) {
    console.error("RPC Error:", rpcError);
  } else {
    console.log("RPC returned:", rpcData);
  }
  
  console.log("\nFetching updated assignments...");
  const { data, error } = await supabase
    .from('rider_bike_assignments')
    .select(`
      id,
      assigned_at,
      unassigned_at,
      battery_mode,
      rental_amount,
      clients ( name )
    `)
    .limit(10);

  if (error) {
    console.error("Error fetching data:", error);
    return;
  }

  console.table(data.map(r => ({
    ID: r.id.substring(0,8),
    Client: r.clients?.name || 'Unknown',
    'Battery Mode': r.battery_mode,
    'Assigned': r.assigned_at ? new Date(r.assigned_at).toLocaleDateString() : '-',
    'Unassigned': r.unassigned_at ? new Date(r.unassigned_at).toLocaleDateString() : '-',
    'Rental Amount (₹)': r.rental_amount
  })));
  
}

debugSQL();
