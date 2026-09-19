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
const explicitDenyPolicies = read('supabase/migrations/20260918184743_news_intake_explicit_deny_policies.sql');
const schemaRequirementGuard = read('supabase/migrations/20260918185342_news_intake_schema_requirement_guard.sql');
const samakalMode = read('supabase/migrations/20260918185535_news_intake_samakal_manual_only.sql');
const schedulerMigration = read('supabase/migrations/20260918191945_news_intake_36h_scheduler.sql');
const schedulerAcknowledgement = read('supabase/migrations/20260919042801_news_intake_scheduler_acknowledgement.sql');
const publishGroundingGuard = read('supabase/migrations/20260919082837_news_intake_publish_grounding_guard.sql');
const groundingGuardAlignment = read('supabase/migrations/20260919083754_news_intake_grounding_guard_align_duplicate_gate.sql');
const adminLocationRpcHardening = read('supabase/migrations/20260919085346_news_intake_admin_location_rpc_hardening.sql');
const sourceLanguageGroundingCleanup = read('supabase/migrations/20260919093100_news_intake_source_language_grounding_cleanup.sql');
const automationCore = read('supabase/functions/_shared/newsIntakeAutomationCore.ts');
const behaviorAudit = read('scripts/news-intake-behavior-audit.ts');
const edge = read('supabase/functions/news-intake-fetch/index.ts');
const scanner = read('supabase/functions/news-intake-scan/index.ts');
const automationPanel = read('src/pages/NewsIntake/NewsAutomationPanel.tsx');
const page = read('src/pages/NewsIntake/NewsIntakePage.tsx');
const manualForm = read('src/pages/NewsIntake/ManualNewsIntakeForm.tsx');
const feedReadyPreview = read('src/pages/NewsIntake/FeedReadyReportPreview.tsx');
const api = read('src/services/api/newsIntakeApi.ts');
const reportingFormApi = read('src/services/api/reportingFormApi.ts');
const modal = read('src/components/ui/Modal.tsx');
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
  'inferSpecificLocationPhrase',
  'inferDistrictWideScope',
  'buildSourceLanguageFields',
  'scoreDiscoveryLink',
  'MAX_ARTICLE_AGE_DAYS',
  'NON_INCIDENT_THEFT_RE',
  'NON_PROPERTY_SNATCHING_RE',
  'THEFT_ALLEGATION_VIOLENCE_RE',
  'reviewReason',
]) {
  requireText(automationCore, needle, 'News Intake automation core');
}
requireText(behaviorAudit, 'classificationCases', 'News Intake behavior audit');
requireText(behaviorAudit, 'English content must not be duplicated', 'News Intake source-language audit');
requireText(behaviorAudit, 'Incident-anchored date must win over page publication metadata', 'News Intake incident-date grounding regression');
requireText(behaviorAudit, 'Incident location must win over later narrative text ending in এলাকা', 'News Intake location grounding regression');
requireText(behaviorAudit, 'Bangla weekday plus bare সকাল must resolve against same-day publication date', 'News Intake Bangla daypart incident-date regression');
requireText(behaviorAudit, 'Excerpt/body overlap must not duplicate the same incident sentence', 'News Intake context de-duplication regression');
requireText(behaviorAudit, 'Near-identical excerpt/body incident sentences must not be repeated', 'News Intake near-duplicate context regression');
requireText(behaviorAudit, 'Bare proper incident place after at must be retained', 'News Intake bare-place grounding regression');
requireText(behaviorAudit, 'Theft-accusation violence must not fall through to the broad theft rule', 'News Intake theft-accusation classification regression');
requireText(behaviorAudit, 'Taking a detainee/suspect from police must not be classified as property snatching', 'News Intake non-property snatching regression');
requireText(collisionErrorContract, "errcode='P0001'", 'News Intake collision error contract');
requireText(collisionErrorContract, 'DUPLICATE_REVIEW_REQUIRED', 'News Intake collision error contract');
requireText(explicitDenyPolicies, 'news_intake_runs_authenticated_deny', 'News Intake run-table deny policy');
requireText(explicitDenyPolicies, 'news_intake_run_items_authenticated_deny', 'News Intake item-table deny policy');
requireText(schemaRequirementGuard, 'sourced_report_missing_required_fields_internal', 'News Intake schema requirement validator');
requireText(schemaRequirementGuard, 'trg_guard_sourced_report_schema_requirements', 'News Intake schema requirement trigger');
requireText(schemaRequirementGuard, 'schemaValidation', 'News Intake schema-aware preview');
requireText(adminLocationRpcHardening, 'revoke execute on function public.admin_get_location_taxonomy()', 'News Intake admin taxonomy anonymous-execute hardening');
requireText(adminLocationRpcHardening, 'revoke execute on function public.admin_resolve_news_intake_location(text, text)', 'News Intake location resolver anonymous-execute hardening');
for (const needle of [
  'normalize_sourced_report_public_language',
  'trg_normalize_sourced_report_public_language',
  "v_prefs := v_prefs - 'publicTitleEn' - 'publicSummaryEn'",
  "v_prefs := v_prefs - 'publicTitleBn' - 'publicSummaryBn'",
  'newsIntakeReviewRequired',
]) {
  requireText(sourceLanguageGroundingCleanup, needle, 'News Intake source-language grounding cleanup');
}
requireText(samakalMode, "scan_enabled=false", 'Samakal safe source mode');
for (const needle of [
  'pg_cron',
  'pg_net',
  'news_intake_automation_settings',
  'service_begin_news_intake_run',
  'admin_set_news_intake_auto_update',
  'dispatch_news_intake_auto_scan',
  "interval '36 hours'",
  'ux_news_intake_runs_one_running',
  'sobaike-janao-news-intake-auto-dispatch',
]) {
  requireText(schedulerMigration, needle, '36-hour News Intake scheduler');
}
for (const needle of [
  'service_begin_scheduled_news_intake_run',
  "date_trunc('minute'",
  "v_slot+interval '36 hours'",
  "'* * * * *'",
  'timeout_milliseconds:=10000',
  "'scheduledSlot'",
]) {
  requireText(schedulerAcknowledgement, needle, 'acknowledged News Intake scheduler');
}

