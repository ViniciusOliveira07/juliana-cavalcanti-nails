import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pnuelzwccygaoihsqgoz.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBudWVsendjY3lnYW9paHNxZ296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MjYxMzEsImV4cCI6MjA5MzUwMjEzMX0.t2UJnkWa636wllBs8CIgg9Rkoiqf7kRapj8RvxMKOAo'
const supabase = createClient(supabaseUrl, supabaseKey)

async function debug() {
  console.log('--- CHECKING APPOINTMENTS ---')
  const { data: appts } = await supabase.from('appointments').select('id, start_at, end_at, status').limit(20)
  console.log('Appointments:', appts)
  
  const { data: blocks } = await supabase.from('time_blocks').select('*')
  console.log('Blocks:', blocks)
  console.log('--- END ---')
}

debug()
