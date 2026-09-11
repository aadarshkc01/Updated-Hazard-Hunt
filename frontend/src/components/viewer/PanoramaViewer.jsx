import React, { useEffect, useRef, useState, useCallback } from 'react';
import { soundEngine } from '../../utils/audio';
import { AlertTriangle, CheckCircle2, Eye, Crosshair, Maximize2, Minimize2, Move, ArrowLeft, ArrowRight } from 'lucide-react';

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

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!outerContainerRef.current) return;

    if (!document.fullscreenElement) {
      outerContainerRef.current.requestFullscreen?.().catch((err) => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      document.exitFullscreen?.().catch((err) => {
        console.warn('Exit fullscreen failed:', err);
      });
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
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
      if (dist <= 14) {
        return {
          id: 'practice-target',
          title: 'Practice Target (Battery Pallet Infraction)',
          category: 'Calibration Practice',
          severity: 'Training',
        };
      }
      return null;
    }

    if (!scenario?.hotspots) return null;

    for (const spot of scenario.hotspots) {
      if (!spot.isHazard) continue;

      let deltaYaw = Math.abs(spot.yaw - clickYaw);
      if (deltaYaw > 180) deltaYaw = 360 - deltaYaw;
      const deltaPitch = Math.abs(spot.pitch - clickPitch);
      const dist = Math.sqrt(deltaYaw * deltaYaw + deltaPitch * deltaPitch);
      const hitRadius = spot.radius || 12;

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
                    div.innerHTML = `
                      <div style="background: #10B981; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px #10B981; border: 2.5px solid white;">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      </div>
                    `;
                  } else {
                    div.innerHTML = `
                      <div class="hotspot-pulse" style="width: 40px; height: 40px; border-radius: 50%; border: 3px solid #7A35FF; background: rgba(122, 53, 255, 0.25); display: flex; align-items: center; justify-content: center;">
                        <div style="width: 14px; height: 14px; border-radius: 50%; background: #7A35FF;"></div>
                      </div>
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
            hotspotsConfig = (scenario.hotspots || []).map((spot) => ({
              pitch: spot.pitch,
              yaw: spot.yaw,
              type: 'custom',
              createTooltipFunc: (hotSpotDiv) => {
                hotSpotDiv.style.width = '38px';
                hotSpotDiv.style.height = '38px';
                hotSpotDiv.style.borderRadius = '50%';
                hotSpotDiv.style.cursor = 'crosshair';

                const isFound = foundHotspots.some((h) => h.id === spot.id);
                if (isFound) {
                  hotSpotDiv.innerHTML = `
                    <div style="background: #10B981; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 16px rgba(16, 185, 129, 0.9); border: 2.5px solid white;">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                  `;
                } else {
                  // Subtle reticle zone
                  hotSpotDiv.innerHTML = `
                    <div class="unfound-marker" style="width: 36px; height: 36px; border-radius: 50%; border: 1.5px dashed rgba(122, 53, 255, 0.35); background: rgba(122, 53, 255, 0.06); transition: all 0.2s;">
                    </div>
                  `;
                }
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
            panorama: scenario.panoramaUrl || '/panoramas/warehouse_bay4.jpg',
            autoLoad: true,
            showControls: false,
            mouseZoom: false,
            keyboardZoom: false,
            hfov: 100,
            pitch: 0,
            yaw: 0,
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
      className={`relative w-full bg-dark-bg select-none transition-all ${
        isFullscreen
          ? 'fixed inset-0 z-50 h-screen w-screen rounded-none border-none'
          : 'h-[74vh] min-h-[500px] max-h-[800px] rounded-3xl overflow-hidden shadow-2xl border border-mist-300 dark:border-dark-border'
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
              backgroundImage: `url(${scenario.panoramaUrl || '/panoramas/warehouse_bay4.jpg'})`,
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
        <div
          key={rip.id}
          className="ripple-error"
          style={{ left: rip.x, top: rip.y }}
        >
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-lg shadow-lg">
            False Click (-5%)
          </span>
        </div>
      ))}

      {/* Floating Controls Overlay (Top Right: Fullscreen & Keyboard Hints) */}
      <div className="absolute top-4 right-4 z-20 flex items-center space-x-2">
        {/* Fullscreen Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleFullscreen();
          }}
          title={isFullscreen ? 'Exit Full Screen' : 'Expand to Full Screen'}
          className="p-2.5 rounded-2xl bg-dark-card/90 hover:bg-violet-600 text-white border border-white/20 backdrop-blur-md transition-all shadow-lg flex items-center space-x-1.5 text-xs font-bold"
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="w-4 h-4" />
              <span className="hidden sm:inline">Exit Fullscreen</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-4 h-4" />
              <span className="hidden sm:inline">Full Screen 360°</span>
            </>
          )}
        </button>
      </div>

      {/* Navigation Hint Pills (Top Left) */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2 pointer-events-none">
        <div className="bg-dark-card/85 text-white/90 border border-white/20 px-3.5 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md flex items-center space-x-2 shadow-lg">
          <Move className="w-3.5 h-3.5 text-violet-400" />
          <span>Click & Drag to Look • Arrow Keys (← ↑ → ↓)</span>
        </div>
      </div>

      {/* Discovered Hazards Bottom Floating Bar */}
      {!isCalibrationMode && foundHotspots.length > 0 && (
        <div className="absolute bottom-5 left-5 right-5 flex flex-wrap gap-2.5 pointer-events-none z-20">
          {foundHotspots.map((spot) => (
            <div
              key={spot.id}
              className="pointer-events-auto bg-dark-card/95 text-white border border-emerald-500/80 backdrop-blur-xl px-4 py-2 rounded-2xl text-xs font-bold flex items-center space-x-2 shadow-xl animate-fade-in"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{spot.title}</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-bold">
                SPOTTED
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
