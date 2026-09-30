import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

// read from env file
const envFile = fs.readFileSync('.env', 'utf8')
const envMap = {}
envFile.split('\n').forEach(line => {
  const [k, v] = line.split('=')
  if (k) envMap[k] = v
})

const supabase = createClient(envMap.EXPO_PUBLIC_SUPABASE_URL, envMap.EXPO_PUBLIC_SUPABASE_ANON_KEY)

async function check() {
  const { data, error } = await supabase.from('stations').select('*').limit(1)
  console.log(Object.keys(data[0]))
}

check()
