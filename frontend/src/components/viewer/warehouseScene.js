import * as THREE from 'three';
import {
  buildRoofStructure,
  buildRoofLights,
  buildWallCladding,
  buildFloorServices,
  buildElectricalInstallations,
  buildFireProtection,
  buildLightingRig,
  buildVentilation,
  buildRackingProtection,
} from './warehouseBuilding.js';
import {
  buildCages,
  buildPalletCollars,
  buildBulkBags,
  buildDrums,
  buildToolStation,
  buildPackingEquipment,
  buildInspectionPoints,
  buildWelfareCabin,
  buildLadderAccess,
  buildCrew,
} from './warehouseProps.js';
import {
  buildConveyor,
  buildVehicles,
  buildExtractionFans,
  buildWalkingCrew,
} from './warehouseMotion.js';

/**
 * Procedural Warehouse Scene Builder
 * ─────────────────────────────────────────────────────────────────────────────
 * Builds the first-person Bay 4 depot used by Warehouse Walkthrough mode.
 *
 * Everything is generated from code — no external textures, models, or HDRIs —
 * so the bundle stays small and the scene loads instantly on mobile data.
 *
 * Performance budget (mirrors the project NFR-03 targets):
 *  - Static ambient + hemisphere + directional lighting. No shadow maps.
 *  - Repeated props (racking, cartons, trusses, floor paint) are batched into
 *    THREE.InstancedMesh, collapsing ~860 draw calls down to a couple dozen.
 *  - Transparent surfaces stay as individual meshes so they still depth-sort.
 *  - Texture-free materials (flat colour + roughness only).
 */

// -- Floor plan ----------------------------------------------------------------
// Re-exported from warehousePlan.js so the viewer imports a single namespace and
// every builder derives its positions from one shared source of truth.
export {
  ROOM,
  HALF_W,
  HALF_D,
  RACK_BLOCKS,
  RACK_SEGMENTS,
  WALKWAY,
  FIRE_EXIT,
  SPAWN,
  getObstacles,
  collidesAt,
  rackRuns,
} from './warehousePlan.js';

import {
  ROOM,
  HALF_W,
  HALF_D,
  RACK_BLOCKS,
  RACK_SEGMENTS,
  WALKWAY,
  FIRE_EXIT,
  DOCK_DOORS,
  NORTH_AISLE,
  SOUTH_AISLE,
  OFFICE,
  WELFARE,
  rackRuns,
} from './warehousePlan.js';

/**
 * Realistic industrial palette.
 *
 * Colours are chosen to read as real materials rather than a stylised set, and to
 * stay put. Two rules drive this table:
 *
 *  1. **The walkway is safety yellow, not orange.** Yellow is the real-world
 *     colour for a marked pedestrian route and it separates cleanly from the
 *     orange used for hazard props and vehicles, so a trainee can tell "route"
 *     from "risk" at a glance.
 *  2. **Hi-vis is fluorescent yellow-green** (ANSI Class 2), never orange, so
 *     orange stays reserved for genuine hazard depiction.
 *
 * Nothing here is lit by a strong colour cast: the structure is neutral
 * galvanised steel and the floor is cool grey concrete, so every surface keeps
 * the same identity from any viewing angle.
 */
const COL = {
  // Building fabric
  floor: 0x9ea4a9,
  /** Safety yellow crossing paint on the slab, and the drum bund kerbs. */
  walkway: 0xf0c419,
  /** Bund kerb yellow, a shade deeper so the standing steel separates
   *  from the flat paint it is next to. */
  bund: 0xe8b310,
  lineWhite: 0xf6f6f4,
  hazardStripe: 0xf0c020,
  wall: 0xd9dde0,
  wallDado: 0x59636c,
  ceiling: 0xcbd0d4,
  cladding: 0xd5dade,
  /**
   * Structural steel, in a deliberate three-tone hierarchy so the framework
   * reads as engineered rather than as a flat grey mass:
   *   frame  — primary rafters, columns and ties. Near-black: on the reference
   *            build the portal frames and columns are painted charcoal, which
   *            is also what makes them read against a pale roof.
   *   purlin — secondary Z-purlins and girts (mid, galvanised)
   *   deck   — roof sheeting (lightest, catches the roof lights)
   */
  frame: 0x2b3138,
  purlin: 0x8d959d,
  girt: 0x9aa2aa,
  roofDeck: 0xc4cad0,
  concrete: 0x9ea4a9,
  windowBand: 0xcfe0ea,

  // Racking - the most common real combination: blue uprights, orange beams
  rackUpright: 0x2f4f6e,
  rackBeam: 0xd9700a,
  rackDeck: 0x9aa4ac,

  // Materials
  pallet: 0xa8813f,
  carton: 0xc08f52,
  cartonAlt: 0xa9793f,
  crate: 0xa07a4a,
  bulkBag: 0xd9d3c5,
  /**
   * Drums. The reference build has blue steel drums, so `drum` is a deep
   * industrial blue.
   *
   * Both of these were wrong. `drum` was 0x2f6f4e, which is (47,111,78) — a
   * GREEN, not a blue: it was the last green in the scene and it had been read
   * as "the green one" for so long that the hex looked like a blue by
   * association. `drumAlt` was a rust-red. A row of large saturated cylinders
   * on the floor competes with the hazards being hunted and reads as an alarm
   * state rather than as stored stock, so both are now blue/graphite.
   */
  drum: 0x1f4e79,
  drumAlt: 0x39434e,

  // Equipment
  forkliftBody: 0xe8820c,
  hiVis: 0xc6e82a,
  trousers: 0x27407a,
  shirt: 0x2f4a63,
  helmet: 0xf2f4f6,
  skin: 0xc98d63,

  // Metals
  steelDark: 0x4a525b,
  steelMid: 0x828b93,
  steelLight: 0xacb4bb,
  darkMetal: 0x2b3038,
  rubber: 0x24282c,
  grate: 0x8b9299,
  panelBoard: 0xdfe3e6,
  conduit: 0x9aa2a8,
  tray: 0x8a9299,
  cable: 0x1e2226,
  cabinet: 0x2f3a42,

  // Safety & services
  /**
   * Sprinkler main and heads. Red is correct here and is the one place in the
   * scene a red is warranted: it is the universally recognised colour for fire
   * protection pipework, and part of what a trainee is being trained to notice.
   */
  sprinkler: 0xb0342a,
  /**
   * Painted buffer hatching alongside the crossing. Deliberately NOT the
   * sprinkler red: as floor paint, a large red area reads as an alarm state and
   * competes with the hazards the trainee is hunting for. This is a deeper,
   * browner yellow than the crossing bars so the two markings stay
   * distinguishable side by side rather than merging into one yellow field.
   */
  floorBuffer: 0xd9a410,
  signBoard: 0xf2f4f5,
  /** Yellow band on the guard; the guard body itself is charcoal. */
  columnGuard: 0xf0c419,
  guardBody: 0x3d444b,
  barrierRail: 0xd9700a,
  eyewash: 0x2f7d5b,
  led: 0xfff4dc,
  emergencyLight: 0xdff0d8,
  lampAmber: 0xffa41c,
  lampGreen: 0x38d16a,
  exitGreen: 0x1f9d55,

  // Rooms & misc
  officeFloor: 0x8a5f36,
  glass: 0x9fc4d8,
  glassPanel: 0xbfd4de,
  locker: 0x3e5a73,
  benchWood: 0x8a6a44,
  cabinPanel: 0xd3d8dc,
  bin: 0x2f4a5c,
  fixtureBody: 0x8b939b,
  joint: 0x7f868c,
  drain: 0x3d4348,
  tyre: 0x1a1c1f,
};

