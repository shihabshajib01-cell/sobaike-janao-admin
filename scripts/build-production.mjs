import fs from 'node:fs';
import path from 'node:path';
import { build, createLogger } from 'vite';

const warnings = [];
const logger = createLogger('info', { allowClearScreen: false });
const originalWarn = logger.warn.bind(logger);

logger.warn = (message, options) => {
  warnings.push(String(message));
  originalWarn(message, options);
};

await build({ customLogger: logger });

const circularWarnings = warnings.filter((message) =>
  message.toLowerCase().includes('circular chunk')
);

if (circularWarnings.length > 0) {
  console.error('\nProduction build rejected circular manual chunks:');
  for (const warning of circularWarnings) console.error('- ' + warning);
  process.exit(1);
}

const distRoot = path.resolve('dist');
const sourceMaps = [];

const walk = (dir) => {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath);
    else if (entry.name.endsWith('.map')) sourceMaps.push(path.relative(distRoot, fullPath));
  }
};

walk(distRoot);

if (sourceMaps.length > 0) {
  console.error('\nProduction build unexpectedly contains source maps:');
  for (const file of sourceMaps) console.error('- ' + file);
  process.exit(1);
}

console.log('Admin production build audit passed: no circular chunks and no deployed source maps.');
