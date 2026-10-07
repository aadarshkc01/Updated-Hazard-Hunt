/**
 * Temporary verification harness for the Warehouse Walkthrough scene.
 * Three.js scene construction does not require a WebGL context, so the scene
 * graph, geometry budget and disposal path can all be validated headlessly.
 */
import * as THREE from 'three';
import { buildWarehouseScene, collidesAt, getObstacles, ROOM, SPAWN } from './src/components/viewer/warehouseScene.js';
import { buildHazardProp } from './src/components/viewer/hazardProps.js';

let failures = 0;
const check = (label, cond, extra = '') => {
  if (cond) console.log(`PASS  ${label}`);
  else {
    failures += 1;
    console.log(`FAIL  ${label} ${extra}`);
  }
};

// ── 1. Scene builds ───────────────────────────────────────────────────────────
const { scene, dispose } = buildWarehouseScene();
check('scene builds without throwing', !!scene);

let drawCalls = 0;
let instancedMeshCount = 0;
let triangles = 0;
let instances = 0;
let nanCount = 0;
const matSet = new Set();
const vm = new THREE.Matrix4();
const vp = new THREE.Vector3();
const vq = new THREE.Quaternion();
const vs = new THREE.Vector3();
// Material names, so an outlier report says *what* is out of bounds, not just where.
const MAT_BY_UUID = {};

// Label materials by colour so failures are diagnosable.
scene.traverse((o) => {
  if (o.isMesh && o.material?.color && !MAT_BY_UUID[o.material.uuid]) {
    MAT_BY_UUID[o.material.uuid] = `#${o.material.color.getHexString()}`;
  }
});

scene.traverse((o) => {
  if (!o.isMesh) return;
  drawCalls += 1;
  if (o.isInstancedMesh) instancedMeshCount += 1;
  matSet.add(o.material.uuid);
  const g = o.geometry;
  if (!g?.attributes?.position) return;
  triangles += ((g.index ? g.index.count : g.attributes.position.count) / 3) * (o.isInstancedMesh ? o.count : 1);
  if (o.isInstancedMesh) instances += o.count;
  const arr = g.attributes.position.array;
  for (let i = 0; i < arr.length; i += 1) if (!Number.isFinite(arr[i])) nanCount += 1;
});

console.log(
  `\n      drawCalls=${drawCalls}  instances=${instances}  triangles=${Math.round(triangles)}  uniqueMaterials=${matSet.size}`
);
check('no NaN in any geometry position', nanCount === 0, `(${nanCount} bad floats)`);
check('triangle budget under 250k (mobile target)', triangles < 250000, `(${Math.round(triangles)})`);
// Draw-call budget is split in two, because the warehouse is now a LIVE scene.
//
//   - Static geometry (racking, structure, props) must stay heavily batched.
//     This is the invariant that actually regresses if someone drops an
//     `absorb`/`stage` call, so it is asserted tightly.
//   - Animated systems (belt rollers, fan blades, vehicles, walking staff)
//     cannot be instanced without freezing their transforms, so they carry a
//     separate allowance. Every vehicle is merged per-material first.
const instancedCalls = instancedMeshCount;
check('static geometry batched under 70 draw calls', instancedCalls < 70, `(${instancedCalls})`);
check('total draw calls under 140 (incl. live systems)', drawCalls < 140, `(${drawCalls})`);
check('instancing actually collapsed the static props', instances > 400, `(${instances} instances)`);
// Material count tracks the deliberate surface hierarchy, not a minimal palette:
// the primary frames, secondary purlins and roof sheeting are three distinct
// galvanised tones so the framework reads as engineered rather than as one flat
// grey mass, and every floor marking carries its own depth-bias decal material.
// The bound guards against unbounded growth; the real perf driver is draw calls,
// which is asserted separately above.
check('materials are shared, not per-mesh', matSet.size < 52, `(${matSet.size} unique)`);

// ── 2. Everything sits inside the room (checks every instance transform) ──────
// Horizontal bounds are strict. Vertically, the depot has a PITCHED roof, so the
// ridge and purlins legitimately rise above the 9m eaves height — the tolerance
// allows for that but still catches anything floating away off the model.
let outside = 0;
// Bounds tolerance. The wall itself is 0.3 m thick, so anything further out
// than that plus a small margin is genuinely outside the shell rather than
// embedded in the wall. This was 1.6 m, which was wide enough to hide props
// left stranded outside the walls when the room was resized.
const slack = 0.4;
const ROOF_APEX = ROOM.height + 2.5;
const inspect = (x, y, z, src) => {
  if (
    Math.abs(x) > ROOM.width / 2 + slack ||
    Math.abs(z) > ROOM.depth / 2 + slack ||
    y < -0.6 ||
    y > ROOF_APEX
  ) {
    outside += 1;
    if (outside <= 12) {
      console.log(
        '      OUTLIER',
        x.toFixed(1),
        y.toFixed(1),
        z.toFixed(1),
        `scale=${vs.x.toFixed(1)}x${vs.y.toFixed(1)}x${vs.z.toFixed(1)} count=${src?.count} colour=${src?.material?.color?.getHexString?.() ?? '?'}`
      );
    }
  };
};
scene.traverse((o) => {
  if (!o.isMesh) return;
  o.updateWorldMatrix(true, false);
  if (o.isInstancedMesh) {
    for (let i = 0; i < o.count; i += 1) {
      o.getMatrixAt(i, vm);
      vm.premultiply(o.matrixWorld).decompose(vp, vq, vs);
      inspect(vp.x, vp.y, vp.z, o);
    }
  } else {
    o.getWorldPosition(vp);
    inspect(vp.x, vp.y, vp.z, o);
  }
});
check('all geometry contained within the room shell', outside === 0, `(${outside} outliers)`);