export const buildWarehouseScene = () => {
  const scene = new THREE.Scene();
  // Background matches the wall cladding tone so no "sky" shows through the
  // shell and the interior reads as a closed building.
  scene.background = new THREE.Color(0xc3c9cf);
  // Fog is pushed beyond the far wall (max sightline ~38 m) so it never tints a
  // surface. Its only job is to hide the clear-colour edge if the camera looks
  // through a doorway.
  scene.fog = new THREE.Fog(0xc3c9cf, 46, 150);

  const geometries = [];
  const materials = [];
  const trackG = (g) => (geometries.push(g), g);
  const trackM = (m) => (materials.push(m), m);

  const std = (params) => trackM(new THREE.MeshStandardMaterial(params));
  const glow = (color, intensity = 1.2) =>
    std({ color, emissive: new THREE.Color(color), emissiveIntensity: intensity, roughness: 0.5 });

  /**
   * Depth bias shared by every floor-marking material.
   *
   * Line markings sit millimetres above the slab. At 34 m that is inside the
   * depth buffer's precision, so without a bias the paint flickers against the
   * concrete as the camera moves — and a flickering decal reads as a colour
   * hovering above the floor rather than painted into it.
   */
  const DECAL = { polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 };

  /**
   * Shared material instances.
   *
   * Every draw call is a unique (geometry, material) pair, so near-identical
   * colours are deliberately ALIASED to one instance rather than given their own.
   * This holds the depot near 55 draw calls despite several hundred props.
   */
  const steelDark = std({ color: COL.steelDark, roughness: 0.62, metalness: 0.55 });
  const steelMid = std({ color: COL.steelMid, roughness: 0.6, metalness: 0.5 });
  const steelLight = std({ color: COL.steelLight, roughness: 0.5, metalness: 0.6 });
  const galvanised = std({ color: COL.conduit, roughness: 0.55, metalness: 0.5 });
  const paleGrey = std({ color: COL.cladding, roughness: 0.8, metalness: 0.12 });
  const white = std({ color: COL.signBoard, roughness: 0.7 });
  const rubber = std({ color: COL.rubber, roughness: 0.95 });
  const concrete = std({ color: COL.concrete, roughness: 0.95 });
  const dark = std({ color: COL.darkMetal, roughness: 0.62, metalness: 0.5 });
  const timber = std({ color: COL.benchWood, roughness: 0.86 });
  const safetyOrange = std({ color: COL.hazardStripe, roughness: 0.72 });
  const serviceRed = std({ color: COL.sprinkler, roughness: 0.55, metalness: 0.3 });
  const teal = std({ color: COL.eyewash, roughness: 0.6 });
  const hiVis = std({ color: COL.hiVis, roughness: 0.72 });

  const M = {
    // -- Structure --
    // Three deliberate tones so the framework reads as engineered: primary
    // frames darkest, secondary purlins/girts mid, roof sheeting lightest.
    floor: concrete,
    concrete,
    joint: steelDark,
    wall: paleGrey,
    cladding: paleGrey,
    ceiling: paleGrey,
    cabinPanel: paleGrey,
    truss: std({ color: COL.frame, roughness: 0.62, metalness: 0.5 }),
    frame: std({ color: COL.frame, roughness: 0.62, metalness: 0.5 }),
    purlin: std({ color: COL.purlin, roughness: 0.58, metalness: 0.55 }),
    girt: std({ color: COL.girt, roughness: 0.55, metalness: 0.6 }),
    roofDeck: std({ color: COL.roofDeck, roughness: 0.7, metalness: 0.25 }),
    cabinFloor: steelDark,
    dado: std({ color: COL.wallDado, roughness: 0.85 }),

    // -- Floor markings: safety-yellow route with white edges --
    lane: std({ color: COL.walkway, roughness: 0.82, ...DECAL }),
    // Solid, NOT a decal: the bunds are physical kerbs standing on the slab.
    bund: std({ color: COL.bund, roughness: 0.6 }),
    lineWhite: std({ color: COL.lineWhite, roughness: 0.8, ...DECAL }),
    hazardStripe: safetyOrange,
    // Column guards are charcoal with a yellow band - the modern standard.
    // Painting every guard body yellow turned the whole floor into a yellow
    // field and buried the safety-yellow route the trainee has to follow.
    columnGuard: std({ color: COL.guardBody, roughness: 0.7 }),
    guardBand: std({ color: COL.columnGuard, roughness: 0.66 }),
    ladderFrame: safetyOrange,
    floorHazard: std({ color: COL.floorBuffer, roughness: 0.8, ...DECAL }),
    drain: dark,
    grate: steelLight,

    // -- Racking --
    upright: std({ color: COL.rackUpright, roughness: 0.6, metalness: 0.35 }),
    beam: std({ color: COL.rackBeam, roughness: 0.55, metalness: 0.3 }),
    barrierRail: std({ color: COL.barrierRail, roughness: 0.6, metalness: 0.3 }),
    deck: steelLight,
    cageFrame: steelMid,
    crate: std({ color: COL.crate, roughness: 0.92 }),
    pallet: std({ color: COL.pallet, roughness: 0.92 }),
    carton: std({ color: COL.carton, roughness: 0.95 }),
    cartonAlt: std({ color: COL.cartonAlt, roughness: 0.95 }),
    // Stretch film: pale, slightly translucent-looking, not a solid white slab.
    bulkBag: std({ color: COL.bulkBag, roughness: 0.42, metalness: 0.1 }),

    // -- Steel & hardware (aliased) --
    steelDark,
    steelMid,
    steelLight,
    darkMetal: dark,
    rubber,
    tyre: rubber,
    tray: steelMid,
    conduit: galvanised,
    fixtureBody: steelMid,
    panelBoard: steelLight,
    panelDoor: steelMid,
    cabinet: dark,
    locker: std({ color: COL.locker, roughness: 0.65, metalness: 0.2 }),
    chairSeat: steelDark,
    toolBoard: steelMid,
    charger: dark,
    bin: std({ color: COL.bin, roughness: 0.7 }),
    binLid: dark,
    bench: timber,
    benchTop: timber,
    officeFloor: std({ color: COL.officeFloor, roughness: 0.7 }),

    // -- Signage --
    signBoard: white,
    firstAid: white,
    noticeBoard: white,
    bandReflect: white,

    // -- Services --
    sprinkler: serviceRed,
    hoseReel: serviceRed,
    callPoint: serviceRed,
    extinguisher: serviceRed,
    eyewash: teal,
    cable: std({ color: COL.cable, roughness: 0.9 }),
    glassPanel: steelLight,
    windowBand: std({
      color: COL.windowBand,
      roughness: 0.4,
      emissive: new THREE.Color(0x5d7b8a),
      emissiveIntensity: 0.35,
    }),
    led: glow(COL.led, 1.6),
    emergencyLight: glow(0x9fd8a0, 0.9),
    exitGreen: glow(COL.exitGreen, 0.9),
    // Blinking status indicators � the animated pass pulses these.
    lampAmber: trackM(glow(COL.lampAmber, 1.4)),
    lampGreen: trackM(glow(COL.lampGreen, 1.2)),

    // -- People & vehicles --
    hiVis,
    forklift: std({ color: COL.forkliftBody, roughness: 0.5, metalness: 0.3 }),
    drum: std({ color: COL.drum, roughness: 0.5, metalness: 0.45 }),
    drumAlt: std({ color: COL.drumAlt, roughness: 0.55, metalness: 0.35 }),
    trousers: std({ color: COL.trousers, roughness: 0.85 }),
    shirt: std({ color: COL.shirt, roughness: 0.85 }),
    helmet: std({ color: COL.helmet, roughness: 0.45 }),
    skin: std({ color: COL.skin, roughness: 0.9 }),

    // -- Transparency (never instanced) --
    glass: std({ color: COL.glass, roughness: 0.15, transparent: true, opacity: 0.42 }),
  };

    const G = {
    floor: trackG(new THREE.PlaneGeometry(ROOM.width, ROOM.depth)),
    wall: trackG(new THREE.PlaneGeometry(1, 1)),
    box: trackG(new THREE.BoxGeometry(1, 1, 1)),
    plane: trackG(new THREE.PlaneGeometry(1, 1)),
    cyl: trackG(new THREE.CylinderGeometry(1, 1, 1, 16)),
    sphere: trackG(new THREE.SphereGeometry(1, 14, 10)),
    cone: trackG(new THREE.ConeGeometry(1, 1, 12)),
    capsule: trackG(new THREE.CapsuleGeometry(1, 1, 4, 10)),
    torus: trackG(new THREE.TorusGeometry(1, 0.06, 8, 28)),
  };

  // ── Instancing batcher ─────────────────────────────────────────────────────
  // Keyed by geometry+material pair; transparent materials are excluded so they
  // keep per-mesh depth sorting.
  const batches = new Map();
  const mtx = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const scl = new THREE.Vector3();
  const pos = new THREE.Vector3();

  const stage = (geo, mat, sx, sy, sz, x, y, z, rx = 0, ry = 0, rz = 0) => {
    if (mat.transparent) {
      const m = new THREE.Mesh(geo, mat);
      m.scale.set(sx, sy, sz);
      m.position.set(x, y, z);
      if (rx || ry || rz) m.rotation.set(rx, ry, rz);
      scene.add(m);
      return m;
    }
    const key = `${geo.uuid}|${mat.uuid}`;
    let b = batches.get(key);
    if (!b) {
      b = { geo, mat, mats: [] };
      batches.set(key, b);
    }
    euler.set(rx, ry, rz);
    quat.setFromEuler(euler);
    scl.set(sx, sy, sz);
    pos.set(x, y, z);
    mtx.compose(pos, quat, scl);
    b.mats.push(mtx.clone());
    // Instanced geometry cannot be individually transformed afterwards — pass
    // rotation through the `stage` arguments instead.
    return null;
  };

  /** Folds an assembled Group into the batches using world transforms. */
  const absorb = (group) => {
    group.updateMatrixWorld(true);
    const wm = new THREE.Matrix4();
    const wq = new THREE.Quaternion();
    const wp = new THREE.Vector3();
    const ws = new THREE.Vector3();
    group.traverse((o) => {
      if (!o.isMesh || o.material.transparent) return;
      o.matrixWorld.decompose(wp, wq, ws);
      const key = `${o.geometry.uuid}|${o.material.uuid}`;
      let b = batches.get(key);
      if (!b) {
        b = { geo: o.geometry, mat: o.material, mats: [] };
        batches.set(key, b);
      }
      wm.compose(wp, wq, ws);
      b.mats.push(wm.clone());
    });
    // The temporary group owns no shared resources; drop it.
    group.clear();
  };

  // -- Runtime systems ---------------------------------------------------------
  /**
   * `animated` holds live objects the viewer ticks each frame. Anything that
   * MOVES or PULSES is added here as a real Group � it deliberately bypasses
   * `absorb`, because instanced transforms are frozen at build time.
   */
  const animated = [];
  /** Invisible pick-boxes the viewer raycasts for "what am I looking at". */
  const interactables = [];
  const proxyGeo = trackG(new THREE.BoxGeometry(1, 1, 1));
  const proxyMat = trackM(
    new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })
  );
  const markInteractivable = (label, kind, x, y, z, sx, sy, sz) => {
    const box = new THREE.Mesh(proxyGeo, proxyMat);
    box.position.set(x, y, z);
    box.scale.set(sx, sy, sz);
    box.userData.label = label;
    box.userData.kind = kind;
    interactables.push(box);
    return box;
  };

  // -- Lighting ---------------------------------------------------------------
  // Deliberately flat and near-neutral.
  //
  // A strongly tinted hemisphere light is what makes a flat-shaded procedural
  // scene look like it is "floating": the same wall reads blue from one angle
  // and grey from another as the trainee turns. Ambient-dominant, low-intensity
  // lighting keeps every surface on its own colour from every viewing angle,
  // while the two soft directionals still give the racking enough shape to read
  // as depth rather than as coloured panels stuck onto the floor.
  scene.add(new THREE.AmbientLight(0xffffff, 0.92));
  scene.add(new THREE.HemisphereLight(0xf3f6f8, 0xb0b6bc, 0.5));
  const key = new THREE.DirectionalLight(0xfff6ec, 0.62);
  key.position.set(12, 20, 8);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xeef2f7, 0.3);
  fill.position.set(-12, 16, -9);
  scene.add(fill);

  // -- Floor + safety-yellow pedestrian route ---------------------------------
  const floor = new THREE.Mesh(G.floor, M.floor);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  /**
   * Painted band lying flat on the floor.
   *
   * `polygonOffset` pulls the paint fractionally toward the camera in depth
   * terms. Without it the 14 mm float above the slab sits close enough to the
   * depth buffer's precision at 34 m to flicker, and a flickering decal reads
   * exactly like a colour hovering over the floor instead of painted into it.
   */
  const paint = (w, l, x, z, mat = M.lane) =>
    stage(G.plane, mat, w, l, 1, x, 0.014, z, -Math.PI / 2);

  /**
   * Zebra crossing.
   *
   * Transverse yellow bars running ACROSS the route, with bare concrete showing
   * between them — a pedestrian crossing, not a road lane. A continuous painted
   * band was the previous treatment and it read as a road marking, which is both
   * wrong for a warehouse and misleading about where vehicles may travel.
   *
   * `along` is the axis the bars are stacked down; `across` is the direction the
   * trainee walks, so the bars always sit perpendicular to travel.
   */
  const zebra = ({ x, z, width, depth, bar, gap }) => {
    const pitch = bar + gap;
    const count = Math.max(1, Math.floor(depth / pitch));
    // Centre the whole run on z, so a partial bar never appears at either end.
    const start = z - ((count - 1) * pitch) / 2;
    for (let i = 0; i < count; i += 1) {
      paint(width, bar, x, start + i * pitch);
    }
  };

  // Main route: clear, unobstructed, marked as a crossing rather than a lane.
  zebra({
    x: WALKWAY.x,
    z: (WALKWAY.minZ + WALKWAY.maxZ) / 2,
    width: WALKWAY.width,
    depth: WALKWAY.maxZ - WALKWAY.minZ,
    bar: 0.42,
    gap: 0.38,
  });

  // Solid edge lines keep the route readable where the bars stop.
  paint(0.14, WALKWAY.maxZ - WALKWAY.minZ, WALKWAY.x - WALKWAY.width / 2 + 0.07, 0, M.lineWhite);
  paint(0.14, WALKWAY.maxZ - WALKWAY.minZ, WALKWAY.x + WALKWAY.width / 2 - 0.07, 0, M.lineWhite);

  // Painted pedestrian pictogram at the route's midpoint, as on a real crossing.
  // Head, shoulders and two legs, built from five small bars.
  {
    const px = WALKWAY.x;
    const pz = WALKWAY.minZ + (WALKWAY.maxZ - WALKWAY.minZ) * 0.62;
    paint(0.42, 0.42, px, pz + 0.62, M.lineWhite); // head
    paint(0.2, 0.72, px, pz + 0.18, M.lineWhite); // torso
    paint(0.78, 0.18, px, pz - 0.16, M.lineWhite); // arms out
    paint(0.18, 0.62, px - 0.2, pz - 0.56, M.lineWhite); // left leg
    paint(0.18, 0.62, px + 0.2, pz - 0.56, M.lineWhite); // right leg
  }

  // The three cross-aisles are marked the same way, so the whole grid of routes
  // reads as a consistent crossing network.
  [
    { z: 0, depth: 2.2 },
    { z: NORTH_AISLE, depth: 2.0 },
    { z: SOUTH_AISLE, depth: 2.0 },
  ].forEach(({ z, depth }) => {
    zebra({
      x: 0,
      z,
      width: ROOM.width - 2.4,
      depth,
      bar: 0.36,
      gap: 0.34,
    });
  });

  // -- Walls + dado band ------------------------------------------------------
  const addWall = (w, h, x, z, ry) => {
    stage(G.wall, M.wall, w, h, 1, x, h / 2, z, 0, ry, 0);
    stage(G.plane, M.dado, w, 1.5, 1, x, 0.75, z + (ry === 0 ? 0.02 : -0.02), 0, ry, 0);
  };
  addWall(ROOM.width, ROOM.height, 0, -HALF_D, 0);
  addWall(ROOM.width, ROOM.height, 0, HALF_D, Math.PI);
  addWall(ROOM.depth, ROOM.height, -HALF_W, 0, Math.PI / 2);
  addWall(ROOM.depth, ROOM.height, HALF_W, 0, -Math.PI / 2);

  const ceiling = new THREE.Mesh(G.floor, M.ceiling);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = ROOM.height;
  scene.add(ceiling);

  // -- Pallet racking: four runs, each split by the mid cross-aisle -----------
  RACK_BLOCKS.forEach((block, blockIndex) => {
    const width = block.maxX - block.minX;
    const cx = (block.minX + block.maxX) / 2;

    RACK_SEGMENTS.forEach((seg, segIndex) => {
      const segLen = seg.maxZ - seg.minZ;
      const cz = (seg.minZ + seg.maxZ) / 2;

      // Upright frames
      for (let z = seg.minZ; z <= seg.maxZ + 0.01; z += 2.8) {
        stage(G.box, M.upright, 0.18, 6.2, 0.16, block.minX + 0.1, 3.1, z);
        stage(G.box, M.upright, 0.18, 6.2, 0.16, block.maxX - 0.1, 3.1, z);
        stage(G.box, M.upright, width, 0.1, 0.1, cx, 1.9, z);
        stage(G.box, M.upright, width, 0.1, 0.1, cx, 4.3, z);
      }
      // Load beams + wire decking at three levels
      [1.5, 3.4, 5.3].forEach((y) => {
        stage(G.box, M.beam, width, 0.16, 0.12, cx, y, seg.minZ + 0.05);
        stage(G.box, M.beam, width, 0.16, 0.12, cx, y, seg.maxZ - 0.05);
        stage(G.plane, M.deck, width, segLen, 1, cx, y + 0.09, cz, -Math.PI / 2);
      });

      // Stocked pallets: individual cartons across the beam, never one slab.
      let seed = Math.abs(Math.round(cx * 7 + segIndex * 31 + blockIndex * 13)) || 7;
      const rnd = () => {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        return seed / 2147483648;
      };
      const COLS = 3;
      const cartonW = (width - 0.7) / COLS;
      for (let z = seg.minZ + 1.2; z < seg.maxZ - 0.6; z += 2.6) {
        [1.7, 3.6, 5.5].forEach((y) => {
          if (rnd() > 0.8) return;
          const px = cx + (rnd() - 0.5) * 0.4;
          stage(G.box, M.pallet, width - 0.5, 0.14, 1.5, px, y, z);
          const layers = 2 + Math.floor(rnd() * 2);
          const wrapped = rnd() > 0.82;
          for (let L = 0; L < layers; L += 1) {
            for (let C = 0; C < COLS; C += 1) {
              for (let R = 0; R < 2; R += 1) {
                stage(
                  G.box,
                  rnd() > 0.5 ? M.carton : M.cartonAlt,
                  cartonW - 0.08,
                  0.5,
                  0.66,
                  px + (C - (COLS - 1) / 2) * cartonW,
                  y + 0.33 + L * 0.52,
                  z + (R - 0.5) * 0.76
                );
              }
            }
          }
          if (wrapped) {
            stage(
              G.box,
              M.bulkBag,
              width - 0.62,
              layers * 0.52 + 0.5,
              1.42,
              px,
              y + 0.16 + (layers * 0.52) / 2,
              z
            );
          }
        });
      }

      // Aisle identification plate at the head of every run.
      stage(G.box, M.signBoard, 0.7, 0.45, 0.05, cx, 5.9, seg.minZ - 0.1);
    });
  });

  // -- Fire exit --------------------------------------------------------------
  stage(G.plane, M.drum, FIRE_EXIT.width, FIRE_EXIT.height, 1, FIRE_EXIT.x, 1.5, -HALF_D + 0.06);
  stage(G.box, M.exitGreen, 1.1, 0.4, 0.08, FIRE_EXIT.x, FIRE_EXIT.height + 0.4, -HALF_D + 0.12);
  markInteractivable('Fire exit � keep clear', 'safety', FIRE_EXIT.x, 1.6, -HALF_D + 0.4, 3.4, 3.4, 1);

  // -- Building fabric and services -------------------------------------------
  const ctx = { scene, G, M, stage, absorb, animated, markInteractivable, trackG, trackM };
  buildWallCladding(ctx);
  buildRoofStructure(ctx);
  buildRoofLights(ctx);
  buildFloorServices(ctx);
  buildElectricalInstallations(ctx);
  buildFireProtection(ctx);
  buildLightingRig(ctx);
  buildVentilation(ctx);
  buildRackingProtection(ctx);

  // -- Equipment and storage --------------------------------------------------
  buildDockDoors(scene, G, M, stage);
  buildConveyor(ctx);
  buildMezzanineStair(scene, G, M, absorb);
  buildChargingBays(ctx);
  buildSafetySignage(scene, G, M, stage);
  buildWasteAndClutter(scene, G, M, stage);
  buildRackLabels(scene, G, M, stage);
  buildCages(ctx);
  buildPalletCollars(ctx);
  buildBulkBags(ctx);
  buildDrums(ctx);
  buildToolStation(ctx);
  buildPackingEquipment(ctx);
  buildInspectionPoints(ctx);
  buildWelfareCabin(ctx);

  // -- Live, animated props (never instanced) --------------------------------
  absorb(buildOffice(G, M, HALF_D));
  buildCrew(ctx);
  buildLadderAccess(ctx);
  buildVehicles(ctx);

  // -- Flush batches into instanced meshes ------------------------------------
  batches.forEach((b) => {
    const inst = new THREE.InstancedMesh(b.geo, b.mat, b.mats.length);
    b.mats.forEach((m, i) => inst.setMatrixAt(i, m));
    inst.instanceMatrix.needsUpdate = true;
    inst.frustumCulled = true;
    scene.add(inst);
  });

  // Interactable proxies live outside the scene graph: they are never drawn but
  // still raycastable once their world matrices are baked.
  const probe = new THREE.Group();
  interactables.forEach((b) => probe.add(b));
  probe.updateMatrixWorld(true);

  return {
    scene,
    /**
     * Drives the live systems: belt, vehicles, walking staff, extract fans.
     *
     * `elapsed` is deliberately unused. An earlier version pulsed the amber and
     * green status lamps on a sine wave, which made the charging bay strobe
     * without cause — real indicator lamps sit steady unless a fault is being
     * annunciated, and a lamp that blinks for decoration reads as an alarm the
     * trainee is meant to react to. Removing it is both more realistic and
     * removes a distraction from the hazards the run is actually about.
     */
    tick(dt) {
      animated.forEach((fn) => fn(dt));
    },
    interactables,
    dispose: () => {
      geometries.forEach((g) => g.dispose?.());
      materials.forEach((m) => m.dispose?.());
    },
  };
};
// ── Sub-assemblies ───────────────────────────────────────────────────────────

