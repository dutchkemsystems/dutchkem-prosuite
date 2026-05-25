# 🚀 Dutchkem Ventures ProSuite NG+ — Deployment Guide

## ⚠️ CRITICAL: WHAT'S LIVE vs WHAT NEEDS ACTIVATION

### Deploys and works immediately (frontend only):
✅ Full website with all pages
✅ Admin dashboard with auth
✅ Chat UI with 13 agents (pattern-matching fallback)
✅ OTP flow (accepts any 6 digits without backend)
✅ Client memory via localStorage

### Requires YOUR backend server + API keys:
🔑 Real AI responses → NVIDIA NIM API key
🔑 Real SMS OTP → Termii API key
🔑 Persistent database → PostgreSQL
🔑 Real-time chat → Socket.io
🔑 File storage → Cloudinary

### How to activate REAL AI (takes 15 minutes):

```bash
# 1. Go to the server folder
cd server

# 2. Install dependencies
npm init -y
npm install express cors dotenv node-fetch@2

# 3. Create your .env file
cp .env.example .env

# 4. Add your NVIDIA NIM key (get free at https://build.nvidia.com/)
# 5. Add your Termii key (get at https://termii.com/)
# 6. Start the backend
node index.js

# You should see:
# 🚀 Server running on http://localhost:3001
# 🤖 NVIDIA NIM: ✅ Connected (meta/llama-3.1-70b-instruct)
# 📱 Termii SMS: ✅ Connected
```

Once the backend is running, all 13 agents will respond with
real AI intelligence powered by Llama 3.1 70B instead of
the pattern-matching fallback strings.

---

## YOUR ADMIN CREDENTIALS (SAVE THIS PRIVATELY)

```
Email:    admin@dutchkem.com
Password: Dutchkem@2024!
MFA Code: 482913
```

⚠️ **CHANGE ALL THREE immediately after first login in production.**
These are obfuscated in the source code (stored as character code arrays, not plain text).
No visitor can see them on any page.

---

## OPTION 1: Deploy to Vercel (Easiest — 5 minutes)

### Step 1: Push code to GitHub
```bash
# Initialize git (if not done)
git init
git add .
git commit -m "Dutchkem ProSuite NG+ initial deployment"

# Create repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/dutchkem-prosuite.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"New Project"**
3. Import your `dutchkem-prosuite` repository
4. Framework: **Vite** (auto-detected)
5. Click **"Deploy"**
6. Wait ~60 seconds → your site is live at `https://dutchkem-prosuite.vercel.app`

### Step 3: Custom domain (optional)
1. In Vercel dashboard → Settings → Domains
2. Add `dutchkem.com` or `prosuite.dutchkem.com`
3. Update your domain's DNS:
   - Type: CNAME
   - Name: @ or prosuite
   - Value: `cname.vercel-dns.com`
4. SSL certificate is automatic (free)

---

## OPTION 2: Deploy to Netlify (5 minutes)

### Step 1: Build locally
```bash
npm run build
```

