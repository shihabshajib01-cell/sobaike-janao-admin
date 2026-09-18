import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const errors = [];

const selectorPath = 'src/components/ui/TablePageSizeSelect.tsx';
if (!fs.existsSync(path.join(repoRoot, selectorPath))) {
  errors.push(`${selectorPath}: shared rows-per-page selector is missing.`);
} else {
  const source = read(selectorPath);
  for (const required of [
    'Rows per page',
    "options = [10, 20, 50]",
    'onChange(nextValue)',
  ]) {
    if (!source.includes(required)) {
      errors.push(`${selectorPath}: missing selector contract "${required}".`);
    }
  }
}

const paginatedPages = [
  'src/pages/Complaints/ComplaintsPage.tsx',
  'src/pages/Users/UsersPage.tsx',
  'src/pages/ActivityLog/ActivityLogPage.tsx',
  'src/pages/LocationActivity/LocationActivityPage.tsx',
  'src/pages/Responses/ResponsesPage.tsx',
];

for (const relativePath of paginatedPages) {
  const source = read(relativePath);

  if (!source.includes('TablePageSizeSelect')) {
    errors.push(`${relativePath}: missing shared rows-per-page selector.`);
  }

  if (!source.includes('handlePageSizeChange')) {
    errors.push(`${relativePath}: missing page-size change handler.`);
  }
}

for (const relativePath of [
  'src/pages/Users/UsersPage.tsx',
  'src/pages/ActivityLog/ActivityLogPage.tsx',
  'src/pages/LocationActivity/LocationActivityPage.tsx',
]) {
  const source = read(relativePath);
  if (!source.includes('setPage(1)')) {
    errors.push(`${relativePath}: page-size/filter flow must be able to reset to page 1.`);
  }
}

const complaintsSource = read('src/pages/Complaints/ComplaintsPage.tsx');
if (!complaintsSource.includes('pageSize: newPageSize')) {
  errors.push('ComplaintsPage: page size is not written back into pagination state.');
}

const responsesSource = read('src/pages/Responses/ResponsesPage.tsx');
if (/getResponses\([^\n]*,\s*20\s*\)/.test(responsesSource)) {
  errors.push('ResponsesPage: hard-coded 20-row fetch limit detected.');
}
if (!responsesSource.includes('limit: newPageSize')) {
  errors.push('ResponsesPage: page size is not written back into pagination state.');
}

if (errors.length > 0) {
  console.error('Table page-size audit failed:\n');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Table page-size audit passed: ${paginatedPages.length} paginated management tables use the shared rows-per-page selector.`
);
