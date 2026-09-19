import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.4";
import {
  MAX_ARTICLE_AGE_DAYS,
  articleAgeDays,
  buildIncidentContext,
  buildSourceLanguageFields,
  classifyArticle,
  clip,
  detectLanguage,
  findLocation,
  inferIncidentDate,
  isUnsupportedArticleType,
  scoreDiscoveryLink,
} from "../_shared/newsIntakeAutomationCore.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-news-intake-scheduler",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status=200) => new Response(JSON.stringify(body), {
  status,
  headers:{...corsHeaders,"Content-Type":"application/json"},
});

const decodeEntities = (value: unknown) => String(value || "")
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

const normalizedDate = (raw: unknown) => {
  if(!raw)return null;
  const match=String(raw).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(match)return match[1]+"-"+match[2]+"-"+match[3];
  const parsed=new Date(String(raw));
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
      if (value['@graph']) walk(value['@graph']);
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
  const dateRaw = String(
    jsonLd?.datePublished ||
    metaContent(html,['article:published_time','datepublished','date','pubdate','publishdate']) ||
    ''
  );
  const sourcePublishedDate = normalizedDate(dateRaw);
  let body = String(jsonLd?.articleBody || '').trim();
  if (!body) {
    const articleMatch = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
    const scope = articleMatch?.[1] || html;
    body = [...scope.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((m)=>stripTags(m[1]))
      .filter((text)=>text.length>=35)
      .slice(0,20)
      .join(' ');
  }
  body = clip(stripTags(body),12000);
  const excerpt = clip(description || body,1800);
  return {
    title:clip(title,500),
    publisherName:clip(publisherName,160),
    canonicalUrl,
    sourcePublishedDate,
    body,
    excerpt,
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
  if (/(\/tag\/|\/topic\/|\/category\/|\/author\/|\/search(?:\/|$)|\/videos?(?:\/|$)|\/m\/video(?:\/|$)|\/photo(?:\/|$)|\/epaper|\/archive|\/contact|\/privacy|\/terms|\/careers?(?:\/|$)|\/jobs?(?:\/|$)|\/cdn-cgi(?:\/|$)|\/opinion(?:\/|$)|\/editorials?(?:\/|$)|\/analysis(?:\/|$)|\/features?(?:\/|$)|\/lifestyle(?:\/|$)|\/sports?(?:\/|$)|\/cricket(?:\/|$)|\/entertainment(?:\/|$)|\/multimedia(?:\/|$)|\/star-multimedia(?:\/|$))/i.test(path)) return false;
  const cleanText=stripTags(anchorText);
  if (cleanText.length<16) return false;
  if (/^(home|latest|latest news|all news|bangladesh|জাতীয়|সর্বশেষ|আরও|আরও দেখুন|more)$/iu.test(cleanText)) return false;
  return path.split('/').filter(Boolean).length>=2 || /\d{4}|\d{5,}/.test(path);
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
      try{results[index]=await worker(items[index],index);}catch{}
    }
  });
  await Promise.all(runners);
  return results;
};

const buildReportPayload = (
  article: any,
  classification: any,
  location: any,
  incidentDate: string,
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
      incidentDate,
      incidentTime:'',
      utilityEndTime:'',
      frequency:'one-time',
      priority:'medium',
      division:location.division,
      district:location.district,
      upazilaOrThana:location.upazilaOrThana || '',
      area:location.area || '',
      road:location.road || '',
      landmark:location.landmark || '',
      formattedAddress:location.formattedAddress || '',
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
        locationScope:location.locationScope === 'district_wide' ? 'district_wide' : 'specific',
      },
    },
  };
};

