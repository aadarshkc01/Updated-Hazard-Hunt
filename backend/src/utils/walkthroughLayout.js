/**
 * Randomized Walkthrough Layout Generator
 * ─────────────────────────────────────────────────────────────────────────────
 * Implements the "risks appear at random, depending on the duration of the
 * exercise" mechanic from the Hazard Spotting Warehouse reference product.
 *
 * Design constraints (NFR-05 tamper resistance):
 *  - This module ONLY decides WHERE a hazard prop is staged and WHICH visual
 *    variant is used. It never decides whether a trainee's click was correct.
 *  - Correctness is still resolved exclusively in `scoring.js` against the
 *    canonical `Scenario.hotspots` documents loaded from MongoDB.
 *  - Because the layout is derived from an explicit `seed`, the exact same
 *    layout can be regenerated later for audit / dispute investigation.
 */

// Warehouse floor plan (metres). MUST match
// frontend/src/components/viewer/warehousePlan.js - the anchors below are only
// valid for this exact layout.
//   X: -13 .. 13 (west wall .. east wall)
//   Z: -9 .. 9 (north wall with dock doors .. south dispatch apron)
//
// The floor is ZONED rather than a rack grid: the west strip is a chemical store,
// the east strip an electrical switchroom, with only two racking runs between
// them and the painted route down the middle. So there are two rack blocks, not
// four. Symmetry is deliberately broken - the trainee can tell roughly where
// they are from which wall they are nearer.
const RACK_BLOCKS = [
  { minX: -6.6, maxX: -3.6 },
  { minX: 3.6, maxX: 6.6 },
];
const RACK_SEGMENTS = [
  { minZ: -6.2, maxZ: -1.2 },
  { minZ: 1.2, maxZ: 6.2 },
];
const ROOM_LIMIT_X = 13;
const ROOM_LIMIT_Z = 9;

// Zone footprints, duplicating warehousePlan.js. Only the two rooms are solid;
// the store and the switchroom are floor you walk through, not volumes you
// walk into.
const CHEMICAL_STORE = { minX: -12.6, maxX: -8.8, minZ: -8.6, maxZ: -1.4 };
const ELECTRICAL_ZONE = { minX: 8.8, maxX: 12.6, minZ: -8.6, maxZ: -1.4 };
const OFFICE = { minX: 8.9, maxX: 12.5, minZ: 1.4, maxZ: 6.2 };
const WELFARE = { minX: -12.5, maxX: -8.9, minZ: 1.4, maxZ: 6.2 };

/** Fixed fire exit on the north wall - the blocked-exit hazard is always staged
 * directly in front of it so the depiction stays coherent. */
export const FIRE_EXIT = { x: 11.4, z: -9, width: 2.6, height: 2.6 };

/**
 * Candidate hazard anchor points.
 *
 * Every anchor sits on open, walkable floor so a staged prop never intersects
 * racking, walls, the rooms, or the safety-yellow pedestrian route. None of them
 * sits ON the route (x -1.7 .. 1.7) - a staged hazard must never block the way
 * the trainee has to walk to reach the others.
 *
 * They are distributed across the five zones rather than clustered, so a run
 * places hazards in genuinely different parts of the depot and the trainee has
 * to traverse the whole floor rather than working one aisle.
 *
 * `suits` lists hazard categories this anchor is a visually sensible home for.
 * The generator prefers a matching anchor, but falls back to any free anchor so
 * a layout is always produced regardless of category mix.
 */
export const HAZARD_ANCHORS = [
  // West perimeter aisle
  { id: 'perimeter-west-north', position: [-12.0, 0.05, -7.2], rotationY: 0.5, suits: ['chemical', 'material'] },
  { id: 'perimeter-west-south', position: [-12.0, 0.05, 7.2], rotationY: -0.7, suits: ['traffic', 'chemical'] },
  // East perimeter aisle, south of the office
  { id: 'perimeter-east-mid', position: [12.0, 0.05, 0.0], rotationY: -Math.PI / 2, suits: ['traffic', 'chemical'] },
  { id: 'perimeter-east-south', position: [12.0, 0.05, 7.2], rotationY: -0.6, suits: ['traffic', 'material'] },
  // Chemical store approach: coherent home for spill and COSHH hazards
  { id: 'chemical-approach', position: [-10.2, 0.05, -4.5], rotationY: 0.3, suits: ['chemical'] },
  // West aisle between the store and rack A
  { id: 'west-aisle-north', position: [-7.7, 0.05, -4.5], rotationY: 0.5, suits: ['material', 'chemical'] },
  { id: 'west-aisle-mid', position: [-7.7, 0.05, 0.0], rotationY: -0.6, suits: ['electrical', 'traffic'] },
  { id: 'west-aisle-south', position: [-7.7, 0.05, 4.5], rotationY: 1.2, suits: ['material', 'electrical'] },
  // Electrical switchroom approach: coherent home for 415V and cable hazards
  { id: 'electrical-approach', position: [10.2, 0.05, -4.5], rotationY: -0.3, suits: ['electrical'] },
  // East aisle between rack B and the switchroom
  { id: 'east-aisle-north', position: [7.7, 0.05, -4.5], rotationY: 0.35, suits: ['material', 'electrical'] },
  { id: 'east-aisle-mid', position: [7.7, 0.05, 0.0], rotationY: -0.25, suits: ['electrical', 'traffic'] },
  { id: 'east-aisle-south', position: [7.7, 0.05, 4.5], rotationY: 2.1, suits: ['material', 'electrical'] },
  // Mid cross-aisle, inside the route corridor but clear of the paint
  { id: 'cross-mid-west', position: [-2.6, 0.05, 0.0], rotationY: 0.15, suits: ['traffic', 'material'] },
  { id: 'cross-mid-east', position: [2.6, 0.05, 0.0], rotationY: -0.25, suits: ['electrical', 'material'] },
  // North goods-in cross-aisle, clear of the dock levellers
  { id: 'north-dock-west', position: [-4.0, 0.05, -7.2], rotationY: Math.PI, suits: ['material', 'traffic'] },
  { id: 'north-dock-east', position: [4.0, 0.05, -7.2], rotationY: Math.PI, suits: ['chemical', 'electrical'] },
  // Always directly in front of the fire exit
  { id: 'fire-exit-approach', position: [11.4, 0.05, -7.2], rotationY: Math.PI, suits: ['fire'] },
];

