import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = path.join(repoRoot, 'src');

const normalize = (filePath) =>
  path.relative(repoRoot, filePath).replaceAll(path.sep, '/');

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });

const sourceFiles = walk(srcRoot).filter((filePath) => filePath.endsWith('.tsx'));
const errors = [];

const primitiveFiles = new Set([
  'src/components/ui/Badge.tsx',
  'src/components/ui/Tag.tsx',
  'src/components/ui/FilterChip.tsx',
  'src/components/ui/FeedbackNotice.tsx',
]);

const findOpeningTags = (source, componentName) => {
  const tags = [];
  const needle = `<${componentName}`;
  let cursor = 0;

  while (cursor < source.length) {
    const start = source.indexOf(needle, cursor);
    if (start === -1) break;

    const next = source[start + needle.length];
    if (next && /[A-Za-z0-9_]/.test(next)) {
      cursor = start + needle.length;
      continue;
    }

    let quote = null;
    let escaped = false;
    let braceDepth = 0;
    let end = start + needle.length;

    for (; end < source.length; end += 1) {
      const char = source[end];

      if (quote) {
        if (escaped) {
          escaped = false;
        } else if (char === '\\') {
          escaped = true;
        } else if (char === quote) {
          quote = null;
        }
        continue;
      }

      if (char === '"' || char === "'" || char === '`') {
        quote = char;
        continue;
      }

      if (char === '{') {
        braceDepth += 1;
        continue;
      }

      if (char === '}') {
        braceDepth = Math.max(0, braceDepth - 1);
        continue;
      }

      if (char === '>' && braceDepth === 0) {
        tags.push(source.slice(start, end + 1));
        cursor = end + 1;
        break;
      }
    }

    if (end >= source.length) break;
  }

  return tags;
};

const getClassBodies = (tag) =>
  [...tag.matchAll(/className=(["'`])([\s\S]*?)\1/g)].map((match) => match[2]);

const visualOverride = (token) => {
  const base = token.trim().split(':').pop();
  if (!base) return false;

  if (/^p(?:x|y|t|r|b|l)?-/.test(base)) return true;
  if (/^(?:min-)?h-/.test(base)) return true;
  if (/^bg-/.test(base)) return true;
  if (/^border(?:-|$)/.test(base)) return true;
  if (/^rounded(?:-|$)/.test(base)) return true;
  if (/^shadow(?:-|$)/.test(base)) return true;
  if (/^text-(?:xs|sm|base|lg|xl|\[.*\])$/.test(base)) return true;
  if (
    /^text-(?:slate|sky|red|rose|emerald|amber|indigo|cyan|purple|violet|green|gray|zinc|neutral|stone)-/.test(
      base
    )
  ) {
    return true;
  }
  if (/^text-(?:white|black)$/.test(base)) return true;
  if (/^font-(?:normal|medium|semibold|bold)$/.test(base)) return true;

  return false;
};

for (const filePath of sourceFiles) {
  const relativePath = normalize(filePath);
  const source = fs.readFileSync(filePath, 'utf8');

  if (!primitiveFiles.has(relativePath)) {
    for (const match of source.matchAll(/<span\b[\s\S]*?className=(["'`])([\s\S]*?)\1[\s\S]*?>/g)) {
      const className = match[2];
      const looksLikeSemanticPill =
        className.includes('rounded-full') &&
        /(?:^|\s)px-/.test(className) &&
        /(?:^|\s)(?:bg-|border)/.test(className) &&
        !className.includes('absolute');

      if (looksLikeSemanticPill) {
        errors.push(
          `${relativePath}: raw semantic pill detected; use Badge, Tag or FilterChip instead: ${className.slice(
            0,
            180
          )}`
        );
      }
    }
  }

  for (const componentName of ['Badge', 'Tag', 'MetaTag', 'FeedbackNotice']) {
    for (const tag of findOpeningTags(source, componentName)) {
      const badTokens = getClassBodies(tag)
        .flatMap((body) => body.split(/\s+/))
        .filter(visualOverride);

      if (badTokens.length > 0) {
        errors.push(
          `${relativePath}: <${componentName}> overrides system-owned visual tokens [${[
            ...new Set(badTokens),
          ].join(', ')}].`
        );
      }
    }
  }
}

for (const requiredPath of [
  'src/components/ui/Badge.tsx',
  'src/components/ui/Tag.tsx',
  'src/components/ui/FilterChip.tsx',
  'src/components/ui/FeedbackNotice.tsx',
]) {
  if (!fs.existsSync(path.join(repoRoot, requiredPath))) {
    errors.push(`${requiredPath}: required semantic-feedback primitive is missing.`);
  }
}

const complaintInfo = fs.readFileSync(
  path.join(repoRoot, 'src/components/complaints/ComplaintInfoSection.tsx'),
  'utf8'
);
if (
  !complaintInfo.includes('Submission Language: Bengali') ||
  !complaintInfo.includes('<Tag')
) {
  errors.push(
    'ComplaintInfoSection: submission-language metadata must use the shared Tag component.'
  );
}

if (errors.length > 0) {
  console.error('Tag / feedback system audit failed:\n');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  'Tag / feedback system audit passed: semantic statuses, metadata tags and feedback notices use shared primitives.'
);
