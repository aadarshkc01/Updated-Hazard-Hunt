import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  Maximize2,
  Minimize2,
  RotateCcw,
  Compass,
  Navigation,
  AlertTriangle,
} from 'lucide-react';
import {
  buildWarehouseScene,
  collidesAt,
  getObstacles,
  SPAWN,
} from './warehouseScene';
import { buildHazardProp } from './hazardProps';

// Movement tuning (metres / second)
const MOVE_SPEED = 4.6;
const TOUCH_LOOK_SENSITIVITY = 0.0042;
const MOUSE_LOOK_SENSITIVITY = 0.0022;
const PITCH_LIMIT = 1.2;
const RAY_RANGE = 16;
/** Raycast for the "what am I looking at" probe at most this often (Hz). */
const HOVER_HZ = 10;

/** True when the primary input is a coarse pointer (phone / tablet). */
const detectCoarsePointer = () =>
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(pointer: coarse)').matches
    : false;

const formatClock = (seconds) => {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.max(0, Math.floor(seconds)) % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export const WalkthroughViewer = ({
  scenario,
  foundHotspots = [],
  onHazardClick,
  onFalseClick,
  isEnded = false,
  timeLeft,
  totalTime,
}) => {
  const mountRef = useRef(null);
  const containerRef = useRef(null);
  const cameraRef = useRef(null);
  const keysRef = useRef({});
  const yawRef = useRef(SPAWN.yaw);
  const pitchRef = useRef(0);
  const posRef = useRef(new THREE.Vector3(SPAWN.x, SPAWN.y, SPAWN.z));
  const rafRef = useRef(0);
  const foundRef = useRef(foundHotspots);
  foundRef.current = foundHotspots;
  const hazardMeshesRef = useRef([]);
  const isEndedRef = useRef(isEnded);
  isEndedRef.current = isEnded;

  // Touch input state lives in refs so the render loop never re-renders.
  const moveVecRef = useRef({ x: 0, y: 0 });
  const lookPointerRef = useRef(null);
  const movePointerRef = useRef(null);
  const joystickRef = useRef({ x: 0, y: 0 });

  const [locked, setLocked] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTouch, setIsTouch] = useState(detectCoarsePointer);
  const [joystick, setJoystick] = useState({ active: false, dx: 0, dy: 0 });
  const [hasLooked, setHasLooked] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [webglFailed, setWebglFailed] = useState(false);
  // Equipment the trainee is currently looking at
  const [inspected, setInspected] = useState(null);

  const layout = scenario?.walkthroughLayout;

  const flashFeedback = useCallback((type, text) => {
    setFeedback({ type, text, key: Date.now() });
    window.clearTimeout(flashFeedback.timerId);
    flashFeedback.timerId = window.setTimeout(() => setFeedback(null), 2400);
  }, []);

  // Detect hybrid devices (touchscreen laptops) and enable the on-screen pads
  // the first time a real touch happens, not just from media-query heuristics.
  useEffect(() => {
    const onFirstTouch = () => setIsTouch(true);
    window.addEventListener('touchstart', onFirstTouch, { once: true, passive: true });
    return () => window.removeEventListener('touchstart', onFirstTouch);
  }, []);

  // ── Scene lifecycle ────────────────────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !scenario) return undefined;

    let disposed = false;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } catch {
      setWebglFailed(true);
      return undefined;
    }
    if (!renderer.getContext()) {
      setWebglFailed(true);
      renderer.dispose();
      return undefined;
    }

    const { scene, tick, interactables, dispose: disposeScene } = buildWarehouseScene();

    const camera = new THREE.PerspectiveCamera(
      72,
      mount.clientWidth / Math.max(1, mount.clientHeight),
      0.1,
      160
    );
    camera.position.copy(posRef.current);
    cameraRef.current = camera;

    // Conservative pixel-ratio cap keeps mid-range phones at 60fps.
    const coarse = detectCoarsePointer();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.25 : 1.6));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    // Highlight outline, reused for whichever equipment is under the reticle.
    const highlightRef = { current: null };
    {
      const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
      const line = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0xff7c42, transparent: true, opacity: 0.95 })
      );
      line.visible = false;
      line.renderOrder = 999;
      scene.add(line);
      highlightRef.current = line;
    }

    // Hazard props, staged by the server-provided randomized layout.
    const hazardMeshes = [];
    const hotspotMap = new Map((scenario.hotspots || []).map((h) => [h.id, h]));
    const stagedItems = layout?.items || [];

    if (stagedItems.length) {
      stagedItems.forEach((item) => {
        const hotspot = hotspotMap.get(item.hotspotId);
        if (!hotspot) return;
        const prop = buildHazardProp(item.hotspotId, item.propType);
        prop.position.set(item.position[0], item.position[1], item.position[2]);
        prop.rotation.y = item.rotationY || 0;
        scene.add(prop);
        prop.traverse((obj) => {
          if (obj.isMesh) hazardMeshes.push(obj);
        });
      });
    } else {
      // Defensive fallback: no layout supplied (e.g. an older API response).
      // Hazards are still rendered so the mode remains usable.
      (scenario.hotspots || [])
        .filter((h) => h.isHazard)
        .forEach((h, idx) => {
          const prop = buildHazardProp(h.id, 'default');
          prop.position.set((idx - 2) * 5, 0.05, -6);
          scene.add(prop);
          prop.traverse((obj) => {
            if (obj.isMesh) hazardMeshes.push(obj);
          });
        });
    }
    hazardMeshesRef.current = hazardMeshes;

    // ── Hazard reporting (shared by mouse and touch) ─────────────────────────
    const reportAtReticle = () => {
      if (isEndedRef.current) return;
      const ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2(0, 0), camera);
      ray.far = RAY_RANGE;
      const hits = ray.intersectObjects(hazardMeshesRef.current, false);
      if (hits.length > 0) {
        const hotspotId = hits[0].object.userData.hotspotId;
        const hotspot = hotspotMap.get(hotspotId);
        const already = foundRef.current.some((h) => h.id === hotspotId);
        if (hotspot && !already) {
          onHazardClick(hotspot);
          flashFeedback('good', `HAZARD IDENTIFIED — ${hotspot.title}`);
          return;
        }
      }
      onFalseClick();
      flashFeedback('stop', 'NO HAZARD AT THIS POINT — accuracy penalty applied');
    };

    // ── Desktop input: WASD + pointer-lock mouse look ─────────────────────────
    const onKeyDown = (e) => {
      keysRef.current[e.code] = true;
      if ((e.code === 'ControlLeft' || e.code === 'ControlRight') && document.pointerLockElement === renderer.domElement) {
        document.exitPointerLock?.();
      }
    };
    const onKeyUp = (e) => {
      keysRef.current[e.code] = false;
    };
    const onMouseMove = (e) => {
      if (document.pointerLockElement !== renderer.domElement) return;
      yawRef.current -= e.movementX * MOUSE_LOOK_SENSITIVITY;
      pitchRef.current = Math.max(
        -PITCH_LIMIT,
        Math.min(PITCH_LIMIT, pitchRef.current - e.movementY * MOUSE_LOOK_SENSITIVITY)
      );
      setHasLooked(true);
    };
    const onCanvasClick = () => {
      if (isTouch) return;
      if (document.pointerLockElement !== renderer.domElement) {
        renderer.domElement.requestPointerLock?.();
        return;
      }
      reportAtReticle();
    };
    const onLockChange = () => setLocked(document.pointerLockElement === renderer.domElement);
    const onLockError = () =>
      flashFeedback('stop', 'Mouse look was blocked. Drag to look around instead.');

    // ── Touch input: left half = virtual stick, right half = look + tap ───────
    const rectOf = () => renderer.domElement.getBoundingClientRect();

    const onPointerDown = (e) => {
      if (e.pointerType === 'mouse') return;
      const rect = rectOf();
      const onLeft = e.clientX - rect.left < rect.width * 0.45;
      if (onLeft && !movePointerRef.current) {
        movePointerRef.current = { id: e.pointerId, ox: e.clientX, oy: e.clientY };
        setJoystick({ active: true, dx: 0, dy: 0 });
      } else if (!lookPointerRef.current) {
        lookPointerRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0, t0: Date.now() };
      }
    };

    const onPointerMove = (e) => {
      if (e.pointerType === 'mouse') return;
      const move = movePointerRef.current;
      if (move && move.id === e.pointerId) {
        const RADIUS = 52;
        let dx = e.clientX - move.ox;
        let dy = e.clientY - move.oy;
        const dist = Math.hypot(dx, dy);
        if (dist > RADIUS) {
          dx = (dx / dist) * RADIUS;
          dy = (dy / dist) * RADIUS;
        }
        moveVecRef.current = { x: dx / RADIUS, y: dy / RADIUS };
        setJoystick({ active: true, dx, dy });
        return;
      }
      const look = lookPointerRef.current;
      if (look && look.id === e.pointerId) {
        const dx = e.clientX - look.x;
        const dy = e.clientY - look.y;
        look.moved += Math.abs(dx) + Math.abs(dy);
        look.x = e.clientX;
        look.y = e.clientY;
        yawRef.current -= dx * TOUCH_LOOK_SENSITIVITY;
        pitchRef.current = Math.max(
          -PITCH_LIMIT,
          Math.min(PITCH_LIMIT, pitchRef.current - dy * TOUCH_LOOK_SENSITIVITY)
        );
        if (look.moved > 8) setHasLooked(true);
      }
    };

    const onPointerUp = (e) => {
      if (e.pointerType === 'mouse') return;
      const move = movePointerRef.current;
      if (move && move.id === e.pointerId) {
        movePointerRef.current = null;
        moveVecRef.current = { x: 0, y: 0 };
        setJoystick({ active: false, dx: 0, dy: 0 });
        return;
      }
      const look = lookPointerRef.current;
      if (look && look.id === e.pointerId) {
        lookPointerRef.current = null;
        // A short, still tap counts as "report a hazard at the reticle".
        const quickTap = look.moved < 12 && Date.now() - look.t0 < 400;
        if (quickTap) reportAtReticle();
      }
    };

    const onWheel = (e) => e.preventDefault();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onResize);
    document.addEventListener('pointerlockchange', onLockChange);
    document.addEventListener('pointerlockerror', onLockError);
    renderer.domElement.addEventListener('click', onCanvasClick);
    renderer.domElement.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerUp, { passive: true });
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    function onResize() {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = Math.max(1, mountRef.current.clientHeight);
      camera.aspect = w / h;
      // Portrait phones need a wider vertical FOV to keep the aisles readable.
      camera.fov = h > w ? 82 : 72;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    onResize();

    // ── "What am I looking at" probe ────────────────────────────────────────
    // Invisible pick-boxes sit outside the scene graph, so this raycast costs
    // almost nothing: it never touches the ~4,000 instanced props, only the
    // handful of labelled equipment proxies.
    const hoverRay = new THREE.Raycaster();
    hoverRay.far = 14;
    const centreNdc = new THREE.Vector2(0, 0);
    const proxyMatrices = new THREE.Matrix4();
    let hoverAccum = 0;
    let currentInspected = null;

    const updateProbe = (dt) => {
      hoverAccum += dt;
      if (hoverAccum < 1 / HOVER_HZ) return;
      hoverAccum = 0;
      if (!interactables.length) return;
      // Moving vehicles re-stamp their proxy each frame, so refresh matrices.
      interactables.forEach((b) => b.updateMatrixWorld(true));
      hoverRay.setFromCamera(centreNdc, camera);
      const hit = hoverRay.intersectObjects(interactables, false)[0];
      const found = hit ? { label: hit.object.userData.label, kind: hit.object.userData.kind } : null;
      const changed =
        (found?.label ?? null) !== (currentInspected?.label ?? null);
      currentInspected = found;
      if (changed) setInspected(found);
      if (highlightRef.current) {
        highlightRef.current.visible = Boolean(hit);
        if (hit) {
          hit.object.updateMatrixWorld(true);
          proxyMatrices.copy(hit.object.matrixWorld);
          const p = new THREE.Vector3();
          const q = new THREE.Quaternion();
          const s = new THREE.Vector3();
          proxyMatrices.decompose(p, q, s);
          highlightRef.current.position.copy(p);
          highlightRef.current.quaternion.copy(q);
          highlightRef.current.scale.set(s.x + 0.06, s.y + 0.06, s.z + 0.06);
        }
      }
    };

    // ── Render loop ──────────────────────────────────────────────────────────
    const obstacles = getObstacles();
    const forwardVec = new THREE.Vector3();
    let elapsed = 0;
    let last = performance.now();

    const frame = (now) => {
      rafRef.current = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      elapsed += dt;

      // Combine keyboard (desktop) and virtual stick (touch) into one vector.
      const k = keysRef.current;
      let forward = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
      let strafe = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
      forward -= moveVecRef.current.y;
      strafe += moveVecRef.current.x;

      const mag = Math.hypot(forward, strafe);
      if (mag > 0.001) {
        if (mag > 1) {
          forward /= mag;
          strafe /= mag;
        }
        const sinY = Math.sin(yawRef.current);
        const cosY = Math.cos(yawRef.current);
        forwardVec.set(-sinY * forward + cosY * strafe, 0, -cosY * forward - sinY * strafe);
        const step = MOVE_SPEED * dt;
        const nextX = posRef.current.x + forwardVec.x * step;
        const nextZ = posRef.current.z + forwardVec.z * step;
        // Axis-separated slide keeps movement smooth against obstacles.
        if (!collidesAt(nextX, posRef.current.z, obstacles)) posRef.current.x = nextX;
        if (!collidesAt(posRef.current.x, nextZ, obstacles)) posRef.current.z = nextZ;
      }

      camera.position.copy(posRef.current);
      camera.quaternion.setFromEuler(
        new THREE.Euler(pitchRef.current, yawRef.current, 0, 'YXZ')
      );

      // Drive the live systems: conveyor, vehicles, staff, fans, blinking lamps.
      tick(dt, elapsed);
      updateProbe(dt);

      if (!disposed) renderer.render(scene, camera);
    };
    rafRef.current = requestAnimationFrame(frame);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('pointerlockchange', onLockChange);
      document.removeEventListener('pointerlockerror', onLockError);
      renderer.domElement.removeEventListener('click', onCanvasClick);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      if (document.pointerLockElement === renderer.domElement) document.exitPointerLock();
      hazardMeshesRef.current = [];
      disposeScene();
      renderer.dispose();
      renderer.domElement.remove();
      cameraRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario?.id, layout?.seed]);

  // ── Fullscreen ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) containerRef.current.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.();
  };

  const resetView = () => {
    posRef.current.set(SPAWN.x, SPAWN.y, SPAWN.z);
    yawRef.current = SPAWN.yaw;
    pitchRef.current = 0;
    setHasLooked(false);
  };

  const reportHazard = () => {
    if (!cameraRef.current || isEnded) return;
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(0, 0), cameraRef.current);
    ray.far = RAY_RANGE;
    const hits = ray.intersectObjects(hazardMeshesRef.current, false);
    const hotspotMap = new Map((scenario?.hotspots || []).map((h) => [h.id, h]));
    if (hits.length > 0) {
      const hotspotId = hits[0].object.userData.hotspotId;
      const hotspot = hotspotMap.get(hotspotId);
      if (hotspot && !foundRef.current.some((h) => h.id === hotspotId)) {
        onHazardClick(hotspot);
        flashFeedback('good', `HAZARD IDENTIFIED — ${hotspot.title}`);
        return;
      }
    }
    onFalseClick();
    flashFeedback('stop', 'NO HAZARD AT THIS POINT — accuracy penalty applied');
  };

  const totalHazards = (scenario?.hotspots || []).filter((h) => h.isHazard).length;
  const errors = foundHotspots.length;
  const urgent = typeof timeLeft === 'number' && timeLeft <= 15;
  const timePct =
    typeof timeLeft === 'number' && totalTime ? Math.max(0, (timeLeft / totalTime) * 100) : 100;

  // ── Graceful degradation ───────────────────────────────────────────────────
  if (webglFailed) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-panel border border-caution-200 bg-caution-50 p-6 text-center dark:border-caution-600/40 dark:bg-caution-600/10">
        <AlertTriangle className="h-7 w-7 text-caution-600 dark:text-caution-200" />
        <h3 className="text-sm font-bold text-mist-900 dark:text-white">
          3D graphics are unavailable on this device
        </h3>
        <p className="max-w-sm text-xs text-mist-600 dark:text-dark-muted">
          Your browser or GPU could not start WebGL. Start the session in Standard
          360° mode instead — it runs the same hazards, timer, and scoring.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full select-none bg-dark-bg ${
        isFullscreen
          ? 'fixed inset-0 z-50 h-[100dvh] w-screen'
          : 'h-[74vh] min-h-[440px] max-h-[820px] overflow-hidden rounded-lg border border-mist-300 dark:border-dark-border'
      }`}
    >
      <div ref={mountRef} className="h-full w-full" style={{ touchAction: 'none' }} />

      {/* ── In-world LED readout (mirrors the reference HUD) ── */}
      <div className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 sm:top-4">
        <div className="flex items-stretch overflow-hidden rounded-control border border-pass-600/60 bg-dark-card/95 font-mono shadow-pop backdrop-blur-sm">
          <div className="px-2.5 py-1.5 sm:px-3.5">
            <p className="text-[8px] font-bold uppercase leading-none tracking-[0.15em] text-pass-200/70 sm:text-[9px]">
              Errors
            </p>
            <p className="text-sm font-bold leading-tight text-pass-200 sm:text-lg">
              {errors}
              <span className="text-pass-200/60">/{totalHazards}</span>
            </p>
          </div>
          <div
            className={`border-l border-pass-600/60 px-2.5 py-1.5 sm:px-3.5 ${
              urgent ? 'animate-pulse bg-stop-600/25' : ''
            }`}
          >
            <p className="text-[8px] font-bold uppercase leading-none tracking-[0.15em] text-pass-200/70 sm:text-[9px]">
              Time left
            </p>
            <p
              className={`text-sm font-bold leading-tight sm:text-lg ${
                urgent ? 'text-stop-200' : 'text-pass-200'
              }`}
            >
              {formatClock(timeLeft ?? totalTime ?? 0)}
            </p>
          </div>
        </div>
        <div className="mx-auto mt-1 h-0.5 w-24 overflow-hidden rounded-full bg-white/15">
          <div
            className={`h-full transition-[width] duration-1000 ${
              urgent ? 'bg-stop-200' : 'bg-pass-200'
            }`}
            style={{ width: `${timePct}%` }}
          />
        </div>
      </div>

      /* Centre reticle */
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center">
        <div className="relative h-6 w-6">
          <span className="absolute left-1/2 top-0 h-1.5 w-px -translate-x-1/2 bg-white/80" />
          <span className="absolute bottom-0 left-1/2 h-1.5 w-px -translate-x-1/2 bg-white/80" />
          <span className="absolute left-0 top-1/2 h-px w-1.5 -translate-y-1/2 bg-white/80" />
          <span className="absolute right-0 top-1/2 h-px w-1.5 -translate-y-1/2 bg-white/80" />
          <span
            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all ${
              inspected ? 'h-2.5 w-2.5 bg-primary-500 ring-2 ring-primary-500/40' : 'h-1 w-1 bg-white/90'
            }`}
          />
        </div>
      </div>

      {/* ── Equipment readout: what the reticle is on ── */}
      {inspected && (
        <div className="pointer-events-none absolute left-1/2 top-[58%] z-30 -translate-x-1/2 animate-fade-in">
          <div className="rounded-control border border-primary-500/60 bg-dark-card/95 px-3 py-2 text-center shadow-pop backdrop-blur-sm">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-primary-400">
              {inspected.kind}
            </p>
            <p className="mt-0.5 text-xs font-bold text-white">{inspected.label}</p>
          </div>
        </div>
      )}

      {/* Feedback banner */}
      {feedback && (
        <div
          key={feedback.key}
          className={`pointer-events-none absolute left-1/2 top-16 z-30 max-w-[90%] -translate-x-1/2 animate-fade-in rounded-control border px-3 py-1.5 text-center text-[11px] font-bold shadow-pop sm:top-20 sm:px-4 sm:py-2 sm:text-xs ${
            feedback.type === 'good'
              ? 'border-pass-600/60 bg-pass-600/95 text-pass-100 dark:text-pass-200'
              : 'border-stop-600/60 bg-stop-600/95 text-stop-200'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* ── Spotted hazard ticker ── */}
      {foundHotspots.length > 0 && (
        <div className="pointer-events-none absolute bottom-2 left-2 right-2 z-20 flex flex-wrap gap-1.5 sm:bottom-3 sm:left-3 sm:right-auto sm:max-w-[60%]">
          {foundHotspots.slice(-3).map((h) => (
            <span
              key={h.id}
              className="animate-fade-in rounded-control border border-pass-600/60 bg-dark-card/95 px-2 py-1 text-[10px] font-bold text-pass-200 backdrop-blur-sm"
            >
              ✓ {h.title}
            </span>
          ))}
          {foundHotspots.length > 3 && (
            <span className="rounded-control border border-white/20 bg-black/80 px-2 py-1 text-[10px] font-bold text-white/70">
              +{foundHotspots.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* ── Desktop pointer-lock hint ── */}
      {!isTouch && !locked && !hasLooked && (
        <div className="absolute bottom-16 left-1/2 z-10 -translate-x-1/2 rounded-control border border-white/20 bg-black/80 px-4 py-3 text-left text-white backdrop-blur-sm">
          <p className="text-xs font-bold">Click inside the warehouse to look around</p>
          <div className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[11px] text-mist-300">
            <span className="font-mono font-bold text-primary-400">Mouse</span>
            <span>Look</span>
            <span className="font-mono font-bold text-primary-400">W A S D</span>
            <span>Move</span>
            <span className="font-mono font-bold text-primary-400">Ctrl</span>
            <span>Release mouse</span>
          </div>
        </div>
      )}
      {!isTouch && !locked && hasLooked && (
        <div className="absolute bottom-16 left-1/2 z-10 -translate-x-1/2 rounded-control border border-white/15 bg-black/70 px-3 py-1.5 text-[11px] font-semibold text-white/80 backdrop-blur-sm">
          Click inside the warehouse to resume looking around.
        </div>
      )}

      {/* ── Touch controls ── */}
      {isTouch && (
        <>
          {/* Virtual movement stick */}
          <div className="pointer-events-none absolute bottom-6 left-5 z-20 h-28 w-28">
            <div className="flex h-full w-full items-center justify-center rounded-full border border-white/25 bg-black/35 backdrop-blur-sm">
              <div
                className="h-12 w-12 rounded-full border border-white/60 bg-white/25 shadow-pop transition-transform"
                style={{
                  transform: `translate(${joystick.dx}px, ${joystick.dy}px)`,
                }}
              />
            </div>
            {!joystick.active && (
              <span className="absolute inset-x-0 -bottom-4 text-center text-[9px] font-bold uppercase tracking-wider text-white/70">
                Drag to move
              </span>
            )}
          </div>

          {/* Report-hazard button */}
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={reportHazard}
            disabled={isEnded}
            className="absolute bottom-8 right-5 z-30 flex h-20 w-20 flex-col items-center justify-center rounded-full border-2 border-primary-300 bg-primary-500/90 text-white shadow-pop transition-transform active:scale-95 disabled:opacity-40"
            aria-label="Report a hazard at the reticle"
          >
            <AlertTriangle className="h-6 w-6" />
            <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wide">Report</span>
          </button>
        </>
      )}

      {/* ── Utility buttons ── */}
      <div className="absolute right-3 top-3 z-30 flex flex-col gap-1.5 sm:right-4 sm:top-4">
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={toggleFullscreen}
          className="rounded-control border border-white/20 bg-black/80 p-2 text-white backdrop-blur-sm"
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={resetView}
          className="rounded-control border border-white/20 bg-black/80 p-2 text-white backdrop-blur-sm"
          title="Return to the staging bay"
          aria-label="Return to the staging bay"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setShowHelp((v) => !v)}
          className="rounded-control border border-white/20 bg-black/80 p-2 text-white backdrop-blur-sm"
          title="Controls"
          aria-label="Show controls"
        >
          <Navigation className="h-4 w-4" />
        </button>
      </div>

      {showHelp && (
        <div className="absolute bottom-16 right-3 z-30 w-56 rounded-lg border border-white/20 bg-black/90 p-3 text-[11px] text-white backdrop-blur-md sm:right-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold">
            <Compass className="h-3.5 w-3.5 text-primary-400" />
            Walkthrough controls
          </p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-mist-300">
            {isTouch ? (
              <>
                <dt className="font-mono font-bold text-primary-400">Left pad</dt>
                <dd>Drag to walk</dd>
                <dt className="font-mono font-bold text-primary-400">Right side</dt>
                <dd>Drag to look</dd>
                <dt className="font-mono font-bold text-primary-400">Report</dt>
                <dd>Flag the reticle</dd>
              </>
            ) : (
              <>
                <dt className="font-mono font-bold text-primary-400">W A S D</dt>
                <dd>Walk</dd>
                <dt className="font-mono font-bold text-primary-400">Mouse</dt>
                <dd>Look (click to capture)</dd>
                <dt className="font-mono font-bold text-primary-400">Click</dt>
                <dd>Report reticle</dd>
                <dt className="font-mono font-bold text-primary-400">Ctrl</dt>
                <dd>Release mouse</dd>
              </>
            )}
          </dl>
          <p className="mt-2 border-t border-white/15 pt-2 text-[10px] text-mist-400">
            Hazards are re-staged in new positions on every attempt.
          </p>
        </div>
      )}

      {/* Compact control legend */}
      {!isTouch && (
        <div className="absolute bottom-3 left-3 hidden rounded-control border border-white/20 bg-black/80 px-2.5 py-1.5 text-[11px] font-semibold text-white/90 backdrop-blur-sm sm:block">
          WASD move · Mouse look · Click report · Ctrl release
        </div>
      )}
    </div>
  );
};

export default WalkthroughViewer;