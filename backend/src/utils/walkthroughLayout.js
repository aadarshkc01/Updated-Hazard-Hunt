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
//   X: -15 .. 15 (west .. east)
//   Z: -10.5 .. 10.5 (north wall with dock doors .. south dispatch)
// Racking occupies four blocks in X, each SPLIT into two segments (z -8.5..-1.3
// and 1.3..8.5) so the floor is a grid of aisles rather than dead-end corridors.
// The plan is symmetric about x = 0; the widths sum exactly to the room width.
const RACK_BLOCKS = [
  { minX: -12.4, maxX: -9.2 },
  { minX: -5.4, maxX: -2.2 },
  { minX: 2.2, maxX: 5.4 },
  { minX: 9.2, maxX: 12.4 },
];
const RACK_SEGMENTS = [
  { minZ: -8.5, maxZ: -1.3 },
  { minZ: 1.3, maxZ: 8.5 },
];
const ROOM_LIMIT_X = 15;
const ROOM_LIMIT_Z = 10.5;

/** Fixed fire exit on the north wall - the blocked-exit hazard is always staged
 * directly in front of it so the depiction stays coherent. */
export const FIRE_EXIT = { x: 13.4, z: -10.5, width: 2.8, height: 2.8 };

/**
 * Candidate hazard anchor points.
 *
 * Every anchor sits on open, walkable floor so a staged prop never intersects
 * racking, walls, the rooms, or the safety-yellow pedestrian route. None of them
 * sits ON the route (x -1.7 .. 1.7) - a staged hazard must never block the way
 * the trainee has to walk to reach the others.
 *
 * The two cross-aisle anchors sit in the PERIMETER aisles rather than in the
 * middle of the floor. The gap between the walkway edge and the nearest rack
 * (plus a player's body radius) is only about 1.65 m either side, so anything
 * placed between them would be standing on the route itself.
 *
 * `suits` lists hazard categories this anchor is a visually sensible home for.
 * The generator prefers a matching anchor, but falls back to any free anchor so
 * a layout is always produced regardless of category mix.
 */
export const HAZARD_ANCHORS = [
  // Perimeter aisles
  { id: 'perimeter-west-north', position: [-13.5, 0.05, -5.5], rotationY: 0.5, suits: ['chemical', 'material'] },
  { id: 'perimeter-west-south', position: [-13.5, 0.05, 4.5], rotationY: -0.7, suits: ['traffic', 'chemical'] },
  { id: 'perimeter-east', position: [13.5, 0.05, -2.5], rotationY: -Math.PI / 2, suits: ['traffic', 'chemical'] },
  // West aisle, north / mid / south
  { id: 'west-aisle-north', position: [-7.3, 0.05, -6.0], rotationY: 0.5, suits: ['chemical', 'material'] },
  { id: 'west-aisle-mid', position: [-7.3, 0.05, 0.0], rotationY: -0.6, suits: ['electrical', 'chemical'] },
  { id: 'west-aisle-south', position: [-7.3, 0.05, 5.5], rotationY: 1.2, suits: ['material', 'electrical'] },
  // East aisle (offset clear of the conveyor run)
  { id: 'east-aisle-north', position: [7.3, 0.05, -6.0], rotationY: 0.35, suits: ['material', 'chemical'] },
  { id: 'east-aisle-mid', position: [6.4, 0.05, 0.0], rotationY: -0.25, suits: ['electrical', 'traffic'] },
  { id: 'east-aisle-south', position: [6.4, 0.05, 6.0], rotationY: 2.1, suits: ['material', 'electrical'] },
  // Mid cross-aisle, out in the perimeter aisles (see note above)
  { id: 'cross-mid-west', position: [-13.5, 0.05, 0.0], rotationY: 0.15, suits: ['traffic', 'material'] },
  { id: 'cross-mid-east', position: [13.5, 0.05, 0.0], rotationY: -0.25, suits: ['electrical', 'material'] },
  // North goods-in cross-aisle, clear of the dock levellers
  { id: 'north-cross-west', position: [-3.5, 0.05, -9.2], rotationY: Math.PI, suits: ['chemical', 'electrical'] },
  { id: 'north-cross-east', position: [3.5, 0.05, -9.2], rotationY: Math.PI, suits: ['material', 'traffic'] },
  { id: 'north-dock-west', position: [-7.3, 0.05, -9.2], rotationY: Math.PI, suits: ['material', 'traffic'] },
  // Always directly in front of the fire exit
  { id: 'fire-exit-approach', position: [13.4, 0.05, -9.2], rotationY: Math.PI, suits: ['fire'] },
  // South dispatch area
  { id: 'staging-south-west', position: [-7.3, 0.05, 9.2], rotationY: 0.25, suits: ['material', 'electrical'] },
  { id: 'staging-south-east', position: [7.3, 0.05, 9.2], rotationY: -0.4, suits: ['traffic', 'material'] },
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
    (b) => RACK_SEGMENTS.some(
      (s) =>
        x > b.minX - pad &&
        x < b.maxX + pad &&
        z > s.minZ - pad &&
        z < s.maxZ + pad
    )
  );
  if (inRack) return true;
  // Office (SE) and welfare cabin (SW). These bounds duplicate
  // warehousePlan.js - they must be updated together with it.
  if (x > 12.6 - pad && x < 14.7 + pad && z > 4.4 - pad && z < 10.4 + pad) return true;
  if (x > -14.7 - pad && x < -10.2 + pad && z > 8.0 - pad && z < 10.4 + pad) return true;
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