/**
 * Three roller shutter dock doors along the north wall, with bumpers, a
 * dock leveller lip and canopy lights. Immediately reads as a real goods-in
 * bay rather than a blank wall.
 */
function buildDockDoors(scene, G, M, stage) {
  const z = -HALF_D + 0.05;
  // Spaced for the 30 m plan; clear of the fire exit at x = 13.4.
  [-12, -2, 8].forEach((x) => {
    // Recessed opening
    stage(G.plane, M.dado, 3.6, 4.2, 1, x, 2.1, z - 0.02);
    // Shutter slats
    for (let i = 0; i < 7; i += 1) {
      stage(G.box, M.steelDark, 3.4, 0.5, 0.06, x, 0.45 + i * 0.52, z + 0.02);
    }
    // Frame + bumpers
    stage(G.box, M.steelDark, 0.16, 4.4, 0.2, x - 1.85, 2.2, z + 0.05);
    stage(G.box, M.steelDark, 0.16, 4.4, 0.2, x + 1.85, 2.2, z + 0.05);
    stage(G.box, M.steelDark, 3.9, 0.2, 0.2, x, 4.4, z + 0.05);
    stage(G.box, M.rubber, 0.3, 0.5, 0.24, x - 1.95, 0.6, z + 0.1);
    stage(G.box, M.rubber, 0.3, 0.5, 0.24, x + 1.95, 0.6, z + 0.1);
    // Dock leveller lip
    stage(G.box, M.steelMid, 3.2, 0.06, 1.2, x, 0.04, z + 0.7);
    // Canopy light over the opening
    stage(G.box, M.led, 1.8, 0.1, 0.26, x, 4.15, z + 0.5);
  });
}


