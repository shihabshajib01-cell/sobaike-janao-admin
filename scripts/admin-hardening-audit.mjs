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

console.log('Admin hardening audit passed: E2E bypass is DEV-only, production source maps are disabled, bundle cycles are rejected, and browser smoke follows the deployed commit.');
