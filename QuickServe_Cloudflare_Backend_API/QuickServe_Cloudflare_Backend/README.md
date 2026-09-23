# QuickServe Cloudflare Backend

A public, frontend-independent REST API for the QuickServe assignment.

The assignment asks for a Flutter customer app, a web admin portal, authentication/RBAC, audit logging, request status history and a Firebase/Supabase backend. This implementation uses **Cloudflare Workers + Cloudflare D1** instead, while preserving the requested backend capabilities.

Source requirements are based on the supplied QuickServe brief: service requests use CREATED → ASSIGNED → ACCEPTED → IN_PROGRESS → COMPLETED, with eligible cancellation; roles are Customer, Agent and Admin; backend/database authorization is required; and the data model includes users, services, requests, status history and audit logs.

## Architecture

Flutter / React / Next.js / any mobile or web client
        |
        | HTTPS JSON + Bearer JWT
        v
Cloudflare Worker (Hono)
        |
        +---- JWT authentication / RBAC
        +---- validation / authorization
        +---- audit logging
        |
        v
Cloudflare D1 (SQLite)

The deployed Worker receives a public URL such as:

https://quickserve-api.<YOUR-SUBDOMAIN>.workers.dev

Any frontend or mobile app can call it with HTTPS.

## Requirements

- Node.js current LTS
- Cloudflare account
- Wrangler 4+
- A Cloudflare D1 database

Cloudflare's current documentation supports D1 bindings from Workers and Wrangler-based remote migrations/deployment.

## 1. Install

```bash
npm install
```

## 2. Login

```bash
npx wrangler login
```

## 3. Create the production D1 database

```bash
npx wrangler d1 create quickserve-db
```

Copy the returned database ID into `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "quickserve-db"
database_id = "YOUR_REAL_DATABASE_ID"
```

## 4. Configure JWT secret

Create `.dev.vars` for local development:

```env
JWT_SECRET="use-a-long-random-secret"
CORS_ORIGINS="*"
```

For production, set the Worker secret:

```bash
npx wrangler secret put JWT_SECRET
```

Do not commit `.dev.vars` or secrets.

## 5. Apply database migration

Local:

```bash
npm run db:migrate:local
```

Production:

```bash
npm run db:migrate:remote
```

## 6. Run locally

```bash
npm run dev
```

Wrangler will show the local API URL, usually:

```text
http://localhost:8787
```

## 7. Deploy publicly

```bash
npm run deploy
```

Cloudflare will return a public `workers.dev` URL.

Example:

```text
https://quickserve-api.example.workers.dev
```

You can optionally attach your own domain from the Cloudflare dashboard.

## Authentication

### Register

POST `/api/auth/register`

```json
{
  "email": "customer@example.com",
  "password": "StrongPassword123!",
  "full_name": "Test Customer",
  "phone": "9876543210"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "customer@example.com",
      "full_name": "Test Customer",
      "role": "CUSTOMER"
    },
    "token": "JWT..."
  }
}
```

### Login

POST `/api/auth/login`

```json
{
  "email": "customer@example.com",
  "password": "StrongPassword123!"
}
```

Use the returned JWT on protected endpoints:

```http
Authorization: Bearer YOUR_TOKEN
```

## Google Sign-In

The API supports Google ID-token authentication while preserving the existing email/password JWT flow. The client obtains a Google ID token and sends it to `POST /api/auth/google`. The Worker verifies the token against the configured Google Web OAuth Client ID, finds or creates the QuickServe user, and returns the normal QuickServe JWT.

Production configuration in `wrangler.toml` uses the Web OAuth Client ID supplied for this QuickServe application. For local development, the same value can be placed in `.dev.vars`.

POST `/api/auth/google`

```json
{
  "id_token": "GOOGLE_ID_TOKEN"
}
```

Google-created users are always created with the `CUSTOMER` role. Existing users can be linked to their verified Google identity by email. Google account identifiers are stored using the provider's stable `sub` value.

The backend never receives or stores a Google client secret.

## Main API

### Public

- GET `/`
- GET `/health`
- GET `/api`
- GET `/api/services`
- POST `/api/auth/register`
- POST `/api/auth/login`

### Authenticated

- GET `/api/auth/me`
- POST `/api/auth/change-password`
- PATCH `/api/profile`
- POST `/api/requests` (Customer/Admin)
- GET `/api/requests` (Customer sees own; Agent sees assigned; Admin sees all)
- GET `/api/requests/:id` (scoped by role)
- PATCH `/api/requests/:id/status` (Admin only for arbitrary status changes; Customer may use it only to cancel their own request)
- POST `/api/requests/:id/notes` (Customer/Admin; Agent uses the controlled agent route below)

### Service Agent

Agents do **not** receive a generic status-mutation API. Every workflow action is separately protected by `AGENT` RBAC and checks `assigned_agent_id = authenticated_user.id`.

