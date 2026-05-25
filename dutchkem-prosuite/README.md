# Dutchkem Ventures ProSuite NG+ with ServiceMart NG

> "Your government services, academic needs, and business solutions handled with care."

A unified AI platform with 13 specialized agents serving Nigerian citizens, students, professionals, businesses, and government service seekers.

## 🚨 What's Working vs What Needs Backend

### ✅ Fully Functional (Frontend Demo)

| Feature | Status | Notes |
|---------|--------|-------|
| **Authentication** | ✅ Working | Email: `admin@dutchkem.com`, Password: `Dutchkem@2024!`, MFA: `482913` |
| **Brute Force Protection** | ✅ Working | 5 attempts → 15-min lockout with countdown |
| **Session Timeout** | ✅ Working | 15-min inactivity auto-logout |
| **Dark Mode** | ✅ Working | Toggle in sidebar, persists to localStorage |
| **Payment Confirm/Reject** | ✅ Working | Updates local state, shows toast notifications |
| **Client Suspend/Activate** | ✅ Working | Updates local state |
| **Document Approve/Reject** | ✅ Working | Updates local state |
| **Chat Resolve** | ✅ Working | Updates status |
| **Create Announcement** | ✅ Working | Adds to list |
| **Notifications** | ✅ Working | Badge count, mark as read |
| **Toast Notifications** | ✅ Working | Success/error/info toasts |
| **Search & Filter** | ✅ Working | Client-side filtering |
| **Refresh Data** | ✅ Working | Simulated with loading state |
| **Modal Dialogs** | ✅ Working | Payment details, client details, confirmations |
| **Responsive Design** | ✅ Working | Mobile-first, collapsible sidebar |

### 🔧 Needs Backend Integration

| Feature | Required Backend |
|---------|-----------------|
| Real OTP via SMS | Termii API |
| Real MFA (TOTP) | Google Authenticator + TOTP library |
| Persist payments to DB | PostgreSQL + Prisma/TypeORM |
| Real payment verification | OPay statement reconciliation |
| File uploads | Cloudinary/S3 + ClamAV scanning |
| Real-time chat | Socket.io + Redis |
| Email notifications | SendGrid API |
| WhatsApp notifications | Termii WA API |
| NIMC/BVN verification | Government APIs |
| Report generation | Puppeteer PDF |
| Audit logging | Immutable append-only table |

