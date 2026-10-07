import * as THREE from 'three';
import { ROOM, HALF_W, HALF_D, WALKWAY, OFFICE, WELFARE, RACK_BLOCKS, AISLE_X, CHEMICAL_STORE, ELECTRICAL_ZONE, DISPATCH, NORTH_AISLE, SOUTH_AISLE } from './warehousePlan.js';

/**
 * Warehouse Props, Equipment & People
 * ─────────────────────────────────────────────────────────────────────────────
 * The things that get moved, stacked, used and left lying around: storage
 * units, handling equipment, a tool station, the welfare cabin, and the
 * workforce itself.
 *
 * All models are authored here in code. Nothing is traced, sampled or derived
 * from any external asset, and the silhouettes are deliberately generic so the
 * depot stands on its own.
 *
 * Each builder receives `{ G, M, stage, absorb }`.
 */

// ── Storage ───────────────────────────────────────────────────────────────────

/**
 * Galvanised cage pallets and roll-cages. The wire mesh is suggested with thin
 * bars rather than a texture, keeping it free of external assets.
 */
export const buildCages = ({ G, M, stage }) => {
  const cage = (x, z, ry, stacked = 0) => {
    for (let s = 0; s <= stacked; s += 1) {
      const y = s * 1.35;
      // Base pallet
      stage(G.box, M.pallet, 1.2, 0.14, 0.85, x, y + 0.07, z, 0, ry);
      // Corner posts
      const w = 1.15;
      const d = 0.8;
      [[-w, -d], [w, -d], [-w, d], [w, d]].forEach(([px, pz]) => {
        stage(
          G.box,
          M.cageFrame,
          0.05,
          1.15,
          0.05,
          x + px * Math.cos(ry) - pz * Math.sin(ry),
          y + 0.72,
          z + px * Math.sin(ry) + pz * Math.cos(ry),
          0,
          ry
        );
      });
      // Mesh sides: horizontal rails + verticals
      [0.25, 0.6, 0.95].forEach((ry2) => {
        [0, 1, 2, 3].forEach((side) => {
          const along = side % 2 === 0 ? w : d;
          const off = side < 2 ? (side === 0 ? -d : d) : side === 2 ? -w : w;
          stage(
            G.box,
            M.cageFrame,
            side % 2 === 0 ? along * 2 : 0.04,
            0.04,
            side % 2 === 0 ? 0.04 : along * 2,
            x + off * Math.cos(ry),
            y + ry2,
            z + off * Math.sin(ry),
            0,
            ry
          );
        });
      });
      // Contents
      stage(G.box, M.carton, 1.0, 0.6, 0.68, x, y + 0.48, z, 0, ry);
      if (s === stacked) {
        stage(G.box, M.cartonAlt, 0.9, 0.45, 0.6, x + 0.04, y + 1.0, z, 0, ry);
      }
    }
  };
  // Placed per zone: stillages belong to the store, empty cages to the aprons.
  const storeMidX = (CHEMICAL_STORE.minX + CHEMICAL_STORE.maxX) / 2;
  cage(storeMidX - 0.9, -6.4, 0.1);
  cage(storeMidX - 0.9, -6.4, 0.1, 1);
  cage(storeMidX + 0.4, -6.3, -0.15);
  cage(HALF_W - 1.2, -7.6, Math.PI / 2);
  cage(HALF_W - 1.2, -1.0, 0.35);
  cage(-6.0, DISPATCH.maxZ - 0.9, -0.2);
  cage(5.5, NORTH_AISLE - 0.6, 0.05);
};