for (const needle of [
  'guard_sourced_report_publish_readiness',
  'trg_guard_sourced_report_publish_readiness',
  'SOURCE_GROUNDING_REVIEW_REQUIRED',
]) {
  requireText(publishGroundingGuard, needle, 'News Intake grounding publish guard');
}
for (const needle of [
  'guard_sourced_report_publish_readiness',
  'SOURCE_GROUNDING_REVIEW_REQUIRED',
]) {
  requireText(groundingGuardAlignment, needle, 'News Intake grounding guard alignment');
}
if (groundingGuardAlignment.includes('evaluate_sourced_report_duplicate_internal')) {
  errors.push('News Intake grounding guard alignment must not duplicate the existing sourced-report duplicate publish trigger.');
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
  'x-news-intake-scheduler',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SCHEDULER_SECRET_SHA256',
  'service_begin_scheduled_news_intake_run',
  'EdgeRuntime.waitUntil',
  'background:true',
  'runManualScan',
  'encodedTemplateUrl',
  'extractPublishedDate',
  'datePublished',
  'finalPathLooksLikeArticle',
  'articleDocumentSignal',
  'classification.reviewReason',
  'processing error(s) were recorded',
  'Section, homepage, or non-article URL was excluded',
  'inferSpecificLocationPhrase',
  'inferDistrictWideScope',
  "location.quality !== 'multiple_locations'",
  "location.locationScope !== 'multi_location'",
  'createdCanPublish',
  'createdDuplicateStatus',
  'Draft created, but the final server duplicate evaluation requires review before publication.',
  'verify_jwt',
]) {
  if (needle === 'verify_jwt') continue;
  requireText(scanner, needle, 'automated News Intake scanner');
}

for (const needle of [
  'Check Now',
  'newsIntakeApi.scanSources()',
  'getAutomationDashboard()',
  'created_draft',
  'merged_source',
  'needs_review',
  'manualSources',
  'showAllResults',
  'selectedRunId',
  'newsIntakeApi.setAutoUpdate',
  'dashboard.automation.enabled',
  'dashboard.automation.nextAutoDueAt',
  'selectedRun.triggerType',
]) {
  requireText(automationPanel, needle, 'News Automation panel');
}

