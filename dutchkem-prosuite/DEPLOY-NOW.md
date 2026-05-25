# 🚀 DEPLOY DUTCHKEM PROSUITE — DO THESE 4 STEPS

Everything is pre-configured. Just follow these steps in order.

---

## STEP 1: Configure Google OAuth (5 minutes)

**You need to set up your own Google OAuth credentials in Google Cloud Console.**

1. Open: https://console.cloud.google.com
2. Create a new project or select existing
3. Go to: APIs & Services → Credentials → Create Credentials → OAuth client ID
4. Add to **Authorized JavaScript origins**:
   ```
   http://localhost:5173
   http://localhost:3001
   https://your-vercel-app.vercel.app
   ```
5. Add to **Authorized redirect URIs**:
   ```
   http://localhost:3001/auth/google/callback
   https://your-render-app.onrender.com/auth/google/callback
   ```
6. Click SAVE

Then set the `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in your Render env vars.

---

## STEP 2: Push to GitHub (5 minutes, one-time)

Open Command Prompt on your Windows 11 (Win + R → cmd → Enter):

```cmd
cd C:\path\to\your\dutchkem-prosuite

git init
git add .
git commit -m "Dutchkem ProSuite NG+ v1.0"
```

Go to https://github.com → Sign in → Click "+" → "New repository"
- Name: dutchkem-prosuite  
- Private: YES ✅
- Click "Create repository"

Back in Command Prompt:
```cmd
git remote add origin https://github.com/YOUR_USERNAME/dutchkem-prosuite.git
git branch -M main
git push -u origin main
```

Enter your GitHub username + Personal Access Token when asked.
(Get token: GitHub → Settings → Developer settings → Personal access tokens → Generate new token → Select all scopes → Create)

---

## STEP 3: Deploy Backend to Render (5 minutes)

1. Open: https://render.com → Sign up with GitHub
2. Click "New" → "Web Service"
3. Connect your dutchkem-prosuite repository
4. Configure:
   - **Name:** dutchkem-api
   - **Root Directory:** server
   - **Runtime:** Node
   - **Build Command:** npm install
   - **Start Command:** node index.js
   - **Plan:** Free
5. Click "Environment" tab → Add these variables:

| Key | Value |
|-----|-------|
| KEY | VALUE |
|-----|-------|
| (Set each key in Render's dashboard — never commit secrets) | |

6. Click "Deploy Web Service"
7. Wait 3 minutes → note your URL: `https://dutchkem-api.onrender.com`
8. Test: Open `https://dutchkem-api.onrender.com/api/health` in browser
   - Should show: `"nvidia_nim": "live"`

**IMPORTANT:** After Render gives you the URL, go back to Google Cloud Console:
- Credentials → Edit your OAuth client
- Add to "Authorized redirect URIs":
  ```
  https://dutchkem-api.onrender.com/auth/google/callback
  ```
- Click SAVE

---

## STEP 4: Deploy Frontend to Vercel (3 minutes)

1. Open: https://vercel.com → Sign up with GitHub
2. Click "Add New" → "Project"
3. Import dutchkem-prosuite repository
4. It auto-detects Vite — just click "Deploy"
5. Wait 60 seconds → live at: `https://dutchkem-prosuite.vercel.app`

**IMPORTANT:** Go back to Google Cloud Console:
- Credentials → Edit your OAuth client
- Add to "Authorized JavaScript origins":
  ```
  https://dutchkem-prosuite.vercel.app
  ```
- Click SAVE

---

## ✅ YOU'RE LIVE!

Open: https://dutchkem-prosuite.vercel.app

Test:
1. Click "Get Started"
2. Click "Continue with Google" → Google login should appear
3. Select your account → auto-redirected back, logged in
4. Pick any agent → chat → verify AI responds intelligently
5. Go to /admin → log in with admin credentials
6. Set up Google Authenticator on first admin login

---

## 🔧 AFTER DEPLOYMENT: Update Backend URL in Frontend

You need to update one file so the frontend knows where the backend is:

Edit `src/services/ai.ts` — change:
```typescript
const API_ENDPOINTS = [
  '/api',
  'http://localhost:3001/api',
  'http://127.0.0.1:3001/api',
];
```
To:
```typescript
const API_ENDPOINTS = [
  '/api',
  'https://dutchkem-api.onrender.com/api',
];
```

Do the same in `src/services/termii.ts`.

And in `src/components/ChatPage.tsx`, find the Google button and update:
```typescript
window.location.href = 'https://dutchkem-api.onrender.com/auth/google';
```

Then push the update:
```cmd
git add .
git commit -m "Connect to production backend"
git push
```

Vercel auto-deploys in 60 seconds. Done!

---

## 📱 Custom Domain (optional)

In Vercel → Settings → Domains → Add your domain (e.g., dutchkem.com)
Then add that domain to Google Cloud Console authorized origins too.

---

## 🔐 Credentials

Set all API keys and secrets via your hosting provider's environment variable dashboard. Never commit secrets to git.