/** Timber pallet collars / crates with slatted sides. */
export const buildPalletCollars = ({ G, M, stage }) => {
  const collar = (x, z, ry, h = 1.0) => {
    stage(G.box, M.pallet, 1.2, 0.14, 0.85, x, 0.07, z, 0, ry);
    // Corner timbers
    [[-0.56, -0.38], [0.56, -0.38], [-0.56, 0.38], [0.56, 0.38]].forEach(([px, pz]) => {
      stage(
        G.box,
        M.crate,
        0.09,
        h,
        0.09,
        x + px * Math.cos(ry) - pz * Math.sin(ry),
        h / 2 + 0.14,
        z + px * Math.sin(ry) + pz * Math.cos(ry),
        0,
        ry
      );
    });
    // Horizontal slats
    for (let i = 0; i < 4; i += 1) {
      const y = 0.28 + i * (h / 4);
      stage(G.box, M.crate, 1.2, 0.09, 0.05, x, y, z - 0.4, 0, ry);
      stage(G.box, M.crate, 1.2, 0.09, 0.05, x, y, z + 0.4, 0, ry);
      stage(G.box, M.crate, 0.05, 0.09, 0.85, x - 0.58, y, z, 0, ry);
      stage(G.box, M.crate, 0.05, 0.09, 0.85, x + 0.58, y, z, 0, ry);
    }
    // Load inside
    stage(G.box, M.carton, 1.0, h - 0.2, 0.7, x, h / 2 + 0.14, z, 0, ry);
  };
  const storeMidX2 = (CHEMICAL_STORE.minX + CHEMICAL_STORE.maxX) / 2;
  collar(storeMidX2 - 0.6, CHEMICAL_STORE.maxZ + 0.6, 0.2);
  collar(storeMidX2 + 0.6, CHEMICAL_STORE.maxZ + 0.8, -0.1);
  collar(HALF_W - 1.1, 0.4, Math.PI / 2, 1.2);
  collar(-HALF_W + 1.1, NORTH_AISLE - 0.5, 0.35);
};

/** Bulk bags on pallet collars — a distinctive silhouette. */
export const buildBulkBags = ({ G, M, stage }) => {
  const bag = (x, z, ry) => {
    stage(G.box, M.pallet, 1.25, 0.14, 1.25, x, 0.07, z, 0, ry);
    stage(G.box, M.bulkBag, 1.0, 1.1, 1.0, x, 0.7, z, 0, ry);
    // Top lifting loops
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      stage(
        G.box,
        M.bulkBag,
        0.06,
        0.22,
        0.06,
        x + Math.cos(a) * 0.36,
        1.34,
        z + Math.sin(a) * 0.36
      );
    }
  };
  bag(HALF_W - 1.1, 0.9, 0.2);
  bag(HALF_W - 1.1, -0.9, -0.3);
  bag(-HALF_W + 1.1, NORTH_AISLE - 0.4, 0.5);
};

