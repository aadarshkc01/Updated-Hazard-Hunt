import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { HALF_D, NORTH_AISLE, SOUTH_AISLE, AISLE_X } from './warehousePlan.js';

/**
 * Bakes a group into ONE mesh per material.
 *
 * A detailed model like the forklift is ~30 small meshes sharing five
 * materials. Since it moves as one rigid body, the sub-meshes never need
 * independent transforms — so they are merged, cutting ~25 draw calls for the
 * same silhouette. Anything that animates a PART (fan blades, belt rollers)
 * must stay unmerged.
 */
export const bakeByMaterial = (group) => {
  const byMaterial = new Map();
  group.updateMatrixWorld(true);

  group.traverse((o) => {
    if (!o.isMesh) return;
    const geo = o.geometry.clone();
    geo.applyMatrix4(o.matrixWorld);
    // Merging requires matching attribute sets; normalise to position+normal+uv.
    for (const name of Object.keys(geo.attributes)) {
      if (!['position', 'normal', 'uv'].includes(name)) geo.deleteAttribute(name);
    }
    if (!geo.attributes.uv) {
      geo.setAttribute(
        'uv',
        new THREE.BufferAttribute(new Float32Array((geo.attributes.position.count) * 2), 2)
      );
    }
    if (!geo.attributes.normal) geo.computeVertexNormals();
    if (!byMaterial.has(o.material)) byMaterial.set(o.material, []);
    byMaterial.get(o.material).push(geo);
  });

  const baked = new THREE.Group();
  byMaterial.forEach((geos, material) => {
    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    if (!merged) return;
    const mesh = new THREE.Mesh(merged, material);
    mesh.position.copy(group.position);
    mesh.rotation.copy(group.rotation);
    mesh.scale.copy(group.scale);
    baked.add(mesh);
    if (geos.length > 1) geos.forEach((g) => g.dispose());
  });
  return baked;
};

/**
 * Animated Warehouse Systems
 * ──────────────────────────────────────────────���──────────────────────────────
 * Everything in the depot that moves, so the building behaves like an operating
 * facility rather than a still diorama.
 *
 * Animated objects are added to the scene as live Groups. They deliberately
 * bypass the static instancing batcher, because instanced transforms are frozen
 * at build time and could not be animated afterwards.
 *
 * Motion is all waypoint-driven with wrapping phase values, so it is
 * deterministic, has no physics cost, and can never drift or snag on geometry.
 */

/** Follows a closed waypoint loop, turning smoothly at each corner. */
const makePatrol = (points, speed) => {
  let i = 0;
  let t = 0;
  return (dt, obj) => {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const seg = Math.hypot(dx, dz) || 0.001;
    t += (dt * speed) / seg;
    if (t >= 1) {
      t -= 1;
      i = (i + 1) % points.length;
    }
    obj.position.x = a[0] + dx * t;
    obj.position.z = a[1] + dz * t;
    // Face the direction of travel
    obj.rotation.y = Math.atan2(dx, dz);
  };
};

/**
 * A counterbalance forklift with a driver, driven slowly around the floor.
 * Returns the live group so the caller can add it to the scene.
 */
