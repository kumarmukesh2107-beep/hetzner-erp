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

## Multi-device sync backend

This repo includes a lightweight sync backend service to share ERP state across devices/users.

- Sync backend default port: `8788`
- Backend default port: `4000`
- Frontend sync base URL should be relative: `VITE_SYNC_API_BASE_URL=/sync`

### Frontend environment

Set these in your frontend deployment/local `.env`:

- `VITE_ENABLE_CLOUD_SYNC` (`true` to force enable, `false` to disable)
- `VITE_SYNC_API_BASE_URL=/sync`
- `VITE_SYNC_API_KEY` (must match `NEXUS_SYNC_API_KEY` if configured)

The app now targets Nginx-relative paths instead of direct server IPs.

## Hetzner deployment (frontend + backend + sync)


### Troubleshooting `vite: not found`

If `npm run build` fails with `vite: not found`, dependencies were not installed successfully (or were installed with an unsupported Node version).

Use this sequence:

```bash
nvm use 22
rm -rf node_modules package-lock.json
npm install
npm run build
```

This project currently requires Node.js 20.19+ (Node 22 recommended) because of `@vitejs/plugin-react` and `react-router-dom` engine requirements.


1. Install dependencies:

```bash
npm install
```

2. Build frontend assets:

```bash
npm run build
```

3. Copy env file and adjust secrets:

```bash
cp .env.example .env
```

4. Start both Node services with PM2:

```bash
pm2 start ecosystem.config.cjs
pm2 save
```

5. Nginx reverse proxy (example):

```nginx
server {
  listen 80;
  server_name _;

  location / {
    root /var/www/nexus-erp/dist;
    try_files $uri /index.html;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:4000/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location /sync/ {
    proxy_pass http://127.0.0.1:8788/sync/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location /uploads/ {
    proxy_pass http://127.0.0.1:4000/uploads/;
  }
}
```

Cloud sync enablement rules (important):
- If `VITE_ENABLE_CLOUD_SYNC=true`, sync is enabled.
- If `VITE_ENABLE_CLOUD_SYNC=false`, sync is disabled.
- If unset, sync auto-enables only when `VITE_SYNC_API_BASE_URL` or `VITE_SYNC_API_KEY` is present.

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
   - `utils/cloudSync.ts`: keep relative sync URL support (`VITE_SYNC_API_BASE_URL=/sync`) and company path composition.
   - `package.json`: keep script `check:merge-conflicts`.
   - `utils/persistence.ts`: keep `nexus_last_local_change_at` updates and `nexus-local-state-changed` dispatch.
4. Run checks locally:

```bash
npm run check:merge-conflicts
npm run build
```
Test deploy

Only push once both commands pass.
