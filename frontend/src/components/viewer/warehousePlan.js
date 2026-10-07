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
 * Compact 30 × 21 m depot.
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
 */
export const ROOM = { width: 30, depth: 21, height: 7.6 };
export const HALF_W = ROOM.width / 2;
export const HALF_D = ROOM.depth / 2;
const WALL = 0.3;
const PLAYER_RADIUS = 0.55;

/**
 * Four racking runs creating three aisles plus two perimeter aisles.
 *
 * Each run is SPLIT by the mid cross-aisle, so the floor is a 4 × 3 grid of
 * aisles rather than four dead-end corridors — the trainee can always loop
 * onward instead of backtracking out of a long run against the clock.
 *
 * The plan is symmetric about x = 0 and the widths sum exactly to ROOM.width:
 *
 *         perimeter | run 1 | aisle | run 2 | ROUTE | run 3 | aisle | run 4 | perimeter
 *      -15 ──────── -12.4 ───── -9.2 ───── -5.4 ───── -2.2 ── 0 ─ 2.2 ───── 5.4
 *           2.6        3.2      3.8       3.4     4.4    3.4      3.8       3.2       2.6
 *
 * Symmetry matters more than it looks: it is what lets the interior aisle
 * centres (AISLE_X) be a single mirrored pair, and it means a trainee walking
 * the plan clockwise meets the same sequence of spaces as walking it
 * anticlockwise.
 */
export const RACK_BLOCKS = [
  { minX: -12.4, maxX: -9.2 },
  { minX: -5.4, maxX: -2.2 },
  { minX: 2.2, maxX: 5.4 },
  { minX: 9.2, maxX: 12.4 },
];

export const RACK_SEGMENTS = [
  { minZ: -8.5, maxZ: -1.3 },
  { minZ: 1.3, maxZ: 8.5 },
];

/** Clear, unobstructed painted pedestrian route down the centre. */
export const WALKWAY = { x: 0, width: 3.4, minZ: -9.4, maxZ: 9.4 };

/** Mid cross-aisle band — links all four aisles. */
export const CROSS_AISLE = { minZ: -1.3, maxZ: 1.3, centerZ: 0 };

/** North (goods-in) and south (dispatch) cross-aisles. */
export const NORTH_AISLE = -9.6;
export const SOUTH_AISLE = 9.6;

/** Fire exit on the north wall. */
export const FIRE_EXIT = { x: 13.4, z: -HALF_D, width: 2.8, height: 2.8 };

/** Dock doors along the north wall, clear of the fire exit. */
export const DOCK_DOORS = [-8, -0.5, 6.5];

/** Player spawn: south end of the walkway, looking north. */
export const SPAWN = { x: 0, y: 1.7, z: 9.0, yaw: Math.PI };

/** Solid volumes: racking segments plus the two rooms. */
export const OFFICE = { minX: 12.6, maxX: 14.7, minZ: 4.4, maxZ: 10.4 };
export const WELFARE = { minX: -14.7, maxX: -10.2, minZ: 8.0, maxZ: 10.4 };

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
 * Centre line of each aisle, west to east.
 *
 * Symmetric pairs (-13.5 / 13.5, -7.3 / 7.3) because RACK_BLOCKS is symmetric.
 * Anything that walks or drives a route derives its lanes from here.
 */
export const AISLE_X = [-13.5, -7.3, 0, 7.3, 13.5];

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
