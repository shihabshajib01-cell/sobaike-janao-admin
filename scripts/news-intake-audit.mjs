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
const publishGroundingGuard = read('supabase/migrations/20260919082837_news_intake_publish_grounding_guard.sql');
const groundingGuardAlignment = read('supabase/migrations/20260919083754_news_intake_grounding_guard_align_duplicate_gate.sql');
const misclassifiedReportQuarantine = read('supabase/migrations/20260919184248_quarantine_misclassified_automated_news_report.sql');
const sensitiveContentReviewGate = read('supabase/migrations/20260920021207_news_intake_sensitive_content_review_gate.sql');
const matchedReviewWorkspace = read('supabase/migrations/20260920065202_news_intake_matched_review_workspace.sql');
const trustedAutoPublish = read('supabase/migrations/20260920093010_trusted_news_intake_auto_publish.sql');
const trustedSourceOmissions = read('supabase/migrations/20260920093258_trusted_news_source_omission_columns.sql');
const finalProductionCleanup = read('supabase/migrations/20260920122450_news_intake_final_production_cleanup.sql');
const finalCloseout = read('supabase/migrations/20260920131136_news_intake_100_percent_closeout.sql');
const ledgerParityCloseout = read('supabase/migrations/20260920131354_news_intake_ledger_parity_closeout.sql');
const schedulerCronParity = read('supabase/migrations/20260920132122_news_intake_scheduler_cron_parity.sql');
const sourceQualityGate = read('supabase/migrations/20260920142434_news_intake_source_quality_gate.sql');
const factcheckLocationQuality = read('supabase/migrations/20260920143209_news_intake_factcheck_location_quality.sql');
const legacyQualityCleanup = read('supabase/migrations/20260920143848_news_intake_legacy_quality_cleanup.sql');
const oneClickContract = read('supabase/migrations/20260920175318_news_intake_one_click_zero_issue_contract.sql');
const subcategoryBuilderContract = read('supabase/migrations/20260920183600_news_intake_subcategory_builder_contract.sql');
const locationSemanticGuard = read('supabase/migrations/20260920193000_news_intake_location_semantic_guard.sql');
const followupLocationCloseout = read('supabase/migrations/20260921082500_news_intake_followup_location_closeout.sql');
const automationCore = read('supabase/functions/_shared/newsIntakeAutomationCore.ts');
const subcategoryBuilders = read('supabase/functions/_shared/newsIntakeSubcategoryBuilders.ts');
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
  'isKnownPublisherArticlePath',
  'inferDistrictWideScope',
  'buildSourceLanguageFields',
  'scoreDiscoveryLink',
  'MAX_ARTICLE_AGE_DAYS',
  'NON_INCIDENT_THEFT_RE',
  'NON_PROPERTY_SNATCHING_RE',
  'THEFT_ALLEGATION_VIOLENCE_RE',
  'isLikelyForeignIncident',
  'isMultiIncidentArticle',
  'isNonIncidentHeadline',
  'buildFeedReadyIncidentContext',
  'isSafeSpecificLocationText',
  'sourceTextLength',
]) {
  requireText(automationCore, needle, 'News Intake automation core');
}

