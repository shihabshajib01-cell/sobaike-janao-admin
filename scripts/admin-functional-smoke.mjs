import { chromium } from 'playwright';

const LOCAL_URL = (process.env.LOCAL_SITE_URL || 'http://127.0.0.1:3000/').replace(/\/?$/, '/');
const LIVE_URL = (process.env.LIVE_SITE_URL || 'https://shihabshajib01-cell.github.io/sobaike-janao-admin/').replace(/\/?$/, '/');
const E2E_SUPABASE_ORIGIN = 'https://admin-e2e.invalid';
const E2E_SOURCED_REPORT_ID = 'E2E-SOURCED-001';
const E2E_EXISTING_REPORT_ID = 'E2E-EXISTING-001';
const E2E_NEWS_INTAKE_REPORT_ID = 'E2E-NEWS-001';
const E2E_AUTO_RUN_ID = '11111111-2222-4333-8444-555555555555';
const E2E_AUTO_REPORT_A = 'E2E-AUTO-001';
const E2E_AUTO_REPORT_B = 'E2E-AUTO-002';

const e2eNewsIntakeComplaint = {
  id: E2E_NEWS_INTAKE_REPORT_ID,
  segment_id: 'public_safety',
  subcategory_id: 'theft',
  title: 'নিউজ ইনটেক ব্রাউজার পরীক্ষার রিপোর্ট',
  title_en: 'News Intake browser test report',
  description: 'নিউজ ইনটেক এক-ক্লিক প্রকাশ পরীক্ষার জন্য বিচ্ছিন্ন ডাটা।',
  description_en: 'Isolated fixture for News Intake one-click publication.',
  incident_date: '2026-09-18',
  incident_time: '12:00',
  status: 'published',
  priority: 'medium',
  origin_type: 'sourced_report',
  privacy_choice: 'anonymous',
  publication_preferences: {},
  division: 'Dhaka',
  district: 'Dhaka',
  upazila_or_thana: 'Tejgaon',
  area: 'E2E Intake Area',
  created_at: '2026-09-18T12:00:00Z',
  updated_at: '2026-09-18T12:00:00Z',
};

const autoComplaint = (id, title, status = 'submitted') => ({
  id,
  segment_id: 'public_safety',
  subcategory_id: 'theft',
  title,
  title_en: '',
  description: title + ' সম্পর্কিত বিশ্বস্ত সংবাদ উৎসভিত্তিক পরীক্ষামূলক বিবরণ।',
  description_en: '',
  incident_date: '2026-09-18',
  status,
  priority: 'medium',
  origin_type: 'sourced_report',
  privacy_choice: 'anonymous',
  publication_preferences: {
    showDescription: true,
    showGeneralLocation: true,
  },
  custom_field_answers: {
    sourceLanguage: 'bn',
    automatedIntake: true,
    locationScope: 'specific',
  },
  division: 'Dhaka',
  district: 'Dhaka',
  upazila_or_thana: 'Tejgaon',
  area: 'E2E Intake Area',
  formatted_address: 'E2E Intake Area, Tejgaon, Dhaka',
  created_at: '2026-09-19T07:00:00Z',
  updated_at: '2026-09-19T07:00:00Z',
});

