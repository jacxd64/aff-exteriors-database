# Connecting Aff Exteriors to Firebase

The app runs with **no setup** using a local browser store (great for trying it
out). When you're ready for a real, shared, cloud backend, follow the steps
below. It takes about 15 minutes and you only do it once.

You'll do two kinds of steps:

- **In the Firebase console** (website) — create the project, turn on features,
  and add team members. These are things only you can do.
- **In this project's files** — paste your project's keys into one file.

When you finish, the app automatically switches from the local store to live
Firebase. Sign-in uses **Google** (no passwords to manage).

---

## What you need first

- A Google account (the one that will own the project).
- This project on your computer, able to run `npm run dev`.

> **Finding things in the console.** Firebase reorganizes its left-hand menu
> from time to time. The most reliable way to reach any feature is the
> **"Search for products"** box at the top of the left menu — type "Firestore",
> "Storage", "Authentication", or "Hosting" and it jumps straight there. As of
> this writing the menu groups features under **Product categories**:
> Authentication is pinned under **Project shortcuts**; Firestore and Storage
> live under **Databases & Storage**; Hosting under **Hosting & Serverless**.

---

## Step 1 — Create the Firebase project

1. Go to https://console.firebase.google.com and click **Add project**.
2. Name it (e.g. `aff-exteriors`). Accept the defaults; Google Analytics is
   optional and can be left off.
3. Wait for it to finish, then click **Continue**.

## Step 2 — Turn on Google sign-in

1. Open **Authentication** (under **Project shortcuts**, or via the search box)
   → **Get started**.
2. Open the **Sign-in method** tab.
3. Click **Google** and toggle **Enable**. A couple of project-level fields
   appear — **Save stays greyed out until you fill them in**:
   - **Public-facing name for project** — this is what users see on the Google
     sign-in popup ("Sign in to continue to ___"). Replace the auto-generated
     `project-############` with **`Aff Exteriors`**.
   - **Support email for project** — click the dropdown and pick your own Google
     account email. This is required (it shows a red "Please select an email"
     until you do).
4. Click **Save**. Google should now read **Enabled** in the providers list.