for (const needle of [
  'NEWS_INTAKE_SUBCATEGORY_BUILDERS',
  'NEWS_INTAKE_SUBCATEGORY_IDS',
  'buildNewsIntakeSubcategoryReport',
  'missingNewsIntakeSubcategoryFields',
  'buildSourceLanguageFields',
  'trustedSourceAuto:true',
  'sourceTruthMode:"approved_publisher"',
  'sourceOmittedFields',
  'locationScope',
  'hasValidLocation',
  'utility_outage',
  '"load-shedding-outage"',
  '"gas-shortage"',
  '"bribe-demanded-service"',
  '"sexual-harassment"',
  '"mob-justice"',
  '"child_abduction_murder"',
  '"excess-electricity-bill"',
  '"road-accident"',
  '"road-block"',
]) {
  requireText(subcategoryBuilders, needle, 'News Intake proven subcategory builder registry');
}
if ((subcategoryBuilders.match(/segmentId:/g) || []).length < 26) {
  errors.push('News Intake proven subcategory builder registry must cover all 26 active subcategories.');
}
requireText(behaviorAudit, 'classificationCases', 'News Intake behavior audit');
requireText(behaviorAudit, 'English content must not be duplicated', 'News Intake source-language audit');
requireText(behaviorAudit, 'Incident-anchored date must win over page publication metadata', 'News Intake incident-date grounding regression');
requireText(behaviorAudit, 'Incident location must win over later narrative text ending in এলাকা', 'News Intake location grounding regression');
requireText(behaviorAudit, 'Bangla weekday plus bare সকাল must resolve against same-day publication date', 'News Intake Bangla daypart incident-date regression');
requireText(behaviorAudit, 'An earlier incident sentence may inherit the immediately preceding factual date', 'News Intake adjacent-date grounding regression');
requireText(behaviorAudit, 'Publication metadata must never be inherited as the incident date', 'News Intake publication-date isolation regression');
requireText(behaviorAudit, 'English month-first incident dates must resolve', 'News Intake month-first date regression');
requireText(behaviorAudit, 'Explicit same-day event dates must not be discarded as publication metadata', 'News Intake same-day date regression');
requireText(behaviorAudit, 'Incident district context must beat highway endpoint names', 'News Intake highway/district regression');
requireText(behaviorAudit, 'must resolve without an ambiguity review state', 'News Intake zero allegation-ambiguity regression');
requireText(behaviorAudit, 'Banglanews final-detail article paths must be recognized even without semantic article wrappers', 'News Intake Banglanews final-detail article regression');
requireText(behaviorAudit, 'Excerpt/body overlap must not duplicate the same incident sentence', 'News Intake context de-duplication regression');
requireText(behaviorAudit, 'Near-identical excerpt/body incident sentences must not be repeated', 'News Intake near-duplicate context regression');
requireText(behaviorAudit, 'Bare proper incident place after at must be retained', 'News Intake bare-place grounding regression');
requireText(behaviorAudit, 'Theft-accusation violence must not fall through to the broad theft rule', 'News Intake theft-accusation classification regression');
requireText(behaviorAudit, 'Taking a detainee/suspect from police must not be classified as property snatching', 'News Intake non-property snatching regression');
requireText(behaviorAudit, 'Future strike warnings must be excluded before category matching', 'News Intake non-incident strike regression');
requireText(behaviorAudit, 'Evidence recovery during a murder investigation must not become a standalone theft report', 'News Intake evidence-recovery regression');
requireText(behaviorAudit, 'Same-day Bangla weekday plus বেলা must resolve to the publication day', 'News Intake Bangla বেলা date regression');
requireText(automationCore, 'isSubstantiveIncidentContext', 'News Intake substantive context helper');
requireText(automationCore, 'isLegalFollowUpOnly', 'News Intake legal follow-up helper');
requireText(automationCore, 'isFactCheckOrMisinformationStory', 'News Intake fact-check helper');
requireText(behaviorAudit, 'Exact production road-block wording must ground Cumilla', 'News Intake production location regression');
requireText(behaviorAudit, 'Attempted child murder without abduction or a reported death must not be published as Child Abduction / Murder', 'News Intake child attempted-murder regression');
requireText(behaviorAudit, 'An abduction remains in Child Abduction / Murder even if the later killing was only attempted', 'News Intake child abduction/attempt regression');
requireText(behaviorAudit, 'A reported death after an attempted killing must remain a child murder report', 'News Intake child death-after-attempt regression');
requireText(behaviorAudit, 'Title-only extraction must never become Feed Ready', 'News Intake title-only extraction regression');
requireText(behaviorAudit, 'Court/bail follow-up headlines about older incidents must not create a fresh incident report', 'News Intake legal follow-up regression');
requireText(behaviorAudit, 'Fact-check/debunk stories must not be converted into fresh incident reports', 'News Intake fact-check regression');
requireText(behaviorAudit, 'Narrative police-jurisdiction fragments must never become the public incident location', 'News Intake noisy-location regression');
requireText(behaviorAudit, 'Generic English road fragments must never become a specific location', 'News Intake semantic location regression');
requireText(behaviorAudit, 'Narrative Bangla victim/thana fragments must never become a specific location', 'News Intake Bangla semantic location regression');
requireText(behaviorAudit, 'Feed Ready source context must contain at least 400 characters', 'News Intake 400-character minimum regression');
requireText(behaviorAudit, 'Feed Ready source context must never exceed 800 characters', 'News Intake 800-character maximum regression');
requireText(behaviorAudit, 'Articles with less than 400 source-grounded characters must not become Feed Ready', 'News Intake short-context rejection regression');
requireText(collisionErrorContract, "errcode='P0001'", 'News Intake collision error contract');
requireText(collisionErrorContract, 'DUPLICATE_REVIEW_REQUIRED', 'News Intake collision error contract');
requireText(explicitDenyPolicies, 'news_intake_runs_authenticated_deny', 'News Intake run-table deny policy');
requireText(explicitDenyPolicies, 'news_intake_run_items_authenticated_deny', 'News Intake item-table deny policy');
requireText(schemaRequirementGuard, 'sourced_report_missing_required_fields_internal', 'News Intake schema requirement validator');
requireText(schemaRequirementGuard, 'trg_guard_sourced_report_schema_requirements', 'News Intake schema requirement trigger');
requireText(schemaRequirementGuard, 'schemaValidation', 'News Intake schema-aware preview');
requireText(ledgerParityCloseout, 'revoke execute on function public.admin_get_location_taxonomy()', 'News Intake admin taxonomy anonymous-execute hardening');
requireText(ledgerParityCloseout, 'revoke execute on function public.admin_resolve_news_intake_location(text,text)', 'News Intake location resolver anonymous-execute hardening');
for (const needle of [
  'normalize_sourced_report_public_language',
  'trg_normalize_sourced_report_public_language',
  "v_prefs := v_prefs - 'publicTitleEn' - 'publicSummaryEn'",
  "v_prefs := v_prefs - 'publicTitleBn' - 'publicSummaryBn'",
]) {
  requireText(ledgerParityCloseout, needle, 'News Intake source-language grounding cleanup');
}
for (const needle of [
  "id = 'SJ-2026-240019'",
  "status = 'submitted'",
  "'newsIntakeReviewRequired', true",
  "subcategory_id = 'theft'",
  "origin_type = 'sourced_report'",
]) {
  requireText(
    misclassifiedReportQuarantine,
    needle,
    'known misclassified automated report quarantine'
  );
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
  'timeout_milliseconds:=10000',
  "'scheduledSlot'",
]) {
  requireText(ledgerParityCloseout, needle, 'acknowledged News Intake scheduler');
}

