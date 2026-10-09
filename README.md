# Hazard Hunt — 360° Warehouse Hazard Perception Trainer

> **Course Assignment:** CET257 Enterprise Project — University of Sunderland
> **Group:** Macro Thinkers
> **Client:** Automotive Logistics & Warehousing Company

An interactive 360° hazard perception trainer. A trainee is placed inside a warehouse bay, given
90 seconds to find every hazard hidden in the environment, then answers a regulatory quiz and
receives a scored compliance record.

## Project Team

| Name | Responsibility |
| :--- | :--- |
| **Himanshu Bhusal** | Project Management & Documentation |
| **Aadarsh K.C.** | Front-end & Interaction Design |
| **Prabin Upadhayay** | Back-end Engineering & Quality Assurance |
| **Shishir Pandey** | Presentation & Client Relations |

---

## 1. Technology Stack

| Layer | Choice | Why |
| :--- | :--- | :--- |
| 360° environment | **Pannellum** | Purpose-built for panoramas, runs in any browser, no headset needed |
| 3D walkthrough | **Three.js** | Fully procedural geometry, so there are no model or texture downloads |
| Front end | **React 18** + **Vite** | Fast builds, small client footprint |
| Styling | **Tailwind CSS** | Hazard-orange brand tokens defined in `tailwind.config.js` |
| Back end | **Node.js** + **Express** | REST API, role-based middleware |
| Database | **MongoDB** + **Mongoose** | Document store for scenarios, users and compliance records |
| Reports | **jsPDF** | Generates the score report PDF client-side |
| Icons | **lucide-react** | Consistent icon set |
| Audio | **Web Audio API** | Tones are synthesised at runtime, so there are no audio files |

Brand colour: hazard orange `#FF6115`. There is deliberately **no green and no red** anywhere in
the product; compliance states are shown by visual weight, not by adding a second hue.

---

## 2. Quick Start

### Prerequisites

- Node.js 18 or newer
- npm

### Install and run

```bash
npm run install:all     # installs backend and frontend

npm run dev:backend     # API on http://localhost:5001
npm run dev:frontend    # app on http://localhost:5173
```

Open `http://localhost:5173` and sign in with a seeded account (section 8).

The backend falls back to an embedded in-memory MongoDB when `MONGODB_URI` is unset, so the app
runs with no database setup at all. That fallback is **development only** — see section 5.

### Production build

```bash
npm run build:frontend
```

---

## 3. Environment Variables

The real `.env` files are git-ignored; `.env.example` files are committed as templates.

### Backend — `backend/.env`

| Variable | Purpose |
| :--- | :--- |
| `MONGODB_URI` | MongoDB connection string. **Required in production.** |
| `JWT_SECRET` | Signs login tokens. Must be private and unique per environment. |
| `JWT_EXPIRES_IN` | Token lifetime. Defaults to `8h`. |
| `CLIENT_ORIGIN` | Comma-separated CORS allowlist of browser origins. |
| `SCENARIO_CODE` | Which scenario to serve. Defaults to `WH-BAY-04`. |
| `PORT` | Listen port. Render overrides this. |
| `NODE_ENV` | Set to `production` to enable strict database behaviour. |

The variable name matters: the code reads `MONGODB_URI`. With the wrong name the server silently
starts on the in-memory fallback and loses all user data on restart.

### Frontend — `frontend/.env`

| Variable | Purpose |
| :--- | :--- |
| `VITE_API_URL` | Full base URL of the deployed API, **including `/api`**. Baked in at build time. |

Leave it unset in development: Vite then proxies `/api` to `http://localhost:5001`, so there are no
cross-origin requests at all. This does not affect deployment — Vercel injects its own value from
the project dashboard, independently of any local file.

---

## 4. Deployment

The backend runs on **Render**, the frontend on **Vercel**. Deploy the API first, because Vercel
needs its URL to build the frontend bundle.

```
Vercel  ──builds──>  static bundle  ──calls──>  Render  ──queries──>  MongoDB Atlas
```

### 4.1 Database — MongoDB Atlas

1. Create a free **M0** cluster.
2. Create a database user with a generated password.
3. Under Network Access, allow `0.0.0.0/0`. Render's free tier has no fixed outbound address.
4. Copy the SRV connection string and insert the username and password.

### 4.2 API — Render

| Setting | Value |
| :--- | :--- |
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm install --omit=dev` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |
| Instance Type | Free |

Environment variables: `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `NODE_ENV=production`, and
`CLIENT_ORIGIN` set to your Vercel URL.

`--omit=dev` skips `mongodb-memory-server`, a development-only dependency whose install script
downloads a full MongoDB binary that production never uses.