// Visual variants per hazard category. The generator picks one per run so that
// repeat attempts in the same warehouse do not look identical.
const PROP_VARIANTS = {
  chemical: ['spill-puddle', 'leaking-drum'],
  material: ['leaning-stack', 'overhang-pallet'],
  electrical: ['trailing-cable', 'cable-drum'],
  fire: ['blocked-exit-crates', 'blocked-exit-pallets'],
  traffic: ['missing-barrier', 'blind-corner'],
};

/** Map a hotspot's free-text category onto one of the five known families. */
export const categoriseHotspot = (hotspot) => {
  const cat = `${hotspot?.category || ''} ${hotspot?.title || ''}`.toLowerCase();
  if (/chemical|slip|spill|coshh/.test(cat)) return 'chemical';
  if (/material|pallet|stability|stack|rack/.test(cat)) return 'material';
  if (/electrical|trip|cable|415v|power/.test(cat)) return 'electrical';
  if (/fire|exit|egress|escape/.test(cat)) return 'fire';
  if (/traffic|forklift|vehicle|separation/.test(cat)) return 'traffic';
  return 'material';
};

/** Mulberry32 — small, fast, deterministic PRNG. */
const makeRng = (seed) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffle = (list, rng) => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/** True when a point is inside any racking segment, the office or welfare cabin.
 *  Used as a safety net so a layout can never stage a prop inside a solid. */
export const insideSolid = (x, z, pad = 0.6) => {
  const inRack = RACK_BLOCKS.some(
    (b) =>
      RACK_SEGMENTS.some(
        (s) =>
          x > b.minX - pad &&
          x < b.maxX + pad &&
          z > s.minZ - pad &&
          z < s.maxZ + pad
      )
  );
  if (inRack) return true;
  // The two rooms are solid. The store and the switchroom are not: a trainee
  // has to be able to walk up to the drums and the switchgear to inspect them.
  const inBox = (b) =>
    x > b.minX - pad && x < b.maxX + pad && z > b.minZ - pad && z < b.maxZ + pad;
  if (inBox(OFFICE) || inBox(WELFARE)) return true;
  return false;
};

/**
 * Build a randomized staging plan for the supplied hazard hotspots.
 *
 * @param {Array} hotspots  Canonical hotspot documents from the Scenario.
 * @param {number} seed     Explicit seed. Supply the value returned by
 *                          `randomSeed()` to obtain a fresh, unpredictable run.
 * @returns {{ seed:number, items:Array }} Layout safe to send to the client.
 */
export const generateWalkthroughLayout = (hotspots = [], seed) => {
  const usedSeed = Number.isFinite(seed) ? seed >>> 0 : randomSeed();
  const rng = makeRng(usedSeed);

  const hazards = hotspots.filter((h) => h.isHazard);
  const freeAnchors = shuffle(HAZARD_ANCHORS, rng);

  const items = hazards.map((hotspot) => {
    const family = categoriseHotspot(hotspot);

    // Prefer an anchor that visually suits this hazard family.
    let anchorIndex = freeAnchors.findIndex((a) => (a.suits || []).includes(family));
    let anchor;
    if (anchorIndex === -1) {
      anchorIndex = 0;
      anchor = freeAnchors[0];
    } else {
      anchor = freeAnchors[anchorIndex];
    }
    if (anchor) freeAnchors.splice(anchorIndex, 1);

    const variants = PROP_VARIANTS[family] || PROP_VARIANTS.material;
    const variant = variants[Math.floor(rng() * variants.length)];

    return {
      hotspotId: hotspot.id,
      family,
      propType: variant,
      anchorId: anchor?.id || null,
      position: anchor ? [...anchor.position] : [0, 0.05, 0],
      rotationY: anchor?.rotationY ?? 0,
    };
  });

  return { seed: usedSeed, items };
};

/** Cryptographically-seeded value so a run cannot be predicted by the client. */
export const randomSeed = () => {
  try {
    // Node's crypto is available in all supported runtimes.
    // eslint-disable-next-line global-require
    const crypto = require('crypto');
    return crypto.randomInt(0, 2 ** 31 - 1);
  } catch {
    return Math.floor(Math.random() * 2 ** 31 - 1);
  }
};

/**
 * Rack footprints used by the client scene builder for collision + rendering.
 * Exported so the Three.js warehouse geometry and this layout stay in sync.
 */
export const getRackBlocks = () =>
  RACK_BLOCKS.flatMap((b) =>
    RACK_SEGMENTS.map((s) => ({
      minX: b.minX,
      maxX: b.maxX,
      minZ: s.minZ,
      maxZ: s.maxZ,
    }))
  );
