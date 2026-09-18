import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body, status=200) => new Response(JSON.stringify(body), {status, headers:{...corsHeaders,"Content-Type":"application/json"}});
const decodeEntities = (value) => String(value || "").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&#(\d+);/g,(_,code)=>String.fromCharCode(Number(code))).replace(/&#x([0-9a-f]+);/gi,(_,code)=>String.fromCharCode(parseInt(code,16))).replace(/\s+/g," ").trim();
const attr = (tag,name) => { const match=tag.match(new RegExp("\\b"+name+"\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))","i")); return decodeEntities(match?.[1] ?? match?.[2] ?? match?.[3] ?? ""); };
const metaContent = (html,keys) => { const tags=String(html||"").match(/<meta\b[^>]*>/gi)??[]; for(const tag of tags){const key=(attr(tag,"property")||attr(tag,"name")||attr(tag,"itemprop")).toLowerCase();if(keys.includes(key)){const content=attr(tag,"content");if(content)return content;}}return "";};
const linkHref = (html,relName) => { const tags=String(html||"").match(/<link\b[^>]*>/gi)??[];for(const tag of tags){const rel=attr(tag,"rel").toLowerCase().split(/\s+/);if(rel.includes(relName)){const href=attr(tag,"href");if(href)return href;}}return "";};
const pageTitle = (html) => { const match=String(html||"").match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);return match?decodeEntities(match[1]):"";};
const normalizedDate = (raw) => { if(!raw)return null;const match=String(raw).match(/^(\d{4})-(\d{2})-(\d{2})/);if(match)return match[1]+"-"+match[2]+"-"+match[3];const parsed=new Date(raw);return Number.isNaN(parsed.getTime())?null:parsed.toISOString().slice(0,10);};
async function readLimited(response,limit=768*1024){const reader=response.body?.getReader();if(!reader)return "";const decoder=new TextDecoder();let total=0,html="";while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>limit){await reader.cancel();break;}html+=decoder.decode(value,{stream:true});}html+=decoder.decode();return html;}
const MAX_SOURCES = 20;
const MAX_ARTICLES_PER_SOURCE = 4;
const MAX_TOTAL_ARTICLES = 36;
const FETCH_TIMEOUT_MS = 7000;

const stripTags = (value) => decodeEntities(String(value || '')
  .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim());

const clip = (value, max) => {
  const text = String(value || '').trim();
  if (text.length <= max) return text;
  return text.slice(0, Math.max(0, max - 1)).trimEnd() + '…';
};

const normalizeText = (value) => String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();