/** Stacks of drums, some upright and some on a pallet. */
export const buildDrums = ({ G, M, stage }) => {
  /**
   * A 205-litre drum: body, two rolling hoops and a chime ring.
   * When tipped, the whole assembly is laid along Z and rests on its radius.
   */
  const drum = (x, z, mat, { y = null, tipped = false } = {}) => {
    const R = 0.29;
    const H = 0.88;
    if (tipped) {
      const cy = R;
      stage(G.cyl, mat, R, H, R, x, cy, z, Math.PI / 2);
      // Hoops follow the drum axis, so they sit at +/-H/4 along Z
      [-0.22, 0.22].forEach((dz) => {
        stage(G.cyl, M.steelDark, R * 1.06, 0.06, R * 1.06, x, cy, z + dz, Math.PI / 2);
      });
      return;
    }
    const cy = y ?? H / 2;
    stage(G.cyl, mat, R, H, R, x, cy, z);
    [0.28, 0.6].forEach((ho) => {
      stage(G.cyl, M.steelDark, R * 1.06, 0.06, R * 1.06, x, cy - H / 2 + ho, z);
    });
  };

  /**
   * Yellow spill-containment bund.
   *
   * A low steel kerb on a pallet-sized footprint, with a grating floor. Every
   * drum in the store sits inside one, because bunding is mandatory wherever
   * flammables are held — and a drum standing on bare concrete reads as a
   * missing control rather than as stored stock.
   *
   * Modelled as four separate kerbs rather than one box so the open top is
   * visible; a solid block would just read as a yellow crate.
   */
  const bund = (x, z, w = 1.5, d = 1.5, kerb = 0.12, h = 0.16) => {
    // Grating floor, sunk slightly so the kerbs stand proud of it.
    stage(G.box, M.grate, w - kerb, 0.03, d - kerb, x, 0.015, z);
    // Four kerbs: two along X, two along Z.
    stage(G.box, M.bund, w, h, kerb, x, h / 2, z - (d - kerb) / 2);
    stage(G.box, M.bund, w, h, kerb, x, h / 2, z + (d - kerb) / 2);
    stage(G.box, M.bund, kerb, h, d - kerb * 2, x - (w - kerb) / 2, h / 2, z);
    stage(G.box, M.bund, kerb, h, d - kerb * 2, x + (w - kerb) / 2, h / 2, z);
  };

  // Row of bunded drums along the back of the chemical store.
  const rowX = (CHEMICAL_STORE.minX + CHEMICAL_STORE.maxX) / 2 - 0.2;
  const rowZ0 = CHEMICAL_STORE.maxZ + 1.0;
  const rowCount = 5;
  const pitch = 0.7;
  bund(rowX, rowZ0 + ((rowCount - 1) * pitch) / 2, 1.35, rowCount * pitch + 0.24);
  // Four real drum tones, cycled. Two was still a repeat - and the brief was
  // explicit that the store should not be one colour repeated. Blue steel,
  // graphite, galvanised and pale are what 205 L drums actually arrive in.
  const DRUM_TONES = [M.drum, M.drumAlt, M.steelMid, M.bulkBag];
  for (let i = 0; i < rowCount; i += 1) {
    drum(rowX, rowZ0 + i * pitch, DRUM_TONES[i % DRUM_TONES.length], { y: 0.6 });
  }

  // Two-high on a pallet, inside its own bund.
  const stackZ = CHEMICAL_STORE.minZ + 1.9;
  bund(rowX, stackZ, 1.5, 1.7);
  [-0.7, 0, 0.7].forEach((dz, i) => {
    stage(G.box, M.pallet, 1.1, 0.14, 0.5, rowX, 0.23, stackZ + dz);
    drum(rowX, stackZ + dz, DRUM_TONES[(i + 1) % DRUM_TONES.length], { y: 0.74 });
    drum(rowX, stackZ + dz, DRUM_TONES[(i + 3) % DRUM_TONES.length], { y: 1.62 });
  });

  // One on its side — an obvious trip hazard, staged as scenery. Deliberately
  // NOT bunded: that is the point of it being a hazard.
  drum(-2.6, NORTH_AISLE - 0.4, M.drumAlt, { tipped: true });
};

// ── Equipment ─────────────────────────────────────────────────────────────────