for (const needle of [
  'sobaike-janao-news-intake-auto-dispatch',
  "'* * * * *'",
  'cron.unschedule',
  'dispatch_news_intake_auto_scan',
]) {
  requireText(schedulerCronParity, needle, 'canonical News Intake cron parity');
}

for (const needle of [
  'get_public_published_report',
  'get_public_published_reports',
  'get_public_home_feed',
  'get_public_home_feed_page',
  "sourceLanguage'),''),'unknown'))='en'",
  "sourceLanguage'),''),'unknown'))='bn'",
  "sourceOmittedFields",
  "incidentDate",
  "jsonb_array_elements_text(v_omitted)",
  "duplicate_token_similarity(v_area,c.area)>=0.78",
  "duplicate_token_similarity(v_address,c.formatted_address)>=0.78",
  "news_intake.source_grounding_repair",
  "2026-09-18",
]) {
  requireText(finalCloseout, needle, 'News Intake 100% closeout migration');
}

for (const needle of [
  "hostname='unb.com.bd'",
  "scan_enabled=false",
  'normalize_sourced_report_public_language',
  'trg_normalize_sourced_report_public_language',
  'admin_resolve_news_intake_location(text,text)',
  'dispatch_news_intake_auto_scan',
]) {
  requireText(ledgerParityCloseout, needle, 'News Intake migration-ledger parity closeout');
}

for (const needle of [
  "id='SJ-2026-917489'",
  'news_intake.classification_quarantine',
  'guard_sourced_report_publish_readiness',
]) {
  requireText(finalProductionCleanup, needle, 'News Intake final production cleanup');
}

for (const needle of [
  'SOURCE_QUALITY_GATE_FAILED',
  "v_quality jsonb:=coalesce(p_payload->'quality','{}'::jsonb)",
  "extractionStatus",
  "substantiveContext",
  "currentIncident",
  "followUpOnly",
  "contextLength",
  "normalize_duplicate_text(v_title)=public.normalize_duplicate_text(v_description)",
  "id='SJ-2026-729442'",
  "Satish Babu Lane",
  "news_intake.source_grounding_repair",
]) {
  requireText(sourceQualityGate, needle, 'News Intake source-quality closeout');
}

for (const needle of [
  'SOURCE_CURRENT_INCIDENT_REQUIRED',
  'Fact-check or misinformation/debunking stories cannot be published as new incidents',
  'Court/legal follow-up stories cannot be published as new incidents',
  "id='SJ-2026-873249'",
  'news_intake.classification_quarantine',
  "id='SJ-2026-159311'",
  'news_intake.location_quality_repair',
  "'source_unspecified'",
]) {
  requireText(factcheckLocationQuality, needle, 'News Intake fact-check/location quality closeout');
}

