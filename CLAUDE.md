# Affordable Exteriors — Job & Customer Management App

Context for anyone (including a fresh Claude session) picking up this project.
Read this first; it captures what the app is, how it's built, how to run/deploy
it, the important gotchas, and what's left to build.

## What this is

A production web app for **Affordable Exteriors** (a subsidiary of A Gutter
Solution, LLC), an exterior-construction company in **St. Peters, MO** doing
roofing, siding, gutters, windows, soffit/fascia, patio covers, garage doors,
chimney chase, masonry/tuckpointing, painting, and tree trimming. It handles
both **retail** and **insurance** jobs.

It replaces physical folders, handwritten notes, scattered photos, and forgotten
follow-ups with one centralized, phone-friendly system. It is live and in real
use.

- **Live URL:** https://aff-exteriors.web.app
- **Firebase project id:** `aff-exteriors`
- Owner/admin is the primary user; team = office (secretary), pm (production
  manager), sales/field reps.

## Stack

- **React 18 + Vite 5**, **React Router 6** (hand-scaffolded — no CRA/Next).
- **Firebase**: Google Auth, Firestore, Storage, Hosting.
- **pdfjs-dist** for the in-app PDF viewer (lazy-loaded).
- **Hand-written CSS** with design tokens in `src/styles/` — NO CSS framework.
- Mobile-first responsive; works on desktop Chrome and phones.

## Running, building, deploying

This is a **Windows / PowerShell** environment and **node is NOT on the
inherited PATH**. Prefix every node/npm command:

```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User"); npm run build
```

