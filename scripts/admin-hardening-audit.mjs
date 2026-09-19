import fs from 'node:fs';

const fail = (message) => {
  console.error('Admin hardening audit failed: ' + message);
  process.exit(1);
};

const read = (path) => fs.readFileSync(path, 'utf8');
const auth = read('src/context/AuthContext.tsx');
const vite = read('vite.config.ts');
const buildScript = read('scripts/build-production.mjs');
const workflow = read('.github/workflows/admin-functional-smoke.yml');

if (!auth.includes('import.meta.env?.DEV') || !auth.includes("VITE_ADMIN_E2E_MODE === 'true'")) {
  fail('DEV-only E2E authentication guard is missing or not constrained to Vite DEV mode');
}

for (const needle of [
  'AUTH_BOOTSTRAP_TIMEOUT_MS',
  'Session verification timed out.',
  'Administrator verification timed out.',
  'registerAuthSubscription',
  'void initAuth().finally',
]) {
  if (!auth.includes(needle)) {
    fail('Admin authentication bootstrap deadlock protection is missing: ' + needle);
  }
}

if (auth.indexOf('void initAuth().finally') > auth.indexOf('registerAuthSubscription();')) {
  fail('Admin auth listener must be registered only after initial auth bootstrap completes');
}

if (!vite.includes('sourcemap: false')) {
  fail('production sourcemaps are not disabled');
}

if (vite.includes("return 'vendor';")) {
  fail('generic vendor manual chunk can reintroduce circular chunk dependencies');
}

if (!buildScript.toLowerCase().includes('circular chunk') || !buildScript.includes("endsWith('.map')")) {
  fail('production build no longer rejects circular chunks and source maps');
}

if (!workflow.includes('github.event.workflow_run.head_sha')) {
  fail('Admin browser smoke does not check out the exact deployed commit');
}

if (!workflow.includes('VITE_ADMIN_E2E_MODE: true')) {
  fail('Admin browser smoke is not using the isolated DEV-only E2E session');
}

if (!workflow.includes('playwright@1.63.0')) {
  fail('Admin browser smoke Playwright runtime is not pinned');
}


const syncMigrationFile = 'supabase/migrations/20260919142507_end_to_end_sync_contract_and_rls_hardening.sql';
if (!fs.existsSync(syncMigrationFile)) {
  fail('missing canonical Public-SQL-Admin sync migration');
}
const syncMigration = read(syncMigrationFile);
for (const needle of [
  'get_platform_sync_contract_version',
  '2026-09-19.1',
  'RPC-only table: deny direct reads',
]) {
  if (!syncMigration.includes(needle)) {
    fail('sync migration is missing contract hardening marker: ' + needle);
  }
}

const productionSmoke = read('.github/workflows/production-smoke.yml');
for (const needle of [
  'Verify Public-SQL-Admin sync contract',
  'get_platform_sync_contract_version',
  '2026-09-19.1',
]) {
  if (!productionSmoke.includes(needle)) {
    fail('production smoke is missing live sync-contract guard: ' + needle);
  }
}

console.log('Admin hardening audit passed: E2E bypass is DEV-only, auth bootstrap is bounded and deadlock-safe, production source maps are disabled, bundle cycles are rejected, and browser smoke follows the deployed commit.');