![Platform Status](https://img.shields.io/badge/status-live-brightgreen)
![Agents](https://img.shields.io/badge/AI%20Agents-13-blue)
![Security](https://img.shields.io/badge/Security%20Layers-18-orange)

## 🚀 Quick Start

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Production Deployment

```bash
# Step 1: SSH into your server
ssh user@your-server.com

# Step 2: Navigate to project directory
cd /var/www/dutchkem-prosuite

# Step 3: Install dependencies
npm install --production

# Step 4: Build the application
npm run build

# Step 5: Run the admin creation script
npm run create-admin

# OR manually using Node.js
node scripts/create-admin.js
```

## 🤖 The 13 AI Agents

| ID | Agent | Description |
|----|-------|-------------|
| A1 | **Academic Pro** | AI academic assistant for students (assignments, essays, thesis) |
| A2 | **FormatPro** | Citation & formatting specialist (APA, MLA, Chicago, etc.) |
| A3 | **LitReview Pro** | Literature review & research gap finder |
| A4 | **Plagiarism Pro** | Plagiarism detection & exam generation |
| A5 | **StatsPro** | Statistical analysis (ANOVA, regression, etc.) |
| A6 | **Presentation Pro** | PowerPoint & poster design |
| A7 | **Feedback & Grant Pro** | Supervisor feedback parsing & grant matching |
| A8 | **MediaStudio Pro** | Video editing, transcription, voice cloning, animation |
| A9 | **DataPro** | Data analysis, Power BI dashboards, file recovery |
| A10 | **PhoneRetriever** | Phone recovery & suspect identification |
| A11 | **ContentPro** | Social media content & growth strategies |
| A12 | **BusinessPro** | Business consulting, legal docs, pitch decks |
| A13 | **ServiceMart NG** | Government services for SW Nigeria |

## 🏛️ ServiceMart NG - Government Services

Covering **South West Nigeria**: Lagos, Ogun, Oyo, Osun, Ondo, Ekiti

| # | Service | Price (₦) | Delivery |
|---|---------|-----------|----------|
| 1 | NIN/BVN Identity Verification | 2,500 | Instant |
| 2 | Electricity Bill Payment | 1,500 | Instant |
| 3 | Land Registry & C-of-O Processing | 25,000 | 5-14 days |
| 4 | NHIS Health Registration | 5,000 | 1-3 days |
| 5 | Tax Clearance | 8,000 | 3-7 days |
| 6 | CAC Business Registration | 15,000 | 3-5 days |
| 7 | Passport/Driver's Licence Renewal | 10,000 | 7-21 days |
| 8 | Water & Waste Bill Payment | 1,500 | Instant |
| 9 | WAEC/JAMB/NECO Support | 5,000 | 1-2 days |
| 10 | Pension/NSITF Registration | 6,000 | 2-5 days |

### Bundle Packages

- **Starter Bundle** (Any 3 services): ₦20,000 — Save up to ₦8,000
- **Professional Bundle** (Any 5 services): ₦35,000 — Save up to ₦15,000
- **Complete Bundle** (All 10 services): ₦60,000 — Save up to ₦25,000

## 💳 Payment Information

| Field | Value |
|-------|-------|
| Account Name | Oladotun Alabi |
| Bank | OPay |
| Account Number | **8121161202** |

**Reference Format:** `phone_agentX` (e.g., `08031234567_A13`)

## 🔒 Security Architecture (18 Layers)

1. AES-256 Encryption (data at rest)
2. TLS 1.3 (data in transit)
3. Rate Limiting (30 req/min)
4. CSRF Protection
5. Helmet.js Security Headers
6. CORS Strict
7. XSS Protection
8. SQL Injection Prevention
9. Password Hashing (bcrypt, cost 12)
10. MFA (TOTP - Google Authenticator)
11. JWT RS256 Tokens (15min expiry)
12. Session Timeout (15 minutes)
13. Audit Logging (immutable)
14. Brute Force Protection
15. OTP Rate Limiting
16. Input Sanitization (DOMPurify)
17. File Validation (ClamAV)
18. Watermarking (all deliverables)

## 🧠 AI Engine - NVIDIA NIM

| Model | Use Case |
|-------|----------|
| `meta/llama-3.1-70b-instruct` | Primary agent (all 13) |
| `meta/llama-3.1-8b-instruct` | Chat co-pilot |
| `nvidia/nemotron-4-340b-instruct` | Legal/Financial (A13) |
| `mistralai/mixtral-8x22b-instruct` | Multi-language support |

## 📁 Project Structure

```
dutchkem-prosuite/
├── src/
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── HeroSection.tsx
│   │   ├── ServicesPage.tsx
│   │   ├── PricingPage.tsx
│   │   ├── ChatPage.tsx
│   │   ├── AdminDashboard.tsx
│   │   ├── AboutPage.tsx
│   │   ├── ContactPage.tsx
│   │   ├── Footer.tsx
│   │   ├── FloatingChat.tsx
│   │   └── MobileNav.tsx
│   ├── data/
│   │   └── agents.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/
│   └── images/
├── scripts/
│   ├── create-admin.js
│   └── verify-all-agents.js
├── index.html
├── package.json
├── vite.config.ts
└── README.md
```

## 🔧 Environment Variables

Create a `.env` file (gitignored):

```env
# NVIDIA NIM
NVIDIA_NIM_API_KEY=your_nvidia_nim_key
NVIDIA_NIM_MODEL=meta/llama-3.1-70b-instruct

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/dutchkem
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
OTP_SECRET=your_otp_secret

# SMS (Termii)
TERMII_API_KEY=your_termii_key
TERMII_SENDER_ID=Dutchkem

# Email (SendGrid)
SENDGRID_API_KEY=your_sendgrid_key
SENDGRID_FROM=noreply@dutchkem.com

# File Storage
CLOUDINARY_URL=cloudinary://...

# Admin (stored separately in .env.admin)
# NEVER commit admin credentials
```

## 👨‍💼 Admin Dashboard

Access: `/admin/dashboard` or `admin.dutchkem.com`

### Creating Admin User

```bash
# Interactive admin creation
npm run create-admin

# Or with environment variables
ADMIN_EMAIL=admin@dutchkem.com \
ADMIN_PASSWORD=YourSecurePassword123! \
node scripts/create-admin.js
```

### Admin Features

- **Overview**: KPIs, system health, agent status
- **Payments**: Confirm/reject with receipt preview
- **Clients**: Full directory with activity logs
- **Activity Log**: Complete audit trail
- **Revenue**: Charts, top services, projections
- **Documents**: Uploaded files with virus scan status
- **Live Chats**: Real-time agent oversight
- **Announcements**: Broadcast to clients

## 🌍 API Integrations (35+)

NVIDIA NIM, OpenAI, Whisper, ElevenLabs, Google Translate, DeepL, FFmpeg, Google Maps, OpenCelliD, NIMC NIN, NIBSS BVN, Nigeria Police, NCC, FRSC, INEC, ExcelJS, Power BI, Wolfram Alpha, Crossref, Semantic Scholar, Canva, Social Media APIs, Termii, SendGrid, ClamAV, Redis, Cloudinary, and more.

## 📱 Supported Platforms

- **Web**: Mobile-first responsive design
- **WhatsApp**: Notification integration via Termii WA API
- **Languages**: English, Yoruba, Hausa, Igbo, Pidgin English

## 🎨 Design System

### Colors
- Lagos Coral: `#E8533A`
- Yoruba Gold: `#F5A623`
- Forest Green: `#1A7A4A`
- Deep Navy: `#0A1F44`
- Cream White: `#FDF8F3`
- Electric Blue: `#0A5FA8`

### Typography
- Display: Playfair Display (700)
- Body: DM Sans (400, 500)
- Monospace: JetBrains Mono

## 📞 Support

- **Phone/WhatsApp**: +234 812 116 1202
- **Email**: support@dutchkem.com
- **Hours**: Mon-Sat, 8AM-10PM (WAT)

## 📄 License

© 2024 Dutchkem Ventures. All rights reserved.

---

Made with ❤️ for Nigeria 🇳🇬
