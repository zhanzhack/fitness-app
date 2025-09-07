import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://rmtzbvbwopyecqzqpmyk.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtdHpidmJ3b3B5ZWNxenFwbXlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyMDUzMTIsImV4cCI6MjA3Mjc4MTMxMn0.rK55ldr_bGctoDNIZV3Hm5-q9kUde9rnO_rgAzJxR9I";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