/** Steel access stair to the mezzanine office — a classic fall-from-height risk. */
function buildMezzanineStair(scene, G, M, absorb) {
  const g = new THREE.Group();
  const put = (geo, mat, sx, sy, sz, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.scale.set(sx, sy, sz);
    m.position.set(x, y, z);
    g.add(m);
  };
  const steps = 12;
  for (let i = 0; i < steps; i += 1) {
    put(G.box, M.steelMid, 1.1, 0.05, 0.3, 0, 0.26 * i + 0.13, -i * 0.28);
  }
  // Stringers + handrail
  put(G.box, M.steelDark, 0.08, 0.12, steps * 0.29, -0.58, 1.55, -steps * 0.145);
  put(G.box, M.steelDark, 0.08, 0.12, steps * 0.29, 0.58, 1.55, -steps * 0.145);
  put(G.box, M.steelLight, 0.05, 0.05, steps * 0.29, -0.58, 2.5, -steps * 0.145);
  put(G.box, M.steelLight, 0.05, 0.05, steps * 0.29, 0.58, 2.5, -steps * 0.145);
  for (let i = 0; i < steps; i += 3) {
    put(G.box, M.steelLight, 0.05, 1.0, 0.05, -0.58, 1.9, -i * 0.28);
    put(G.box, M.steelLight, 0.05, 1.0, 0.05, 0.58, 1.9, -i * 0.28);
  }
  // Top landing
  put(G.box, M.steelMid, 1.3, 0.08, 1.2, 0, 3.2, -steps * 0.28 - 0.6);
  g.position.set(OFFICE.minX - 0.5, 0, 7.0);
  g.rotation.y = Math.PI;
  return g;
}