for (const needle of [
  'news_intake.legacy_quality_quarantine',
  "char_length(public.normalize_duplicate_text(c.description))<80",
  "public.normalize_duplicate_text(c.title)=public.normalize_duplicate_text(c.description)",
  "'newsIntakeReviewRequired',true",
  'Legacy trusted-source report quarantined because it does not meet the current News Intake source-quality gate.',
]) {
  requireText(legacyQualityCleanup, needle, 'News Intake legacy source-quality cleanup');
}

for (const needle of [
  'news_intake_specific_location_text_is_safe',
  'guard_trusted_news_intake_one_click_contract',
  'trg_guard_trusted_news_intake_one_click_contract',
  '400 to 800 source-grounded characters',
  'SOURCE_FRESHNESS_REQUIRED',
  'SOURCE_REPORT_CONTRACT_FAILED',
  'SOURCE_LOCATION_QUALITY_FAILED',
  'canonical_upazila_name',
  'Utility start time is required',
  'Excess-bill comparison fields are required',
  'news_intake.one_click_contract_quarantine',
  'কোতোয়ালি',
  'v_dist_count',
]) {
  requireText(oneClickContract, needle, 'News Intake final one-click zero-issue contract');
}

for (const needle of [
  'news_intake_location_contract_is_valid',
  'safe specific place',
  'district-wide scope',
  "v_answers->>'locationScope'",
  "new.custom_field_answers->>'locationScope'",
]) {
  requireText(subcategoryBuilderContract, needle, 'News Intake subcategory-builder server contract');
}

for (const needle of [
  'news_intake_specific_location_text_is_safe',
  'সেপ্টেম্বর',
  'জেলার',
  'উপজেলা',
  'service_role',
]) {
  requireText(locationSemanticGuard, needle, 'News Intake semantic location guard');
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
  'process_trusted_news_intake_candidate',
  'admin_record_news_intake_item',
  'admin_finish_news_intake_run',
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
  'knownPublisherDocumentFallback',
  'requestUserAgent',
  "hostKey==='unb.com.bd' || hostKey==='bdnews24.com' || hostKey==='bangla.bdnews24.com'",
  'const MAX_ARTICLES_PER_SOURCE = 10;',
  'const MAX_TOTAL_ARTICLES = 70;',
  'isLikelyForeignIncident',
  'isMultiIncidentArticle',
  'Source contains multiple distinct incidents; candidate was blocked from Feed Ready',
  'Multiple distinct incident locations were detected; candidate was blocked from Feed Ready',
  'inferSpecificLocationPhrase(focusedLocationText,location.district)',
  'isNonIncidentHeadline',
  'admin_check_source_duplicate',
  "triggerType==='manual'",
  'Approved-source report is ready for one-click publication.',
  'contextualDistrict',
  'Incident is outside the Bangladesh reporting scope.',
  'Approved-source report automatically created and published to the public feed.',
  'Strong same-incident match; approved source merged',
  'processing error(s) were recorded',
  'Section, homepage, or non-article URL was excluded',
  'inferSpecificLocationPhrase',
  'inferDistrictWideScope',
  'isSubstantiveIncidentContext',
  'isLegalFollowUpOnly',
  'isFactCheckOrMisinformationStory',
  'serialized_article_body',
  'semantic_article_paragraphs',
  'details-brief',
  'paragraphBody.length > Math.max(300,body.length+120)',
  'articleTitleTokens',
  '__NEXT_DATA__',
  "hostKey==='bdnews24.com' || hostKey==='bangla.bdnews24.com'",
  "hostKey==='thedailystar.net'",
  "hostKey==='tbsnews.net' ? 2 : 1",
  "hostKey==='tbsnews.net' ? 12000",
  'dhakaTodayYmd',
  "unit!=='HOUR' || amount<24",
  "extractionStatus:'complete'",
  "substantiveContext:true",
  "currentIncident:true",
  "followUpOnly:false",
  'buildFeedReadyIncidentContext',
  'sourceTextLength(context)<400',
  'sourceTextLength(context)>800',
  'Source did not expose 400–800 characters of substantive incident context',
  'Source publication date could not be verified safely; candidate was blocked from Feed Ready.',
  'buildNewsIntakeSubcategoryReport',
  'missingNewsIntakeSubcategoryFields',
  'Current report form requirements could not be fully grounded from the source',
  'Court, bail, remand, confession, hearing, verdict, appeal, or trial follow-up was excluded',
  'Fact-check, misinformation, or debunking article was excluded',
  "errorMessage.startsWith('SOURCE_DOMAIN_NOT_APPROVED:')",
  'Approved-source link redirected to an unapproved domain and was excluded from News Intake.',
]) {
  requireText(scanner, needle, 'automated News Intake scanner');
}

