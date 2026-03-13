# Kweka Jeeto — Development Deployment Guide

**Development system (production-like).** No local deployment. All deployments go through GitHub Actions to GCP (backend) and Firebase (admin portal).

---

## 1. GitHub Secrets (Store These One by One)

Add these in your GitHub repository: **Settings → Secrets and variables → Actions → New repository secret**.

### WhatsApp / Meta (from [Meta Developer Console](https://developers.facebook.com/))

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `WHATSAPP_ACCESS_TOKEN` | Meta Graph API access token | Meta App → WhatsApp → API Setup → Use **System User** token |
| `WHATSAPP_PHONE_NUMBER_ID` | Phone number ID for sending messages | Meta App → WhatsApp → API Setup → Phone number ID |
| `WHATSAPP_VERIFY_TOKEN` | Webhook verification token (you choose) | Create a random string, e.g. `prod-verify-xyz-123` |
| `WABA_ID` | WhatsApp Business Account ID (optional for Deploy Flow) | From Meta → WhatsApp → API Setup. If not set, Deploy Flow tries to resolve WABA from the token (needs `business_management` + `whatsapp_business_management`) or from **WHATSAPP_PHONE_NUMBER_ID** when you have multiple WABAs. |
| `FLOW_ID` | Flow ID (obtained from Deploy Flow workflow) | Run **Deploy Flow** workflow once → add printed FLOW_ID to secrets |

### MongoDB (from [MongoDB Atlas](https://cloud.mongodb.com/))

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `MONGODB_URI` | MongoDB connection string | Atlas → Database → Connect → Driver → Node.js → Copy URI. Use **Atlas** (not local). |

### Admin Portal

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `ADMIN_PASSWORD` | Admin login password | Choose a strong password |
| `ADMIN_PASSWORD_HASH` | Bcrypt hash (optional, more secure) | Run: `node scripts/generate-password-hash.js yourpassword` |
| `ADMIN_JWT_SECRET` | JWT signing secret | `openssl rand -base64 32` |

### GCP (Backend on Cloud Run)

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `GCP_PROJECT_ID` | GCP project ID | GCP Console → Project selector |
| `GCP_SA_KEY` | Service account JSON key | IAM → Service Accounts → Create → Keys → Add JSON key |

### Firebase (Admin Portal)

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `FIREBASE_PROJECT_ID` | Firebase project ID | Firebase Console → Project Settings |

**Note:** Admin is deployed using the same **GCP_SA_KEY** as the backend. The service account must have **Firebase Hosting Admin** (or **Firebase Admin**) role on the Firebase project — add it in Firebase Console → Project Settings → Users and permissions, or in GCP IAM. `FIREBASE_TOKEN` is no longer used.

If you use the **Deploy to Firebase Hosting on merge** workflow (in addition to or instead of the main **Deploy** workflow), add secret **VITE_API_URL** with your Cloud Run backend URL (e.g. `https://kweka-jeeto-744226784105.asia-south1.run.app`) so that Dashboard and Reports can load. The main **Deploy** workflow sets this automatically from the backend deploy output.

---

## 2. One-Time: Deploy WhatsApp Flow

1. Add **WHATSAPP_ACCESS_TOKEN** to GitHub Secrets. Add **WABA_ID** and/or **WHATSAPP_PHONE_NUMBER_ID** (at least one required). You do not need to create a token per WABA: the script can resolve the WABA from the same token if it has `business_management` and `whatsapp_business_management` (and **WHATSAPP_PHONE_NUMBER_ID** helps when the business has multiple WABAs).
2. Go to **Actions → Deploy Flow (One-Time)**.
3. Click **Run workflow**.
4. After it completes, copy the printed `FLOW_ID` and add it as a GitHub Secret.

**If Step 1 OK but Step 2 fails (WABA check FAILED, code 100, subcode 33):** The token is valid but Meta rejects the WABA ID or the token cannot access that business account. Do the following in order:

1. **Fix WABA_ID (most common):**
   - In [Meta for Developers](https://developers.facebook.com/) → Your App → **WhatsApp** → **API Setup**.
   - On that page you see **two different IDs**: **"Phone number ID"** and **"WhatsApp Business Account ID"**.
   - The **WABA_ID** secret must be the **WhatsApp Business Account ID** (the business account), not the Phone number ID.
   - Copy the **WhatsApp Business Account ID** → GitHub **Settings → Secrets and variables → Actions** → edit **WABA_ID** → paste and save.

2. **Fix token permissions (if WABA_ID is already correct):**
   - The token must be a **System User** token (not the temporary token from the API Setup page).
   - In **Meta Business Settings** → **Users** → **System Users** → select the user used for the app → **Add Assets** → your App → enable **whatsapp_business_management** (and optionally **whatsapp_business_messaging**).
   - **Generate a new token** for that System User with **whatsapp_business_management**.
   - Update the **WHATSAPP_ACCESS_TOKEN** GitHub secret with this new token and re-run **Deploy Flow (One-Time)**.

3. **Confirm app is linked to the right WABA:** In Meta for Developers → Your App → WhatsApp → API Setup, the listed "WhatsApp Business Account" should be the one you expect. If you have multiple accounts, ensure the correct one is connected.

---

## 3. Development Deployment Order

1. Add all GitHub secrets (except `FLOW_ID` initially).
2. Run **Deploy Flow (One-Time)** workflow → add `FLOW_ID` to secrets.
3. Push to `main` (or run **Deploy** workflow manually).
4. Backend deploys to GCP Cloud Run.
5. Admin deploys to Firebase Hosting (API URL is set automatically from Cloud Run).
6. Configure Meta webhook with your Cloud Run URL (see Section 5).

---

## 4. GCP Setup (Backend)

1. Create a GCP project (or use existing).
2. Enable APIs: **Cloud Run API**, **Artifact Registry API**.
3. Create a service account with these roles (all required for the deploy workflow):
   - **Cloud Run Admin** — to deploy the service
   - **Artifact Registry Writer** — to push the Docker image (without this you get `Permission 'artifactregistry.repositories.uploadArtifacts' denied`)
   - **Service Account User** — so Cloud Run can use the runtime identity
   - **Firebase Hosting Admin** (or **Firebase Admin**) — so the same key can deploy the admin app to Firebase Hosting (add in Firebase Console or GCP IAM for the same project)
   - *(Optional)* **Storage Admin** — only if you use GCS elsewhere
4. Create a JSON key for that service account → add the full JSON as `GCP_SA_KEY` secret.
5. Create the Artifact Registry repository in the **same region** as Cloud Run (e.g. `asia-south1`):
   ```bash
   gcloud artifacts repositories create cloud-run-source-deploy \
     --repository-format=docker --location=asia-south1
   ```
   If the repository already exists in a different region, either create a new one in `asia-south1` or change `REGION` in `.github/workflows/deploy.yml` to match.

---

## 5. Firebase Setup (Admin Portal)

1. Create a Firebase project (or use existing; usually the same as your GCP project).
2. Enable **Hosting**.
3. Add **FIREBASE_PROJECT_ID** to GitHub Secrets (Firebase Console → Project Settings → Project ID).
4. Grant the **same service account** used for Cloud Run (the one in `GCP_SA_KEY`) the **Firebase Hosting Admin** role: Firebase Console → Project Settings → Users and permissions → Add member → enter the service account email → role **Firebase Hosting Admin**. Or in GCP Console → IAM, add role **Firebase Hosting Admin** for that service account.

---

## 6. MongoDB Atlas Setup

1. Create a cluster at [cloud.mongodb.com](https://cloud.mongodb.com/).
2. Create a database user.
3. **Network Access:** Add `0.0.0.0/0` (allow Cloud Run).
4. Copy connection string → add as `MONGODB_URI` secret.
5. **Test connectivity:** In GitHub → **Actions** → **Test MongoDB connection** → **Run workflow**. It uses your `MONGODB_URI` secret and reports OK or the error. You can also run locally: `MONGODB_URI="your-uri" npm run test:mongodb`.

---

## 7. Meta Webhook Configuration

After the first successful deploy:

1. Meta Developer Console → Your App → WhatsApp → Configuration (or use the Graph API to set the webhook).
2. **Webhook URL:** `https://YOUR_CLOUD_RUN_URL/webhook`  
   (Get URL from Cloud Run console or from the deploy workflow logs. Must be HTTPS and publicly reachable.)
3. **Verify Token:** Must be **exactly the same** as your **`WHATSAPP_VERIFY_TOKEN`** GitHub Secret.  
   - This is a **custom string you choose** (e.g. `prod-verify-xyz-123`), **not** the Facebook/Meta access token.  
   - If you set the webhook via API (`override_callback_uri` and `verify_token`), use the same value as `WHATSAPP_VERIFY_TOKEN` for `verify_token`. Using the access token as `verify_token` will cause **403 Callback verification failed**.
4. Subscribe to **messages**.

**Quick test (no WhatsApp needed):** From your machine, send a sample webhook payload to confirm the endpoint is reachable and returns 200:

```bash
WEBHOOK_URL=https://YOUR_CLOUD_RUN_URL/webhook ./scripts/test-webhook.sh
```

Replace `YOUR_CLOUD_RUN_URL` with your actual URL (e.g. `kweka-jeeto-744226784105.asia-south1.run.app`). If you get "OK: Webhook returned 200", the subscription is working. To receive the flow on your phone, edit `scripts/test-webhook.sh` and set the `"from"` number to your WhatsApp number (with country code, no +), then run the script again.

---

## 8. Configurable Settings (Admin Portal)

After deployment, change these from **Admin Portal → Config** (no redeploy):

- `flow_cta` — Flow button text
- `flow_header` — Flow message header
- `flow_body` — Flow message body
- `flow_completion_message` — Message after flow submission
- `whatsapp_phone_number_id` — Override Meta business number
- `flow_id` — Override Flow ID

---

## 9. Troubleshooting

| Error | Cause | Fix |
|-------|--------|-----|
| `Permission 'artifactregistry.repositories.uploadArtifacts' denied` | Service account cannot push Docker images | In GCP: IAM → find the service account used in `GCP_SA_KEY` → add role **Artifact Registry Writer**. Ensure the Artifact Registry repo exists in the same region as in the workflow (e.g. `asia-south1`). |
| **Container failed to start and listen on PORT** | App not listening on `0.0.0.0`, wrong port, or crash before listen | The app uses empty defaults for secrets so it always starts and listens. (1) Ensure the process binds to **0.0.0.0** and the port from `PORT` (default 8080). (2) Check **Cloud Run → Logs** for the real error. If the container still fails, increase the **Startup CPU boost** or **Initialization timeout** in Cloud Run. |
| **Secrets not set (webhook/admin/DB fail at runtime)** | GitHub Secrets missing or empty | Set all required secrets in **Settings → Secrets and variables → Actions** (WHATSAPP_*, WABA_ID, FLOW_ID, MONGODB_URI, ADMIN_PASSWORD, ADMIN_JWT_SECRET). Redeploy so Cloud Run receives them. The container will start either way; features need secrets to work. |
| **MongooseError: Operation 'configs.findOne()' buffering timed out** or **ENOTFOUND** / **querySrv** for `*mongodb.net` | MongoDB not reachable from Cloud Run (wrong URI, or Atlas network not allowing Cloud Run). | Check **MONGODB_URI** in GitHub Secrets: use the full Atlas connection string (e.g. `mongodb+srv://user:pass@cluster.xxxxx.mongodb.net/dbname`). In MongoDB Atlas → Network Access, add **0.0.0.0/0** so Cloud Run can connect. The app now falls back to env vars for flow/config when DB is unreachable, but saving farmers and admin config need a working DB. |
| **Firebase: Failed to authenticate** or **hosting target of a site with no site name** | Auth uses **GCP_SA_KEY**; service account needs Firebase Hosting Admin. Or `firebase.json` site not set. | Ensure the service account in **GCP_SA_KEY** has **Firebase Hosting Admin** on the Firebase project (Firebase Console → Project Settings → Users and permissions). The workflow injects the hosting site from **FIREBASE_PROJECT_ID**; ensure that secret is set. |
| **Meta webhook: Callback verification failed, HTTP 403** | The **verify_token** you sent to Meta does not match **WHATSAPP_VERIFY_TOKEN** in your app. | **Verify token** must be a custom string (e.g. `prod-verify-xyz-123`), **not** the Facebook access token. Set it to the **exact same** value as the **WHATSAPP_VERIFY_TOKEN** GitHub Secret. Then update the webhook in Meta (Dashboard or API) with this verify token and retry. |
| Meta error 100, subcode 33 (Deploy Flow) | Wrong `WABA_ID` or invalid/insufficient token | See Section 2 (troubleshooting under Deploy WhatsApp Flow). Use WhatsApp Business Account ID and a System User token with `whatsapp_business_management`. |
| Meta error 139002 "Flow JSON validation" (Deploy Flow) | Invalid Flow JSON structure | Flow was created as draft but publish failed. Use Flow JSON version **5.0**; use **data_source** as a direct array of `{ "id", "title" }` for static dropdowns; use **data: {}** on screens (no `__example__`); avoid invalid characters in titles. Re-run Deploy Flow after fixing `flows/farmer-registration.json`. |
| Meta error 100, subcode 4016019 "Flow name is not unique" (Deploy Flow) | A flow with that name already exists on the WABA | The script uses a unique name (e.g. `farmer_registration_poc_v2`). If you see this again, change the flow `name` in `scripts/deploy-flow.ts` to a new value (e.g. `_v3`) and re-run. |

---

## 10. Development Checklist

| Item | Where |
|------|-------|
| WhatsApp tokens, WABA, Phone ID | GitHub Secrets |
| MongoDB URI (Atlas) | GitHub Secrets |
| Admin password, JWT secret | GitHub Secrets |
| GCP project ID, service account key | GitHub Secrets |
| Firebase project ID, CI token | GitHub Secrets |
| Flow ID | From Deploy Flow workflow → GitHub Secrets |
| API base URL | Auto-derived from Cloud Run (no secret needed) |

---

## 11. No Local Deployment

- No `npm run dev` for deployment use.
- No ngrok or local webhook.
- All deployment via GitHub Actions.
- Backend: GCP Cloud Run  
- Admin: Firebase Hosting  
- Database: MongoDB Atlas  