/** Battery charging bay against the west perimeter aisle. */
function buildChargingBays(ctx) {
  const { scene, G, M, absorb, markInteractivable } = ctx;
  const g = new THREE.Group();
  const put = (geo, mat, sx, sy, sz, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.scale.set(sx, sy, sz);
    m.position.set(x, y, z);
    g.add(m);
  };
  // Wall-mounted charger cabinets with live status lamps
  [0, 1, 2].forEach((i) => {
    put(G.box, M.cabinet, 0.6, 0.9, 0.35, -1.6 + i * 1.6, 1.1, -1.2);
    put(G.box, M.steelDark, 0.5, 0.1, 0.06, -1.6 + i * 1.6, 1.32, -1.0);
    // Charge indicator. Steady, not blinking — see the note on tick().
    put(G.box, i === 1 ? M.lampGreen : M.lampAmber, 0.14, 0.07, 0.05, -1.6 + i * 1.6, 1.44, -1.02);
    // Ventilation louvres
    for (let v = 0; v < 3; v += 1) {
      put(G.box, M.steelDark, 0.42, 0.03, 0.04, -1.6 + i * 1.6, 0.85 + v * 0.09, -1.02);
    }
  });
  // Barrier rail protecting the bay
  put(G.box, M.rubber, 5.4, 0.12, 0.12, 0, 0.5, 1.4);
  [-2.5, 0, 2.5].forEach((x) => put(G.box, M.steelDark, 0.1, 0.5, 0.1, x, 0.25, 1.4));
  // The bay is authored facing +X and then rotated a quarter turn onto the west
  // wall, which puts the cabinets 1.2 m BEHIND the group origin. Offsetting the
  // origin from the wall was therefore wrong by that same 1.2 m: it left the
  // cabinets embedded in, and poking through, the cladding. Place the origin so
  // the cabinet back face lands on the wall's inner face instead.
  const CABINET_DEPTH = 0.35;
  const CABINET_LOCAL_Z = -1.2;
  const WALL_CLEARANCE = 0.35;
  g.position.set(
    -HALF_W + WALL_CLEARANCE + CABINET_DEPTH / 2 - CABINET_LOCAL_Z,
    0,
    1.5
  );
  g.rotation.y = Math.PI / 2;
  scene.add(g);
  markInteractivable('Battery charging bay � 415V, earth the truck', 'electrical', -HALF_W + 1.2, 1.2, 1.5, 1.6, 1.8, 4.2);
}