/** Tool station: workbench, tool board, PPE rack and a parts cabinet. */
export const buildToolStation = ({ G, M, stage, absorb }) => {
  // Standing in the west aisle beside the dispatch apron.
  //
  // Its own footprint is 3 m deep (bench 1.5 + PPE rack + parts cabinet at a
  // local +2.9), so the anchor has to leave that much room: sitting at the
  // dispatch apron put the cabinet 1.7 m outside the shell. z is therefore set
  // so the deepest element lands inside the wall, and x keeps it clear of both
  // rack run A and the welfare cabin.
  const x = -8.0;
  const z = 5.6;

  // Bench top with legs and a lower shelf
  stage(G.box, M.benchTop, 0.75, 0.07, 3.2, x + 0.4, 0.92, z);
  [[-0.35, -1.4], [-0.35, 1.4], [0.35, -1.4], [0.35, 1.4]].forEach(([dz, dz2]) => {});
  [-1.4, 1.4].forEach((dz) => {
    stage(G.box, M.steelDark, 0.06, 0.9, 0.06, x + 0.1, 0.45, z + dz);
    stage(G.box, M.steelDark, 0.06, 0.9, 0.06, x + 0.7, 0.45, z + dz);
  });
  stage(G.box, M.steelDark, 0.7, 0.05, 3.1, x + 0.4, 0.3, z);

  // Vice bolted to the bench
  stage(G.box, M.steelDark, 0.24, 0.18, 0.2, x + 0.55, 1.05, z - 1.1);

  // Pegboard tool wall with hanging tools
  stage(G.box, M.toolBoard, 0.05, 1.5, 2.8, x + 0.12, 1.85, z + 0.2);
  // Hammer, spanner and bar silhouettes
  for (let i = 0; i < 6; i += 1) {
    const tz = z - 1.0 + i * 0.42;
    stage(G.box, M.steelLight, 0.05, 0.42, 0.06, x + 0.18, 2.1, tz);
    stage(G.box, M.steelLight, 0.06, 0.1, 0.14, x + 0.18, 2.34, tz);
  }
  // Coil of hose on a hook
  stage(G.cyl, M.cable, 0.22, 0.1, 0.22, x + 0.2, 1.6, z + 1.3, Math.PI / 2);

  // PPE rack: spare hi-vis vests on hangers
  stage(G.cyl, M.steelDark, 0.03, 2.0, 0.03, x + 0.35, 1.6, z + 1.9, Math.PI / 2);
  for (let i = 0; i < 4; i += 1) {
    const pz = z + 1.35 + i * 0.36;
    stage(G.box, M.steelDark, 0.03, 0.16, 0.03, x + 0.35, 2.55, pz);
    stage(G.box, M.hiVis, 0.08, 0.7, 0.3, x + 0.36, 2.1, pz);
  }

  // Parts cabinet
  stage(G.box, M.panelBoard, 0.7, 1.6, 0.9, x + 0.4, 0.8, z + 2.9);
  for (let i = 0; i < 4; i += 1) {
    stage(G.box, M.steelDark, 0.02, 0.03, 0.3, x + 0.76, 0.35 + i * 0.35, z + 2.9);
  }
};

/** Strapping, wrap and weighing equipment in the packing area. */
export const buildPackingEquipment = ({ G, M, stage, absorb }) => {
  // Strapping machine on a trolley
  const t = new THREE.Group();
  const put = (geo, mat, sx, sy, sz, px, py, pz) => {
    const m = new THREE.Mesh(geo, mat);
    m.scale.set(sx, sy, sz);
    m.position.set(px, py, pz);
    t.add(m);
  };
  put(G.box, M.steelMid, 0.7, 0.05, 0.5, 0, 0.78, 0);
  put(G.box, M.steelDark, 0.06, 0.78, 0.06, -0.28, 0.39, -0.18);
  put(G.box, M.steelDark, 0.06, 0.78, 0.06, 0.28, 0.39, -0.18);
  put(G.box, M.steelDark, 0.06, 0.78, 0.06, -0.28, 0.39, 0.18);
  put(G.box, G.cyl || G.box, M.steelDark, 0.16, 0.06, 0.16, -0.28, 0.08, 0.22, Math.PI / 2);
  put(G.box, M.forklift, 0.4, 0.5, 0.4, 0.1, 1.1, 0);
  put(G.cyl, M.cable, 0.12, 0.14, 0.12, 0.1, 1.42, 0, Math.PI / 2);
  // Foot pedals and handle
  put(G.box, M.steelDark, 0.3, 0.04, 0.2, 0, 0.14, 0.3);
  t.position.set(DISPATCH.minX + 2.4, 0, DISPATCH.maxZ - 0.8);
  t.rotation.y = 0.6;
  absorb(t);

  // Platform weighbridge flush with the floor
  const weighX = DISPATCH.maxX - 2.4;
  const weighZ = DISPATCH.maxZ - 1.2;
  stage(G.box, M.steelMid, 2.4, 0.06, 2.4, weighX, 0.03, weighZ);
  stage(G.box, M.steelDark, 2.6, 0.05, 2.6, weighX, 0.02, weighZ);
  // Readout column
  stage(G.box, M.steelDark, 0.1, 1.2, 0.1, weighX + 1.6, 0.6, weighZ + 0.9);
  stage(G.box, M.panelBoard, 0.32, 0.26, 0.14, weighX + 1.6, 1.3, weighZ + 0.9);

  // Stretch-wrap dispenser with a roll
  const wrapX = DISPATCH.minX + 1.0;
  const wrapZ = DISPATCH.maxZ - 0.7;
  stage(G.box, M.steelDark, 0.6, 0.05, 0.6, wrapX, 0.06, wrapZ);
  stage(G.cyl, M.bulkBag, 0.22, 0.5, 0.22, wrapX, 0.35, wrapZ, Math.PI / 2);
  stage(G.box, M.steelDark, 0.08, 0.9, 0.08, wrapX - 0.25, 0.5, wrapZ);
};

