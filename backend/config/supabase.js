import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL) {
  console.error('FATAL ERROR: SUPABASE_URL is not set in environment variables.');
  process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('FATAL ERROR: SUPABASE_SERVICE_ROLE_KEY is not set in environment variables.');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export default supabase;
