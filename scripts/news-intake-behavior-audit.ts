import assert from 'node:assert/strict';
import {
  buildIncidentContext,
  buildIncidentFocusedLocationText,
  buildSourceLanguageFields,
  classifyArticle,
  findLocation,
  inferDistrictWideScope,
  inferIncidentDate,
  inferSpecificLocationPhrase,
  isKnownPublisherArticlePath,
  isLegalFollowUpOnly,
  isLikelyForeignIncident,
  isNonIncidentHeadline,
  isSubstantiveIncidentContext,
  isUnsupportedArticleType,
} from '../supabase/functions/_shared/newsIntakeAutomationCore.ts';

// Munshiganj incident-focused location regression: residence/hospital destinations
// must not outrank the actual crash location.
const munshiganjFocusedLocation = buildIncidentFocusedLocationText({
  title: 'মুন্সীগঞ্জে বাস-প্রাইভেটকার সংঘর্ষে নিহত ৪',
  excerpt: 'গজারিয়া উপজেলার জামালদি বাসস্ট্যান্ড এলাকায় এ দুর্ঘটনা ঘটে।',
  body: 'শুক্রবার দুপুর ২টা ৩৮ মিনিটে গজারিয়া উপজেলার জামালদি বাসস্ট্যান্ড এলাকায় এ দুর্ঘটনা ঘটে। নিহতরা ঢাকার বাসিন্দা। একজন আহত ব্যক্তিকে ঢাকা মেডিকেল কলেজ হাসপাতালে নেওয়া হয়।',
});
assert.match(
  munshiganjFocusedLocation,
  /মুন্সীগঞ্জ|গজারিয়া|জামালদি/u,
  'Incident-focused location text must retain the crash location'
);
assert.doesNotMatch(
  munshiganjFocusedLocation,
  /ঢাকা মেডিকেল|ঢাকার বাসিন্দা/u,
  'Residence and hospital-transfer locations must be excluded when incident-location evidence exists'
);

assert.equal(
  isLikelyForeignIncident(
    'BMW crashes into 4 pedestrians in Mumbai, killing three',
    'https://example.com/world/mumbai-crash',
    'The incident happened in Mumbai, India.'
  ),
  true,
  'Clear foreign incidents must be excluded from the Bangladesh reporting feed'
);
assert.equal(
  isLikelyForeignIncident(
    'অপ্রতিম হত্যার বিচার দাবিতে ঢাকা-চট্টগ্রাম মহাসড়ক অবরোধ',
    'https://example.com/bangladesh/cumilla-road-block',
    'কুমিল্লার কোটবাড়ি এলাকায় ঢাকা-চট্টগ্রাম মহাসড়ক অবরোধ করেন শিক্ষার্থীরা।'
  ),
  false,
  'A Bangladesh incident must not be excluded because a highway name contains Dhaka and Chattogram'
);

assert.equal(
  isNonIncidentHeadline('৩০ সেপ্টেম্বরের পর অনির্দিষ্টকালের ধর্মঘটের হুঁশিয়ারি বাল্কহেড মালিকদের'),
  true,
  'Future strike warnings must be excluded before category matching even if the article mentions robbery prevention'
);


assert.equal(
  isLegalFollowUpOnly('প্রধানমন্ত্রীর লাল টেলিফোনের তার চুরি: সেই রঞ্জনের জামিন বাতিল'),
  true,
  'Court/bail follow-up headlines about older incidents must not create a fresh incident report'
);
assert.equal(
  isLegalFollowUpOnly('সাতকানিয়ায় ট্রেনের ধাক্কায় নিহত ২'),
  false,
  'A current incident headline must not be rejected as a legal follow-up'
);

assert.equal(
  isSubstantiveIncidentContext(
    'সাতকানিয়ায় ট্রেনের ধাক্কায় নিহত ২',
    'সাতকানিয়ায় ট্রেনের ধাক্কায় নিহত ২'
  ),
  false,
  'Title-only extraction must never become Feed Ready'
);
assert.equal(
  isSubstantiveIncidentContext(
    'ছিনতাই: একজনের হাতে ছুরি, আরেকজন রিকশাযাত্রীর পকেট কাটল',
    'চট্টগ্রাম নগরীর কোতোয়ালী থানার অদূরে সতীশ বাবু লেইনে এক রিকশাআরোহীকে ছুরি দেখিয়ে তার জিনিসপত্র কেড়ে নেয় দুই ছিনতাইকারী। ঘটনার ভিডিও শনিবার সকাল থেকে সামাজিক যোগাযোগমাধ্যমে ছড়িয়ে পড়ে এবং পুলিশ জড়িতদের ধরতে কাজ করছে।'
  ),
  true,
  'A substantive multi-sentence incident context must remain eligible'
);