/** Inspection aids: convex traffic mirrors, CCTV, clock and notice boards. */
export const buildInspectionPoints = ({ G, M, stage }) => {
  // Convex intersection mirrors at the aisle junctions (reference control)
  [[-7.7, 0.4, NORTH_AISLE], [7.7, -0.4, NORTH_AISLE], [-7.7, 0.4, SOUTH_AISLE], [7.7, -0.4, SOUTH_AISLE]].forEach(([x, ry, z]) => {
    stage(G.cyl, M.steelDark, 0.04, 3.2, 0.04, x, 1.6, z);
    stage(G.box, M.fixtureBody, 0.1, 0.34, 0.1, x + 0.08, 3.1, z);
    stage(G.cyl, M.glassPanel, 0.3, 0.06, 0.3, x + 0.18, 3.1, z, Math.PI / 2, ry);
  });

  // CCTV cameras on the walls
  [[-HALF_W + 0.4, -4], [HALF_W - 0.4, 0], [0, -HALF_D + 0.4], [8, HALF_D - 0.4]].forEach(([x, z]) => {
    stage(G.box, M.fixtureBody, 0.3, 0.14, 0.16, x, 6.2, z);
    stage(G.box, M.glassPanel, 0.06, 0.1, 0.1, x + (x < 0 ? 0.16 : -0.16), 6.2, z);
    stage(G.box, M.steelDark, 0.06, 0.4, 0.06, x + (x < 0 ? 0.1 : -0.1), 6.45, z);
  });

  // Notice boards by the welfare cabin and the dock
  [[-11, 0, HALF_D - 0.5], [4, 0, -HALF_D + 0.5]].forEach(([x, ry, z]) => {
    stage(G.box, M.noticeBoard, 2.0, 1.2, 0.08, x, 1.7, z, 0, ry);
    stage(G.box, M.steelDark, 2.1, 0.06, 0.1, x, 2.32, z, 0, ry);
  });

  // Wall clock beside the office doorway
  const clockZ = (OFFICE.minZ + OFFICE.maxZ) / 2;
  stage(G.cyl, M.fixtureBody, 0.26, 0.06, 0.26, OFFICE.minX + 0.06, 3.0, clockZ, Math.PI / 2);
  stage(G.cyl, M.signBoard, 0.22, 0.02, 0.22, OFFICE.minX + 0.13, 3.0, clockZ, Math.PI / 2);
};

// ── Amenities ─────────────────────────────────────────────────────────────────

/**
 * Welfare cabin: a lined room with lockers, a canteen table, seating and a
 * kettle. Gives the depot an occupied, human feel.
 */