for (const needle of [
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
requireText(api, "'admin_complete_news_intake_item_review'", 'News Intake guided review completion API');
requireText(api, "'process_trusted_news_intake_candidate'", 'News Intake trusted one-click publish API');

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
  '.getPublished(report.subcategoryId)',
  'dynamicCustomFields',
  'unsupportedRequiredFields',
  'Published form fields',
  'dynamicValidationError',
  'RadioGroup',
  'sensitiveContentReviewed',
  'pendingMergeId',
  '<Modal',
  'initialReviewItem',
  'reviewMode',
  'inferredReviewFields',
  'reviewBoxClass',
  'This report needs review',
  'Save Review',
  'onReviewSaved',
]) {
  requireText(manualForm, needle, 'Manual News Intake UI safety flow');
}

for (const needle of [
  'ALTER COLUMN incident_date DROP NOT NULL',
  'ALTER COLUMN division DROP NOT NULL',
  'ALTER COLUMN district DROP NOT NULL',
  'complaints_core_facts_required_unless_trusted_source',
  "origin_type='sourced_report'",
  'trustedSourceAuto',
  "sourceTruthMode','')='approved_publisher",
]) {
  requireText(trustedSourceOmissions, needle, 'trusted-source omission constraint');
}

for (const needle of [
  'process_trusted_news_intake_candidate',
  'trustedSourceAuto',
  "sourceTruthMode','approved_publisher",
  'sourceOmittedFields',
  'news_intake.auto_publish',
  'news_intake.auto_source_merge',
  'admin_check_news_source_domain',
  "'verified',true",
  'guard_sourced_report_schema_requirements',
  'guard_automated_sourced_report_collision',
  'enforce_sourced_report_duplicate_review',
  'guard_sourced_report_publish_readiness',
  'validate_configured_complaint_answers',
  'sanitize_configured_complaint_answers',
  'REVOKE ALL ON FUNCTION public.process_trusted_news_intake_candidate',
  'GRANT EXECUTE ON FUNCTION public.process_trusted_news_intake_candidate(jsonb) TO service_role',
]) {
  requireText(trustedAutoPublish, needle, 'trusted-source atomic auto-publish migration');
}

for (const needle of [
  'review_payload jsonb',
  'admin_complete_news_intake_item_review',
  "'reviewPayload',i.review_payload",
  'evaluate_sourced_report_duplicate_internal',
  'news_intake_privacy_review_required',
  'review_payload=null',
  'REVOKE ALL ON FUNCTION public.admin_complete_news_intake_item_review',
]) {
  requireText(matchedReviewWorkspace, needle, 'matched-item guided review migration');
}

requireText(feedReadyPreview, 'stagedReport?: NewsIntakeReport', 'News Intake staged public-feed preview');
requireText(feedReadyPreview, "stagedReport?.titleBn || stagedReport?.titleEn", 'News Intake source-language staged preview');