requireText(api, "supabase.functions.invoke('news-intake-scan'", 'News Automation API');
requireText(api, "supabase.rpc(\n      'admin_get_news_intake_automation_dashboard'", 'News Automation dashboard API');
requireText(api, "'admin_set_news_intake_auto_update'", 'News Automation schedule control API');

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
  'initialSourceUrl',
  'reportingFormApi.getPublished',
  'dynamicCustomFields',
  'unsupportedRequiredFields',
  'Published form fields',
  'window.confirm',
]) {
  requireText(manualForm, needle, 'Manual News Intake UI safety flow');
}

for (const needle of [
  'News Intake Workspace',
  'Scan All Sources Now',
  'Raw news found',
  'Feed-ready report',
  'Select All',
  'Clear Selection',
  'Publish Selected to Feed',
  'FeedReadyReportPreview',
  'feedDisplayItems.map',
  'rawFilterCounts',
  "'excluded'",
  "'ready'",
  'reasonLabel',
  'segmentLabel',
  'subcategoryLabel',
  'confidenceLabel',
  'filteredRawItems',
  'Scan summary:',
  'aria-pressed={rawFilter === value}',
  "item.duplicateStatus === 'clear'",
  'reportLoadErrors',
  'reviewItemManually',
  'requestWorkspaceClose',
  'publishable={eligibleReportIds.includes(reportId)}',
  'No feed-ready reports',
  'rawNewsExpanded',
  'feedReadyExpanded',
  'scrollbar-gutter:stable',
  'lg:max-h-[calc(94vh-22rem)]',
  'max-sm:[&_[data-button-size=sm]]:min-h-11',
  'Show items needing review',
  'aria-expanded',
  'ManualNewsIntakeForm',
  'complaintApi.publishComplaint(reportId)',
  "result.complaint.status !== 'published'",
]) {
  requireText(page, needle, 'News Intake dashboard workspace');
}

for (const needle of [
  'Public feed preview',
  'DEFAULT_CATEGORY_STYLE',
  'categoryLabelBn',
  'categoryLabelEn',
  'type-h3',
  'Select for publishing',
  'MapPin',
  'Eye',
  'Share2',
  'publicationPreferences',
  'news-intake-publish-',
  'publishable',
]) {
  requireText(feedReadyPreview, needle, 'Feed-ready public preview');
}


for (const needle of [
  'getPublished(subcategoryId',
  "get_public_reporting_configuration",
  "status: 'published'",
  "engineMode: form.engineMode === 'schema'",
]) {
  requireText(reportingFormApi, needle, 'published reporting-form contract API');
}

for (const needle of [
  'previousFocusRef',
  "e.key !== 'Tab'",
  'aria-labelledby',
  'aria-describedby',
  'dialogRef.current?.focus()',
]) {
  requireText(modal, needle, 'shared modal accessibility');
}

for (const needle of [
  "supabase.functions.invoke('news-intake-fetch'",
  "supabase.rpc('admin_preview_sourced_report_intake'",
  "supabase.rpc('admin_create_sourced_report_from_intake'",
  "supabase.rpc('admin_merge_intake_source'",
  "supabase.rpc('admin_get_news_intake_taxonomy'",
  "supabase.rpc('admin_get_location_taxonomy'",
]) {
  requireText(api, needle, 'News Intake API');
}

for (const name of [
  'admin_check_news_source_domain',
  'admin_preview_sourced_report_intake',
  'admin_create_sourced_report_from_intake',
  'admin_merge_intake_source',
  'admin_get_news_intake_taxonomy',
  'admin_get_location_taxonomy',
  'admin_resolve_news_intake_location',
  'admin_get_news_intake_scan_sources',
  'admin_begin_news_intake_run',
  'admin_get_news_intake_automation_dashboard',
  'admin_set_news_intake_auto_update',
  'service_begin_news_intake_run',
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
  'News Intake audit passed: trusted-source modes, false-positive classification guards, article-document filtering, source-grounded date/location extraction, published-form synchronization, acknowledged 36-hour scheduling, retry-safe dispatch, manual Check Now, overlap prevention, source-language handling, final server duplicate clearance, reconciled review states, accessible modal focus, mobile review controls, draft-first creation, source merge, and security checks are protected.'
);
