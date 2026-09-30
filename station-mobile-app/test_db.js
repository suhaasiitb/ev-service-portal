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
  const { data: pdi, error: err1 } = await supabase.from('pdi_requests').select('station_id').limit(1)
  console.log('pdi:', pdi, err1)
  
  const { data: rep, error: err2 } = await supabase.from('under_repair').select('id, bikes!inner(station_id)').limit(1)
  console.log('rep:', rep, err2)
}

check()
