// Regression check for the versioned local 2020 district boundary asset.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
const data = readFileSync('public/geo/bangladesh-districts-2020.geojson');
const geo = JSON.parse(data.toString('utf8'));
assert.equal(geo.type, 'FeatureCollection');
assert.equal(geo.metadata.reference_valid_on, '2020-11-13');
assert.equal(geo.features.length, 64);
const ids = new Set();
const pcodes = new Set();
for (const f of geo.features) {
  const { district_id: id, ADM2_PCODE: pcode } = f.properties;
  assert.match(id, /^[a-z]+$/);
  assert.match(pcode, /^BD[0-9]{4}$/);
  assert(!ids.has(id) && !pcodes.has(pcode), 'Duplicate district or P-code');
  ids.add(id); pcodes.add(pcode);
  assert(['Polygon', 'MultiPolygon'].includes(f.geometry.type));
  const polygons = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const polygon of polygons) for (const ring of polygon) {
    assert(ring.length >= 4, 'Invalid ring length');
    assert.deepEqual(ring[0], ring.at(-1), 'Open geographic ring');
    for (const [lng, lat] of ring) {
      assert(lng >= 87 && lng <= 94 && lat >= 19 && lat <= 28, 'Outside Bangladesh extent');
    }
  }
}
assert(gzipSync(data).length < 90000, 'Lazy boundary asset exceeds 90kb gzip budget');
// Geometry IDs must agree with the app canonical names; spellings and translations are never join keys.
import { existsSync } from 'node:fs';
if (existsSync('src/data/districts.ts')) {
  const source = readFileSync('src/data/districts.ts', 'utf8');
  const section = source.split('export const BANGLADESH_DISTRICTS:')[1]?.split('\n];')[0];
  assert(section, 'Missing canonical districts');
  const canonical = new Set([...section.matchAll(/\{ id: '([a-z]+)'/g)].map(x => x[1]));
  assert.equal(canonical.size, 64, 'Canonical district count changed');
  assert.deepEqual([...ids].sort(), [...canonical].sort(), 'Boundary/SQL canonical district identity drift');
}
console.log('PASS: 64 mapped districts, unique P-codes, closed polygon rings, lazy gzip budget');

const adminMapSource = 'src/components/map/MapContainer.tsx';
if (existsSync(adminMapSource)) {
  const map = readFileSync(adminMapSource, 'utf8');
  const css = readFileSync('src/index.css', 'utf8');
  assert.doesNotMatch(map, /<TileLayer/, 'Admin map must contain Bangladesh only, without world tiles');
  assert.match(map, /<GeoJSON/, 'Admin map must keep Bangladesh polygons');
  assert.match(map, /<CircleMarker/, 'Admin map must preserve existing complaint selection markers');
  assert.match(map, /maxBounds=\{BANGLADESH_BOUNDS\}/, 'Admin map must constrain panning to Bangladesh');
  assert.match(map, /zoomSnap=\{0\.1\}/, 'Admin country fit must use fractional zoom');
  assert.match(map, /MapCountryBounds geometry=\{districtGeometry\}/, 'Admin map bounds must follow actual country geometry');
  assert.match(css, /\.admin-bangladesh-map\.leaflet-container/, 'Admin map must honor existing light and dark surface tones');
}

// Admin must ship the same verified subdistrict geometry contract as Public.
const upazilaManifest = JSON.parse(readFileSync('public/geo/upazilas/manifest.json', 'utf8'));
assert.equal(upazilaManifest.canonical_registry_count, 601);
assert.equal(upazilaManifest.division_count, 8);
assert.equal(upazilaManifest.district_count, 64);
assert.equal(upazilaManifest.published_verified_polygon_count, 544);
assert.equal(upazilaManifest.registry_without_verified_polygon_count, 57);
let adminUpazilaPolygonCount = 0;
const adminCanonicalPolygonIDs = new Set();
for (const [division, path] of Object.entries(upazilaManifest.division_files)) {
  const payload = readFileSync('public/' + path, 'utf8');
  assert(gzipSync(payload).length < 200000, 'Admin lazy upazila asset exceeded 200KB gzip: ' + division);
  const collection = JSON.parse(payload);
  assert.equal(collection.type, 'FeatureCollection');
  assert.equal(collection.metadata.division, division);
  for (const feature of collection.features) {
    assert.equal(typeof feature.properties?.canonical_id, 'string');
    assert.equal(typeof feature.properties?.district_id, 'string');
    assert(feature.geometry && ['Polygon', 'MultiPolygon'].includes(feature.geometry.type));
    assert(!adminCanonicalPolygonIDs.has(feature.properties.canonical_id), 'Duplicate admin canonical polygon');
    adminCanonicalPolygonIDs.add(feature.properties.canonical_id);
    adminUpazilaPolygonCount += 1;
  }
}
assert.equal(adminUpazilaPolygonCount, 544);
assert.equal(adminCanonicalPolygonIDs.size, 544);

const adminMap = readFileSync('src/components/map/MapContainer.tsx', 'utf8');
const adminPage = readFileSync('src/pages/Map/MapPage.tsx', 'utf8');
for (const needle of [
  'UPAZILA_DIVISION_ASSETS',
  'geo/upazilas/',
  'selectedUpazila',
  'selectedDistrict',
  'locationTaxonomy',
  'canonical_id',
  'Verified boundary',
  'Boundary not verified',
  'MapAreaController',
]) {
  assert(adminMap.includes(needle), 'Admin upazila geometry contract missing: ' + needle);
}
assert(adminPage.includes('hasLocationMapSelection'),
  'Admin must keep geography visible for zero-report canonical locations');
assert(adminPage.includes('selectedUpazila={filters.upazila}') &&
       adminPage.includes('locationTaxonomy={locationTaxonomy}'),
  'Admin map must receive canonical location selection state');
console.log('PASS: Admin shares 544 verified polygons and preserves all 601 canonical navigation choices; 57 unsupported boundaries remain explicit.');

const taxonomyApi = readFileSync('src/services/api/mapApi.ts', 'utf8');
const mapFilters = readFileSync('src/components/map/MapFilters.tsx', 'utf8');
const mapPage = readFileSync('src/pages/Map/MapPage.tsx', 'utf8');
const mapTypes = readFileSync('src/types/Map.ts', 'utf8');
assert(taxonomyApi.includes("rpc('admin_get_location_taxonomy')"),
  'All location choices must use the existing permission-guarded SQL taxonomy RPC');
for (const [name, count] of [['divisions', 8], ['districts', 64], ['upazilas', 601]]) {
  assert(taxonomyApi.includes(`validArray(taxonomy.${name}, ${count})`),
    `Admin must fail closed on partial ${name} coverage`);
}
assert(taxonomyApi.includes("rpc('admin_get_map_dataset')"),
  'Existing protected map dataset API must remain unchanged');
assert(mapPage.includes('getLocationTaxonomy()') && mapPage.includes('setLocationTaxonomy(result)'),
  'Map must load canonical geography without touching existing complaint RPC');
for (const name of ['division', 'district', 'upazila']) {
  assert(mapTypes.includes(name + ': string'), `Missing admin map ${name} filter state`);
  assert(mapFilters.includes('map-' + name + '-select'), `Missing admin map ${name} selector`);
}
assert(mapPage.includes('item.location.upazilaOrThana') &&
       mapPage.includes('item.location.district') &&
       mapPage.includes('item.location.division'),
  'Geographic filters must scope real authenticated complaint locations');
assert(mapFilters.includes("upazila: 'all'"),
  'Dependent location filters must clear upazila when district/division changes');
console.log('PASS: Permission-guarded admin 8/64/601 taxonomy and dependent map filters');
