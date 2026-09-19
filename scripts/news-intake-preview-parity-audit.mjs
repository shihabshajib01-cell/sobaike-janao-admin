import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const preview = read('src/pages/NewsIntake/FeedReadyReportPreview.tsx');

const errors = [];
const requireText = (needle, label) => {
  if (!preview.includes(needle)) errors.push(`${label}: missing ${needle}`);
};

for (const [needle, label] of [
  ['Public feed preview', 'public-card accessibility label'],
  ['safeBanglaFallback', 'Bangla location fail-closed behavior'],
  ['safeEnglishFallback', 'English location fail-closed behavior'],
  ['showGeneralLocation', 'public location preference'],
  ['showDescription', 'public description preference'],
  ['showSubjectName', 'public subject preference'],
  ['showOrganization', 'public organization preference'],
  ['recentBillAmount', 'utility bill public-card field'],
  ['previousBillAmount', 'utility previous-bill public-card field'],
  ['getPreviewPublishedTime', 'published-history relative time'],
  ['HeartHandshake', 'current harassment icon family'],
  ['ShieldAlert', 'current extortion icon family'],
  ['ShieldCheck', 'current public-safety icon family'],
  ['TrafficCone', 'current road/transport icon family'],
  ['ZapOff', 'current utility icon family'],
  ['border-[#CC9E9E] bg-[#E5CECF] text-[#722E2E]', 'current illegal-occupation light palette'],
  ['border-[#8CBDAA] bg-[#C6DED5] text-[#135C40]', 'current charging light palette'],
  ['dark:border-[#694052] dark:bg-[#2B1B21] dark:text-[#F0C4D2]', 'category dark palette'],
  ['dark:border-slate-800 dark:bg-slate-950', 'public-card dark surface'],
  ['MapPin', 'feed location affordance'],
  ['Eye', 'feed view affordance'],
  ['Share2', 'feed share affordance'],
  ['news-intake-publish-', 'per-card publish checkbox id'],
  ['publishable', 'publishability gating'],
]) {
  requireText(needle, label);
}

if (errors.length) {
  console.error('News Intake preview parity audit failed:\n');
  for (const error of errors) console.error('- ' + error);
  process.exit(1);
}

console.log(
  'News Intake preview parity audit passed: public-card structure, category visuals, language-safe location handling, dark mode, category-specific fields, and publish controls are protected.'
);
