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

async function forceUpdate() {
  console.log("Running calculate_daily_rentals() manually to update the dashboard...");
  
  const { error } = await supabase.rpc('calculate_daily_rentals');
  
  if (error) {
    console.error("Error running the calculation:", error.message);
  } else {
    console.log("✅ Successfully updated rental amounts for all cycles up to today!");
  }
}

forceUpdate();
