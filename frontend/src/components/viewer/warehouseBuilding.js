/**
 * Warehouse Building Fabric & Services
 * ───────────────────────────────────────────��─────────────────────────────────
 * Everything that is bolted to the building rather than moved around it:
 * roof structure, profiled wall cladding, floor services, electrical
 * distribution, fire protection, lighting and ventilation.
 *
 * All geometry is procedural and authored in-house. The palette is
 * intentionally distinct from any reference product — graphite racking with
 * teal beams and a green pedestrian walkway rather than blue/orange racking on
 * a yellow walkway — so the depot reads as its own place.
 *
 * Every builder receives the scene context:
 *   { G, M, stage, absorb, trackG, trackM }
 *   - stage(geo, mat, sx, sy, sz, x, y, z, rx, ry, rz)  → instanced
 *   - absorb(group)                                     → bakes a Group into
 *                                                         the instance batches
 */

import * as THREE from 'three';
import { ROOM, HALF_W, HALF_D, RACK_BLOCKS, RACK_SEGMENTS, rackRuns, DOCK_DOORS, FIRE_EXIT, CROSS_AISLE, NORTH_AISLE, SOUTH_AISLE, WALKWAY, OFFICE, WELFARE } from './warehousePlan.js';

// ── Building fabric ───────────────────────────────────────────────────────────

/** Purlins, ridge beam and cross bracing under the portal trusses. */
export const buildRoofStructure = ({ G, M, stage }) => {
  const h = ROOM.height;

  // Portal-frame trusses with a shallow pitched apex. Frame spacing is derived
// from the room depth so the last frame always lands inside the shell.
  const frameSpacing = (HALF_D - 1.2) / 6;
  for (let i = -6; i <= 6; i += 1) {
    const z = i * frameSpacing;
    // Two rafter halves meeting at the ridge.
    stage(G.box, M.purlin, HALF_W + 0.2, 0.34, 0.2, 0, h + 0.15, z - 0.62, 0, 0, -0.035);
    stage(G.box, M.purlin, HALF_W + 0.2, 0.34, 0.2, 0, h + 0.15, z + 0.62, 0, 0, 0.035);
    // Bottom tie beam
    stage(G.box, M.purlin, ROOM.width, 0.22, 0.16, 0, h - 0.5, z);
    // King post + web bracing
    stage(G.box, M.purlin, 0.16, 1.6, 0.16, 0, h + 0.75, z);
    [-1.1, 1.1].forEach((dx) => {
      stage(G.box, M.purlin, 0.12, 0.12, 2.4, dx, h + 0.35, z, 0, 0, Math.PI / 4);
    });
    // eaves columns down each side wall
    [-HALF_W + 0.5, HALF_W - 0.5].forEach((x) => {
      stage(G.box, M.girt, 0.26, h - 0.5, 0.26, x, (h - 0.5) / 2, z);
    });
  }

  // Ridge beam running the length of the building
  stage(G.box, M.purlin, 0.3, 0.5, ROOM.depth, 0, h + 1.55, 0);

  // Longitudinal purlins between the trusses
  for (let x = -15; x <= 15; x += 2.5) {
    stage(G.box, M.purlin, 0.14, 0.2, ROOM.depth - 1, x, h + 0.45 - Math.abs(x) * 0.008, 0);
  }

  // Roof deck panels (shallow, so they read as cladding not floor)
  for (let x = -15; x <= 15; x += 3.75) {
    stage(G.box, M.roofDeck, 3.65, 0.08, ROOM.depth - 0.5, x, h + 0.95 - Math.abs(x) * 0.02, 0);
  }

  // Eaves gutter + downpipes
  [-HALF_W, HALF_W].forEach((x) => {
    stage(G.box, M.girt, 0.5, 0.36, ROOM.depth - 1, x, h - 0.35, 0);
  });
  [-8, 0, 8].forEach((z) => {
    [-HALF_W, HALF_W].forEach((x) => {
      stage(G.cyl, M.girt, 0.11, h - 0.4, 0.11, x + (x < 0 ? 0.16 : -0.16), (h - 0.4) / 2, z);
    });
  });
};

