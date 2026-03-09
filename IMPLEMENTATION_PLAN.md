# WhatsApp Agricultural Advisory Chatbot — Implementation Plan

## Document Purpose

This document is a **pre-code implementation plan** for a WhatsApp-based agricultural advisory chatbot POC. It is designed for Cursor to execute automatically after approval. **No code is generated in this phase.**

## Deployment Model

**Development system (production-like).** No local deployment. All deployments go through GitHub Actions:
- Backend → GCP Cloud Run
- Admin Portal → Firebase Hosting
- Database → MongoDB Atlas

---

## 1. Architecture Overview

### 1.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           WHATSAPP CLOUD API LAYER                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Meta Graph API • Flows API • Messages API • Webhooks                             │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ HTTPS
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Node.js / Express)                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │   Webhook    │  │   Flow       │  │   Message    │  │   Deployment         │ │
│  │   Handler   │  │   Response   │  │   Sender     │  │   Scripts             │ │
│  └──────────────┘  └──────┬──────┘  └──────────────┘  └──────────────────────┘ │
│                           │                                                       │
│                           │ save                                                  │
│                           ▼                                                       │
│  ┌──────────────────────────────────────────────────────────────────────────────┐│
│  │   Data Service (MongoDB) — Farmer registrations, config, audit logs           ││
│  └──────────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
          ┌─────────────────────────────┼─────────────────────────────┐
          │                             │                             │
          ▼                             ▼                             ▼
┌──────────────────┐        ┌──────────────────┐        ┌──────────────────┐
│  MongoDB         │        │  Flow JSON        │        │  Admin Portal     │
│  • farmers       │        │  (2 screens)       │        │  • Config         │
│  • config        │        │                   │        │  • Reports        │
│  • audit_logs    │        │                   │        │  • Farmer list     │
└──────────────────┘        └──────────────────┘        └──────────────────┘
```

### 1.2 Flow Lifecycle (Creation → Publishing → Triggering)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  1. CREATE      │     │  2. PUBLISH      │     │  3. TRIGGER      │
│  Flow JSON      │────▶│  POST /flows     │────▶│  User sends      │
│  defined in     │     │  publish: true   │     │  message →       │
│  project        │     │  Returns flow_id │     │  Webhook receives │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  7. MOCK        │     │  6. SAVE TO      │     │  4. SEND        │
│  Response      │◀────│  MONGODB        │◀────│  Interactive    │
│  "Thank you.   │     │  Farmer + crop  │     │  Flow message   │
│  Your crop     │     │  data stored    │     │  to user        │
│  info recorded"│     └────────┬────────┘     └─────────────────┘
└─────────────────┘     ┌───────┴────────┐     ┌─────────────────┐
                        │  5. WEBHOOK    │◀────│  User completes │
                        │  Receives      │     │  Flow (Submit)  │
                        │  nfm_reply +   │     └─────────────────┘
                        │  response_json │
                        └───────────────┘
```

---

## 2. Project Folder Structure

```
kweka-jeeto/
├── .env.example                 # Template for env vars (no secrets)
├── .env                         # Local secrets (gitignored)
├── .gitignore
├── package.json
├── tsconfig.json
├── README.md
│
├── flows/                       # WhatsApp Flow definitions
│   └── farmer-registration.json # Flow JSON for POC (2 screens)
│
├── src/                         # Backend (Node.js / Express)
│   ├── index.ts                 # Entry point, Express app
│   ├── config/
│   │   └── env.ts               # Load and validate env vars
│   │
│   ├── api/                     # HTTP routes
│   │   ├── webhook.ts           # GET (verify) + POST (incoming)
│   │   └── admin.ts             # Admin API (protected)
│   │
│   ├── services/
│   │   ├── webhook.service.ts   # Webhook verification + routing
│   │   ├── flow-response.service.ts  # Handle flow completion, save to DB
│   │   ├── message.service.ts  # Send WhatsApp messages (flow, text)
│   │   └── data.service.ts      # MongoDB CRUD (farmers, config, logs)
│   │
│   ├── data/                    # Data layer
│   │   ├── db.ts                # MongoDB connection
│   │   ├── models/
│   │   │   ├── Farmer.ts        # Farmer registration schema
│   │   │   ├── Config.ts        # App config schema
│   │   │   └── AuditLog.ts      # Audit log schema
│   │   └── repositories/
│   │       ├── farmer.repository.ts
│   │       └── config.repository.ts
│   │
│   ├── flows/
│   │   └── flow-handler.ts      # Parse response_json, build reply
│   │
│   └── utils/
│       └── logger.ts            # Simple logger
│
├── admin/                       # Admin Portal (React / Vite)
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api/
│       │   └── client.ts        # API client for backend
│       ├── pages/
│       │   ├── Login.tsx        # Admin login
│       │   ├── Dashboard.tsx    # Overview, stats
│       │   ├── Farmers.tsx      # Farmer list, search, export
│       │   ├── Reports.tsx      # Reports, charts, filters
│       │   └── Config.tsx       # Configuration management
│       ├── components/
│       │   ├── Layout.tsx       # Sidebar, header
│       │   ├── DataTable.tsx    # Reusable table
│       │   └── ...
│       └── hooks/
│           └── useAuth.ts
│
├── scripts/
│   ├── deploy-flow.ts           # Create + publish flow via Flows API
│   └── send-flow-message.ts     # Optional: manual trigger test
│
└── docs/                        # Future: RAG, AI, etc.
    └── (placeholder)
```

