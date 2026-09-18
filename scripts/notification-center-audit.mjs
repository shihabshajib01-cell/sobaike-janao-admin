import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`Notification audit failed: ${message}`);
    process.exitCode = 1;
  }
};

const migration = read('supabase/migrations/20260918061006_notification_center_completion.sql');
const backfillMigration = read('supabase/migrations/20260918061325_notification_center_backfill_missing_submissions.sql');
const consistencyMigration = read('supabase/migrations/20260918065510_notification_center_consistency_fixes.sql');
const api = read('src/services/api/notificationApi.ts');
const context = read('src/context/NotificationContext.tsx');
const page = read('src/pages/Notifications/NotificationsPage.tsx');
const dropdown = read('src/components/layout/NotificationDropdown.tsx');
const utils = read('src/utils/notificationUtils.ts');
const language = read('src/context/LanguageContext.tsx');

assert(
  migration.includes('trg_admin_notify_complaint_submitted'),
  'complaint.submitted trigger is missing'
);
assert(
  migration.includes('ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications'),
  'admin_notifications is not enabled for Realtime'
);
assert(
  migration.includes("p_category = 'security'") &&
    migration.includes("n.layer = 'security_privilege'"),
  'Security filtering is not handled by the backend RPC'
);
for (const eventKey of [
  'taxonomy.category_created',
  'taxonomy.category_published',
  'taxonomy.subcategory_created',
  'taxonomy.subcategory_published',
  'taxonomy.subcategory_moved',
  'reporting_form.published',
  'banner.published',
]) {
  assert(migration.includes(eventKey), `missing configuration event ${eventKey}`);
}

assert(
  !api.includes('BACKEND_BATCH_SIZE') && !api.includes('visitedCursors'),
  'client-side Security pagination scan is still present'
);
assert(
  api.includes("p_category: params?.category || null"),
  'notification category filter is not sent directly to the RPC'
);
assert(
  !context.includes('refreshUnreadCount();\n          refreshRecent();'),
  'Realtime callback still performs duplicate notification refreshes'
);
assert(context.includes('Promise.allSettled') && !context.includes('getUnreadCount().catch(() => 0)'), 'unread count can still collapse to zero');
assert(context.includes('notificationRevision') && page.includes('lastRealtimeRevisionRef'), 'full notifications page is not Realtime synchronized');
assert(context.includes('authoritativeCount'), 'older notification reads do not reconcile unread count');
assert(
  page.includes('<article') &&
    page.includes('type="button"') &&
    page.includes('onClick={() => void handleItemNavigate(item)}'),
  'notification cards do not expose a native keyboard-operable action'
);
assert(
  page.includes('<Badge') &&
    page.includes('<Button'),
  'notification page is not reusing shared Badge/Button controls'
);
assert(
  dropdown.includes('<Badge') &&
    dropdown.includes('<Button') &&
    dropdown.includes('<article'),
  'notification dropdown is not reusing shared controls/native item semantics'
);
assert(
  utils.includes('/^\\/banners\\/?$/'),
  'notification route allowlist does not include Banner Management'
);
assert(utils.includes('/^\\/$/'), 'permission-aware root route is not allowlisted');
assert(page.includes("key: 'configuration'") && language.includes("configuration: 'Configuration'") && language.includes("configuration: 'কনফিগারেশন'"), 'configuration filter copy is incomplete');
assert(consistencyMigration.includes("p_category='configuration'") && consistencyMigration.includes("admin.created:personal:%"), 'consistency migration is incomplete');
assert(
  backfillMigration.includes("p_dedupe_key := 'complaint.submitted:' || v_row.id"),
  'missing-submission backfill is not idempotent'
);
assert(
  language.includes("Mark all notifications as read") &&
    language.includes("সব বিজ্ঞপ্তি পঠিত হিসেবে চিহ্নিত করুন"),
  'mark-all copy does not clearly describe the global action'
);
assert(
  !page.includes('text-[') && !dropdown.includes('text-['),
  'notification UI still contains arbitrary typography sizes'
);
assert(
  dropdown.includes('role="dialog"') && dropdown.includes('globalActionError'),
  'notification dropdown accessibility/error handling is incomplete'
);

if (!process.exitCode) {
  console.log('Notification center source audit passed');
}
