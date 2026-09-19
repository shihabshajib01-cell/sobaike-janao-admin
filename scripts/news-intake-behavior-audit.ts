import assert from 'node:assert/strict';
import {
  buildIncidentContext,
  buildSourceLanguageFields,
  classifyArticle,
  findLocation,
  inferDistrictWideScope,
  inferIncidentDate,
  inferSpecificLocationPhrase,
  isUnsupportedArticleType,
} from '../supabase/functions/_shared/newsIntakeAutomationCore.ts';

const classificationCases: Array<[string, string, string]> = [
  ['rape-sexual-violence', 'ধর্ষণের অভিযোগে একজনকে গ্রেপ্তার করেছে পুলিশ', 'harassment'],
  ['rape-sexual-violence', '20-year-old gang-raped in Kushtia dies at RMCH after 4 days', 'harassment'],
  ['sexual-harassment', 'কর্মস্থলে যৌন হয়রানির অভিযোগ উঠেছে', 'harassment'],
  ['domestic-violence', 'স্ত্রীকে মারধরের অভিযোগে স্বামী আটক', 'harassment'],
  ['blackmail-coercion', 'ছবি ছড়িয়ে দেওয়ার ভয় দেখিয়ে ব্ল্যাকমেইল', 'harassment'],
  ['honeytrap', 'হানিট্র্যাপের ফাঁদে ফেলে অর্থ আদায়ের অভিযোগ', 'harassment'],
  ['load-shedding-outage', 'এলাকাজুড়ে দীর্ঘ সময় লোডশেডিং', 'load_shedding'],
  ['gas-shortage', 'গ্যাস সংকটে ভোগান্তিতে বাসিন্দারা', 'load_shedding'],
  ['excess-electricity-bill', 'অতিরিক্ত বিদ্যুৎ বিল পেয়ে গ্রাহকের অভিযোগ', 'load_shedding'],
  ['bribe-demanded-service', 'সেবা দিতে ঘুষ চাওয়ার অভিযোগ', 'extortion'],
  ['shop-business', 'দোকান ব্যবসায়ীর কাছে চাঁদা দাবি', 'extortion'],
  ['transport-movement', 'বাসচালকদের কাছ থেকে চাঁদাবাজির অভিযোগ', 'extortion'],
  ['construction-property', 'নির্মাণকাজ চালাতে ঠিকাদারের কাছে চাঁদা দাবি', 'extortion'],
  ['threat-money-demand', 'প্রাণনাশের হুমকি দিয়ে চাঁদা দাবি', 'extortion'],
  ['extortion-other', 'এলাকায় চাঁদাবাজির অভিযোগ', 'extortion'],
  ['theft', 'বাড়ি থেকে স্বর্ণালংকার চুরি হয়েছে', 'public_safety'],
  ['robbery', 'রাতে বাড়িতে ডাকাতির ঘটনা', 'public_safety'],
  ['snatching', 'রাস্তা থেকে মোবাইল ছিনতাই', 'public_safety'],
  ['mob-justice', 'চুরির সন্দেহে গণপিটুনিতে একজন নিহত', 'public_safety'],
  ['road-repair-delay', 'রাস্তা মেরামত কাজ দীর্ঘদিন ধরে বিলম্বিত', 'road_transport'],
  ['road-accident', 'বাস ও ট্রাকের সংঘর্ষে দুইজন নিহত', 'road_transport'],
  ['road-accident', 'বরিশালে নিয়ন্ত্রণ হারিয়ে বাস পুকুরে, একজনের লাশ উদ্ধার', 'road_transport'],
  ['snatching', 'একজন ছুরি ধরে আছেন, আরেকজন কাটছেন রিকশাযাত্রীর পকেট', 'public_safety'],
  ['road-block', 'দাবি আদায়ে সড়ক অবরোধ', 'road_transport'],
  ['road-public-space-encroachment', 'ফুটপাত দখল করে দোকান বসানোর অভিযোগ', 'illegal_occupation'],
  ['private-property-occupation', 'ব্যক্তিগত জমি দখলের অভিযোগ', 'illegal_occupation'],
  ['government-property-occupation', 'সরকারি জমি দখলের অভিযোগ', 'illegal_occupation'],
  ['charging-station-location', 'অবৈধ অটোরিকশা চার্জিং স্টেশন পরিচালনা', 'rickshaw'],
];

