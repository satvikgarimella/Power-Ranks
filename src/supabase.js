import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fgyiahjkcwrhouwvevwc.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZneWlhaGprY3dyaG91d3ZldndjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTA0NjIsImV4cCI6MjA2ODI2NjQ2Mn0.sxR7A8cO_4l53v-f5V3QD7Z_2lHO380rGAbZV5QGKNo'

export const supabase = createClient(supabaseUrl, supabaseAnonKey) 