const detectLanguage = (value) => {
  const text = String(value || '');
  const bn = (text.match(/[\u0980-\u09FF]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  if (bn > latin * 1.5 && bn > 8) return 'bn';
  if (latin > bn * 1.5 && latin > 8) return 'en';
  if (bn > 8 && latin > 8) return 'mixed';
  return 'unknown';
};

const MAX_ARTICLE_AGE_DAYS = 7;
const isUnsupportedArticleType = (url, title) => {
  let path = '';
  try { path = new URL(url).pathname.toLowerCase(); } catch {}
  const text = normalizeText(title);
  return /(\/opinion(?:\/|$)|\/editorial(?:\/|$)|\/analysis(?:\/|$)|\/feature(?:\/|$)|\/lifestyle(?:\/|$)|\/sports?(?:\/|$)|\/entertainment(?:\/|$)|\/photo(?:\/|$)|\/video(?:\/|$))/i.test(path)
    || /(সম্পাদকীয়|মতামত|বিশ্লেষণ|কলাম|opinion|editorial|analysis)/iu.test(text);
};
const articleAgeDays = (publishedDate) => {
  if (!publishedDate) return null;
  const published = new Date(`${publishedDate}T00:00:00Z`);
  if (Number.isNaN(published.getTime())) return null;
  return Math.floor((Date.now() - published.getTime()) / 86400000);
};

const ARTICLE_RULES = [
  ['harassment','rape-sexual-violence',0.93,[/ধর্ষণ/u,/ধর্ষণের চেষ্টা/u,/\brape\b/i,/attempted rape/i]],
  ['harassment','sexual-harassment',0.90,[/যৌন হয়রানি/u,/যৌন হয়রানি/u,/ইভ টিজিং/u,/শ্লীলতাহানি/u,/sexual harassment/i,/eve[- ]?teasing/i]],
  ['harassment','domestic-violence',0.88,[/পারিবারিক সহিংসতা/u,/গৃহবধূ.{0,30}(নির্যাতন|মারধর)/u,/স্ত্রীকে.{0,30}(মারধর|পিটিয়ে|পিটিয়ে|কুপিয়ে|কুপিয়ে)/u,/domestic violence/i,/wife.{0,40}(assault|beat|attack)/i]],
  ['harassment','blackmail-coercion',0.88,[/ব্ল্যাকমেইল/u,/জবরদস্তি.{0,30}(টাকা|অর্থ)/u,/blackmail/i,/\bcoercion\b/i]],
  ['harassment','honeytrap',0.92,[/হানিট্র্যাপ/u,/honey\s*trap/i,/honeytrap/i]],
  ['load_shedding','load-shedding-outage',0.86,[/লোডশেডিং/u,/বিদ্যুৎ বিভ্রাট/u,/power outage/i,/load shedding/i]],
  ['load_shedding','gas-shortage',0.88,[/গ্যাস সংকট/u,/গ্যাসের চাপ.{0,20}কম/u,/gas shortage/i,/low gas pressure/i]],
  ['load_shedding','excess-electricity-bill',0.90,[/অতিরিক্ত বিদ্যুৎ বিল/u,/ভুতুড়ে বিল/u,/ভুতুড়ে বিল/u,/excess electricity bill/i,/inflated electricity bill/i]],
  ['extortion','bribe-demanded-service',0.92,[/ঘুষ/u,/\bbribe\b/i,/bribery/i]],
  ['public_safety','mob-justice',0.94,[/গণপিটুনি/u,/মব সহিংসতা/u,/(চুরি|ছিনতাই|ডাকাতি|ছেলেধরা).{0,60}(অভিযোগ|সন্দেহ).{0,100}(পিটিয়ে|পিটুনি).{0,60}(হত্যা|নিহত)/u,/mob violence/i,/lynch/i,/beaten by a mob/i]],
  ['public_safety','snatching',0.91,[/ছিনতাই/u,/snatching/i,/\bmugging\b/i]],
  ['public_safety','robbery',0.90,[/ডাকাতি/u,/dacoity/i,/\brobbery\b/i]],
  ['public_safety','theft',0.88,[/চুরি/u,/\btheft\b/i,/\bstolen\b/i]],
  ['road_transport','road-accident',0.91,[/সড়ক দুর্ঘটনা/u,/সড়ক দুর্ঘটনা/u,/সংঘর্ষে.{0,100}(নিহত|আহত)/u,/(ধাক্কায়|ধাক্কায়|চাপায়|চাপায়|চাপা পড়ে|চাপা পড়ে).{0,100}(নিহত|আহত)/u,/(বাস|ট্রাক|পিকআপ|মোটরসাইকেল|অটোরিকশা|গাড়ি|গাড়ি|মাইক্রোবাস).{0,70}(সংঘর্ষ|ধাক্কা|চাপা).{0,120}(নিহত|আহত)/u,/road accident/i,/road crash/i,/(collision|crash|hit by|run over).{0,100}(killed|dead|injured)/i,/সড়কে.{0,40}(নিহত|আহত)/u]],
  ['road_transport','road-block',0.89,[/সড়ক অবরোধ/u,/সড়ক অবরোধ/u,/road blockade/i,/road blocked/i]],
  ['road_transport','road-repair-delay',0.88,[/রাস্তা মেরামত.{0,40}(বিলম্ব|দেরি|বন্ধ)/u,/road repair.{0,40}(delay|stalled|unfinished)/i]],
  ['illegal_occupation','road-public-space-encroachment',0.90,[/(ফুটপাত|ফুটওভার ব্রিজ|রাস্তা).{0,25}দখল/u,/(footpath|road|public space).{0,35}encroach/i]],
  ['illegal_occupation','government-property-occupation',0.91,[/(সরকারি|খাস).{0,20}(জমি|সম্পত্তি).{0,30}দখল/u,/(government|public).{0,25}(land|property).{0,30}(occup|encroach)/i]],
  ['illegal_occupation','private-property-occupation',0.91,[/(ব্যক্তিগত|ব্যক্তিমালিকানাধীন).{0,20}(জমি|সম্পত্তি).{0,30}দখল/u,/private.{0,25}(land|property).{0,30}(occup|encroach)/i]],
  ['rickshaw','charging-station-location',0.92,[/(অবৈধ|illegal).{0,20}(অটো|রিকশা|auto.?rickshaw).{0,30}(চার্জ|charging)/iu,/অটো.?রিকশা.{0,30}চার্জিং স্টেশন/iu,/illegal auto.?rickshaw charging/i]],
];

const EXTORTION_RE = /(চাঁদাবাজি|চাঁদা\s*(দাবি|আদায়|আদায়)|চাঁদাবাজ|\bextortion\b)/iu;
const classifyArticle = (value) => {
  const text = normalizeText(value);
  for (const [segmentId, subcategoryId, confidence, patterns] of ARTICLE_RULES) {
    if (patterns.some((pattern) => pattern.test(text))) return { segmentId, subcategoryId, confidence };
  }
  if (EXTORTION_RE.test(text)) {
    if (/(বাস|ট্রাক|পরিবহন|স্ট্যান্ড|টার্মিনাল|চালক|driver|bus|truck|transport|terminal)/iu.test(text)) return { segmentId:'extortion', subcategoryId:'transport-movement', confidence:0.91 };
    if (/(নির্মাণ|ঠিকাদার|ভবন|জমি|property|construction|contractor)/iu.test(text)) return { segmentId:'extortion', subcategoryId:'construction-property', confidence:0.90 };
    if (/(দোকান|ব্যবসা|ব্যবসায়ী|ব্যবসায়ী|shop|business|trader|merchant)/iu.test(text)) return { segmentId:'extortion', subcategoryId:'shop-business', confidence:0.90 };
    if (/(হুমকি|প্রাণনাশ|threat|threaten)/iu.test(text)) return { segmentId:'extortion', subcategoryId:'threat-money-demand', confidence:0.90 };
    return { segmentId:'extortion', subcategoryId:'extortion-other', confidence:0.86 };
  }
  return null;
};

const DISTRICTS = [
  ['Dhaka','ঢাকা','Dhaka'],['Gazipur','গাজীপুর','Dhaka'],['Narayanganj','নারায়ণগঞ্জ','Dhaka'],['Narsingdi','নরসিংদী','Dhaka'],['Manikganj','মানিকগঞ্জ','Dhaka'],['Munshiganj','মুন্সিগঞ্জ','Dhaka'],['Tangail','টাঙ্গাইল','Dhaka'],['Kishoreganj','কিশোরগঞ্জ','Dhaka'],['Faridpur','ফরিদপুর','Dhaka'],['Gopalganj','গোপালগঞ্জ','Dhaka'],['Madaripur','মাদারীপুর','Dhaka'],['Rajbari','রাজবাড়ী','Dhaka'],['Shariatpur','শরীয়তপুর','Dhaka'],
  ['Chattogram','চট্টগ্রাম','Chattogram'],['Coxs Bazar','কক্সবাজার','Chattogram'],['Cumilla','কুমিল্লা','Chattogram'],['Feni','ফেনী','Chattogram'],['Noakhali','নোয়াখালী','Chattogram'],['Lakshmipur','লক্ষ্মীপুর','Chattogram'],['Chandpur','চাঁদপুর','Chattogram'],['Brahmanbaria','ব্রাহ্মণবাড়িয়া','Chattogram'],['Khagrachhari','খাগড়াছড়ি','Chattogram'],['Rangamati','রাঙামাটি','Chattogram'],['Bandarban','বান্দরবান','Chattogram'],
  ['Rajshahi','রাজশাহী','Rajshahi'],['Bogura','বগুড়া','Rajshahi'],['Pabna','পাবনা','Rajshahi'],['Sirajganj','সিরাজগঞ্জ','Rajshahi'],['Natore','নাটোর','Rajshahi'],['Naogaon','নওগাঁ','Rajshahi'],['Chapainawabganj','চাঁপাইনবাবগঞ্জ','Rajshahi'],['Joypurhat','জয়পুরহাট','Rajshahi'],
  ['Khulna','খুলনা','Khulna'],['Jashore','যশোর','Khulna'],['Satkhira','সাতক্ষীরা','Khulna'],['Bagerhat','বাগেরহাট','Khulna'],['Jhenaidah','ঝিনাইদহ','Khulna'],['Magura','মাগুরা','Khulna'],['Narail','নড়াইল','Khulna'],['Kushtia','কুষ্টিয়া','Khulna'],['Chuadanga','চুয়াডাঙ্গা','Khulna'],['Meherpur','মেহেরপুর','Khulna'],
  ['Barishal','বরিশাল','Barishal'],['Bhola','ভোলা','Barishal'],['Patuakhali','পটুয়াখালী','Barishal'],['Pirojpur','পিরোজপুর','Barishal'],['Jhalokathi','ঝালকাঠি','Barishal'],['Barguna','বরগুনা','Barishal'],
  ['Sylhet','সিলেট','Sylhet'],['Moulvibazar','মৌলভীবাজার','Sylhet'],['Habiganj','হবিগঞ্জ','Sylhet'],['Sunamganj','সুনামগঞ্জ','Sylhet'],
  ['Rangpur','রংপুর','Rangpur'],['Dinajpur','দিনাজপুর','Rangpur'],['Kurigram','কুড়িগ্রাম','Rangpur'],['Gaibandha','গাইবান্ধা','Rangpur'],['Nilphamari','নীলফামারী','Rangpur'],['Lalmonirhat','লালমনিরহাট','Rangpur'],['Panchagarh','পঞ্চগড়','Rangpur'],['Thakurgaon','ঠাকুরগাঁও','Rangpur'],
  ['Mymensingh','ময়মনসিংহ','Mymensingh'],['Jamalpur','জামালপুর','Mymensingh'],['Netrokona','নেত্রকোনা','Mymensingh'],['Sherpur','শেরপুর','Mymensingh'],
];

const findLocation = (value) => {
  const text = normalizeText(value);
  if (/রাজধানী/u.test(text) || /\bdhaka\b/i.test(text) || /ঢাকা/u.test(text)) return { division:'Dhaka', district:'Dhaka' };
  let best = null;
  for (const [district, bn, division] of DISTRICTS) {
    for (const name of [district.toLowerCase(), bn]) {
      const index = text.indexOf(name.toLowerCase());
      if (index >= 0 && (!best || index < best.index)) best = { division, district, index };
    }
  }
  return best ? { division:best.division, district:best.district } : null;
};

const BN_DIGITS = {'০':'0','১':'1','২':'2','৩':'3','৪':'4','৫':'5','৬':'6','৭':'7','৮':'8','৯':'9'};
const asciiDigits = (value) => String(value || '').replace(/[০-৯]/g, (d) => BN_DIGITS[d] || d);
const MONTHS = {january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,september:9,october:10,november:11,december:12,'জানুয়ারি':1,'জানুয়ারি':1,'ফেব্রুয়ারি':2,'ফেব্রুয়ারি':2,'মার্চ':3,'এপ্রিল':4,'মে':5,'জুন':6,'জুলাই':7,'আগস্ট':8,'সেপ্টেম্বর':9,'অক্টোবর':10,'নভেম্বর':11,'ডিসেম্বর':12};
const ymd = (year, month, day) => { const d = new Date(Date.UTC(year, month - 1, day)); if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null; return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`; };
const inferIncidentDate = (value, publishedDate) => {
  const text = asciiDigits(normalizeText(value));
  const explicitIso = text.match(/\b(20\d{2})[-\/.](0?[1-9]|1[0-2])[-\/.]([0-2]?\d|3[01])\b/); if (explicitIso) return ymd(Number(explicitIso[1]),Number(explicitIso[2]),Number(explicitIso[3]));
  const explicitDmy = text.match(/\b([0-2]?\d|3[01])[-\/.](0?[1-9]|1[0-2])[-\/.](20\d{2})\b/); if (explicitDmy) return ymd(Number(explicitDmy[3]),Number(explicitDmy[2]),Number(explicitDmy[1]));
  const monthPattern = Object.keys(MONTHS).sort((a,b)=>b.length-a.length).map((m)=>m.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
  const named = text.match(new RegExp(`\\b?(\\d{1,2})\\s+(${monthPattern})(?:\\s*,?\\s*(20\\d{2}))?`,'iu'));
  if (named) { const baseYear = publishedDate ? Number(publishedDate.slice(0,4)) : new Date().getUTCFullYear(); return ymd(Number(named[3] || baseYear),MONTHS[named[2].toLowerCase()] || MONTHS[named[2]],Number(named[1])); }
  if (publishedDate && /(আজ|today)/iu.test(text)) return publishedDate;
  if (publishedDate && /(গতকাল|yesterday)/iu.test(text)) { const d = new Date(`${publishedDate}T00:00:00Z`); d.setUTCDate(d.getUTCDate()-1); return d.toISOString().slice(0,10); }
  return null;
};

const extractJsonLdArticle = (html) => {
  const scripts = [...String(html || '').matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]; const nodes = [];
  const walk = (value) => { if (!value) return; if (Array.isArray(value)) return value.forEach(walk); if (typeof value === 'object') { nodes.push(value); if (value['@graph']) walk(value['@graph']); } };
  for (const script of scripts.slice(0,8)) { try { walk(JSON.parse(decodeEntities(script[1]).replace(/^<!--|-->$/g,''))); } catch {} }
  return nodes.find((node) => { const type = Array.isArray(node['@type']) ? node['@type'].join(' ') : String(node['@type'] || ''); return /NewsArticle|Article|ReportageNewsArticle/i.test(type); }) || null;
};
const extractArticle = (html, finalUrl, publisherFallback) => {
  const jsonLd = extractJsonLdArticle(html); const title = String(jsonLd?.headline || metaContent(html,['og:title','twitter:title','headline']) || pageTitle(html) || '').trim();
  const publisherName = String(metaContent(html,['og:site_name','application-name']) || jsonLd?.publisher?.name || publisherFallback || new URL(finalUrl).hostname).trim();
  const description = String(jsonLd?.description || metaContent(html,['og:description','twitter:description','description']) || '').trim(); const canonicalRaw = linkHref(html,'canonical') || finalUrl; let canonicalUrl = finalUrl;
  try { canonicalUrl = new URL(canonicalRaw,finalUrl).toString(); } catch {}
  const dateRaw = String(jsonLd?.datePublished || metaContent(html,['article:published_time','datepublished','date','pubdate','publishdate']) || ''); const sourcePublishedDate = normalizedDate(dateRaw);
  let body = String(jsonLd?.articleBody || '').trim(); if (!body) { const articleMatch = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i); const scope = articleMatch?.[1] || html; body = [...scope.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((m)=>stripTags(m[1])).filter((t)=>t.length>=35).slice(0,18).join(' '); }
  body = clip(stripTags(body),12000); const excerpt = clip(description || body,1800); return { title:clip(title,500), publisherName:clip(publisherName,160), canonicalUrl, sourcePublishedDate, body, excerpt };
};
const isLikelyArticlePath = (url, anchorText) => { const path=url.pathname.toLowerCase(); if (!path || path==='/') return false; if (/\.(jpg|jpeg|png|gif|webp|svg|pdf|mp4|mp3)$/i.test(path)) return false; if (/(\/tag\/|\/topic\/|\/category\/|\/author\/|\/search|\/video\/?$|\/photo\/?$|\/epaper|\/archive|\/contact|\/privacy|\/terms)/i.test(path)) return false; const cleanText=stripTags(anchorText); if (cleanText.length<18) return false; return path.split('/').filter(Boolean).length>=2 || /\d{4}|\d{5,}/.test(path); };
const extractArticleLinks = (html, baseUrl) => { const seen=new Set(); const out=[]; for (const match of String(html||'').matchAll(/<a\b[^>]*href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi)) { const raw=match[1]||match[2]||match[3]||''; try { const url=new URL(raw,baseUrl); url.hash=''; ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','fbclid','gclid'].forEach((key)=>url.searchParams.delete(key)); if (url.protocol!=='https:' || !isLikelyArticlePath(url,match[4])) continue; const key=url.toString(); if (seen.has(key)) continue; seen.add(key); out.push(key); } catch {} if (out.length>=24) break; } return out; };
const mapLimit = async (items, limit, worker) => { const results=new Array(items.length); let cursor=0; const runners=Array.from({length:Math.min(limit,items.length)},async()=>{ while(true){ const index=cursor++; if(index>=items.length) break; try{results[index]=await worker(items[index],index);}catch(error){results[index]={error};}}}); await Promise.all(runners); return results; };

const buildReportPayload = (article, classification, location, incidentDate, language) => {
  const source = { sourceType:'news', publisherName:article.publisherName, sourceTitle:article.title, canonicalUrl:article.canonicalUrl, sourcePublishedDate:article.sourcePublishedDate || '' };
  const text = `${article.title} ${article.excerpt} ${article.body}`;
  const mobOutcome = /(নিহত|মৃত্যু|death|died|killed)/iu.test(text) ? 'death_reported' : /(গুরুতর আহত|seriously injured)/iu.test(text) ? 'seriously_injured' : /(আহত|injured|assaulted|পিটুনি|মারধর)/iu.test(text) ? 'physically_assaulted' : 'unknown';
  const mobTrigger = /(ছিনতাই|snatching)/iu.test(text) ? 'snatching_allegation' : /(চুরি|ডাকাতি|theft|robbery|dacoity)/iu.test(text) ? 'suspected_theft_robbery' : /(অপহরণ|kidnap)/iu.test(text) ? 'kidnapping_allegation' : /(যৌন|sexual)/iu.test(text) ? 'sexual_offence_allegation' : 'unknown';
  const primaryText = clip(article.excerpt || article.body,1800);
  return { source, report:{ segmentId:classification.segmentId, subcategoryId:classification.subcategoryId, titleBn:clip(article.title,100), titleEn:language==='en'?clip(article.title,100):'', descriptionBn:primaryText, descriptionEn:language==='en'?primaryText:'', incidentDate, incidentTime:'', utilityEndTime:'', frequency:'one-time', priority:'medium', division:location.division, district:location.district, upazilaOrThana:'', area:'', road:'', landmark:'', formattedAddress:location.district, relationshipContext:'', recentBillMonth:'', recentBillAmount:'', previousBillMonth:'', previousBillAmount:'', briberyDepartment:'', briberyService:'', briberyAmount:'', affectedPersonAgeGroup:classification.segmentId === 'harassment' ? 'unknown_not_stated' : '', allegedAbuserRelationship:classification.segmentId === 'harassment' ? 'unknown_not_stated' : '', reportingFor:classification.segmentId === 'harassment' ? 'someone_else' : '', sexualHarassmentType:classification.subcategoryId === 'sexual-harassment' ? 'unknown_not_stated' : '', sexualHarassmentContext:classification.subcategoryId === 'sexual-harassment' ? 'unknown_not_stated' : '', sexualHarassmentInstitution:'', intimateWhatHappened:'', intimatePlatform:'', mobJusticeDetails:classification.subcategoryId === 'mob-justice' ? { trigger:mobTrigger, outcome:mobOutcome, ongoingStatus:'unknown' } : null, customFieldAnswers:{ sourceLanguage:language, automatedIntake:true } } };
};
const safeScanFetch = async (initialUrl, checkDomain, accept='text/html,application/xhtml+xml') => { let current=new URL(initialUrl); if(current.protocol!=='https:'||current.username||current.password||current.port) throw new Error('Unsafe source URL blocked.'); let domain=await checkDomain(current.toString()); if(!domain?.approved) throw new Error(`SOURCE_DOMAIN_NOT_APPROVED:${current.hostname}`); let response=null; for(let redirectCount=0;redirectCount<=3;redirectCount+=1){ response=await fetch(current.toString(),{redirect:'manual',headers:{'User-Agent':'SobaiKeJanao-NewsIntake/2.0 (+https://shobaikejanao.com/)','Accept':accept},signal:AbortSignal.timeout(FETCH_TIMEOUT_MS)}); if(response.status>=300&&response.status<400){const location=response.headers.get('location'); if(!location||redirectCount===3) throw new Error('Source redirect could not be resolved.'); const next=new URL(location,current); if(next.protocol!=='https:'||next.username||next.password||next.port) throw new Error('Unsafe source redirect blocked.'); domain=await checkDomain(next.toString()); if(!domain?.approved) throw new Error(`SOURCE_DOMAIN_NOT_APPROVED:${next.hostname}`); current=next; continue;} break;} if(!response||!response.ok) throw new Error(`Source returned HTTP ${response?.status||0}.`); const declaredLength=Number(response.headers.get('content-length')||0); if(declaredLength>2*1024*1024) throw new Error('Source page is too large to inspect safely.'); const contentType=(response.headers.get('content-type')||'').toLowerCase(); if(!/(text\/html|application\/xhtml\+xml|application\/xml|text\/xml|application\/rss\+xml|application\/atom\+xml)/i.test(contentType)) throw new Error('Source did not return readable HTML/XML.'); const html=await readLimited(response,1024*1024); if(!html) throw new Error('Source returned no readable content.'); return {html,finalUrl:current.toString(),domain}; };
const runAutomatedScan = async (supabase) => {
  const {data:beginData,error:beginError}=await supabase.rpc('admin_begin_news_intake_run'); if(beginError) throw new Error(beginError.message); const runId=String(beginData?.runId||''); if(!runId) throw new Error('Could not start News Intake run.');
  const record=async(item)=>{const {error}=await supabase.rpc('admin_record_news_intake_item',{p_run_id:runId,p_item:item}); if(error) throw new Error(error.message);}; const checkDomain=async(url)=>{const {data,error}=await supabase.rpc('admin_check_news_source_domain',{p_url:url}); if(error) throw new Error(error.message); return data;};
  let fatalMessage=''; let processingErrors=0;
  try { const {data:sourceData,error:sourceError}=await supabase.rpc('admin_get_news_intake_scan_sources'); if(sourceError) throw new Error(sourceError.message); const sources=(Array.isArray(sourceData)?sourceData:[]).slice(0,MAX_SOURCES); const discovered=[];
    await mapLimit(sources,4,async(source)=>{ try { const fetched=await safeScanFetch(String(source.homepageUrl),checkDomain); const links=extractArticleLinks(fetched.html,fetched.finalUrl).slice(0,MAX_ARTICLES_PER_SOURCE); if(!links.length){processingErrors+=1;await record({sourceHostname:source.hostname,publisherName:source.publisherName,canonicalUrl:source.homepageUrl,contentLanguage:source.languageHint||'unknown',action:'error',duplicateStatus:'unavailable',reason:'No article links were discoverable from the source homepage.'});return;} for(const url of links){if(discovered.length>=MAX_TOTAL_ARTICLES) break; discovered.push({source,url});} } catch(error){processingErrors+=1;await record({sourceHostname:String(source.hostname||'unknown'),publisherName:String(source.publisherName||'Unknown source'),canonicalUrl:String(source.homepageUrl||'https://invalid.example/'),contentLanguage:String(source.languageHint||'unknown'),action:'error',duplicateStatus:'unavailable',reason:clip(error instanceof Error?error.message:'Source scan failed.',1400)}).catch(()=>{});} });
    await mapLimit(discovered.slice(0,MAX_TOTAL_ARTICLES),3,async(candidate)=>{ const source=candidate.source; const originalUrl=candidate.url; try { const fetched=await safeScanFetch(originalUrl,checkDomain); const article=extractArticle(fetched.html,fetched.finalUrl,source.publisherName); if(!article.title||article.title.length<8){processingErrors+=1;await record({sourceHostname:source.hostname,publisherName:source.publisherName,canonicalUrl:originalUrl,contentLanguage:source.languageHint||'unknown',action:'error',duplicateStatus:'unavailable',reason:'Article title could not be extracted.'});return;} const canonicalCheck=await checkDomain(article.canonicalUrl); if(!canonicalCheck?.approved) article.canonicalUrl=fetched.finalUrl; article.publisherName=article.publisherName||canonicalCheck?.publisherName||source.publisherName; const fullText=`${article.title} ${article.excerpt} ${article.body}`; const detected=detectLanguage(fullText); const language=detected==='unknown'?(source.languageHint||'unknown'):detected; const classification=classifyArticle(fullText);
      if(isUnsupportedArticleType(article.canonicalUrl,article.title)){await record({sourceHostname:source.hostname,publisherName:article.publisherName,canonicalUrl:article.canonicalUrl,sourceTitle:article.title,sourcePublishedDate:article.sourcePublishedDate||'',contentLanguage:language,action:'discovered',duplicateStatus:'unavailable',reason:'Non-incident opinion/editorial/analysis content was excluded from automatic report creation.'});return;}
      const ageDays=articleAgeDays(article.sourcePublishedDate);
      if(ageDays===null){await record({sourceHostname:source.hostname,publisherName:article.publisherName,canonicalUrl:article.canonicalUrl,sourceTitle:article.title,sourcePublishedDate:'',contentLanguage:language,segmentId:classification?.segmentId||null,subcategoryId:classification?.subcategoryId||null,confidence:classification?.confidence||null,action:'needs_review',duplicateStatus:'unavailable',reason:'Source publication date could not be verified, so automatic creation was blocked.'});return;}
      if(ageDays>MAX_ARTICLE_AGE_DAYS){await record({sourceHostname:source.hostname,publisherName:article.publisherName,canonicalUrl:article.canonicalUrl,sourceTitle:article.title,sourcePublishedDate:article.sourcePublishedDate||'',contentLanguage:language,segmentId:classification?.segmentId||null,subcategoryId:classification?.subcategoryId||null,confidence:classification?.confidence||null,action:'discovered',duplicateStatus:'unavailable',reason:'Outside the 7-day automated intake window.'});return;}
      if(ageDays < -1){await record({sourceHostname:source.hostname,publisherName:article.publisherName,canonicalUrl:article.canonicalUrl,sourceTitle:article.title,sourcePublishedDate:article.sourcePublishedDate||'',contentLanguage:language,segmentId:classification?.segmentId||null,subcategoryId:classification?.subcategoryId||null,confidence:classification?.confidence||null,action:'needs_review',duplicateStatus:'unavailable',reason:'Source publication date is unexpectedly in the future.'});return;}
      if(!classification){await record({sourceHostname:source.hostname,publisherName:article.publisherName,canonicalUrl:article.canonicalUrl,sourceTitle:article.title,sourcePublishedDate:article.sourcePublishedDate||'',contentLanguage:language,action:'discovered',duplicateStatus:'unavailable',reason:'No supported report category matched with enough confidence.'});return;}
      const location=findLocation(`${article.title} ${article.excerpt} ${article.body.slice(0,3000)}`); const incidentDate=inferIncidentDate(`${article.title} ${article.body.slice(0,6000)}`,article.sourcePublishedDate); if(!location||!incidentDate||!(article.excerpt||article.body)){const missing=[!location?'location':'',!incidentDate?'incident date':'',!(article.excerpt||article.body)?'incident context':''].filter(Boolean).join(', ');await record({sourceHostname:source.hostname,publisherName:article.publisherName,canonicalUrl:article.canonicalUrl,sourceTitle:article.title,sourcePublishedDate:article.sourcePublishedDate||'',contentLanguage:language,segmentId:classification.segmentId,subcategoryId:classification.subcategoryId,confidence:classification.confidence,action:'needs_review',duplicateStatus:'unavailable',reason:`Category detected, but ${missing} could not be established safely from the source.`});return;}
      if(classification.subcategoryId==='bribe-demanded-service'){await record({sourceHostname:source.hostname,publisherName:article.publisherName,canonicalUrl:article.canonicalUrl,sourceTitle:article.title,sourcePublishedDate:article.sourcePublishedDate||'',contentLanguage:language,segmentId:classification.segmentId,subcategoryId:classification.subcategoryId,confidence:classification.confidence,action:'needs_review',duplicateStatus:'unavailable',reason:'Bribery category detected, but department and service fields require source-specific human verification.'});return;}
      const payload=buildReportPayload(article,classification,location,incidentDate,language); const {data:preview,error:previewError}=await supabase.rpc('admin_preview_sourced_report_intake',{p_payload:payload}); if(previewError) throw new Error(previewError.message); const duplicateStatus=String(preview?.duplicate?.status||'unavailable'); const exact=Array.isArray(preview?.duplicate?.exactSourceDuplicates)?preview.duplicate.exactSourceDuplicates:[];
      if(exact.length||preview?.canCreateDraft===false){await record({sourceHostname:source.hostname,publisherName:article.publisherName,canonicalUrl:article.canonicalUrl,sourceTitle:article.title,sourcePublishedDate:article.sourcePublishedDate||'',contentLanguage:language,segmentId:classification.segmentId,subcategoryId:classification.subcategoryId,confidence:classification.confidence,action:'skip_duplicate',duplicateStatus:'exact',reportId:exact[0]?.complaintId||'',reason:'Exact source URL already exists in the report database.'});return;}
      if(duplicateStatus==='match'){const matches=(Array.isArray(preview?.duplicate?.candidates)?preview.duplicate.candidates:[]).filter((item)=>item?.matchLevel==='match');const strong=matches.length===1&&Number(matches[0]?.score||0)>=90?matches[0]:null;if(strong?.complaintId){const {error:mergeError}=await supabase.rpc('admin_merge_intake_source',{p_complaint_id:String(strong.complaintId),p_source:payload.source});if(mergeError)throw new Error(mergeError.message);await record({sourceHostname:source.hostname,publisherName:article.publisherName,canonicalUrl:article.canonicalUrl,sourceTitle:article.title,sourcePublishedDate:article.sourcePublishedDate||'',contentLanguage:language,segmentId:classification.segmentId,subcategoryId:classification.subcategoryId,confidence:classification.confidence,action:'merged_source',duplicateStatus:'match',reportId:String(strong.complaintId),reason:'Strong same-incident match; source merged into the existing sourced report.'});return;}}
      if(duplicateStatus==='match'||duplicateStatus==='review'){await record({sourceHostname:source.hostname,publisherName:article.publisherName,canonicalUrl:article.canonicalUrl,sourceTitle:article.title,sourcePublishedDate:article.sourcePublishedDate||'',contentLanguage:language,segmentId:classification.segmentId,subcategoryId:classification.subcategoryId,confidence:classification.confidence,action:'needs_review',duplicateStatus,reason:'Possible same incident detected. No new report was created automatically.'});return;}
      const {data:created,error:createError}=await supabase.rpc('admin_create_sourced_report_from_intake',{p_payload:payload});if(createError)throw new Error(createError.message);await record({sourceHostname:source.hostname,publisherName:article.publisherName,canonicalUrl:article.canonicalUrl,sourceTitle:article.title,sourcePublishedDate:article.sourcePublishedDate||'',contentLanguage:language,segmentId:classification.segmentId,subcategoryId:classification.subcategoryId,confidence:classification.confidence,action:'created_draft',duplicateStatus:String(created?.duplicate?.status||'clear'),reportId:String(created?.reportId||''),reason:created?.canPublishImmediately?'Source-grounded draft created; publication remains a separate admin action.':'Draft created, but duplicate review is still required before publication.'});
    } catch(error){processingErrors+=1;await record({sourceHostname:String(source.hostname||'unknown'),publisherName:String(source.publisherName||'Unknown source'),canonicalUrl:originalUrl,contentLanguage:String(source.languageHint||'unknown'),action:'error',duplicateStatus:'unavailable',reason:clip(error instanceof Error?error.message:'Article processing failed.',1400)}).catch(()=>{});} });
    const {data:finishData,error:finishError}=await supabase.rpc('admin_finish_news_intake_run',{p_run_id:runId,p_status:processingErrors>0?'partial':'completed',p_error:null}); if(finishError) throw new Error(finishError.message); return finishData;
  } catch(error){fatalMessage=error instanceof Error?error.message:'Automated News Intake failed.';await supabase.rpc('admin_finish_news_intake_run',{p_run_id:runId,p_status:'failed',p_error:fatalMessage}).catch(()=>{});throw new Error(fatalMessage);}
};

Deno.serve(async (req) => {
  if(req.method==="OPTIONS") return new Response("ok",{headers:corsHeaders});
  if(req.method!=="POST") return json({error:"Method not allowed."},405);
  try {
    const authHeader=req.headers.get("Authorization")??"";
    if(!authHeader.startsWith("Bearer ")) return json({error:"Authentication required."},401);
    const supabaseUrl=Deno.env.get("SUPABASE_URL")??"";
    const publishableKey=req.headers.get("apikey")??Deno.env.get("SUPABASE_ANON_KEY")??"";
    if(!supabaseUrl||!publishableKey) return json({error:"Function configuration error."},500);
    const supabase=createClient(supabaseUrl,publishableKey,{global:{headers:{Authorization:authHeader}},auth:{persistSession:false,autoRefreshToken:false}});
    const token=authHeader.slice("Bearer ".length);
    const {error:userError}=await supabase.auth.getUser(token);
    if(userError) return json({error:"Invalid session."},401);
    const result=await runAutomatedScan(supabase);
    return json(result);
  } catch(error) {
    const message=error instanceof Error?error.message:"Automated News Intake failed.";
    return json({error:message},400);
  }
});