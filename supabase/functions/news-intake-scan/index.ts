import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.4";
import {
  MAX_ARTICLE_AGE_DAYS,
  articleAgeDays,
  buildIncidentContext,
  buildIncidentFocusedLocationText,
  buildSourceLanguageFields,
  classifyArticle,
  clip,
  detectLanguage,
  findLocation,
  inferDistrictWideScope,
  inferChildIncidentType,
  inferIncidentDate,
  inferSpecificLocationPhrase,
  isKnownPublisherArticlePath,
  isLikelyForeignIncident,
  isUnsupportedArticleType,
  scoreDiscoveryLink,
} from "../_shared/newsIntakeAutomationCore.ts";

const ALLOWED_ORIGINS = new Set([
  "https://shihabshajib01-cell.github.io",
  "https://admin.shobaikejanao.com",
  "https://shobaikejanao.com",
  "http://localhost:5173",
  "http://localhost:3000",
]);

const corsHeadersFor = (req: Request) => {
  const origin = req.headers.get("Origin") || "";
  return {
    ...(ALLOWED_ORIGINS.has(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-news-intake-scheduler",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
};

const json = (req: Request, body: unknown, status=200) => new Response(JSON.stringify(body), {
  status,
  headers:{...corsHeadersFor(req),"Content-Type":"application/json"},
});

const decodeEntities = (value: unknown) => String(value || "")
  .replace(/&nbsp;|&#160;/gi," ")
  .replace(/&amp;/gi,"&")
  .replace(/&quot;/gi,'"')
  .replace(/&#39;|&apos;/gi,"'")
  .replace(/&lt;/gi,"<")
  .replace(/&gt;/gi,">")
  .replace(/&#(\d+);/g,(_,code)=>String.fromCharCode(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi,(_,code)=>String.fromCharCode(parseInt(code,16)))
  .replace(/\s+/g," ")
  .trim();

const attr = (tag: string,name: string) => {
  const match=tag.match(new RegExp("\\b"+name+"\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))","i"));
  return decodeEntities(match?.[1] ?? match?.[2] ?? match?.[3] ?? "");
};

const metaContent = (html: string,keys: string[]) => {
  const tags=String(html||"").match(/<meta\b[^>]*>/gi)??[];
  for(const tag of tags){
    const key=(attr(tag,"property")||attr(tag,"name")||attr(tag,"itemprop")).toLowerCase();
    if(keys.includes(key)){
      const content=attr(tag,"content");
      if(content)return content;
    }
  }
  return "";
};

const linkHref = (html: string,relName: string) => {
  const tags=String(html||"").match(/<link\b[^>]*>/gi)??[];
  for(const tag of tags){
    const rel=attr(tag,"rel").toLowerCase().split(/\s+/);
    if(rel.includes(relName)){
      const href=attr(tag,"href");
      if(href)return href;
    }
  }
  return "";
};

const pageTitle = (html: string) => {
  const match=String(html||"").match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return match?decodeEntities(match[1]):"";
};

const DATE_BN_DIGITS: Record<string,string> = {
  '০':'0','১':'1','২':'2','৩':'3','৪':'4','৫':'5','৬':'6','৭':'7','৮':'8','৯':'9'
};
const DATE_MONTHS: Record<string,number> = {
  january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,september:9,october:10,november:11,december:12,
  'জানুয়ারি':1,'জানুয়ারি':1,'ফেব্রুয়ারি':2,'ফেব্রুয়ারি':2,'মার্চ':3,'এপ্রিল':4,'মে':5,'জুন':6,'জুলাই':7,'আগস্ট':8,'সেপ্টেম্বর':9,'অক্টোবর':10,'নভেম্বর':11,'ডিসেম্বর':12
};
const publishedYmd = (year:number,month:number,day:number) => {
  const value=new Date(Date.UTC(year,month-1,day));
  if(value.getUTCFullYear()!==year||value.getUTCMonth()!==month-1||value.getUTCDate()!==day)return null;
  return year+"-"+String(month).padStart(2,'0')+"-"+String(day).padStart(2,'0');
};
const normalizedDate = (raw: unknown) => {
  if(!raw)return null;
  const value=String(raw)
    .replace(/[০-৯]/g,(digit)=>DATE_BN_DIGITS[digit]||digit)
    .replace(/\s+/g,' ')
    .trim();
  const iso=value.match(/\b(20\d{2})[-\/.](0?[1-9]|1[0-2])[-\/.]([0-2]?\d|3[01])\b/);
  if(iso)return publishedYmd(Number(iso[1]),Number(iso[2]),Number(iso[3]));
  const dmy=value.match(/\b([0-2]?\d|3[01])[-\/.](0?[1-9]|1[0-2])[-\/.](20\d{2})\b/);
  if(dmy)return publishedYmd(Number(dmy[3]),Number(dmy[2]),Number(dmy[1]));

  const monthPattern=Object.keys(DATE_MONTHS)
    .sort((a,b)=>b.length-a.length)
    .map((name)=>name.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&'))
    .join('|');
  const namedDayFirst=value.match(new RegExp('\\b(\\d{1,2})\\s+('+monthPattern+')\\s*,?\\s*(20\\d{2})\\b','iu'));
  if(namedDayFirst){
    const month=DATE_MONTHS[namedDayFirst[2].toLowerCase()]||DATE_MONTHS[namedDayFirst[2]];
    return publishedYmd(Number(namedDayFirst[3]),month,Number(namedDayFirst[1]));
  }
  const namedMonthFirst=value.match(new RegExp('\\b('+monthPattern+')\\s+(\\d{1,2}),?\\s+(20\\d{2})\\b','iu'));
  if(namedMonthFirst){
    const month=DATE_MONTHS[namedMonthFirst[1].toLowerCase()]||DATE_MONTHS[namedMonthFirst[1]];
    return publishedYmd(Number(namedMonthFirst[3]),month,Number(namedMonthFirst[2]));
  }

  const parsed=new Date(value);
  return Number.isNaN(parsed.getTime())?null:parsed.toISOString().slice(0,10);
};

async function readLimited(response: Response,limit=1024*1024){
  const reader=response.body?.getReader();
  if(!reader)return "";
  const decoder=new TextDecoder();
  let total=0,html="";
  while(true){
    const {done,value}=await reader.read();
    if(done)break;
    total+=value.byteLength;
    if(total>limit){
      await reader.cancel();
      break;
    }
    html+=decoder.decode(value,{stream:true});
  }
  html+=decoder.decode();
  return html;
}

const stripTags = (value: unknown) => decodeEntities(String(value || '')
  .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim());

const MAX_SOURCES = 20;
const MAX_ARTICLES_PER_SOURCE = 6;
const MAX_TOTAL_ARTICLES = 54;
const FETCH_TIMEOUT_MS = 7000;

const extractJsonLdArticle = (html: string) => {
  const scripts = [...String(html || '').matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const nodes: any[] = [];
  const walk = (value: any) => {
    if (!value) return;
    if (Array.isArray(value)) return value.forEach(walk);
    if (typeof value === 'object') {
      nodes.push(value);
      for (const child of Object.values(value)) {
        if (child && typeof child === 'object') walk(child);
      }
    }
  };
  for (const script of scripts.slice(0,10)) {
    try {
      walk(JSON.parse(decodeEntities(script[1]).replace(/^<!--|-->$/g,'')));
    } catch {}
  }
  return nodes.find((node) => {
    const type = Array.isArray(node['@type']) ? node['@type'].join(' ') : String(node['@type'] || '');
    return /NewsArticle|Article|ReportageNewsArticle/i.test(type);
  }) || null;
};

const extractPublishedDate = (html: string, jsonLd: any) => {
  const timeTag=[...String(html||'').matchAll(/<time\b[^>]*>/gi)]
    .map((match)=>attr(match[0],'datetime'))
    .find(Boolean) || '';
  const itemPropTag=[...String(html||'').matchAll(/<(?:meta|time)\b[^>]*>/gi)]
    .find((match)=>/\bitemprop\s*=\s*["']?datepublished["']?/i.test(match[0]))?.[0] || '';
  const itemPropDate=itemPropTag
    ? (attr(itemPropTag,'content') || attr(itemPropTag,'datetime'))
    : '';
  const scriptDate=String(html||'').match(
    /["'](?:datePublished|date_published|published_at|publishDate|publicationDate|dateCreated)["']\s*:\s*["']([^"']+)["']/i
  )?.[1] || '';
  const visibleHeader=stripTags(String(html||'').slice(0,250000)).slice(0,14000);
  const visibleDate=visibleHeader.match(
    /(?:প্রকাশ(?:িত)?|আপডেট|published(?:\s+on)?|publication\s+date)\s*[:\-]?\s*([^|।\n]{4,80})/iu
  )?.[1] || '';

  const candidates=[
    jsonLd?.datePublished,
    jsonLd?.dateCreated,
    metaContent(html,[
      'article:published_time',
      'article:published',
      'published_time',
      'datepublished',
      'date-published',
      'publishdate',
      'publish_date',
      'publication_date',
      'datecreated',
      'date_created',
      'pubdate',
      'date',
    ]),
    itemPropDate,
    timeTag,
    scriptDate,
    visibleDate,
  ];

  for (const candidate of candidates) {
    const normalized=normalizedDate(candidate);
    if(normalized)return normalized;
  }
  return null;
};

const extractArticle = (html: string, finalUrl: string, publisherFallback: string) => {
  const jsonLd = extractJsonLdArticle(html);
  const title = String(
    jsonLd?.headline ||
    metaContent(html,['og:title','twitter:title','headline']) ||
    pageTitle(html) ||
    ''
  ).trim();
  const publisherName = String(
    metaContent(html,['og:site_name','application-name']) ||
    jsonLd?.publisher?.name ||
    publisherFallback ||
    new URL(finalUrl).hostname
  ).trim();
  const description = String(
    jsonLd?.description ||
    metaContent(html,['og:description','twitter:description','description']) ||
    ''
  ).trim();
  const canonicalRaw = linkHref(html,'canonical') || finalUrl;
  let canonicalUrl = finalUrl;
  try { canonicalUrl = new URL(canonicalRaw,finalUrl).toString(); } catch {}
  const sourcePublishedDate = extractPublishedDate(html,jsonLd);
  const articleMatch = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  let body = String(jsonLd?.articleBody || '').trim();
  if (!body) {
    const scope = articleMatch?.[1] || html;
    body = [...scope.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((m)=>stripTags(m[1]))
      .filter((text)=>text.length>=35)
      .slice(0,20)
      .join(' ');
  }
  body = clip(stripTags(body),12000);
  const excerpt = clip(description || body,1800);
  // Do not treat a section/index page as a news article merely because it has
  // an OpenGraph title. A real article must expose article JSON-LD, an
  // <article> element, or a publication date together with substantive body text.
  const articleDocumentSignal = Boolean(
    jsonLd ||
    articleMatch ||
    (sourcePublishedDate && body.length >= 300)
  );
  return {
    title:clip(title,500),
    publisherName:clip(publisherName,160),
    canonicalUrl,
    sourcePublishedDate,
    body,
    excerpt,
    articleDocumentSignal,
  };
};

const canonicalHostKey = (hostname: string) => hostname.toLowerCase().replace(/^www\./,'');

const isLikelyArticlePath = (url: URL, anchorText: string, baseUrl: string) => {
  const path=url.pathname.toLowerCase();
  const encodedTemplateUrl=url.toString().toLowerCase();
  if (/%7b|%7d|\{\{|\}\}/i.test(encodedTemplateUrl)) return false;
  if (!path || path==='/') return false;
  if (canonicalHostKey(url.hostname) !== canonicalHostKey(new URL(baseUrl).hostname)) return false;
  if (/\.(jpg|jpeg|png|gif|webp|svg|pdf|mp4|mp3)$/i.test(path)) return false;
  if (/(\/tag\/|\/topic\/|\/category\/|\/author\/|\/search(?:\/|$)|\/videos?(?:\/|$)|\/m\/video(?:\/|$)|\/photo(?:\/|$)|\/epaper|\/archive|\/contact|\/privacy|\/terms|\/careers?(?:\/|$)|\/jobs?(?:\/|$)|\/cdn-cgi(?:\/|$)|\/opinion(?:\/|$)|\/editorials?(?:\/|$)|\/analysis(?:\/|$)|\/features?(?:\/|$)|\/lifestyle(?:\/|$)|\/sports?(?:\/|$)|\/cricket(?:\/|$)|\/entertainment(?:\/|$)|\/multimedia(?:\/|$)|\/star-multimedia(?:\/|$)|\/law-our-rights(?:\/|$)|\/investigative-stories(?:\/|$)|\/books-literature(?:\/|$)|\/health-fitness(?:\/|$))/i.test(path)) return false;
  const cleanText=stripTags(anchorText);
  if (cleanText.length<16) return false;
  if (/^(home|latest|latest news|all news|news|bangladesh|national|country|crime\s*&\s*justice|crime and justice|politics|business|education|world|জাতীয়|সর্বশেষ|দেশ|রাজনীতি|ব্যবসা|শিক্ষা|আরও|আরও দেখুন|more)$/iu.test(cleanText)) return false;

  const host=canonicalHostKey(url.hostname);
  const segments=path.split('/').filter(Boolean);
  if (host.endsWith('thedailystar.net') && /^\/news\/[^/]+\/?$/i.test(path)) return false;
  if (segments.length<=2 && !/\d{4}|\d{5,}/.test(path) && /^(news|bangladesh|national|country|crime|crime-justice|politics|business|education|world|saradesh|samagrabangladesh)$/i.test(segments[segments.length-1]||'')) return false;

  return segments.length>=2 || /\d{4}|\d{5,}/.test(path);
};

const extractArticleLinks = (html: string, baseUrl: string) => {
  const seen=new Set<string>();
  const out: Array<{url:string;anchorText:string;score:number;index:number}> = [];
  let index=0;
  for (const match of String(html||'').matchAll(/<a\b[^>]*href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi)) {
    const raw=match[1]||match[2]||match[3]||'';
    const anchorText=stripTags(match[4]);
    try {
      const url=new URL(raw,baseUrl);
      url.hash='';
      ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','fbclid','gclid'].forEach((key)=>url.searchParams.delete(key));
      if (url.protocol!=='https:' || !isLikelyArticlePath(url,anchorText,baseUrl)) continue;
      const key=url.toString();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({url:key,anchorText,score:scoreDiscoveryLink(key,anchorText),index:index++});
    } catch {}
    if (out.length>=40) break;
  }
  return out
    .sort((a,b)=>a.score-b.score || a.index-b.index)
    .slice(0,MAX_ARTICLES_PER_SOURCE);
};

const mapLimit = async <T,R>(items: T[], limit: number, worker: (item:T,index:number)=>Promise<R>) => {
  const results=new Array<R | undefined>(items.length);
  let cursor=0;
  const runners=Array.from({length:Math.min(limit,items.length)},async()=>{
    while(true){
      const index=cursor++;
      if(index>=items.length) break;
      // Every source/article worker already records expected per-item failures.
      // Let unexpected exceptions escape so a run cannot silently lose items.
      results[index]=await worker(items[index],index);
    }
  });
  await Promise.all(runners);
  return results;
};

const buildReportPayload = (
  article: any,
  classification: any,
  location: any | null,
  incidentDate: string | null,
  language: string
) => {
  const source = {
    sourceType:'news',
    publisherName:article.publisherName,
    sourceTitle:article.title,
    canonicalUrl:article.canonicalUrl,
    sourcePublishedDate:article.sourcePublishedDate || '',
  };
  const text = `${article.title} ${article.excerpt} ${article.body}`;
  const mobOutcome = /(নিহত|মৃত্যু|death|died|killed)/iu.test(text)
    ? 'death_reported'
    : /(গুরুতর আহত|seriously injured)/iu.test(text)
      ? 'seriously_injured'
      : /(আহত|injured|assaulted|পিটুনি|মারধর)/iu.test(text)
        ? 'physically_assaulted'
        : 'unknown';
  const mobTrigger = /(ছিনতাই|snatching)/iu.test(text)
    ? 'snatching_allegation'
    : /(চুরি|ডাকাতি|theft|robbery|dacoity)/iu.test(text)
      ? 'suspected_theft_robbery'
      : /(অপহরণ|kidnap)/iu.test(text)
        ? 'kidnapping_allegation'
        : /(যৌন|sexual)/iu.test(text)
          ? 'sexual_offence_allegation'
          : 'unknown';
  const childIncidentType =
    classification.subcategoryId === 'child_abduction_murder'
      ? inferChildIncidentType(text)
      : null;

  const fields=buildSourceLanguageFields(
    article.title,
    buildIncidentContext(article),
    language
  );

  return {
    source,
    report:{
      segmentId:classification.segmentId,
      subcategoryId:classification.subcategoryId,
      // The legacy DB keys are named *Bn, but for sourced reports the primary
      // fields intentionally store the source language only.
      titleBn:fields.titlePrimary,
      titleEn:'',
      descriptionBn:fields.descriptionPrimary,
      descriptionEn:'',
      incidentDate:incidentDate || '',
      incidentTime:'',
      utilityEndTime:'',
      frequency:'one-time',
      priority:'medium',
      division:location?.division || '',
      district:location?.district || '',
      upazilaOrThana:location?.upazilaOrThana || '',
      area:location?.area || '',
      road:location?.road || '',
      landmark:location?.landmark || '',
      formattedAddress:location?.formattedAddress || '',
      relationshipContext:'',
      recentBillMonth:'',
      recentBillAmount:'',
      previousBillMonth:'',
      previousBillAmount:'',
      briberyDepartment:'',
      briberyService:'',
      briberyAmount:'',
      affectedPersonAgeGroup:classification.segmentId === 'harassment' ? 'unknown_not_stated' : '',
      allegedAbuserRelationship:classification.segmentId === 'harassment' ? 'unknown_not_stated' : '',
      reportingFor:classification.segmentId === 'harassment' ? 'someone_else' : '',
      sexualHarassmentType:classification.subcategoryId === 'sexual-harassment' ? 'unknown_not_stated' : '',
      sexualHarassmentContext:classification.subcategoryId === 'sexual-harassment' ? 'unknown_not_stated' : '',
      sexualHarassmentInstitution:'',
      intimateWhatHappened:'',
      intimatePlatform:'',
      mobJusticeDetails:classification.subcategoryId === 'mob-justice'
        ? { trigger:mobTrigger, outcome:mobOutcome, ongoingStatus:'unknown' }
        : null,
      customFieldAnswers:{
        sourceLanguage:fields.sourceLanguage,
        automatedIntake:true,
        trustedSourceAuto:true,
        sourceTruthMode:'approved_publisher',
        sourceOmittedFields:[
          ...(!incidentDate ? ['incidentDate'] : []),
          ...(!location ? ['location'] : []),
        ],
        locationScope:!location
          ? 'source_unspecified'
          : location.locationScope === 'district_wide'
            ? 'district_wide'
            : 'specific',
        ...(classification.subcategoryId === 'child_abduction_murder'
          ? {
              childIncidentType:childIncidentType || 'unknown_not_stated',
            }
          : {}),
      },
    },
  };
};

const buildAutomationReviewPayload = (
  article: any,
  classification: any,
  language: string,
  reviewFields: string[],
  location?: any,
  incidentDate?: string | null
) => {
  const safeLocation = location || {
    division:'',
    district:'',
    upazilaOrThana:'',
    area:'',
    road:'',
    landmark:'',
    formattedAddress:'',
    locationScope:'specific',
  };
  const payload = buildReportPayload(
    article,
    classification,
    safeLocation,
    incidentDate || '',
    language
  );
  return {
    ...payload,
    reviewFields:Array.from(new Set(reviewFields.filter(Boolean))),
  };
};

const isUnsafeNetworkHostname = (hostname: string) => {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host === "::1" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  const parts = host.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a,b] = parts;
  return a === 10
    || a === 127
    || a === 0
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 100 && b >= 64 && b <= 127)
    || a >= 224;
};


const isPrivateOrReservedIp = (raw: string): boolean => {
  const value = raw.trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (!value) return true;

  if (value.includes(':')) {
    if (
      value === '::' ||
      value === '::1' ||
      value.startsWith('fc') ||
      value.startsWith('fd') ||
      /^fe[89ab]/.test(value) ||
      value.startsWith('ff') ||
      value.startsWith('2001:db8:')
    ) return true;

    const mapped = value.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateOrReservedIp(mapped[1]);
    return false;
  }

  const parts = value.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }
  const [a,b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 2) ||
    (a === 198 && (b === 18 || b === 19 || b === 51)) ||
    (a === 203 && b === 0) ||
    a >= 224
  );
};

const resolvePublicHost = async (hostname: string): Promise<Set<string>> => {
  const host = hostname.trim().toLowerCase().replace(/\.$/, '');
  if (
    !host ||
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    throw new Error('Unsafe source hostname blocked.');
  }

  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host) || host.includes(':')) {
    if (isPrivateOrReservedIp(host)) throw new Error('Private or reserved source address blocked.');
    return new Set([host]);
  }

  const resolved = new Set<string>();
  try {
    for (const address of await Deno.resolveDns(host, 'A')) resolved.add(String(address));
  } catch {}
  try {
    for (const address of await Deno.resolveDns(host, 'AAAA')) resolved.add(String(address));
  } catch {}

  if (resolved.size === 0) throw new Error('Source hostname could not be resolved safely.');
  for (const address of resolved) {
    if (isPrivateOrReservedIp(address)) {
      throw new Error('Source hostname resolves to a private or reserved address.');
    }
  }
  return resolved;
};

const addressSetsOverlap = (left: Set<string>, right: Set<string>): boolean => {
  for (const address of left) {
    if (right.has(address)) return true;
  }
  return false;
};

const assertStablePublicResolution = async (hostname: string): Promise<Set<string>> => {
  const first = await resolvePublicHost(hostname);
  const second = await resolvePublicHost(hostname);
  if (!addressSetsOverlap(first, second)) {
    throw new Error('Source DNS changed during validation; request blocked.');
  }
  return new Set([...first, ...second]);
};

const safeScanFetch = async (
  initialUrl: string,
  checkDomain: (url:string)=>Promise<any>,
  accept='text/html,application/xhtml+xml'
) => {
  let current=new URL(initialUrl);
  if(current.protocol!=='https:'||current.username||current.password||current.port||isUnsafeNetworkHostname(current.hostname)) {
    throw new Error('Unsafe source URL blocked.');
  }
  let validatedAddresses=await assertStablePublicResolution(current.hostname);
  let domain=await checkDomain(current.toString());
  if(!domain?.approved) throw new Error(`SOURCE_DOMAIN_NOT_APPROVED:${current.hostname}`);

  let response: Response | null=null;
  for(let redirectCount=0;redirectCount<=3;redirectCount+=1){
    response=await fetch(current.toString(),{
      redirect:'manual',
      headers:{
        'User-Agent':'SobaiKeJanao-NewsIntake/3.0 (+https://shobaikejanao.com/)',
        'Accept':accept,
        'Accept-Language':'bn-BD,bn;q=0.9,en;q=0.8',
      },
      signal:AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    const postFetchAddresses=await resolvePublicHost(current.hostname);
    if(!addressSetsOverlap(validatedAddresses,postFetchAddresses)){
      throw new Error('Source DNS changed during fetch; response blocked.');
    }

    if(response.status>=300&&response.status<400){
      const location=response.headers.get('location');
      if(!location||redirectCount===3) throw new Error('Source redirect could not be resolved.');
      const next=new URL(location,current);
      if(next.protocol!=='https:'||next.username||next.password||next.port||isUnsafeNetworkHostname(next.hostname)) {
        throw new Error('Unsafe source redirect blocked.');
      }
      validatedAddresses=await assertStablePublicResolution(next.hostname);
      domain=await checkDomain(next.toString());
      if(!domain?.approved) throw new Error(`SOURCE_DOMAIN_NOT_APPROVED:${next.hostname}`);
      current=next;
      continue;
    }
    break;
  }
  if(!response||!response.ok) throw new Error(`Source returned HTTP ${response?.status||0}.`);
  const declaredLength=Number(response.headers.get('content-length')||0);
  if(declaredLength>2*1024*1024) throw new Error('Source page is too large to inspect safely.');
  const contentType=(response.headers.get('content-type')||'').toLowerCase();
  if(!/(text\/html|application\/xhtml\+xml|application\/xml|text\/xml|application\/rss\+xml|application\/atom\+xml)/i.test(contentType)) {
    throw new Error('Source did not return readable HTML/XML.');
  }
  const html=await readLimited(response);
  if(!html) throw new Error('Source returned no readable content.');
  return {html,finalUrl:current.toString(),domain};
};

const processNewsIntakeRun = async (
  supabase: any,
  runId: string,
  triggerType: 'manual' | 'automatic'
) => {
  const record=async(item:any)=>{
    const {error}=await supabase.rpc('admin_record_news_intake_item',{
      p_run_id:runId,
      p_item:item,
    });
    if(error) throw new Error(error.message);
  };

  const checkDomain=async(url:string)=>{
    const {data,error}=await supabase.rpc('admin_check_news_source_domain',{p_url:url});
    if(error) throw new Error(error.message);
    return data;
  };

  let fatalMessage='';
  let processingErrors=0;

  try {
    const {data:sourceData,error:sourceError}=await supabase.rpc('admin_get_news_intake_scan_sources');
    if(sourceError) throw new Error(sourceError.message);
    const sources=(Array.isArray(sourceData)?sourceData:[]).slice(0,MAX_SOURCES);
    const discovered:any[]=[];

    await mapLimit(sources,4,async(source:any)=>{
      try {
        const fetched=await safeScanFetch(String(source.homepageUrl),checkDomain);
        const links=extractArticleLinks(fetched.html,fetched.finalUrl);
        if(!links.length){
          processingErrors+=1;
          await record({
            itemKind:'source',
            sourceHostname:source.hostname,
            publisherName:source.publisherName,
            canonicalUrl:source.homepageUrl,
            contentLanguage:source.languageHint||'unknown',
            action:'error',
            duplicateStatus:'unavailable',
            reason:'No article links were discoverable from the configured source page.',
          });
          return;
        }
        links.forEach((link,rank)=>discovered.push({source,...link,rank}));
      } catch(error) {
        processingErrors+=1;
        await record({
          itemKind:'source',
          sourceHostname:String(source.hostname||'unknown'),
          publisherName:String(source.publisherName||'Unknown source'),
          canonicalUrl:String(source.homepageUrl||'https://invalid.example/'),
          contentLanguage:String(source.languageHint||'unknown'),
          action:'error',
          duplicateStatus:'unavailable',
          reason:clip(error instanceof Error?error.message:'Source scan failed.',1400),
        }).catch(()=>{});
      }
    });

    const candidates=discovered
      .sort((a,b)=>
        Number(a.rank||0)-Number(b.rank||0)
        || Number(a.score||2)-Number(b.score||2)
        || Number(a.source?.priority||50)-Number(b.source?.priority||50)
      )
      .slice(0,MAX_TOTAL_ARTICLES);

    await mapLimit(candidates,5,async(candidate:any)=>{
      const source=candidate.source;
      const originalUrl=candidate.url;
      try {
        const fetched=await safeScanFetch(originalUrl,checkDomain);
        const article=extractArticle(fetched.html,fetched.finalUrl,source.publisherName);
        if(!article.title||article.title.length<8){
          processingErrors+=1;
          await record({
            itemKind:'article',
            sourceHostname:source.hostname,
            publisherName:source.publisherName,
            canonicalUrl:originalUrl,
            contentLanguage:source.languageHint||'unknown',
            action:'error',
            duplicateStatus:'unavailable',
            reason:'Article title could not be extracted.',
          });
          return;
        }

        const knownPublisherDocumentFallback=Boolean(
          isKnownPublisherArticlePath(article.canonicalUrl)
          && article.sourcePublishedDate
          && article.title.length>=20
          && (article.excerpt.length>=80 || article.body.length>=120)
        );

        if(!article.articleDocumentSignal && !knownPublisherDocumentFallback){
          await record({
            itemKind:'article',
            sourceHostname:source.hostname,
            publisherName:article.publisherName,
            canonicalUrl:article.canonicalUrl,
            sourceTitle:article.title,
            sourcePublishedDate:article.sourcePublishedDate||'',
            contentLanguage:source.languageHint||'unknown',
            action:'discovered',
            duplicateStatus:'unavailable',
            reason:'Section, homepage, or non-article URL was excluded from automated intake.',
          });
          return;
        }

        let finalPathLooksLikeArticle=false;
        try {
          finalPathLooksLikeArticle=isLikelyArticlePath(
            new URL(article.canonicalUrl),
            article.title,
            String(source.homepageUrl)
          );
        } catch {}
        if(!finalPathLooksLikeArticle){
          await record({
            itemKind:'article',
            sourceHostname:source.hostname,
            publisherName:article.publisherName,
            canonicalUrl:article.canonicalUrl,
            sourceTitle:article.title,
            sourcePublishedDate:article.sourcePublishedDate||'',
            contentLanguage:source.languageHint||'unknown',
            action:'discovered',
            duplicateStatus:'unavailable',
            reason:'Section, homepage, or non-article URL was excluded from automated intake.',
          });
          return;
        }

        const canonicalCheck=await checkDomain(article.canonicalUrl);
        if(!canonicalCheck?.approved) article.canonicalUrl=fetched.finalUrl;
        const finalDomain=await checkDomain(article.canonicalUrl);
        article.publisherName=finalDomain?.publisherName || source.publisherName;

        const fullText=`${article.title} ${article.excerpt} ${article.body}`;
        const headlineText=`${article.title} ${article.excerpt}`;
        const detected=detectLanguage(fullText);
        const language=detected==='unknown'?(source.languageHint||'unknown'):detected;

        if(isUnsupportedArticleType(article.canonicalUrl,article.title)){
          await record({
            itemKind:'article',
            sourceHostname:source.hostname,
            publisherName:article.publisherName,
            canonicalUrl:article.canonicalUrl,
            sourceTitle:article.title,
            sourcePublishedDate:article.sourcePublishedDate||'',
            contentLanguage:language,
            action:'discovered',
            duplicateStatus:'unavailable',
            reason:'Non-incident opinion/editorial/feature/media content was excluded.',
          });
          return;
        }

        const classification=classifyArticle(headlineText);
        if(!classification){
          await record({
            itemKind:'article',
            sourceHostname:source.hostname,
            publisherName:article.publisherName,
            canonicalUrl:article.canonicalUrl,
            sourceTitle:article.title,
            sourcePublishedDate:article.sourcePublishedDate||'',
            contentLanguage:language,
            action:'discovered',
            duplicateStatus:'unavailable',
            reason:'No supported incident category matched in the article headline or summary with enough confidence.',
          });
          return;
        }

        if(isLikelyForeignIncident(article.title,article.canonicalUrl,fullText)){
          await record({
            itemKind:'article',
            sourceHostname:source.hostname,
            publisherName:article.publisherName,
            canonicalUrl:article.canonicalUrl,
            sourceTitle:article.title,
            sourcePublishedDate:article.sourcePublishedDate||'',
            contentLanguage:language,
            segmentId:classification.segmentId,
            subcategoryId:classification.subcategoryId,
            confidence:classification.confidence,
            action:'discovered',
            duplicateStatus:'unavailable',
            reason:'Incident is outside the Bangladesh reporting scope.',
          });
          return;
        }

        const ageDays=articleAgeDays(article.sourcePublishedDate);
        if(ageDays !== null && ageDays>MAX_ARTICLE_AGE_DAYS){
          await record({
            itemKind:'article',
            sourceHostname:source.hostname,
            publisherName:article.publisherName,
            canonicalUrl:article.canonicalUrl,
            sourceTitle:article.title,
            sourcePublishedDate:article.sourcePublishedDate||'',
            contentLanguage:language,
            segmentId:classification.segmentId,
            subcategoryId:classification.subcategoryId,
            confidence:classification.confidence,
            action:'discovered',
            duplicateStatus:'unavailable',
            reason:'Outside the 7-day automated intake window.',
            reviewPayload:buildAutomationReviewPayload(
              article,
              classification,
              language,
              ['incidentDate','location']
            ),
          });
          return;
        }
        if(ageDays !== null && ageDays < -1){
          await record({
            itemKind:'article',
            sourceHostname:source.hostname,
            publisherName:article.publisherName,
            canonicalUrl:article.canonicalUrl,
            sourceTitle:article.title,
            sourcePublishedDate:article.sourcePublishedDate||'',
            contentLanguage:language,
            segmentId:classification.segmentId,
            subcategoryId:classification.subcategoryId,
            confidence:classification.confidence,
            action:'discovered',
            duplicateStatus:'unavailable',
            reason:'Source publication date is unexpectedly in the future; article excluded from this run.',
          });
          return;
        }

        const locationText=`${article.title} ${article.excerpt} ${article.body.slice(0,6000)}`;
        const focusedLocationText=buildIncidentFocusedLocationText(article);
        let location:any=null;
        try{
          const {data:focusedLocation,error:focusedLocationError}=await supabase.rpc(
            'admin_resolve_news_intake_location',
            {p_text:focusedLocationText,p_language:language}
          );
          if(focusedLocationError) throw new Error(focusedLocationError.message);

          if(
            focusedLocation &&
            String(focusedLocation.quality||'') !== 'multiple_locations'
          ){
            location=focusedLocation;
          } else {
            const {data:resolvedLocation,error:locationError}=await supabase.rpc(
              'admin_resolve_news_intake_location',
              {p_text:locationText,p_language:language}
            );
            if(locationError) throw new Error(locationError.message);
            location=resolvedLocation;
          }
        }catch{
          const districtOnly=
            findLocation(focusedLocationText)
            || findLocation(article.title)
            || findLocation(article.excerpt)
            || findLocation(article.body.slice(0,3500));
          location=districtOnly
            ? {
                ...districtOnly,
                upazilaOrThana:'',
                area:'',
                road:'',
                landmark:'',
                formattedAddress:'',
                locationScope:'district_only',
                quality:'district_only',
              }
            : null;
        }

        const contextualDistrict=
          findLocation(focusedLocationText)
          || findLocation(article.title)
          || findLocation(article.excerpt)
          || findLocation(locationText);

        if(location?.quality === 'multiple_locations' || location?.locationScope === 'multi_location'){
          location=null;
        }else if(
          contextualDistrict?.district
          && location?.district
          && String(contextualDistrict.district) !== String(location.district)
        ){
          location={
            ...contextualDistrict,
            upazilaOrThana:'',
            area:'',
            road:'',
            landmark:'',
            formattedAddress:'',
            locationScope:'district_only',
            quality:'district_only',
          };
        }

        const fallbackDistrict=
          location?.district
            ? {division:location.division,district:location.district}
            : (
                findLocation(article.title)
                || findLocation(article.excerpt)
                || findLocation(article.body.slice(0,5000))
              );
        if(!location && fallbackDistrict){
          location={
            ...fallbackDistrict,
            upazilaOrThana:'',
            area:'',
            road:'',
            landmark:'',
            formattedAddress:'',
            locationScope:'district_only',
            quality:'district_only',
          };
        }

        // Preserve canonical multi-location results without inventing one specific place.
        if(
          location
          && location.quality !== 'multiple_locations'
          && location.locationScope !== 'multi_location'
        ){
          const specificPhrase=inferSpecificLocationPhrase(locationText,location.district);
          const districtWide=inferDistrictWideScope(locationText);
          const normalizePlace=(value:unknown)=>String(value||'')
            .toLowerCase()
            .replace(/[.,،]/g,' ')
            .replace(/\s+/g,' ')
            .trim();
          const formatted=normalizePlace(location.formattedAddress);
          const districtName=normalizePlace(location.district);
          const upazilaName=normalizePlace(location.upazilaOrThana);
          const canonicalOnly=new Set([
            districtName,
            upazilaName,
            [upazilaName,districtName].filter(Boolean).join(' '),
          ].filter(Boolean));
          const hasFineGrainedLocation=Boolean(location.area||location.road||location.landmark);
          const formattedIsBroad=!formatted||canonicalOnly.has(formatted);
          const shouldEnrichSpecific=Boolean(
            specificPhrase
            && !hasFineGrainedLocation
            && formattedIsBroad
          );
          const alreadySpecific=Boolean(
            hasFineGrainedLocation
            || (formatted && !formattedIsBroad)
            || location.upazilaOrThana
          );

          if(shouldEnrichSpecific){
            location={
              ...location,
              area:specificPhrase,
              formattedAddress:specificPhrase,
              locationScope:'specific',
              quality:'specific',
            };
          }else if(districtWide && !alreadySpecific){
            location={
              ...location,
              locationScope:'district_wide',
              quality:'district_only',
            };
          }
        }

        const incidentDate=inferIncidentDate(locationText,article.sourcePublishedDate);
        const context=buildIncidentContext(article);
        if(!context){
          await record({
            itemKind:'article',
            sourceHostname:source.hostname,
            publisherName:article.publisherName,
            canonicalUrl:article.canonicalUrl,
            sourceTitle:article.title,
            sourcePublishedDate:article.sourcePublishedDate||'',
            contentLanguage:language,
            segmentId:classification.segmentId,
            subcategoryId:classification.subcategoryId,
            confidence:classification.confidence,
            action:'discovered',
            duplicateStatus:'unavailable',
            reason:'Article did not expose enough readable incident text to create a source-grounded report.',
          });
          return;
        }

        const payload=buildReportPayload(article,classification,location,incidentDate,language);
        const {data:processed,error:processError}=await supabase.rpc(
          'process_trusted_news_intake_candidate',
          {p_payload:payload}
        );
        if(processError) throw new Error(processError.message);

        const resultAction=String(processed?.action||'');
        const reportId=String(processed?.reportId||'');
        if(!reportId) throw new Error('Trusted News Intake returned no report id.');

        if(resultAction==='skip_duplicate'){
          await record({
            itemKind:'article',
            sourceHostname:source.hostname,
            publisherName:article.publisherName,
            canonicalUrl:article.canonicalUrl,
            sourceTitle:article.title,
            sourcePublishedDate:article.sourcePublishedDate||'',
            contentLanguage:language,
            segmentId:classification.segmentId,
            subcategoryId:classification.subcategoryId,
            confidence:classification.confidence,
            action:'skip_duplicate',
            duplicateStatus:'exact',
            reportId,
            reason:'Exact approved-source article already exists in the report database.',
          });
          return;
        }

        if(resultAction==='merged_source'){
          await record({
            itemKind:'article',
            sourceHostname:source.hostname,
            publisherName:article.publisherName,
            canonicalUrl:article.canonicalUrl,
            sourceTitle:article.title,
            sourcePublishedDate:article.sourcePublishedDate||'',
            contentLanguage:language,
            segmentId:classification.segmentId,
            subcategoryId:classification.subcategoryId,
            confidence:classification.confidence,
            action:'merged_source',
            duplicateStatus:'match',
            reportId,
            reason:'Strong same-incident match; approved source merged into the existing published report.',
          });
          return;
        }

        if(resultAction!=='published' || processed?.published!==true){
          throw new Error('Trusted News Intake did not complete publication.');
        }

        await record({
          itemKind:'article',
          sourceHostname:source.hostname,
          publisherName:article.publisherName,
          canonicalUrl:article.canonicalUrl,
          sourceTitle:article.title,
          sourcePublishedDate:article.sourcePublishedDate||'',
          contentLanguage:language,
          segmentId:classification.segmentId,
          subcategoryId:classification.subcategoryId,
          confidence:classification.confidence,
          action:'created_draft',
          duplicateStatus:'clear',
          reportId,
          reason:'Approved-source report automatically created and published to the public feed.',
          reviewPayload:null,
        });
      } catch(error) {
        processingErrors+=1;
        await record({
          itemKind:'article',
          sourceHostname:String(source.hostname||'unknown'),
          publisherName:String(source.publisherName||'Unknown source'),
          canonicalUrl:originalUrl,
          contentLanguage:String(source.languageHint||'unknown'),
          action:'error',
          duplicateStatus:'unavailable',
          reason:clip(error instanceof Error?error.message:'Article processing failed.',1400),
        }).catch(()=>{});
      }
    });

    const {data:finishData,error:finishError}=await supabase.rpc(
      'admin_finish_news_intake_run',
      {
        p_run_id:runId,
        p_status:processingErrors>0?'partial':'completed',
        p_error:processingErrors>0
          ? `${processingErrors} source/article processing error(s) were recorded; review the run items for details.`
          : null,
      }
    );
    if(finishError) throw new Error(finishError.message);
    return {
      ...finishData,
      triggerType,
      alreadyRunning:false,
    };
  } catch(error) {
    fatalMessage=error instanceof Error?error.message:'Automated News Intake failed.';
    await supabase.rpc('admin_finish_news_intake_run',{
      p_run_id:runId,
      p_status:'failed',
      p_error:fatalMessage,
    }).catch(()=>{});
    throw new Error(fatalMessage);
  }
};

const runManualScan = async (supabase: any) => {
  const {data:beginData,error:beginError}=await supabase.rpc(
    'admin_begin_news_intake_run'
  );
  if(beginError) throw new Error(beginError.message);

  const runId=String(beginData?.runId||'');
  if(!runId) throw new Error('Could not start News Intake run.');

  if(beginData?.alreadyRunning===true){
    return {
      ...beginData,
      triggerType:'manual' as const,
      alreadyRunning:true,
    };
  }

  return processNewsIntakeRun(supabase,runId,'manual');
};

const SCHEDULER_SECRET_SHA256 =
  "1660831eb1b7f0a85d4e771880111a66d40cbd686fddc22657d055c446562476";

const sha256Hex = async (value: string) => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );
  return Array.from(new Uint8Array(digest))
    .map((byte)=>byte.toString(16).padStart(2,"0"))
    .join("");
};

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if(req.method==="OPTIONS") return new Response("ok",{headers:corsHeaders});
  if(req.method!=="POST") return json(req,{error:"Method not allowed."},405);

  try {
    const supabaseUrl=Deno.env.get("SUPABASE_URL")??"";
    if(!supabaseUrl) return json(req,{error:"Function configuration error."},500);

    const schedulerSecret=req.headers.get("x-news-intake-scheduler")??"";
    const scheduledRequest=
      schedulerSecret.length>=32 &&
      (await sha256Hex(schedulerSecret))===SCHEDULER_SECRET_SHA256;

    if(scheduledRequest){
      const serviceRoleKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
      if(!serviceRoleKey) return json(req,{error:"Scheduler configuration error."},500);

      const requestBody=await req.json().catch(()=>({}));
      const scheduledSlot=String(requestBody?.scheduledSlot||"");
      if(!scheduledSlot){
        return json(req,{error:"Scheduled slot is required."},400);
      }

      const serviceClient=createClient(supabaseUrl,serviceRoleKey,{
        auth:{persistSession:false,autoRefreshToken:false},
      });

      const {data:beginData,error:beginError}=await serviceClient.rpc(
        'service_begin_scheduled_news_intake_run',
        {p_scheduled_slot:scheduledSlot}
      );
      if(beginError){
        return json(req,{error:beginError.message||"Scheduled scan could not be accepted."},503);
      }

      if(beginData?.accepted!==true){
        return json(req,{
          ...beginData,
          triggerType:'automatic',
        },202);
      }

      const runId=String(beginData?.runId||"");
      if(!runId){
        return json(req,{error:"Scheduled scan was accepted without a run id."},500);
      }

      EdgeRuntime.waitUntil(
        processNewsIntakeRun(serviceClient,runId,'automatic').catch((error)=>{
          console.error('Scheduled News Intake background task failed.',error);
        })
      );

      return json(req,{
        ...beginData,
        accepted:true,
        triggerType:'automatic',
        background:true,
      },202);
    }

    const authHeader=req.headers.get("Authorization")??"";
    if(!authHeader.startsWith("Bearer ")) {
      return json(req,{error:"Authentication required."},401);
    }

    const publishableKey=
      req.headers.get("apikey")??Deno.env.get("SUPABASE_ANON_KEY")??"";
    if(!publishableKey) return json(req,{error:"Function configuration error."},500);

    const userClient=createClient(supabaseUrl,publishableKey,{
      global:{headers:{Authorization:authHeader}},
      auth:{persistSession:false,autoRefreshToken:false},
    });
    const token=authHeader.slice("Bearer ".length);
    const {error:userError}=await userClient.auth.getUser(token);
    if(userError) return json(req,{error:"Invalid session."},401);

    const result=await runManualScan(userClient);
    return json(req,result);
  } catch(error) {
    const message=error instanceof Error?error.message:"Automated News Intake failed.";
    return json(req,{error:message},400);
  }
});