/**
 * Translucent roof-light panels.
 *
 * Rendered as an opaque *emissive* material rather than a transparent one: seen
 * from floor level through a pitched roof they read identically to a bright
 * panel, and because the material is opaque they can be instanced with the
 * rest of the roof instead of costing a draw call each.
 */
export const buildRoofLights = ({ G, M, stage, trackM }) => {
  const roofLight = trackM(
    new THREE.MeshStandardMaterial({
      color: 0xdfeaf2,
      emissive: new THREE.Color(0xbcd4e2),
      emissiveIntensity: 0.9,
      roughness: 0.6,
      side: THREE.DoubleSide,
    })
  );
  const h = ROOM.height;
  // Alternating runs of roof lights, so daylight stripes the floor.
  // They must sit UNDER the ridge, so the height is derived from the eaves.
  for (let i = -2; i <= 2; i += 1) {
    const x = i * 5.6 + (i % 2 === 0 ? 0 : 2.8);
    if (Math.abs(x) > HALF_W - 1.2) continue;
    stage(
      G.plane,
      roofLight,
      2.4,
      4.8,
      1,
      x,
      h + 0.55 - Math.abs(x) * 0.028,
      i % 2 === 0 ? -4.6 : 4.6,
      -Math.PI / 2,
      Math.PI / 2
    );
  }
};

/**
 * Profiled metal wall cladding: vertical ribs plus horizontal girts, with a
 * dark impact-protection dado at the base and a high-level window band.
 */
export const buildWallCladding = ({ G, M, stage }) => {
  const h = ROOM.height;

  const ribbedWall = (length, x, z, ry) => {
    // Vertical profile ribs — the visual signature of metal cladding.
    for (let p = -length / 2; p <= length / 2; p += 0.6) {
      stage(G.box, M.cladding, 0.09, h, 0.05, x + p * Math.cos(ry), h / 2, z - p * Math.sin(ry), 0, ry);
    }
    // Horizontal girts spanning the bays
    for (let y = 1.6; y < h; y += 1.65) {
      stage(G.box, M.girt, length, 0.14, 0.1, x, y, z, 0, ry);
    }
    // High-level translucent window band
    stage(G.box, M.windowBand, length, 1.0, 0.06, x, h - 1.35, z + 0.03, 0, ry);
  };

  ribbedWall(ROOM.width, 0, -HALF_D, 0);
  ribbedWall(ROOM.width, 0, HALF_D, Math.PI);
  ribbedWall(ROOM.depth, -HALF_W, 0, Math.PI / 2);
  ribbedWall(ROOM.depth, HALF_W, 0, -Math.PI / 2);

  // Impact-protection dado at the base (dark rubber-faced barrier)
  [[ROOM.width, 0, -HALF_D, 0], [ROOM.width, 0, HALF_D, Math.PI], [ROOM.depth, -HALF_W, 0, Math.PI / 2], [ROOM.depth, HALF_W, 0, -Math.PI / 2]].forEach(
    ([len, x, z, ry]) => {
      stage(G.box, M.dado, len, 1.1, 0.12, x, 0.6, z, 0, ry);
      stage(G.box, M.columnGuard, len, 0.12, 0.16, x, 1.2, z + (ry === 0 ? 0.02 : -0.02), 0, ry);
    }
  );
};

/**
 * Floor services: drainage channels, expansion joints, column footings and
 * kerbs. These are what stop a concrete slab reading as a flat grey plane.
 */
