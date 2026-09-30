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
  const { data: pdi } = await supabase.from('pdi_requests').select('*').limit(1)
  console.log('pdi_requests keys:', pdi ? Object.keys(pdi[0] || {}) : null)
  
  const { data: ur } = await supabase.from('under_repair').select('*').limit(1)
  console.log('under_repair keys:', ur ? Object.keys(ur[0] || {}) : null)
}

check()