const automaticDashboardFixture = {
  sources: [
    {
      hostname: 'www.thedailystar.net',
      publisherName: 'The Daily Star',
      homepageUrl: 'https://www.thedailystar.net/',
      languageHint: 'en',
      priority: 1,
      scanEnabled: true,
      automationNote: null,
      lastScannedAt: '2026-09-19T07:00:00Z',
    },
  ],
  runs: [
    {
      runId: E2E_AUTO_RUN_ID,
      status: 'completed',
      triggerType: 'manual',
      sourceCount: 1,
      discoveredCount: 3,
      classifiedCount: 2,
      duplicateCount: 0,
      createdCount: 2,
      mergedCount: 0,
      reviewCount: 1,
      skippedCount: 0,
      errorCount: 0,
      startedAt: '2026-09-19T07:00:00Z',
      completedAt: '2026-09-19T07:00:05Z',
      errorSummary: null,
      items: [
        {
          id: 'auto-item-a',
          itemKind: 'article',
          publisherName: 'The Daily Star',
          sourceHostname: 'www.thedailystar.net',
          canonicalUrl: 'https://www.thedailystar.net/e2e-auto-a',
          sourceTitle: 'E2E automatic report A',
          sourcePublishedDate: '2026-09-19',
          contentLanguage: 'bn',
          segmentId: 'public_safety',
          subcategoryId: 'theft',
          confidence: 0.94,
          duplicateStatus: 'clear',
          action: 'created_draft',
          reportId: E2E_AUTO_REPORT_A,
          reason: 'Source-grounded draft created; publication remains a separate admin action.',
        },
        {
          id: 'auto-item-b',
          itemKind: 'article',
          publisherName: 'The Daily Star',
          sourceHostname: 'www.thedailystar.net',
          canonicalUrl: 'https://www.thedailystar.net/e2e-auto-b',
          sourceTitle: 'E2E automatic report B',
          sourcePublishedDate: '2026-09-19',
          contentLanguage: 'bn',
          segmentId: 'public_safety',
          subcategoryId: 'theft',
          confidence: 0.93,
          duplicateStatus: 'clear',
          action: 'created_draft',
          reportId: E2E_AUTO_REPORT_B,
          reason: 'Source-grounded draft created; publication remains a separate admin action.',
        },
        {
          id: 'auto-item-review',
          itemKind: 'article',
          publisherName: 'The Daily Star',
          sourceHostname: 'www.thedailystar.net',
          canonicalUrl: 'https://www.thedailystar.net/e2e-auto-review',
          sourceTitle: 'E2E source requiring review',
          sourcePublishedDate: '2026-09-19',
          contentLanguage: 'en',
          segmentId: 'public_safety',
          subcategoryId: 'theft',
          confidence: 0.88,
          duplicateStatus: 'review',
          action: 'needs_review',
          reportId: null,
          reason: 'Incident date could not be established safely from the source.',
        },
      ],
    },
  ],
  automation: {
    enabled: true,
    intervalHours: 36,
    lastAutoDispatchedAt: '2026-09-18T19:00:00Z',
    nextAutoDueAt: '2026-09-20T07:00:00Z',
    running: false,
  },
};

const duplicateClearFixture = {
  applicable: true,
  status: 'clear',
  requiresReview: false,
  candidateCount: 0,
  matchCount: 0,
  reviewCount: 0,
  exactSourceDuplicates: [],
  candidates: [],
};

const newsIntakeClearFixture = {
  sourceDomain: {
    approved: true,
    hostname: 'www.thedailystar.net',
    publisherName: 'The Daily Star',
  },
  duplicate: duplicateClearFixture,
  canCreateDraft: true,
  canPublishImmediately: true,
};


const e2eSourcedComplaint = {
  id: E2E_SOURCED_REPORT_ID,
  segment_id: 'load_shedding',
  subcategory_id: 'load-shedding-e2e',
  title: 'ঢাকার একই এলাকায় বিদ্যুৎ বিভ্রাটের পরীক্ষামূলক রিপোর্ট',
  title_en: 'E2E sourced report for duplicate review',
  description: 'ডুপ্লিকেট রিভিউ ব্রাউজার পরীক্ষার জন্য বিচ্ছিন্ন ডাটা।',
  description_en: 'Isolated browser fixture for sourced-report duplicate review.',
  incident_date: '2026-09-18',
  incident_time: '10:00',
  status: 'submitted',
  priority: 'medium',
  origin_type: 'sourced_report',
  privacy_choice: 'anonymous',
  publication_preferences: {},
  district: 'Dhaka',
  upazila_or_thana: 'Tejgaon',
  area: 'E2E Area',
  created_at: '2026-09-18T10:00:00Z',
  updated_at: '2026-09-18T10:00:00Z',
};

