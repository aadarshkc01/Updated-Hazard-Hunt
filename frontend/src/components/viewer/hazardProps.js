import * as THREE from 'three';

/**
 * Hazard Prop Builder
 * ─────────────────────────────────────────────────────────────────────────────
 * Constructs the visual representation of each staged hazard. Props are built
 * from the `propType` supplied by the server layout engine, so the same category
 * renders in a different but still plausible form on each attempt.
 *
 * Every mesh is tagged with `userData.hotspotId` so the viewer's raycaster can
 * resolve a click back to a canonical hotspot document.
 */

const makeMaterial = (params) => new THREE.MeshStandardMaterial(params);

const PALETTE = {
  spill: makeMaterial({ color: 0x1b1f24, roughness: 0.1, metalness: 0.55 }),
  spillSheen: makeMaterial({ color: 0x2f3b45, roughness: 0.05, metalness: 0.7 }),
  hazardTape: makeMaterial({ color: 0xf5c518, roughness: 0.7 }),
  pallet: makeMaterial({ color: 0xa8813f, roughness: 0.92 }),
  carton: makeMaterial({ color: 0xc79a63, roughness: 0.95 }),
  cartonAlt: makeMaterial({ color: 0xb0854f, roughness: 0.95 }),
  crate: makeMaterial({ color: 0xa07a4a, roughness: 0.92 }),
  /**
   * Hazard-prop drums.
   *
   * These were a green (0x2f6f4e) and a rust-red (0xb4552d) — the same pair of
   * wrong hues as the scene's own drums, duplicated because the hazard props
   * keep their own material set so a staged prop can be identified and disposed
   * of as a unit. Both now match the scene: blue and graphite. The drums a
   * trainee is being asked to spot should not introduce colours the rest of the
   * bay avoids.
   */
  drum: makeMaterial({ color: 0x1f4e79, roughness: 0.45, metalness: 0.5 }),
  drumAlt: makeMaterial({ color: 0x39434e, roughness: 0.55, metalness: 0.35 }),
  cable: makeMaterial({ color: 0x15181c, roughness: 0.9 }),
  cableDrum: makeMaterial({ color: 0x2a2f36, roughness: 0.7, metalness: 0.4 }),
  cone: makeMaterial({ color: 0xe0592a, roughness: 0.65 }),
  coneBand: makeMaterial({ color: 0xf5f5f5, roughness: 0.5 }),
  barrierPost: makeMaterial({ color: 0xd9700a, roughness: 0.6, metalness: 0.3 }),
  barrierRail: makeMaterial({ color: 0x1e46a8, roughness: 0.6 }),
  darkMetal: makeMaterial({ color: 0x2b3038, roughness: 0.6, metalness: 0.5 }),
  shrinkWrap: makeMaterial({
    color: 0xdfe7ec,
    roughness: 0.3,
    transparent: true,
    opacity: 0.55,
  }),
};

const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 16),
  cone: new THREE.ConeGeometry(1, 1, 12),
  sphere: new THREE.SphereGeometry(1, 14, 10),
  plane: new THREE.PlaneGeometry(1, 1),
  ring: new THREE.RingGeometry(0.82, 1, 28),
};

/**
 * Builds a hazard group.
 *
 * @param {string} hotspotId   Canonical hotspot id, used for raycast resolution.
 * @param {string} propType    Variant key from the server layout engine.
 * @returns {THREE.Group} Group whose descendants all carry `hotspotId`.
 */
