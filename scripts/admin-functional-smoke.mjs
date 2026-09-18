import { chromium } from 'playwright';

const LOCAL_URL = (process.env.LOCAL_SITE_URL || 'http://127.0.0.1:3000/').replace(/\/?$/, '/');
const LIVE_URL = (process.env.LIVE_SITE_URL || 'https://shihabshajib01-cell.github.io/sobaike-janao-admin/').replace(/\/?$/, '/');
const E2E_SUPABASE_ORIGIN = 'https://admin-e2e.invalid';
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

    if (path.includes('/rest/v1/rpc/admin_get_dashboard_aggregates')) {
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
      ];
    } else if (path.includes('/rest/v1/subcategories')) {
      body = [
        { id: 'theft', segment_id: 'public_safety', name_en: 'Theft', name_bn: 'চুরি', active: true, sort_order: 1 },
      ];
    } else if (path.includes('/rest/v1/complaints')) {
      body = [];
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

await browser.close();

console.log('\n=== ADMIN FUNCTIONAL SMOKE SUMMARY ===');
for (const result of results) console.log(result.status + ' - ' + result.name);

if (failures.length) {
  console.error('\nFailures:');
  for (const failure of failures) console.error('FAIL - ' + failure);
  process.exit(1);
}

console.log('\nALL ADMIN BROWSER REGRESSION CHECKS PASSED');