const duplicateMatchFixture = {
  applicable: true,
  status: 'match',
  requiresReview: true,
  candidateCount: 1,
  matchCount: 1,
  reviewCount: 0,
  exactSourceDuplicates: [],
  candidates: [
    {
      complaintId: E2E_EXISTING_REPORT_ID,
      status: 'published',
      titleBn: 'একই ঘটনার বিদ্যমান রিপোর্ট',
      titleEn: 'Existing report for the same incident',
      segmentId: 'load_shedding',
      subcategoryId: 'load-shedding-e2e',
      incidentDate: '2026-09-18',
      district: 'Dhaka',
      upazilaOrThana: 'Tejgaon',
      area: 'E2E Area',
      score: 91,
      titleSimilarity: 0.72,
      matchLevel: 'match',
      reasons: ['same_subcategory', 'same_incident_date', 'same_district', 'same_upazila_or_thana'],
      sources: [
        {
          publisherName: 'E2E News',
          sourceTitle: 'Existing source fixture',
          canonicalUrl: 'https://example.invalid/e2e-existing-source',
          sourcePublishedDate: '2026-09-18',
        },
      ],
    },
  ],
};

const failures = [];
const results = [];

function pass(name) {
  results.push({ name, status: 'PASS' });
  console.log('PASS: ' + name);
}

function fail(name, error) {
  const message = error instanceof Error ? error.message : String(error);
  failures.push(name + ': ' + message);
  results.push({ name, status: 'FAIL' });
  console.error('FAIL: ' + name + ': ' + message);
}

async function check(name, fn) {
  try {
    await fn();
    pass(name);
  } catch (error) {
    fail(name, error);
  }
}

function hashUrl(base, route) {
  return base + '#/' + route.replace(/^\//, '');
}

async function expectVisible(locator, message) {
  await locator.waitFor({ state: 'visible', timeout: 15000 });
  if (!(await locator.isVisible())) throw new Error(message);
}

async function expectInputValue(locator, expected, message) {
  await locator.waitFor({ state: 'visible', timeout: 15000 });
  const deadline = Date.now() + 15000;

  while (Date.now() < deadline) {
    if ((await locator.inputValue()) === expected) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(message);
}

async function fetchWithRetry(url, options = {}, attempts = 4) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetch(url, options);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 750));
      }
    }
  }

  throw lastError;
}

function attachPageGuards(page, label) {
  page.on('pageerror', (error) => failures.push(label + ' pageerror: ' + error.message));
  page.on('response', (response) => {
    if (response.status() >= 500 && response.url().startsWith(new URL(page.url() || LOCAL_URL).origin)) {
      failures.push(label + ' HTTP ' + response.status() + ': ' + response.url());
    }
  });
}