export const buildWelfareCabin = ({ G, M, stage, absorb }) => {
  const cx = (WELFARE.minX + WELFARE.maxX) / 2;
  const cz = (WELFARE.minZ + WELFARE.maxZ) / 2;
  const w = WELFARE.maxX - WELFARE.minX;
  const d = WELFARE.maxZ - WELFARE.minZ;
  const h = 2.8;

  // Walls (north side left open as the doorway)
  stage(G.box, M.cabinPanel, w, h, 0.12, cx, h / 2, cz + d / 2);
  stage(G.box, M.cabinPanel, 0.12, h, d, cx - w / 2, h / 2, cz);
  stage(G.box, M.cabinPanel, 0.12, h, d, cx + w / 2, h / 2, cz);
  stage(G.box, M.cabinPanel, 2.4, h, 0.12, cx - w / 2 + 1.2, h / 2, cz - d / 2);
  stage(G.box, M.cabinPanel, 2.4, h, 0.12, cx + w / 2 - 1.2, h / 2, cz - d / 2);
  // Doorway header above the opening
  stage(G.box, M.cabinPanel, w - 4.8, 0.7, 0.12, cx, h - 0.35, cz - d / 2);
  // Roof
  stage(G.box, M.roofDeck, w + 0.3, 0.1, d + 0.3, cx, h + 0.05, cz);
  // Floor
  stage(G.box, M.cabinFloor, w, 0.04, d, cx, 0.02, cz);

  // Bank of lockers along the back wall
  //
  // Both the bank and the bench in front of it are positioned relative to the
  // cabin's own back wall rather than to its centre. Anchoring them to `cz`
  // meant the bank and the bench sat in the same place (their offsets were
  // tuned when the cabin was nearly 1 m deeper) and, once the cabin was
  // narrowed, the outermost locker and the bench legs fell outside the cabin
  // and through the building wall.
  const backZ = cz + d / 2 - 0.3;
  const LOCKER_PITCH = 0.42;
  const LOCKER_BANK_W = 6 * LOCKER_PITCH;
  const lockerX = (i) => cx - LOCKER_BANK_W / 2 + LOCKER_PITCH / 2 + i * LOCKER_PITCH;
  for (let i = 0; i < 6; i += 1) {
    stage(G.box, M.locker, 0.4, 1.85, 0.45, lockerX(i), 0.95, backZ);
    stage(G.box, M.steelDark, 0.03, 0.1, 0.03, lockerX(i) + 0.15, 1.1, backZ - 0.22);
  }
  // Locker bench in front of the bank, clear of it.
  const benchZ = backZ - 0.95;
  stage(G.box, M.benchTop, 2.8, 0.06, 0.35, cx, 0.45, benchZ);
  [[-1.2, -0.1], [-1.2, 0.1], [1.2, -0.1], [1.2, 0.1]].forEach(([dx, dz]) => {
    stage(G.box, M.steelDark, 0.05, 0.45, 0.05, cx + dx, 0.22, benchZ + dz);
  });

  // Canteen table with chairs
  stage(G.box, M.benchTop, 2.4, 0.06, 0.9, cx + 1.6, 0.74, cz - 0.4);
  [[0.7, -0.3], [2.5, -0.3], [0.7, 0.3], [2.5, 0.3]].forEach(([dx, dz]) => {
    stage(G.box, M.steelDark, 0.06, 0.74, 0.06, cx + 1.6 + dx, 0.37, cz - 0.4 + dz);
  });
  [-0.75, 0.75].forEach((dz) => {
    stage(G.box, M.chairSeat, 0.42, 0.05, 0.42, cx + 1.6, 0.45, cz - 0.4 + dz * 1.9);
    stage(G.box, M.chairSeat, 0.42, 0.45, 0.05, cx + 1.6, 0.68, cz - 0.4 + dz * 1.9 + (dz > 0 ? 0.19 : -0.19));
    [0, 1, 2, 3].forEach((i) => {
      const a = (i / 4) * Math.PI * 2;
      stage(
        G.box,
        M.steelDark,
        0.04,
        0.45,
        0.04,
        cx + 1.6 + Math.cos(a) * 0.16,
        0.22,
        cz - 0.4 + dz * 1.9 + Math.sin(a) * 0.16
      );
    });
  });

  // Kettle, mugs and a bin
  stage(G.box, M.firstAid, 0.2, 0.26, 0.2, cx + 3.2, 1.3, cz + d / 2 - 0.35);
  stage(G.cyl, M.signBoard, 0.05, 0.1, 0.05, cx + 2.9, 1.3, cz + d / 2 - 0.35);
  stage(G.cyl, M.signBoard, 0.05, 0.1, 0.05, cx + 3.0, 1.3, cz + d / 2 - 0.35);
  stage(G.box, M.bin, 0.3, 0.4, 0.3, cx + 3.6, 0.2, cz - 1.4);
};