> **Ignore these on that screen:** the **SHA-1 release fingerprint** note is for
> *Android apps only* (you have a web app — it doesn't apply); "Safelist client
> IDs" is optional; and "Web SDK configuration" is filled in automatically.

> `localhost` is already an authorized domain, so sign-in works during
> development. When you deploy (Step 12), your hosting domain is added
> automatically.

## Step 3 — Create the Firestore database

1. Open **Firestore Database** (under **Databases & Storage**, or search
   "Firestore") → **Create database**. The wizard has three steps:
2. **Select edition** → choose **Standard edition** (the default). *Not*
   Enterprise — that's a pricey MongoDB/advanced tier you don't need.
   ("Edition" is the query engine; it is **not** the same as "production mode"
   below.) Click **Next**.
3. **Database ID & location** → leave the Database ID as **`(default)`**, pick
   the location closest to you (e.g. a `us-west`/`us-central` region).
   **The location can't be changed later.** Click **Next**.
4. **Configure** → choose **Production mode** (starts locked down; we deploy
   real rules in Step 8). Avoid "Test mode," which is open to everyone. Create
   the database.

## Step 4 — Turn on Storage (optional for now — you can skip this)

Nothing built so far uses Storage — it's only for **future** job photos and
documents. Newer Firebase projects often require the paid **Blaze** plan to turn
Storage on. If you want to stay on the free **Spark** plan, **skip this step**;
everything currently in the app works on Auth + Firestore alone. We'll enable
Storage together when we build photo/document uploads.

If you do want it now:

1. Open **Storage** (under **Databases & Storage**, or search "Storage") →
   **Get started**.
2. Accept **Production mode** and the same region. (If it asks you to upgrade to
   Blaze and you'd rather not, just back out — it won't affect anything yet.)

## Step 5 — Register a web app and copy the keys

1. Open **Project settings**: click **Settings** (the gear in the left rail,
   near the top) → **Project settings**. Shortcut: visit
   `console.firebase.google.com/project/<your-project-id>/settings/general`.
2. Scroll to the **Your apps** section.
   - **No app yet?** Click the **web icon (`</>`)**, nickname it (e.g.
     `aff-web`), leave **"Also set up Firebase Hosting" unchecked**, and click
     **Register app**.
   - **App already there?** Click it → **SDK setup and configuration** → select
     **Config**.
3. You'll see a `firebaseConfig` block with `apiKey`, `authDomain`, etc. Those
   values map one-to-one to the `VITE_FIREBASE_*` lines in the next step. (You
   can always come back here to see them again.)

## Step 6 — Paste the keys into `.env.local`

1. In the project folder, copy `.env.example` to a new file named `.env.local`.
2. Fill in each value from the config you just saw:

   ```
   VITE_FIREBASE_API_KEY=AIza...your key...
   VITE_FIREBASE_AUTH_DOMAIN=aff-exteriors.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=aff-exteriors
   VITE_FIREBASE_STORAGE_BUCKET=aff-exteriors.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
   VITE_FIREBASE_APP_ID=1:1234567890:web:abc123
   ```

3. `.env.local` is git-ignored, so your keys never get committed. (These
   particular keys are not secret, but it's good hygiene.)

## Step 7 — Restart the dev server

Stop `npm run dev` and start it again (Vite only reads env files at startup).
On the login screen you should now see **Continue with Google** instead of the
demo accounts. That confirms the app is in Firebase mode.

## Step 8 — Deploy the security rules

The repo already contains `firestore.rules`, `storage.rules`, and
`firestore.indexes.json`. Get them onto your project one of two ways.

**Option A — Firebase CLI (recommended, repeatable):**

```bash
npm install -g firebase-tools
firebase login
# Tell the CLI which project to use (replace with your project id):
firebase use --add        # pick your project, alias it "default"
firebase deploy --only firestore:rules,storage:rules,firestore:indexes
```

`firebase use --add` updates `.firebaserc` for you (it currently has a
placeholder project id).

> **If you skipped Storage (Step 4)**, drop `storage:rules` from that command —
> deploying storage rules without a Storage bucket will error:
> `firebase deploy --only firestore:rules,firestore:indexes`

**Option B — Copy/paste in the console (no CLI):**

- Firestore: **Firestore Database → Rules** tab → paste the contents of
  `firestore.rules` → **Publish**.
- Storage (skip if you didn't enable Storage): **Storage → Rules** tab → paste
  the contents of `storage.rules` → **Publish**.

> Until the rules are published, the app will get "permission denied" errors,
> because the default production rules block everything.

## Step 9 — Make yourself an admin

With Google sign-in, anyone can *authenticate*, but they only become a **team
member** once an admin creates a profile document for them. The very first admin
(you) has to be set up by hand:

1. In the app, click **Continue with Google** and sign in once. You'll land on a
   "You're almost in" screen — that's expected; you have no role yet.
2. In the console: **Authentication → Users**. Find your account and copy your
   **User UID**.
3. Go to **Firestore Database → Data → Start collection**.
   - Collection ID: `users`
   - Document ID: **paste your UID** (must match exactly)
   - Add these fields (all type *string*):
     - `role` = `admin`
     - `displayName` = your name (e.g. `Avery`)
     - `email` = your email
   - **Save**.
4. Back in the app, refresh. You're now in as an admin.

## Step 10 — Load sample data (optional)

On the Dashboard you'll see an admin-only banner: **Load sample data**. Click it
to fill the database with the example jobs you've been testing with. When you're
ready for real data, click **Remove sample data** in the same spot. (Real jobs
you add yourself are never touched — only the tagged samples are removed.)

## Step 11 — Add your team

For each teammate:

1. Have them open the app and **Continue with Google** once (creates their
   account; they'll see the "almost in" screen).
2. In the console, copy their **User UID** (Authentication → Users).
3. Create a `users/{their UID}` document with their `role` (see the table
   below), `displayName`, and `email`.
4. They refresh and they're in.

(A built-in "team members" screen for doing this inside the app is planned for a
later phase — for now it's a quick console step.)

## Step 12 — Deploy the app (when you're ready to go live)

```bash
npm run build
firebase deploy --only hosting
```

This publishes the `dist/` build to Firebase Hosting and prints your live URL.
Re-run these two commands whenever you want to push updates.

---

## Roles reference

Set the `role` field to one of these exact values:

| role     | Can do                                                                    |
| -------- | ------------------------------------------------------------------------- |
| `admin`  | Everything, incl. deleting jobs and managing team members                 |
| `office` | Create/edit jobs, materials, schedule, notes, documents, installers       |
| `sales`  | Create/edit jobs, add notes, photos, measurements                         |
| `pm`     | Edit jobs, materials, schedule, notes, photos (cannot create or delete)   |
| `viewer` | Read-only                                                                 |

## Troubleshooting

- **Login still shows demo accounts** — `.env.local` is missing a value or the
  dev server wasn't restarted. All six `VITE_FIREBASE_*` values must be present.
- **"Permission denied" in the console/app** — security rules aren't published
  yet (Step 8), or your `users/{uid}` doc is missing/has the wrong UID.
- **Stuck on "You're almost in"** — your `users/{uid}` document doesn't exist or
  the document ID doesn't exactly match your Authentication UID.
- **Popup closed / blocked** — allow popups for the site, or try again; closing
  the Google popup yourself is harmless.

## Enabling in-app PDF preview (one-time storage CORS)

The in-app PDF viewer reads file bytes from your storage bucket, which lives on a
different web address than the app — so the browser requires a one-time
cross-origin (CORS) permission on the bucket. (Until this is set, PDFs still work
— they just show an "Open in new tab / Download" fallback instead of previewing
inline. This setting also enables the photo bank's bulk "Download selected".)

Easiest with no installs — use **Google Cloud Shell**:

1. Go to https://console.cloud.google.com, select project **aff-exteriors**.
2. Click the **Cloud Shell** icon (`>_`) top-right to open a browser terminal.
3. Paste this (creates the rules file, then applies it to your bucket):

   ```bash
   cat > cors.json <<'EOF'
   [
     {
       "origin": ["https://aff-exteriors.web.app", "https://aff-exteriors.firebaseapp.com", "http://localhost:5173"],
       "method": ["GET", "HEAD"],
       "responseHeader": ["Content-Type", "Content-Length", "Content-Range", "Accept-Ranges"],
       "maxAgeSeconds": 3600
     }
   ]
   EOF

   gcloud storage buckets update gs://aff-exteriors.firebasestorage.app --cors-file=cors.json
   ```

   (If that bucket name errors, use the exact `gs://…` name shown on the Firebase
   **Storage** page. Older alternative command: `gsutil cors set cors.json gs://…`.)

4. Done — refresh the app and PDFs preview inline. CORS changes take effect within
   a minute or two.
