/**
 * Warehouse Floor Plan
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for the depot's geometry.
 *
 * Every builder — structure, services, props, motion and collision — derives its
 * positions from here rather than hard-coding coordinates. That is what stops
 * a layout change from silently leaving a crate outside the building or a
 * hazard spawn point inside a rack.
 */

/**
 * Compact 26 x 18 m depot.
 *
 * Deliberately smaller than a real distribution shed. Two reasons, and they pull
 * in opposite directions, so it is worth stating plainly:
 *
 *  1. **Playability.** The trainee has 90 seconds to cover the floor on foot.
 *     A realistically sized shed cannot be walked at a believable pace in that
 *     time, so "cover everything" is impossible by construction and the test
 *     measures frustration rather than perception.
 *  2. **Legibility.** A smaller bay keeps the aisles short enough to read as a
 *     place, and keeps the whole floor within a comfortable sightline, so the
 *     trainee can form a mental map and navigate without a minimap.
 *
 * It is a *compressed but internally consistent* bay: aisle widths, rack heights
 * and door dimensions are all human scale, so nothing reads as miniature. It is
 * not a scale model.
 *
 * Area is 468 m², down from the 1632 m² this started at — 71% smaller.
 */
export const ROOM = { width: 26, depth: 18, height: 7 };
export const HALF_W = ROOM.width / 2;
export const HALF_D = ROOM.depth / 2;
const WALL = 0.3;
const PLAYER_RADIUS = 0.55;

/**
 * ZONED floor, not a rack grid.
 *
 * The previous plan was four identical racking runs split by a cross-aisle. It
 * satisfied "a grid of aisles" and failed at everything else: every sightline
 * looked the same, so the trainee could not tell where they were or build a
 * mental map, and the space read as one repeated prop rather than a workplace.
 *
 * This is a small depot with FIVE named areas, which is what a bay this size
 * actually is. Each has its own equipment, its own colour and its own reason to
 * exist, so moving between them is legible:
 *
 *      -13.0        -8.8   -6.6    -3.6            3.6     6.6    8.8         13.0
 *        |  CHEMICAL   | aisle |  RACK A  |  MAIN ROUTE  | RACK B | aisle | ELECTRICAL |
 *  z = -9.0 +----------+-------+--------+---------------+--------+-------+----------+
 *        |  GOODS-IN DOCK APRON (3 levellers, north wall)                    |
 *  z = -6.2 |  store   |        |  seg N  |               | seg N  |        |  switchroom |
 *        |           |        +-------+---- mid cross-aisle ----+-------+        |
 *  z =  0.0 |  drums,  |        |        |   painted zebra  |        |        |  panels,   |
 *        |  bunds,   |        |  seg S  |      route       |  seg S |        |  trafo,    |
 *        |  cabinets |        |        |               |        |        |  trays     |
 *  z = +6.2 |  welfare |        |        |               |        |        |  office   |
 *  z = +8.6 +--------------------- DISPATCH / PACKING ----------------------+
 *
 * Why the racking is now only TWO runs rather than four: with the rest of the
 * floor given to distinct zones, two runs still read as storage without
 * swallowing the room. Four runs left nothing for the rest of the depot to be
 * anything except more racking.
 *
 * Symmetry is deliberately broken. A mirrored plan is tidy on paper and
 * monotonous in practice — the same thing happens at the same distance on both
 * sides, so there is no landmark to navigate by. Here the west side is storage
 * and the east side is services, which means the trainee always knows roughly
 * where they are from which wall they are nearer.
 */
export const RACK_BLOCKS = [
  { minX: -6.6, maxX: -3.6 },
  { minX: 3.6, maxX: 6.6 },
];

export const RACK_SEGMENTS = [
  { minZ: -6.2, maxZ: -1.2 },
  { minZ: 1.2, maxZ: 6.2 },
];

/** Clear, unobstructed painted pedestrian route down the centre. */
export const WALKWAY = { x: 0, width: 3.4, minZ: -7.0, maxZ: 7.0 };

/** Mid cross-aisle band — links the two rack runs to both end aisles. */
export const CROSS_AISLE = { minZ: -1.2, maxZ: 1.2, centerZ: 0 };

/** North (goods-in) and south (dispatch) cross-aisles. */
export const NORTH_AISLE = -7.0;
export const SOUTH_AISLE = 7.0;