assert.equal(
  classifyArticle("Police recover iPhone stolen from Apratim from detained Tuhin's home"),
  null,
  'Evidence recovery during a murder investigation must not become a standalone theft report'
);

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
  ['child_abduction_murder', 'ঢাকায় ৮ বছরের শিশু অপহরণের অভিযোগ, তদন্তে পুলিশ', 'public_safety'],
  ['child_abduction_murder', 'কিশোরীকে অপহরণের পর হত্যা, মরদেহ উদ্ধার', 'public_safety'],
  ['child_abduction_murder', 'Child abducted from home; police begin investigation', 'public_safety'],
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


const theftAccusationBn = classifyArticle(
  '‘ভাত চুরির’ অপবাদে বিশ্ববিদ্যালয় ছাত্রকে খুন: চারজনের বিরুদ্ধে মামলা'
);
assert.equal(
  theftAccusationBn?.subcategoryId,
  'mob-justice',
  'Theft-accusation violence must not fall through to the broad theft rule'
);
assert.equal(
  theftAccusationBn?.reviewReason,
  undefined,
  'Approved-source theft-accusation violence must resolve to the primary mob-justice incident without a manual-review state'
);

const theftAccusationEn = classifyArticle(
  'Khulna student ‘beaten to death’ over ‘stolen meal’'
);
assert.equal(
  theftAccusationEn?.subcategoryId,
  'mob-justice',
  'English theft-accusation violence must not be published as theft'
);
assert.equal(
  theftAccusationEn?.reviewReason,
  undefined,
  'Approved-source English theft-accusation violence must resolve without an ambiguity review state'
);

assert.equal(
  classifyArticle('বরিশালে পুলিশকে পিটিয়ে ‘মাদক কারবারি’ ছিনতাই, পরে বাবা-ছেলে গ্রেপ্তার'),
  null,
  'Taking a detainee/suspect from police must not be classified as property snatching'
);

assert.equal(
  classifyArticle('ছিনতাই: একজনের হাতে ছুরি, আরেকজন রিকশাযাত্রীর পকেট কাটল')?.subcategoryId,
  'snatching',
  'Real property-snatching headlines must remain classified as snatching'
);

assert.equal(
  classifyArticle('শিশু অপহরণের অভিযোগে গণপিটুনিতে একজন নিহত')?.subcategoryId,
  'mob-justice',
  'Mob violence triggered by a child-abduction allegation must remain mob-justice'
);

assert.equal(
  classifyArticle('School bus crash kills a 10-year-old child')?.subcategoryId,
  'road-accident',
  'Child fatality in a road crash must remain a road-accident report'
);

