# Kweka Jeeto — WhatsApp Agricultural Advisory Chatbot

A development system (production-like) for WhatsApp-based agricultural advisory chatbot using Meta WhatsApp Cloud API and WhatsApp Flows.

## Deployment Model

- **Development** — No local deployment. All deployments via GitHub Actions.
- **Backend:** GCP Cloud Run
- **Admin Portal:** Firebase Hosting
- **Database:** MongoDB Atlas

## Quick Start (Development)

1. Add GitHub Secrets (see [SETUP.md](./SETUP.md)).
2. Run **Deploy Flow (One-Time)** workflow → add `FLOW_ID` to secrets.
3. Push to `main` → Backend and Admin deploy automatically.
4. Configure Meta webhook with your Cloud Run URL.

See [SETUP.md](./SETUP.md) for the full development deployment guide.

## Features

- WhatsApp Flow (2 screens: Farmer Details + Crop Selection)
- MongoDB persistence
- Admin Portal (Dashboard, Farmers, Reports, Config)
- Configurable Meta business number and flow settings via Admin
- GitHub Actions CI/CD

## Project Structure

```
├── src/           # Backend (Express, webhook, services)
├── admin/         # Admin Portal (React + Vite)
├── flows/         # WhatsApp Flow JSON
├── scripts/       # Deploy flow script
└── .github/       # GitHub Actions
```
