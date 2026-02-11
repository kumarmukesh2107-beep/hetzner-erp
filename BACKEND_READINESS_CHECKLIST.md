# Backend Service Readiness Checklist (for Nexus ERP)

This repository is a Vite + React frontend. There is no backend service implementation here.

Use this checklist to verify your backend before production deployment.

## 1) Core service
- Backend repository exists (Node/Express, NestJS, Django, etc.).
- API has `/health` (liveness) and `/ready` (readiness) endpoints.
- API base URL is exposed to frontend via `VITE_API_BASE_URL`.

## 2) Data layer
- Production database configured (not local/in-memory).
- Migrations are versioned and can be run in CI/CD.
- Daily backups and restore drill are verified.

## 3) Security
- JWT/session auth enabled with refresh/token expiry strategy.
- Role-based access control for Admin / Accounts / Sales / Payroll.
- CORS restricted to your frontend domains only.
- Secrets stored in environment/secret manager (not in source).
- Rate limiting and request-size limits are enabled.

## 4) Reliability
- Structured logs with request IDs.
- Error tracking/alerting configured.
- Retries + timeouts for external dependencies.
- Graceful shutdown support for rolling deploys.

## 5) API quality
- Input validation on all write endpoints.
- Consistent error response format.
- OpenAPI/Swagger or equivalent API docs published.
- Idempotency strategy for payment/salary posting actions.

## 6) Deployment
- CI pipeline runs tests, lint, type-check, security checks.
- Production environment variables documented.
- HTTPS + TLS certificates configured.
- Reverse proxy/load balancer health checks configured.

## 7) ERP-specific checks
- Ledger and payroll posting transactions are atomic.
- Concurrency controls for inventory updates.
- Audit trail for invoice edits, salary changes, and user role changes.
- Data export/import permissions are role-scoped.

## Recommended immediate fixes for this repo
1. Set frontend env vars in deployment platform:
   - `VITE_API_BASE_URL`
   - `VITE_GEMINI_API_KEY` (or `VITE_API_KEY`)
2. Replace any frontend `process.env.*` access with `import.meta.env.*` (Vite runtime requirement).
3. Add a backend integration test suite in your backend repo for: auth, sales, purchases, inventory, accounting, payroll.
