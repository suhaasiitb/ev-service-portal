import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envFile = fs.readFileSync('.env', 'utf8')
const envMap = {}
envFile.split('\n').forEach(line => {
  const [k, v] = line.split('=')
  if (k) envMap[k] = v
})

const supabase = createClient(envMap.EXPO_PUBLIC_SUPABASE_URL, envMap.EXPO_PUBLIC_SUPABASE_ANON_KEY)

async function check() {
  const userStationId = '10795195-ca5d-4453-a812-be0d1577336e';
  
  const { data, error } = await supabase
        .from("under_repair")
        .select(`
            *,
            bikes!inner(bike_number, station_id, model_id),
            pdi_engineer:engineers!under_repair_pdi_raisedby_fkey(name),
            service_engineer:engineers!under_repair_serviced_by_fkey(name)
        `)
        .eq("bikes.station_id", userStationId)
        .eq("status", "open")
        .order("date_raised", { ascending: false });
  
  console.log('error:', error)
  console.log('data len:', data ? data.length : 0)
}

check()