Confirm the service with `https://<your-service>.onrender.com/api/health`, which should return
`{"status":"online"}`.

> **Free tier:** the service sleeps after roughly 15 minutes idle and takes 30–60 seconds to wake.
> That is expected, not a fault. Data lives in Atlas, so nothing is lost while it sleeps.

### 4.3 Frontend — Vercel

| Setting | Value |
| :--- | :--- |
| Root Directory | `frontend` |
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Set `VITE_API_URL=https://<your-service>.onrender.com/api` for **both** Production and Preview.
The `/api` suffix is required.

### 4.4 Connect the two

Set `CLIENT_ORIGIN` on Render to your Vercel URL and save. Without it the browser calls are
refused and the page fails with a CORS error. Preview deployments each need their own URL added.

---

## 5. Database Behaviour

`MONGODB_URI` missing or unreachable does **not** fall back to the in-memory database when
`NODE_ENV=production` — the server refuses to boot.

This matters because the in-memory store is destroyed on every restart. A Render cold start or any
redeploy would otherwise wipe every user, compliance record and attempt score, then silently
recreate only the demo accounts.

In development the fallback still works, so the project runs with no database setup.

---

## 6. Training Modes

### 6.1 360° environment

An equirectangular workshop panorama, served from `frontend/public/panoramas/`. The trainee clicks
each hazard to identify it. Correct finds are confirmed with sound, an in-world flash, a toast and a
permanent chip; a click on safe space registers a false activation. A marker is only drawn once a
hazard has actually been found, so an unfound hazard gives away no position on screen.

The panorama carries its own set of five hazards in `Scenario.panoramaSpots`, separate from the
`hotspots` array the walkthrough uses. Both sets share the same five IDs, so grading resolves
identically whichever environment produced the attempt, while each depiction keeps the coordinates
and wording that match its own scene. Pannellum clamps every hit to a 5° radius, and the five
panorama spots are at least 59° apart, so no hazard can be shadowed by another.