- GET `/api/agent/requests` — assigned requests only
- GET `/api/agent/requests/:id` — assigned request only
- POST `/api/agent/requests/:id/accept` — `ASSIGNED -> ACCEPTED`
- POST `/api/agent/requests/:id/reject` — `ASSIGNED -> CANCELLED`, with a mandatory rejection reason recorded in history/audit because the database lifecycle has no `REJECTED` status
- POST `/api/agent/requests/:id/start` — `ACCEPTED -> IN_PROGRESS`
- POST `/api/agent/requests/:id/complete` — `IN_PROGRESS -> COMPLETED`
- POST `/api/agent/requests/:id/notes` — notes on assigned requests only

### Admin

- POST `/api/requests/:id/assign`
- GET `/api/admin/dashboard`
- GET `/api/admin/users`
- GET `/api/admin/requests`
- GET `/api/admin/audit-logs`

## Role security

Customer:
- create request
- view only own requests
- cancel own eligible request
- add notes to own request

Agent:
- view assigned requests only
- accept an assigned request
- reject/deny an assigned request with a reason
- start accepted work
- complete in-progress work
- add notes to assigned requests
- cannot arbitrarily PATCH request status

Admin:
- operational access to all requests
- assign agents
- update requests
- dashboard
- user view
- audit log view

Authorization is checked by the Worker API, not merely by frontend UI visibility.

## Request lifecycle

```text
CREATED
   |
   v
ASSIGNED --agent reject--> CANCELLED
   |
   v
ACCEPTED
   |
   v
IN_PROGRESS
   |
   v
COMPLETED
```

Eligible requests may be cancelled.

## Request creation

POST `/api/requests`

```json
{
  "service_id": "svc-ac",
  "description": "AC is not cooling",
  "preferred_at": "2026-10-01T10:00:00+05:30",
  "address": "Nagpur, Maharashtra",
  "priority": "HIGH"
}
```

The API generates a unique request number such as:

```text
REQ-2026-000001
```

## Assign an agent

Admin:

POST `/api/requests/:id/assign`

```json
{
  "agent_id": "AGENT_USER_ID"
}
```

## Update status

PATCH `/api/requests/:id/status`

```json
{
  "status": "IN_PROGRESS",
  "note": "Technician started work"
}
```

## CORS

For development, `CORS_ORIGINS="*"` is convenient.

For production, restrict it:

```env
CORS_ORIGINS=https://your-admin.example.com,https://your-mobile-web-client.example.com
```

Native Flutter mobile requests do not depend on browser CORS, but web builds do.

## Password security

Passwords are never stored in plaintext. The Worker uses Web Crypto PBKDF2-SHA-256 with a per-password random salt.

JWTs are signed using HS256 and a server-side Cloudflare secret.

## Audit logging

The backend records meaningful events such as:

- REGISTER_SUCCESS
- LOGIN_SUCCESS
- LOGIN_FAILED
- PASSWORD_CHANGED
- REQUEST_CREATED
- REQUEST_ASSIGNED
- REQUEST_UPDATED
- REQUEST_NOTE_ADDED
- AUTHORIZATION_FAILED
- PROFILE_UPDATED
- DATABASE_ERROR

Passwords, JWTs and API secrets are not written to audit logs.

## Important seed note

`seed.sql` intentionally contains placeholder hashes and is not a usable production credential seed. Create real users through the registration endpoint or implement a separate secure admin provisioning process. Never place real passwords or secrets in SQL committed to Git.

## Frontend integration

Example JavaScript:

```js
const API = "https://quickserve-api.YOUR_SUBDOMAIN.workers.dev";

const login = await fetch(`${API}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "customer@example.com",
    password: "StrongPassword123!"
  })
});

const result = await login.json();
const token = result.data.token;

const requests = await fetch(`${API}/api/requests`, {
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

Flutter/Dart:

```dart
final response = await http.get(
  Uri.parse('$apiBaseUrl/api/requests'),
  headers: {
    'Authorization': 'Bearer $token',
    'Content-Type': 'application/json',
  },
);
```

## Production checklist

- Replace `database_id` in `wrangler.toml`.
- Set `JWT_SECRET` with `wrangler secret put JWT_SECRET`.
- Restrict `CORS_ORIGINS`.
- Use a custom API domain if desired.
- Enable Cloudflare analytics/logging appropriate to your plan.
- Add rate limiting/WAF rules for public authentication endpoints.
- Keep secrets out of GitHub.
- Run authorization tests before submitting the assignment.

## Admin: Promote Customer to Service Agent

Authenticated administrators can promote an existing `CUSTOMER` to `AGENT`:

`PATCH /api/admin/users/:userId/role`

Headers:
- `Authorization: Bearer <ADMIN_JWT>`
- `Content-Type: application/json`

Body:
```json
{
  "role": "AGENT"
}
```

This endpoint is ADMIN-only and only permits `CUSTOMER -> AGENT`. Attempts by non-admin users are rejected by the existing role middleware, and attempts to change an existing AGENT/ADMIN role return a role-transition error.