- `npm run dev` — local dev server (http://localhost:5173)
- `npm run build` — production build to `dist/` (always run before deploying)
- **Deploy:** `npm run build` then `firebase deploy --only firestore:rules,hosting`
  (add `,storage` when storage.rules changed). Firebase CLI is already
  authenticated; `.firebaserc` points at `aff-exteriors`.

### Local mode vs Firebase mode

- `.env.local` (git-ignored) holds the `VITE_FIREBASE_*` keys. When present, the
  app uses **live Firebase**.
- When `.env.local` is **absent**, `isFirebaseConfigured` is false and the app
  runs entirely on a **localStorage mock** (`localAdapter`) with seeded demo
  data — a safe sandbox that never touches live data. To test locally without
  touching production, temporarily move `.env.local` aside, then restore it.

## Architecture

**Data-layer abstraction** — the key pattern. `src/services/db/index.js` exports
`db`, chosen by `isFirebaseConfigured`:
- `localAdapter` (localStorage) or `firebaseAdapter` (Firestore)
- Same interface: `list / get / add / set / update / remove / subscribe`.
- **Domain services never import Firebase directly** — they use `db`.

**Layering:** `services/*` → `hooks/*` → UI components/pages.
- Services: `authService`, `jobsService`, `appointmentsService`, `filesService`
  (photos + documents), `sharesService`, `installersService`, `demoSeed`,
  `fileStore` (Firebase Storage wrapper).
- Hooks (`src/hooks/`): `useJobs`/`useJob`, `useAppointments`/`useJobAppointments`,
  `useFiles` (`usePhotos`/`useDocuments`), `useInstallers`.
- Contexts: `AuthContext` (`user`, `role`, `isAuthenticated`, `can(capability)`,
  `signIn`/`signOut`) and `ToastContext` (`toast`/`success`/`error`/`info`).

**Shared utilities** (`src/utils/`):
- `constants.js` — statuses (24-step workflow), trades, priorities, lead sources,
  event/appointment types + `EVENT_TYPE_COLORS`, roles, dashboard buckets,
  `STATUS_NEXT_ACTION` (suggested next action per status), lookup maps.
- `jobHelpers.js` — `emptyJob`, `buildKeywords`, `nextActionUrgency`,
  `suggestedNextAction`, `dateInDays`.
- `format.js` — `toDate` (parses bare `YYYY-MM-DD` as **local** to avoid an
  off-by-one), `formatDate/DateTime/Phone/Currency/Bytes`, `toInputDate/DateTime`.
- `permissions.js` — `CAP` capability keys + `can(role, capability)` matrix.

## Firebase data & security

**Firestore collections:**
- `jobs/{id}` with subcollections `timeline`, `notes`, `photos`, `documents`
- `appointments/{id}` (top-level; `jobId` links to a job; powers the calendar)
- `installers/{id}` (contractor/crew bank)
- `shares/{token}` (public photo-share links)
- `users/{uid}` (team-member role docs)

**Rules** (`firestore.rules`, `storage.rules`) — the security model:
- A user is a **team member** only if a `users/{uid}` doc exists. Rules require
  it (`hasProfile()`) for essentially all reads/writes, so a logged-in Google
  user who isn't provisioned sees nothing.
- Roles: `admin`, `office`, `sales`, `pm`, `viewer` (in the `role` field).
- `shares` use a **get/list split**: anyone can `get` a share by its exact token
  (powers the public page) but only staff can `list` — so links can't be
  enumerated.
- Storage: files live under `jobs/{id}/photos` and `jobs/{id}/documents`
  (images / PDF / Word), team-member gated.
- **Firebase Storage download URLs are public-by-token** (they bypass Storage
  rules). That's intentional and is how share links and logged-out photo viewing
  work. Browsing security is the Firestore `users`-doc gate + the shares
  get/list split.
- The Storage **bucket has CORS configured** (via Google Cloud Shell) so PDF.js
  and the photo "download selected" can fetch cross-origin.

**Auth:** Google sign-in only (in Firebase mode). A first-time sign-in with no
role lands on a "You're almost in" screen (`NotProvisioned`).

## Features built

- **Jobs:** list (card + table, search/filter/sort), full detail page with tabs:
  Overview (Customer, Job basics, Lead & next action, Appointments), Insurance
  (insurance jobs only), Contract & Payment, Materials, Notes, Files, Activity.
  Inline-edit sections via `EditableSection` in `JobSections.jsx`.
- **Dashboard:** status-bucket stat cards + prioritized follow-up widgets.
- **Status workflow:** 24 statuses; changing status **suggests a next action**
  (editable) and there are **Reschedule / Done** quick actions
  (`NextActionDialog`).
- **Notes** + **Activity timeline** per job.
- **Photo bank:** bulk multi-select upload (full-quality originals, no
  re-compression; small thumbnails auto-generated), category tags, gallery,
  full-screen `Lightbox` (pan/zoom/swipe), multi-select **download / share /
  delete**.
- **Document bank:** upload PDFs/scans/Word; **PDF.js viewer** (`PdfViewer`) —
  desktop in-app, fit-to-width (portrait docs default to ~58% width, centered);
  **on phones PDFs open in the native viewer** (new tab) because mobile-browser
  PDF rendering is unreliable. Images use the Lightbox; other types download.
- **Share links:** public, login-free gallery at `/share/:token` (`SharePage`),
  created from selected photos (`CreateShareDialog`), unguessable token,
  per-link expiry + revoke. Solves the "email photos" size-limit problem.
- **Schedule (appointments calendar):** `Schedule.jsx` — Day / Week / Month;
  Day & Week are an **hour-by-hour planner** (6am–8pm), color-coded by type,
  overlapping appointments split into lanes. `AppointmentDialog` create/edit;
  each job has a flexible `JobAppointments` list.
- **Contractor bank:** `Installers` page + `InstallerDialog` (name, phone, notes,
  active — deliberately uncategorized). Assign a contractor to an appointment via
  a datalist in `AppointmentDialog` (install/delivery scheduling).
- **Team roles** via `users/{uid}` docs.

## Conventions & gotchas

- **PowerShell PATH prefix** is required for node/npm (see above).
- **No emojis in source files** (user preference).
- **Never commit secrets;** keys live in `.env.local` (git-ignored). Local mode
  is the fallback when it's absent.
- **Redeploy rules when they change:** `firebase deploy --only firestore:rules`
  (and/or `storage`). Adding a new collection usually means a new rule.
- **CSS** is hand-written in `src/styles/`: `tokens.css` (design tokens),
  `global.css`, `components.css`, `layout.css`, and `app.css` (page/feature
  composite classes). Match existing tokens and patterns; don't add a framework.
- **`Button` defaults `type="button"`.** Inside a `<form>`, don't let a button's
  `type` flip to `submit` mid-click — the multi-step New Job form uses one
  always-`type="button"` action button that advances or (on the last step)
  submits. See `NewJob.jsx`.
- **Dates:** date-only values are `YYYY-MM-DD` parsed as **local**; appointments
  store `start` as local `YYYY-MM-DDTHH:mm`.
- **Icons** are inline SVGs in `src/components/ui/Icon.jsx` (Feather-style); add
  new ones there by name.
- **Only one FAB on mobile.** The AppShell renders a global "Add New Job" FAB;
  don't add a second page-level `.fab` (it collides). Put page actions in a
  toolbar/header instead (see Schedule/Installers).

## Adding a team member (manual, no in-app UI yet)

1. The person signs in once at the live URL with Google → lands on "You're almost
   in."
2. Firebase console → **Authentication → Users** → copy their **User UID**.
3. Firestore → **`users`** collection → add a doc, **Document ID = their UID**
   (exact), string fields: `role` (admin/office/sales/pm/viewer), `displayName`,
   `email`.
4. They refresh → they're in.

## Roadmap / not yet built

- **Team management screen** (in-app: new sign-ins appear as "pending", admin
  assigns roles from a dropdown) — recommended next; removes the manual console
  step above.
- **Richer install/delivery scheduling** — crew-centric view, drag-to-reschedule
  — pending input from the production manager who runs that side.
- **Measurements** capture (`MEASUREMENT_CATEGORIES` exist in constants; no UI).
- **Reporting / metrics** beyond the dashboard buckets.

## Working style the user prefers

Move feature-by-feature; verify with a real build (and, when useful, a
local-mode smoke test) before calling something done; be honest about tradeoffs
and caveats; keep the mobile experience first-class.