const makeForklift = (G, M) => {
  const g = new THREE.Group();
  const put = (geo, mat, sx, sy, sz, px, py, pz, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.scale.set(sx, sy, sz);
    m.position.set(px, py, pz);
    m.rotation.z = rz;
    g.add(m);
    return m;
  };

  put(G.box, M.forklift, 1.15, 0.55, 2.0, 0, 0.55, 0);
  put(G.box, M.forklift, 1.0, 0.5, 0.6, 0, 0.9, 0.75);
  put(G.box, M.darkMetal, 0.9, 0.08, 0.9, 0, 1.55, -0.1);
  [[-0.42, -0.45], [0.42, -0.45], [-0.42, 0.28], [0.42, 0.28]].forEach(([px, pz]) =>
    put(G.box, M.darkMetal, 0.08, 0.7, 0.08, px, 1.2, pz)
  );
  // Operator seat + steering wheel
  put(G.box, M.darkMetal, 0.5, 0.1, 0.45, 0, 1.05, 0.1);
  const wheel = new THREE.Mesh(G.torus, M.tyre);
  wheel.scale.setScalar(0.17);
  wheel.position.set(0, 1.25, -0.35);
  wheel.rotation.x = 1.1;
  g.add(wheel);
  // Mast + forks (carrying a pallet load)
  put(G.box, M.darkMetal, 0.1, 2.3, 0.1, -0.34, 1.15, -0.92);
  put(G.box, M.darkMetal, 0.1, 2.3, 0.1, 0.34, 1.15, -0.92);
  put(G.box, M.darkMetal, 0.85, 0.1, 0.08, 0, 0.45, -1.0);
  put(G.box, M.darkMetal, 0.12, 0.06, 1.0, -0.26, 0.08, -1.45);
  put(G.box, M.darkMetal, 0.12, 0.06, 1.0, 0.26, 0.08, -1.45);
  // A pallet on the forks
  put(G.box, M.pallet, 1.1, 0.14, 1.0, 0, 0.17, -1.5);
  put(G.box, M.carton, 1.0, 0.7, 0.9, 0, 0.6, -1.5);
  // Wheels — front pair realistically sized
  [[-0.5, 0.19, -0.62], [0.5, 0.19, -0.62], [-0.42, 0.14, 0.72], [0.42, 0.14, 0.72]].forEach(
    ([wx, r, wz]) => put(G.cyl, M.tyre, r, 0.2, r, wx, r, wz, Math.PI / 2)
  );
  // Rotating amber beacon
  const beacon = new THREE.Mesh(G.cyl, M.lampAmber);
  beacon.scale.set(0.09, 0.11, 0.09);
  beacon.position.set(0, 1.66, -0.1);
  g.add(beacon);

  // Driver: hi-vis torso and hard hat, seated
  const driver = new THREE.Group();
  const dput = (geo, mat, sx, sy, sz, px, py, pz) => {
    const m = new THREE.Mesh(geo, mat);
    m.scale.set(sx, sy, sz);
    m.position.set(px, py, pz);
    driver.add(m);
  };
  dput(G.capsule, M.hiVis, 0.17, 0.2, 0.13, 0, 1.28, 0.12);
  dput(G.box, M.bandReflect, 0.35, 0.05, 0.26, 0, 1.3, 0.12);
  dput(G.sphere, M.skin, 0.12, 0.14, 0.12, 0, 1.5, 0.14);
  dput(G.sphere, M.helmet, 0.16, 0.12, 0.16, 0, 1.57, 0.14);
  dput(G.capsule, M.hiVis, 0.07, 0.2, 0.07, -0.2, 1.2, -0.05);
  dput(G.capsule, M.hiVis, 0.07, 0.2, 0.07, 0.2, 1.2, -0.05);
  g.add(driver);

  return g;
};

/** Manual pallet truck, also on a slow loop. */
const makePalletTruck = (G, M) => {
  const g = new THREE.Group();
  const put = (geo, mat, sx, sy, sz, px, py, pz) => {
    const m = new THREE.Mesh(geo, mat);
    m.scale.set(sx, sy, sz);
    m.position.set(px, py, pz);
    g.add(m);
    return m;
  };
  put(G.box, M.forklift, 0.18, 0.09, 1.15, -0.26, 0.08, -0.5);
  put(G.box, M.forklift, 0.18, 0.09, 1.15, 0.26, 0.08, -0.5);
  put(G.box, M.steelDark, 0.62, 0.34, 0.34, 0, 0.28, 0.28);
  put(G.box, M.steelDark, 0.08, 1.0, 0.08, 0, 0.85, 0.62);
  put(G.box, M.tyre, 0.7, 0.08, 0.1, 0, 1.3, 0.62);
  put(G.cyl, M.tyre, 0.16, 0.12, 0.16, -0.24, 0.16, 0.5).rotation.z = Math.PI / 2;
  put(G.cyl, M.tyre, 0.16, 0.12, 0.16, 0.24, 0.16, 0.5).rotation.z = Math.PI / 2;
  return g;
};

/**
 * Running conveyor: rollers translate along the belt and wrap, with cartons
 * riding on top. Cheap (a couple of dozen live meshes) and reads instantly.
 */