async function installSupabaseFixtures(page) {
  const publishedIds = new Set();

  await page.route(E2E_SUPABASE_ORIGIN + '/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const headers = {
      'access-control-allow-origin': '*',
      'content-type': 'application/json',
      'content-range': '0-0/0',
    };

    let body = [];

    if (path.includes('/functions/v1/news-intake-scan')) {
      body = {
        runId: E2E_AUTO_RUN_ID,
        status: 'completed',
        triggerType: 'manual',
        alreadyRunning: false,
      };
    } else if (path.includes('/functions/v1/news-intake-fetch')) {
      body = {
        sourceType: 'news',
        publisherName: 'The Daily Star',
        sourceTitle: 'E2E approved source article',
        canonicalUrl: 'https://www.thedailystar.net/e2e-news-intake',
        sourcePublishedDate: '2026-09-18',
        descriptionPreview: 'Approved-source metadata preview for the News Intake browser smoke.',
        hostname: 'www.thedailystar.net',
        approved: true,
      };
    } else if (path.includes('/rest/v1/rpc/admin_get_news_intake_automation_dashboard')) {
      body = automaticDashboardFixture;
    } else if (path.includes('/rest/v1/rpc/admin_get_location_taxonomy')) {
      body = {
        divisions: [
          { id: 'dhaka-division', nameEn: 'Dhaka', nameBn: 'ঢাকা' },
        ],
        districts: [
          { id: 'dhaka-district', divisionId: 'dhaka-division', nameEn: 'Dhaka', nameBn: 'ঢাকা' },
        ],
        upazilas: [
          { id: 'tejgaon-thana', districtId: 'dhaka-district', nameEn: 'Tejgaon', nameBn: 'তেজগাঁও' },
        ],
      };
    } else if (path.includes('/rest/v1/rpc/admin_get_news_intake_taxonomy')) {
      body = {
        segments: [
          { id: 'public_safety', nameEn: 'Public Safety', nameBn: 'জননিরাপত্তা', order: 1 },
        ],
        subcategories: [
          {
            id: 'theft',
            segmentId: 'public_safety',
            nameEn: 'Theft',
            nameBn: 'চুরি',
            order: 1,
            isSensitive: false,
          },
        ],
      };
    } else if (path.includes('/rest/v1/rpc/admin_preview_sourced_report_intake')) {
      body = newsIntakeClearFixture;
    } else if (path.includes('/rest/v1/rpc/admin_create_sourced_report_from_intake')) {
      body = {
        success: true,
        reportId: E2E_NEWS_INTAKE_REPORT_ID,
        status: 'submitted',
        duplicate: duplicateClearFixture,
        canPublishImmediately: true,
      };
    } else if (path.includes('/rest/v1/rpc/admin_merge_intake_source')) {
      body = {
        success: true,
        reportId: E2E_EXISTING_REPORT_ID,
        sourceId: 'e2e-merged-source',
        status: 'published',
      };
    } else if (path.includes('/rest/v1/rpc/admin_publish_complaint')) {
      const payload = request.postDataJSON?.() || {};
      const complaintId = String(payload.p_complaint_id || E2E_NEWS_INTAKE_REPORT_ID);
      publishedIds.add(complaintId);
      body = {
        success: true,
        complaint_id: complaintId,
        status: 'published',
        previous_status: 'submitted',
      };
    } else if (path.includes('/rest/v1/rpc/admin_check_report_duplicate')) {
      body = duplicateMatchFixture;
    } else if (path.includes('/rest/v1/rpc/admin_confirm_reports_are_distinct')) {
      body = duplicateClearFixture;
    } else if (path.includes('/rest/v1/rpc/admin_check_source_duplicate')) {
      body = { duplicate: false, normalizedUrl: 'https://example.invalid/new-source' };
    } else if (path.includes('/rest/v1/rpc/admin_get_complaint_sources')) {
      body = [
        {
          id: 'e2e-source-1',
          sourceType: 'news',
          publisherName: 'E2E News',
          sourceTitle: 'E2E source fixture',
          canonicalUrl: 'https://example.invalid/e2e-current-source',
          sourcePublishedDate: '2026-09-18',
          verificationStatus: 'verified',
          isFinalDetailPage: true,
          sourceVersion: 1,
          verifiedAt: '2026-09-18T10:00:00Z',
          createdAt: '2026-09-18T10:00:00Z',
          updatedAt: '2026-09-18T10:00:00Z',
        },
      ];
    } else if (path.includes('/rest/v1/rpc/admin_get_complaint_configured_fields')) {
      body = { formSchemaVersion: null, answers: {}, fields: [] };
    } else if (path.includes('/rest/v1/rpc/admin_get_complaint_evidence')) {
      body = [];
    } else if (path.includes('/rest/v1/rpc/admin_get_complaint_reporter_location')) {
      body = null;
    } else if (path.includes('/rest/v1/rpc/admin_get_dashboard_aggregates')) {
      body = {
        stats: {
          totalComplaints: 0,
          submitted: 0,
          published: 0,
          unpublished: 0,
          rejected: 0,
          edited: 0,
        },
        categorySummary: [],
      };
    } else if (path.includes('/rest/v1/rpc/admin_get_responses')) {
      body = {
        responses: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 1,
        statusCounts: {
          all: 0,
          pending_review: 0,
          published: 0,
          rejected: 0,
          unpublished: 0,
        },
      };
    } else if (path.includes('/rest/v1/rpc/admin_get_taxonomy_configuration')) {
      body = { segments: [], subcategories: [] };
    } else if (path.includes('/rest/v1/rpc/admin_get_unread_notification_count')) {
      body = 0;
    } else if (path.includes('/rest/v1/rpc/admin_list_notifications')) {
      body = [];
    } else if (path.includes('/rest/v1/rpc/admin_get_site_banners')) {
      body = [];
    } else if (path.includes('/rest/v1/rpc/get_public_category_popularity')) {
      body = [];
    } else if (path.includes('/rest/v1/segments')) {
      body = [
        { id: 'public_safety', name_en: 'Public Safety', name_bn: 'জননিরাপত্তা', active: true, sort_order: 1 },
        { id: 'load_shedding', name_en: 'Utility Issues', name_bn: 'ইউটিলিটি সমস্যা', active: true, sort_order: 2 },
      ];
    } else if (path.includes('/rest/v1/subcategories')) {
      body = [
        { id: 'theft', segment_id: 'public_safety', name_en: 'Theft', name_bn: 'চুরি', active: true, sort_order: 1 },
        { id: 'load-shedding-e2e', segment_id: 'load_shedding', name_en: 'Load Shedding', name_bn: 'লোডশেডিং', active: true, sort_order: 1 },
      ];
    } else if (path.includes('/rest/v1/complaint_updates')) {
      body = [];
    } else if (path.includes('/rest/v1/complaints')) {
      const requestedId = url.searchParams.get('id') || '';
      body = requestedId.includes(E2E_SOURCED_REPORT_ID)
        ? e2eSourcedComplaint
        : requestedId.includes(E2E_NEWS_INTAKE_REPORT_ID)
          ? e2eNewsIntakeComplaint
          : requestedId.includes(E2E_AUTO_REPORT_A)
            ? autoComplaint(
                E2E_AUTO_REPORT_A,
                'স্বয়ংক্রিয় নিউজ ইনটেক রিপোর্ট A',
                publishedIds.has(E2E_AUTO_REPORT_A) ? 'published' : 'submitted'
              )
            : requestedId.includes(E2E_AUTO_REPORT_B)
              ? autoComplaint(
                  E2E_AUTO_REPORT_B,
                  'স্বয়ংক্রিয় নিউজ ইনটেক রিপোর্ট B',
                  publishedIds.has(E2E_AUTO_REPORT_B) ? 'published' : 'submitted'
                )
              : [];
    } else if (path.includes('/rest/v1/rpc/')) {
      body = [];
    } else if (path.includes('/auth/v1/')) {
      body = {};
    } else {
      body = [];
    }

    await route.fulfill({
      status: 200,
      headers,
      body: request.method() === 'HEAD' ? '' : JSON.stringify(body),
    });
  });

  return { publishedIds };
}


