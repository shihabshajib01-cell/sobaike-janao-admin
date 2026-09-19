import fs from 'node:fs';
import crypto from 'node:crypto';

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
  'refreshPermissions',
  'refreshResult.error',
]) {
  if (!mfaGate.includes(needle)) {
    fail('Admin MFA gate hardening is missing: ' + needle);
  }
}

if (!mfaGate.includes('await refreshPermissions();')) {
  fail('Admin MFA gate must refresh AAL2-sensitive permissions after elevation');
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
  'api.pwnedpasswords.com/range/',
  '"Add-Padding": "true"',
  'COMPROMISED_PASSWORD',
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

const newsIntakeFetch = read('supabase/functions/news-intake-fetch/index.ts');
for (const needle of [
  'assertPublicResolvedHost',
  'Deno.resolveDns(host, "A")',
  'Deno.resolveDns(host, "AAAA")',
  'isPrivateOrReservedIp',
  'ALLOWED_ORIGINS',
]) {
  if (!newsIntakeFetch.includes(needle)) {
    fail('News Intake article fetch hardening is missing: ' + needle);
  }
}
if (newsIntakeFetch.includes('"Access-Control-Allow-Origin": "*"')) {
  fail('News Intake article fetch must not use wildcard CORS');
}

const newsIntakeScan = read('supabase/functions/news-intake-scan/index.ts');
for (const needle of [
  'assertStablePublicResolution',
  'addressSetsOverlap',
  'postFetchAddresses',
  'Source DNS changed during validation; request blocked.',
  'Source DNS changed during fetch; response blocked.',
  "Deno.resolveDns(host, 'A')",
  "Deno.resolveDns(host, 'AAAA')",
  'isPrivateOrReservedIp',
]) {
  if (!newsIntakeScan.includes(needle)) {
    fail('News Intake SSRF/DNS-rebinding hardening is missing: ' + needle);
  }
}



const adminIndex = read('index.html');
const csp = adminIndex.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i)?.[1] || '';
if (!csp) {
  fail('Admin Content Security Policy meta is missing');
}
const scriptSrc = csp.match(/(?:^|;\s*)script-src\s+([^;]+)/i)?.[1] || '';
if (!scriptSrc || scriptSrc.includes("'unsafe-inline'")) {
  fail("Admin script-src must exist and must not allow 'unsafe-inline'");
}
if (!/(?:^|;\s*)script-src-attr\s+'none'(?:;|$)/i.test(csp)) {
  fail("Admin script-src-attr must be 'none'");
}
const connectSrc = csp.match(/(?:^|;\s*)connect-src\s+([^;]+)/i)?.[1] || '';
const connectTokens = connectSrc.trim().split(/\s+/);
if (connectTokens.includes('https:') || connectTokens.includes('wss:')) {
  fail('Admin connect-src must not allow every HTTPS/WSS origin');
}
for (const match of adminIndex.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) {
  const hash = 'sha256-' + crypto.createHash('sha256').update(match[1], 'utf8').digest('base64');
  if (!scriptSrc.includes("'" + hash + "'")) {
    fail('Admin inline script is missing an exact CSP hash: ' + hash);
  }
}
if (/\son[a-z]+\s*=/i.test(adminIndex)) {
  fail('Admin index contains an inline event handler');
}
if (adminIndex.includes('fallback.innerHTML')) {
  fail('Admin boot fallback must not use innerHTML');
}

const finalPublicSecurityMigrationFile =
  'supabase/migrations/20260919155020_close_legacy_engagement_and_persist_ip_location_limit.sql';
if (!fs.existsSync(finalPublicSecurityMigrationFile)) {
  fail('missing final public security migration mirror');
}
const finalPublicSecurityMigration = read(finalPublicSecurityMigrationFile);
for (const needle of [
  'track_public_report_view_v2',
  'track_public_report_share_v2',
  'from public, anon, authenticated',
  "'ip_location'",
]) {
  if (!finalPublicSecurityMigration.includes(needle)) {
    fail('final public security migration is missing: ' + needle);
  }
}

const pgNetMigration =
  'supabase/migrations/20260919155106_reinstall_pg_net_and_restrict_client_privileges.sql';
if (!fs.existsSync(pgNetMigration) || !read(pgNetMigration).includes('create extension pg_net with schema extensions')) {
  fail('pg_net extension-schema hardening migration is missing');
}

const formPrepublicationRestoreFile = 'supabase/migrations/20260919154219_restore_reporting_form_prepublication_contract.sql';
if (!fs.existsSync(formPrepublicationRestoreFile)) {
  fail('missing reporting-form prepublication contract correction');
}
const formPrepublicationRestore = read(formPrepublicationRestoreFile);
for (const needle of [
  'trg_enforce_reporting_form_active_taxonomy',
  'archive_reporting_forms_for_inactive_taxonomy',
  "scope_id='bribe-paid'",
  "status='published'",
]) {
  if (!formPrepublicationRestore.includes(needle)) {
    fail('reporting-form prepublication correction is missing: ' + needle);
  }
}

for (const needle of [
  'Verify public reporting configuration exposure contract',
  'get_public_reporting_configuration',
]) {
  if (!productionSmoke.includes(needle)) {
    fail('production smoke is missing reporting-config exposure guard: ' + needle);
  }
}

console.log('Admin hardening audit passed: E2E test mode is DEV-only, MFA/AAL2 and post-elevation permission refresh are enforced, CSP inline scripts are hash-locked, privileged Edge CORS is restricted, News Intake has DNS-rebinding guards, final public security migrations are mirrored, production source maps are disabled, and browser smoke follows the deployed commit.');