export const buildConveyor = ({ G, M, scene, stage, animated, markInteractivable }) => {
  // The run sat at x = 8.0, which is now inside the east aisle of the smaller
  // bay; moved onto the rack-B aisle line so it still feeds the storage side.
  const ORIGIN = [AISLE_X[3], 0, 1.0];
  const g = new THREE.Group();
  const add = (geo, mat, sx, sy, sz, px, py, pz) => {
    const m = new THREE.Mesh(geo, mat);
    m.scale.set(sx, sy, sz);
    m.position.set(px, py, pz);
    g.add(m);
    return m;
  };
  // Frame is static, so it goes through the instancing batcher.
  const frame = (sx, sy, sz, px, py, pz) =>
    stage(G.box, M.steelMid, sx, sy, sz, ORIGIN[0] + px, py, ORIGIN[2] + pz);

  // Static frame (batched through absorb by the caller is not possible here, so
  // the frame stays live — it is only a handful of meshes).
  for (let z = -4; z <= 4; z += 2) {
    add(G.box, M.steelMid, 0.08, 0.78, 0.08, -0.5, 0.39, z);
    add(G.box, M.steelMid, 0.08, 0.78, 0.08, 0.5, 0.39, z);
  }
  add(G.box, M.steelMid, 1.2, 0.1, 9, 0, 0.82, 0);
  add(G.box, M.steelMid, 0.05, 0.16, 9, -0.58, 1.0, 0);
  add(G.box, M.steelMid, 0.05, 0.16, 9, 0.58, 1.0, 0);

  // Rollers — each translates along Z and wraps, giving visible belt motion.
  const rollers = [];
  const PITCH = 1.05;
  for (let z = -4.2; z <= 4.2; z += PITCH) {
    const r = new THREE.Mesh(G.cyl, M.steelLight);
    r.scale.set(0.055, 1.1, 0.055);
    r.rotation.z = Math.PI / 2;
    r.position.set(0, 0.9, z);
    g.add(r);
    rollers.push({ mesh: r, offset: z });
  }

  // Cartons riding the belt
  const loads = [-2.4, 0.6, 3.2].map((z, i) => {
    const c = new THREE.Mesh(G.box, i % 2 ? M.carton : M.cartonAlt);
    c.scale.set(0.62, 0.44, 0.52);
    c.position.set(0.1, 1.14, z);
    g.add(c);
    return { mesh: c, offset: z };
  });

  g.position.set(ORIGIN[0], 0, ORIGIN[2]);
  scene.add(g);

  const SPAN = 8.4;
  animated.push((dt) => {
    const step = dt * 1.35;
    // Rollers TRANSLATE along the belt and wrap. They do not spin.
    //
    // The previous version also advanced each roller's `rotation.x`, which read
    // as a machine gun: these are cylinders lying across the belt, so their own
    // rotation is barely perceptible at walking pace anyway. Translating the
    // roller line together with the cartons riding on it is enough to sell a
    // running belt without turning the background into a distraction.
    rollers.forEach((r) => {
      let z = r.offset + step;
      z = ((z + SPAN / 2) % SPAN) - SPAN / 2;
      r.offset = z;
      r.mesh.position.z = z;
    });
    loads.forEach((l) => {
      let z = l.offset + step;
      z = ((z + SPAN / 2) % SPAN) - SPAN / 2;
      l.offset = z;
      l.mesh.position.z = z;
    });
  });

  markInteractivable(
    'Gravity roller conveyor — do not ride or stand on',
    'equipment',
    -10.5,
    1.0,
    6,
    1.6,
    1.6,
    8
  );
  return g;
};

/** Rotating extract fans — a strong, cheap cue that the building is live. */
export const buildExtractionFans = ({ G, M, scene, animated }) => {
  const spinners = [];
  // Gable-mounted, high on the east and west walls.
  [
    [-8, -HALF_D],
    [2, -HALF_D],
    [10, HALF_D],
  ].forEach(([x, z]) => {
    const housing = new THREE.Mesh(G.box, M.fixtureBody);
    housing.scale.set(1.5, 1.5, 0.28);
    housing.position.set(x, 6.0, z * 0.985);
    scene.add(housing);

    const bladeGroup = new THREE.Group();
    const blade = new THREE.Mesh(G.box, M.steelDark);
    blade.scale.set(1.2, 0.2, 0.08);
    bladeGroup.add(blade);
    bladeGroup.position.set(x, 6.0, z * 0.94);
    scene.add(bladeGroup);
    spinners.push({ group: bladeGroup, sign: z > 0 ? 1 : -1 });
  });

  animated.push((dt) => {
    spinners.forEach((s) => {
      s.group.rotation.z += dt * 2.6 * s.sign;
    });
  });
};

/**
 * Vehicles driving fixed loops through the aisles, plus walking staff.
 * Routes deliberately avoid the painted walkway so the route stays clear.
 */
