import fs from 'node:fs';

const errors = [];
const read = (path) => fs.readFileSync(path, 'utf8');
const requireText = (source, needle, label) => {
  if (!source.includes(needle)) errors.push(`${label}: missing ${needle}`);
};

const foundation = read('supabase/migrations/20260918161717_news_intake_foundation.sql');
const actions = read('supabase/migrations/20260918161752_news_intake_actions.sql');
const taxonomy = read('supabase/migrations/20260918162008_news_intake_taxonomy_contract.sql');
const edge = read('supabase/functions/news-intake-fetch/index.ts');
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

for (const needle of [
  'admin_get_news_intake_taxonomy',
  "public.has_permission('complaints.publish')",
  "config_status='published'",
]) {
  requireText(taxonomy, needle, 'News Intake taxonomy contract');
}

for (const needle of [
  'Authorization',
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
  'news-intake-fetch',
]) {
  requireText(productionSmoke, name, 'Production News Intake security smoke');
}

if (errors.length) {
  console.error('News Intake audit failed:\n');
  for (const error of errors) console.error('- ' + error);
  process.exit(1);
}

console.log(
  'News Intake audit passed: approved-source fetch, draft-first creation, duplicate preview, source merge, existing publish gate, and security checks are protected.'
);
