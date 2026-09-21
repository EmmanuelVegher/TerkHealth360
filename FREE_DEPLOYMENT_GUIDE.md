# 🚀 100% Free Deployment Guide for Hospital Management Platform

This guide outlines how to deploy the entire Hospital Management System **for 100% free** using **Render.com** (Backend), **Firebase Hosting** (Frontend), and **Neon** (Database).

---

## 📋 Architecture & URLs
- **Frontend**: `https://<your-project>.web.app` (Firebase Hosting)
- **Backend**: `https://smart-hospital-backend.onrender.com` (Render.com Web Service)
- **Database**: Neon Serverless PostgreSQL (`NEON_DATABASE_URL`)
- **Monnify Webhook**: `https://smart-hospital-backend.onrender.com/api/monnify/webhook`

---

## STEP 1: Database (Neon PostgreSQL) — FREE
Your Neon Database is already configured in `.env` as `NEON_DATABASE_URL`.
1. Ensure your connection string ends with `?sslmode=require`.

---

## STEP 2: Deploy Backend to Render.com — FREE
1. Push this project repository to **GitHub**.
2. Go to [https://dashboard.render.com](https://dashboard.render.com).
3. Click **New +** → **Blueprint**.
4. Connect your GitHub repository. Render will automatically detect `render.yaml`!
5. In the Environment Variables section, fill in:
   - `DATABASE_URL`: Paste your Neon connection string (`NEON_DATABASE_URL`).
   - `MONNIFY_API_KEY`: `MK_TEST_SAF7HR5F3F` (or your live key)
   - `MONNIFY_SECRET_KEY`: `4SY6TNL8CK7AGJCTLD3CJNMCQHGV4QP3` (or your live key)
   - `MONNIFY_CONTRACT_CODE`: `4934121686` (or your live contract code)
   - `CORS_ORIGIN`: `*` (or your Firebase Hosting domain once created)
6. Click **Apply**. Render will build the Docker container and deploy your backend!

---

## STEP 3: Deploy Frontend to Firebase Hosting — FREE
1. Install Firebase CLI globally if you haven't already:
   ```bash
   npm install -g firebase-tools
   ```
2. Log in to Firebase:
   ```bash
   firebase login
   ```
3. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
4. Build the production bundle:
   ```bash
   npm run build
   ```
5. Deploy to Firebase Hosting:
   ```bash
   npx firebase-tools deploy --only hosting
   ```

---

## STEP 4: Keep Render Backend Active 24/7 (Free Keep-Alive)
Render free instances go to sleep after 15 minutes of inactivity. To keep it awake 24/7 so Monnify webhooks and hospital requests work instantly:
1. Sign up for a free account at [https://uptimerobot.com](https://uptimerobot.com).
2. Click **Add New Monitor**.
3. **Monitor Type**: HTTP(s)
4. **URL**: `https://smart-hospital-backend.onrender.com/health`
5. **Monitoring Interval**: 5 minutes.
6. Click **Create Monitor**. Render will now stay online 24/7 for free!

---

## STEP 5: Register Monnify Webhook URL
Now that your backend is live on Render:
1. Log in to your **Monnify Dashboard** ([https://app.monnify.com](https://app.monnify.com) or Sandbox).
2. Go to **Settings** → **Webhooks & APIs**.
3. Paste your Webhook URL:
   `https://smart-hospital-backend.onrender.com/api/monnify/webhook`
4. Save settings. Every time a patient transfers funds to their virtual account, Monnify will instantly credit their hospital E-Wallet!
