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
  const { data, error } = await supabase
        .from("under_repair")
        .select(`id, bikes!inner(station_id), status, serviced_by`)
        
  console.log('repair error:', error)
  console.log('repair data:', data)
  
  const { data: pdi, error: err } = await supabase
        .from("pdi_requests")
        .select(`id, station_id, status`)
        
  console.log('pdi error:', err)
  console.log('pdi data:', pdi)
}

check()