**Future extensibility:**
- `/services/ai/` — RAG, LLM
- `/admin/pages/` — Additional admin screens

---

## 3. Components Needed

| Component | Purpose |
|-----------|---------|
| **Flow JSON** | Defines 2 screens: Farmer Details + Crop Selection. Uses `navigate` (Screen 1→2) and `complete` (Screen 2). No Data Endpoint required for POC. |
| **Webhook Server** | Express app with GET (verification) and POST (incoming messages). Must be HTTPS when deployed. |
| **Webhook Handler** | Routes incoming payloads: text messages → trigger flow; `nfm_reply` (flow completion) → save to MongoDB and send mock response. |
| **Flow Response Handler** | Parses `response_json` from flow completion, extracts farmer + crop data, **saves to MongoDB**, returns mock confirmation. |
| **Data Service** | MongoDB CRUD: save farmer registrations, read/write app config, write audit logs. |
| **Message Service** | Sends interactive flow message and text messages via WhatsApp Cloud API. |
| **Deploy Script** | Reads flow JSON, calls Flows API to create and publish flow, outputs `flow_id` for config. |
| **Admin Portal** | React SPA for configuration management, reports, and farmer data viewing. |
| **Config** | Centralized env loading (WABA_ID, PHONE_NUMBER_ID, ACCESS_TOKEN, VERIFY_TOKEN, FLOW_ID, MONGODB_URI, ADMIN_*). |

---

## 4. Meta API Endpoints Required

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `https://graph.facebook.com/v21.0/{WABA_ID}/flows` | POST | Create and publish flow (flow_json, publish: true) |
| `https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/messages` | POST | Send interactive flow message or text message |
| Webhook URL (your server) | GET | Verification: `hub.mode`, `hub.verify_token`, `hub.challenge` |
| Webhook URL (your server) | POST | Receive messages and flow completions |

