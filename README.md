# Hazard Hunt — 360° Warehouse Hazard Perception Trainer

> **Course Assignment:** CET257 Enterprise Project — University of Sunderland  
> **Group:** Macro Thinkers  
> **Simulated Client:** Automotive Logistics & Warehousing Company  
> **Product Name:** Hazard Hunt  

### Project Team

| Name | Responsibility |
| :--- | :--- |
| **Prabin Upadhayay** | Back-End — API, scoring, layout randomisation, data model |
| **Aadarsh K.C.** | Front-End — React interface, dashboards, Three.js walkthrough |
| **Himanshu Bhusal** | Documentation — user manual, technical write-up, test evidence |
| **Shishir Pandey** | Presentation — defence material and demonstration |

These names are also rendered in the application footer, from a single `TEAM` array in
`frontend/src/components/common/Navbar.jsx`, so there is one place to edit.

---

## 1. Executive Summary & Tech Architecture

**Hazard Hunt** is an interactive, browser-based 360° hazard perception training application developed to replace outdated poster-based safety training in industrial warehousing. Trainees navigate an equirectangular panorama of an automotive inbound logistics depot (Bay 4), identify acute safety infractions under a countdown timer, complete a regulatory compliance quiz, and receive diagnostic feedback scored against an official 75% compliance threshold.

### Full MERN Technology Stack:
- **360° Panoramic Engine:** **Pannellum** with custom spherical projection & Canvas fallback.  
  *Justification:* Lightweight (<25KB gzipped), purpose-built for photo-panoramas, and strictly zero WebXR/headset dependencies (satisfying NFR-03: runs seamlessly on standard laptop/tablet browsers).
- **3D Walkthrough Engine:** **Three.js** with fully procedural, instanced warehouse geometry (`frontend/src/components/viewer/warehouseScene.js`). No external models or textures, so it loads instantly on mobile data and degrades gracefully to 360° mode when WebGL is unavailable.
- **Front-End:** React 18 + Vite, Tailwind CSS with safety-tech industrial theme (Neon Orange `#FF6115`, Porcelain `#FFFCF4`, Charcoal `#1A1D20`).
- **Back-End:** Node.js (v22+) + Express REST API.
- **Database:** MongoDB with Mongoose ODM + auto-initializing in-memory database (`mongodb-memory-server`) ensuring 100% zero-config execution on any laptop.
- **Audio:** Synthesized Web Audio API sound engine (zero external audio file dependencies).
- **Authentication:** JWT sessions with Role-Based Access Control (RBAC).

---

## 2. Quick Start & Execution Guide

### Prerequisites
- Node.js (v18 or v22+)
- `npm`

### Step 1: Start the Backend Server (Express + MongoDB)
Open a terminal in the project directory:
```bash
cd backend
npm install   # If not already installed
cp .env.example .env   # Windows: copy .env.example .env
# Set a private JWT_SECRET in .env before sharing or deploying the app.
npm start     # Runs on http://localhost:5000
```
> **Note on Database Portability:** If no `MONGODB_URI` environment variable is defined in `backend/.env`, the backend automatically launches an embedded in-memory MongoDB store and seeds all default users, scenarios, and audit records.

### Step 2: Start the Frontend Client (React + Vite)
Open a second terminal:
```bash
cd frontend
npm install   # If not already installed
npm run dev   # Runs on http://localhost:5173
```
Open your browser and navigate to: `http://localhost:5173`

### Install Both Applications from the Repository Root
After cloning the repository, install both workspaces with:
```bash
npm run install:all
```

The repository includes `backend/.env.example` as a configuration template. Do not commit `backend/.env`; it is ignored by Git and should contain only local or deployment-specific values.

### Production Build
Build the frontend from the repository root with:
```bash
npm run build:frontend
```

---

## 7. Training Modes

Two inspection modes are available at session launch:

| Mode | Best for | Controls |
| :--- | :--- | :--- |
| **Standard 360°** | Quick training, very low-end devices | Drag / arrow keys to rotate; click hazards |
| **Warehouse Walkthrough** | Immersive first-person inspection — **phone, tablet, laptop & desktop** | See controls below |

### 7.1 Warehouse Walkthrough — Controls

The walkthrough runs in **every modern browser on any device** (NFR-03). Input is
detected at runtime, so touchscreen laptops get both schemes simultaneously.

| Input | Phone / tablet | Desktop |
| :--- | :--- | :--- |
| Move | Drag the **left thumb pad** | **W A S D** / arrow keys |
| Look | Drag anywhere on the **right** of the screen | **Mouse** (click to capture) |
| Report hazard | Tap the **REPORT** button, or tap the view | **Click** |
| Free the cursor | — | **Ctrl** |

Additional on-screen controls: fullscreen, return-to-spawn, and a context help panel.

The centre reticle is also a **live probe**. Point it at a distribution board, charging bay,
conveyor, dock door, fire point or vehicle and it outlines the item in hazard orange and reads
out its label and category — so the environment responds as you look around it, and the depot
can be explored for its own sake rather than only as a hunt.

### 7.2 Randomized Hazard Staging ("risks appear at random")

