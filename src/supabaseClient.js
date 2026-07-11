import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://njjuabtygginessgjipk.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qanVhYnR5Z2dpbmVzc2dqaXBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MTU1NTQsImV4cCI6MjA4NjQ5MTU1NH0.U21K0Ps2Wjgxkr1OTpZ-OMlNCZ078SIfsTniUzbhAzo";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);