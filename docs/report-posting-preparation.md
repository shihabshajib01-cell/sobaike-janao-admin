# Report-posting preparation — 16 September 2026

Status: local editorial drafts only. Nothing submitted or published.

## Agreed scope

Original summaries of source-linked Bangladesh news; no images. Cover active
categories, EN/BN, varied text lengths and near/far locations. Exercise both
`citizen_information` and `subject_response`, with synthetic responses explicitly
labelled as test content, never attributed to real subjects. Start with drafts/test
records and preserve Admin moderation. Do not insert directly into database tables
to bypass Public validation or Admin permissions.

## Initial source-reviewed drafts

### EXT-01 — short English

Title: News summary: traders report extortion in Gabtoli

Dhaka Tribune reported on 8 September 2026 that small traders on Mazar Road in
Gabtoli described recurring payments demanded by local groups. This is a summary
of published reporting, not a first-hand complaint. The allegations have not been
independently verified here.

Source: https://www.dhakatribune.com/bangladesh/crime/419323/extortion-squeezes-dhaka%E2%80%99s-small-traders

Category: extortion. Location: Dhaka division/district; Gabtoli/Mazar Road as
reported. Exact thana, incident date and coordinates remain unverified. Do not use
the publication date as an incident date. Preserve the source's anonymity; do not
create identities for unnamed parties. Subcategory must be checked against live taxonomy.

### UTL-01 — short Bangla

Title: সংবাদভিত্তিক সারাংশ: গ্যাসসংকটে আশুগঞ্জের সার কারখানা

দ্য স্টারে ২৩ আগস্ট ২০২৬ প্রকাশিত এএফপির প্রতিবেদনে বলা হয়েছে, গ্যাসসংকটের
কারণে আশুগঞ্জের সার কারখানা দীর্ঘ সময় বন্ধ রয়েছে। এটি প্রকাশিত সংবাদের
সারাংশ, প্রত্যক্ষদর্শীর অভিযোগ নয়। এখানে কারখানার বর্তমান অবস্থা স্বাধীনভাবে
যাচাই করা হয়নি।

Source: https://www.thestar.com.my/aseanplus/aseanplus-news/2026/08/23/bangladesh039s-gas-crisis-hits-factories-homes-and-transport

Candidate category: utility issues (`load_shedding`), gas shortage, subject to
actual form applicability. Source location: Ashuganj, Brahmanbaria. Administrative
hierarchy must be matched to the application's canonical location options. Exact
outage start/end time is unknown: do not invent it to satisfy validation. If this
form requires an exact outage start, select a different documented incident.

## Coverage still to prepare

- Medium/long examples and remaining active harassment/illegal-charging categories.
- Verified structured administrative locations and near/far pairing; no fabricated GPS.
- Both response families for each eligible post, all clearly labelled test material.
- Submitted/rejected/published/unpublished transitions with role-specific permissions.
- Public visibility, response visibility, privacy and EN/BN verification after moderation.

## Release gate

Local Node 22/npm 10 install, type-check, build and dependency audit pass in both
repositories after the Admin build dependency cleanup. Public source is unchanged.
These results do not prove authenticated end-to-end correctness. Current Admin
changes are local, not deployed; browser regression and authenticated moderation
checks must pass before publishing this pack. No account impersonation or direct
SQL status changes are permitted as a substitute for those checks.