// ── People ────────────────────────────────────────────────────────────────────

/**
 * A worker built from primitives, with a `pose` variant. Poses matter: a
 * crew standing identically in a line is the fastest way to make a crowd look
 * synthetic.
 *
 * Poses: 'stand' | 'reach' (on a ladder) | 'push' (trolley) | 'crouch' | 'point'
 */
export const buildWorker = (G, M, { x = 0, z = 0, ry = 0, pose = 'stand', vest = M.hiVis } = {}) => {
  const g = new THREE.Group();
  const put = (geo, mat, sx, sy, sz, px, py, pz, rx = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.scale.set(sx, sy, sz);
    m.position.set(px, py, pz);
    m.rotation.x = rx;
    m.rotation.z = rz;
    g.add(m);
    return m;
  };

  const armL = { rx: 0, rz: 0 };
  const armR = { rx: 0, rz: 0 };
  let legBend = 0;
  let bodyTilt = 0;

  switch (pose) {
    case 'reach':
      armL.rx = -2.5;
      armR.rx = -2.5;
      bodyTilt = -0.08;
      break;
    case 'push':
      armL.rx = -1.1;
      armR.rx = -1.1;
      armL.rz = 0.25;
      armR.rz = -0.25;
      bodyTilt = 0.22;
      legBend = 0.25;
      break;
    case 'crouch':
      legBend = 0.9;
      armL.rx = -1.4;
      armR.rx = -1.4;
      bodyTilt = 0.5;
      break;
    case 'point':
      armR.rx = -1.5;
      bodyTilt = -0.05;
      break;
    default:
      armL.rx = 0.12;
      armR.rx = 0.12;
  }

  // Legs (trousers) — bent when crouching or pushing
  [-0.11, 0.11].forEach((lx, i) => {
    const bend = i === 0 ? legBend : legBend * 0.4;
    put(G.capsule, M.trousers, 0.11, 0.3, 0.11, lx, 0.44 - bend * 0.12, bend * 0.22, bend * 0.7);
  });
  // Safety boots
  put(G.box, M.steelDark, 0.16, 0.09, 0.3, -0.11, 0.05, legBend * 0.44 + 0.05);
  put(G.box, M.steelDark, 0.16, 0.09, 0.3, 0.11, 0.05, legBend * 0.18 + 0.05);

  // Torso in a hi-vis vest with reflective banding
  put(G.capsule, vest, 0.17, 0.26, 0.13, 0, 1.08 - bodyTilt * 0.1, bodyTilt * 0.3, bodyTilt);
  // Shirt sleeves showing at the shoulders
  put(G.capsule, M.shirt, 0.13, 0.2, 0.11, 0, 1.14 - bodyTilt * 0.1, bodyTilt * 0.3, bodyTilt);
  put(G.box, M.bandReflect, 0.36, 0.05, 0.27, 0, 1.12, bodyTilt * 0.3);
  put(G.box, M.bandReflect, 0.35, 0.05, 0.26, 0, 0.98, bodyTilt * 0.3);

  // Arms
  put(G.capsule, vest, 0.07, 0.22, 0.07, -0.22, 1.05, armL.rx * 0.16, armL.rx, armL.rz);
  put(G.capsule, vest, 0.07, 0.22, 0.07, 0.22, 1.05, armR.rx * 0.16, armR.rx, armR.rz);

  // Head, hard hat and chin strap
  put(G.sphere, M.skin, 0.13, 0.15, 0.13, 0, 1.4, bodyTilt * 0.36);
  put(G.sphere, M.helmet, 0.17, 0.13, 0.17, 0, 1.47, bodyTilt * 0.36);
  put(G.cyl, M.helmet, 0.19, 0.03, 0.19, 0, 1.43, bodyTilt * 0.36);

  g.position.set(x, 0, z);
  g.rotation.y = ry;
  return g;
};