/** Safety signage and floor markings that define the traffic regime. */
function buildSafetySignage(scene, G, M, stage, markInteractivable) {
  // Hung bay-identification boards under the trusses
  [-11, 0, 11].forEach((x) => {
    stage(G.box, M.signBoard, 1.1, 0.7, 0.05, x, 5.4, -7);
    stage(G.box, M.steelDark, 0.04, 1.4, 0.04, x, 6.4, -7);
  });
  // Bay numbers painted on the wall dado
  stage(G.box, M.signBoard, 1.6, 0.5, 0.04, -8.0, 2.6, -HALF_D + 0.08);
  stage(G.box, M.signBoard, 1.6, 0.5, 0.04, 8.0, 2.6, -HALF_D + 0.08);
  // Painted buffer hatching in the strip between the crossing edge and the racking.
  //
  // This was previously at x = +/-3.1, which was fine while the inner racks sat
  // at 2.5 and left a 0.6 m buffer — but at the current rack face (2.2 m) the
  // hatching ended up level with, and partly under, the racking it was marking.
  // It is now measured from the plan, so it stays in the gap whatever the rack
  // layout is.
  const innerRackEdge = Math.min(
    ...RACK_BLOCKS.filter((b) => b.maxX < 0).map((b) => -b.maxX),
    ...RACK_BLOCKS.filter((b) => b.minX > 0).map((b) => b.minX)
  );
  const bufferX = (WALKWAY.width / 2 + innerRackEdge) / 2;
  for (let z = -7.5; z <= 7.5; z += 1.5) {
    stage(G.plane, M.floorHazard, 0.18, 0.9, 1, -bufferX, 0.014, z, -Math.PI / 2);
    stage(G.plane, M.floorHazard, 0.18, 0.9, 1, bufferX, 0.014, z, -Math.PI / 2);
  }
  // Fire extinguisher stations along the east wall
  [7, 0, -7].forEach((z) => {
    stage(G.cyl, M.extinguisher, 0.11, 0.5, 0.11, HALF_W - 0.35, 1.1, z);
    stage(G.box, M.signBoard, 0.34, 0.44, 0.04, HALF_W - 0.12, 1.75, z);
  });
  markInteractivable?.('Fire extinguisher point', 'safety', HALF_W - 0.5, 1.4, 0, 0.8, 1.8, 2.2);
}

