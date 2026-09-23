import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
const errors = [];

const requireMarkers = (relativePath, markers) => {
  const source = read(relativePath);
  for (const marker of markers) {
    if (!source.includes(marker)) {
      errors.push(`${relativePath}: missing global UX contract marker: ${marker}`);
    }
  }
  return source;
};

requireMarkers('src/components/ui/Input.tsx', [
  'useId',
  'aria-invalid',
  'aria-describedby',
  'role="alert"',
  'useLanguage',
]);

const selectSource = requireMarkers('src/components/ui/Select.tsx', [
  'useId',
  'aria-invalid',
  'aria-describedby',
  'role="alert"',
]);
if (/\bselected\b/.test(selectSource)) {
  errors.push('src/components/ui/Select.tsx: per-option selected attribute must not be used in React.');
}

requireMarkers('src/components/ui/Textarea.tsx', [
  'useId',
  'aria-invalid',
  'aria-describedby',
  'aria-live="polite"',
]);

requireMarkers('src/components/ui/Checkbox.tsx', [
  'defaultChecked = false',
  'isControlled',
  'setInternalChecked',
  'useId',
]);

requireMarkers('src/components/ui/Radio.tsx', [
  'defaultValue',
  'resolvedValue',
  'setInternalValue',
  'useId',
]);

requireMarkers('src/components/ui/Switch.tsx', [
  'defaultChecked = false',
  'isControlled',
  'aria-labelledby',
  'aria-describedby',
  'useLanguage',
]);

for (const relativePath of [
  'src/components/ui/Modal.tsx',
  'src/components/ui/Drawer.tsx',
]) {
  requireMarkers(relativePath, [
    'previousFocusRef',
    'querySelectorAll<HTMLElement>',
    'aria-labelledby',
    'aria-describedby',
    'window.addEventListener',
    'previousFocusRef.current?.focus()',
    'useLanguage',
  ]);
}

const languageSource = requireMarkers('src/context/LanguageContext.tsx', [
  'try {',
  'localStorage.getItem',
  'localStorage.setItem',
  'document.documentElement.lang',
]);

const routesSource = requireMarkers('src/routes/AppRoutes.tsx', [
  "lazy(() => import('@/pages/",
  'LocalizedLoadingState',
  'bn="ভিউ লোড হচ্ছে..."',
]);
if (routesSource.includes("from '@/pages'")) {
  errors.push('src/routes/AppRoutes.tsx: eager page barrel import reintroduced; route-level code splitting required.');
}

requireMarkers('src/components/layout/ThemeToggle.tsx', [
  'useLanguage',
  'রঙের থিম',
]);

requireMarkers('src/pages/Login/LoginPage.tsx', [
  'role="alert"',
  'role="status"',
  'aria-live="polite"',
  'সর্বস্বত্ব সংরক্ষিত',
]);

requireMarkers('src/components/common/LoadingState.tsx', [
  'useLanguage',
  'role="status"',
  'aria-live="polite"',
  'aria-busy="true"',
]);

requireMarkers('src/components/common/EmptyState.tsx', [
  'useLanguage',
  'কোনো তথ্য পাওয়া যায়নি',
]);

requireMarkers('src/components/ui/FeedbackNotice.tsx', [
  'useLanguage',
  'resolvedDismissLabel',
]);

requireMarkers('src/context/AuthContext.tsx', [
  'readExplicitSignout',
  'clearExplicitSignout',
  'markExplicitSignout',
  'window.localStorage',
]);

requireMarkers('src/utils/dropdownOptions.ts', [
  'sortLocalizedTextOptions',
  'localeCompare',
  'numeric: true',
]);

requireMarkers('src/components/categories/FormBuilderModal.tsx', [
  'privacySystemBlock',
  "'Show privacy options'",
  "'Reports created from news sources remain anonymous.'",
]);

requireMarkers('src/pages/Complaints/ComplaintDetailPage.tsx', [
  'https://shobaikejanao.com',
  'report-detail',
  'View Live Public Post',
  'noopener noreferrer',
]);

const pagesRoot = path.join(repoRoot, 'src/pages');
const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });

for (const filePath of walk(pagesRoot).filter((p) => /Page\.tsx$/.test(p))) {
  const relativePath = path.relative(repoRoot, filePath).replaceAll(path.sep, '/');
  const source = fs.readFileSync(filePath, 'utf8');
  if (!source.includes('useLanguage')) {
    errors.push(`${relativePath}: page does not participate in the EN/BN language system.`);
  }
}

if (errors.length > 0) {
  console.error('Global UX audit failed:\n');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Global UX audit passed: forms expose validation semantics, shared fallback states are localized, auth/browser-storage recovery is hardened, modal/drawer focus is managed, text-option sorting and live Public verification remain protected, all pages participate in EN/BN, and page routes remain lazy-loaded.');
