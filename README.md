<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1F4FAaiixW8QmuxmQhzxTldDv7mbPxzUY

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


## Deployment configuration notes

For frontend runtime configuration, define these variables in your deployment environment:

- `VITE_API_BASE_URL`
- `VITE_GEMINI_API_KEY` (or `VITE_API_KEY`)

For backend verification, follow [BACKEND_READINESS_CHECKLIST.md](./BACKEND_READINESS_CHECKLIST.md).

## Multi-device sync backend (new)

This repo now includes a lightweight sync backend service to share ERP state across devices/users.

### 1) Start sync backend

```bash
node backend-sync-server.mjs
```

Optional env vars:

- `SYNC_PORT` (default `8787`)
- `NEXUS_SYNC_API_KEY` (recommended in production)
- `NEXUS_SYNC_STORE_FILE` (custom JSON store path)

### 2) Frontend environment

Set these in your frontend deployment/local `.env`:

- `VITE_SYNC_API_BASE_URL` (optional)
- `VITE_SYNC_API_KEY` (must match `NEXUS_SYNC_API_KEY` if configured)

`VITE_SYNC_API_BASE_URL` accepts all these forms:

- `https://your-domain.com` (appends `/sync/:companyId`)
- `https://your-domain.com/sync` (appends `/:companyId`)
- `https://your-domain.com/api/sync` (appends `/:companyId`)

If omitted, frontend defaults to same-origin `/api/sync/:companyId`.

### 3) Vercel API proxy environment (recommended for production)

Set these on Vercel project env so frontend can safely call same-origin `/api/sync` over HTTPS:

- `NEXUS_SYNC_BACKEND_ORIGIN` (for your server: `http://65.108.221.47:8787`)
- `NEXUS_SYNC_API_KEY` (optional, forwarded to backend as `X-Nexus-API-Key`)

When configured, the app automatically:

- pushes local ERP changes to backend,
- polls backend for newer snapshots,
- refreshes client state when remote updates are detected.

If not configured, manual backup export/import in Data Import page remains available.

### Merge-conflict safety check

Before pushing conflict-resolution commits, run:

```bash
npm run check:merge-conflicts
```

This checks critical files for unresolved conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`).

### Quick conflict resolution guide (GitHub UI)

If GitHub shows conflicts in these files:

- `README.md`
- `components/System/CloudSyncAgent.tsx`
- `package.json`
- `pages/ImportPage.tsx`
- `utils/cloudSync.ts`
- `utils/persistence.ts`

Use this approach:

1. Click **Accept both changes** (safest first step).
2. Remove all marker lines manually:
   - `<<<<<<< ...`
   - `=======`
   - `>>>>>>> ...`
3. Keep these final values when cleaning up:
   - `README.md`: keep the detailed sync env section + merge-conflict safety section.
   - `utils/cloudSync.ts`: keep default fallback URL `/api/sync/:companyId` when env is empty.
   - `package.json`: keep script `check:merge-conflicts`.
   - `utils/persistence.ts`: keep `nexus_last_local_change_at` updates and `nexus-local-state-changed` dispatch.
4. Run checks locally:

```bash
npm run check:merge-conflicts
npm run build
```

Only push once both commands pass.