assert.equal(
  classifyArticle('শিশুর মুখে বিষ ঢেলে হত্যাচেষ্টার অভিযোগ, মা আটক'),
  null,
  'Attempted child murder without abduction or a reported death must not be published as Child Abduction / Murder'
);
assert.equal(
  classifyArticle('শিশুকে অপহরণের পর হত্যাচেষ্টা, পুলিশ উদ্ধার করেছে')?.subcategoryId,
  'child_abduction_murder',
  'An abduction remains in Child Abduction / Murder even if the later killing was only attempted'
);
assert.equal(
  classifyArticle('শিশুকে হত্যার চেষ্টা, পরে হাসপাতালে মৃত্যু')?.subcategoryId,
  'child_abduction_murder',
  'A reported death after an attempted killing must remain a child murder report'
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

assert.equal(
  inferIncidentDate(
    'শনিবার (১৯ সেপ্টেম্বর) দিবাগত রাতে নিহতদের পরিচয় নিশ্চিত করেছে পুলিশ। এরআগে, রাত ১১টা ৪০ মিনিটের দিকে পটুয়াখালী সদর উপজেলার বসাক বাজারসংলগ্ন ধলু গাজীর মোড় এলাকায় এ দুর্ঘটনা ঘটে।',
    '2026-09-19'
  ),
  '2026-09-19',
  'An earlier incident sentence may inherit the immediately preceding factual date'
);

assert.equal(
  inferIncidentDate(
    'প্রকাশ: ১৯ সেপ্টেম্বর ২০২৬। এর আগে রাত ১১টা ৪০ মিনিটের দিকে এ দুর্ঘটনা ঘটে।',
    '2026-09-19'
  ),
  null,
  'Publication metadata must never be inherited as the incident date'
);


assert.equal(
  inferIncidentDate(
    'The toddler was abducted on September 17 and rescued within six hours.',
    '2026-09-20'
  ),
  '2026-09-17',
  'English month-first incident dates must resolve'
);

assert.equal(
  inferIncidentDate(
    'গত শুক্রবার বিকেলে বাসা থেকে বের হওয়ার পর ১৩ বছরের কিশোরটি নিখোঁজ হয়। পরে তার মরদেহ উদ্ধার করা হয়।',
    '2026-09-20'
  ),
  '2026-09-18',
  'Missing-person incident wording with a Bangla relative weekday must ground the incident date'
);

assert.equal(
  inferIncidentDate(
    'রোববার (২০ সেপ্টেম্বর) বেলা সাড়ে ১১টার দিকে ঢাকা-চট্টগ্রাম মহাসড়কের কুমিল্লার কোটবাড়ি এলাকায় শিক্ষার্থীরা সড়ক অবরোধ করেন।',
    '2026-09-20'
  ),
  '2026-09-20',
  'Explicit same-day event dates must not be discarded as publication metadata'
);

assert.equal(
  inferIncidentDate(
    'রোববার বেলা সোয়া ১১টার দিকে কুমিল্লার কোটবাড়ি বিশ্বরোড এলাকায় অবরোধ শুরু করেন তারা।',
    '2026-09-20'
  ),
  '2026-09-20',
  'Same-day Bangla weekday plus বেলা must resolve to the publication day'
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

assert.deepEqual(
  findLocation('ঢাকা-চট্টগ্রাম মহাসড়কের কুমিল্লার কোটবাড়ি এলাকায় শিক্ষার্থীরা সড়ক অবরোধ করেন'),
  { division: 'Chattogram', district: 'Cumilla' },
  'Incident district context must beat highway endpoint names'
);

assert.deepEqual(
  findLocation('রোববার বেলা সোয়া ১১টার দিকে কুমিল্লার কোটবাড়ি বিশ্বরোড এলাকায় অবরোধ শুরু করেন তারা। এতে ঢাকা-চট্টগ্রাম মহাসড়কের উভয় পাশে যানজট হয়।'),
  { division: 'Chattogram', district: 'Cumilla' },
  'Exact production road-block wording must ground Cumilla instead of the Dhaka highway endpoint'
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
  inferSpecificLocationPhrase(
    'According to the complaint, a motorcycle waylaid Toma at Gopalnagar around 9pm on Thursday and picked her up at an abandoned place when she was returning home.',
    'Kushtia'
  ),
  'Gopalnagar',
  'Bare proper incident place after at must be retained'
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

const nearDuplicateContext = buildIncidentContext({
  excerpt: 'According to the complaint, a motorcycle waylaid Toma at Gopalnagar around 9pm on Thursday and picked her up at an abandoned place when she was returning to her home in Fakirabad Bakshipara.',
  body: 'A 20-year-old girl who was reportedly raped by four people on Thursday (17 September). According to the complaint, a motorcycle waylaid Toma at Gopalnagar around 9pm on Thursday and picked her up to an abandoned place when she was returning to her home in Fakirabad Bakshipara.',
});
assert.equal(
  (nearDuplicateContext.match(/motorcycle waylaid Toma/g) || []).length,
  1,
  'Near-identical excerpt/body incident sentences must not be repeated'
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

assert.equal(
  isKnownPublisherArticlePath('https://www.banglanews24.com/saradesh/news/bd/1681593.details'),
  true,
  'Banglanews final-detail article paths must be recognized even without semantic article wrappers'
);
assert.equal(
  isKnownPublisherArticlePath('https://www.banglanews24.com/saradesh/'),
  false,
  'Banglanews section paths must never receive the final-detail article fallback'
);

console.log(
  `News Intake behavior audit passed: ${classificationCases.length} published subcategory fixtures plus production false-positive regressions, date parsing, location grounding, source-language handling, context generation, and content filtering.`
);
