import assert from 'node:assert/strict';
import {
  classifyArticle,
  findLocation,
  inferIncidentDate,
  inferSpecificLocationPhrase,
} from '../supabase/functions/_shared/newsIntakeAutomationCore.ts';

type Fixture = {
  name: string;
  title: string;
  context: string;
  publishedDate: string;
  expectedCategory: { segmentId: string; subcategoryId: string } | null;
  expectedIncidentDate: string | null;
  expectedDistrict?: string;
  expectedLocationIncludes?: string;
  expectReviewReason?: boolean;
};

const fixtures: Fixture[] = [
  {
    name: 'Banglanews Barishal crash with same-day Saturday cue',
    title: 'বরিশালে নিয়ন্ত্রণ হারিয়ে বাস পুকুরে, একজনের লাশ উদ্ধার',
    context:
      'শনিবার সকাল সাড়ে ৮টার দিকে সড়কের গড়িয়ারপাড় এলাকায় এ দুর্ঘটনা ঘটে বলে পুলিশ জানিয়েছে। বরিশালে নিয়ন্ত্রণ হারিয়ে একটি বাস পুকুরে পড়ে একজনের লাশ উদ্ধার করা হয়।',
    publishedDate: '2026-09-19',
    expectedCategory: { segmentId: 'road_transport', subcategoryId: 'road-accident' },
    expectedIncidentDate: '2026-09-19',
    expectedDistrict: 'Barishal',
    expectedLocationIncludes: 'গড়িয়ারপাড়',
  },
  {
    name: 'bdnews24 Barishal crash with same-day Saturday cue',
    title: 'বরিশালে বাস নিয়ন্ত্রণ হারিয়ে পুকুরে, নিহত ১',
    context:
      'শনিবার সকালে বরিশালের গড়িয়ারপাড় এলাকায় বাসটি নিয়ন্ত্রণ হারিয়ে পুকুরে পড়ে। এ দুর্ঘটনায় একজন নিহত হন।',
    publishedDate: '2026-09-19',
    expectedCategory: { segmentId: 'road_transport', subcategoryId: 'road-accident' },
    expectedIncidentDate: '2026-09-19',
    expectedDistrict: 'Barishal',
    expectedLocationIncludes: 'গড়িয়ারপাড়',
  },
  {
    name: 'Daily Star viral-video circulation date must not become incident date',
    title: 'Mugging behind Ctg police station in broad daylight, video goes viral',
    context:
      'The video went viral on Saturday morning. The mugging happened behind Kotwali police station in Chattogram, but the report does not establish when the incident itself occurred.',
    publishedDate: '2026-09-19',
    expectedCategory: { segmentId: 'public_safety', subcategoryId: 'snatching' },
    expectedIncidentDate: null,
    expectedDistrict: 'Chattogram',
  },
  {
    name: 'TBS Kushtia sourced report remains fully grounded',
    title: '20-year-old gang-raped in Kushtia dies at RMCH after 4 days',
    context:
      'According to the complaint, a motorcycle waylaid Toma at Gopalnagar around 9pm on Thursday and picked her up when she was returning home. The incident happened on Thursday 17 September 2026 in Kushtia.',
    publishedDate: '2026-09-19',
    expectedCategory: { segmentId: 'harassment', subcategoryId: 'rape-sexual-violence' },
    expectedIncidentDate: '2026-09-17',
    expectedDistrict: 'Kushtia',
    expectedLocationIncludes: 'Gopalnagar',
  },
  {
    name: 'bdnews24 theft-accusation killing must fail closed to mob-justice review',
    title: '‘ভাত চুরির’ অপবাদে বিশ্ববিদ্যালয় ছাত্রকে খুন: চারজনের বিরুদ্ধে মামলা',
    context:
      'চুরির অপবাদে এক বিশ্ববিদ্যালয় ছাত্রকে পিটিয়ে হত্যার অভিযোগে মামলা হয়েছে।',
    publishedDate: '2026-09-19',
    expectedCategory: { segmentId: 'public_safety', subcategoryId: 'mob-justice' },
    expectedIncidentDate: null,
    expectReviewReason: true,
  },
  {
    name: 'TBS theft-suspicion assault must not become a theft report',
    title: 'Khulna student ‘assaulted over theft suspicion’, dies after falling from 5th floor',
    context:
      'The student was assaulted over a theft suspicion before his death. The source requires human review of the incident classification.',
    publishedDate: '2026-09-19',
    expectedCategory: { segmentId: 'public_safety', subcategoryId: 'mob-justice' },
    expectedIncidentDate: null,
    expectedDistrict: 'Khulna',
    expectReviewReason: true,
  },
  {
    name: 'bdnews24 detainee taken from police is not property snatching',
    title: 'বরিশালে পুলিশকে পিটিয়ে ‘মাদক কারবারি’ ছিনতাই, পরে বাবা-ছেলে গ্রেপ্তার',
    context:
      'পুলিশের কাছ থেকে আটক মাদক কারবারিকে ছিনিয়ে নেওয়ার ঘটনায় পরে বাবা ও ছেলেকে গ্রেপ্তার করা হয়।',
    publishedDate: '2026-09-19',
    expectedCategory: null,
    expectedIncidentDate: null,
  },
  {
    name: 'Gas supply recovery headline is not a citizen gas-shortage incident',
    title: 'গ্যাস সংকটে স্বস্তি, জাতীয় গ্রিডে যুক্ত হলো ১২.৫ মিলিয়ন ঘনফুট',
    context:
      'নতুন গ্যাস জাতীয় গ্রিডে যুক্ত হওয়ায় সরবরাহ পরিস্থিতির উন্নতি হয়েছে বলে জানানো হয়েছে।',
    publishedDate: '2026-09-19',
    expectedCategory: null,
    expectedIncidentDate: null,
  },
];

for (const fixture of fixtures) {
  const fullText = `${fixture.title} ${fixture.context}`;
  const classification = classifyArticle(fullText);

  if (fixture.expectedCategory === null) {
    assert.equal(
      classification,
      null,
      `${fixture.name}: expected no supported incident classification`
    );
    continue;
  }

  assert.ok(classification, `${fixture.name}: expected a supported classification`);
  assert.equal(
    classification?.segmentId,
    fixture.expectedCategory.segmentId,
    `${fixture.name}: wrong segment`
  );
  assert.equal(
    classification?.subcategoryId,
    fixture.expectedCategory.subcategoryId,
    `${fixture.name}: wrong subcategory`
  );
  if (fixture.expectReviewReason) {
    assert.ok(
      classification?.reviewReason,
      `${fixture.name}: ambiguous production wording must require human review`
    );
  }

  const location = findLocation(fullText);
  if (fixture.expectedDistrict) {
    assert.equal(
      location?.district,
      fixture.expectedDistrict,
      `${fixture.name}: wrong district grounding`
    );
  }

  const incidentDate = inferIncidentDate(fullText, fixture.publishedDate);
  assert.equal(
    incidentDate,
    fixture.expectedIncidentDate,
    `${fixture.name}: wrong incident-date grounding`
  );

  if (fixture.expectedLocationIncludes) {
    const specific = inferSpecificLocationPhrase(fullText, location?.district);
    assert.ok(
      specific?.toLowerCase().includes(fixture.expectedLocationIncludes.toLowerCase()),
      `${fixture.name}: expected specific incident location to include ${fixture.expectedLocationIncludes}, got ${specific}`
    );
  }
}

console.log(
  `News Intake publisher fixture audit passed: ${fixtures.length} production-derived publisher cases are protected.`
);
