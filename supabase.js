const SUPABASE_URL = "https://ookytzrplwzpqpqujhrk.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_4Q-bAS-MmQeBDN3PCkzLBg_MTzShG0V";


const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.sb = sb;