for (const [subcategoryId, text, segmentId] of classificationCases) {
  const result = classifyArticle(text);
  assert.ok(result, `Expected classification for ${subcategoryId}`);
  assert.equal(result?.subcategoryId, subcategoryId, `Wrong subcategory for: ${text}`);
  assert.equal(result?.segmentId, segmentId, `Wrong segment for: ${text}`);
}

assert.equal(
  classifyArticle('টিউবওয়েলের পানি নিয়ে বিরোধ, কিল-ঘুষিতে বৃদ্ধের মৃত্যু'),
  null,
  'Bangla word ঘুষিতে must not be treated as bribery'
);
assert.equal(
  classifyArticle('নেত্রকোণায় দুপক্ষের সংঘর্ষে আহত যুবকের মৃত্যু'),
  null,
  'Generic non-road সংঘর্ষ must not be classified as a road accident'
);
assert.equal(
  classifyArticle('Golam Porwar urges patience and restraint for Dhaka-Rangpur long march'),
  null,
  'Political programme headlines must not be treated as report incidents without incident keywords'
);
assert.equal(
  classifyArticle('ইতিহাসের বৃহত্তম শ্রম চুরি করেছে প্রতিষ্ঠান'),
  null,
  'Metaphorical or labor-rights theft wording must not be treated as public-safety theft'
);

assert.equal(
  inferIncidentDate('ঘটনাটি ১৮ সেপ্টেম্বর ২০২৬ সকালে ঘটে', '2026-09-19'),
  '2026-09-18',
  'Bangla named date must parse without regex errors'
);
assert.equal(
  inferIncidentDate('The incident happened 18 September 2026', '2026-09-19'),
  '2026-09-18',
  'English named date must parse'
);
assert.equal(
  inferIncidentDate('ঘটনাটি গতকাল ঘটে', '2026-09-19'),
  '2026-09-18',
  'Relative yesterday date must be source-date grounded'
);

assert.equal(
  inferIncidentDate('দুর্ঘটনাটি শুক্রবার রাতে ঘটে', '2026-09-19'),
  '2026-09-18',
  'Bangla weekday with a past-time cue must resolve against publication date'
);

assert.equal(
  inferIncidentDate(
    'শনিবার সকাল সাড়ে ৮টার দিকে সড়কের গড়িয়ারপাড় এলাকায় এ দুর্ঘটনা ঘটে বলে পুলিশ জানিয়েছে।',
    '2026-09-19'
  ),
  '2026-09-19',
  'Bangla weekday plus bare সকাল must resolve against same-day publication date'
);
assert.equal(
  inferIncidentDate('Police said the incident happened Thursday night', '2026-09-19'),
  '2026-09-17',
  'English weekday with a past-time cue must resolve against publication date'
);

assert.equal(
  inferIncidentDate(
    'প্রকাশ: ১৮ সেপ্টেম্বর ২০২৬। বৃহস্পতিবার (১৭ সেপ্টেম্বর) রাতে বরিশালের গৌরনদী উপজেলায় এ ঘটনা ঘটে।',
    '2026-09-18'
  ),
  '2026-09-17',
  'Incident-anchored date must win over page publication metadata'
);
assert.equal(
  inferIncidentDate(
    'ঘটনার ভিডিও আজ শনিবার সকালে সামাজিক যোগাযোগমাধ্যমে ছড়িয়ে পড়েছে। ঘটনাটি ঘটেছে চট্টগ্রামের কোতোয়ালি থানার পেছনের সতীশ বাবু লেনে।',
    '2026-09-19'
  ),
  null,
  'A circulation-date cue must not be promoted to the incident date'
);

assert.deepEqual(
  findLocation("Two killed in bus crash in Cox's Bazar"),
  { division: 'Chattogram', district: 'Coxs Bazar' },
  'Cox\'s Bazar alias must resolve'
);
assert.deepEqual(
  findLocation('Road crash leaves one dead in Comilla'),
  { division: 'Chattogram', district: 'Cumilla' },
  'Legacy English district spelling must resolve'
);

