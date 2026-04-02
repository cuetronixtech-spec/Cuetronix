#!/usr/bin/env node
/**
 * Cuetronix — Direct PostgreSQL Migration Runner
 *
 * Connects straight to the Supabase PostgreSQL database and runs all migrations.
 *
 * YOUR DATABASE PASSWORD is in:
 *   Supabase Dashboard → Settings → Database → "Connection string"
 *   It looks like: postgresql://postgres:YOUR_PASSWORD@db.mxwzdzanyazspadwrwlh.supabase.co:5432/postgres
 *   Copy just the password part between "postgres:" and "@db."
 *
 * Usage (two options):
 *
 *   Option A — pass password as argument:
 *     node scripts/db-migrate.cjs YOUR_DB_PASSWORD
 *
 *   Option B — add to .env.local:
 *     SUPABASE_DB_PASSWORD=YOUR_DB_PASSWORD
 *     node scripts/db-migrate.cjs
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// ── Load .env.local ───────────────────────────────────────────────────────────
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const t = line.trim();
    if (!t || t.startsWith('#')) return;
    const eq = t.indexOf('=');
    if (eq < 0) return;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim();
    if (k && !process.env[k]) process.env[k] = v;
  });
}

const DB_PASSWORD = process.argv[2] || process.env.SUPABASE_DB_PASSWORD;
const PROJECT_REF = 'mxwzdzanyazspadwrwlh';

if (!DB_PASSWORD) {
  console.error(`
✗  Database password required.

   Find it at: Supabase Dashboard → Settings → Database → Connection string
   
   Then run:
     node scripts/db-migrate.cjs YOUR_DB_PASSWORD
`);
  process.exit(1);
}

const DB_URL = `postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

async function main() {
  const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

  console.log('\n🟣  Cuetronix — Supabase Migration Runner');
  console.log(`    Project: ${PROJECT_REF}\n`);

  try {
    await client.connect();
    console.log('  ✓  Connected to database\n');
  } catch (err) {
    console.error(`✗  Could not connect: ${err.message}`);
    console.error('  Check your password and try again.');
    process.exit(1);
  }

  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`  Found ${files.length} migration file(s):\n`);
  files.forEach(f => console.log(`    • ${f}`));
  console.log();

  let passed = 0;
  let failed = 0;

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    process.stdout.write(`  ⏳  ${file} … `);
    try {
      await client.query(sql);
      console.log('✓');
      passed++;
    } catch (err) {
      // Ignore "already exists" errors — migration already ran
      if (err.message.includes('already exists')) {
        console.log('⟳ (already exists — skipped)');
        passed++;
      } else {
        console.log('✗');
        console.error(`     → ${err.message}\n`);
        failed++;
      }
    }
  }

  await client.end();

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  ${passed} passed   ${failed} failed`);

  if (failed > 0) {
    console.log(`\n  ⚠️  Some migrations failed. Review the errors above.`);
    process.exit(1);
  } else {
    console.log(`\n  ✅  All migrations applied!`);
    console.log(`\n  ── IMPORTANT: Register the JWT hook ───────────────`);
    console.log(`  Supabase Dashboard → Authentication → Hooks`);
    console.log(`  Hook type: "Customize Access Token (JWT) Claims"`);
    console.log(`  Function:  public.custom_jwt_claims\n`);
  }
}

main().catch(err => {
  console.error('\n✗  Fatal:', err.message);
  process.exit(1);
});
