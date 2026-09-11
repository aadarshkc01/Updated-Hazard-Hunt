# Hazard Hunt — 360° Warehouse Hazard Perception Trainer

> **Course Assignment:** CET257 Enterprise Project — University of Sunderland  
> **Group:** Macro Thinkers  
> **Simulated Client:** Automotive Logistics & Warehousing Company  
> **Product Name:** Hazard Hunt (Phase 1 Build)  

---

## 1. Executive Summary & Tech Architecture

**Hazard Hunt** is an interactive, browser-based 360° hazard perception training application developed to replace outdated poster-based safety training in industrial warehousing. Trainees navigate an equirectangular panorama of an automotive inbound logistics depot (Bay 4), identify acute safety infractions under a countdown timer, complete a regulatory compliance quiz, and receive diagnostic feedback scored against an official 75% compliance threshold.

### Full MERN Technology Stack:
- **360° Panoramic Engine:** **Pannellum** with custom spherical projection & Canvas fallback.  
  *Justification:* Lightweight (<25KB gzipped), purpose-built for photo-panoramas, and strictly zero WebXR/headset dependencies (satisfying NFR-03: runs seamlessly on standard laptop/tablet browsers).
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

Generated files in `frontend/dist/`, dependency folders, logs, local database files, and environment files are excluded by the root `.gitignore`.

---

## 3. Seeded Demo Login Credentials

The prototype comes pre-seeded with sample accounts for all three required roles:

| Role | Username | Password | Full Name & Department | Demo Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Employee (Trainee)** | `trainee1` | `SafetyPass123!` | Alex Morgan (Inbound Logistics Bay 4) | Has `hasCompletedOnboarding: false` to demonstrate the first-time onboarding modal. |
| **Employee (Trainee)** | `trainee2` | `SafetyPass123!` | Jordan Lee (Quality & Packaging) | Pre-seeded with a 97% passing record on the supervisor dashboard. |
| **Supervisor** | `supervisor1` | `SuperVisor2026!` | Eleanor Vance (HSE Lead) | Access to Team Compliance Dashboard, CSV Export, and Account Creation. |
| **Admin** | `admin1` | `AdminMaster2026!` | Marcus Sterling (Enterprise SysAdmin) | System Admin overview, Scenario parameters, and Phase 2 roadmap. |

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

### Recommendations for Production Enterprise Rollout:
- Enforce HTTPS and `HttpOnly` Secure cookies instead of `localStorage` for JWT storage to eliminate XSS token theft vectors.
- Implement server-side session nonces and client heartbeat timestamps to mathematically prove the trainee spent the claimed duration inside the 360 viewer.
- Add rate limiting (`express-rate-limit`) on submission endpoints to prevent automated replay attacks.

---

## 6. Graded Checklist Verification

- [x] **FR-01 / NFR-03:** Navigable 360° warehouse scene in browser with **strictly no VR headset required**.
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
