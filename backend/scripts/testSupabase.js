import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const REQUIRED_TABLES = ['users', 'documents', 'flashcards', 'quizzes', 'chat_history'];

async function testConnection() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || url.includes('your-project')) {
    console.error('❌ SUPABASE_URL is missing or still a placeholder in backend/.env');
    process.exit(1);
  }

  if (!key || key.includes('your_supabase')) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY is missing or still a placeholder in backend/.env');
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('🔗 Testing Supabase connection...');
  console.log(`   URL: ${url}`);

  const missing = [];

  for (const table of REQUIRED_TABLES) {
    const { error } = await supabase.from(table).select('id').limit(1);

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
        missing.push(table);
      } else {
        console.error(`❌ Error checking table "${table}":`, error.message);
        process.exit(1);
      }
    } else {
      console.log(`   ✓ ${table}`);
    }
  }

  if (missing.length > 0) {
    console.error('\n❌ Missing tables:', missing.join(', '));
    console.error('\nRun the SQL schema in your Supabase dashboard:');
    console.error('  1. Open https://supabase.com/dashboard → your project → SQL Editor');
    console.error('  2. Paste the contents of backend/supabase/schema.sql');
    console.error('  3. Click Run\n');
    process.exit(1);
  }

  console.log('\n✅ Supabase connected — all tables are ready.\n');
}

testConnection().catch((err) => {
  console.error('❌ Connection failed:', err.message);
  process.exit(1);
});