export const buildFloorServices = ({ G, M, stage }) => {

  // Perimeter drainage channel with a grating
  [[ROOM.width - 2, 0, -HALF_D + 1.6, 0], [ROOM.width - 2, 0, HALF_D - 1.6, 0]].forEach(([len, x, z, ry]) => {
    stage(G.box, M.drain, len, 0.06, 0.34, x, 0.015, z, 0, ry);
    stage(G.box, M.grate, len, 0.03, 0.3, x, 0.05, z, 0, ry);
  });

  // Expansion joints on a 6m grid
  for (let x = -14; x <= 14; x += 4.6) {
    stage(G.plane, M.joint, 0.05, ROOM.depth - 1, 1, x, 0.008, 0, -Math.PI / 2);
  }
  for (let z = -8; z <= 8; z += 4.4) {
    stage(G.plane, M.joint, ROOM.width - 1, 0.05, 1, 0, 0.008, z, -Math.PI / 2);
  }

  // Column footings and impact guards at every structural column
  for (let i = -5; i <= 5; i += 1) {
    const z = i * 2.1;
    [-HALF_W + 0.5, HALF_W - 0.5].forEach((x) => {
      stage(G.box, M.concrete, 0.9, 0.16, 0.9, x, 0.08, z);
      stage(G.box, M.columnGuard, 0.72, 1.0, 0.72, x, 0.66, z);
    });
  }
};

// ── Services ──────────────────────────────────────────────────────────────────

/**
 * Electrical distribution: wall-mounted boards, isolators, conduit runs and an
 * overhead cable tray. These are the boards and cabling a real depot always has.
 */
export const buildElectricalInstallations = ({ G, M, stage, absorb }) => {

  // Distribution boards along the west wall
  [5.5, 1.5, -2.5, -6.5].forEach((z) => {
    const x = -HALF_W + 0.28;
    // Enclosure
    stage(G.box, M.panelBoard, 0.28, 0.95, 0.7, x, 1.55, z);
    // Door with a hinge line and handle
    stage(G.box, M.panelDoor, 0.06, 0.85, 0.6, x + 0.16, 1.55, z);
    stage(G.box, M.steelDark, 0.05, 0.12, 0.05, x + 0.2, 1.55, z + 0.24);
    // Label plate
    stage(G.box, M.signBoard, 0.02, 0.14, 0.28, x + 0.2, 1.92, z);
    // Main switch isolator
    stage(G.box, M.conduit, 0.12, 0.2, 0.14, x + 0.18, 2.2, z);
    // Conduit dropping to the floor and running along the wall
    stage(G.cyl, M.conduit, 0.05, 1.1, 0.05, x + 0.1, 0.55, z + 0.3);
    stage(G.cyl, M.conduit, 0.05, 3, 0.05, x + 0.1, 0.4, z + 1.8, Math.PI / 2);
    // Wall socket outlet
    stage(G.box, M.panelDoor, 0.09, 0.16, 0.13, x + 0.14, 0.5, z - 2.4);
  });

  // Overhead cable tray running the length of the west aisle
  for (let z = -9; z <= 9; z += 2) {
    stage(G.box, M.tray, 0.44, 0.05, 1.9, -HALF_W + 0.85, 4.8, z);
    stage(G.box, M.tray, 0.05, 0.22, 1.9, -HALF_W + 0.63, 5.42, z);
    stage(G.box, M.tray, 0.05, 0.22, 1.9, -HALF_W + 1.07, 5.42, z);
    // Cable bundles resting in the tray
    stage(G.cyl, M.cable, 0.055, 1.85, 0.055, -HALF_W + 0.75, 5.37, z, Math.PI / 2);
    stage(G.cyl, M.cable, 0.045, 1.85, 0.045, -HALF_W + 0.93, 5.37, z, Math.PI / 2);
    // Drop rod to the roof
    stage(G.box, M.steelDark, 0.04, 1.4, 0.04, -HALF_W + 0.85, 5.8, z);
  }

  // Isolator switches beside the dock doors
  DOCK_DOORS.forEach((x) => {
    stage(G.box, M.panelBoard, 0.22, 0.3, 0.24, x + 2.1, 1.7, -HALF_D + 0.3);
    stage(G.box, M.conduit, 0.03, 0.12, 0.03, x + 2.1, 1.56, -HALF_D + 0.44);
  });

  // Wall-mounted consumer unit near the office
  stage(G.box, M.panelBoard, 0.22, 0.5, 0.36, OFFICE.minX - 0.15, 1.7, 8.2);
  stage(G.box, M.panelDoor, 0.04, 0.42, 0.3, OFFICE.minX - 0.21, 1.7, 8.2);
};