Adapted from the *Hazard Spotting — Warehouse* reference product, where risks are
re-staged at random on each exercise rather than sitting at memorisable coordinates.

- `backend/src/utils/walkthroughLayout.js` draws from **17 anchor points** across the
  floor plan and assigns each hazard a slot, a rotation, and one of **10 visual variants**
  (e.g. a chemical hazard appears as either a *spill puddle* or a *leaking drum*).
  The anchors are mirrored from `warehousePlan.js` and are asserted to sit on walkable floor
  that is **clear of the painted walkway**, so a staged hazard never blocks the walking route.
- The layout is generated **server-side on every scenario load**, so positions cannot
  be predicted or memorised between attempts.
- The fire-exit hazard is always staged directly in front of the fire exit so the
  depiction stays coherent.
- **Integrity is unchanged:** the layout module only decides *where* a prop is drawn.
  Whether a click was correct is still resolved exclusively in `scoring.js` against the
  canonical `Scenario.hotspots` documents. The client cannot forge a layout to obtain credit.
- The layout `seed` is stored on the `ComplianceRecord` and exported as a **Layout Seed**
  CSV column, so a supervisor dispute can be replayed against the exact staging plan.
  The seed is sanitised server-side (finite non-negative integer only).

### 7.3 Scene Fidelity

The walkthrough depot is entirely procedural — no external models, textures or HDRIs, and
nothing derived from any reference product's assets. It is split across four modules so that
one floor plan change can never silently strand a prop outside the shell:

| Module | Responsibility |
| :--- | :--- |
| `viewer/warehousePlan.js` | **Single source of truth** — room dims, rack footprints, walkway, dock doors, collision volumes, floor-clamp helpers |
| `viewer/warehouseScene.js` | Orchestrator: room shell, instancing batcher, material registry, animation registry, hover proxies |
| `viewer/warehouseBuilding.js` | Building fabric and services bolted to the structure |
| `viewer/warehouseProps.js` | Movable equipment, storage units, amenities and static crew |
| `viewer/warehouseMotion.js` | Everything that moves — belt, vehicles, walking staff, fans — plus the per-material merge helper |

#### Floor plan — a grid, not four dead ends

The bay is a compact **30 × 21 m** — small enough to cover on foot inside the two-minute clock,
which is the whole point of a timed perception test. Two changes got it there:

- **Scale.** The original 48 × 34 m floor was a trek. Area is down **61%**.
- **Circulation.** The original plan had four unbroken 24 m racking runs, so a trainee had at
  most two escape points per aisle and had to backtrack against the clock. Every run is now
  **split into two segments by a mid cross-aisle**, turning the floor into a **4 × 3 grid** with
  three cross-corridors. You can always loop onward.

The plan is **symmetric about x = 0** and the nine bands sum exactly to the room width, so a
trainee walking it clockwise meets the same sequence of spaces as walking it anticlockwise:

```
        z-10.5 +-- dock doors ---------------+
               |  north cross-aisle          |
        z-8.5 +----------------------------+
               |  segment A | segment A     |
         z-0  +---- mid cross-aisle ------+   <- links every aisle
               |  segment B | segment B     |
        z+8.5 +----------------------------+
               |  south cross-aisle          |
        z+10.5 +----------------------------+

  x:  -15   -12.4  -9.2   -5.4  -2.2   0   2.2   5.4   9.2  12.4   15
      2.6    |  3.2  | 3.8 |  3.4 |   4.4 ROUTE | 3.4 | 3.8 |  3.2 |  2.6
      perim     run1   aisle  run2            run3   aisle  run4      perim
```

The pedestrian route down the centre is painted as a **zebra crossing** — yellow bars running
*across* the direction of travel with bare concrete between them, white edge lines, and a painted
pedestrian pictogram partway along — and is asserted by the harness to be **completely
unobstructed**: no fixed prop, no staged hazard and no vehicle route may occupy it.

This replaced a continuous painted band, which read as a **road lane**. That was wrong twice
over: warehouses have no road markings, and a solid stripe implies vehicles may travel there.
Transverse bars say "people cross here", which is what the route actually is. Yellow is also the
real-world colour for a marked pedestrian route and separates cleanly from the orange used for
hazard props and vehicles, so a trainee reads "route" and "risk" as different things at a glance.

#### Colours that stay put

The earlier scene used a strongly tinted hemisphere light, which made the same wall read blue from
one angle and grey from another as the trainee turned — the flat-shaded surfaces looked like
coloured panels floating over the floor rather than painted into it. Three fixes:

- **Ambient-dominant, near-neutral lighting.** A white ambient at 0.92 with a barely-tinted
  hemisphere at 0.5, plus two low-intensity directionals just enough for the racking to read as
  depth. Every surface now holds its own colour from any viewing angle.
- **Fog pushed beyond the far wall** (46–150 m against a maximum sightline of ~38 m), so it never
  tints a surface.
- **`polygonOffset` on every floor marking.** Markings sit 14 mm above the slab, which is inside
  the depth buffer's precision at 34 m. Without a depth bias the paint flickered against the
  concrete as the camera moved, and a flickering decal is exactly what reads as a colour hovering
  over the floor rather than painted into it.

