import fs from 'node:fs';

const errors = [];
const read = (path) => fs.readFileSync(path, 'utf8');
const requireText = (source, needle, label) => {
  if (!source.includes(needle)) errors.push(label + ': missing ' + needle);
};

const migration = read('supabase/migrations/20260918154536_sourced_report_duplicate_guard.sql');
const hardening = read('supabase/migrations/20260918154616_sourced_report_duplicate_guard_hardening.sql');
const types = read('src/types/Complaint.ts');
const service = read('src/services/api/supabaseComplaintService.ts');
const api = read('src/services/api/complaintApi.ts');
const actions = read('src/components/complaints/ComplaintActionArea.tsx');
const reviewUi = read('src/components/complaints/SourcedReportDuplicateReview.tsx');
const productionSmoke = read('.github/workflows/production-smoke.yml');

for (const [needle, label] of [
  ['ux_complaint_sources_global_canonical_url', 'global exact-source uniqueness'],
  ['admin_check_source_duplicate', 'source duplicate RPC'],
  ['admin_check_report_duplicate', 'incident duplicate RPC'],
  ['admin_confirm_reports_are_distinct', 'audited distinct-incident RPC'],
  ['trg_enforce_sourced_report_duplicate_review', 'database publication gate'],
  ["origin_type = 'sourced_report'", 'sourced-report-only scope'],
  ['report_duplicate_overrides', 'signature-bound review storage'],
  ['duplicate_report_signature_values', 'override invalidation signature'],
]) {
  requireText(migration, needle, label);
}

requireText(hardening, 'idx_report_duplicate_overrides_report_b_id', 'override FK index');
requireText(hardening, 'report_duplicate_overrides_authenticated_deny', 'override direct-access deny policy');

requireText(types, "originType?: 'citizen' | 'sourced_report' | string", 'Complaint origin type');
requireText(types, 'ReportDuplicateCheckResult', 'duplicate result types');
requireText(service, 'origin_type?: string | null', 'database origin mapping');
requireText(service, "originType: row.origin_type || 'citizen'", 'domain origin mapping');

for (const needle of [
  "supabase.rpc('admin_check_source_duplicate'",
  "supabase.rpc('admin_check_report_duplicate'",
  "supabase.rpc('admin_confirm_reports_are_distinct'",
]) {
  requireText(api, needle, 'Admin duplicate API');
}

for (const needle of [
  "const isSourcedReport = complaint.originType === 'sourced_report'",
  'void loadDuplicateCheck()',
  'await complaintApi.checkReportDuplicate(complaint.id)',
  'latestDuplicateCheck.status !== \'clear\'',
  '<SourcedReportDuplicateReview',
]) {
  requireText(actions, needle, 'Publish duplicate gate');
}

requireText(reviewUi, 'cannot be overridden as a separate incident', 'exact source non-override UX');
requireText(reviewUi, 'Confirm Separate Incident', 'human distinct-incident review UX');
requireText(reviewUi, "import { Tag } from '@/components/ui/Tag';", 'shared tag system');

for (const rpcName of [
  'admin_check_source_duplicate',
  'admin_check_report_duplicate',
  'admin_confirm_reports_are_distinct',
]) {
  requireText(productionSmoke, rpcName, 'Production duplicate RPC security smoke');
}

if (/originType\s*!==?\s*['"]sourced_report['"][\s\S]{0,240}checkReportDuplicate/.test(actions)) {
  errors.push('Citizen complaint flow appears to call the sourced-report duplicate checker.');
}

if (errors.length > 0) {
  console.error('Sourced-report duplicate audit failed:\n');
  for (const error of errors) console.error('- ' + error);
  process.exit(1);
}

console.log(
  'Sourced-report duplicate audit passed: global source uniqueness, conservative incident review, audited overrides, and fail-closed publication are protected.'
);
