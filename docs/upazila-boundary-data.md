# Upazila polygon source contract
Input: user-provided bd_district_map(1).html, embedded UPAZILA_GEOJSON (498 source features). Use only geometries, never the example amCharts application or Math.random() values.

The canonical SQL taxonomy remains public.bangladesh_upazilas (601 upazila/thana rows at validation). These 8 lazily loaded division assets provide 496 geometries after excluding 2 inconsistent parent P-codes. 492 map one-to-one to distinct canonical SQL IDs; 4 shapes are retained as non-filterable geography because the uploaded source is composite/ambiguous or has no unique matching SQL row.

**Rejected source parent conflicts:** Jessore/Abhaynagar source P-code 408790 indicates Satkhira, Khulna/Kotwali source P-code 404147 indicates Jessore. Do not render them without upstream correction.
**Unresolved neutral shapes:** Barisal/Barishal Sadar (Kotwali), Chandpur/Matlab, Dhaka/Biman Bandar, Dhaka/Uttara. Never assign them an arbitrary existing SQL upazila ID.
**License:** The new upazila source was supplied by the project owner; unlike the existing 2020 ADM2 layer, its original ADM3 provenance, reference date and redistribution license were not independently verified. Do not label it authoritative, current government boundaries or CC BY IGO without confirmation.
**Data:** Polygon labels come from existing SQL taxonomy when a canonical match exists; values always come from real permissions-safe reports. Public reporting is conditioned on the existing showGeneralLocation publication preference. Admin administrative complaint markers and map.view permissions are unchanged.
**Performance:** Fetch only the selected district's division asset upon upazila drilldown; never add this geometry to initial application bundle. The current dataset covers fewer polygons than all SQL taxonomy rows. Provide dropdown fallback for SQL entries without polygon geometry; never invent geography or imply that a missing polygon means zero real-world incidents.
**QA expected counts:** 64 districts (separate asset); 498 source upazila shapes; 496 retained shapes; 492 mapped 1:1, 4 unresolved neutral; 2 parent-code conflicts excluded; 601 SQL taxonomy entries currently. Counts must be checked on each taxonomy update. Division partition counts:
- khulna: 54 polygons, 54 filterable
- chattogram: 87 polygons, 86 filterable
- barishal: 38 polygons, 37 filterable
- rajshahi: 66 polygons, 66 filterable
- dhaka: 125 polygons, 123 filterable
- rangpur: 58 polygons, 58 filterable
- sylhet: 35 polygons, 35 filterable
- mymensingh: 33 polygons, 33 filterable
