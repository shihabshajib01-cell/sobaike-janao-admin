import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = path.join(repoRoot, 'src');

const normalize = (filePath) => path.relative(repoRoot, filePath).replaceAll(path.sep, '/');

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });

const sourceFiles = walk(srcRoot).filter((filePath) => /\.(tsx|ts|css)$/.test(filePath));
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
const errors = [];

const tablePrimitive = 'src/components/ui/Table.tsx';

for (const filePath of sourceFiles) {
  const relativePath = normalize(filePath);
  const content = fs.readFileSync(filePath, 'utf8');

  if (
    relativePath.endsWith('.tsx') &&
    relativePath !== tablePrimitive &&
    /<table(?:\s|>)/.test(content)
  ) {
    errors.push(`${relativePath}: raw <table> markup is not allowed; use the shared Table primitives.`);
  }

  if (/\b(?:min|max)-(?=["'`\s>])/.test(content)) {
    errors.push(`${relativePath}: malformed min-/max- utility detected.`);
  }
}

const responsiveHosts = [
  'src/pages/Complaints/ComplaintsPage.tsx',
  'src/pages/Roles/RolesPage.tsx',
  'src/pages/LocationActivity/LocationActivityPage.tsx',
  'src/components/users/UsersTable.tsx',
  'src/components/activityLog/ActivityLogTable.tsx',
  'src/pages/Responses/components/ResponseTable.tsx',
  'src/components/categories/TaxonomyTree.tsx',
  'src/components/dashboard/CategoryPopularitySummary.tsx',
  'src/components/dashboard/RecentComplaints.tsx',
];

for (const relativePath of responsiveHosts) {
  const content = read(relativePath);

  if (!content.includes('ResponsiveDataView')) {
    errors.push(`${relativePath}: missing ResponsiveDataView table/card switching.`);
  }

  if (/hidden\s+(?:md|lg):block|(?:md|lg):hidden/.test(content)) {
    errors.push(`${relativePath}: viewport-only table/card switching detected.`);
  }
}

const sharedTableSurfaces = [
  'src/components/complaints/ComplaintTable.tsx',
  'src/components/roles/RoleTable.tsx',
  'src/components/locationActivity/LocationActivityTable.tsx',
  'src/components/users/UsersTable.tsx',
  'src/components/activityLog/ActivityLogTable.tsx',
  'src/pages/Responses/components/ResponseTable.tsx',
  'src/components/categories/TaxonomyTree.tsx',
  'src/components/dashboard/CategoryPopularitySummary.tsx',
  'src/components/dashboard/RecentComplaints.tsx',
];

for (const relativePath of sharedTableSurfaces) {
  const content = read(relativePath);
  if (!content.includes("from '@/components/ui/Table'")) {
    errors.push(`${relativePath}: does not use the shared Table component system.`);
  }
}

const responsiveView = read('src/components/ui/ResponsiveDataView.tsx');
if (!responsiveView.includes('ResizeObserver') || !responsiveView.includes('table.scrollWidth')) {
  errors.push('ResponsiveDataView must measure actual table fit with ResizeObserver + scrollWidth.');
}

const baseCss = read('src/styles/base.css');
if (baseCss.includes('@container admin-data-view') || baseCss.includes('max-width: 56rem')) {
  errors.push('src/styles/base.css: fixed responsive-table breakpoint has been reintroduced.');
}

const tableSource = read(tablePrimitive);
if (!tableSource.includes('w-max min-w-full')) {
  errors.push(`${tablePrimitive}: table must retain natural content width for fit measurement.`);
}

const adminLayout = read('src/components/layout/AdminLayout.tsx');
if (/main[^\n]*max-w-7xl/.test(adminLayout)) {
  errors.push('src/components/layout/AdminLayout.tsx: admin main content is capped at max-w-7xl.');
}

if (errors.length > 0) {
  console.error('Responsive table audit failed:\n');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Responsive table audit passed: ${sharedTableSurfaces.length} table surfaces use the shared system and ${responsiveHosts.length} responsive hosts are protected.`
);
