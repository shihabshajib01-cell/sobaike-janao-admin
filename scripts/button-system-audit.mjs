import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = path.join(repoRoot, 'src');
const nativeButtonOwner = 'src/components/ui/Button.tsx';

const normalize = (filePath) =>
  path.relative(repoRoot, filePath).replaceAll(path.sep, '/');

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });

const sourceFiles = walk(srcRoot).filter((filePath) => /\.(tsx|ts)$/.test(filePath));
const errors = [];

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

const isSystemOwnedVisualToken = (token) => {
  const base = token.trim().split(':').pop();
  if (!base) return false;

  if (/^h-(?!full$|auto$)/.test(base)) return true;
  if (/^(?:min|max)-h-/.test(base)) return true;
  if (/^w-(?!full$|auto$|fit$|max$|min$)/.test(base)) return true;
  if (/^p(?:x|y|t|r|b|l)?-/.test(base)) return true;
  if (/^bg-/.test(base)) return true;
  if (/^border(?:-|$)/.test(base)) return true;
  if (/^rounded(?:-|$)/.test(base)) return true;
  if (/^shadow(?:-|$)/.test(base)) return true;
  if (/^font-(?:normal|medium|semibold|bold)$/.test(base)) return true;
  if (/^gap-/.test(base)) return true;
  if (/^ring(?:-|$)/.test(base)) return true;
  if (/^scale-/.test(base)) return true;
  if (/^m[lr]-(?!auto$)/.test(base)) return true;

  if (/^text-(?:xs|sm|base|lg|xl|\[.*\])$/.test(base)) return true;
  if (
    /^text-(?:slate|sky|red|rose|emerald|amber|indigo|cyan|purple|green|gray|zinc|neutral|stone)-/.test(
      base
    )
  ) {
    return true;
  }
  if (/^text-(?:white|black)$/.test(base)) return true;

  return false;
};

const getVisualTokens = (tag) => {
  const tokens = [];

  for (const match of tag.matchAll(/(["'`])([\s\S]*?)\1/g)) {
    const body = match[2];
    for (const token of body.split(/\s+/)) {
      if (isSystemOwnedVisualToken(token)) tokens.push(token);
    }
  }

  return [...new Set(tokens)];
};

for (const filePath of sourceFiles) {
  const relativePath = normalize(filePath);
  const source = fs.readFileSync(filePath, 'utf8');

  if (relativePath !== nativeButtonOwner && /<button(?:\s|>)/.test(source)) {
    errors.push(
      `${relativePath}: native <button> detected outside the unified button primitive.`
    );
  }

  for (const componentName of ['Button', 'IconButton']) {
    const tags = findOpeningTags(source, componentName);

    for (const tag of tags) {
      const visualTokens = getVisualTokens(tag);
      if (visualTokens.length > 0) {
        const preview = tag.replace(/\s+/g, ' ').slice(0, 220);
        errors.push(
          `${relativePath}: <${componentName}> overrides system-owned visual tokens [${visualTokens.join(
            ', '
          )}]: ${preview}`
        );
      }
    }
  }

  const buttonBlocks = source.matchAll(/<Button\b[\s\S]*?>([\s\S]*?)<\/Button>/g);
  for (const match of buttonBlocks) {
    const body = match[1]
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
      .trim();

    if (/^<[A-Z][A-Za-z0-9_]*(?:\s[\s\S]*?)?\/>$/.test(body)) {
      errors.push(
        `${relativePath}: icon-only <Button> detected. Use <IconButton> for icon-only actions.`
      );
    }
  }
}

const buttonSource = fs.readFileSync(path.join(repoRoot, nativeButtonOwner), 'utf8');

for (const required of [
  "type = 'button'",
  "sm: 'type-action-sm h-8",
  "md: 'type-action-sm h-10",
  "lg: 'type-action h-11",
  'data-button-system="button"',
  'data-button-system="icon"',
]) {
  if (!buttonSource.includes(required)) {
    errors.push(`${nativeButtonOwner}: required system contract missing: ${required}`);
  }
}

for (const requiredVariant of [
  "'primary'",
  "'secondary'",
  "'ghost'",
  "'danger'",
  "'success'",
  "'link'",
]) {
  if (!buttonSource.includes(requiredVariant)) {
    errors.push(
      `${nativeButtonOwner}: missing required variant ${requiredVariant}.`
    );
  }
}

for (const relativePath of [
  'src/components/ui/SegmentedControl.tsx',
  'src/components/ui/FilterChip.tsx',
]) {
  if (!fs.existsSync(path.join(repoRoot, relativePath))) {
    errors.push(`${relativePath}: required button-system primitive is missing.`);
  }
}

if (errors.length > 0) {
  console.error('Button system audit failed:\n');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  'Button system audit passed: native actions are centralized, icon-only actions use IconButton, and shared buttons own their visual styling.'
);