/** Pallets, waste bins and stretch wrap - the clutter of a working depot. */
function buildWasteAndClutter(scene, G, M, stage) {
  // Wheeled waste bins in the aisles
  [[-11.2, -6.5, 0.3], [11.4, 8.5, -0.5]].forEach(([x, z, ry]) => {
    stage(G.box, M.bin, 0.72, 0.95, 0.66, x, 0.5, z, 0, ry);
    stage(G.box, M.binLid, 0.76, 0.08, 0.7, x, 1.0, z, 0, ry);
    stage(G.cyl, M.rubber, 0.09, 0.06, 0.09, x - 0.26, 0.09, z - 0.2, Math.PI / 2);
    stage(G.cyl, M.rubber, 0.09, 0.06, 0.09, x + 0.26, 0.09, z + 0.2, Math.PI / 2);
  });
  // Stacked empty pallets
  [[-8.2, 8.6], [13.6, -9.2]].forEach(([x, z]) => {
    for (let i = 0; i < 5; i += 1) {
      stage(G.box, M.pallet, 1.2, 0.13, 1.0, x + (i % 2) * 0.04, 0.07 + i * 0.14, z, 0, (i % 3) * 0.02);
    }
  });
  // A toppled empty crate
  stage(G.box, M.crate, 0.8, 0.55, 0.7, 6.5, 0.28, -9.8, 0, 0.6);
}

/** Aisle identification plates on the racking uprights. */
function buildRackLabels(scene, G, M, stage) {
  rackRuns().forEach((run) => {
    [-6, 6].forEach((dz) => {
      stage(G.box, M.signBoard, 0.5, 0.34, 0.04, run.minX - 0.02, 4.9, run.cz + dz);
    });
    // Foot guards at the open ends of every segment
    stage(G.box, M.columnGuard, 0.42, 0.3, 0.42, run.cx, 0.15, run.minZ - 0.5);
    stage(G.box, M.guardBand, 0.44, 0.08, 0.44, run.cx, 0.24, run.minZ - 0.5);
    stage(G.box, M.columnGuard, 0.42, 0.3, 0.42, run.cx, 0.15, run.maxZ + 0.5);
    stage(G.box, M.guardBand, 0.44, 0.08, 0.44, run.cx, 0.24, run.maxZ + 0.5);
  });
}

function buildPalletTruck(G, M, x, z, ry) {
  const g = new THREE.Group();
  const put = (geo, mat, sx, sy, sz, px, py, pz, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.scale.set(sx, sy, sz);
    m.position.set(px, py, pz);
    m.rotation.z = rz;
    g.add(m);
  };
  put(G.box, M.forklift, 0.18, 0.09, 1.15, -0.26, 0.08, -0.5);
  put(G.box, M.forklift, 0.18, 0.09, 1.15, 0.26, 0.08, -0.5);
  put(G.box, M.steelDark, 0.62, 0.34, 0.34, 0, 0.28, 0.28);
  put(G.box, M.steelDark, 0.08, 1.0, 0.08, 0, 0.85, 0.62);
  put(G.box, M.rubber, 0.7, 0.08, 0.1, 0, 1.3, 0.62);
  put(G.cyl, M.rubber, 0.16, 0.12, 0.16, -0.24, 0.16, 0.5, Math.PI / 2);
  put(G.cyl, M.rubber, 0.16, 0.12, 0.16, 0.24, 0.16, 0.5, Math.PI / 2);
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  return g;
}

