import fs from 'node:fs';

const errors = [];
const read = (path) => fs.readFileSync(path, 'utf8');
const requireText = (source, needle, label) => {
  if (!source.includes(needle)) errors.push(`${label}: missing ${needle}`);
};

const foundation = read('supabase/migrations/20260918161717_news_intake_foundation.sql');
const actions = read('supabase/migrations/20260918161752_news_intake_actions.sql');
const taxonomy = read('supabase/migrations/20260918162008_news_intake_taxonomy_contract.sql');
const registryIndex = read('supabase/migrations/20260918163153_news_intake_registry_index.sql');
const canonicalPublisher = read('supabase/migrations/20260918163429_news_intake_canonical_publisher.sql');
const automation = read('supabase/migrations/20260918172747_news_intake_automation.sql');
const sourceCompatibility = read('supabase/migrations/20260918173239_news_intake_source_compatibility.sql');
const automationIndexes = read('supabase/migrations/20260918173920_news_intake_automation_fk_indexes.sql');
const automationReliability = read('supabase/migrations/20260918184016_news_intake_automation_reliability_hardening.sql');
const collisionErrorContract = read('supabase/migrations/20260918184410_news_intake_collision_error_contract.sql');
const automationCore = read('supabase/functions/_shared/newsIntakeAutomationCore.ts');
const behaviorAudit = read('scripts/news-intake-behavior-audit.ts');
const edge = read('supabase/functions/news-intake-fetch/index.ts');
const scanner = read('supabase/functions/news-intake-scan/index.ts');
const automationPanel = read('src/pages/NewsIntake/NewsAutomationPanel.tsx');
const page = read('src/pages/NewsIntake/NewsIntakePage.tsx');
const api = read('src/services/api/newsIntakeApi.ts');
const routes = read('src/routes/AppRoutes.tsx');
const routeConfig = read('src/routes/routes.config.ts');
const productionSmoke = read('.github/workflows/production-smoke.yml');

for (const [needle, label] of [
  ['news_source_domains', 'approved source-domain registry'],
  ['admin_check_news_source_domain', 'approved source-domain RPC'],
  ['evaluate_sourced_report_candidate_internal', 'pre-insert duplicate evaluator'],
  ['admin_preview_sourced_report_intake', 'safe intake preview RPC'],
  ["public.has_permission('complaints.publish')", 'publisher permission boundary'],
]) {
  requireText(foundation, needle, label);
}

for (const [needle, label] of [
  ['admin_create_sourced_report_from_intake', 'intake draft creation RPC'],
  ['admin_merge_intake_source', 'source merge RPC'],
  ["'sourced_report'", 'sourced-report origin'],
  ["'submitted'", 'draft-first lifecycle'],
  ["'verified',true", 'verified final-detail source contract'],
  ['evaluate_sourced_report_duplicate_internal', 'post-create duplicate recheck'],
]) {
  requireText(actions, needle, label);
}

requireText(registryIndex, 'idx_news_source_domains_created_by', 'News Intake registry FK index');
for (const needle of [
  'news_intake_runs',
  'news_intake_run_items',
  'scan_enabled',
  'admin_get_news_intake_scan_sources',
  'admin_begin_news_intake_run',
  'admin_record_news_intake_item',
  'admin_finish_news_intake_run',
  'admin_get_news_intake_automation_dashboard',
  "public.has_permission('complaints.publish')",
]) {
  requireText(automation, needle, 'News Intake automation migration');
}
requireText(sourceCompatibility, "A valid HTTPS source URL is required.", 'News Intake source compatibility');
requireText(sourceCompatibility, "'prothomalo.com'", 'News Intake redirect aliases');
requireText(automationIndexes, 'idx_news_intake_runs_started_by', 'News Intake automation run index');
requireText(automationIndexes, 'idx_news_intake_run_items_segment_id', 'News Intake automation segment index');
requireText(automationIndexes, 'idx_news_intake_run_items_subcategory_id', 'News Intake automation subcategory index');
requireText(canonicalPublisher, "sourceDomain,publisherName", 'canonical publisher mapping');
for (const needle of [
  'automation_note',
  'item_kind',
  "'cross_language_safe_review'",
  'trg_guard_automated_sourced_report_collision',
  "'samakal.com'",
  "'scanEnabled'",
]) {
  requireText(automationReliability, needle, 'News Intake reliability hardening');
}
for (const needle of [
  'inferIncidentDate',
  'buildSourceLanguageFields',
  'scoreDiscoveryLink',
  'MAX_ARTICLE_AGE_DAYS',
]) {
  requireText(automationCore, needle, 'News Intake automation core');
}
requireText(behaviorAudit, 'classificationCases', 'News Intake behavior audit');
requireText(behaviorAudit, 'English content must not be duplicated', 'News Intake source-language audit');
requireText(collisionErrorContract, "errcode='P0001'", 'News Intake collision error contract');
requireText(collisionErrorContract, 'DUPLICATE_REVIEW_REQUIRED', 'News Intake collision error contract');