const browser = await chromium.launch({ headless: true });

await check('Live Admin login, validation and protected-route boundary', async () => {
  const context = await browser.newContext({ viewport: { width: 1365, height: 900 } });
  const page = await context.newPage();
  attachPageGuards(page, 'live-auth');

  await page.goto(hashUrl(LIVE_URL, '/login'), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await expectVisible(page.locator('#login-email'), 'live login email field missing');
  await expectVisible(page.locator('#login-password'), 'live login password field missing');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expectVisible(page.getByText('Email is required', { exact: true }), 'email validation missing');
  await expectVisible(page.getByText('Password is required', { exact: true }), 'password validation missing');

  await page.goto(hashUrl(LIVE_URL, '/complaints'), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await expectVisible(page.locator('#login-email'), 'unauthenticated protected route did not redirect to login');
  if (!page.url().includes('#/login')) throw new Error('protected route URL did not resolve to #/login');

  await context.close();
});

await check('Live Admin production does not publish JavaScript sourcemaps', async () => {
  const indexResponse = await fetchWithRetry(LIVE_URL, { redirect: 'follow' });
  if (!indexResponse.ok) throw new Error('live Admin index returned ' + indexResponse.status);
  const html = await indexResponse.text();
  const match = html.match(/<script[^>]+src=["']([^"']+\.js)["']/);
  if (!match) throw new Error('could not locate live Admin JavaScript asset');

  const assetUrl = new URL(match[1], LIVE_URL).toString();
  const sourceMapResponse = await fetchWithRetry(assetUrl + '.map', { redirect: 'manual' });
  if (sourceMapResponse.ok) throw new Error('production JavaScript sourcemap is publicly reachable: ' + assetUrl + '.map');
});

await check('DEV-only E2E admin shell renders protected core routes without runtime crashes', async () => {
  const context = await browser.newContext({ viewport: { width: 1365, height: 900 } });
  const page = await context.newPage();
  attachPageGuards(page, 'local-protected-routes');
  await installSupabaseFixtures(page);

  const routes = [
    '/dashboard',
    '/complaints',
    '/news-intake',
    '/responses',
    '/categories',
    '/banners',
    '/notifications',
  ];

  for (const route of routes) {
    await page.goto(hashUrl(LOCAL_URL, route), { waitUntil: 'domcontentloaded', timeout: 30000 });
    await expectVisible(page.locator('main'), route + ' main content missing');
    await page.waitForTimeout(500);

    if (page.url().includes('#/login')) throw new Error(route + ' unexpectedly redirected to login in DEV-only E2E mode');
    if (await page.getByText('Something went wrong', { exact: true }).isVisible().catch(() => false)) {
      throw new Error(route + ' hit the Admin ErrorBoundary');
    }
  }

  await context.close();
});

await check('Admin header language, theme and notification keyboard flow', async () => {
  const context = await browser.newContext({ viewport: { width: 1365, height: 900 } });
  const page = await context.newPage();
  attachPageGuards(page, 'local-header');
  await installSupabaseFixtures(page);

  await page.goto(hashUrl(LOCAL_URL, '/dashboard'), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await expectVisible(
    page.getByRole('heading', { name: 'Dashboard', exact: true, level: 1 }),
    'Dashboard page title missing'
  );

  await page.getByRole('button', { name: 'Toggle color theme' }).click();
  await page.waitForTimeout(150);
  const htmlClass = String(await page.locator('html').getAttribute('class'));
  if (!htmlClass.includes('dark')) throw new Error('dark theme did not apply');

  await page.getByRole('button', { name: 'বাংলা ভাষায় পরিবর্তন করুন' }).click();
  await page.waitForTimeout(150);
  const lang = await page.locator('html').getAttribute('lang');
  if (lang !== 'bn') throw new Error('language toggle did not update html lang to bn');

  const bell = page.locator('#header-notification-bell-btn');
  await bell.click();
  const dialog = page.locator('#notification-dropdown-dialog');
  await expectVisible(dialog, 'notification dropdown did not open');
  if ((await dialog.getAttribute('role')) !== 'dialog') throw new Error('notification dropdown lost dialog semantics');

  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden', timeout: 10000 });
  const focusedId = await page.evaluate(() => document.activeElement?.id || '');
  if (focusedId !== 'header-notification-bell-btn') throw new Error('notification Escape did not restore bell focus');

  await context.close();
});

await check('Admin mobile sidebar opens, closes and preserves touch navigation shell', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  attachPageGuards(page, 'local-mobile');
  await installSupabaseFixtures(page);

  await page.goto(hashUrl(LOCAL_URL, '/dashboard'), { waitUntil: 'domcontentloaded', timeout: 30000 });
  const openMenu = page.getByRole('button', { name: 'Open navigation menu' });
  await expectVisible(openMenu, 'mobile menu trigger missing');
  const openBox = await openMenu.boundingBox();
  if (!openBox || openBox.width < 40 || openBox.height < 40) {
    throw new Error('mobile menu trigger is below the practical touch-target size');
  }

  await openMenu.click();
  const sidebar = page.locator('aside[aria-label="Admin Navigation"]');
  await expectVisible(sidebar, 'mobile sidebar did not open');
  const complaintsLink = sidebar.getByRole('link', { name: /Complaint/i });
  await expectVisible(complaintsLink, 'complaints navigation item missing');
  await complaintsLink.click();
  await page.waitForTimeout(250);
  if (!page.url().includes('#/complaints')) throw new Error('mobile navigation did not reach complaints');
  if (await page.getByText('Something went wrong', { exact: true }).isVisible().catch(() => false)) {
    throw new Error('mobile complaints route hit the ErrorBoundary');
  }

  await context.close();
});

await check('Sourced report publish is blocked until duplicate review is resolved', async () => {
  const context = await browser.newContext({ viewport: { width: 1365, height: 900 } });
  const page = await context.newPage();
  attachPageGuards(page, 'local-duplicate-gate');
  await installSupabaseFixtures(page);

  await page.goto(hashUrl(LOCAL_URL, '/complaints/' + E2E_SOURCED_REPORT_ID), {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  await expectVisible(
    page.getByRole('heading', { name: new RegExp(E2E_SOURCED_REPORT_ID), level: 1 }),
    'sourced report detail page did not load'
  );

  await page.getByRole('button', { name: 'Publish to Feed', exact: true }).first().click();

  await expectVisible(
    page.getByText('A likely duplicate incident already exists', { exact: true }),
    'duplicate match warning did not appear'
  );
  await expectVisible(
    page.getByText('Existing report for the same incident', { exact: true }),
    'duplicate candidate was not rendered'
  );

  const publishLive = page.getByRole('button', { name: 'Publish Live', exact: true });
  if (!(await publishLive.isDisabled())) {
    throw new Error('Publish Live remained enabled while a duplicate candidate was unresolved');
  }

  await page.getByRole('button', { name: 'Confirm Separate Incident', exact: true }).click();
  await page.getByLabel('Review Note *').fill(
    'Different transformer and separate outage confirmed by the source details.'
  );
  await page.getByRole('button', { name: 'Confirm as Separate', exact: true }).click();

  await expectVisible(
    page.getByText('No duplicate incident found', { exact: true }),
    'duplicate review did not clear after audited separate-incident confirmation'
  );

  if (await publishLive.isDisabled()) {
    throw new Error('Publish Live did not become available after duplicate review cleared');
  }

  await context.close();
});

await check('News Intake automatic review selects only intended reports and keeps published history visible', async () => {
  const context = await browser.newContext({ viewport: { width: 1365, height: 1000 } });
  const page = await context.newPage();
  attachPageGuards(page, 'local-news-intake-automatic');
  const fixtures = await installSupabaseFixtures(page);

  await page.goto(hashUrl(LOCAL_URL, '/news-intake'), {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  await page.getByRole('button', { name: 'Check Now', exact: true }).click();
  await page.getByRole('button', { name: 'Scan All Sources Now', exact: true }).click();

  await expectVisible(
    page.getByText('2 ready · 0 selected', { exact: true }).first(),
    'automatic review did not expose the two safe feed-ready reports'
  );
  await expectVisible(
    page.getByText('Scan summary:', { exact: true }),
    'automatic review scan summary missing'
  );

  const reviewFilter = page.getByRole('button', { name: 'Needs review · 1', exact: true });
  await expectVisible(reviewFilter, 'automatic review filter missing');
  await reviewFilter.click();
  await expectVisible(
    page.getByText('E2E source requiring review', { exact: true }),
    'needs-review filter did not retain the review item'
  );
  if (await page.getByText('E2E automatic report A', { exact: true }).isVisible()) {
    throw new Error('needs-review filter left a feed-ready raw item visible');
  }
  await page.getByRole('button', { name: 'All · 3', exact: true }).click();

  const reportA = page.getByLabel('Select স্বয়ংক্রিয় নিউজ ইনটেক রিপোর্ট A for publishing');
  const reportB = page.getByLabel('Select স্বয়ংক্রিয় নিউজ ইনটেক রিপোর্ট B for publishing');
  await expectVisible(reportA, 'first automatic report selector missing');
  await expectVisible(reportB, 'second automatic report selector missing');

  await reportA.check({ force: true });
  await expectVisible(
    page.getByText('1 selected', { exact: true }),
    'selection count did not update'
  );
  await page.getByRole('button', { name: 'Publish Selected to Feed', exact: true }).click();

  await expectVisible(
    page.getByText('1 reports published to the feed', { exact: true }),
    'automatic selected-only publish result missing'
  );
  if (!fixtures.publishedIds.has(E2E_AUTO_REPORT_A)) {
    throw new Error('selected automatic report was not published');
  }
  if (fixtures.publishedIds.has(E2E_AUTO_REPORT_B)) {
    throw new Error('unselected automatic report was published');
  }

  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'Review', exact: true }).first().click();

  await expectVisible(
    page.getByText('Published', { exact: true }),
    'historical run hid the already-published feed-ready report'
  );
  await expectVisible(
    page.getByLabel('Select স্বয়ংক্রিয় নিউজ ইনটেক রিপোর্ট B for publishing'),
    'remaining submitted report did not stay selectable in historical review'
  );

  await context.close();
});

await check('News Intake mobile raw and feed-ready panels collapse independently', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  attachPageGuards(page, 'local-news-intake-mobile-review');
  await installSupabaseFixtures(page);

  await page.goto(hashUrl(LOCAL_URL, '/news-intake'), {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  await page.getByRole('button', { name: 'Review', exact: true }).first().click();

  const rawToggle = page.getByRole('button', { name: /Raw news found/ });
  const readyToggle = page.getByRole('button', { name: /Feed-ready report/ });
  await expectVisible(rawToggle, 'mobile raw-news collapse control missing');
  await expectVisible(readyToggle, 'mobile feed-ready collapse control missing');

  await rawToggle.click();
  if ((await rawToggle.getAttribute('aria-expanded')) !== 'false') {
    throw new Error('raw-news panel did not collapse');
  }
  if ((await readyToggle.getAttribute('aria-expanded')) !== 'true') {
    throw new Error('feed-ready panel collapsed when only raw news was toggled');
  }

  await readyToggle.click();
  if ((await readyToggle.getAttribute('aria-expanded')) !== 'false') {
    throw new Error('feed-ready panel did not collapse independently');
  }

  await context.close();
});

await check('News Intake clear source reaches one-click publication', async () => {
  const context = await browser.newContext({ viewport: { width: 1365, height: 1000 } });
  const page = await context.newPage();
  attachPageGuards(page, 'local-news-intake');
  await installSupabaseFixtures(page);

  await page.goto(hashUrl(LOCAL_URL, '/news-intake'), {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  await expectVisible(
    page.getByRole('heading', { name: 'News Intake', exact: true, level: 1 }),
    'News Intake page title missing'
  );

  await page.getByRole('button', { name: 'Check Now', exact: true }).click();
  await expectVisible(
    page.getByRole('heading', { name: 'News Intake Workspace', exact: true }),
    'News Intake workspace modal did not open'
  );
  await page.getByText('Manual intake', { exact: true }).click();
  await page.getByRole('button', { name: 'Open Manual Intake', exact: true }).click();

  await page.locator('#news-intake-source-url').fill(
    'https://www.thedailystar.net/e2e-news-intake'
  );
  await page.getByRole('button', { name: 'Fetch Metadata', exact: true }).click();
  await expectInputValue(
    page.getByLabel('Source article title *', { exact: true }),
    'E2E approved source article',
    'source metadata was not populated'
  );

  await page.getByLabel('Category *', { exact: true }).selectOption('public_safety');
  await page.getByLabel('Subcategory *', { exact: true }).selectOption('theft');
  await page.getByLabel('Report title (source language) *', { exact: true }).fill(
    'নিউজ ইনটেক ব্রাউজার পরীক্ষার রিপোর্ট'
  );
  await page.getByLabel('Incident context (source language) *', { exact: true }).fill(
    'বিশ্বস্ত সংবাদ উৎসভিত্তিক পরীক্ষামূলক ঘটনার প্রেক্ষাপট।'
  );
  await page.getByLabel('Incident date *').fill('2026-09-18');
  await page.getByLabel('Division *').selectOption({ label: 'Dhaka' });
  await page.getByLabel('District *').selectOption({ label: 'Dhaka' });
  await page.getByLabel('Area', { exact: true }).fill('E2E Intake Area');

  await page
    .getByRole('button', { name: 'Check Source & Duplicates', exact: true })
    .click();

  await expectVisible(
    page.getByText('Clear as a new incident', { exact: true }),
    'clear duplicate preview did not render'
  );

  const createAndPublish = page.getByRole('button', {
    name: 'Create & Publish',
    exact: true,
  });
  await expectVisible(createAndPublish, 'Create & Publish action missing for clear intake');
  await createAndPublish.click();

  await page.waitForURL(
    (url) => url.hash.includes('/complaints/' + E2E_NEWS_INTAKE_REPORT_ID),
    { timeout: 15000 }
  );

  await expectVisible(
    page.getByRole('heading', {
      name: new RegExp(E2E_NEWS_INTAKE_REPORT_ID),
      level: 1,
    }),
    'one-click publish did not land on the created report'
  );

  await context.close();
});

await browser.close();

console.log('\n=== ADMIN FUNCTIONAL SMOKE SUMMARY ===');
for (const result of results) console.log(result.status + ' - ' + result.name);

if (failures.length) {
  console.error('\nFailures:');
  for (const failure of failures) console.error('FAIL - ' + failure);
  process.exit(1);
}

console.log('\nALL ADMIN BROWSER REGRESSION CHECKS PASSED');