Column guards are **charcoal with a yellow band** — the modern standard. Painting every guard
body the same yellow as the route turned the whole floor into a yellow field and buried the one
line the trainee has to follow.

#### Real materials, not a stylised palette

Colours read as real substrates: cool concrete, galvanised steel, kraft carton, blue uprights
with orange load beams (the most common real combination), and **fluorescent yellow-green hi-vis**
— ANSI Class 2 is yellow-green, not orange, so orange stays reserved for vehicles and guards.

The **structural steel is a deliberate three-tone hierarchy** so the framework reads as
engineered rather than as one flat grey mass: primary frames (rafters, columns, ties) darkest,
secondary purlins and girts mid, roof sheeting lightest.

**Building fabric** — pitched portal-frame roof (ridge above the eaves) with purlins and
girders; profiled wall cladding with vertical ribs, horizontal girts, a translucent window band
and an impact-protection dado. Frame spacing is derived from `HALF_D`, so the last frame always
lands inside the shell.

**Services** — wall-mounted distribution boards with isolators, conduit drops and indicator
lamps; an overhead cable tray; a sprinkler main with pendant heads; hose reels, alarm call
points, emergency luminaires, an eyewash station and a first-aid point; shrouded high-bay
fixtures with wire guard cages; gable extract fans and a roof-mounted air handling unit.

**Equipment & storage** — three roller shutter dock doors with slats, frames, bumpers and dock
levellers; a **running** gravity roller conveyor; a steel access stair to a glazed mezzanine
office; a battery charging bay; a strapping station and platform weighbridge; cage pallets,
roll-cages, timber pallet collars, bulk bags, drum stacks including one on its side; wheeled
bins and stacked empty pallets; a welfare cabin with lockers, bench and notice board; a tool
station with workbench, pegboard tools, vice and PPE rack; convex intersection mirrors at the
aisle mouths.

#### The depot works

Static props are frozen at build time (they are instanced), so anything that has to move is
deliberately built as a **live group** and bypasses the batcher. Motion is entirely
waypoint-driven with wrapping phase values — deterministic, no physics cost, and it can never
snag on geometry:

- A **counterbalance forklift** with a hi-vis driver and a pallet on the forks drives a fixed
  circuit through the west aisles.
- A **hand pallet truck** runs a loop in the south dispatch bay.
- **Belt rollers translate and wrap**, with cartons riding the belt.
- **Four walking staff** patrol the aisles, bobbing as they go, plus nine static crew in
  varied poses (standing, pointing, crouching, pushing, and one at height on a step ladder).
- **Extract fan blades** rotate, and the amber/green **status lamps blink out of phase** so the
  bay reads as live rather than diorama.

Vehicle patrol routes are asserted to stay on the aisle floor and to **never cross the painted
walkway** — a truck parked on the pedestrian route is both an obstruction and a training
contradiction.

#### Look-at inspection

The reticle is a live probe. Ten times a second a ray is cast from the centre of the viewport
against a set of **invisible pick-boxes that live outside the scene graph**, so it never touches
the ~2,800 instanced props. Whatever the reticle is on gets a reusable orange outline box and a
labelled readout under the crosshair ("BATTERY CHARGING BAY — 415V, earth the truck"). Moving
vehicles re-stamp their own proxy each frame, so their labels follow them around the floor.

Movement is validated against room bounds, racking, the office and the welfare cabin, so the
trainee cannot walk through walls, racks or solid structures. Walk speed is **4.6 m/s**, tuned
so a full circuit of the bay is comfortably coverable inside the clock without feeling twitchy.

**Divergence from the reference.** Same class of building, but a different building: a
30 × 21 m grid plan rather than four long runs, a zebra-crossing route rather than a painted band,
near-black painted portal frames and columns, yellow spill-containment bunds under every drum, a
different prop and signage mix, and a different dock-door count and spacing.

#### What was animated, and what deliberately is not

Movement is only kept where it reads as machinery or people at a glance. Three animations were
removed because they read as artefacts rather than as simulation:

- **Status lamps no longer blink.** The amber and green charging-bay indicators used to pulse on
  a sine wave. A real indicator lamp sits steady unless it is annunciating a fault, and a lamp
  that blinks for decoration looks like an alarm the trainee is supposed to react to — which is a
  distraction on a screen whose entire subject is reacting to hazards.
- **Walking staff do not bob or rock.** A figure whose whole body rises and falls by 3 cm while
  also pitching 1° reads as being on a spring. At the distance a trainee actually sees background
  crew from, the bob reads as a glitch and made them compete with the hazards. Steady translation
  reads correctly as "someone is crossing the floor".
- **Conveyor rollers translate, they do not spin.** The rollers are cylinders lying across the
  belt, so their own rotation is barely perceptible at walking pace; spinning them at 6 rad/s read
  as a machine gun. Moving the roller line together with the cartons riding on it is enough.

Fan blades, the belt, the forklift and the hand pallet truck all still move — they are large,
mechanical, and moving is what identifies them.

### 7.3a Stopping or Backing Out of a Session

A trainee is never trapped in a run they need to leave. Three routes out, all equivalent:

| Control | Where | Effect |
| :--- | :--- | :--- |
| **Cancel session** | Session bar, and the inspection header (reachable in fullscreen / pointer-lock) | Discards the attempt. Timer stops, findings cleared, nothing graded or recorded. |
| **Esc** | Anywhere in the inspection | Opens the same cancel confirmation. |
| **Back** | Quiz header | Discards an unsubmitted attempt and returns to the dashboard. |

Both `Cancel session` and `Finish early` sit **side by side** in the session bar rather than
nested behind one another, so the difference is obvious: *Finish early* submits what you have
found (anything still hidden counts as missed), while *Cancel session* throws the attempt away.
A confirmation dialog always precedes a destructive choice, and it names the consequence —
including that an official attempt will **not** be recorded.

### 7.3b Analytics — Derived, Not Restated

Most dashboards show the same counts in different boxes. These show figures that answer
"what should I do next?". Everything is computed server-side from the **same record set** as the
category breakdown (`getAnalyticsSummary`), so the two views cannot drift apart, and every
division is guarded — an empty deployment returns zeroes, never `NaN`.

| Figure | What it tells you |
| :--- | :--- |
| **Detection precision** | Of everything clicked, how much was a real hazard. Reported with false clicks and misses, since all three share one root cause: clicking without looking. |
| **Median / slowest-10% / fastest completion time** | Median rather than mean, because timings are skewed; the 90th percentile shows who is at risk of running out of clock. |
| **Cohort direction** | Recent half of attempts against the earlier half, with the delta in points. A single strong session can flatter a mean but cannot reverse a direction. |
| **Priority training gap** | The single most-missed category, called out by name with its miss rate — the highest-value thing to put in the next toolbox talk. |
| **7-day activity** | Sessions per day with the daily average score, so "quiet Monday" and "twenty sessions" are distinguishable at a glance. |
| **Spotted vs missed volume** | The raw counts behind each miss rate, showing whether a problem is broad or narrow. |
| **Practice vs official split** | If most volume is practice, the compliance pass rate is not yet a meaningful figure — worth saying out loud. |

Trainees get the same treatment on their own dashboard: their last five results with the score
trend charted, their average time and average hazards found, and a plain-language note when their
false-click average is costing them accuracy.

### 7.3c Palette Discipline — No Green, No Red

The product is hazard orange on white and ink. There is **no green and no red anywhere in the
frontend**, and compliance state is expressed by **visual weight** rather than by adding a hue:

| Token | Treatment | Means |
| :--- | :--- | :--- |
| `pass` | Filled orange tint | Completed, compliant, spotted |
| `caution` | Orange outline only, lighter weight | Attention needed, not yet a problem |
| `stop` | Solid ink fill — the heaviest weight in the system | Failed, below threshold, destructive |

`primary` stays reserved for the brand and the single most important action on a screen. Every
component resolves state through `app-chip-*` / `app-alert-*` / `app-meter-fill-*` or a `tone`
prop on the shared UI kit — never a raw colour class. The palette audit returns zero off-palette
classes across all frontend source files.

Icon usage was reduced to only what carries meaning: tab navigation is labelled rather than
icon-led (an icon beside every tab label competes with the text), empty-state glyphs that merely
restated the heading were removed, and unused imports were stripped.

#### Typography

The font stack leads with **`system-ui`**, not `Inter`. Naming a webfont first only works if it is
actually loaded, and the app ships no font request — so `Inter` was silently falling through to the
next name on every device, meaning the app rendered in a different face depending on what the OS
happened to have installed. Leading with `system-ui` uses the reader's own UI face (SF on Apple,
Segoe UI on Windows, Roboto on Android): the widest-reach sans available, already cached, already
rasterised fast by the platform, and zero network cost. Real monospace families follow
`ui-monospace`, with the `monospace` keyword last so a digit can never fall back to a proportional
face and break column alignment.

| Role | Size | Notes |
| :--- | :--- | :--- |
| Uppercase label | 10px | `app-eyebrow`, wide tracking |
| Body | 12px | `app-body` |
| Section heading | 14px | `app-section-title` |
| Card title | 16px | `app-title` |
| Page title | 22 → 24px | `app-display`, responsive step |
| Figure | 26px | `app-stat-value` — monospace, tabular |

`.app-display` declares its responsive size in an explicit `@media` block rather than composing
`sm:text-2xl`, because `@apply` emits the responsive utility as a *second*, lower-specificity
`.app-display` rule that competes with the `dark:` colour declared in the same block.

#### Alerts — why they read as "red" despite containing no red

The palette audit returned zero red and zero green, yet the alerts still looked like error boxes.
The cause was two colours that only *read* as error states:

- A **heavy near-black bar** down the left edge of `app-alert-stop`. A solid dark rule beside body
  copy is the universal visual grammar for "something failed", so it communicated failure far more
  loudly than the copy did.
- A **pink-orange `primary-200` border** (`#FFC7AB`) on the brand and pass alerts — a salmon that
  reads as pink at 1px.

All four states now sit on the same warm off-white ground and are separated only by an accent rule
and a border treatment:

| State | Treatment |
| :--- | :--- |
| `app-alert-brand` | Neutral surface, solid orange rule |
| `app-alert-pass` | Stronger border, solid orange rule |
| `app-alert-caution` | **Dashed** orange rule — advisory, not terminal |
| `app-alert-stop` | Only 2px full border; severity stated in the copy |

The dashed rule is what makes `caution` read as "attend to this" rather than "this is broken".

#### Floating navbar

One bar, two states, driven by a single rAF-throttled scroll listener (throttled because `scroll`
fires far faster than the paint rate, and a state flip per event re-renders every frame):

| State | Treatment |
| :--- | :--- |
| At top | Edge to edge, transparent, square corners, no shadow |
| Scrolled | Inset 12–20px, `rgba(255,255,255,0.92)`, `blur(12px) saturate(1.5)`, 12px radius, two-layer shadow, visible hairline |

Translucency is restrained on purpose. At `bg-white/80` over the warm canvas there was almost no
value separation, so the bar dissolved into the page and the shadow was doing all the work; 92%
opacity plus a visible hairline makes it read as a distinct object sitting above the content.

These states are written as **plain CSS, not `@apply`**, because Tailwind silently drops a
responsive variant inside `@apply` — `sm:inset-x-4` was applying at every viewport width. The media
query has to be explicit, and the reason is commented in place.

#### Brand colour on the dashboards

Orange is added through the shared `PageHeader`, so all three dashboards pick it up from one place
rather than each inventing its own treatment. It is confined to three spots: the eyebrow, a short
rule beside it, and a **3px brand bar down the leading edge** of the header. Tinting the whole header
would turn a dashboard into a poster and drown the figures the page exists to show.

All three dashboards now open with the same `PageHeader`, so their indent and vertical rhythm match
exactly. The supervisor dashboard previously hand-rolled its own toolbar *and* carried a second
`PageHeader` inside its overview tab — which doubled the heading once the real header moved to the
top of the page. That inner header is now a compact score band holding only the figure it exists to
show.

#### Surface levels, and why the dashboards used to look white

Light mode read as a flat white page because **the canvas and the cards were the same colour**.
A card only reads as a card if something sits behind it. The fix is hierarchy, not decoration:

| Level | Light | Dark | Used for |
| :--- | :--- | :--- | :--- |
| Canvas | `#F1F0EC` — warm off-white | `dark.bg` | The page |
| Card | `#FFFFFF` | `dark.card` | Raised panels, stat tiles |
| Quiet | `mist.50` | `dark.surface` | A surface nested inside a card |
| Plot well | `mist.50` | `dark.surface` | Charts — **recessed**, not raised, so data sits *in* the panel |
| Hero band | `primary.50/70` | `dark.surface` | Page headers only, never a card |

The warm hero band is the single tinted surface in the product, and it is used once per screen at
most. Stat tiles inside a card use hairline `divide` separators instead of their own borders, so a
row of figures does not put a card inside a card.

#### Type ramp and alignment

One ramp, enforced in `index.css`, so cards cannot each pick their own size:

| Role | Size | Notes |
| :--- | :--- | :--- |
| Uppercase label | 10px | `app-eyebrow`, wide tracking |
| Figure | 26px | `app-stat-value` — monospace, tabular, tight tracking |
| Section heading | 14px | `app-section-title` |
| Card title | 16px | `app-title` |
| Body | 12px | `app-body` |

All figures use `app-num` (monospace + `tabular-nums`), so a column of numbers aligns on the
decimal instead of jittering as values change. Stat tiles read **label → figure → sub-label**,
left-aligned, which matches the card content beneath them; the earlier value-first centred
arrangement read as a table of contents rather than as figures.

### 7.3d Charts

`ColumnChart` and `TrendChart` are separate components because the data shapes are genuinely
different, and using the wrong one hides the information:

- **`TrendChart`** — inline SVG line for a *continuous* series, where the movement between points
  is the point. A light area fill sits behind the line, the last point is enlarged so "where I am
  now" is unambiguous, and an optional dashed **reference line** marks the 75% pass threshold so
  every reading is judged against the standard rather than the axis.
- **`ColumnChart`** — columns for *independent* counts (sessions per day), where each bucket stands
  alone.

Two real bugs were found and fixed by rendering both themes rather than reasoning about them:

1. **Columns rendered as nothing.** The per-column wrapper had no explicit height, so the child's
   percentage height resolved against `auto` and collapsed to zero. Fixed with `h-full` on the
   wrapper; the reason is commented in place so it is not "tidied" back out.
2. **The dark trend fill was a brown block.** One gradient tuned for a light canvas becomes opaque
   on a dark one, swamping the line drawn on top of it. Fixed with a per-theme gradient pair plus
   CSS-variable-driven line, dot and reference colours, since Tailwind cannot switch an SVG
   `stop-color` from an ancestor class.

### 7.4 In-World HUD & Corrections Sheet

- An in-world LED-style readout mirrors the reference: **`Errors n/5`** and
  **`Time left m:ss`**, with a depletion bar that shifts to the heavy `stop` treatment and
  pulses under 15 seconds.
- The results screen presents a **Corrections Sheet** — the error count up front, then
  every missed risk numbered with the *required procedure*, before the risks that were
  spotted. This matches the reference's "review the procedures for any errors that have
  gone unnoticed".

