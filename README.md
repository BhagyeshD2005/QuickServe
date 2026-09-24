# ⚡ QuickServe — Service Request Management Platform

[![Backend Cloudflare Worker](https://img.shields.io/badge/Backend-Cloudflare_Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Framework Hono](https://img.shields.io/badge/Framework-Hono_v4-E36002?style=for-the-badge&logo=hono&logoColor=white)](https://hono.dev/)
[![Mobile Flutter](https://img.shields.io/badge/Mobile-Flutter-02569B?style=for-the-badge&logo=flutter&logoColor=white)](https://flutter.dev/)
[![Database Cloudflare_D1](https://img.shields.io/badge/Database-Cloudflare_D1_SQLite-003B5C?style=for-the-badge&logo=sqlite&logoColor=white)](https://developers.cloudflare.com/d1/)
[![Language TypeScript](https://img.shields.io/badge/Language-TypeScript_5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

**QuickServe** is a production-oriented, cloud-native Service Request Management Platform designed to seamlessly connect **Customers**, **Service Agents**, and **Administrators**. Built on a high-performance serverless backend and a cross-platform mobile application, QuickServe streamlines real-world service delivery (AC servicing, plumbing, electrical repairs, cleaning, etc.) with real-time lifecycle tracking, strict role-based security, and complete operational transparency.

Developed by **Bhagyesh Dedmuthe** from **Yeshwantrao Chavan College of Engineering (YCCE)**.

---

## 🌟 Key Features

*   **Role-Based Security (RBAC):** Three distinct roles (`CUSTOMER`, `AGENT`, `ADMIN`) with server-side authorization middleware enforcing entity ownership and privilege boundaries.
*   **Dual Authentication Pipeline:** Native JWT-based authentication (using JOSE/Web Crypto) coexists with **Google OAuth 2.0 / Federated Sign-In** for frictionless user onboarding without exposing OAuth credentials to the client.
*   **Structured Lifecycle Management:** Enforces a rigid 5-stage request lifecycle (`CREATED` → `ASSIGNED` → `ACCEPTED` → `IN_PROGRESS` → `COMPLETED`) alongside cancellation and agent rejection workflows.
*   **Auditing & Traceability:** Immutable status history logs and administrative audit trails tracking operational events and agent dispatch timings.
*   **Unified Role-Aware Mobile App:** Single Flutter codebase delivering tailored interfaces dynamically based on the authenticated user's role.
*   **Comprehensive Web Admin Panel:** Operations control center for user promotion, service catalog management, manual agent assignment, and system metrics.

---

## 🏗️ Architecture Overview

```
               ┌────────────────────────────────────────────────────────┐
               │                     CLIENT LAYER                       │
               └───────────────────────────┬────────────────────────────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    ▼                                             ▼
        ┌───────────────────────┐                     ┌───────────────────────┐
        │ Flutter Mobile App    │                     │  Web Admin Panel      │
        │ (Customer & Agent UI) │                     │  (Vue / React Dashboard)
        └───────────┬───────────┘                     └───────────┬───────────┘
                    │                                             │
                    └──────────────────────┬──────────────────────┘
                                           │ HTTPS / REST (Bearer JWT)
                                           ▼
               ┌────────────────────────────────────────────────────────┐
               │           BACKEND LAYER (Cloudflare Workers)           │
               ├────────────────────────────────────────────────────────┤
               │  • Hono Framework (Routing & Context)                   │
               │  • Zod (Input Validation & Schema Parsing)             │
               │  • JOSE / Web Crypto (JWT Verification & RBAC)          │
               │  • Google Identity Token Verification                  │
               └───────────────────────────┬────────────────────────────┘
                                           │
                                           ▼
               ┌────────────────────────────────────────────────────────┐
               │           PERSISTENCE LAYER (Cloudflare D1)            │
               ├────────────────────────────────────────────────────────┤
               │  • Serverless Edge SQL Database (SQLite-compatible)    │
               │  • Tables: profiles, services, service_requests,       │
               │    request_assignments, request_status_history,        │
               │    audit_logs                                          │
               └────────────────────────────────────────────────────────┘
```

---

## 🚀 Live API Endpoint

The production API is hosted globally on Cloudflare Edge:
*   **Base URL:** `https://quickserve-api.quickserve-by-bhagyesh.workers.dev`
*   **Version:** `v1`
*   **Format:** Standardized JSON responses (`{ success: boolean, data: object, message: string }`)

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Backend Runtime** | [Cloudflare Workers](https://workers.cloudflare.com/) | Edge-computing V8 isolate runtime offering sub-10ms cold starts |
| **API Framework** | [Hono v4](https://hono.dev/) | Ultrafast web framework designed for Edge runtimes |
| **Validation** | [Zod](https://zod.dev/) | Strict TypeScript-first schema validation for API payloads |
| **Authentication** | JOSE & Google Identity | JWT token validation via Web Crypto API and Google OAuth ID Tokens |
| **Database** | [Cloudflare D1](https://developers.cloudflare.com/d1/) | Distributed serverless SQL database powered by SQLite |
| **Mobile Client** | [Flutter](https://flutter.dev/) | Cross-platform framework providing native performance for iOS & Android |
| **Admin Web** | Modern Web Stack | Responsive Single Page Application for operational administration |

---

## 🗄️ Database Schema & Entities

The platform relies on six relational tables hosted on Cloudflare D1:

1.  **`profiles`**: Stores user credentials, hashed passwords, roles (`CUSTOMER`, `AGENT`, `ADMIN`), and Google IDs.
2.  **`services`**: Active catalog of offerings (e.g., AC Servicing, Plumbing, Electrical, Cleaning).
3.  **`service_requests`**: Master table for requests storing unique codes (e.g., `REQ-2026-000012`), preferred schedules, addresses, and current status.
4.  **`request_assignments`**: Links service agents to requests along with assignment statuses (`ASSIGNED`, `ACCEPTED`, `REJECTED`).
5.  **`request_status_history`**: Audit log recording every state transition with timestamps and author details.
6.  **`audit_logs`**: System-wide administrative action history for security and compliance.

---

## 🔄 Service Request Lifecycle

```
[ CREATED ] ──(Admin Assigns)──> [ ASSIGNED ] ──(Agent Accepts)──> [ ACCEPTED ]
     │                                │                                 │
     │                                ├──(Agent Rejects)──┐             │
     ▼                                ▼                   │             ▼
[ CANCELLED ]                   [ UNASSIGNED ] <──────────┘      [ IN_PROGRESS ]
 (Customer)                     (Re-queue Pool)                         │
                                                                        ▼
                                                                 [ COMPLETED ]
```

---

## 💻 Getting Started Locally

### Prerequisites
*   [Node.js](https://nodejs.org/) v18+
*   [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (`npm i -g wrangler`)
*   [Flutter SDK](https://docs.flutter.dev/get-started/install) (for mobile app development)

### Backend Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/BhagyeshD2005/QuickServe.git
   cd QuickServe/backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure local environment secrets:**
   Create a `.dev.vars` file in the backend root:
   ```env
   JWT_SECRET="your-super-secret-jwt-key"
   GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
   ```

4. **Initialize Local Cloudflare D1 Database:**
   ```bash
   npx wrangler d1 execute quickserve-db --local --file=./schema.sql
   ```

5. **Start the local development server:**
   ```bash
   npm run dev
   ```
   The API will be accessible at `http://localhost:8787`.

---

## 📱 Mobile Application Setup

1. **Navigate to the Flutter directory:**
   ```bash
   cd ../mobile
   ```

2. **Fetch Flutter dependencies:**
   ```bash
   flutter pub get
   ```

3. **Run the application:**
   ```bash
   flutter run
   ```

---

## 📄 License & Student Credits

Developed as an academic engineering project by **Bhagyesh Dedmuthe**  
**Department of Computer Technology **  
**Yeshwantrao Chavan College of Engineering (YCCE), Nagpur, Maharashtra, India.**