/**
 * Fire protection: sprinkler main and heads, hose reels, alarm call points,
 * eyewash station and a first-aid point.
 */
export const buildFireProtection = ({ G, M, stage }) => {

  // Sprinkler main running along the centre, with branch pipes over each aisle
  stage(G.cyl, M.sprinkler, 0.075, 30, 0.075, 0, 7.3, 0, Math.PI / 2);
  [-10, -4.5, 4.5, 10].forEach((x) => {
    stage(G.cyl, M.sprinkler, 0.06, 21, 0.06, x, 7.0, 0, Math.PI / 2);
    // Upright drops to each head
    for (let z = -10; z <= 10; z += 3.2) {
      stage(G.cyl, M.sprinkler, 0.035, 0.22, 0.035, x, 6.84, z);
      stage(G.cone, M.sprinkler, 0.07, 0.1, 0.07, x, 6.68, z);
    }
  });

  // Fire hose reels against the walls
  [[-HALF_W + 0.4, 4], [-HALF_W + 0.4, -4], [HALF_W - 0.4, -6], [HALF_W - 0.4, 2]].forEach(([x, z]) => {
    stage(G.cyl, M.hoseReel, 0.42, 0.24, 0.42, x, 1.15, z, 0, 0, Math.PI / 2);
    stage(G.box, M.steelDark, 0.1, 0.5, 0.1, x, 0.85, z);
    stage(G.box, M.signBoard, 0.05, 0.3, 0.34, x, 2.0, z);
  });

  // Alarm call points + emergency luminaires
  [[-HALF_W + 0.3, 7], [HALF_W - 0.3, 0], [0, -HALF_D + 0.3], [-5, HALF_D - 0.3]].forEach(([x, z]) => {
    stage(G.box, M.callPoint, 0.09, 0.16, 0.11, x, 1.5, z);
  });
  for (let i = -2; i <= 2; i += 1) {
    [-HALF_W + 0.3, HALF_W - 0.3].forEach((x) => {
      stage(G.box, M.emergencyLight, 0.1, 0.12, 0.36, x, 4.8, i * 4.6);
    });
  }

  // Eyewash / drench station near the charging bay
  stage(G.box, M.eyewash, 0.36, 0.5, 0.3, HALF_W - 0.5, 1.1, 3.2);
  stage(G.box, M.steelLight, 0.5, 0.06, 0.36, HALF_W - 0.5, 1.4, 3.2);
  stage(G.box, M.signBoard, 0.04, 0.3, 0.3, HALF_W - 0.68, 1.9, 3.2);

  // First aid point
  stage(G.box, M.firstAid, 0.14, 0.42, 0.34, -HALF_W + 0.3, 1.5, 9.5);
  stage(G.box, M.firstAid, 0.16, 0.1, 0.22, -HALF_W + 0.32, 1.5, 9.5);
  stage(G.box, M.firstAid, 0.16, 0.22, 0.1, -HALF_W + 0.32, 1.5, 9.5);
};

