export const clip = (value: unknown, max: number) => {
  const text = String(value ?? '').trim();
  if (text.length <= max) return text;
  return text.slice(0, Math.max(0, max - 1)).trimEnd() + '…';
};

export const normalizeText = (value: unknown) =>
  String(value ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

export const detectLanguage = (value: unknown) => {
  const text = String(value ?? '');
  const bn = (text.match(/[\u0980-\u09FF]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  if (bn > latin * 1.5 && bn > 8) return 'bn';
  if (latin > bn * 1.5 && latin > 8) return 'en';
  if (bn > 8 && latin > 8) return 'mixed';
  return 'unknown';
};

export const MAX_ARTICLE_AGE_DAYS = 7;

export const isUnsupportedArticleType = (url: string, title: string) => {
  let path = '';
  try {
    path = new URL(url).pathname.toLowerCase();
  } catch {}
  const text = normalizeText(title);
  return /(\/opinion(?:\/|$)|\/editorials?(?:\/|$)|\/analysis(?:\/|$)|\/features?(?:\/|$)|\/lifestyle(?:\/|$)|\/sports?(?:\/|$)|\/cricket(?:\/|$)|\/entertainment(?:\/|$)|\/photo(?:\/|$)|\/videos?(?:\/|$)|\/m\/video(?:\/|$)|\/multimedia(?:\/|$)|\/star-multimedia(?:\/|$))/i.test(path)
    || /(সম্পাদকীয়|মতামত|বিশ্লেষণ|কলাম|ফিচার|opinion|editorial|analysis|feature)/iu.test(text);
};

export const articleAgeDays = (publishedDate?: string | null) => {
  if (!publishedDate) return null;
  const published = new Date(`${publishedDate}T00:00:00Z`);
  if (Number.isNaN(published.getTime())) return null;
  return Math.floor((Date.now() - published.getTime()) / 86400000);
};

export type Classification = {
  segmentId: string;
  subcategoryId: string;
  confidence: number;
};

const ARTICLE_RULES: Array<[string, string, number, RegExp[]]> = [
  ['harassment','rape-sexual-violence',0.93,[/ধর্ষণ/u,/ধর্ষণের চেষ্টা/u,/\brape\b/i,/attempted rape/i]],
  ['harassment','sexual-harassment',0.90,[/যৌন হয়রানি/u,/যৌন হয়রানি/u,/ইভ টিজিং/u,/শ্লীলতাহানি/u,/sexual harassment/i,/eve[- ]?teasing/i]],
  ['harassment','domestic-violence',0.88,[/পারিবারিক সহিংসতা/u,/গৃহবধূ.{0,30}(নির্যাতন|মারধর)/u,/স্ত্রীকে.{0,30}(মারধর|পিটিয়ে|পিটিয়ে|কুপিয়ে|কুপিয়ে)/u,/domestic violence/i,/wife.{0,40}(assault|beat|attack)/i]],
  ['harassment','blackmail-coercion',0.88,[/ব্ল্যাকমেইল/u,/জবরদস্তি.{0,30}(টাকা|অর্থ)/u,/blackmail/i,/\bcoercion\b/i]],
  ['harassment','honeytrap',0.92,[/হানিট্র্যাপ/u,/honey\s*trap/i,/honeytrap/i]],
  ['load_shedding','load-shedding-outage',0.86,[/লোডশেডিং/u,/বিদ্যুৎ বিভ্রাট/u,/power outage/i,/load shedding/i]],
  ['load_shedding','gas-shortage',0.88,[/গ্যাস সংকট/u,/গ্যাসের চাপ.{0,20}কম/u,/gas shortage/i,/low gas pressure/i]],
  ['load_shedding','excess-electricity-bill',0.90,[/অতিরিক্ত বিদ্যুৎ বিল/u,/ভুতুড়ে বিল/u,/ভুতুড়ে বিল/u,/excess electricity bill/i,/inflated electricity bill/i]],
  ['extortion','bribe-demanded-service',0.92,[/ঘুষ(?:\s*(?:চাওয়া|চাওয়া|চাই|চেয়েছে|চেয়েছে|দাবি|নেওয়া|নেওয়া|নিয়েছে|নিয়েছে|গ্রহণ)|ের\s*(?:দাবি|অভিযোগ))/u,/\bbribe\b/i,/bribery/i]],
  ['public_safety','mob-justice',0.94,[/গণপিটুনি/u,/মব সহিংসতা/u,/(চুরি|ছিনতাই|ডাকাতি|ছেলেধরা).{0,60}(অভিযোগ|সন্দেহ).{0,100}(পিটিয়ে|পিটুনি).{0,60}(হত্যা|নিহত)/u,/mob violence/i,/lynch/i,/beaten by a mob/i]],
  ['public_safety','snatching',0.91,[/ছিনতাই/u,/পকেট.{0,24}(কাট|মার)/u,/(কাটছেন|কাটছে|কেটে|কাটে).{0,36}(রিকশাযাত্রীর|যাত্রীর|পথচারীর).{0,24}পকেট/u,/snatching/i,/\bmugging\b/i,/pickpocket/i]],
  ['public_safety','robbery',0.90,[/ডাকাতি/u,/dacoity/i,/\brobbery\b/i]],
  ['public_safety','theft',0.88,[/চুরি/u,/\btheft\b/i,/\bstolen\b/i]],
  ['road_transport','road-accident',0.91,[/সড়ক দুর্ঘটনা/u,/সড়ক দুর্ঘটনা/u,/(ধাক্কায়|ধাক্কায়|চাপায়|চাপায়|চাপা পড়ে|চাপা পড়ে).{0,100}(নিহত|আহত)/u,/(বাস|ট্রাক|পিকআপ|মোটরসাইকেল|অটোরিকশা|গাড়ি|গাড়ি|মাইক্রোবাস).{0,70}(সংঘর্ষ|ধাক্কা|চাপা).{0,120}(নিহত|আহত)/u,/(নিয়ন্ত্রণ হারিয়ে|নিয়ন্ত্রণ হারিয়ে|lost control).{0,60}(বাস|ট্রাক|পিকআপ|মোটরসাইকেল|অটোরিকশা|গাড়ি|গাড়ি|মাইক্রোবাস|bus|truck|car|vehicle).{0,100}(পুকুর|খাল|খাদ|উল্টে|pond|canal|ditch|overturn).{0,120}(নিহত|আহত|লাশ|মৃত|dead|killed|injured)/iu,/(বাস|ট্রাক|পিকআপ|মোটরসাইকেল|অটোরিকশা|গাড়ি|গাড়ি|মাইক্রোবাস|bus|truck|car|vehicle).{0,80}(নিয়ন্ত্রণ হারিয়ে|নিয়ন্ত্রণ হারিয়ে|lost control).{0,100}(পুকুর|খাল|খাদ|উল্টে|pond|canal|ditch|overturn)/iu,/road accident/i,/road crash/i,/(collision|crash|hit by|run over).{0,100}(killed|dead|injured)/i,/সড়কে.{0,40}(নিহত|আহত)/u]],
  ['road_transport','road-block',0.89,[/সড়ক অবরোধ/u,/সড়ক অবরোধ/u,/road blockade/i,/road blocked/i,/highway.{0,40}blocked/i]],
  ['road_transport','road-repair-delay',0.88,[/রাস্তা মেরামত.{0,40}(বিলম্ব|দেরি|বন্ধ)/u,/road repair.{0,40}(delay|stalled|unfinished)/i]],
  ['illegal_occupation','road-public-space-encroachment',0.90,[/(ফুটপাত|ফুটওভার ব্রিজ|রাস্তা).{0,25}দখল/u,/(footpath|road|public space).{0,35}encroach/i]],
  ['illegal_occupation','government-property-occupation',0.91,[/(সরকারি|খাস).{0,20}(জমি|সম্পত্তি).{0,30}দখল/u,/(government|public).{0,25}(land|property).{0,30}(occup|encroach)/i]],
  ['illegal_occupation','private-property-occupation',0.91,[/(ব্যক্তিগত|ব্যক্তিমালিকানাধীন).{0,20}(জমি|সম্পত্তি).{0,30}দখল/u,/private.{0,25}(land|property).{0,30}(occup|encroach)/i]],
  ['rickshaw','charging-station-location',0.92,[/(অবৈধ|illegal).{0,20}(অটো|রিকশা|auto.?rickshaw).{0,30}(চার্জ|charging)/iu,/অটো.?রিকশা.{0,30}চার্জিং স্টেশন/iu,/illegal auto.?rickshaw charging/i]],
];

const EXTORTION_RE = /(চাঁদাবাজি|চাঁদা\s*(দাবি|আদায়|আদায়)|চাঁদাবাজ|\bextortion\b)/iu;
const NON_INCIDENT_THEFT_RE = /(শ্রম\s*চুরি|মজুরি\s*চুরি|মেধা\s*চুরি|আইডিয়া\s*চুরি|আইডিয়া\s*চুরি|কনটেন্ট\s*চুরি|wage\s+theft|labor\s+theft|content\s+theft|idea\s+theft|intellectual\s+property\s+theft)/iu;

export const classifyArticle = (value: unknown): Classification | null => {
  const text = normalizeText(value);
  if (NON_INCIDENT_THEFT_RE.test(text)) return null;
  for (const [segmentId, subcategoryId, confidence, patterns] of ARTICLE_RULES) {
    if (patterns.some((pattern) => pattern.test(text))) {
      return { segmentId, subcategoryId, confidence };
    }
  }
  if (EXTORTION_RE.test(text)) {
    if (/(বাস|ট্রাক|পরিবহন|স্ট্যান্ড|টার্মিনাল|চালক|driver|bus|truck|transport|terminal)/iu.test(text)) {
      return { segmentId:'extortion', subcategoryId:'transport-movement', confidence:0.91 };
    }
    if (/(নির্মাণ|ঠিকাদার|ভবন|জমি|property|construction|contractor)/iu.test(text)) {
      return { segmentId:'extortion', subcategoryId:'construction-property', confidence:0.90 };
    }
    if (/(দোকান|ব্যবসা|ব্যবসায়ী|ব্যবসায়ী|shop|business|trader|merchant)/iu.test(text)) {
      return { segmentId:'extortion', subcategoryId:'shop-business', confidence:0.90 };
    }
    if (/(হুমকি|প্রাণনাশ|threat|threaten)/iu.test(text)) {
      return { segmentId:'extortion', subcategoryId:'threat-money-demand', confidence:0.90 };
    }
    return { segmentId:'extortion', subcategoryId:'extortion-other', confidence:0.86 };
  }
  return null;
};

type DistrictEntry = [string, string[], string];

const DISTRICTS: DistrictEntry[] = [
  ['Dhaka',['ঢাকা','dhaka'],'Dhaka'],['Gazipur',['গাজীপুর','gazipur'],'Dhaka'],['Narayanganj',['নারায়ণগঞ্জ','নারায়ণগঞ্জ','narayanganj'],'Dhaka'],['Narsingdi',['নরসিংদী','narsingdi'],'Dhaka'],['Manikganj',['মানিকগঞ্জ','manikganj'],'Dhaka'],['Munshiganj',['মুন্সিগঞ্জ','munshiganj'],'Dhaka'],['Tangail',['টাঙ্গাইল','tangail'],'Dhaka'],['Kishoreganj',['কিশোরগঞ্জ','kishoreganj'],'Dhaka'],['Faridpur',['ফরিদপুর','faridpur'],'Dhaka'],['Gopalganj',['গোপালগঞ্জ','gopalganj'],'Dhaka'],['Madaripur',['মাদারীপুর','madaripur'],'Dhaka'],['Rajbari',['রাজবাড়ী','রাজবাড়ী','rajbari'],'Dhaka'],['Shariatpur',['শরীয়তপুর','শরীয়তপুর','shariatpur'],'Dhaka'],
  ['Chattogram',['চট্টগ্রাম','chattogram','chittagong'],'Chattogram'],["Coxs Bazar",['কক্সবাজার',"cox's bazar",'coxs bazar','cox bazar'],'Chattogram'],['Cumilla',['কুমিল্লা','cumilla','comilla'],'Chattogram'],['Feni',['ফেনী','feni'],'Chattogram'],['Noakhali',['নোয়াখালী','নোয়াখালী','noakhali'],'Chattogram'],['Lakshmipur',['লক্ষ্মীপুর','lakshmipur'],'Chattogram'],['Chandpur',['চাঁদপুর','chandpur'],'Chattogram'],['Brahmanbaria',['ব্রাহ্মণবাড়িয়া','ব্রাহ্মণবাড়িয়া','brahmanbaria'],'Chattogram'],['Khagrachhari',['খাগড়াছড়ি','খাগড়াছড়ি','khagrachhari','khagrachari'],'Chattogram'],['Rangamati',['রাঙামাটি','rangamati'],'Chattogram'],['Bandarban',['বান্দরবান','bandarban'],'Chattogram'],
  ['Rajshahi',['রাজশাহী','rajshahi'],'Rajshahi'],['Bogura',['বগুড়া','বগুড়া','bogura','bogra'],'Rajshahi'],['Pabna',['পাবনা','pabna'],'Rajshahi'],['Sirajganj',['সিরাজগঞ্জ','sirajganj'],'Rajshahi'],['Natore',['নাটোর','natore'],'Rajshahi'],['Naogaon',['নওগাঁ','naogaon'],'Rajshahi'],['Chapainawabganj',['চাঁপাইনবাবগঞ্জ','chapainawabganj','chapai nawabganj'],'Rajshahi'],['Joypurhat',['জয়পুরহাট','জয়পুরহাট','joypurhat'],'Rajshahi'],
  ['Khulna',['খুলনা','khulna'],'Khulna'],['Jashore',['যশোর','jashore','jessore'],'Khulna'],['Satkhira',['সাতক্ষীরা','satkhira'],'Khulna'],['Bagerhat',['বাগেরহাট','bagerhat'],'Khulna'],['Jhenaidah',['ঝিনাইদহ','jhenaidah'],'Khulna'],['Magura',['মাগুরা','magura'],'Khulna'],['Narail',['নড়াইল','নড়াইল','narail'],'Khulna'],['Kushtia',['কুষ্টিয়া','কুষ্টিয়া','kushtia'],'Khulna'],['Chuadanga',['চুয়াডাঙ্গা','চুয়াডাঙ্গা','chuadanga'],'Khulna'],['Meherpur',['মেহেরপুর','meherpur'],'Khulna'],
  ['Barishal',['বরিশাল','barishal','barisal'],'Barishal'],['Bhola',['ভোলা','bhola'],'Barishal'],['Patuakhali',['পটুয়াখালী','পটুয়াখালী','patuakhali'],'Barishal'],['Pirojpur',['পিরোজপুর','pirojpur'],'Barishal'],['Jhalokathi',['ঝালকাঠি','jhalokathi'],'Barishal'],['Barguna',['বরগুনা','barguna'],'Barishal'],
  ['Sylhet',['সিলেট','sylhet'],'Sylhet'],['Moulvibazar',['মৌলভীবাজার','moulvibazar','moulvi bazar'],'Sylhet'],['Habiganj',['হবিগঞ্জ','habiganj'],'Sylhet'],['Sunamganj',['সুনামগঞ্জ','sunamganj'],'Sylhet'],
  ['Rangpur',['রংপুর','rangpur'],'Rangpur'],['Dinajpur',['দিনাজপুর','dinajpur'],'Rangpur'],['Kurigram',['কুড়িগ্রাম','কুড়িগ্রাম','kurigram'],'Rangpur'],['Gaibandha',['গাইবান্ধা','gaibandha'],'Rangpur'],['Nilphamari',['নীলফামারী','nilphamari'],'Rangpur'],['Lalmonirhat',['লালমনিরহাট','lalmonirhat'],'Rangpur'],['Panchagarh',['পঞ্চগড়','পঞ্চগড়','panchagarh'],'Rangpur'],['Thakurgaon',['ঠাকুরগাঁও','thakurgaon'],'Rangpur'],
  ['Mymensingh',['ময়মনসিংহ','ময়মনসিংহ','mymensingh'],'Mymensingh'],['Jamalpur',['জামালপুর','jamalpur'],'Mymensingh'],['Netrokona',['নেত্রকোনা','netrokona'],'Mymensingh'],['Sherpur',['শেরপুর','sherpur'],'Mymensingh'],
];

export const findLocation = (value: unknown) => {
  const text = normalizeText(value);
  if (/রাজধানী/u.test(text)) return { division:'Dhaka', district:'Dhaka' };
  let best: { division: string; district: string; index: number } | null = null;
  for (const [district, aliases, division] of DISTRICTS) {
    for (const alias of aliases) {
      const index = text.indexOf(alias.toLowerCase());
      if (index >= 0 && (!best || index < best.index)) best = { division, district, index };
    }
  }
  return best ? { division:best.division, district:best.district } : null;
};

const compactLocationPhrase = (value: string) =>
  value
    .replace(/[“”"'‘’()[\]{}]/g,' ')
    .replace(/\s+/g,' ')
    .trim()
    .replace(/^(?:ঘটনাটি|ঘটনা|এ ঘটনাটি|এই ঘটনাটি)\s+/u,'')
    .replace(/^(?:the\s+)?incident\s+(?:happened|occurred|took\s+place)(?:\s+(?:near|at|in|on))?\s+/i,'')
    .replace(/\b(?:happened|occurred|took\s+place)(?:\s+(?:near|at|in|on))?\s+/i,'')
    .split(/\s+/)
    .slice(-7)
    .join(' ')
    .replace(/(এলাকা|মহল্লা|গ্রাম|বাজার|মার্কেট|থানা|উপজেলা|ইউনিয়ন|ইউনিয়ন|সড়ক|সড়ক|রোড|মোড়|মোড়|স্টেশন)(?:য়|য়|তে|ে)$/u,'$1')
    .trim();

const locationCandidateIsUsable = (candidate: string, district?: string | null) => {
  const normalized=normalizeText(candidate);
  if (!normalized || normalized.length<4) return false;
  if (/^(এলাকা|বাজার|মার্কেট|থানা|উপজেলা|ইউনিয়ন|ইউনিয়ন|গ্রাম|শহর|নগরী|মহানগরী|area|market|bazaar|thana|upazila|union|village|city)$/iu.test(normalized)) return false;
  if (/(বিভিন্ন|various|several)\s+(এলাকা|areas?)/iu.test(normalized)) return false;
  if (district) {
    const districtNormalized=normalizeText(district);
    if (normalized===districtNormalized || normalized===`${districtNormalized} district`) return false;
  }
  return true;
};

export const inferSpecificLocationPhrase = (value: unknown, district?: string | null) => {
  const text = String(value ?? '').replace(/\s+/g,' ').trim();
  if (!text) return null;

  // Prefer source-backed neighborhood / road / market / police-station phrases.
  // Broader city/metropolitan wording is only a fallback when no more specific
  // phrase is present in the article text.
  const specificPatterns = [
    /([^।.!?;,\n]{2,120}?(?:থানা|উপজেলা|ইউনিয়ন|ইউনিয়ন|বাজার|মার্কেট|এলাকা|মহল্লা|গ্রাম|সড়ক|সড়ক|রোড|মোড়|মোড়|স্টেশন)(?:য়|য়|তে|ে)?)(?=\s|[।.!?;,]|$)/gu,
    /([^.!?;,\n]{2,120}?(?:police station|thana|upazila|union|market|bazaar|area|neighbourhood|neighborhood|village|road|street|station))(?=\s|[.!?;,]|$)/gi,
  ];

  for (const pattern of specificPatterns) {
    const matches=[...text.matchAll(pattern)];
    for (let index=matches.length-1;index>=0;index-=1) {
      const raw=matches[index]?.[1];
      if (!raw) continue;
      const candidate=compactLocationPhrase(raw);
      if (locationCandidateIsUsable(candidate,district)) return candidate;
    }
  }

  const broadPatterns = [
    /([^।.!?;,\n]{2,90}?(?:মহানগরী|মহানগর|নগরী|শহর))(?:তে|য়|য়ে|ে|র|এর)?(?=\s|[।.!?;,]|$)/gu,
    /([^.!?;,\n]{2,100}?(?:metropolitan area|city))(?=\s|[.!?;,]|$)/gi,
  ];
  for (const pattern of broadPatterns) {
    const matches=[...text.matchAll(pattern)];
    for (let index=matches.length-1;index>=0;index-=1) {
      const raw=matches[index]?.[1];
      if (!raw) continue;
      const candidate=compactLocationPhrase(raw);
      if (locationCandidateIsUsable(candidate,district)) return candidate;
    }
  }
  return null;
};

export const inferDistrictWideScope = (value: unknown) => {
  const text = normalizeText(value);
  return /(জেলাজুড়ে|জেলাজুড়ে|জেলা\s*জুড়ে|জেলা\s*জুড়ে|district[- ]wide|across\s+(?:the\s+)?district|throughout\s+(?:the\s+)?district)/iu.test(text);
};

const BN_DIGITS: Record<string,string> = {'০':'0','১':'1','২':'2','৩':'3','৪':'4','৫':'5','৬':'6','৭':'7','৮':'8','৯':'9'};
const asciiDigits = (value: unknown) => String(value ?? '').replace(/[০-৯]/g, (d) => BN_DIGITS[d] || d);
const MONTHS: Record<string,number> = {
  january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,september:9,october:10,november:11,december:12,
  'জানুয়ারি':1,'জানুয়ারি':1,'ফেব্রুয়ারি':2,'ফেব্রুয়ারি':2,'মার্চ':3,'এপ্রিল':4,'মে':5,'জুন':6,'জুলাই':7,'আগস্ট':8,'সেপ্টেম্বর':9,'অক্টোবর':10,'নভেম্বর':11,'ডিসেম্বর':12
};
const ymd = (year: number, month: number, day: number) => {
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
};

export const inferIncidentDate = (value: unknown, publishedDate?: string | null) => {
  const text = asciiDigits(normalizeText(value));
  const explicitIso = text.match(/\b(20\d{2})[-\/.](0?[1-9]|1[0-2])[-\/.]([0-2]?\d|3[01])\b/);
  if (explicitIso) return ymd(Number(explicitIso[1]),Number(explicitIso[2]),Number(explicitIso[3]));
  const explicitDmy = text.match(/\b([0-2]?\d|3[01])[-\/.](0?[1-9]|1[0-2])[-\/.](20\d{2})\b/);
  if (explicitDmy) return ymd(Number(explicitDmy[3]),Number(explicitDmy[2]),Number(explicitDmy[1]));

  const monthPattern = Object.keys(MONTHS)
    .sort((a,b)=>b.length-a.length)
    .map((m)=>m.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))
    .join('|');
  const named = text.match(new RegExp(`(?:^|\\s)(\\d{1,2})\\s+(${monthPattern})(?:\\s*,?\\s*(20\\d{2}))?`,'iu'));
  if (named) {
    const baseYear = publishedDate ? Number(publishedDate.slice(0,4)) : new Date().getUTCFullYear();
    return ymd(Number(named[3] || baseYear),MONTHS[named[2].toLowerCase()] || MONTHS[named[2]],Number(named[1]));
  }
  if (publishedDate && /(আজ|today)/iu.test(text)) return publishedDate;
  if (publishedDate && /(গতকাল|yesterday)/iu.test(text)) {
    const d = new Date(`${publishedDate}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate()-1);
    return d.toISOString().slice(0,10);
  }

  if (publishedDate) {
    const weekdayNames: Array<[number, RegExp]> = [
      [0, /(গত\s*)?রবিবার(?:\s*(?:রাতে|সকালে|ভোরে|দুপুরে|বিকেলে))?|(?:last\s+)?sunday(?:\s+(?:night|morning|afternoon|evening))?/iu],
      [1, /(গত\s*)?সোমবার(?:\s*(?:রাতে|সকালে|ভোরে|দুপুরে|বিকেলে))?|(?:last\s+)?monday(?:\s+(?:night|morning|afternoon|evening))?/iu],
      [2, /(গত\s*)?মঙ্গলবার(?:\s*(?:রাতে|সকালে|ভোরে|দুপুরে|বিকেলে))?|(?:last\s+)?tuesday(?:\s+(?:night|morning|afternoon|evening))?/iu],
      [3, /(গত\s*)?বুধবার(?:\s*(?:রাতে|সকালে|ভোরে|দুপুরে|বিকেলে))?|(?:last\s+)?wednesday(?:\s+(?:night|morning|afternoon|evening))?/iu],
      [4, /(গত\s*)?বৃহস্পতিবার(?:\s*(?:রাতে|সকালে|ভোরে|দুপুরে|বিকেলে))?|(?:last\s+)?thursday(?:\s+(?:night|morning|afternoon|evening))?/iu],
      [5, /(গত\s*)?শুক্রবার(?:\s*(?:রাতে|সকালে|ভোরে|দুপুরে|বিকেলে))?|(?:last\s+)?friday(?:\s+(?:night|morning|afternoon|evening))?/iu],
      [6, /(গত\s*)?শনিবার(?:\s*(?:রাতে|সকালে|ভোরে|দুপুরে|বিকেলে))?|(?:last\s+)?saturday(?:\s+(?:night|morning|afternoon|evening))?/iu],
    ];
    const base=new Date(`${publishedDate}T00:00:00Z`);
    for (const [weekday,pattern] of weekdayNames) {
      const match=text.match(pattern);
      if (!match) continue;
      const matchedText=match[0];
      const hasPastCue=/(গত|last|রাতে|সকালে|ভোরে|দুপুরে|বিকেলে|night|morning|afternoon|evening)/iu.test(matchedText);
      if (!hasPastCue) continue;
      const d=new Date(base);
      let delta=(d.getUTCDay()-weekday+7)%7;
      if (/গত|last/iu.test(matchedText) && delta===0) delta=7;
      d.setUTCDate(d.getUTCDate()-delta);
      return d.toISOString().slice(0,10);
    }
  }
  return null;
};

export const buildIncidentContext = (article: { excerpt?: string | null; body?: string | null }) => {
  const excerpt = String(article.excerpt || '').trim();
  const body = String(article.body || '').trim();
  const sentenceCandidates = body
    .split(/(?<=[.!?।])\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 25);

  const seen = new Set<string>();
  const selected: string[] = [];
  for (const candidate of [excerpt, ...sentenceCandidates]) {
    if (!candidate) continue;
    const key = normalizeText(candidate);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    selected.push(candidate);
    if (selected.join(' ').length >= 1400 || selected.length >= 5) break;
  }
  return clip(selected.join(' '), 1800);
};

export const buildSourceLanguageFields = (
  title: string,
  description: string,
  language: string
) => ({
  titlePrimary: clip(title,100),
  descriptionPrimary: clip(description,1800),
  titleEn: '',
  descriptionEn: '',
  sourceLanguage: language || 'unknown',
});

export const scoreDiscoveryLink = (url: string, anchorText: string) => {
  if (classifyArticle(anchorText)) return 0;
  let path = '';
  try { path = new URL(url).pathname.toLowerCase(); } catch {}
  if (/(\/bangladesh(?:\/|$)|\/national(?:\/|$)|\/crime(?:\/|$)|\/law(?:\/|$)|\/capital(?:\/|$)|\/country(?:\/|$)|\/whole-country(?:\/|$)|\/samagrabangladesh(?:\/|$)|\/sara-bangla(?:\/|$)|\/saradesh(?:\/|$))/i.test(path)) return 1;
  return 2;
};
