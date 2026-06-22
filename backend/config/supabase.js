import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

if (!process.env.SUPABASE_URL) {
  console.error('FATAL ERROR: SUPABASE_URL is not set in environment variables.');
  process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('FATAL ERROR: SUPABASE_SERVICE_ROLE_KEY is not set in environment variables.');
  process.exit(1);
}

const supabaseOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
};

// Node.js < 22 has no native WebSocket; required by @supabase/realtime-js on server.
if (typeof globalThis.WebSocket === 'undefined') {
  supabaseOptions.realtime = { transport: ws };
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseOptions
);

export default supabase;
