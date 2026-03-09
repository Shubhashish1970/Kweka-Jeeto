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
| `WABA_ID` | WhatsApp Business Account ID | Meta App → WhatsApp → API Setup → WhatsApp Business Account ID |
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
| `FIREBASE_TOKEN` | CI token for deploy | Run `firebase login:ci` (from any machine), copy token |

**Note:** `API_BASE_URL` is **not** required. The workflow derives it from the Cloud Run URL after deploy.

---

## 2. One-Time: Deploy WhatsApp Flow

1. Add `WHATSAPP_ACCESS_TOKEN` and `WABA_ID` to GitHub Secrets.
2. Go to **Actions → Deploy Flow (One-Time)**.
3. Click **Run workflow**.
4. After it completes, copy the printed `FLOW_ID` and add it as a GitHub Secret.

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
3. Create a service account with roles: **Cloud Run Admin**, **Storage Admin**, **Service Account User**.
4. Create a JSON key → add full JSON as `GCP_SA_KEY` secret.
5. Create Artifact Registry repository (if needed):
   ```bash
   gcloud artifacts repositories create cloud-run-source-deploy \
     --repository-format=docker --location=us-central1
   ```

---

## 5. Firebase Setup (Admin Portal)

1. Create a Firebase project (or use existing).
2. Enable **Hosting**.
3. Run `firebase login:ci` → add token as `FIREBASE_TOKEN` secret.

---

## 6. MongoDB Atlas Setup

1. Create a cluster at [cloud.mongodb.com](https://cloud.mongodb.com/).
2. Create a database user.
3. **Network Access:** Add `0.0.0.0/0` (allow Cloud Run).
4. Copy connection string → add as `MONGODB_URI` secret.

---

## 7. Meta Webhook Configuration

After the first successful deploy:

1. Meta Developer Console → Your App → WhatsApp → Configuration.
2. **Webhook URL:** `https://YOUR_CLOUD_RUN_URL/webhook`  
   (Get URL from Cloud Run console or from the deploy workflow logs.)
3. **Verify Token:** Same as `WHATSAPP_VERIFY_TOKEN` secret.
4. Subscribe to `messages`.

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

## 9. Development Checklist

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

## 10. No Local Deployment

- No `npm run dev` for deployment use.
- No ngrok or local webhook.
- All deployment via GitHub Actions.
- Backend: GCP Cloud Run  
- Admin: Firebase Hosting  
- Database: MongoDB Atlas  
