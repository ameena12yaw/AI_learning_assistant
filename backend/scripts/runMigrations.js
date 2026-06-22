import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, '../supabase/migrations');

const POOLER_REGIONS = [
  'us-east-1',
  'us-west-1',
  'eu-west-1',
  'eu-central-1',
  'ap-southeast-1',
  'ap-northeast-1',
  'ap-south-1',
  'sa-east-1',
  'ca-central-1',
];

function getProjectRef() {
  if (!process.env.SUPABASE_URL) return null;
  return new URL(process.env.SUPABASE_URL).hostname.split('.')[0];
}

function buildConnectionCandidates() {
  const candidates = [];

  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('your-')) {
    candidates.push({ label: 'DATABASE_URL', url: process.env.DATABASE_URL });
  }

  const password = process.env.SUPABASE_DB_PASSWORD;
  const ref = getProjectRef();

  if (!password || password.includes('PASTE_') || !ref) {
    return candidates;
  }

  const encoded = encodeURIComponent(password);

  candidates.push({
    label: 'direct',
    url: `postgresql://postgres:${encoded}@db.${ref}.supabase.co:5432/postgres`,
  });

  const region = process.env.SUPABASE_DB_REGION;
  if (region) {
    for (const prefix of ['aws-0', 'aws-1']) {
      candidates.push({
        label: `pooler ${prefix} ${region}`,
        url: `postgresql://postgres.${ref}:${encoded}@${prefix}-${region}.pooler.supabase.com:5432/postgres`,
      });
    }
  } else {
    for (const r of POOLER_REGIONS) {
      for (const prefix of ['aws-0', 'aws-1']) {
        candidates.push({
          label: `pooler ${prefix} ${r}`,
          url: `postgresql://postgres.${ref}:${encoded}@${prefix}-${r}.pooler.supabase.com:5432/postgres`,
        });
      }
    }
  }

  return candidates;
}

async function connectPostgres(candidates) {
  for (const { label, url } of candidates) {
    const client = new pg.Client({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000,
    });

    try {
      await client.connect();
      console.log(`🔗 Connected via ${label}\n`);
      return client;
    } catch (err) {
      await client.end().catch(() => {});
      if (label === 'DATABASE_URL' || label === 'direct') {
        console.log(`  ⚠  ${label} failed: ${err.message}`);
      }
    }
  }

  throw new Error(
    'Could not connect to Supabase PostgreSQL. Add DATABASE_URL from Dashboard → Settings → Database → Connection string (URI).'
  );
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrations(client) {
  const { rows } = await client.query('SELECT name FROM schema_migrations ORDER BY name');
  return new Set(rows.map((r) => r.name));
}

async function runMigrations() {
  const candidates = buildConnectionCandidates();

  if (candidates.length === 0) {
    console.error('❌ Database connection not configured.\n');
    console.error('Add to backend/.env:\n');
    console.error('  SUPABASE_DB_PASSWORD=your_database_password');
    console.error('  — or —');
    console.error('  DATABASE_URL=postgresql://postgres.[ref]:[PASSWORD]@...pooler.supabase.com:5432/postgres\n');
    console.error('Copy DATABASE_URL from: Supabase → Settings → Database → Connection string → URI\n');
    process.exit(1);
  }

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error('❌ Migrations directory not found:', MIGRATIONS_DIR);
    process.exit(1);
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No migration files found.');
    return;
  }

  const client = await connectPostgres(candidates);

  try {
    await ensureMigrationsTable(client);
    const applied = await getAppliedMigrations(client);

    let ran = 0;

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`  ⏭  ${file} (already applied)`);
        continue;
      }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      console.log(`  ▶  Running ${file}...`);

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`  ✓  ${file}`);
        ran++;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    console.log(ran > 0 ? `\n✅ Applied ${ran} migration(s).\n` : '\n✅ All migrations already up to date.\n');
  } finally {
    await client.end();
  }
}

runMigrations().catch((err) => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
