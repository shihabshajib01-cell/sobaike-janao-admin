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



const mfaGate = read('src/components/auth/AdminMfaGate.tsx');
for (const needle of [
  'getAuthenticatorAssuranceLevel',
  "factorType: 'totp'",
  "currentLevel === 'aal2'",
  'ADMIN_MFA_TEST_MODE',
  'import.meta.env?.DEV',
  "VITE_ADMIN_E2E_MODE === 'true'",
]) {
  if (!mfaGate.includes(needle)) {
    fail('Admin MFA gate hardening is missing: ' + needle);
  }
}

const appRoutes = read('src/routes/AppRoutes.tsx');
if (!appRoutes.includes('AdminMfaGate')) {
  fail('Protected Admin routes are not gated by MFA');
}

const aal2MigrationFile = 'supabase/migrations/20260919151454_admin_sensitive_actions_require_aal2.sql';
if (!fs.existsSync(aal2MigrationFile)) {
  fail('missing canonical AAL2 permission hardening migration');
}
const aal2Migration = read(aal2MigrationFile);
for (const needle of [
  "auth.jwt()->>'aal'",
  "'aal2'",
  "'admin_users.manage'",
  "'roles.manage'",
  "'complaints.publish'",
  "'responses.publish'",
]) {
  if (!aal2Migration.includes(needle)) {
    fail('AAL2 permission migration is missing hardening marker: ' + needle);
  }
}

const supabaseClient = read('src/lib/supabase.ts');
for (const needle of [
  "sobaike_admin_session_persistence_v1",
  "window.sessionStorage",
  "setAdminSessionPersistence",
]) {
  if (!supabaseClient.includes(needle)) {
    fail('Remember-me session persistence hardening is missing: ' + needle);
  }
}

const createUserEdge = read('supabase/functions/admin-create-user/index.ts');
for (const needle of [
  'npm:@supabase/supabase-js@2.112.4',
  'cleanPassword.length < 12',
  'ALLOWED_ORIGINS',
]) {
  if (!createUserEdge.includes(needle)) {
    fail('Admin user creation Edge hardening is missing: ' + needle);
  }
}
if (createUserEdge.includes('"Access-Control-Allow-Origin": "*"')) {
  fail('Admin user creation Edge function must not use wildcard CORS');
}

const deleteUserEdge = read('supabase/functions/admin-delete-user/index.ts');
for (const needle of [
  'npm:@supabase/supabase-js@2.112.4',
  'ALLOWED_ORIGINS',
]) {
  if (!deleteUserEdge.includes(needle)) {
    fail('Admin user deletion Edge hardening is missing: ' + needle);
  }
}
if (deleteUserEdge.includes('"Access-Control-Allow-Origin": "*"')) {
  fail('Admin user deletion Edge function must not use wildcard CORS');
}

const newsIntakeScan = read('supabase/functions/news-intake-scan/index.ts');
for (const needle of [
  'assertPublicResolvedHost',
  "Deno.resolveDns(host, 'A')",
  "Deno.resolveDns(host, 'AAAA')",
  'isPrivateOrReservedIp',
]) {
  if (!newsIntakeScan.includes(needle)) {
    fail('News Intake SSRF hardening is missing: ' + needle);
  }
}


const formLifecycleMigrationFile = 'supabase/migrations/20260919153609_reporting_form_taxonomy_lifecycle_guard.sql';
if (!fs.existsSync(formLifecycleMigrationFile)) {
  fail('missing reporting-form taxonomy lifecycle guard migration');
}
const formLifecycleMigration = read(formLifecycleMigrationFile);
for (const needle of [
  'PUBLISHED_FORM_REQUIRES_ACTIVE_SUBCATEGORY',
  'PUBLISHED_FORM_REQUIRES_ACTIVE_SEGMENT',
  'trg_archive_forms_on_subcategory_deactivate',
  'trg_archive_forms_on_segment_deactivate',
  "status = 'archived'",
]) {
  if (!formLifecycleMigration.includes(needle)) {
    fail('reporting-form taxonomy lifecycle guard is missing: ' + needle);
  }
}

console.log('Admin hardening audit passed: E2E test mode is DEV-only, auth bootstrap is bounded, MFA/AAL2 guards are present, privileged Edge CORS is restricted, News Intake resolves and blocks private addresses, production source maps are disabled, and browser smoke follows the deployed commit.');
