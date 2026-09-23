# Versioned district boundary source and adaptation

Source input: the user-supplied `bd_district_map.html`, SHA-256 `92b7038d5821cbb56ee8f339a0a5af9a3df6899b3980051ec1e6ef5dea827363`. Its 64 ADM2 polygons / P-codes / 2020 reference date were checked against the Bangladesh DGHS government-hosted `bgd_admbnda_adm2_bbs_20201113` dataset metadata.

**Upstream provenance:** Bangladesh Bureau of Statistics (BBS), with OCHA regional administrative boundary data (2020 reference). Government mirror: https://gis.dghs.gov.bd/server/rest/services/Hosted/bgd_admbnda_adm2_bbs_20201113/FeatureServer/0

**License evidence:** geoBoundaries catalogues the corresponding 2020 BBS/OCHA 64-district boundary release as CC BY 3.0 IGO: https://www.geoboundaries.org/api/current/gbOpen/BGD/ADM2/ ; license: https://creativecommons.org/licenses/by/3.0/igo/ . The user-provided HTML has no separate embedded license statement, so the exact individual file's redistribution lineage has not been independently certified. Preserve original provenance and recheck official HDX source metadata when available.

**Our changes:** Removed the amCharts shell and `Math.random()` demonstration values, retained all 64 districts with unique ADM2 P-codes, rounded coordinates to five decimal places (~metre precision), removed unused geometry properties, and added a verified canonical SQL district-ID crosswalk for renamed districts (Barisal/Barishal, Bogura/Bogra, Comilla/Cumilla, Jessore/Jashore). This is an adapted visualization dataset, **not** a current or legally authoritative administrative boundary determination.

**Privacy and data:** Public shading is generated exclusively from existing filtered published reports. Admin outlines are decorative over existing permission-guarded administrative complaint markers. District geometry includes no complaint data, individual incident coordinates, or personal information.

**Performance and rollback:** Each site hosts its own exact matching, gzip-friendly JSON static asset. Public loads it only in Districts mode, admin only on the protected Map route; if loading fails, the previous map remains functional. Delete/revert the geography overlay commits to roll back without altering existing report APIs, routes, filters, permissions, or data.

**QA:** Run `npm run audit:district-boundaries`, `npm run lint`, and the existing production build and integration/security audits. Compare identical GeoJSON assets across both repositories. Verify 64 canonical district IDs match the current `public.bangladesh_districts` table and distinct `adm2_pcode` values after running the additive SQL migration.

## Bangladesh-only map mode (September 23 revision)

Both public and admin maps render only the supplied 64 Bangladesh district polygons over the existing design system's neutral surface, without any global raster basemap, outside-country place labels, or third-party tile requests. Both maps constrain the camera to the country's actual district geometry once loaded, retaining the existing view controls, underlying data sources, and privacy permissions. Public explains report-volume colors outside its map canvas; admin keeps its status-colored authorized complaint markers and details. The geometry asset and canonical SQL district identifiers have not changed.
