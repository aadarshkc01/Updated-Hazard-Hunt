import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Maximize2, Minimize2, MousePointerClick, RotateCcw } from 'lucide-react';

// ── Warehouse layout (metres) ────────────────────────────────────────────────
const ROOM = { width: 44, depth: 32, height: 7 };
const WALL = 0.3;
const EYE_HEIGHT = 1.7;
const PLAYER_RADIUS = 0.55;
const MOVE_SPEED = 3.4;

// Obstacle AABBs (axis-aligned rectangles on the floor plan) used for collision.
const OBSTACLES = [
  { minX: -16, maxX: -11, minZ: -12, maxZ: -8 },
  { minX: -16, maxX: -11, minZ: -4, maxZ: 1 },
  { minX: -16, maxX: -11, minZ: 4, maxZ: 9 },
  { minX: 11, maxX: 16, minZ: -12, maxZ: -8 },
  { minX: 11, maxX: 16, minZ: -4, maxZ: 1 },
  { minX: 11, maxX: 16, minZ: 4, maxZ: 9 },
  { minX: -4, maxX: 4, minZ: 10, maxZ: 13 }, // staging pallets
];

// Maps a scenario hotspot to a physical position in the warehouse. Positions
// are fixed open-floor spots chosen so no break belongs to a rack or wall;
// matching by hazard category keeps each hazard visually consistent with its
// training description.
const HAZARD_SLOTS = [
  { key: /chemical|slip/i, position: new THREE.Vector3(-8, 0.05, -6) },
  { key: /material|pallet|stability/i, position: new THREE.Vector3(-9, 0, 0.5) },
  { key: /fire|exit/i, position: new THREE.Vector3(15, 0, -14.4) },
  { key: /electrical|trip|cable/i, position: new THREE.Vector3(0, 0.05, -2) },
  { key: /traffic|forklift/i, position: new THREE.Vector3(7, 0, 12) },
];

function hotspotToPosition(hotspot, index) {
  const cat = hotspot.category || '';
  const slot = HAZARD_SLOTS.find((s) => s.key.test(cat));
  if (slot) return slot.position.clone();
  const fallbackSlots = [
    new THREE.Vector3(-8, 0.05, -6),
    new THREE.Vector3(-9, 0, 0.5),
    new THREE.Vector3(15, 0, -14.4),
    new THREE.Vector3(0, 0.05, -2),
    new THREE.Vector3(7, 0, 12),
  ];
  return fallbackSlots[index % fallbackSlots.length].clone();
}

function buildHazardProp(hotspot) {
  const group = new THREE.Group();
  const cat = (hotspot.category || '').toLowerCase();

  if (cat.includes('chemical') || cat.includes('slip')) {
    const spill = new THREE.Mesh(
      new THREE.CircleGeometry(1.4, 24),
      new THREE.MeshStandardMaterial({ color: 0x23272b, roughness: 0.15, metalness: 0.4 })
    );
    spill.rotation.x = -Math.PI / 2;
    spill.position.y = 0.02;
    group.add(spill);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.4, 1.55, 24),
      new THREE.MeshStandardMaterial({ color: 0xd8c93a, roughness: 0.6 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.021;
    group.add(ring);
  } else if (cat.includes('electrical') || cat.includes('trip')) {
    const cable = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 0.07, 0.14),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 })
    );
    cable.position.y = 0.05;
    cable.rotation.y = Math.PI / 4;
    group.add(cable);
  } else if (cat.includes('fire')) {
    // Blocked fire exit: stacked boxes in front of the door
    for (let i = 0; i < 3; i += 1) {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.7, 0.9),
        new THREE.MeshStandardMaterial({ color: 0x9a7b4f, roughness: 0.85 })
      );
      box.position.set((i - 1) * 1.0, 0.35 + (i % 2) * 0.7, -0.5);
      group.add(box);
    }
  } else if (cat.includes('traffic')) {
    // Missing barrier at blind intersection
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.25, 0.7, 12),
      new THREE.MeshStandardMaterial({ color: 0xb4552d, roughness: 0.7 })
    );
    cone.position.y = 0.35;
    group.add(cone);
    const fallen = cone.clone();
    fallen.rotation.z = Math.PI / 2;
    fallen.position.set(0.9, 0.25, 0.4);
    group.add(fallen);
  } else {
    // Material handling: leaning unstable pallet stack
    for (let i = 0; i < 3; i += 1) {
      const pallet = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.9, 1.0),
        new THREE.MeshStandardMaterial({ color: 0x8a6b45, roughness: 0.9 })
      );
      pallet.position.set(i * 0.25, 0.45 + i * 0.85, i * 0.18);
      pallet.rotation.z = 0.12 * (i + 1);
      group.add(pallet);
    }
  }

  group.traverse((obj) => {
    obj.userData = obj.userData || {};
    obj.userData.hotspotId = hotspot.id;
  });
  return group;
}

