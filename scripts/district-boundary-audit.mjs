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