assert.equal(
  inferSpecificLocationPhrase('ঘটনাটি খুলনা মহানগরীর সোনাডাঙ্গা এলাকায় ঘটে', 'Khulna'),
  'খুলনা মহানগরীর সোনাডাঙ্গা এলাকা',
  'Specific Bangla area wording should be retained for report location'
);
assert.equal(
  inferSpecificLocationPhrase('The incident happened near Shah Ali Market in Dhaka', 'Dhaka'),
  'Shah Ali Market',
  'Specific English market wording should be retained for report location'
);

assert.equal(
  inferSpecificLocationPhrase(
    'ঘটনাটি ঘটেছে চট্টগ্রামের কোতোয়ালি থানার পেছনের সতীশ বাবু লেনে। বিষয়টি জানার পর আমরা এলাকা পরিদর্শন করি।',
    'Chattogram'
  ),
  'চট্টগ্রামের কোতোয়ালি থানার পেছনের সতীশ বাবু লেন',
  'Incident location must win over later narrative text ending in এলাকা'
);
assert.equal(
  inferDistrictWideScope('জেলাজুড়ে বিদ্যুৎ বিভ্রাটের অভিযোগ পাওয়া গেছে'),
  true,
  'Explicit Bangla district-wide scope should be recognized'
);

const englishFields = buildSourceLanguageFields(
  'Two killed in road crash',
  'Police said the crash happened on Thursday.',
  'en'
);
assert.equal(englishFields.titlePrimary, 'Two killed in road crash');
assert.equal(englishFields.titleEn, '', 'English content must not be duplicated into a second language field');
assert.equal(englishFields.descriptionEn, '', 'English description must not be duplicated');
assert.equal(englishFields.sourceLanguage, 'en');

const banglaFields = buildSourceLanguageFields(
  'সড়ক দুর্ঘটনায় দুইজন নিহত',
  'পুলিশ জানিয়েছে বৃহস্পতিবার দুর্ঘটনাটি ঘটে।',
  'bn'
);
assert.equal(banglaFields.titleEn, '');
assert.equal(banglaFields.descriptionEn, '');
assert.equal(banglaFields.sourceLanguage, 'bn');

const context = buildIncidentContext({
  excerpt: 'ঢাকার একটি সড়কে বাস ও ট্রাকের সংঘর্ষে দুইজন নিহত হয়েছেন।',
  body: 'ঢাকার একটি সড়কে বাস ও ট্রাকের সংঘর্ষে দুইজন নিহত হয়েছেন। পুলিশ ঘটনাস্থলে গেছে। আহত একজনকে হাসপাতালে নেওয়া হয়েছে। তদন্ত চলছে।',
});
assert.ok(context.length > 80, 'Incident context should be fuller than a one-line metadata snippet');
assert.ok(context.length <= 1800, 'Incident context must respect storage limits');

const repeatedContext = buildIncidentContext({
  excerpt: 'রাতের আঁধারে বসতঘরে ঢুকে এক গৃহবধূকে ধর্ষণের অভিযোগ পাওয়া গেছে। এ ঘটনায় পুলিশ একজনকে গ্রেপ্তার করেছে।',
  body: 'রাতের আঁধারে বসতঘরে ঢুকে এক গৃহবধূকে ধর্ষণের অভিযোগ পাওয়া গেছে। এ ঘটনায় পুলিশ একজনকে গ্রেপ্তার করেছে। বৃহস্পতিবার রাতে ঘটনাটি ঘটে।',
});
assert.equal(
  (repeatedContext.match(/রাতের আঁধারে বসতঘরে ঢুকে/g) || []).length,
  1,
  'Excerpt/body overlap must not duplicate the same incident sentence'
);

assert.equal(
  isUnsupportedArticleType('https://example.com/opinion/example', 'A column'),
  true,
  'Opinion pages must not enter automated incident creation'
);
assert.equal(
  isUnsupportedArticleType('https://example.com/bangladesh/road-crash-123', 'Two killed in road crash'),
  false,
  'Incident article path must remain eligible'
);

console.log(
  `News Intake behavior audit passed: ${classificationCases.length} published subcategory fixtures, date parsing, location grounding, source-language handling, context generation, and content filtering.`
);