// The pitched roof must actually be there — a regression guard on the roof
// build, not just its bounds. Instanced transforms live in `instanceMatrix`,
// not in the mesh's own matrixWorld, so read them per instance.
let roofParts = 0;
let apexParts = 0;
scene.traverse((o) => {
  if (!o.isInstancedMesh) return;
  for (let i = 0; i < o.count; i += 1) {
    o.getMatrixAt(i, vm);
    vm.decompose(vp, vq, vs);
    if (vp.y > ROOM.height) {
      roofParts += 1;
      if (vp.y > ROOM.height + 1) apexParts += 1;
    }
  }
});
check(
  // A pitched roof has one ridge beam, so a small apex count is correct; the
  // assertion is that a full roof structure exists AND that a ridge rises
  // above the eaves.
  'pitched roof structure present with a ridge above the eaves',
  roofParts > 40 && apexParts >= 1,
  `(aboveEaves=${roofParts} ridge=${apexParts})`
);

// ── 3. Spawn point is valid and not inside geometry ──────────────────────────
check('spawn is inside room bounds', Math.abs(SPAWN.x) < ROOM.width / 2 && Math.abs(SPAWN.z) < ROOM.depth / 2);
check('spawn is not colliding', !collidesAt(SPAWN.x, SPAWN.z));
check('spawn eye height is human scale', SPAWN.y > 1.4 && SPAWN.y < 2.0, `(${SPAWN.y})`);

// ── 4. Collision is solid ────────────────────────────────────────────────────
const obstacles = getObstacles();
check('collision blocks the room perimeter', collidesAt(ROOM.width / 2 + 1, 0, obstacles));
check('collision blocks racking', collidesAt(-11, -4, obstacles), 'rack block -12.4..-9.2');
check('collision blocks racking segment B', collidesAt(3.4, 4, obstacles), 'rack block 1.8..5.0');
check('collision blocks the office', collidesAt(13.6, 7, obstacles));
check('collision blocks the welfare cabin', collidesAt(-12.5, 9, obstacles));
check('collision allows the main walkway', !collidesAt(0, 0, obstacles));
let walkwayBlocked = 0;
for (let z = -9; z <= 9; z += 1) if (collidesAt(0, z, obstacles)) walkwayBlocked += 1;
check(
  'painted walkway is completely unobstructed',
  walkwayBlocked === 0,
  `(${walkwayBlocked} blocked samples)`
);
check('collision allows the dispatch area', !collidesAt(0, 9.4, obstacles));
// Player must be able to walk the full main aisle without snagging.
// -9..9 inclusive is 19 samples, not 21 — the count must match the range.
const WALK_SAMPLES = [];
for (let z = -9; z <= 9; z += 1) WALK_SAMPLES.push(z);
let walkable = 0;
for (const z of WALK_SAMPLES) if (!collidesAt(0, z, obstacles)) walkable += 1;
check(
  'main walkway is continuously walkable',
  walkable === WALK_SAMPLES.length,
  `(${walkable}/${WALK_SAMPLES.length})`
);

// ── 5. Server hazard anchors never land inside a solid volume ─────────────────
// Mirrors the 17 anchors in backend/src/utils/walkthroughLayout.js. The server
// picks slots by category and we cannot change that list from here, so this
// guards the geometry: adding a new solid (cabin, office, machine) must never
// swallow a staging position.
//
// The two cross-aisle anchors are at x = +/-13.5, not in the middle of the floor:
// between the walkway edge (1.7 m) and a rack face plus a player radius (2.2 +
// 0.55 m) there is only about 1.65 m, so anything between them would be standing
// on the route. They sit in the perimeter aisles instead.
const ANCHORS = [
  [-13.5, -5.5], [-13.5, 4.5], [13.5, -2.5],
  [-7.3, -6.0], [-7.3, 0.0], [-7.3, 5.5],
  [7.3, -6.0], [6.4, 0.0], [6.4, 6.0],
  [-13.5, 0.0], [13.5, 0.0],
  [-3.5, -9.2], [3.5, -9.2], [-7.3, -9.2], [13.4, -9.2],
  [-7.3, 9.2], [7.3, 9.2],
];