/** Step ladder with a worker at height — a genuine fall-from-height hazard. */
export const buildLadderAccess = ({ G, M, absorb }) => {
  const g = new THREE.Group();
  const put = (geo, mat, sx, sy, sz, px, py, pz, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.scale.set(sx, sy, sz);
    m.position.set(px, py, pz);
    m.rotation.z = rz;
    g.add(m);
  };
  // Front and rear frames (chunky enough to read at walking distance)
  [-0.26, 0.26].forEach((lx) => {
    put(G.box, M.ladderFrame, 0.1, 2.3, 0.07, lx, 1.15, 0.16, -0.13);
  });
  put(G.box, M.ladderFrame, 0.1, 2.3, 0.07, 0, 1.15, -0.5, 0.13);
  put(G.box, M.ladderFrame, 0.1, 2.3, 0.07, 0.52, 1.15, -0.5, 0.13);
  // Steps
  for (let i = 0; i < 7; i += 1) {
    put(G.box, M.steelLight, 0.58, 0.05, 0.2, 0, 0.28 + i * 0.29, 0.02 - i * 0.075);
  }
  // Top platform + guard rail hoop
  put(G.box, M.steelMid, 0.68, 0.06, 0.46, 0, 2.3, 0.1);
  put(G.box, M.ladderFrame, 0.56, 0.06, 0.06, 0, 3.2, -0.02);
  [-0.26, 0.26].forEach((lx) => {
    put(G.box, M.ladderFrame, 0.06, 0.9, 0.06, lx, 2.75, -0.02);
  });
  put(G.box, M.ladderFrame, 0.56, 0.06, 0.06, 0, 3.2, -0.28);

  // Castors
  [-0.26, 0.26].forEach((lx) => {
    put(G.cyl, M.steelDark, 0.08, 0.06, 0.08, lx, 0.07, 0.24, Math.PI / 2);
  });

  g.position.set(6.6, 0, NORTH_AISLE - 0.4);
  g.rotation.y = 0.3;
  absorb(g);

  // Worker standing on the platform, reaching for the top beam
  // The reach pose lifts an arm to about 3.3 m. At z = -9.1 the figure stood
  // outside the north wall entirely; it now works a pallet on the goods-in apron.
  const w = buildWorker(G, M, { x: 6.0, z: NORTH_AISLE - 0.4, ry: 0.3, pose: 'reach' });
  w.position.y = 2.35;
  w.scale.setScalar(0.94);
  absorb(w);
};

/** Populates the depot with a crew in varied poses. */
export const buildCrew = ({ G, M, absorb }) => {
  // One figure per zone, on real aisle floor: never inside a rack run, never
  // on the painted route, never inside the store's drum footprint.
  const storeX = (CHEMICAL_STORE.minX + CHEMICAL_STORE.maxX) / 2;
  const elecX = (ELECTRICAL_ZONE.minX + ELECTRICAL_ZONE.maxX) / 2;
  const crew = [
    { x: storeX + 1.4, z: -3.0, ry: 1.5, pose: 'point' },
    { x: elecX - 1.3, z: -6.6, ry: -0.9, pose: 'crouch' },
    { x: 7.7, z: 4.5, ry: -1.1, pose: 'stand' },
    { x: -7.7, z: 4.5, ry: 2.9, pose: 'stand' },
    { x: -4.0, z: NORTH_AISLE + 0.5, ry: 2.6, pose: 'stand' },
    { x: 4.0, z: NORTH_AISLE + 0.5, ry: -2.2, pose: 'point' },
    { x: -5.0, z: DISPATCH.maxZ - 0.9, ry: 0.6, pose: 'stand' },
    { x: -HALF_W + 1.2, z: 0.0, ry: 0.9, pose: 'stand' },
    { x: HALF_W - 1.2, z: 0.0, ry: -1.5, pose: 'stand' },
  ];
  crew.forEach((cfg) => absorb(buildWorker(G, M, cfg)));
};