import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pnuelzwccygaoihsqgoz.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBudWVsendjY3lnYW9paHNxZ296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MjYxMzEsImV4cCI6MjA5MzUwMjEzMX0.t2UJnkWa636wllBs8CIgg9Rkoiqf7kRapj8RvxMKOAo'
const supabase = createClient(supabaseUrl, supabaseKey)

async function debug() {
  console.log('--- DEBUG START ---')
  
  const { data: services } = await supabase.from('services').select('id, name, profile_id, active').limit(5)
  console.log('Services:', services)
  
  if (services && services.length > 0) {
    const pid = services[0].profile_id
    console.log('Using Profile ID:', pid)
    
    const { data: hours } = await supabase.from('working_hours').select('*').eq('profile_id', pid)
    console.log('Working Hours:', hours)
    
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', pid).maybeSingle()
    console.log('Profile Access:', profile ? 'OK' : 'BLOCKED')
  } else {
    console.log('No services found!')
  }
  
  console.log('--- DEBUG END ---')
}

debug()