export const WalkthroughViewer = ({
  scenario,
  foundHotspots = [],
  onHazardClick,
  onFalseClick,
  isEnded = false,
}) => {
  const mountRef = useRef(null);
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const keysRef = useRef({});
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const posRef = useRef(new THREE.Vector3(0, EYE_HEIGHT, 6));
  const rafRef = useRef(0);
  const foundRef = useRef(foundHotspots);
  foundRef.current = foundHotspots;
  const hazardMeshesRef = useRef([]);
  const isEndedRef = useRef(isEnded);
  isEndedRef.current = isEnded;

  const [locked, setLocked] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lockEverEngaged, setLockEverEngaged] = useState(false);
  const [seenInstruction] = useState(() => {
    try {
      return window.localStorage.getItem('hazardhunt_walkthrough_seen') === '1';
    } catch {
      return false;
    }
  });
  const [isTouchDevice] = useState(
    () => typeof window !== 'undefined' && 'ontouchstart' in window && !window.matchMedia('(pointer: fine)').matches
  );

  const flashFeedback = (type, text) => {
    setFeedback({ type, text });
    window.clearTimeout(flashFeedback.timeoutId);
    flashFeedback.timeoutId = window.setTimeout(() => setFeedback(null), 2200);
  };

  useEffect(() => {
    if (!mountRef.current || !scenario) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x20242a);
    scene.fog = new THREE.Fog(0x20242a, 24, 60);

    const camera = new THREE.PerspectiveCamera(
      72,
      mountRef.current.clientWidth / Math.max(1, mountRef.current.clientHeight),
      0.1,
      120
    );
    camera.position.copy(posRef.current);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting: static ambient + directional (no dynamic shadows for performance)
    scene.add(new THREE.HemisphereLight(0xdfe8f0, 0x3a3f45, 0.9));
    const dir = new THREE.DirectionalLight(0xfff2dd, 0.9);
    dir.position.set(12, 18, 8);
    scene.add(dir);

    const mats = {
      floor: new THREE.MeshStandardMaterial({ color: 0x6b6f74, roughness: 0.95 }),
      wall: new THREE.MeshStandardMaterial({ color: 0xb9bcbe, roughness: 0.9 }),
      ceiling: new THREE.MeshStandardMaterial({ color: 0x8f9399, roughness: 0.95 }),
      rack: new THREE.MeshStandardMaterial({ color: 0x3d4a63, roughness: 0.7, metalness: 0.3 }),
      beam: new THREE.MeshStandardMaterial({ color: 0xc25a1e, roughness: 0.6, metalness: 0.2 }),
      pallet: new THREE.MeshStandardMaterial({ color: 0x9a7b4f, roughness: 0.9 }),
      dock: new THREE.MeshStandardMaterial({ color: 0x556070, roughness: 0.8 }),
    };
    const geos = {
      floor: new THREE.PlaneGeometry(ROOM.width, ROOM.depth),
      box: new THREE.BoxGeometry(1, 1, 1),
      door: new THREE.PlaneGeometry(3, 3.4),
    };

    const floor = new THREE.Mesh(geos.floor, mats.floor);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const ceiling = new THREE.Mesh(geos.floor, mats.ceiling);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = ROOM.height;
    scene.add(ceiling);

    const addWall = (w, h, x, y, z, ry) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mats.wall);
      m.position.set(x, y, z);
      m.rotation.y = ry;
      scene.add(m);
      return m;
    };
    addWall(ROOM.width, ROOM.height, 0, ROOM.height / 2, -ROOM.depth / 2, 0);
    addWall(ROOM.width, ROOM.height, 0, ROOM.height / 2, ROOM.depth / 2, Math.PI);
    addWall(ROOM.depth, ROOM.height, -ROOM.width / 2, ROOM.height / 2, 0, Math.PI / 2);
    addWall(ROOM.depth, ROOM.height, ROOM.width / 2, ROOM.height / 2, 0, -Math.PI / 2);

    // Fire exit door on the north wall
    const door = new THREE.Mesh(geos.door, new THREE.MeshStandardMaterial({ color: 0x3f6b4f, roughness: 0.8 }));
    door.position.set(15, 1.7, -ROOM.depth / 2 + 0.05);
    scene.add(door);

    // Racks + stocked pallets
    const disposables = [];
    OBSTACLES.slice(0, 6).forEach((ob) => {
      const width = ob.maxX - ob.minX;
      const depth = ob.maxZ - ob.minZ;
      const rack = new THREE.Mesh(geos.box, mats.rack);
      rack.scale.set(width, 4.5, depth);
      rack.position.set((ob.minX + ob.maxX) / 2, 2.25, (ob.minZ + ob.maxZ) / 2);
      scene.add(rack);
      for (let level = 1; level <= 3; level += 1) {
        const beam = new THREE.Mesh(geos.box, mats.beam);
        beam.scale.set(width + 0.2, 0.12, depth + 0.2);
        beam.position.set(rack.position.x, level * 1.4, rack.position.z);
        scene.add(beam);
      }
      for (let p = 0; p < 4; p += 1) {
        const pallet = new THREE.Mesh(geos.box, mats.pallet);
        pallet.scale.set(Math.min(1.6, width / 3), 0.9, Math.min(1.6, depth / 3));
        pallet.position.set(
          ob.minX + 1.2 + (p % 2) * (width / 2),
          0.5 + Math.floor(p / 2) * 1.4,
          ob.minZ + depth / 2 + (p % 2 === 0 ? -depth / 5 : depth / 5)
        );
        scene.add(pallet);
      }
    });
    // Staging pallets obstacle
    const staging = OBSTACLES[6];
    for (let i = 0; i < 3; i += 1) {
      const p = new THREE.Mesh(geos.box, mats.pallet);
      p.scale.set(2.2, 1.1, 2.2);
      p.position.set(staging.minX + 1.6 + i * 2.6, 0.55, (staging.minZ + staging.maxZ) / 2);
      scene.add(p);
    }

    // Hazard props (visually part of the warehouse — no glow markers)
    const hazardMeshes = [];
    (scenario.hotspots || [])
      .filter((h) => h.isHazard)
      .forEach((h, idx) => {
        const prop = buildHazardProp(h);
        const pos = hotspotToPosition(h, idx);
        prop.position.copy(pos);
        scene.add(prop);
        prop.traverse((obj) => hazardMeshes.push(obj));
      });
    hazardMeshesRef.current = hazardMeshes;

    // ── Controls ─────────────────────────────────────────────────────────────
    const onKeyDown = (e) => {
      keysRef.current[e.code] = true;
      // CTRL releases the mouse back to the browser
      if ((e.code === 'ControlLeft' || e.code === 'ControlRight') && document.pointerLockElement === renderer.domElement) {
        document.exitPointerLock?.();
      }
    };
    const onKeyUp = (e) => { keysRef.current[e.code] = false; };
    const onMouseMove = (e) => {
      if (document.pointerLockElement !== renderer.domElement) return;
      yawRef.current -= e.movementX * 0.0022;
      pitchRef.current = Math.max(-1.2, Math.min(1.2, pitchRef.current - e.movementY * 0.0022));
    };
    const onClick = () => {
      if (document.pointerLockElement !== renderer.domElement) {
        renderer.domElement.requestPointerLock?.();
        return;
      }
      if (isEndedRef.current) return;
      // Raycast from the centre reticle
      const ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2(0, 0), camera);
      ray.far = 14;
      const hits = ray.intersectObjects(hazardMeshesRef.current, false);
      const hotspotMap = new Map((scenario.hotspots || []).map((h) => [h.id, h]));
      if (hits.length > 0) {
        const hotspotId = hits[0].object.userData.hotspotId;
        const hotspot = hotspotMap.get(hotspotId);
        const already = foundRef.current.some((h) => h.id === hotspotId);
        if (hotspot && !already) {
          onHazardClick(hotspot);
          flashFeedback('good', `HAZARD IDENTIFIED — ${hotspot.title} (+20)`);
          return;
        }
      }
      onFalseClick();
      flashFeedback('bad', 'NO HAZARD DETECTED — Accuracy penalty -5');
    };
    const onLockError = () => {
      flashFeedback('bad', 'Mouse look could not be activated. Click inside the warehouse to try again.');
    };
    const onLockChange = () => {
      const isLocked = document.pointerLockElement === renderer.domElement;
      setLocked(isLocked);
      if (isLocked) {
        setLockEverEngaged(true);
        try {
          window.localStorage.setItem('hazardhunt_walkthrough_seen', '1');
        } catch {}
      }
    };
    const onResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = Math.max(1, mountRef.current.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onResize);
    document.addEventListener('pointerlockchange', onLockChange);
    document.addEventListener('pointerlockerror', onLockError);
    renderer.domElement.addEventListener('click', onClick);

    // ── Collision ────────────────────────────────────────────────────────────
    const collides = (x, z) => {
      const halfW = ROOM.width / 2 - WALL - PLAYER_RADIUS;
      const halfD = ROOM.depth / 2 - WALL - PLAYER_RADIUS;
      if (Math.abs(x) > halfW || Math.abs(z) > halfD) return true;
      return OBSTACLES.some(
        (ob) =>
          x > ob.minX - PLAYER_RADIUS &&
          x < ob.maxX + PLAYER_RADIUS &&
          z > ob.minZ - PLAYER_RADIUS &&
          z < ob.maxZ + PLAYER_RADIUS
      );
    };

    // ── Render loop ──────────────────────────────────────────────────────────
    let last = performance.now();
    const tick = (now) => {
      rafRef.current = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const k = keysRef.current;
      let forward = (k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0);
      let strafe = (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0);
      if (forward !== 0 || strafe !== 0) {
        const len = Math.hypot(forward, strafe) || 1;
        forward /= len;
        strafe /= len;
        const speed = MOVE_SPEED * dt;
        const sinY = Math.sin(yawRef.current);
        const cosY = Math.cos(yawRef.current);
        const dx = (-sinY * forward + cosY * strafe) * speed;
        const dz = (-cosY * forward - sinY * strafe) * speed;
        const nextX = posRef.current.x + dx;
        const nextZ = posRef.current.z + dz;
        // Axis-separated collision slide
        if (!collides(nextX, posRef.current.z)) posRef.current.x = nextX;
        if (!collides(posRef.current.x, nextZ)) posRef.current.z = nextZ;
      }

      camera.position.copy(posRef.current);
      const euler = new THREE.Euler(pitchRef.current, yawRef.current, 0, 'YXZ');
      camera.quaternion.setFromEuler(euler);
      renderer.render(scene, camera);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('pointerlockchange', onLockChange);
      document.removeEventListener('pointerlockerror', onLockError);
      renderer.domElement.removeEventListener('click', onClick);
      if (document.pointerLockElement === renderer.domElement) document.exitPointerLock();
      hazardMeshesRef.current = [];
      scene.traverse((obj) => {
        if (obj.geometry && obj.geometry !== geos.floor && obj.geometry !== geos.box && obj.geometry !== geos.door) obj.geometry.dispose();
        if (obj.material && obj.material !== mats.floor && obj.material !== mats.wall && obj.material !== mats.ceiling && obj.material !== mats.rack && obj.material !== mats.beam && obj.material !== mats.pallet && obj.material !== mats.dock) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      Object.values(geos).forEach((g) => g.dispose());
      Object.values(mats).forEach((m) => m.dispose());
      disposables.forEach((d) => d.dispose?.());
      renderer.dispose();
      renderer.domElement.remove();
      rendererRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario?.id]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) containerRef.current.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  useEffect(() => {
    const h = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  if (isTouchDevice) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center rounded-lg border border-mist-300 bg-mist-50 p-8 text-center dark:border-dark-border dark:bg-dark-surface">
        <h3 className="text-sm font-bold text-mist-900 dark:text-white">Walkthrough mode needs a keyboard and mouse</h3>
        <p className="mt-1 max-w-md text-xs text-mist-600 dark:text-dark-muted">
          On tablets and phones, start the session in Standard 360° mode — the same hazards, scoring, and timer apply.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full select-none bg-dark-bg ${
        isFullscreen ? 'fixed inset-0 z-50 h-screen w-screen' : 'h-[74vh] min-h-[500px] max-h-[800px] overflow-hidden rounded-lg border border-mist-300 dark:border-dark-border'
      }`}
    >
      <div ref={mountRef} className="h-full w-full" />

      {/* Centre reticle */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center text-white/70">
        <div className="h-4 w-4 rounded-full border border-white/70" />
      </div>

      {/* Unlocked-state hint: full instruction on first visit, subtle text afterwards */}
      {!locked && !seenInstruction && !lockEverEngaged && (
        <div className="absolute bottom-16 left-1/2 z-10 -translate-x-1/2 rounded-md border border-white/20 bg-dark-card/85 px-4 py-3 text-left text-white shadow-sm">
          <p className="text-xs font-bold">Click inside the warehouse to look around</p>
          <div className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[11px] text-gray-300">
            <span className="font-mono font-bold text-primary-400">Mouse</span><span>Look</span>
            <span className="font-mono font-bold text-primary-400">W A S D</span><span>Move</span>
            <span className="font-mono font-bold text-primary-400">CTRL</span><span>Release mouse</span>
          </div>
        </div>
      )}
      {!locked && (seenInstruction || lockEverEngaged) && (
        <div className="absolute bottom-16 left-1/2 z-10 -translate-x-1/2 rounded-md border border-white/15 bg-dark-card/70 px-3 py-1.5 text-[11px] font-semibold text-white/80">
          Click inside the warehouse to resume looking around.
        </div>
      )}

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`absolute left-1/2 top-6 z-20 -translate-x-1/2 rounded-md border px-4 py-2 text-xs font-bold ${
            feedback.type === 'good'
              ? 'border-emerald-500/60 bg-emerald-950/80 text-emerald-200'
              : 'border-red-500/60 bg-red-950/80 text-red-200'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Controls hint */}
      <div className="absolute bottom-4 left-4 z-20 rounded-md border border-white/20 bg-dark-card/80 px-3 py-1.5 text-[11px] font-semibold text-white/90">
        WASD move · Mouse look · Click report hazard · Esc pause
      </div>

      <button
        type="button"
        onClick={toggleFullscreen}
        className="absolute right-4 top-4 z-20 rounded-md border border-white/20 bg-dark-card/80 p-2 text-white"
        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      >
        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </button>
    </div>
  );
};