for (const needle of [
  'News Intake Workspace',
  'Find News',
  'Scan All Sources Now',
  'Raw news found',
  'Category-matched reports',
  'Select All',
  'Clear Selection',
  'Publish Selected to Feed',
  'FeedReadyReportPreview',
  'stagedReport={stagedReport || undefined}',
  'previewId={`staged-${item.id}`}',
  'orderedMatchedItems.map((item)',
  'workspaceCounts',
  'workspaceCounts.published',
  'rawNewsItems',
  "'excluded'",
  "'ready'",
  "'published'",
  'reasonLabel',
  'segmentLabel',
  'subcategoryLabel',
  'confidenceLabel',
  'filteredRawItems',
  'Outcome:',
  'aria-pressed={rawFilter === value}',
  "item.duplicateStatus === 'clear'",
  'isCurrentFeedReady',
  'isCurrentReviewItem',
  'complaintNeedsReview',
  'isStagedTrustedCandidate',
  'selectionKeyForItem',
  'eligibleSelectionKeys',
  'toggleSelection',
  'publishTrustedCandidate',
  'NEWS_INTAKE_WORKSPACE_SESSION_KEY',
  'window.sessionStorage',
  'stopImmediatePropagation',
  'reportLoadErrors',
  'reviewItemManually',
  'canManuallyReviewItem',
  'if (!canManuallyReviewItem(item))',
  'Automatic excluded matches are diagnostic results, not a manual-data-entry',
  'Needs review',
  'reviewingItem',
  'handleReviewSaved',
  'newsIntakeApi.completeItemReview',
  'requestWorkspaceClose',
  'useBlocker',
  'navigationBlocker',
  "navigationBlocker.state === 'blocked'",
  'navigationBlocker.reset()',
  'navigationBlocker.proceed()',
  'onNavigateToReport',
  'navigateFromWorkspace',
  'switching to another Admin tab',
  'closeConfirmOpen',
  'Close News Intake?',
  'Keep Working',
  'Close News Intake',
  'intakeStarted',
  'publishable={ready}',
  'No category-matched reports',
  'rawNewsExpanded',
  'feedReadyExpanded',
  'scrollbar-gutter:stable',
  'lg:min-h-0 lg:flex-1',
  'mobileFullscreen',
  'max-sm:[&_[data-button-size=sm]]:min-h-11',
  'aria-expanded',
  'ManualNewsIntakeForm',
  'complaintApi.publishComplaint(existingReportId)',
  "result.complaint.status !== 'published'",
]) {
  requireText(page, needle, 'News Intake dashboard workspace');
}

if (!page.includes('orderedMatchedItems.map((item)')) {
  errors.push('Every category-matched item must render in the right panel, with Feed Ready previews ordered before diagnostics.');
}

if (/const canReview[\s\S]{0,260}isExcludedItem\(item\)/.test(page)) {
  errors.push('Automatic excluded News Intake items must remain read-only and must not enter the manual review workflow.');
}

if (scanner.includes('const buildReportPayload =')) {
  errors.push('News Intake scanner must not fall back to the old generic buildReportPayload implementation.');
}
if (!scanner.includes('newsIntakeSubcategoryBuilders.ts')) {
  errors.push('News Intake scanner must route classified articles through the proven subcategory builder registry.');
}

for (const needle of [
  'data-news-intake-raw-item',
  'data-news-intake-feed-preview',
  'data-news-intake-diagnostic',
  'No Feed Ready reports in this run',
  'orderedMatchedItems',
]) {
  requireText(page, needle, 'News Intake Step 2 compact/feed-preview UI');
}
if (page.includes('padding="sm" className="h-full"')) {
  errors.push('Raw News cards must size to content instead of stretching to the panel height.');
}
if (page.includes('Historical review item') || page.includes('Historical review')) {
  errors.push('News Intake must not label current excluded matches as historical review work.');
}
for (const needle of [
  'chattogram-satkania',
  'সাতকানিয়ায়',
  'গত[[:space:]]+',
  'news_intake_specific_location_text_is_safe',
]) {
  requireText(followupLocationCloseout, needle, 'News Intake follow-up/location closeout migration');
}

requireText(page, 'feedReadyItems.map(selectionKeyForItem)', 'ready matched selection eligibility');
requireText(page, "item.reportId ? `report:${String(item.reportId)}` : `item:${item.id}`", 'staged trusted candidate selection key');

for (const needle of [
  'sensitiveContentReviewed',
  'SOURCE_SENSITIVE_CONTENT_REVIEW_REQUIRED',
  'sensitive_content_privacy_review_required',
  'news_intake_privacy_review_required',
  'sourced_report_schema_validation_errors_internal',
  'SOURCE_SCHEMA_VALIDATION_FAILED',
]) {
  requireText(sensitiveContentReviewGate, needle, 'News Intake sensitive-content review gate');
}

if (manualForm.includes('window.confirm')) {
  errors.push('Manual News Intake must use the shared confirmation modal instead of window.confirm.');
}

for (const needle of [
  'buildIncidentFocusedLocationText',
  'focusedLocationText',
]) {
  requireText(scanner, needle, 'News Intake incident-location scanner');
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
  'ring-2 ring-emerald-200/70',
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
  'News Intake audit passed: approved-source manual select/publish, scheduled atomic auto-publish, zero allegation-ambiguity review, non-incident false-positive guards, source-omission preservation, Bangladesh scope filtering, context-grounded date/location resolution, exact-source de-duplication, strong source merging, 36-hour scheduling, persisted Step-2 workspace state, mobile behavior, and security checks are protected.'
);