The asset is CC0 from [Poly Haven](https://polyhaven.com) and is optimised to 4096 × 2048.

### 6.2 Starting a session

A session begins in three steps rather than one. Choosing a mode loads the environment and shows a
ready panel with the controls for that specific mode; the countdown only begins when the trainee
presses **Start**, so reading the controls does not consume their time. The ready panel can be
dismissed without penalty, and the instructions overlay closes the same way.

The environment is already mounted behind the ready panel, so pressing Start begins the hunt with no
loading time left.

### 6.3 3D warehouse walkthrough

A first-person walk around a 26 × 18 m bay built procedurally in Three.js. Controls are mouse,
keyboard and touch. If WebGL is unavailable the trainee is redirected to the 360° mode rather than
failing the session.

The bay is divided into five named zones rather than four identical rack runs: a chemical store, two
racking runs, an electrical switchroom, and a dispatch and packing apron.

### 6.4 Randomized hazard staging

Hazards are **re-staged server-side for every attempt**. The same five hazard families appear, but
placement, rotation and prop variant are drawn from a server-held seed. Trainees cannot memorise
answers, and a supervisor can regenerate the exact staging a trainee saw and audit it.

### 6.5 Feedback and penalties

| Event | Response |
| :--- | :--- |
| Hazard identified | Rising two-note chime, in-world confirmation, toast, chip added, counter increments |
| False click | Falling buzz, in-world rejection, toast, 5 percentage points deducted |
| Timer under 15 seconds | Countdown bar pulses |

All tones are synthesised with the Web Audio API, so the app ships no audio files. The whole engine
can be muted from the navbar.

### 6.6 Scoring

| Component | Weight | Basis |
| :--- | :--- | :--- |
| Hazard perception | 60% | Hazards found, minus 5 points per false click |
| Quiz knowledge | 40% | Quiz questions answered correctly |
| **Composite** | **100%** | Weighted sum, against a **75%** pass threshold |

Scoring is computed server-side from the stored attempt, so the client cannot influence the result.

### 6.7 Quiz

Four multiple-choice questions with four options each, covering COSHH spill response, damaged
pallets, fire exit obstruction, and forklift exclusion distance. Each carries an explanation shown
after submission.

The quiz is **mandatory**: the submit button stays disabled until every question has an answer. The
enabling condition is that the answered count equals the question count, so a trainee cannot scroll
past a question and still submit.

### 6.8 Results

A diagnostic summary shows the pass or fail verdict, hazards found and missed, false-click
penalties, time taken, and the required corrective action for every missed hazard.

A one-page A4 **score report PDF** can also be generated, with a reference number and the layout seed
recorded so a supervisor can reproduce the exact staging.

### 6.9 Roles

| Role | Can do |
| :--- | :--- |
| Trainee | Complete training, view own history, retry in practice mode |
| HSE Supervisor | Issue trainee credentials, view team compliance, export CSV audit, inspect a trainee's full history |
| System Admin | Everything a supervisor can, plus provisioning supervisors, deleting accounts, and the full analytics view |

Practice mode is explicitly isolated from the official compliance history. There is no public
self-registration; every account is issued by a supervisor or an administrator.

---

## 7. Interface Design

The dashboards share one system across all three roles, so nothing looks different by permission. The
**HAZARDHUNT** wordmark in the navbar is a link to the dashboard: it scrolls the page back to the top
when already there, and refuses to navigate away while a timed session is running, so an in-progress
attempt is never discarded silently.

- **Three surfaces only** — page, card, nested surface. Every other surface is a border or a tint.
- **One banner** across all dashboards: hazard orange `#FF6115` with white type in both light and
  dark mode, so the brand does not change with the theme.
- **No green, no red.** Compliance is shown by fill weight, outline weight and ink, never hue.
- **Alerts** differ by their left rule and border treatment. In dark mode each alert sits on its own
  warm near-black ground so it never merges into the surface behind it.
- **Responsive:** dashboard tabs fit a 2 × 2 block on a phone and return to a single row from 640px.
  Provision forms stack one field per row on a phone and use two columns on wider screens.
- **Fullscreen** falls back to an immersive mode on devices without the API, such as iPhone Safari.
- **Known accessibility limit:** the banner's small text measures 3.01:1 against a 4.5:1
  requirement. The brand orange sits near mid-luminance, where no text colour reaches 4.5:1. The
  large title clears the 3:1 large-text threshold.

---

## 8. Seeded Demo Credentials

| Role | Username | Password |
| :--- | :--- | :--- |
| Trainee | `trainee1` | `SafetyPass123!` |
| Trainee | `trainee2` | `SafetyPass123!` |
| Supervisor | `supervisor1` | `SuperVisor2026!` |
| Administrator | `admin1` | `AdminMaster2026!` |

---

## 9. Requirements Traceability

### The three required ingredients

The briefing requires all three; a project missing any one is not finished.

| Ingredient | Delivered as |
| :--- | :--- |
| 360° / VR environment | `PanoramaViewer` (Pannellum) and `WalkthroughViewer` (Three.js), in-browser with no headset |
| One safety topic | **Hazard Perception**, in an automotive logistics setting, with five hazard families drawn from published HSE and COSHH guidance |
| A game with a score | Timed hazard hunt, per-find feedback, false-click penalty, quiz, and a scored diagnostic against a 75% threshold |

### Functional requirements

| Ref | Requirement | Delivered in |
| :--- | :--- | :--- |
| FR-01 | Navigable 360° scene in browser, no headset required | `PanoramaViewer`, `WalkthroughViewer` |
| FR-02 | 5 interactive hazards | `seedData.js` hotspots, five prop families |
| FR-03 | Visible 90-second countdown with urgency cues | `TraineeExperience` timer, session HUD |
| FR-04 | Audio and visual feedback for correct spotting | `audio.js`, in-world flash, toast, chips |
| FR-05 | Penalty for false clicks | `scoring.js`, 5 points per false click |
| FR-06 | Automatic end on timer expiry or all hazards found | `handleTimeExpire`, `transitionToQuiz` |
| FR-07 | Mandatory 4-question multiple-choice quiz | Four questions in `seedData.js`, submit gated on all answered |
| FR-08 | Diagnostic summary with pass/fail at 75% | `DiagnosticSummary`, server-side threshold |
| FR-09 | Every session stored as a compliance record | `ComplianceRecord` model |
| FR-10 | Three roles, single login, no public sign-up | Role selector, no registration route |
| FR-11 | Supervisor issues staff credentials | Supervisor add-trainee modal |
| FR-12 | Supervisor dashboard with CSV export | `csvExport.js` and export endpoint |
| FR-13 | Practice mode isolated from official history | `isPracticeMode` flag, excluded from official stats |

### Non-functional requirements

| Ref | Requirement | How it is met |
| :--- | :--- | :--- |
| NFR-03 | Runs on standard laptop and tablet browsers | No WebXR dependency; no headset needed to test or demo |
| NFR-05 | Scoring cannot be tampered with client-side | Scored server-side; hazard placement from a server-held seed |
| NFR-06 | Access controlled by role | JWT sessions with role-based middleware |

### Known gaps

- The four quiz questions cover four of the five hazard families. The trailing 415V cable has no
  dedicated question, because four questions cannot cover five families. FR-07 specifies a count,
  not a coverage.
- Banner small text contrast, as recorded in section 7.
- Production hardening: HttpOnly cookie tokens, rate limiting on submission, and a client
  heartbeat.

### Known data issues

Not code defects, but they affect any analysis of the exported compliance data:

- Most historical records were filed against the retired *Legacy Plant Walkthrough* scenario. Filter
  on the scenario before comparing scores across attempts, since the two scenarios are not
  equivalent.
- A handful of legacy accounts predate the current `department` field and have no value for it.
  The dashboard search guards against this rather than assuming the field is present.
- An attempt with a `1`-second duration was abandoned, not completed in one second: the scoring
  engine floors the value at 1. Treat those rows as non-attempts rather than fast completions.

---

## 10. Security & Tamper Resistance

1. **Server-side authoritative scoring.** The client submits answers and hazard IDs only. Scores,
   verdicts and analytics are all computed from the stored attempt.
2. **Correct answers are never sent to the browser.** The scenario endpoint strips every
   `correctIndex` before responding; grading happens strictly server-side.
3. **Role-based access control** on every compliance route, with three distinct roles.
4. **Randomized staging without leaking credit.** Placement is generated server-side from a seed, so
   the client cannot predict hazard positions.
5. **CORS allowlist** from `CLIENT_ORIGIN` rather than reflecting any origin.
6. **Practice mode isolation**, so retries cannot inflate official compliance records.
7. **Credentials are excluded at the schema.** Both `password` and the retired `passwordHash` field
   are declared `select: false`, so no query can return a hash — including `.lean()` reads, which
   bypass Mongoose casting. Login opts back in explicitly with `.select('+password')`, and a harness
   asserts that opt-in still exists, because removing it would silently break every sign-in.
8. **Account deletion is guarded.** An administrator cannot delete their own account or the last
   remaining administrator, either of which would lock everyone out of the portal permanently.
   Compliance records are deliberately not cascaded: in an audit system the record is the evidence,
   and it stores `userName` denormalised so exports keep working after the account is gone.

---

## 11. Verification

Ten harnesses guard the claims above. They need no test runner.

```bash
npm run check --prefix backend   # walkthrough layout randomisation and anchor integrity

cd frontend
npm run verify:scene             # 3D scene, collision, draw calls, disposal
npm run verify:palette           # no green or red in the 3D scene
npm run verify:report            # score report geometry, type scale, one page
npm run verify:hazards           # hazard counting in both environments
npm run verify:panorama          # panorama hotspots stay isolated from the walkthrough
npm run verify:contract          # every client API call has a server route
npm run verify:responsive        # mobile layout, against the compiled CSS
npm run verify:banner            # dashboard banner colour and contrast contract
npm run verify:alerts            # alert boxes against the surfaces behind them
npm run verify                   # all of the above, plus the build
```

`npm run verify` also runs in continuous integration on every push and pull request, so a
regression fails the pipeline rather than being noticed later. The harnesses live in
`frontend/scripts/`.

The responsive, banner and alert harnesses assert against the **compiled** stylesheet, because
Tailwind drops responsive variants inside `@apply` without warning.

Two of these guard whole classes of bug rather than one instance:

- **`verify:contract`** parses `frontend/src/services/api.js` and the backend route files and fails
  if any call the client makes has no matching server route, or any server route has no caller. The
  admin Delete button shipped calling an endpoint that was never implemented, and nothing compared
  the two sides; this harness is what stops that recurring.
- **`verify:panorama`** asserts the walkthrough never reads `panoramaSpots`, that the two hazard sets
  still share IDs so grading is unchanged, and that no two panorama hotspots sit close enough to
  shadow each other at the effective 5° hit radius.

A database-backed harness for account deletion is included but is not part of CI, because it needs a
reachable cluster:

```bash
npm run verify:users --prefix backend
```

It runs against a scratch database on the same cluster rather than the live one, so the
lockout guards can be exercised for real without touching production data.

---

## 12. Repository Layout

```
hazard-hunt/
├─ .github/workflows/ci.yml     CI: install, build, run every harness
├─ package.json                 root scripts
├─ README.md
├─ backend/
│  ├─ .env.example
│  ├─ verify-user-management.mjs  account deletion guards, against a scratch database
│  └─ src/                      config, controllers, middleware, models, routes, seeds, utils
└─ frontend/
   ├─ .env.example
   ├─ vercel.json
   ├─ public/panoramas/         360 environment imagery
   ├─ scripts/                  verification harnesses
   └─ src/                      components, context, services, utils
```