for (const needle of [
  'admin_get_news_intake_taxonomy',
  "public.has_permission('complaints.publish')",
  "config_status='published'",
]) {
  requireText(taxonomy, needle, 'News Intake taxonomy contract');
}

for (const needle of [
  'Authorization',
  'req.headers.get("apikey")',
  'supabase.auth.getUser',
  'admin_check_news_source_domain',
  'redirect: "manual"',
  'redirectCount <= 3',
  'content-type',
  'readLimited',
  '768 * 1024',
  'descriptionPreview',
]) {
  requireText(edge, needle, 'secure metadata fetcher');
}

for (const needle of [
  'admin_begin_news_intake_run',
  'admin_get_news_intake_scan_sources',
  'admin_preview_sourced_report_intake',
  'admin_create_sourced_report_from_intake',
  'admin_merge_intake_source',
  'admin_record_news_intake_item',
  'admin_finish_news_intake_run',
  'buildSourceLanguageFields',
  'scoreDiscoveryLink',
  "itemKind:'source'",
  'verify_jwt',
]) {
  if (needle === 'verify_jwt') continue;
  requireText(scanner, needle, 'automated News Intake scanner');
}

for (const needle of [
  'Check Sources & Duplicates',
  'newsIntakeApi.scanSources()',
  'getAutomationDashboard()',
  'created_draft',
  'merged_source',
  'needs_review',
  'manualSources',
  'showAllResults',
  'selectedRunId',
]) {
  requireText(automationPanel, needle, 'News Automation panel');
}

requireText(api, "supabase.functions.invoke('news-intake-scan'", 'News Automation API');
requireText(api, "supabase.rpc(\n      'admin_get_news_intake_automation_dashboard'", 'News Automation dashboard API');

if (/articleBody|fullArticle|bodyText|innerText/.test(edge)) {
  errors.push('secure metadata fetcher: article body must not be returned to the Admin client.');
}

for (const needle of [
  'path="/news-intake"',
  'requiredPermission="complaints.publish"',
]) {
  requireText(routes, needle, 'News Intake route');
}

for (const needle of [
  "path: '/news-intake'",
  "requiredPermission: 'complaints.publish'",
]) {
  requireText(routeConfig, needle, 'News Intake navigation');
}

for (const needle of [
  'newsIntakeApi.preview(payload())',
  'newsIntakeApi.createDraft(payload())',
  'newsIntakeApi.mergeSource',
  'complaintApi.publishComplaint(created.reportId)',
  'if (!preview)',
  'if (!preview.canCreateDraft)',
  'if (publishAfterCreate && !preview.canPublishImmediately)',
]) {
  requireText(page, needle, 'News Intake UI safety flow');
}

for (const needle of [
  "supabase.functions.invoke('news-intake-fetch'",
  "supabase.rpc('admin_preview_sourced_report_intake'",
  "supabase.rpc('admin_create_sourced_report_from_intake'",
  "supabase.rpc('admin_merge_intake_source'",
  "supabase.rpc('admin_get_news_intake_taxonomy'",
]) {
  requireText(api, needle, 'News Intake API');
}

for (const name of [
  'admin_check_news_source_domain',
  'admin_preview_sourced_report_intake',
  'admin_create_sourced_report_from_intake',
  'admin_merge_intake_source',
  'admin_get_news_intake_taxonomy',
  'admin_get_news_intake_scan_sources',
  'admin_begin_news_intake_run',
  'admin_get_news_intake_automation_dashboard',
  'admin_record_news_intake_item',
  'admin_finish_news_intake_run',
  'news-intake-fetch',
  'news-intake-scan',
]) {
  requireText(productionSmoke, name, 'Production News Intake security smoke');
}

if (errors.length) {
  console.error('News Intake audit failed:\n');
  for (const error of errors) console.error('- ' + error);
  process.exit(1);
}

console.log(
  'News Intake audit passed: trusted-source modes, one-click scanning, source-language handling, cross-language duplicate safety, run history, draft-first creation, source merge, existing publish gate, and security checks are protected.'
);
