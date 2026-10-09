import React, { useEffect, useRef, useState, useCallback } from 'react';
import 'pannellum/build/pannellum.css';
import 'pannellum/build/pannellum.js';
import { soundEngine } from '../../utils/audio';
import { CheckCircle2, Crosshair, Maximize2, Minimize2, Move, ArrowLeft, ArrowRight } from 'lucide-react';

export const PanoramaViewer = ({
  scenario,
  foundHotspots = [],
  onHazardClick,
  onFalseClick,
  isEnded = false,
  isCalibrationMode = false,
  practiceTargetFound = false,
  onPracticeTargetFound,
  onUserRotated,
}) => {
  const outerContainerRef = useRef(null);
  const pannellumDivRef = useRef(null);
  const viewerRef = useRef(null);
  // Tightest permitted hit radius (degrees). Kept deliberately small so the
  // trainee must visually locate and aim at each hazard.
  const MAX_HIT_RADIUS = 5;
  const [yaw, setYaw] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [ripples, setRipples] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [useCanvasFallback, setUseCanvasFallback] = useState(false);

  // Drag vs Click Tracking (Prevents accidental clicks when rotating camera)
  const dragTracker = useRef({
    startX: 0,
    startY: 0,
    startTime: 0,
    isDragging: false,
    hasMovedSignificantly: false,
  });

  const lastHotspotClickTime = useRef(0);
  const accumulatedRotation = useRef(0);
  const cameraPositionRef = useRef({ yaw: 0, pitch: 0 });

  // Fullscreen toggle
  //
  // Support varies sharply across mobile browsers. iPhone Safari has no element
  // fullscreen API at all, and on iOS it would not hide the browser chrome even
  // where it exists. The previous `requestFullscreen?.()` therefore did nothing
  // on those devices - no error, no feedback - so the button just looked broken.
  //
  // Handled here instead of one blind call:
  //   1. vendor-prefixed APIs are tried, covering older Safari and Android WebView;
  //   2. where no fullscreen exists at all, an immersive fallback resizes the
  //      viewer to the visible viewport rather than silently ignoring the tap;
  //   3. a request refused despite the API existing (iOS gesture rules) also
  //      falls back instead of leaving a dead button.
  const [immersive, setImmersive] = useState(false);

  useEffect(() => {
    if (!immersive) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e) => {
      // A phone has no Esc key, so the fallback needs its own way out.
      if (e.key === 'Escape') setImmersive(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [immersive]);

  const supportsFullscreen = () => {
    const el = outerContainerRef.current;
    return Boolean(el && (el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen));
  };

  const toggleFullscreen = () => {
    const el = outerContainerRef.current;
    if (!el) return;

    if (document.fullscreenElement || document.webkitFullscreenElement) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) exit.call(document).catch((err) => console.warn('Exit fullscreen failed:', err));
      return;
    }

    if (!supportsFullscreen()) {
      setImmersive(true);
      return;
    }

    const request = (el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen).call(el);
    if (request && typeof request.catch === 'function') {
      request.catch((err) => {
        console.warn('Fullscreen request failed:', err);
        setImmersive(true);
      });
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const nextFullscreenState = Boolean(document.fullscreenElement);
      if (viewerRef.current) {
        try {
          cameraPositionRef.current = {
            yaw: viewerRef.current.getYaw(),
            pitch: viewerRef.current.getPitch(),
          };
        } catch (err) {}
      }
      setIsFullscreen(nextFullscreenState);

      // Keep the existing renderer and refresh only its viewport. Rebuilding
      // Pannellum here refetches the panorama and recreates hotspot markers.
      [80, 180, 360].forEach((delay) => {
        window.setTimeout(() => {
          if (!viewerRef.current) return;
          try {
            const currentYaw = viewerRef.current.getYaw();
            const currentPitch = viewerRef.current.getPitch();
            viewerRef.current.resize(true);
            viewerRef.current.setYaw(currentYaw);
            viewerRef.current.setPitch(currentPitch);
            setYaw(currentYaw);
            setPitch(currentPitch);
          } catch (err) {
            console.warn('Panorama viewport refresh after fullscreen change failed:', err);
          }
        }, delay);
      });
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard navigation for Arrow Keys (←, →, ↑, ↓)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        let deltaYaw = 0;
        let deltaPitch = 0;

        if (e.key === 'ArrowLeft') deltaYaw = -4;
        if (e.key === 'ArrowRight') deltaYaw = 4;
        if (e.key === 'ArrowUp') deltaPitch = 3;
        if (e.key === 'ArrowDown') deltaPitch = -3;

        if (viewerRef.current) {
          const currentYaw = viewerRef.current.getYaw();
          const currentPitch = viewerRef.current.getPitch();
          viewerRef.current.setYaw(currentYaw + deltaYaw);
          viewerRef.current.setPitch(Math.max(-85, Math.min(85, currentPitch + deltaPitch)));
          setYaw(viewerRef.current.getYaw());
          setPitch(viewerRef.current.getPitch());
        } else {
          setYaw((prev) => prev + deltaYaw);
          setPitch((prev) => Math.max(-85, Math.min(85, prev + deltaPitch)));
        }

        accumulatedRotation.current += Math.abs(deltaYaw) + Math.abs(deltaPitch);
        if (onUserRotated) {
          onUserRotated(accumulatedRotation.current);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onUserRotated]);

  // The panorama's own hazards when the scenario supplies them, falling back
  // to `hotspots`. They are two depictions of the same five hazards: these carry
  // the coordinates and wording for this photograph, and share ids with
  // `hotspots` so a find still grades the same. See Scenario.panoramaSpots.
  const spots = scenario?.panoramaSpots?.length ? scenario.panoramaSpots : scenario?.hotspots;

  // Check if click coordinates hit any hazard
  const testHazardHit = (clickPitch, clickYaw) => {
    // Calibration practice target
    if (isCalibrationMode) {
      const practicePitch = -15;
      const practiceYaw = -10;
      let deltaYaw = Math.abs(practiceYaw - clickYaw);
      if (deltaYaw > 180) deltaYaw = 360 - deltaYaw;
      const deltaPitch = Math.abs(practicePitch - clickPitch);
      const dist = Math.sqrt(deltaYaw * deltaYaw + deltaPitch * deltaPitch);
      if (dist <= 8) {
        return {
          id: 'practice-target',
          title: 'Practice Target (Battery Pallet Infraction)',
          category: 'Calibration Practice',
          severity: 'Training',
        };
      }
      return null;
    }

    if (!spots) return null;

    for (const spot of spots) {
      if (!spot.isHazard) continue;

      let deltaYaw = Math.abs(spot.yaw - clickYaw);
      if (deltaYaw > 180) deltaYaw = 360 - deltaYaw;
      const deltaPitch = Math.abs(spot.pitch - clickPitch);
      const dist = Math.sqrt(deltaYaw * deltaYaw + deltaPitch * deltaPitch);
      // Tightened so a hazard must actually be located and aimed at, not just
      // clicked somewhere in the right third of the panorama. The scenario value
      // is the authority, clamped here so an oversized radius cannot make a
      // hazard trivial to hit by accident.
      const hitRadius = Math.min(spot.radius ?? MAX_HIT_RADIUS, MAX_HIT_RADIUS);

      if (dist <= hitRadius) {
        return spot;
      }
    }
    return null;
  };

  // Initialize Pannellum
  useEffect(() => {
    if (!pannellumDivRef.current || !scenario) return;

    const initPannellum = () => {
      if (window.pannellum && pannellumDivRef.current) {
        try {
          if (viewerRef.current) {
            try {
              viewerRef.current.destroy();
            } catch (e) {}
            viewerRef.current = null;
          }

          let hotspotsConfig = [];

          if (isCalibrationMode) {
            hotspotsConfig = [
              {
                pitch: -15,
                yaw: -10,
                type: 'custom',
                createTooltipFunc: (div) => {
                  div.style.width = '42px';
                  div.style.height = '42px';
                  div.style.borderRadius = '50%';
                  div.style.cursor = 'pointer';
                  if (practiceTargetFound) {
                    div.innerHTML =
                      '<div class="hotspot-confirmed" style="width:40px;height:40px;"></div>';
                  } else {
                    // The calibration target is the one place a marker is
                    // legitimate: it is an explicit teaching aid, not a hazard.
                    div.innerHTML = `
                      <div class="hotspot-pulse" style="width: 40px; height: 40px; border-radius: 50%; border: 3px solid #FF6115; background: rgba(255, 97, 21, 0.2);"></div>
                    `;
                  }
                },
                clickHandlerFunc: () => {
                  lastHotspotClickTime.current = Date.now();
                  if (onPracticeTargetFound && !practiceTargetFound) {
                    onPracticeTargetFound();
                  }
                },
              },
            ];
          } else {
            hotspotsConfig = (spots || []).map((spot) => ({
              pitch: spot.pitch,
              yaw: spot.yaw,
              type: 'custom',
              createTooltipFunc: (hotSpotDiv) => {
                hotSpotDiv.style.width = '38px';
                hotSpotDiv.style.height = '38px';
                hotSpotDiv.style.cursor = 'crosshair';

                const isFound = foundHotspots.some((h) => h.id === spot.id);
                // Unfound hazards render NOTHING.
                //
                // The previous version drew a dashed orange reticle at every
                // unfound hotspot, which marked the answer on the screen — a
                // trainee could clear the scenario by clicking five circles
                // without perceiving a single hazard. Only a confirmed find is
                // ever marked, as positive reinforcement.
                hotSpotDiv.innerHTML = isFound
                  ? '<div class="hotspot-confirmed" style="width:36px;height:36px;"></div>'
                  : '';
              },
              clickHandlerFunc: () => {
                lastHotspotClickTime.current = Date.now();
                if (isEnded) return;
                const alreadyFound = foundHotspots.some((h) => h.id === spot.id);
                if (!alreadyFound) {
                  onHazardClick(spot);
                }
              },
            }));
          }

          const viewer = window.pannellum.viewer(pannellumDivRef.current, {
            type: 'equirectangular',
            panorama: scenario.panoramaUrl || '/panoramas/workshop_foundry.jpg',
            autoLoad: true,
            showControls: false,
            mouseZoom: false,
            keyboardZoom: false,
            hfov: 80,
            minHfov: 50,
            maxHfov: 100,
            pitch: cameraPositionRef.current.pitch,
            yaw: cameraPositionRef.current.yaw,
            hotSpots: hotspotsConfig,
          });

          viewer.on('animatefinished', () => {
            setPitch(viewer.getPitch());
            setYaw(viewer.getYaw());
          });

          viewer.on('mouseup', () => {
            setPitch(viewer.getPitch());
            setYaw(viewer.getYaw());
          });

          viewerRef.current = viewer;
          setUseCanvasFallback(false);
          setYaw(viewer.getYaw());
          setPitch(viewer.getPitch());
        } catch (err) {
          console.warn('Pannellum error, using canvas fallback:', err);
          setUseCanvasFallback(true);
        }
      } else {
        setUseCanvasFallback(true);
      }
    };

    const timer = setTimeout(initPannellum, 120);
    return () => {
      clearTimeout(timer);
      if (viewerRef.current) {
        try {
          viewerRef.current.destroy();
        } catch (e) {}
        viewerRef.current = null;
      }
      if (pannellumDivRef.current) {
        pannellumDivRef.current.innerHTML = '';
      }
    };
  }, [scenario?.id, isEnded, isCalibrationMode, practiceTargetFound]);

  // MOUSE DOWN: Record start position & time to distinguish drags from clicks
  const handleMouseDown = (e) => {
    dragTracker.current = {
      startX: e.clientX,
      startY: e.clientY,
      startTime: Date.now(),
      isDragging: true,
      hasMovedSignificantly: false,
    };
  };

  // MOUSE MOVE: If user moved more than 6px, flag as dragging to rotate camera
  const handleMouseMove = (e) => {
    if (!dragTracker.current.isDragging) return;

    const dx = e.clientX - dragTracker.current.startX;
    const dy = e.clientY - dragTracker.current.startY;
    const dist = Math.hypot(dx, dy);

    if (dist > 6) {
      dragTracker.current.hasMovedSignificantly = true;
      accumulatedRotation.current += dist;
      if (onUserRotated) {
        onUserRotated(accumulatedRotation.current);
      }
    }

    // Canvas fallback rotation
    if (useCanvasFallback && dragTracker.current.hasMovedSignificantly) {
      setYaw((prev) => prev - (dx * 0.05));
      setPitch((prev) => Math.max(-80, Math.min(80, prev + (dy * 0.05))));
    }
  };

  // MOUSE UP / CLICK: Strictly ignore if user was dragging to rotate!
  const handleMouseUp = (e) => {
    const wasDragging = dragTracker.current.hasMovedSignificantly;
    const duration = Date.now() - dragTracker.current.startTime;
    dragTracker.current.isDragging = false;

    // IF MOVED MORE THAN 6PX OR DRAG TOOK LONGER THAN 350MS WITH MOVEMENT -> DO NOT TRIGGER CLICK!
    if (wasDragging || duration > 400) {
      return;
    }

    // Ignore if click was handled by a Pannellum hotspot directly
    if (Date.now() - lastHotspotClickTime.current < 250) {
      return;
    }

    if (isEnded) return;

    const rect = outerContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    let clickPitch = pitch;
    let clickYaw = yaw;

    if (viewerRef.current && typeof viewerRef.current.mouseEventToCoords === 'function') {
      try {
        const coords = viewerRef.current.mouseEventToCoords(e);
        if (coords && coords.length >= 2) {
          clickPitch = coords[0];
          clickYaw = coords[1];
        }
      } catch (err) {}
    } else {
      const normX = (clickX - rect.width / 2) / (rect.width / 2);
      const normY = (rect.height / 2 - clickY) / (rect.height / 2);
      clickYaw = yaw + normX * 50;
      clickPitch = pitch + normY * 35;
    }

    const hit = testHazardHit(clickPitch, clickYaw);

    if (hit) {
      if (isCalibrationMode) {
        if (onPracticeTargetFound) onPracticeTargetFound();
      } else {
        const alreadyFound = foundHotspots.some((h) => h.id === hit.id);
        if (!alreadyFound) {
          onHazardClick(hit);
        }
      }
    } else {
      if (!isCalibrationMode) {
        // Stationary false click on background
        addRipple(clickX, clickY);
        onFalseClick({ x: clickX, y: clickY, pitch: clickPitch, yaw: clickYaw });
      }
    }
  };

  const addRipple = (x, y) => {
    const newRipple = { id: Date.now() + Math.random(), x, y };
    setRipples((prev) => [...prev, newRipple]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 700);
  };

  return (
    <div
      ref={outerContainerRef}
      className={`relative w-full select-none bg-dark-bg ${
        isFullscreen || immersive
          ? 'fixed inset-0 z-50 h-[100dvh] w-screen'
          : 'h-[74vh] min-h-[440px] max-h-[820px] overflow-hidden rounded-panel border border-mist-200 shadow-card dark:border-dark-border'
        } cursor-grab active:cursor-grabbing`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => (dragTracker.current.isDragging = false)}
    >
      {/* Pannellum Container */}
      <div
        ref={pannellumDivRef}
        className="w-full h-full"
        style={{ touchAction: 'none' }}
      >
        {useCanvasFallback && (
          <div
            className="w-full h-full bg-cover bg-center transition-all"
            style={{
              backgroundImage: `url(${scenario.panoramaUrl || '/panoramas/workshop_foundry.jpg'})`,
              backgroundPosition: `${50 - (yaw / 360) * 100}% ${50 - (pitch / 180) * 100}%`,
            }}
          />
        )}
      </div>

      {/* Crosshair Inspection Reticle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-40 text-white flex items-center justify-center">
        <Crosshair className="w-9 h-9 stroke-[1.5]" />
      </div>

      {/* False Click Ripples */}
      {ripples.map((rip) => (
        <div key={rip.id} className="ripple-error" style={{ left: rip.x, top: rip.y }}>
          <span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-control bg-stop-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-pop">
            No hazard here · −5%
          </span>
        </div>
      ))}

      {/* Floating Controls Overlay (Top Right: Fullscreen & Keyboard Hints) */}
      <div className="absolute top-4 right-4 z-20 flex items-center space-x-2">
        {/* Fullscreen Button */}
        <button
          type="button"
          data-viewer-control="true"
          onClick={(e) => {
            e.stopPropagation();
            toggleFullscreen();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          title={immersive ? 'Exit full screen' : isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          aria-label={immersive ? 'Exit full screen' : isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          className="inline-flex h-9 items-center gap-1.5 rounded-control border border-white/20 bg-dark-card/90 px-2.5 text-xs font-bold text-white backdrop-blur-md hover:bg-primary-600"
        >
          {immersive || isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          <span className="hidden sm:inline">{immersive || isFullscreen ? 'Exit' : 'Full screen'}</span>
        </button>
      </div>

      {/* Control hint */}
      <div className="pointer-events-none absolute left-3 top-3 z-20 flex flex-wrap gap-2 sm:left-4 sm:top-4">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-dark-card/85 px-3 py-1.5 text-[11px] font-semibold text-white/90 backdrop-blur-md">
          <Move className="h-3.5 w-3.5 text-primary-400" aria-hidden="true" />
          Drag to look · arrow keys · click to report
        </span>
      </div>

      {/* Confirmed hazards */}
      {!isCalibrationMode && foundHotspots.length > 0 && (
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-20 flex flex-wrap gap-1.5">
          {foundHotspots.map((spot) => (
            <span
              key={spot.id}
              className="inline-flex animate-fade-in items-center gap-1.5 rounded-control border border-pass-600 bg-dark-card/95 px-2.5 py-1 text-[11px] font-bold text-pass-200 backdrop-blur-sm"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-pass-600" aria-hidden="true" />
              {spot.title}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