### 7.5 Performance & Verification

The walkthrough targets a smooth frame rate on mid-range phones:

- Repeated static props are batched into `THREE.InstancedMesh`. **~2,800 instances collapse
  into 71 draw calls** from 50 shared materials; with the live systems the scene renders in
  **129 draw calls** total and ~62k triangles.
- That budget is asserted in **two parts**, because the warehouse is now a live scene rather
  than a still:
  - **Static geometry must stay batched under 70 draw calls.** This is the invariant that
    actually regresses if someone drops an `absorb`/`stage` call, so it is asserted tightly.
  - **Animated systems get a separate allowance to 130.** Belt rollers, fan blades, vehicles and
    walking staff cannot be instanced without freezing their transforms, so every rigid body is
    first **merged per material** (`bakeByMaterial`) — a 30-mesh forklift becomes 5 draw calls
    with an identical silhouette, and a walking operative becomes 4.
- Near-identical colours are deliberately **aliased to the same material instance**
  (`steelMid`, `girt`, `purlin`, `tray`, `conduit` are one material) rather than given their
  own — this is what holds the draw-call count down despite several hundred props.
- ~68k triangles, no shadow maps, no post-processing, texture-free materials,
  `devicePixelRatio` capped at 1.25 (touch) / 1.6 (desktop), FOV widened to 82° in portrait.
- Roof lights use an opaque **emissive** material rather than a transparent one: seen through a
  pitched roof they read identically, and being opaque they batch with the rest of the roof.
- Full disposal of geometries, materials, the renderer and its canvas on unmount.
- Transparent surfaces are excluded from instancing so they still depth-sort correctly.
- Three.js **and** the walkthrough component are code-split, so 360°-only trainees
  never download the 3D scene.
- If WebGL cannot initialise, the component degrades gracefully and directs the trainee
  to Standard 360° mode rather than failing the session.

Three headless harnesses guard these claims (no test runner required):

```bash
cd frontend && node verify-scene.mjs                      # 33 scene/collision/perf/disposal checks
cd frontend && node verify-palette.mjs                    # scene palette guard (no stray green/red)
cd backend  && node src/utils/testWalkthroughLayout.js     # 8 layout/randomisation checks
```

Beyond draw calls, the scene harness asserts the properties that are easy to break and hard to
see: that **nothing is authored outside the room shell**, that the painted walkway is
**unobstructed for its whole length**, that **vehicle routes never drive the walkway or clip a
solid**, that all **17 server hazard anchors** are still on walkable floor, and that the spawn
point is inside bounds, clear of geometry and at human eye height. So adding a machine, cabin,
wall or route can never silently block the walkway or a hazard staging position.

The shell check runs with a **0.4 m tolerance** — the wall thickness plus a small margin. It was
1.6 m, which was wide enough to hide the problem it exists to catch: resizing the room left ~95
pieces of scenery stranded outside the walls, and a tolerance that loose called the result clean.
Tightening it surfaced three genuine placement bugs — the battery-charging bay offset from its
own wall by the depth it was modelled at, the welfare cabin's locker bank running out through the
building, and its bench landing behind the lockers instead of in front.

The palette guard encodes the one carve-out explicitly. Fire-protection red (sprinkler main,
heads, extinguishers, hose reels) and green signage (exit running-man, eyewash, healthy-charge
lamps) are **required** by safety convention — recolouring them would teach a trainee the wrong
thing — so they are listed as allowed with a reason rather than left to memory. Everything else
must be orange, amber, kraft, blue, grey or neutral. The test is **hue-based**, because two
channel-gap versions of it were wrong in both directions: one waved the original green drum
(`#2f6f4e`, hue 149°) through as "nearly grey", and another flagged every orange in the project,
since orange is the brand colour.

The layout harness asserts more than determinism: that **all five hazard families are staged on
every single run** (600 runs), that **all ten prop variants** appear with two per family, and that
the anchors rotate without one free anchor dominating. `fire-exit-approach` is excluded from the
concentration check because it is *reserved* — a blocked exit must always be staged in front of
the exit or the depiction stops making sense.

- Each compliance record stores a `trainingMode` field (`panorama360` / `walkthrough`)
  and the layout seed; both appear in the CSV audit export.

---

## 8. Results & Analytics

The diagnostic results screen shows overall score, pass/fail against the 75% threshold, detection rate, false-click penalty, time taken, quiz performance, a **corrections sheet** (error count first, then the numbered required procedure for every missed risk), and a training recommendation. Supervisor/Admin retain CSV export, team KPIs, per-trainee audit detail, and hazard-category risk analytics.

### 8.1 Interface Design System

The UI is built from a single component layer rather than ad-hoc Tailwind strings, because long one-off class lists are what make an interface look machine-generated — they drift apart one screen at a time.

**Palette** (`frontend/tailwind.config.js`)

| Token | Role |
| :--- | :--- |
| `mist.0`–`mist.950` | Every neutral: surfaces, borders, body and muted text |
| `primary` (hazard orange) | Brand identity and the **single primary action per screen** |
| `ok` | One restrained green — pass / certified / spotted |
| `warn` | One amber — practice mode, pending state |
| `bad` | One brick red — fail / missed / destructive action |