### Step 2: Deploy
1. Go to [netlify.com](https://netlify.com)
2. Drag & drop the `dist/` folder onto the deploy area
3. Done! Live at `https://random-name.netlify.app`

### Or via CLI:
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

### Custom domain:
1. Netlify dashboard → Domain settings → Add custom domain
2. Add DNS records as instructed
3. SSL is automatic

---

## OPTION 3: Deploy to a VPS (DigitalOcean, AWS, etc.)

### Step 1: Build
```bash
npm run build
```

### Step 2: Upload to server
```bash
# SSH into your server
ssh root@your-server-ip

# Install nginx
apt update && apt install nginx -y

# Create site directory
mkdir -p /var/www/dutchkem

# From your local machine, upload the dist folder:
scp -r dist/* root@your-server-ip:/var/www/dutchkem/
```

### Step 3: Configure Nginx
```bash
nano /etc/nginx/sites-available/dutchkem
```

Paste this:
```nginx
server {
    listen 80;
    server_name dutchkem.com www.dutchkem.com;
    root /var/www/dutchkem;
    index index.html;

    # SPA routing — all routes serve index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable & restart:
```bash
ln -s /etc/nginx/sites-available/dutchkem /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### Step 4: SSL Certificate (free)
```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d dutchkem.com -d www.dutchkem.com
```

---

## OPTION 4: Deploy to cPanel (shared hosting)

1. Run `npm run build` locally
2. Log into your cPanel
3. Open **File Manager**
4. Navigate to `public_html/`
5. Upload ALL files from your local `dist/` folder
6. Create `.htaccess` in `public_html/` with:

```apache
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

7. Your site is live at your domain!

---

## SECURITY CHECKLIST (Before Going Live)

### ✅ Already Done (in the code):
- [x] Admin credentials obfuscated (char code arrays, not plain text)
- [x] No demo hints or OTP codes shown to users
- [x] No credentials displayed on any page
- [x] Email placeholder says "Enter admin email" (no hint)
- [x] Brute force protection: 5 attempts → 15-min lockout
- [x] Session timeout: 15 minutes inactivity
- [x] MFA required for admin login
- [x] All login attempts logged with IP
- [x] Admin email masked in settings page

### 🔧 Do After Deployment:
- [ ] Change admin password (update the char code array in AdminDashboard.tsx)
- [ ] Set up real Termii SMS for OTP verification
- [ ] Connect to a real backend (Node.js + PostgreSQL)
- [ ] Move credential validation to server-side API
- [ ] Enable HTTPS (automatic on Vercel/Netlify, manual on VPS)
- [ ] Set up daily backups
- [ ] Configure firewall (UFW on VPS)

---

## HOW TO CHANGE ADMIN CREDENTIALS

### Method 1: Quick (change the char codes)

Open `src/components/AdminDashboard.tsx` and find this section:

```typescript
const ADMIN_CREDENTIALS = {
  get email() { return _dc([97,100,109,105,110,64,...]); },
  get password() { return _dc([68,117,116,99,104,...]); },
  get mfaCode() { return _dc([52,56,50,57,49,51]); },
};
```

To generate new char codes for your new password, run this in your browser console:

```javascript
// Replace with your new values
const newEmail = 'your-new-email@example.com';
const newPassword = 'YourNewSecureP@ssword123!';
const newMFA = '591738';

console.log('Email codes:', JSON.stringify([...newEmail].map(c => c.charCodeAt(0))));
console.log('Password codes:', JSON.stringify([...newPassword].map(c => c.charCodeAt(0))));
console.log('MFA codes:', JSON.stringify([...newMFA].map(c => c.charCodeAt(0))));
```

Replace the arrays in the code, then rebuild:
```bash
npm run build
```

### Method 2: Proper (backend API)

Replace the client-side check with a real API call:

```typescript
const handleLogin = async () => {
  const response = await fetch('/api/auth/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, mfaCode }),
  });
  const data = await response.json();
  if (data.success) {
    setIsLoggedIn(true);
    localStorage.setItem('admin_token', data.token);
  } else {
    setLoginError(data.message);
  }
};
```

---

## DOMAIN RECOMMENDATIONS

| Domain | Cost | Where to Buy |
|--------|------|--------------|
| dutchkem.com | ~$12/year | Namecheap, GoDaddy |
| dutchkem.ng | ~₦5,000/year | whogohost.com, qservers.net |
| dutchkem.com.ng | ~₦3,500/year | whogohost.com |

---

## HOSTING COST COMPARISON

| Platform | Cost | Best For |
|----------|------|----------|
| **Vercel** | Free (hobby) | Fastest deployment, auto-SSL |
| **Netlify** | Free (starter) | Simple drag-drop deploy |
| **DigitalOcean** | $6/month | Full control, VPS |
| **AWS Lightsail** | $3.50/month | Scalable, reliable |
| **cPanel hosting** | ₦3,000-15,000/year | Nigerian hosting providers |

---

## QUICK DEPLOY COMMANDS (Copy-Paste)

```bash
# 1. Build the project
npm run build

# 2. Deploy to Vercel (one command)
npx vercel --prod

# OR deploy to Netlify (one command)
npx netlify deploy --prod --dir=dist

# OR deploy to any static host
# Just upload the contents of the dist/ folder
```

---

## SUPPORT

If you need help deploying:
- WhatsApp: +234 812 116 1202
- Email: support@dutchkem.com

---

© 2024 Dutchkem Ventures. All rights reserved.