/** High-bay lighting: shrouded fixtures, aisle strips and pendant cables. */
export const buildLightingRig = ({ G, M, stage }) => {
  // High-bay fixtures on a grid, each with a body, reflector and safety cage
  for (let x = -13; x <= 13; x += 6.5) {
    for (let z = -8; z <= 8; z += 5.3) {
      stage(G.box, M.steelDark, 0.05, 0.9, 0.05, x, 7.3, z);
      stage(G.cyl, M.fixtureBody, 0.42, 0.28, 0.42, x, 6.7, z);
      stage(G.cyl, M.led, 0.34, 0.05, 0.34, x, 6.56, z);
      // Wire guard cage
      stage(G.cyl, M.grate, 0.4, 0.03, 0.4, x, 6.5, z);
      for (let i = 0; i < 4; i += 1) {
        const a = (i / 4) * Math.PI * 2;
        stage(G.box, M.grate, 0.8, 0.03, 0.03, x, 6.5, z, 0, a);
      }
    }
  }
  // Linear LED strips over the pedestrian walkway
  for (let z = -9; z <= 9; z += 2.4) {
    stage(G.box, M.led, 0.3, 0.08, 2.2, 0, 6.0, z);
    stage(G.box, M.steelDark, 0.02, 0.8, 0.02, 0, 6.45, z);
  }
};

/** Extract fans, roof vents and a make-up air unit. */
export const buildVentilation = ({ G, M, stage }) => {
  // High-level extract fans in the gable walls
  [-8, 1, 8].forEach((x) => {
    stage(G.box, M.fixtureBody, 1.5, 1.5, 0.3, x, 5.6, HALF_D - 0.35);
    stage(G.cyl, M.fixtureBody, 0.62, 0.3, 0.62, x, 6.0, HALF_D - 0.6, Math.PI / 2);
    stage(G.box, M.grate, 1.4, 1.4, 0.06, x, 5.6, HALF_D - 0.7);
  });
  [-8, 1, 8].forEach((x) => {
    stage(G.box, M.fixtureBody, 1.5, 1.5, 0.3, x, 5.6, -HALF_D + 0.35);
    stage(G.cyl, M.fixtureBody, 0.62, 0.3, 0.62, x, 6.0, -HALF_D + 0.6, Math.PI / 2);
    stage(G.box, M.grate, 1.4, 1.4, 0.06, x, 5.6, -HALF_D + 0.7);
  });
  // Roof-mounted air handling unit
  stage(G.box, M.fixtureBody, 4.0, 1.2, 2.2, -9, 8.5, 4);
  stage(G.box, M.grate, 3.7, 0.06, 1.9, -9, 9.14, 4);
  stage(G.box, M.steelDark, 0.4, 0.5, 0.4, -6.8, 8.4, 4);
  stage(G.box, M.steelDark, 0.4, 0.5, 0.4, -11.2, 8.4, 4);
};

/**
 * Racking protection: column guards at every upright base, end-of-aisle barriers
 * and back-to-back row spacers. Orange-and-white banding, as used in real
 * depots — this is also the single most recognisable racking-safety detail.
 */
export const buildRackingProtection = ({ G, M, stage }) => {
  rackRuns().forEach((run) => {
    // Column guards at each upright position along the run
    for (let z = run.minZ; z <= run.maxZ + 0.01; z += 2.8) {
      [run.minX + 0.1, run.maxX - 0.1].forEach((x) => {
        stage(G.box, M.columnGuard, 0.24, 0.46, 0.24, x, 0.23, z);
        stage(G.box, M.guardBand, 0.26, 0.1, 0.26, x, 0.34, z);
      });
    }
    // End-of-aisle barriers protecting each run end
    [run.minZ - 0.6, run.maxZ + 0.6].forEach((z) => {
      stage(G.box, M.barrierRail, run.width + 0.5, 0.38, 0.11, run.cx, 0.4, z);
      stage(G.box, M.columnGuard, run.width + 0.5, 0.11, 0.15, run.cx, 0.62, z);
    });
  });

  // Back-to-back row spacers up at beam level
  RACK_BLOCKS.forEach((b) => {
    stage(G.box, M.steelDark, 0.5, 0.3, 22, (b.minX + b.maxX) / 2, 5.6, 0);
  });
};