#!/usr/bin/env node
/**
 * Cuetronix — Supabase Migration Runner
 *
 * Executes all migrations in supabase/migrations/ against your Supabase project.
 * Uses the Supabase Management API (requires a Personal Access Token from
 * https://supabase.com/dashboard/account/tokens).
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/migrate.js
 *
 * Or set it in .env.local as SUPABASE_ACCESS_TOKEN=sbp_xxx
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root  = join(__dir, '..');

// ── Load env vars from .env.local ─────────────────────────────────────────────
function loadEnv() {
  try {
    const raw = readFileSync(join(root, '.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...rest] = trimmed.split('=');
      if (key && rest.length > 0 && !process.env[key]) {
        process.env[key] = rest.join('=').trim();
      }
    }
  } catch {
    // .env.local not found — rely on real environment variables
  }
}

loadEnv();

const SUPABASE_URL        = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ACCESS_TOKEN        = process.env.SUPABASE_ACCESS_TOKEN; // sbp_xxx token from supabase.com

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('✗  Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// Extract project ref from URL: https://XXXXX.supabase.co → XXXXX
const PROJECT_REF = SUPABASE_URL.replace('https://', '').split('.')[0];

console.log(`\n🟣  Cuetronix Migration Runner`);
console.log(`    Project: ${PROJECT_REF}`);
console.log(`    URL:     ${SUPABASE_URL}\n`);

// ── Execute SQL via Supabase Management API ───────────────────────────────────
async function executeSQL(sql, label) {
  if (!ACCESS_TOKEN) {
    throw new Error(
      'SUPABASE_ACCESS_TOKEN is not set.\n' +
      '  1. Go to https://supabase.com/dashboard/account/tokens\n' +
      '  2. Generate a Personal Access Token\n' +
      '  3. Re-run: SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/migrate.js\n' +
      '\n  Alternatively, paste the SQL files into Supabase Dashboard → SQL Editor.'
    );
  }

  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  const body = await response.json().catch(() => ({ error: response.statusText }));

  if (!response.ok) {
    const msg = body?.message || body?.error || JSON.stringify(body);
    throw new Error(`HTTP ${response.status}: ${msg}`);
  }

  return body;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const migrationsDir = join(root, 'supabase', 'migrations');

  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort(); // alphabetical = numeric order (001, 002, ...)

  console.log(`Found ${files.length} migration file(s):\n`);
  files.forEach(f => console.log(`  • ${f}`));
  console.log();

  let passed = 0;
  let failed = 0;

  for (const file of files) {
    const sql   = readFileSync(join(migrationsDir, file), 'utf8');
    const label = file;

    process.stdout.write(`  ⏳  ${label} … `);

    try {
      await executeSQL(sql, label);
      console.log('✓');
      passed++;
    } catch (err) {
      console.log('✗');
      console.error(`\n     Error: ${err.message}\n`);
      // Don't stop on error — try remaining migrations
      failed++;
    }
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  ${passed} passed   ${failed} failed`);

  if (failed > 0) {
    console.log(`\n  ⚠️  Some migrations failed. Check the errors above.`);
    console.log(`  If the error is "already exists", the migration has already run — that's OK.`);
    process.exit(1);
  } else {
    console.log(`\n  ✅  All migrations applied successfully!`);
    console.log(`\n  Next step: register the JWT hook in Supabase Dashboard`);
    console.log(`  Dashboard → Auth → Hooks → "Customize Access Token"`);
    console.log(`  Function: public.custom_jwt_claims\n`);
  }
}

main().catch(err => {
  console.error('\n✗  Fatal:', err.message);
  process.exit(1);
});