Orange is deliberately rationed: if everything is orange, the one thing that matters is invisible. Pass and fail stay distinguishable because this is compliance tooling, but they are expressed through three defined semantic tokens rather than the dozen arbitrary shades (`emerald-300/400/500/600/50/900/950`, `red-500/600/900/…`) the codebase previously scattered.

**Component layer** (`frontend/src/index.css`) — every screen resolves to these:

`app-page` `app-stack` · `app-card` `app-card-quiet` `app-band` `app-card-head` `app-divider` ·
`app-title` `app-section-title` `app-eyebrow` `app-eyebrow-accent` `app-label` `app-body` `app-num` ·
`app-btn` + `app-btn-primary` / `-secondary` / `-ghost` / `-danger`, `app-btn-sm`, `app-icon-btn`, `app-icon-well` ·
`app-input` · `app-seg` + `app-seg-item` + `app-seg-item-active` ·
`app-chip` + `app-chip-ok` / `-warn` / `-bad` / `-neutral` / `-brand` ·
`app-stat` `app-stat-value` `app-stat-label` `app-stat-sub` ·
`app-table-wrap` `app-table` `app-th` `app-td` ·
`app-alert` + `app-alert-brand` / `-ok` / `-warn` / `-bad` ·
`app-meter` `app-meter-fill` `app-meter-fill-ok` `app-meter-fill-bad` · `app-kbd` `app-spinner` `app-link`

**Radius scale** — one value per role, not per screen: panels `rounded-panel`, controls `rounded-control`, pills `rounded-full`.

**Shared primitives** (`frontend/src/components/ui/index.jsx`) — `PageHeader`, `StatTile`, `BarList`, `EmptyState`, `SectionCard`. These replaced four separate local helper components that had drifted apart in each dashboard.

**Shared chrome** — `AppShell` renders the navbar and footer for **all three roles**. Supervisor and Admin dashboards previously each shipped their own header, theme toggle, sound toggle, logout button and logout modal; those are gone, so the chrome is now provably identical across roles.

Also fixed along the way: six animation classes (`animate-fade-in`, `animate-slide-up`, `animate-slide-down`, `hotspot-pulse`, `ripple-error`, `unfound-marker`) were referenced throughout the app but **never defined in CSS**, so they were silent no-ops.

---

## 8.2 Standard 360° Mode — Fairness Fix

The previous 360° viewer drew a **dashed orange reticle at every unfound hotspot**. That marked the answer on screen: a trainee could clear the scenario by clicking five circles without perceiving a single hazard.

- **Unfound hazards now render nothing.** Only a confirmed find is marked, as positive reinforcement.
- The **hit radius is clamped to 5°**, so a hazard must actually be located and aimed at rather than clicked somewhere in the right third of the panorama. The scenario value remains the authority.
- The *calibration* guide keeps its visible marker — it is an explicit teaching aid, not a hazard.

Generated files in `frontend/dist/`, dependency folders, logs, local database files, and environment files are excluded by the root `.gitignore`.

---

## 3. Seeded Demo Login Credentials

The prototype comes pre-seeded with sample accounts for all three required roles:

| Role | Username | Password | Full Name & Department | Demo Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Employee (Trainee)** | `trainee1` | `SafetyPass123!` | Alex Morgan (Inbound Logistics Bay 4) | Has `hasCompletedOnboarding: false` to demonstrate the first-time onboarding modal. |
| **Employee (Trainee)** | `trainee2` | `SafetyPass123!` | Jordan Lee (Quality & Packaging) | Pre-seeded with a 97% passing record on the supervisor dashboard. |
| **Supervisor** | `supervisor1` | `SuperVisor2026!` | Eleanor Vance (HSE Lead) | Access to Team Compliance Dashboard, CSV Export, and Account Creation. |
| **Admin** | `admin1` | `AdminMaster2026!` | Marcus Sterling (Enterprise SysAdmin) | System Admin overview and scenario management. |

> **Live Demo Tip:** On the login page, click any of the **"Demo 1-Click Fill"** buttons to automatically fill credentials without manual typing.

---

## 4. Operational Walkthrough of Key Features

### Trainee Flow (FR-01 to FR-09, FR-13)
1. **Role Login:** Select **Employee** and log in as `trainee1`.
2. **First-Time Onboarding Overlay:** An interactive 4-slide guide introduces 360 navigation, the 5 target hazards, scoring rules, and the quiz. Click **"Start Bay 4 Inspection"** (marks onboarding as complete).
3. **Navigable 360° Scene:** Drag mouse or touch to look 360° around Bay 4.
4. **5 Clickable Hazards:**
   - **Hazard 1:** Chemical Fluid / Hydraulic Oil Spill (`pitch: -25, yaw: -15`)
   - **Hazard 2:** Unstable Leaning Pallet Stack (`pitch: -3, yaw: 40`)
   - **Hazard 3:** Blocked Emergency Fire Exit (`pitch: 2, yaw: 118`)
   - **Hazard 4:** Exposed Trailing 415V Industrial Cable (`pitch: -33, yaw: 80`)
   - **Hazard 5:** Forklift Blind Intersection (`pitch: -2, yaw: -138`)