export const buildHazardProp = (hotspotId, propType) => {
  const group = new THREE.Group();
  const put = (geo, mat, sx, sy, sz, x, y, z, rot) => {
    const m = new THREE.Mesh(geo, mat);
    m.scale.set(sx, sy, sz);
    m.position.set(x, y, z);
    if (rot) {
      if (rot.x) m.rotation.x = rot.x;
      if (rot.y) m.rotation.y = rot.y;
      if (rot.z) m.rotation.z = rot.z;
    }
    group.add(m);
    return m;
  };

  switch (propType) {
    // ── Chemical / slip ──────────────────────────────────────────────────────
    case 'spill-puddle': {
      // Irregular pool built from overlapping discs.
      const blobs = [
        [0, 1.15, 0, 0, -0.3],
        [0.7, 0.7, 0.35, 0, 0],
        [-0.65, 0.6, -0.3, 0, 0],
        [0.2, 0.5, -0.6, 0, 0],
      ];
      blobs.forEach(([x, r, z, , rotZ]) => {
        const disc = put(
          GEO.plane,
          PALETTE.spill,
          r * 2,
          r * 2,
          1,
          x,
          0.012,
          z,
          { x: -Math.PI / 2, z: rotZ }
        );
        disc.userData.isDecal = true;
      });
      put(GEO.plane, PALETTE.spillSheen, 1.1, 0.7, 1, 0.1, 0.016, 0.15, { x: -Math.PI / 2 });
      // Yellow cordon ring
      const ring = put(GEO.ring, PALETTE.hazardTape, 1.85, 1.85, 1, 0, 0.022, 0, { x: -Math.PI / 2 });
      ring.userData.isDecal = true;
      // Overturned drum at the edge of the pool
      const drum = put(GEO.cyl, PALETTE.drumAlt, 0.3, 0.86, 0.3, 1.15, 0.31, -0.5);
      drum.rotation.z = Math.PI / 2;
      drum.rotation.y = 0.4;
      break;
    }
    case 'leaking-drum': {
      [[-0.55, 0.62], [0.1, 0.62], [0.72, 0.62]].forEach(([x, z], i) => {
        put(GEO.cyl, i === 1 ? PALETTE.drumAlt : PALETTE.drum, 0.31, 0.9, 0.31, x, 0.45, z);
        put(GEO.cyl, PALETTE.darkMetal, 0.32, 0.05, 0.32, x, 0.62, z);
        put(GEO.cyl, PALETTE.darkMetal, 0.32, 0.05, 0.32, x, 0.3, z);
      });
      // Active leak trail from the middle drum
      put(GEO.plane, PALETTE.spill, 2.3, 0.55, 1, 0.5, 0.012, 0.95, { x: -Math.PI / 2, z: 0.35 });
      put(GEO.ring, PALETTE.hazardTape, 1.9, 1.9, 1, 0.4, 0.024, 0.7, { x: -Math.PI / 2 });
      break;
    }

    // ── Material handling ────────────────────────────────────────────────────
    case 'leaning-stack': {
      for (let i = 0; i < 4; i += 1) {
        put(GEO.box, PALETTE.pallet, 1.25, 0.13, 1.0, i * 0.16, 0.07 + i * 0.83, i * 0.1, {
          z: 0.1 * (i + 1),
        });
        for (let L = 0; L < 2; L += 1) {
          put(
            GEO.box,
            i % 2 ? PALETTE.cartonAlt : PALETTE.carton,
            1.1,
            0.5,
            0.9,
            i * 0.16 + 0.04,
            0.42 + i * 0.83 + L * 0.52,
            i * 0.1 + 0.04
          );
        }
      }
      break;
    }
    case 'overhang-pallet': {
      // Load projecting well past the racking beam — the classic overhang risk.
      put(GEO.box, PALETTE.pallet, 1.3, 0.14, 1.1, 0.15, 0.78, 0.1);
      for (let L = 0; L < 2; L += 1) {
        put(GEO.box, L ? PALETTE.cartonAlt : PALETTE.carton, 1.15, 0.55, 0.95, 0.15, 1.13 + L * 0.57, 0.1);
      }
      // Supporting stack, lower and stable-looking
      put(GEO.box, PALETTE.pallet, 1.3, 0.14, 1.1, -0.95, 0.07, -0.05);
      put(GEO.box, PALETTE.carton, 1.15, 0.62, 0.95, -0.95, 0.46, -0.05);
      put(GEO.box, PALETTE.pallet, 1.3, 0.14, 1.1, -0.95, 0.85, -0.05);
      put(GEO.box, PALETTE.cartonAlt, 1.15, 0.6, 0.95, -0.93, 1.22, -0.03);
      break;
    }

    // ── Electrical ───────────────────────────────────────────────────────────
    case 'trailing-cable': {
      // Thick three-phase cable snaking across the walking route.
      const path = [
        [-2.1, 0, -0.7],
        [-1.1, 0, -0.15],
        [-0.2, 0, -0.4],
        [0.7, 0, 0.15],
        [1.6, 0, -0.05],
        [2.3, 0, 0.4],
      ];
      for (let i = 0; i < path.length - 1; i += 1) {
        const [x1, , z1] = path[i];
        const [x2, , z2] = path[i + 1];
        const len = Math.hypot(x2 - x1, z2 - z1);
        const seg = put(
          GEO.box,
          PALETTE.cable,
          len,
          0.085,
          0.16,
          (x1 + x2) / 2,
          0.045,
          (z1 + z2) / 2
        );
        seg.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
      }
      // Exposed junction box where the ramp should be
      put(GEO.box, PALETTE.darkMetal, 0.42, 0.2, 0.3, -0.9, 0.1, -0.3, { y: 0.35 });
      put(GEO.box, PALETTE.hazardTape, 0.5, 0.02, 0.36, -0.9, 0.21, -0.3, { y: 0.35 });
      // Warning cone dropped next to the cable
      put(GEO.cone, PALETTE.cone, 0.24, 0.62, 0.24, 1.9, 0.31, 0.55, { z: 1.3 });
      put(GEO.box, PALETTE.cone, 0.44, 0.05, 0.44, 2.15, 0.03, 0.75);
      break;
    }
    case 'cable-drum': {
      // Spool with cable loosely unwound across the aisle.
      const spool = put(GEO.cyl, PALETTE.cableDrum, 0.62, 0.12, 0.62, -1.0, 0.62, -0.3, { z: Math.PI / 2 });
      spool.rotation.y = 0.2;
      put(GEO.cyl, PALETTE.cable, 0.42, 0.6, 0.42, -1.0, 0.62, -0.3, { z: Math.PI / 2 });
      put(GEO.cyl, PALETTE.darkMetal, 0.7, 0.08, 0.7, -1.55, 0.62, -0.3, { z: Math.PI / 2 });
      for (let i = 0; i < 5; i += 1) {
        const seg = put(
          GEO.box,
          PALETTE.cable,
          0.62,
          0.085,
          0.15,
          -0.35 + i * 0.62,
          0.045,
          -0.3 + Math.sin(i * 1.7) * 0.42
        );
        seg.rotation.y = Math.sin(i * 1.7) * 0.7;
      }
      put(GEO.cone, PALETTE.cone, 0.24, 0.6, 0.24, 1.6, 0.3, 0.7);
      break;
    }

    // ── Fire safety ──────────────────────────────────────────────────────────
    case 'blocked-exit-crates': {
      const stack = [
        [0, 0.35, 0, 0],
        [0, 1.05, 0, 0.08],
        [0.82, 0.35, 0.12, 0.15],
        [-0.78, 0.35, -0.1, -0.1],
        [0.8, 1.0, 0.1, -0.2],
      ];
      stack.forEach(([x, y, z, ry], i) => {
        put(GEO.box, i % 2 ? PALETTE.crate : PALETTE.cartonAlt, 0.78, 0.68, 0.72, x, y, z, { y: ry });
      });
      // Stretch film wrapping the stack
      put(GEO.box, PALETTE.shrinkWrap, 2.6, 1.5, 0.95, 0, 0.75, 0);
      // Fire extinguisher knocked to the floor
      const ext = put(GEO.cyl, PALETTE.drumAlt, 0.11, 0.5, 0.11, 1.25, 0.11, 0.55);
      ext.rotation.z = Math.PI / 2;
      break;
    }
    case 'blocked-exit-pallets': {
      [[0, 0.08], [0, 0.94], [0.85, 0.08], [0.85, 0.94], [-0.82, 0.08], [0.02, 1.8]].forEach(
        ([x, y], i) => {
          put(GEO.box, PALETTE.pallet, 1.2, 0.14, 1.05, x, y, 0);
          put(GEO.box, i % 2 ? PALETTE.cartonAlt : PALETTE.carton, 1.05, 0.62, 0.9, x, y + 0.4, 0.01);
        }
      );
      put(GEO.box, PALETTE.shrinkWrap, 3.1, 2.4, 1.2, 0, 1.2, 0);
      break;
    }

    // ── Traffic separation ───────────────────────────────────────────────────
    case 'missing-barrier': {
      // Toppled pedestrian barrier + scattered cones at a blind corner.
      const fallen = put(GEO.box, PALETTE.barrierRail, 2.1, 0.13, 0.1, 0.35, 0.08, 0.55, { z: 0.12, y: 0.9 });
      fallen.userData.isDecal = false;
      put(GEO.box, PALETTE.barrierPost, 0.1, 0.9, 0.1, -0.62, 0.45, 0.35);
      [[-1.25, 1.15], [1.5, 1.5]].forEach(([x, z], i) => {
        const cone = put(GEO.cone, PALETTE.cone, 0.26, 0.66, 0.26, x, 0.33, z);
        if (i === 1) cone.rotation.z = Math.PI / 2.2;
        put(GEO.cyl, PALETTE.coneBand, 0.2, 0.1, 0.2, x, i === 1 ? 0.33 : 0.4, z);
      });
      // Worn paint where a barrier should be
      put(GEO.ring, PALETTE.hazardTape, 2.2, 2.2, 1, 0, 0.02, 0, { x: -Math.PI / 2 });
      break;
    }
    case 'blind-corner': {
      // Protruding pallet stack that blocks the sightline round the racking.
      for (let i = 0; i < 3; i += 1) {
        put(GEO.box, PALETTE.pallet, 1.25, 0.14, 1.05, 0, 0.07 + i * 0.82, 0);
        put(GEO.box, i % 2 ? PALETTE.cartonAlt : PALETTE.carton, 1.1, 0.55, 0.9, 0, 0.42 + i * 0.82, 0);
      }
      put(GEO.box, PALETTE.shrinkWrap, 1.4, 2.6, 1.2, 0, 1.3, 0);
      put(GEO.cone, PALETTE.cone, 0.26, 0.66, 0.26, 1.55, 0.33, 0.9);
      put(GEO.cone, PALETTE.cone, 0.26, 0.66, 0.26, 1.85, 0.33, 1.7);
      break;
    }

    // ── Fallback: generic obstruction ────────────────────────────────────────
    default: {
      put(GEO.box, PALETTE.crate, 1.1, 0.8, 0.9, 0, 0.4, 0);
      put(GEO.cone, PALETTE.cone, 0.26, 0.66, 0.26, 1.1, 0.33, 0.5);
      break;
    }
  }

  // Tag every descendant so a raycast hit resolves straight to the hotspot.
  group.traverse((obj) => {
    if (obj.isMesh) {
      obj.userData.hotspotId = hotspotId;
      obj.userData.propType = propType;
    }
  });

  group.userData.hotspotId = hotspotId;
  group.userData.propType = propType;
  return group;
};

/** Releases the shared geometry/material instances held by this module. */
export const disposeHazardAssets = () => {
  Object.values(GEO).forEach((g) => g.dispose?.());
  Object.values(PALETTE).forEach((m) => m.dispose?.());
};