export const buildVehicles = ({ G, M, scene, animated, markInteractivable }) => {
  // ── Forklift: loops the north goods-in area ──
  const forklift = bakeByMaterial(makeForklift(G, M));
  forklift.position.set(-7.7, 0, NORTH_AISLE - 0.6);
  scene.add(forklift);

  // Vehicle routes stay in the aisles and NEVER enter the painted walkway.
  const driveForklift = makePatrol(
    [
      [-8.0, -9.3],
      [-13.9, -9.3],
      [-13.9, 0.0],
      [-8.0, 0.0],
    ],
    1.35
  );
  // The label follows the truck, so it stays hoverable wherever the truck is.
  const forkliftProbe = markInteractivable(
    'Counterbalance forklift — 3.5t rated',
    'vehicle',
    -2,
    1.1,
    -10,
    1.7,
    1.8,
    2.6
  );
  animated.push((dt) => {
    driveForklift(dt, forklift);
    forkliftProbe.position.set(forklift.position.x, 1.1, forklift.position.z);
  });

  // ── Pallet truck: short loop in the south packing area ──
  const truck = bakeByMaterial(makePalletTruck(G, M));
  truck.position.set(2.9, 0, SOUTH_AISLE - 0.4);
  scene.add(truck);
  const driveTruck = makePatrol(
    [
      [2.9, 9.2],
      [9.4, 9.2],
      [9.4, 9.9],
      [2.9, 9.9],
    ],
    0.85
  );
  const truckProbe = markInteractivable('Hand pallet truck', 'equipment', 2.9, 0.7, 9.2, 1, 1.3, 2);
  animated.push((dt) => {
    driveTruck(dt, truck);
    truckProbe.position.set(truck.position.x, 0.7, truck.position.z);
  });

  return { forklift, truck };
};

/**
 * Staff walking their rounds. Each worker patrols a short aisle loop and is
 * built as a live group so it can move. Routes stay off the painted walkway.
 */
/**
 * Simplified walking operative: ~7 meshes instead of ~12. A crew member
 * crossing the floor at 10+ m does not need chin straps and separate boots,
 * and halving them keeps the animated draw-call budget affordable.
 */
const buildWalker = (G, M, x, z) => {
  const g = new THREE.Group();
  const put = (geo, mat, sx, sy, sz, px, py, pz) => {
    const m = new THREE.Mesh(geo, mat);
    m.scale.set(sx, sy, sz);
    m.position.set(px, py, pz);
    g.add(m);
  };
  put(G.capsule, M.trousers, 0.12, 0.32, 0.12, -0.1, 0.44, 0);
  put(G.capsule, M.trousers, 0.12, 0.32, 0.12, 0.1, 0.44, 0);
  put(G.capsule, M.hiVis, 0.18, 0.27, 0.14, 0, 1.08, 0);
  put(G.box, M.bandReflect, 0.37, 0.06, 0.28, 0, 1.1, 0);
  put(G.capsule, M.hiVis, 0.075, 0.22, 0.075, -0.23, 1.05, 0);
  put(G.capsule, M.hiVis, 0.075, 0.22, 0.075, 0.23, 1.05, 0);
  put(G.sphere, M.helmet, 0.17, 0.15, 0.17, 0, 1.45, 0);
  g.position.set(x, 0, z);
  return g;
};

export const buildWalkingCrew = ({ G, M, scene, animated }) => {
  // Routes follow the aisle centre lines: west aisle, east aisle, west
  // perimeter, and one crossing of the mid cross-aisle (transient foot traffic,
  // which is exactly why the route is marked).
  const routes = [
    // Routes follow the plan's own aisle lines (AISLE_X) and cross-aisle depth.
    // They were absolute: the perimeter route at x = -13.9 walked a figure
    // through the wall in the current room.
    { pts: [[AISLE_X[1], NORTH_AISLE + 0.5], [AISLE_X[1], SOUTH_AISLE - 0.5]], speed: 1.15, phase: 0 },
    { pts: [[AISLE_X[3], SOUTH_AISLE - 0.5], [AISLE_X[3], NORTH_AISLE + 0.5]], speed: 1.05, phase: 1.7 },
    { pts: [[AISLE_X[0], SOUTH_AISLE - 1.5], [AISLE_X[0], NORTH_AISLE + 1.5]], speed: 1.25, phase: 3.1 },
    { pts: [[-2.4, 0.2], [2.4, 0.2]], speed: 1.3, phase: 0.6 },
  ];

  routes.forEach((r) => {
    // Baked per material: at aisle distance a walking figure reads from its
    // translation, so per-limb animation would be spend without visible benefit.
    const w = bakeByMaterial(buildWalker(G, M, r.pts[0][0], r.pts[0][1]));
    scene.add(w);
    const walk = makePatrol(r.pts, r.speed);
    // Start each walker part-way round its loop so they are not in step.
    walk(r.phase, w);

    // No gait bob and no lean.
    //
    // Both were sine-driven, and a figure whose whole body rises and falls by
    // 3 cm while also rocking 1° reads as being on a spring rather than
    // walking. At the distance a trainee actually sees them from, the bob looks
    // like a glitch and made the background crew compete for attention with the
    // hazards. Steady translation is what reads as "someone is crossing the
    // floor" and nothing more.
    animated.push((dt) => {
      walk(dt, w);
    });
  });
};

export { makePatrol, makeForklift, makePalletTruck };