const safeScanFetch = async (
  initialUrl: string,
  checkDomain: (url:string)=>Promise<any>,
  accept='text/html,application/xhtml+xml'
) => {
  let current=new URL(initialUrl);
  if(current.protocol!=='https:'||current.username||current.password||current.port) {
    throw new Error('Unsafe source URL blocked.');
  }
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
    if(response.status>=300&&response.status<400){
      const location=response.headers.get('location');
      if(!location||redirectCount===3) throw new Error('Source redirect could not be resolved.');
      const next=new URL(location,current);
      if(next.protocol!=='https:'||next.username||next.password||next.port) {
        throw new Error('Unsafe source redirect blocked.');
      }
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

        const ageDays=articleAgeDays(article.sourcePublishedDate);
        if(ageDays===null){
          await record({
            itemKind:'article',
            sourceHostname:source.hostname,
            publisherName:article.publisherName,
            canonicalUrl:article.canonicalUrl,
            sourceTitle:article.title,
            sourcePublishedDate:'',
            contentLanguage:language,
            segmentId:classification.segmentId,
            subcategoryId:classification.subcategoryId,
            confidence:classification.confidence,
            action:'needs_review',
            duplicateStatus:'unavailable',
            reason:'Category detected, but the source publication date could not be verified safely.',
          });
          return;
        }
        if(ageDays>MAX_ARTICLE_AGE_DAYS){
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
          });
          return;
        }
        if(ageDays < -1){
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
            action:'needs_review',
            duplicateStatus:'unavailable',
            reason:'Source publication date is unexpectedly in the future.',
          });
          return;
        }

        const locationText=`${article.title} ${article.excerpt} ${article.body.slice(0,6000)}`;
        let location:any=null;
        try{
          const {data:resolvedLocation,error:locationError}=await supabase.rpc(
            'admin_resolve_news_intake_location',
            {p_text:locationText,p_language:language}
          );
          if(locationError) throw new Error(locationError.message);
          location=resolvedLocation;
        }catch{
          const districtOnly=
            findLocation(article.title)
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

        const incidentDate=inferIncidentDate(locationText,article.sourcePublishedDate);
        const context=buildIncidentContext(article);
        if(!location||!incidentDate||!context){
          const missing=[
            !location?'location':'',
            !incidentDate?'incident date':'',
            !context?'incident context':'',
          ].filter(Boolean).join(', ');
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
            action:'needs_review',
            duplicateStatus:'unavailable',
            reason:`Category detected, but ${missing} could not be established safely from the source.`,
          });
          return;
        }

        if(location.quality !== 'specific'){
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
            action:'needs_review',
            duplicateStatus:'unavailable',
            reason:'Category and district were detected, but a specific source-backed upazila/thana could not be established. Review the location before creating a feed-ready report.',
          });
          return;
        }

        if(classification.subcategoryId==='bribe-demanded-service'){
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
            action:'needs_review',
            duplicateStatus:'unavailable',
            reason:'Bribery category detected, but department and service fields require source-specific verification.',
          });
          return;
        }

        const payload=buildReportPayload(article,classification,location,incidentDate,language);
        const {data:preview,error:previewError}=await supabase.rpc(
          'admin_preview_sourced_report_intake',
          {p_payload:payload}
        );
        if(previewError) throw new Error(previewError.message);

        const duplicateStatus=String(preview?.duplicate?.status||'unavailable');
        const exact=Array.isArray(preview?.duplicate?.exactSourceDuplicates)
          ? preview.duplicate.exactSourceDuplicates
          : [];
        const schemaReady=preview?.schemaValidation?.ready !== false;
        const missingSchemaFields=Array.isArray(preview?.schemaValidation?.missingFields)
          ? preview.schemaValidation.missingFields
          : [];

        if(!schemaReady){
          const missingLabels=missingSchemaFields
            .map((field:any)=>String(field?.labelEn||field?.fieldKey||'required field'))
            .filter(Boolean)
            .join(', ');
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
            action:'needs_review',
            duplicateStatus,
            reason:`The current published report form requires source facts that could not be established safely: ${missingLabels||'required fields'}.`,
          });
          return;
        }

        if(exact.length){
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
            reportId:exact[0]?.complaintId||'',
            reason:'Exact source URL already exists in the report database.',
          });
          return;
        }

        if(duplicateStatus==='match'){
          const matches=(Array.isArray(preview?.duplicate?.candidates)
            ? preview.duplicate.candidates
            : []).filter((item:any)=>item?.matchLevel==='match');
          const strong=matches.length===1&&Number(matches[0]?.score||0)>=90
            ? matches[0]
            : null;
          if(strong?.complaintId){
            const {error:mergeError}=await supabase.rpc('admin_merge_intake_source',{
              p_complaint_id:String(strong.complaintId),
              p_source:payload.source,
            });
            if(mergeError)throw new Error(mergeError.message);
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
              reportId:String(strong.complaintId),
              reason:'Strong same-incident match; source merged into the existing sourced report.',
            });
            return;
          }
        }

        if(duplicateStatus==='match'||duplicateStatus==='review'){
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
            action:'needs_review',
            duplicateStatus,
            reason:'Possible same incident detected. No new report was created automatically.',
          });
          return;
        }

        const {data:created,error:createError}=await supabase.rpc(
          'admin_create_sourced_report_from_intake',
          {p_payload:payload}
        );
        if(createError)throw new Error(createError.message);
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
          duplicateStatus:String(created?.duplicate?.status||'clear'),
          reportId:String(created?.reportId||''),
          reason:'Source-grounded draft created; publication remains a separate admin action.',
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
        p_error:null,
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
  if(req.method==="OPTIONS") return new Response("ok",{headers:corsHeaders});
  if(req.method!=="POST") return json({error:"Method not allowed."},405);

  try {
    const supabaseUrl=Deno.env.get("SUPABASE_URL")??"";
    if(!supabaseUrl) return json({error:"Function configuration error."},500);

    const schedulerSecret=req.headers.get("x-news-intake-scheduler")??"";
    const scheduledRequest=
      schedulerSecret.length>=32 &&
      (await sha256Hex(schedulerSecret))===SCHEDULER_SECRET_SHA256;

    if(scheduledRequest){
      const serviceRoleKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
      if(!serviceRoleKey) return json({error:"Scheduler configuration error."},500);

      const requestBody=await req.json().catch(()=>({}));
      const scheduledSlot=String(requestBody?.scheduledSlot||"");
      if(!scheduledSlot){
        return json({error:"Scheduled slot is required."},400);
      }

      const serviceClient=createClient(supabaseUrl,serviceRoleKey,{
        auth:{persistSession:false,autoRefreshToken:false},
      });

      const {data:beginData,error:beginError}=await serviceClient.rpc(
        'service_begin_scheduled_news_intake_run',
        {p_scheduled_slot:scheduledSlot}
      );
      if(beginError){
        return json({error:beginError.message||"Scheduled scan could not be accepted."},503);
      }

      if(beginData?.accepted!==true){
        return json({
          ...beginData,
          triggerType:'automatic',
        },202);
      }

      const runId=String(beginData?.runId||"");
      if(!runId){
        return json({error:"Scheduled scan was accepted without a run id."},500);
      }

      EdgeRuntime.waitUntil(
        processNewsIntakeRun(serviceClient,runId,'automatic').catch((error)=>{
          console.error('Scheduled News Intake background task failed.',error);
        })
      );

      return json({
        ...beginData,
        accepted:true,
        triggerType:'automatic',
        background:true,
      },202);
    }

    const authHeader=req.headers.get("Authorization")??"";
    if(!authHeader.startsWith("Bearer ")) {
      return json({error:"Authentication required."},401);
    }

    const publishableKey=
      req.headers.get("apikey")??Deno.env.get("SUPABASE_ANON_KEY")??"";
    if(!publishableKey) return json({error:"Function configuration error."},500);

    const userClient=createClient(supabaseUrl,publishableKey,{
      global:{headers:{Authorization:authHeader}},
      auth:{persistSession:false,autoRefreshToken:false},
    });
    const token=authHeader.slice("Bearer ".length);
    const {error:userError}=await userClient.auth.getUser(token);
    if(userError) return json({error:"Invalid session."},401);

    const result=await runManualScan(userClient);
    return json(result);
  } catch(error) {
    const message=error instanceof Error?error.message:"Automated News Intake failed.";
    return json({error:message},400);
  }
});