/** Glazed mezzanine supervisor office, anchored to the reserved footprint. */
function buildOffice(G, M, halfD) {
  const ox = (OFFICE.minX + OFFICE.maxX) / 2;
  const oz = (OFFICE.minZ + OFFICE.maxZ) / 2;
  const w = OFFICE.maxX - OFFICE.minX;
  const d = OFFICE.maxZ - OFFICE.minZ;
  const h = 3.2;
  const g = new THREE.Group();
  const add = (geo, mat, sx, sy, sz, x, y, z, ry = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.scale.set(sx, sy, sz);
    m.position.set(x, y, z);
    if (ry) m.rotation.y = ry;
    g.add(m);
  };
  add(G.box, M.officeFloor, w, 0.08, d, ox, 0.04, oz);
  add(G.plane, M.wall, d, h, 1, halfD - 0.1, h / 2, oz, Math.PI / 2);
  add(G.plane, M.wall, d, h, 1, ox, h / 2, oz + d / 2, 0);
  add(G.plane, M.wall, d, h, 1, OFFICE.minX + 0.05, h / 2, oz, -Math.PI / 2);
  add(G.plane, M.glass, d - 1.2, 1.5, 1, OFFICE.minX + 0.08, 2.0, oz, -Math.PI / 2);
  add(G.box, M.ceiling, w, 0.1, d, ox, h, oz);

  // Two desks with chairs - reads instantly as a supervisor's office.
  [6.4, 10.2].forEach((z) => {
    add(G.box, M.benchTop, 1.4, 0.07, 0.8, ox + 0.3, 0.76, z);
    [ox - 0.1, ox + 0.7].forEach((lx) => {
      add(G.box, M.bench, 0.06, 0.74, 0.06, lx, 0.38, z - 0.3);
      add(G.box, M.bench, 0.06, 0.74, 0.06, lx, 0.38, z + 0.3);
    });
    add(G.box, M.darkMetal, 0.5, 0.34, 0.06, ox + 0.3, 1.0, z - 0.28);
    add(G.box, M.darkMetal, 0.44, 0.06, 0.44, ox - 0.6, 0.45, z);
    add(G.box, M.darkMetal, 0.44, 0.5, 0.06, ox - 0.82, 0.7, z);
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * Math.PI * 2;
      add(G.box, M.darkMetal, 0.05, 0.44, 0.05, ox - 0.6 + Math.cos(a) * 0.16, 0.22, z + Math.sin(a) * 0.16);
    }
  });

  // Cabinet run on the back wall.
  add(G.box, M.crate, 1.0, 1.9, 0.4, ox + 0.5, 0.95, oz + d / 2 - 0.3);
  add(G.box, M.crate, 0.9, 0.35, 0.35, ox - 0.6, 1.5, oz + d / 2 - 0.25);
  add(G.box, M.cartonAlt, 0.7, 0.3, 0.3, ox - 0.6, 1.85, oz + d / 2 - 0.25);
  return g;
}

function buildForklift(G, M) {
  const g = new THREE.Group();
  const put = (geo, mat, sx, sy, sz, px, py, pz, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.scale.set(sx, sy, sz);
    m.position.set(px, py, pz);
    m.rotation.z = rz;
    g.add(m);
  };
  put(G.box, M.forklift, 1.15, 0.55, 2.0, 0, 0.55, 0);
  put(G.box, M.forklift, 1.0, 0.5, 0.6, 0, 0.9, 0.75);
  put(G.box, M.darkMetal, 0.9, 0.08, 0.9, 0, 1.55, -0.1);
  [[-0.42, -0.45], [0.42, -0.45], [-0.42, 0.28], [0.42, 0.28]].forEach(([px, pz]) =>
    put(G.box, M.darkMetal, 0.08, 0.7, 0.08, px, 1.2, pz)
  );
  put(G.box, M.darkMetal, 0.5, 0.1, 0.45, 0, 1.05, 0.1);
  put(G.box, M.darkMetal, 0.1, 2.3, 0.1, -0.34, 1.15, -0.92);
  put(G.box, M.darkMetal, 0.1, 2.3, 0.1, 0.34, 1.15, -0.92);
  put(G.box, M.darkMetal, 0.85, 0.1, 0.08, 0, 0.45, -1.0);
  put(G.box, M.darkMetal, 0.12, 0.06, 1.0, -0.26, 0.08, -1.45);
  put(G.box, M.darkMetal, 0.12, 0.06, 1.0, 0.26, 0.08, -1.45);

  const wheel = new THREE.Mesh(G.torus, M.tyre);
  wheel.scale.setScalar(0.17);
  wheel.position.set(0, 1.25, -0.35);
  wheel.rotation.x = 1.1;
  g.add(wheel);

  // Wheels: realistic tyre radii (front 0.38m dia, rear 0.28m dia).
  [[-0.5, 0.19, -0.62], [0.5, 0.19, -0.62], [-0.42, 0.14, 0.72], [0.42, 0.14, 0.72]].forEach(
    ([wx, r, wz]) => put(G.cyl, M.tyre, r, 0.2, r, wx, r, wz, Math.PI / 2)
  );

  const beacon = new THREE.Mesh(G.sphere, M.led);
  beacon.scale.setScalar(0.11);
  beacon.position.set(0, 1.66, -0.1);
  g.add(beacon);

  // Parked in the main aisle — visible on approach but clear of the spawn view.
  g.position.set(-4, 0, 4.5);
  g.rotation.y = -0.9;
  return g;
}

