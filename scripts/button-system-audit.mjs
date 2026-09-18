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

const systemOwnedVisualToken =
  /(?:^|\s)(?:(?:dark|hover|active|focus|focus-visible|disabled):)*(?:h-(?!full\b|auto\b)[^\s"'\`}]+|min-h-[^\s"'\`}]+|p(?:x|y)?-[^\s"'\`}]+|text-(?:xs|sm|base|lg|xl|\[[^\]]+\]|slate-[^\s"'\`}]+|sky-[^\s"'\`}]+|red-[^\s"'\`}]+|rose-[^\s"'\`}]+|emerald-[^\s"'\`}]+|amber-[^\s"'\`}]+|indigo-[^\s"'\`}]+|cyan-[^\s"'\`}]+|purple-[^\s"'\`}]+|white\b|black\b)|bg-[^\s"'\`}]+|border(?:-[^\s"'\`}]+)?|rounded(?:-[^\s"'\`}]+)?|shadow(?:-[^\s"'\`}]+)?|font-(?:normal|medium|semibold|bold)|gap-[^\s"'\`}]+|ring-[^\s"'\`}]+|scale-[^\s"'\`}]+)/;

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
      const match = tag.match(systemOwnedVisualToken);
      if (match) {
        const preview = tag.replace(/\s+/g, ' ').slice(0, 180);
        errors.push(
          `${relativePath}: <${componentName}> overrides system-owned visual token "${match[0].trim()}": ${preview}`
        );
      }
    }
  }
}

const buttonSource = fs.readFileSync(path.join(repoRoot, nativeButtonOwner), 'utf8');

for (const required of [
  "type = 'button'",
  "sm: 'type-action-sm h-8",
  "md: 'type-action-sm h-10",
  "lg: 'type-action h-11",
  "data-button-system=\"button\"",
  "data-button-system=\"icon\"",
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

const primitiveFiles = [
  'src/components/ui/SegmentedControl.tsx',
  'src/components/ui/FilterChip.tsx',
];

for (const relativePath of primitiveFiles) {
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
  'Button system audit passed: native actions are centralized and shared buttons own their visual styling.'
);
