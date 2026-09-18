import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`Notification audit failed: ${message}`);
    process.exitCode = 1;
  }
};

const migration = read('supabase/migrations/20260918061006_notification_center_completion.sql');
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
assert(
  page.includes('role="button"') &&
    page.includes('tabIndex={0}') &&
    page.includes("event.key === 'Enter' || event.key === ' '"),
  'notification cards are not keyboard operable'
);
assert(
  utils.includes('/^\\/banners\\/?$/'),
  'notification route allowlist does not include Banner Management'
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