// ── Zones ─────────────────────────────────────────────────────────────────────
// Exported because the builders, the labels and the collision model all need to
// agree on where each area starts and stops. These are FLOOR RESERVATIONS, not
// solids: only OFFICE and WELFARE are blocked to the player (see getObstacles),
// because a bunded drum store is something you walk through, not into.

/** Flammable/chemical store: bunded drums, hazmat cabinets, spill pallets. */
export const CHEMICAL_STORE = { minX: -12.6, maxX: -8.8, minZ: -8.6, maxZ: -1.4 };

/** Electrical switchroom: switchgear, transformer, cable tray, isolators. */
export const ELECTRICAL_ZONE = { minX: 8.8, maxX: 12.6, minZ: -8.6, maxZ: -1.4 };

/** Dispatch apron along the south wall: packing benches, wrap station, staging. */
export const DISPATCH = { minX: -8.6, maxX: 8.6, minZ: 6.4, maxZ: 8.6 };

/** Fire exit on the north wall, clear of the dock levellers. */
export const FIRE_EXIT = { x: 11.4, z: -HALF_D, width: 2.6, height: 2.6 };

/** Dock doors along the north wall, clear of the fire exit. */
export const DOCK_DOORS = [-6, 0, 6];

/** Player spawn: south end of the walkway, looking north up the bay. */
export const SPAWN = { x: 0, y: 1.7, z: 6.0, yaw: Math.PI };

/** Solid volumes: racking segments plus the two rooms you cannot walk into. */
export const OFFICE = { minX: 8.9, maxX: 12.5, minZ: 1.4, maxZ: 6.2 };
export const WELFARE = { minX: -12.5, maxX: -8.9, minZ: 1.4, maxZ: 6.2 };

export const getObstacles = () => [
  ...RACK_BLOCKS.flatMap((b) =>
    RACK_SEGMENTS.map((s) => ({
      minX: b.minX,
      maxX: b.maxX,
      minZ: s.minZ,
      maxZ: s.maxZ,
    }))
  ),
  OFFICE,
  WELFARE,
];

/** Movement collision test used by the viewer's render loop. */
export const collidesAt = (x, z, obstacles = getObstacles()) => {
  const limitX = HALF_W - WALL - PLAYER_RADIUS;
  const limitZ = HALF_D - WALL - PLAYER_RADIUS;
  if (Math.abs(x) > limitX || Math.abs(z) > limitZ) return true;
  return obstacles.some(
    (ob) =>
      x > ob.minX - PLAYER_RADIUS &&
      x < ob.maxX + PLAYER_RADIUS &&
      z > ob.minZ - PLAYER_RADIUS &&
      z < ob.maxZ + PLAYER_RADIUS
  );
};

// ── Derived helpers ───────────────────────────────────────────────────────────

/**
 * Centre line of each circulation route, west to east.
 *
 * These are the lines the forklift, the pallet truck and the walking crew are
 * constrained to, so they are derived from the zone edges rather than typed in:
 * if a zone moves, the routes follow it.
 */
export const AISLE_X = [
  -(HALF_W - WALL - 1.0), // west perimeter aisle
  (CHEMICAL_STORE.maxX + RACK_BLOCKS[0].minX) / 2, // between store and rack A
  WALKWAY.x, // the main route
  (RACK_BLOCKS[1].maxX + ELECTRICAL_ZONE.minX) / 2, // between rack B and switchroom
  HALF_W - WALL - 1.0, // east perimeter aisle
];

/** Every rack footprint, for guards, labels and end barriers. */
export const rackRuns = () =>
  RACK_BLOCKS.flatMap((b) =>
    RACK_SEGMENTS.map((s) => ({
      ...b,
      ...s,
      cx: (b.minX + b.maxX) / 2,
      cz: (s.minZ + s.maxZ) / 2,
      width: b.maxX - b.minX,
      length: s.maxZ - s.minZ,
    }))
  );

/**
 * Clamps a position to the walkable floor. Builders use this so a prop can never
 * be authored outside the shell even if a coordinate is later tweaked.
 */
export const clampToFloor = (x, z, pad = 1.2) => [
  Math.max(-HALF_W + pad, Math.min(HALF_W - pad, x)),
  Math.max(-HALF_D + pad, Math.min(HALF_D - pad, z)),
];

/** True when a point is on the painted pedestrian route. */
export const onWalkway = (x, z) =>
  Math.abs(x - WALKWAY.x) < WALKWAY.width / 2 &&
  z > WALKWAY.minZ &&
  z < WALKWAY.maxZ;