import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcDir = path.join(root, 'src');

const sourceFiles = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (/\.(tsx|ts|css)$/.test(entry.name)) {
      sourceFiles.push(full);
    }
  }
};
walk(srcDir);

const violations = [];
const arbitraryPixelText = /text-\[(\d+(?:\.\d+)?)px\]/g;
const inlineFontSize = /fontSize\s*:/g;

for (const file of sourceFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const rel = path.relative(root, file).replaceAll('\\', '/');

  for (const match of content.matchAll(arbitraryPixelText)) {
    violations.push(`${rel}: arbitrary pixel text size ${match[0]}`);
  }

  for (const match of content.matchAll(inlineFontSize)) {
    violations.push(`${rel}: inline fontSize declaration`);
  }
}

const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const font of ['Noto+Sans+Bengali', 'family=Noto+Sans']) {
  if (!indexHtml.includes(font)) {
    violations.push(`index.html: missing unified font load marker "${font}"`);
  }
}

const baseCss = fs.readFileSync(path.join(srcDir, 'styles', 'base.css'), 'utf8');
for (const token of [
  '--font-ui',
  '--type-page-title-size',
  '--type-section-title-size',
  '--type-card-title-size',
  '--type-body-size',
  '--type-small-size',
  '--type-technical-size',
  '--type-badge-sm-size',
  '.type-page-title',
  '.type-section-title',
  '.type-card-title',
  '.type-body',
  '.type-meta',
  '.type-technical',
]) {
  if (!baseCss.includes(token)) {
    violations.push(`src/styles/base.css: missing typography contract token "${token}"`);
  }
}

const indexCss = fs.readFileSync(path.join(srcDir, 'index.css'), 'utf8');
for (const mapping of [
  '--text-xs: var(--type-small-size)',
  '--text-sm: var(--type-body-size)',
  '--text-base: var(--type-body-size)',
  '--text-lg: var(--type-card-title-size)',
  '--text-xl: var(--type-section-title-size)',
  '--text-2xl: var(--type-page-title-size)',
  '--text-3xl: var(--type-display-size)',
]) {
  if (!indexCss.includes(mapping)) {
    violations.push(`src/index.css: missing Tailwind typography mapping "${mapping}"`);
  }
}

if (violations.length > 0) {
  console.error('Typography system audit failed:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log(
  `Typography system audit passed: ${sourceFiles.length} source files checked, no arbitrary pixel text sizes or inline font sizes found.`
);