**Graph API version:** Use `v21.0` or latest stable. Check [Meta Changelog](https://developers.facebook.com/docs/whatsapp/flows/changelogs) for Flow JSON version (recommended: 7.3 for new flows).

---

## 5. MongoDB Data Layer

### 5.1 Connection

- Use **Mongoose** for MongoDB connection and schema management.
- Connection string from `MONGODB_URI` env var (e.g., `mongodb://localhost:27017/kweka-jeeto` or Atlas URI).
- Connect on app startup; graceful shutdown on SIGTERM.

### 5.2 Collections and Schemas

| Collection | Schema | Purpose |
|------------|--------|---------|
| **farmers** | `Farmer` | Farmer registrations from Flow completion |
| **config** | `Config` | App configuration (flow CTA text, welcome message, crop options, etc.) |
| **audit_logs** | `AuditLog` | Admin actions, config changes, exports |

### 5.3 Farmer Schema

```ts
{
  wa_id: string,           // WhatsApp user ID (from webhook)
  farmer_name: string,
  age: string,
  profession: string,
  state: string,
  district: string,
  crop: string,
  flow_token?: string,
  createdAt: Date,
  updatedAt: Date
}
```

- Index on `wa_id` for lookups; index on `createdAt` for reports.
- Optional: index on `state`, `crop` for filtering.

### 5.4 Config Schema

```ts
{
  key: string,              // e.g., "flow_cta", "welcome_message"
  value: any,               // string, object, or array
  updatedBy?: string,
  updatedAt: Date
}
```

- Key-value store for admin-managed settings.
- Keys: `flow_cta`, `welcome_message`, `crop_options`, `state_options`, etc.

### 5.5 Audit Log Schema

```ts
{
  action: string,           // e.g., "config_update", "export_farmers"
  userId?: string,
  details?: object,
  createdAt: Date
}
```

### 5.6 Flow Completion → Save Flow

1. Webhook receives `nfm_reply` with `response_json`.
2. Parse `response_json` to extract farmer + crop fields.
3. Extract `wa_id` from webhook `from` field.
4. Call `data.service.createFarmer({ wa_id, ...parsed })`.
5. Save to MongoDB; then send mock WhatsApp reply.

---

## 6. Admin Portal

### 6.1 Overview

- **React + Vite** SPA, served from backend (e.g., `/admin` or separate port) or static build.
- **Simple auth:** Password-protected (env-based `ADMIN_PASSWORD` or JWT). No full user management in POC.
- **Admin API:** REST endpoints under `/api/admin/*` protected by auth middleware.

### 6.2 Admin Portal Features

| Feature | Description |
|---------|-------------|
| **Login** | Simple login form; session/token stored in cookie or localStorage. |
| **Dashboard** | Overview: total farmers, registrations by date, crop distribution, state distribution. |
| **Farmers List** | Table of all farmer registrations. Search, filter by state/crop/date. Export to CSV. |
| **Reports** | Charts (e.g., bar chart by crop, bar chart by state). Date range filter. |
| **Configuration** | Manage key-value config: flow CTA text, welcome message, crop options, state options. |

### 6.3 Admin API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/login` | POST | Authenticate admin; return token/session |
| `/api/admin/farmers` | GET | List farmers (paginated, filterable) |
| `/api/admin/farmers/export` | GET | Export farmers as CSV |
| `/api/admin/reports/summary` | GET | Aggregated stats for dashboard |
| `/api/admin/reports/by-crop` | GET | Count by crop |
| `/api/admin/reports/by-state` | GET | Count by state |
| `/api/admin/config` | GET | Get all config values |
| `/api/admin/config` | PUT | Update config |

### 6.4 Config Management UI

- Form to edit each config key (e.g., text input for `flow_cta`, JSON for `crop_options`).
- Save triggers PUT to `/api/admin/config` and logs to audit_logs.

### 6.5 Deployment

- **Option A:** Admin built as static files; Express serves from `admin/dist` at `/admin`.
- **Option B:** Admin runs on separate port (e.g., 5173 dev, 3001 prod); CORS configured for API.
- **POC:** Option A for simplicity; single `npm run deploy` builds both backend and admin.

---

## 7. Flow JSON Design (POC)

### 7.1 Flow Without Data Endpoint

For this POC, the flow does **not** use a Data Endpoint. All screens are static; navigation uses `navigate` and submission uses `complete`. This avoids encryption, health checks, and endpoint setup.

### 7.2 Screen 1: Farmer Details

| Field | Component | Notes |
|-------|-----------|-------|
| Name | TextInput | `name: "farmer_name"` |
| Age | TextInput | `name: "age"`, optional validation |
| Profession | TextInput or Dropdown | `name: "profession"` |
| State | Dropdown | Indian states (e.g., Maharashtra, Punjab, Karnataka, etc.) |
| District | TextInput | `name: "district"` |

**Footer:** "Continue" → `navigate` to `CROP_SELECTION` with payload `${form.*}`.

### 7.3 Screen 2: Crop Selection

| Field | Component | Notes |
|-------|-----------|-------|
| Crop | Dropdown | Options: Cotton, Paddy, Chilli, Maize, Tomato |

**Footer:** "Submit" → `complete` with payload including farmer details + crop (using global refs: `${screen.FARMER_DETAILS.form.*}`).

### 7.4 Visual Design (Icons / Images)

- Use **TextHeading** with emoji or short labels for clarity (e.g., "👤 Farmer Details", "🌾 Crop Selection").
- Flow JSON supports **Image** component (Flow JSON 5.0+). For POC, text + emoji suffice; icons can be added in later iterations.
- Indian context: Use Hindi/English labels where appropriate; full multilingual support is a future enhancement.

### 7.5 Flow JSON Version

- Use **Flow JSON 7.3** (recommended per [changelog](https://developers.facebook.com/docs/whatsapp/flows/changelogs)).
- No `data_api_version`, `routing_model`, or `endpoint_uri` — endpoint not used.

---

## 8. How the WhatsApp Flow Is Triggered

### 8.1 Trigger Sequence

1. **User sends a message** (e.g., "hi", "start", "कृषि" or any text) to the WhatsApp Business number.
2. **Meta sends webhook** POST to your server with `messages` array.
3. **Webhook handler** identifies message type:
   - If `type: "text"` → trigger flow.
4. **Message service** sends an **interactive message** with `type: "flow"`:
   - `flow_id` or `flow_name`: from env (after deploy)
   - `flow_cta`: e.g., "Register" or "कृषि सलाह शुरू करें"
   - `flow_message_version`: "3"
5. **User sees** a message with a CTA button.
6. **User taps** the button → Flow opens (Screen 1).
7. **User fills** Screen 1 → Continue → Screen 2.
8. **User selects** crop → Submit → Flow completes.
9. **Meta sends webhook** with `interactive.type: "nfm_reply"`, `nfm_reply.response_json` containing flow payload.
10. **Flow response handler** parses payload, **saves to MongoDB**, sends mock text: *"Thank you. Your crop information has been recorded."*

### 8.2 Interactive Flow Message Payload (Reference)

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "<user_wa_id>",
  "type": "interactive",
  "interactive": {
    "type": "flow",
    "header": { "type": "text", "text": "कृषि सलाह / Agri Advisory" },
    "body": { "text": "Register to get crop advisory." },
    "action": {
      "name": "flow",
      "parameters": {
        "flow_message_version": "3",
        "flow_id": "<FLOW_ID>",
        "flow_cta": "Register"
      }
    }
  }
}
```

---

## 9. Deployment Steps

### 9.1 Development Deployment (GitHub Actions)

**No local deployment.** All deployment is via GitHub Actions.

1. **Add GitHub Secrets** (see SETUP.md): WhatsApp tokens, WABA_ID, MONGODB_URI, ADMIN_*, GCP_*, FIREBASE_*.
2. **Run Deploy Flow workflow** (one-time): Actions → Deploy Flow (One-Time) → Run → add printed `FLOW_ID` to secrets.
3. **Push to `main`** (or trigger Deploy workflow manually).
4. **Backend** deploys to GCP Cloud Run.
5. **Admin** deploys to Firebase Hosting (API URL derived from Cloud Run).
6. **Configure Meta webhook** with Cloud Run URL: `https://YOUR_SERVICE.run.app/webhook`.

### 9.2 Deployment Scripts (CI only)

- **Deploy Flow workflow:** Creates and publishes flow via Meta Flows API; outputs `FLOW_ID`.
- **Deploy workflow:** Builds backend Docker image, deploys to Cloud Run; builds admin, deploys to Firebase.

**Note:** Webhook URL = Cloud Run URL. MongoDB Atlas required. No local deployment.

---

## 10. Files to Be Generated by Cursor

### Backend

| File | Description |
|------|-------------|
| `package.json` | Dependencies: express, axios, dotenv, mongoose, typescript, ts-node, etc. Scripts: dev, build, deploy. |
| `tsconfig.json` | TypeScript config for Node. |
| `.env.example` | Placeholders: WHATSAPP_*, WABA_ID, FLOW_ID, MONGODB_URI, ADMIN_PASSWORD. |
| `.gitignore` | node_modules, .env, dist, admin/dist, etc. |
| `flows/farmer-registration.json` | Flow JSON with 2 screens (Farmer Details, Crop Selection). |
| `src/index.ts` | Express app, webhook route, admin API, static admin serve, server listen. |
| `src/config/env.ts` | Load env, validate required vars. |
| `src/api/webhook.ts` | GET: verify (hub.mode, hub.verify_token, hub.challenge). POST: route to webhook service. |
| `src/api/admin.ts` | Admin API routes: login, farmers, reports, config. Auth middleware. |
| `src/services/webhook.service.ts` | Parse webhook body, route text → trigger flow, nfm_reply → flow response handler. |
| `src/services/flow-response.service.ts` | Parse response_json, **save to MongoDB via data.service**, send mock reply. |
| `src/services/message.service.ts` | sendFlowMessage(), sendTextMessage() using Cloud API. |
| `src/services/data.service.ts` | MongoDB CRUD: createFarmer, getFarmers, getConfig, updateConfig, logAudit. |
| `src/data/db.ts` | MongoDB connection (Mongoose). |
| `src/data/models/Farmer.ts` | Farmer schema. |
| `src/data/models/Config.ts` | Config schema. |
| `src/data/models/AuditLog.ts` | AuditLog schema. |
| `src/data/repositories/farmer.repository.ts` | Farmer collection queries. |
| `src/data/repositories/config.repository.ts` | Config collection queries. |
| `src/flows/flow-handler.ts` | Helpers for flow payload parsing. |
| `src/utils/logger.ts` | Simple console logger. |
| `scripts/deploy-flow.ts` | Create and publish flow via Flows API. |
| `README.md` | Setup, env, deploy, test, admin instructions. |

### Admin Portal

| File | Description |
|------|-------------|
| `admin/package.json` | Dependencies: react, react-dom, react-router-dom, vite, etc. |
| `admin/vite.config.ts` | Vite config; build output to `../dist-admin` or similar. |
| `admin/index.html` | HTML entry. |
| `admin/src/main.tsx` | React entry. |
| `admin/src/App.tsx` | Routes: /login, /dashboard, /farmers, /reports, /config. |
| `admin/src/api/client.ts` | Fetch wrapper for /api/admin/*. |
| `admin/src/pages/Login.tsx` | Admin login form. |
| `admin/src/pages/Dashboard.tsx` | Stats cards, quick charts. |
| `admin/src/pages/Farmers.tsx` | Data table, search, filter, export CSV. |
| `admin/src/pages/Reports.tsx` | Charts (by crop, state), date filters. |
| `admin/src/pages/Config.tsx` | Config key-value form. |
| `admin/src/components/Layout.tsx` | Sidebar, header, auth check. |
| `admin/src/components/DataTable.tsx` | Reusable table component. |
| `admin/src/hooks/useAuth.ts` | Auth state, login, logout. |

---

## 11. Potential Blockers and Mitigations

| Blocker | Mitigation |
|---------|------------|
| **Webhook must be HTTPS** | Use a proper host (GCP Cloud Run, etc.) for deployment. |
| **Business verification** | Required for live use. Use test numbers and sandbox during development. |
| **Message template approval** | For **user-initiated** flows, we use **interactive flow** (no template approval). For **business-initiated** flows, a template with Flow button would need approval. POC uses user-initiated only. |
| **Flow JSON validation errors** | Validate flow in [Flow Playground](https://developers.facebook.com/docs/whatsapp/flows/playground) before deploy. Use exact component types and required fields per [Flow JSON reference](https://developers.facebook.com/docs/whatsapp/flows/reference/flowjson). |
| **Indian states/districts** | Use a curated list of major states in dropdown. District as free text for POC; dynamic state–district mapping can be added later. |
| **24h messaging window** | User-initiated: we can send flow within 24h. After 24h, need approved template. POC assumes user messages first. |
| **Flow not opening on WhatsApp Web** | Flows are supported on mobile (iOS 12+, Android 6+). Web support is planned (Dec 2025 per changelog). Test on mobile. |
| **Rate limits** | Cloud API has rate limits. For POC traffic, unlikely to hit; add retry/backoff if needed later. |
| **Access token expiry** | Temporary tokens expire in 24h. Use System User Access Token for deployment. |
| **MongoDB connection** | Ensure MongoDB is running locally or Atlas URI is correct. Handle connection errors gracefully. |
| **Admin auth** | POC uses simple password auth. For enhanced security, consider JWT refresh tokens or OAuth. |

---

## 12. Summary Checklist for POC

- [ ] Flow JSON with 2 screens (Farmer Details, Crop Selection)
- [ ] No Data Endpoint (navigate + complete only)
- [ ] Webhook: GET verify, POST handle messages + flow completion
- [ ] On text message → send interactive flow
- [ ] On flow completion → parse response_json, **save to MongoDB**, send mock text
- [ ] MongoDB Atlas: Farmer, Config, AuditLog schema and repositories
- [ ] Admin Portal: Login, Dashboard, Farmers list, Reports, Config
- [ ] Admin API: protected routes for farmers, reports, config
- [ ] **Development:** GitHub Actions deploy to GCP Cloud Run + Firebase
- [ ] Flow deploy: GitHub Actions workflow (one-time)
- [ ] Env: all from GitHub Secrets / Cloud Run (no local .env)

---

## 13. Next Steps After Plan Approval

1. User approves this plan.
2. Cursor generates all files per Section 10 (backend + admin).
3. User adds GitHub Secrets per SETUP.md.
4. User runs Deploy Flow workflow → adds FLOW_ID to secrets.
5. User pushes to `main` → Backend and Admin deploy.
6. User configures Meta webhook with Cloud Run URL.
7. User tests end-to-end on WhatsApp; verifies data in Admin Portal.

---

*References:*
- [WhatsApp Flows Documentation](https://developers.facebook.com/docs/whatsapp/flows)
- [Sending a Flow](https://developers.facebook.com/docs/whatsapp/flows/guides/sendingaflow)
- [Flows API](https://developers.facebook.com/docs/whatsapp/flows/reference/flowsapi)
- [Receiving Flow Response](https://developers.facebook.com/docs/whatsapp/flows/gettingstarted/receiveflowresponse)
- [Flow JSON Reference](https://developers.facebook.com/docs/whatsapp/flows/reference/flowjson)
