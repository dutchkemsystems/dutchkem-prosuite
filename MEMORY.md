# MEMORY.md — Dutchkem Ventures ProSuite NG+

> Persistent project memory for AI agents. Updated after each significant session.

## Project Identity

- **Name:** Dutchkem Ventures ProSuite NG+
- **Type:** Full-Stack AI Platform (Convex + React)
- **Production URL:** https://dutchkem-prosuite-app.vercel.app
- **Convex Backend:** https://warmhearted-aardvark-280.convex.cloud
- **GitHub:** https://github.com/dutchkemsystems/dutchkem-prosuite
- **Business Phone:** +234-9113393525
- **Admin Email:** admin@dutchkem.com / Password: `7EELRrqsPz6CALFv`

## Key Architectural Decisions

1. **Convex as sole backend** — all data in `convex/schema.ts` (~324 tables, 5121 lines)
2. **Custom admin auth** — NOT Convex Auth for admin. SessionId in localStorage.
3. **Multi-model AI routing** — OpenRouter (Llama 3.3 70B), NVIDIA NIM, AI/ML API
4. **Composio for social** — one API key connects 11 platforms
5. **Kora Pay for payments** — Nigerian payment gateway, direct debit, auto-renewal
6. **OpenWA for WhatsApp** — self-hosted WhatsApp gateway
7. **15 specialized agents** — each with unique prompt, tools, and Composio integration
8. **Enterprise tier** — multi-tenant with organizations, sub-admins, SLA, knowledge graphs
9. **Auto-healing system** — continuous health monitoring with diagnostic reports
10. **Nigerian market focus** — Naira pricing, Tithe/Charity deductions, CAC compliance

## Active Integrations

| Integration | Status | Key Details |
|-------------|--------|-------------|
| Convex | ✅ Active | Serverless DB + functions, v1.40.0 |
| OpenRouter | ✅ Active | Llama 3.3 70B Instruct |
| NVIDIA NIM | ✅ Active | Premium enterprise use |
| Composio | ✅ Active | 11 social platforms |
| Kora Pay | ✅ Active | Direct Debit, auto-renewal |
| AWS SES | ✅ Active | Email OTP delivery |
| Resend | ✅ Active | Transactional email (failover) |
| Termii | ✅ Active | SMS/OTP (legacy) |

## 15 Agents

| ID | Key | Name | Model | Capabilities |
|----|-----|------|-------|--------------|
| A1 | academic | Academic Writer | Llama 3.3 70B | PDF, DOCX, web search |
| A2 | business | Business Consultant | Llama 3.3 70B | PDF, DOCX, XLSX, PPTX, MP3, MP4, exchange rate, Nigeria lookup |
| A3 | content | Content Strategist | Llama 3.3 70B | PDF, DOCX, XLSX, web search |
| A4 | career | Career Coach | Llama 3.3 70B | PDF, DOCX, XLSX, PPTX, MP3, MP4, web search |
| A5 | shopping | Personal Shopper | Llama 3.3 70B | Web search |
| A6 | exam_career | Success Specialist | Llama 3.3 70B | PDF, DOCX |
| A7 | finance | Finance Advisor | Llama 3.3 70B | PDF, DOCX, XLSX, PPTX, MP3, MP4, exchange rate, stock price |
| A8 | video | MediaStudio Pro | Llama 3.3 70B | PDF, DOCX, MP4 |
| A9 | wellness | Wellness Coach | Llama 3.3 70B | PDF, DOCX |
| A10 | home | Home Management Expert | Llama 3.3 70B | PDF, DOCX |
| A11 | language | Language Coach | Llama 3.3 70B | PDF, DOCX |
| A12 | travel | Travel Planner | Llama 3.3 70B | PDF, DOCX |
| A13 | certification | Exam Prep Specialist | Llama 3.3 70B | PDF, DOCX |
| A14 | translation | Translation Hub | Llama 3.3 70B | PDF, DOCX |
| A15 | event | Event Maestro | Llama 3.3 70B | PDF, DOCX, XLSX |

## Session History

### Last 10 Sessions
1. [2026-06-27] Theme customization system (8 themes, animated backgrounds)
2. [2026-06-27] CreditBalance hooks fix (blank tab bug)
3. [2026-06-27] Theme buttons fix (THEMES lookup key mismatch)
4. [2026-06-21] Comprehensive platform diagnostic & 8 security fixes
5. [2026-06-18] Auto-heal reports & security monitor
6. [2026-06-17] Enterprise Portal 10 Company Types + Military-Grade Security
7. [2026-06-16] Enterprise Organisation Management System (25 features)
8. [2026-06-15] Enterprise Hub 5 broken tabs fixed
9. [2026-06-14] Social Engine — Pinterest & Tiktok OAuth fix
10. [2026-06-13] 10 Revenue Features COMPLETE

## Known Issues

- Resend email fails for unverified domains (gmail.com) — SES auto-failover works
- AWS SES in sandbox mode (limited to verified emails)
- Termii account has 0 balance
- Kora Pay account needs funding for actual disbursements
- RapidAPI: Pinterest/Medium/Twitch need marketplace subscription
- `convex-helpers` pinned to 0.1.103 — newer versions have broken exports

## Next Actions

1. Verify theme system works end-to-end
2. Address remaining security findings (encrypt secretKey, OTP rate limiter to DB)
3. Add indexes for dashboard query full-table scans
4. Complete AWS SES production access
5. Test all agent chat flows

---

**Last Updated:** 2026-06-27
**Managed by:** AI Agents (MiMo, Claude, Cursor, Gemini)