5. **Real-time Feedback:**
   - Correct hazard click: Green reticle, confirmation chime, score added.
   - Non-hazard false click: Red ripple, warning buzz, -5% accuracy deduction.
6. **Countdown Timer:** 90-second visible countdown with urgency indicators.
7. **Post-Inspection Knowledge Quiz (FR-07):** 4 multiple choice questions testing UK HSE/COSHH regulations.
8. **Diagnostic Summary (FR-08):** Displays overall Pass/Fail badge (75% threshold), detection rate, penalty deductions, time elapsed, and itemized hazard mitigations.
9. **Practice Mode Retry (FR-13):** Click "Retry in Practice Mode" to replay without altering the official compliance audit.

### Supervisor Flow (FR-11, FR-12)
1. Log in as `supervisor1`.
2. **Team Compliance KPIs:** View total trainees, team pass rate %, average score, and pending audits.
3. **Trainee Records Table:** Real-time pass/fail status, attempt history, and scores.
4. **CSV Compliance Export (FR-12):** Click **"Export CSV Audit"** to generate an official RFC 4180 CSV compliance log.
5. **Issue Staff Credentials (FR-11):** Click **"Issue Credentials"** to add new employees without public self-registration.

---

## 5. Security & Tamper-Resistance Architecture (NFR-05 & NFR-06)

*This section addresses the requirements for the course security and integrity report:*

### What Was Implemented:
1. **Server-Side Authoritative Scoring (NFR-05):**
   - The browser never computes or transmits the final `passed: true` or `totalScore: 100` payload.
   - The trainee client only transmits the raw array of found hotspot IDs, false click count, time elapsed, and quiz option indices.
   - The backend controller loads the canonical `Scenario` document from MongoDB, calculates the score server-side, validates the quiz answers against encrypted indices, and stores the verified record.
2. **Quiz Answer Masking (Tamper Resistance):**
   - When serving `/api/scenarios/active` to the trainee, `correctIndex` and `explanation` are deliberately stripped from the response payload to prevent trainees from inspecting browser dev tools (Network tab) to cheat on the quiz.
3. **Role-Based Access Control (RBAC) (NFR-06):**
   - JWT tokens encode the user's validated MongoDB `_id` and role.
   - The Express middleware `requireRole('supervisor', 'admin')` protects management endpoints (`/api/compliance/team`, `/api/compliance/export-csv`, `/api/compliance/users`).
   - If a trainee attempts to forge an HTTP request to the supervisor routes, the server returns `HTTP 403 Forbidden`.
4. **Data Isolation:**
   - Trainees can only fetch their own historical attempts (`/api/compliance/my-history`), preventing cross-trainee data leakage.
5. **Randomized Hazard Staging Without Leaking Credit (NFR-05):**
   - Hazard positions are re-randomized server-side on every scenario load so the walkthrough cannot be memorised between attempts.
   - The layout engine (`backend/src/utils/walkthroughLayout.js`) is deliberately *decoupled from grading*: it only assigns a position, rotation and visual variant to each prop. It carries no notion of a correct or incorrect click.
   - Scoring still resolves solely against the canonical `Scenario.hotspots` documents, so a client cannot submit a fabricated layout to earn credit for hazards it never found.
   - The submitted `walkthroughLayoutSeed` is sanitised server-side (finite non-negative integer) and stored purely for audit reproducibility.

### Recommendations for Production Enterprise Rollout:
- Enforce HTTPS and `HttpOnly` Secure cookies instead of `localStorage` for JWT storage to eliminate XSS token theft vectors.
- Implement server-side session nonces and client heartbeat timestamps to mathematically prove the trainee spent the claimed duration inside the 360 viewer.
- Add rate limiting (`express-rate-limit`) on submission endpoints to prevent automated replay attacks.

---

## 6. Graded Checklist Verification

- [x] **FR-01 / NFR-03:** Navigable 360° warehouse scene in browser with **strictly no VR headset required**. Walkthrough mode adds a first-person 3D scene with **touch, mouse and keyboard input**, so it is usable on phones, tablets and desktops alike.
- [x] **FR-02:** **5 interactive hazards** placed over realistic warehouse hazards.
- [x] **FR-03:** Visible **90s countdown timer** with urgency audio/visual cues.
- [x] **FR-04 & FR-05:** Audio and visual feedback for correct hazard spotting and false-click penalties.
- [x] **FR-06:** Automatic end on timer expiry or all hazards discovered.
- [x] **FR-07:** Mandatory **4-question multiple-choice safety quiz**.
- [x] **FR-08:** Diagnostic summary with Pass/Fail determination against the **75% threshold**.
- [x] **FR-09:** Every session stored as a MongoDB `ComplianceRecord`.
- [x] **FR-10 & FR-11:** 3 roles supported via single login with role selector; **no public self-registration**.
- [x] **FR-12:** Supervisor dashboard with **CSV compliance report export**.
- [x] **FR-13:** **"Retry in Practice Mode"** explicitly isolated from official compliance history.