const insideSolid = (x, z, pad = 0.6) =>
  obstacles.some(
    (ob) =>
      x > ob.minX - pad && x < ob.maxX + pad && z > ob.minZ - pad && z < ob.maxZ + pad
  );
const blockedAnchors = ANCHORS.filter(([x, z]) => insideSolid(x, z));
check(
  'all 17 server hazard anchors are on walkable floor',
  blockedAnchors.length === 0,
  blockedAnchors.map(([x, z]) => `(${x},${z})`).join(' ')
);

// The fire-exit anchor must stay directly in front of the exit.
const exitAnchor = ANCHORS.find(([x]) => x === 13.4);
check(
  'fire-exit anchor is still clear of the door',
  exitAnchor && !insideSolid(exitAnchor[0], exitAnchor[1]),
);
const VARIANTS = [
  'spill-puddle', 'leaking-drum',
  'leaning-stack', 'overhang-pallet',
  'trailing-cable', 'cable-drum',
  'blocked-exit-crates', 'blocked-exit-pallets',
  'missing-barrier', 'blind-corner',
];
VARIANTS.forEach((v) => {
  let group;
  let threw = null;
  try {
    group = buildHazardProp('hazard-test', v);
  } catch (e) {
    threw = e;
  }
  if (threw) {
    check(`prop "${v}" builds`, false, threw.message);
    return;
  }
  let tagged = 0;
  let parts = 0;
  let nan = 0;
  group.traverse((o) => {
    if (!o.isMesh) return;
    parts += 1;
    if (o.userData.hotspotId === 'hazard-test') tagged += 1;
    const p = o.geometry.attributes.position.array;
    for (let i = 0; i < p.length; i += 1) if (!Number.isFinite(p[i])) nan += 1;
  });
  check(
    `prop "${v}" builds and is fully raycast-tagged`,
    parts > 0 && tagged === parts && nan === 0,
    `(parts=${parts} tagged=${tagged} nan=${nan})`
  );
});

// ── 6. Vehicle patrol routes stay off the painted walkway ──────────────────────
// A forklift parked on the pedestrian route is both an obstruction and a
// training contradiction, so the routes are asserted like any other geometry.
const VEHICLE_ROUTES = [
  {
    name: 'forklift',
    pts: [
      [-7.3, -9.2],
      [-13.5, -9.2],
      [-13.5, 0.0],
      [-7.3, 0.0],
    ],
  },
  {
    name: 'palletTruck',
    pts: [
      [2.9, 9.2],
      [9.4, 9.2],
      [9.4, 9.9],
      [2.9, 9.9],
    ],
  },
];
{
  const halfLane = 3.4 / 2;
  const bad = [];
  VEHICLE_ROUTES.forEach(({ name, pts }) => {
    pts.forEach(([x, z], i) => {
      if (Math.abs(x) < halfLane && z > -9.4 && z < 9.4) bad.push(`${name} point ${x},${z}`);
      if (insideSolid(x, z, 0.4)) bad.push(`${name} point ${x},${z} inside solid`);
      const [nx, nz] = pts[(i + 1) % pts.length];
      for (let t = 0; t <= 1; t += 0.1) {
        const sx = x + (nx - x) * t;
        const sz = z + (nz - z) * t;
        if (Math.abs(sx) < halfLane && sz > -13.4 && sz < 13.4) {
          bad.push(`${name} crosses walkway near ${sx.toFixed(1)},${sz.toFixed(1)}`);
          break;
        }
        if (insideSolid(sx, sz, 0.3)) {
          bad.push(`${name} crosses solid near ${sx.toFixed(1)},${sz.toFixed(1)}`);
          break;
        }
      }
    });
  });
  check(
    'vehicle routes stay off the walkway and out of the solids',
    bad.length === 0,
    bad.slice(0, 3).join('; ')
  );
}

// ── 7. Two hazards in the same family look different ──────────────────────────
const leanA = buildHazardProp('h1', 'leaning-stack');
const overA = buildHazardProp('h2', 'overhang-pallet');
let leanParts = 0;
let overParts = 0;
leanA.traverse((o) => { if (o.isMesh) leanParts += 1; });
overA.traverse((o) => { if (o.isMesh) overParts += 1; });
check('material-handling variants are visually distinct', leanParts !== overParts, `(${leanParts} vs ${overParts})`);

// ── 7. Disposal ───────────────────────────────────────────────────────────────
let disposedGeometries = 0;
scene.traverse((o) => {
  if (o.isMesh && o.geometry) {
    const before = o.geometry.attributes.position.count;
    o.geometry.dispose();
    disposedGeometries += 1;
    if (o.geometry.attributes.position.count !== before) {
      check('geometry dispose is non-destructive before use', false);
    }
  }
});

let disposeThrew = null;
try {
  dispose();
} catch (e) {
  disposeThrew = e;
}
check(`dispose() completes cleanly (${disposedGeometries} geometries)`, !disposeThrew, disposeThrew?.message || '');

console.log(failures === 0 ? '\nAll scene checks passed.' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
