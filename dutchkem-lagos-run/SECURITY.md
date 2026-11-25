# SECURITY — Dutchkem Ventures Presents: Lagos Run — Hustle Empire

**Publisher / developer / IP owner:** Dutchkem Ventures · **Tagline:** Driving the Culture
**© 2026 Dutchkem Ventures. All rights reserved.**
Proprietary and confidential. Unauthorized copying, modification, or distribution is strictly prohibited.

This document is the security model for the Lagos Run client (Canvas 2D PWA) and its Express API.
It is written for the engineers who operate the service, the reviewers who audit it, and the
responders who are paged at 2 a.m. When code and this document disagree, the code is wrong until
proven otherwise — file the discrepancy as a security bug.

**Scope**

| In scope | Out of scope (owned elsewhere) |
|----------|-------------------------------|
| `client/` PWA, `client/sw.js`, `client/config.js` | Dutchkem ProSuite NG+ (Convex app, `convex/`) |
| `backend/` Express API, services, data files | Kora Pay's own infrastructure |
| `backend/data/*.json` published configuration | Google AdMob / Play / Apple App Store internals |
| Domain `lagosrun.dutchkem.com`, host `api.lagosrun.dutchkem.com` | Player devices and their operating systems |

**Reporting a vulnerability:** security@dutchkem.com. Never open a public issue, never post a proof
of concept in Discord or WhatsApp, and never test against another player's account. We acknowledge
within 72 hours and target 7 days for critical remediation. Good-faith research that respects player
data and service uptime will not be pursued.

---

## 1. Threat Model

The asset list is short and specific: **kobo** (paid currency), **coins** (earned currency), **scores
and leaderboard rank**, **session tokens**, **server secrets**, and **player records** (anonymous uid,
purchase history, consent). Everything below is ordered by how much money it can move.

| # | Threat | Vector | Impact | Mitigation |
|---|--------|--------|--------|------------|
| 1 | **Fake purchases** | Client replays a "payment succeeded" call, edits the amount, or forges a Kora webhook | Free kobo; direct revenue loss; wallet inflation | Kobo is granted **only** in `POST /api/purchases/kora/webhook`, authenticated by `x-korapay-signature` HMAC over the raw body (`services/koraPay.js`, `verifyWebhookSignature`). `data.amount` must be ≥ the stored bundle amount. `entry.verified` makes replay a no-op. The browser callback (`/kora/callback`) and `/kora/status` are read-only and grant nothing. |
| 2 | **Score injection** | Forged `POST /api/scores/submit`, edited run result in localStorage, curl script | Fake leaderboard, stolen prizes, competitive collapse | Score HMAC (`verifyScore`) over `uid:score:runId` with `SCORE_SIGNING_SECRET`, constant-time compare; server-side ceiling `MAX_SCORE_PER_RUN`; `runId` pattern + duplicate rejection; `scoreLimiter` 10/min per session. Mismatch **flags the account** rather than silently dropping the run. |
| 3 | **Currency tampering** | Editing `coins`/`kobo` in localStorage or IndexedDB | Player self-grants currency | Balances live server-side (`services/db.js`) and are returned on `/api/user/me`. The client cache is display-only and overwritten on every sync. Rewards require a signed SSV callback; purchases require the signed webhook. |
| 4 | **Reward farming** | Scripted ad loops, replaying an SSV URL, many accounts on one device | Ad-network fraud, budget burn, account bans from AdMob | One-time SSV nonce from `POST /api/ads/ssv-nonce` (10 min TTL, in-memory, deleted on first use); `transaction_id` idempotency via `db.getPurchase`; `rewardLimiter`; daily rewarded cap (`remote-config.json` → `ads.rewardedPerDay`, `rules.json` → `rewardedAdCaps.perDay`); Google RSA-SHA256 signature required. |
| 5 | **Clock tampering** | Moving the device clock forward to reset daily caps, claim daily rewards early, or finish timed events | Unlimited daily rewards, event abuse, inflated streaks | All day boundaries use **server time** (`new Date()` on the API); the client sends timestamps but the server never trusts them for entitlement decisions. Signed sessions expire on server time (24 h). |
| 6 | **Bot farming** | Headless runs submitting valid-looking scores at superhuman rates | Leaderboard capture, currency farming, ad fraud | `minHumanReactionMs` floor for reaction-gated events; per-session rate limits (`scoreLimiter`, `rewardLimiter`, `purchaseLimiter`); duplicate/ceiling rejection; anomaly flagging (`db.flagUser`) feeding the admin webhook; production JS obfuscation (`build.js --prod`) raises the cost of automated replay. |
| 7 | **Secret leakage** | A key committed to git, pasted into a support chat, or accidentally injected into `dist/` | Full compromise: forge sessions, scores, receipts, or Kora charges | Client ships **public values only**; `build.js` runs a secret scan over `dist/` and exits non-zero on `SIGNING_SECRET`, `KORAPAY_SECRET`, `PRIVATE_KEY`, `service_account`, `APPLE_SHARED_SECRET`; `.gitignore` excludes `.env*` (except `.env.example`) and `secrets/`; production refuses to boot without all three signing secrets. |
| 8 | **MITM / transport attack** | Captive portal injecting JS, downgrade to HTTP, TLS-stripping proxy | Session theft, injected ads, tampered config | TLS 1.3 only with HSTS `includeSubDomains; preload`; no mixed content; `helmet` security headers including CSP on the API; remote config and rules are **HMAC-signed** so a captive portal cannot rewrite economy values even if it wins the HTTP race. |
| 9 | **CORS abuse** | Malicious site calling the API with a stolen/ambient token from a victim browser | Cross-site wallet or score actions, data harvest | Exact-origin allowlist (`ALLOWED_ORIGINS`, no wildcards, no subdomain patterns); token is sent as `Authorization: Bearer`, not a cookie, so it is not ambient; preflight rejected for unknown origins; production warns if a localhost origin remains configured. |
| 10 | **DDoS / resource exhaustion** | Volumetric flood, slowloris, JSON bombs, nonce-map flooding | API down during peak play; ad revenue and purchases lost | Host-level DDoS protection plus Cloudflare in front at scale; `express.json({ limit: '16kb' })`; per-route rate limiters keyed by `user:<id>` then `ip:`; SSV nonce map pruned on every write; request timeouts on outbound calls (`node-fetch` 5 s); `/health` kept dependency-free so monitors stay accurate. |

### Assumptions

- The player's device is hostile. The browser, its storage, its clock and its network are all
  attacker-controlled.
- The host, the TLS terminator, and the environment-variable store are trusted.
- Kora Pay, Google AdMob, Google Play and Apple correctly authenticate their own callbacks.
- A determined attacker can reverse-engineer the obfuscated client. Obfuscation buys time and blocks
  casual replay; it is not a security boundary.

---

## 2. Security Principles

1. **The client is untrusted.** Every value arriving from the browser is attacker-controlled until the
   server re-derives it: fares, scores, balances, ad rewards, entitlements. Identity comes only from
   the verified session subject, never from a request body.
2. **Defense in depth.** No single control is load-bearing. A score needs a valid session *and* an
   HMAC *and* a ceiling *and* a unique run id *and* a rate limit. Currency needs a valid session *and*
   a verified webhook *and* an amount check *and* idempotency.
3. **Least privilege.** A session token can read its own profile and submit its own runs — nothing
   else. The service account, the Kora secret key and the admin webhook are reachable only from the
   server process. No client-supplied `uid` is ever accepted as an identity.
4. **Fail closed on money, fail open on play.** If a signature check, amount check or secret is
   missing, kobo and coins are *not* granted, and the route answers 4xx/503. If the network is down or
   the leaderboard is unreachable, the game still starts and the run still plays — the score queues
   and syncs later. Play is never blocked by a backend problem; money is never granted without proof.
5. **Observability.** Every security decision writes a log line with the uid, the decision and the
   reason: rejected signatures, ceiling breaches, underpaid webhooks, expired nonces, ban enforcement.
   Silent rejection is a bug — we cannot investigate what we did not record.

---

## 3. Authentication & Session Flow

There are no passwords, emails or phone numbers in the player path. A device generates an anonymous
uid, trades it for a short-lived signed session, and every privileged call carries that token. This
keeps the account-creation surface tiny (no credential stuffing, no password reset flow to abuse) and
keeps the game NDPR/GDPR-friendly by default.

```
 ┌────────────┐                                             ┌──────────────────────┐
 │  Client    │                                             │  API (Express)       │
 │  browser   │                                             │  backend/server.js   │
 └─────┬──────┘                                             └──────────┬───────────┘
       │                                                                │
       │ 1. read/create local uid  (dutchkem_uid, localStorage)          │
       │                                                                │
       │ 2. POST /api/session  { uid }        (alias: POST /api/auth)    │
       ├───────────────────────────────────────────────────────────────►│
       │                                                                │ authLimiter 20/min
       │                                                                │ validate uid shape
       │                                                                │ sign JWT (HS256)
       │                                                                │   sub  = uid
       │                                                                │   jti  = session id
       │                                                                │   exp  = now + 24h
       │                                                                │   sessionKey = HMAC(uid:ts)
       │ 3. 200 { token, expiresIn: 86400, sessionKey, uid }             │
       │◄───────────────────────────────────────────────────────────────┤
       │                                                                │
       │ 4. store token in memory + sessionStorage                       │
       │                                                                │
       │ 5. GET /api/scores/leaderboard                                  │
       ├───────────────────────────────────────────────────────────────►│ public
       │                                                                │
       │ 6. POST /api/scores/submit                                      │
       │    Authorization: Bearer <token>                                │
       │    { score, runId, signature }                                  │
       ├───────────────────────────────────────────────────────────────►│
       │                                                                │ jwt.verify(HS256)
       │                                                                │ banned? → 403
       │                                                                │ verifyScore(uid,score,runId)
       │                                                                │ ceiling / duplicate / limit
       │ 7. 200 { ok, rank, top }        or  401 / 403 / 409 / 429       │
       │◄───────────────────────────────────────────────────────────────┤
       │                                                                │
       │ 8. token expired or 401 token_expired → back to step 2 (once)   │
       │                                                                │
```

**Token lifetime.** 24 hours (`expiresIn: 86400`). The client refreshes lazily: on a 401 it re-runs
the session exchange once, replays the failed request, and only surfaces an error if the second
attempt also fails. A token is never persisted to `localStorage`; only the anonymous uid is.

**Session key.** Each session also receives a `sessionKey` derived as `HMAC(uid + ':' + issuedAt)`
with `SESSION_SIGNING_SECRET`. It binds the token to a single acquisition event, is echoed on session
responses for client-side display/debug, and changes on every re-auth — two devices with the same uid
therefore never share a key.

**Revocation.** Sessions are stateless JWTs, so revocation is enforced by state, not by a blocklist:

- Every wallet, score, reward and profile route loads the player record and rejects `banned: true`
  with `403 banned`. A banned player's still-valid token buys nothing.
- `db.deleteUser(uid)` (self-service `DELETE /api/user/me`) removes the record; the next privileged
  call recreates a fresh, empty profile, so deleted currency cannot be spent.
- Rotating `SESSION_SIGNING_SECRET` invalidates **every** outstanding token immediately — the
  break-glass revocation when a token is believed stolen or a secret is suspected leaked.
- Expiry is checked against server time; a device clock change cannot extend a session.

**Transport of the token.** `Authorization: Bearer <token>` only. No cookies, therefore no ambient
authority and no CSRF surface; CORS remains an exact-origin allowlist for defence in depth.

---

## 4. Secret Management

### 4.1 Inventory

All values live in `backend/.env` locally and in the host's encrypted environment store in
production. `.env` is git-ignored; `.env.example` is committed with placeholders only.

| Variable | What it protects | If leaked | Storage |
|----------|------------------|-----------|---------|
| `SESSION_SIGNING_SECRET` | HS256 signature on player session JWTs | Anyone can mint a token for any uid; full account takeover | Vault / host env, server-only |
| `SCORE_SIGNING_SECRET` | HMAC on run results **and** the signature on `/api/config/*` | Forged high scores; forged remote config | Vault / host env, server-only |
| `RECEIPT_SIGNING_SECRET` | HMAC on purchase receipts returned to the client | Forged proof-of-purchase; support-dispute fraud | Vault / host env, server-only |
| `KORAPAY_SECRET_KEY` | Kora Pay API authentication (initialize charge, status) | Attacker can create/cancel charges as us; read customer data | Vault / host env, server-only, never in client |
| `KORAPAY_WEBHOOK_SECRET` | HMAC on `x-korapay-signature` for charge webhooks | Attacker can grant themselves kobo with forged webhooks | Vault / host env, server-only |
| `KORAPAY_ENCRYPTION_KEY` | Kora account-level encryption for sensitive charge fields | Decryption of payment metadata | Vault / host env, server-only |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | Google Play Developer API (native purchase validation) | Attacker can validate/redeem Play purchases; quota abuse | Vault / host env, **one line**, server-only |
| `APPLE_SHARED_SECRET` | App Store `verifyReceipt` authentication | Attacker can validate forged App Store receipts | Vault / host env, server-only |
| `ADMIN_WEBHOOK_URL` | Slack/Discord-compatible alert endpoint for fraud events | Attacker can spam or silence the fraud channel | Vault / host env, server-only (URL is a capability) |
| `KORAPAY_PUBLIC_KEY` *(public — for completeness)* | Client-side checkout identification | No impact by design | May ship in the client; still kept in env for consistency |

Never secret, but security-relevant and therefore reviewed with the same care: `ALLOWED_ORIGINS`
(an over-broad value defeats CORS), `ADMOB_SSV_PUBLIC_KEY_URL` (pinning), `DB_PATH` (filesystem
exposure), and the anti-cheat ceilings (`MAX_SCORE_PER_RUN`, `MAX_COINS_PER_DAY`,
`MIN_HUMAN_REACTION_MS`, `MAX_REWARDED_ADS_PER_DAY`).

### 4.2 Generation

```bash
# 32 random bytes as 64 hex chars — one per secret
openssl rand -hex 32
```

Run it once per secret. Never reuse a value across variables or environments (test and production
keys are disjoint), and never derive one secret from another.

### 4.3 Rotation — quarterly, and immediately on suspicion

Cadence: **every quarter** (Jan 1, Apr 1, Jul 1, Oct 1) and immediately after any suspected exposure,
staff departure with access, or a failed audit finding. Record each rotation in the security log.

Procedure per secret:

1. **Announce.** Open a change note with the window, the affected secret, and the expected player
   impact (`SESSION_SIGNING_SECRET` logs everyone out; the others are invisible when done right).
2. **Generate.** `openssl rand -hex 32` on a trusted machine, not on the API host.
3. **Stage.** Write the new value into the secret store as a *new version* (Vercel/Render/Fly secret
   version, or the vault entry). Do not delete the old value yet.
4. **Deploy.** Roll the backend so workers pick up the new version. Confirm `/health` and a real
   authenticated round-trip (`POST /api/session` → `GET /api/user/me`) on the new process.
5. **Verify.** Watch 5xx rate and auth failures for 15 minutes. For Kora webhooks, replay one test
   charge from the Kora dashboard and confirm a 200 with `status: "ok"`.
6. **Revoke.** Delete the previous version in the store. For Kora/Google/Apple, also revoke the old
   credential in the provider dashboard.
7. **Record.** Log the rotation (see §9): who, when, which secret, why, verification evidence.

Special cases:

- `SESSION_SIGNING_SECRET` — a clean cut is impossible without logging everyone out; that is the
  intended behaviour. Do it in the lowest-traffic hour and let the client's lazy re-auth recover.
- `KORAPAY_WEBHOOK_SECRET` — update the Kora dashboard **and** the env in the same window; Kora will
  retry failed deliveries, so a short mismatch is recoverable, not lost revenue.
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` / `APPLE_SHARED_SECRET` — rotate the provider-side credential
  first, then the env, so no window exists where the server presents a dead credential.

### 4.4 Storage rules

- Secrets live in the host's encrypted environment store or a vault (1Password/Bitwarden/AWS Secrets
  Manager). Never in git, never in a ticket, never in chat, never in a screenshot.
- Local development uses throwaway placeholders in `backend/.env`. A production value must never be
  copied to a laptop.
- Only the backend process reads secrets. `client/config.js` contains public values only, and
  `build.js` fails the build if a secret-shaped string reaches `dist/`.

---

## 5. Anti-Cheat Rules

### 5.1 Scores

| Gate | Rule | Failure behaviour |
|------|------|-------------------|
| Session | Valid HS256 token, subject = uid | `401` |
| Ban | `user.banned` must be false | `403 banned` |
| Signature | `HMAC(SCORE_SIGNING_SECRET, "uid:score:runId")` matches, constant-time compare | `400 invalid_signature` + `db.flagUser` |
| Ceiling | `score ≤ MAX_SCORE_PER_RUN` (default 250,000; published `rules.json` ceiling 500,000) | `400 score_too_high` + flag |
| Shape | Finite number ≥ 0 | `400 invalid_score` |
| Uniqueness | `runId` matches `^[A-Za-z0-9_-]{8,64}$` and was never seen for this uid | `400 invalid_run_id` / `409 duplicate_run` |
| Rate | `scoreLimiter` — 10 submissions/minute per session | `429` |

Flagged accounts surface to the admin webhook and are reviewed before prize payouts. A flag is not a
ban: corrupted saves also fail the signature gate, so a human decides.

### 5.2 Purchases

| Gate | Rule | Failure behaviour |
|------|------|-------------------|
| Route | Only `POST /api/purchases/kora/webhook` grants kobo | Callback/status are read-only |
| Signature | `x-korapay-signature` = HMAC-SHA256 over the **raw** request body | `403 invalid_signature` |
| Event | `event === 'charge.success'`; other events acknowledged and ignored | `200 ignored` |
| Reference | Must match a stored purchase created by `/kora/initialize` | `404 unknown_reference` |
| Amount | `data.amount` (kobo) ≥ stored `entry.amount` | `400 amount_mismatch` |
| Idempotency | `entry.verified` short-circuits repeat delivery | `200 already granted` |
| Receipt | `signReceipt(uid, sku, txnId)` recorded for support disputes | — |

Native store receipts (`POST /api/purchases/verify`) follow the same pattern: the receipt is
re-validated with Google/Apple, the `txnId` must be unredeemed, and the SKU must exist in `SKU_MAP`.

### 5.3 Rewards

- A **one-time nonce** (`/api/ads/ssv-nonce`, 16 random bytes, 10-minute TTL, deleted before the grant)
  must accompany every SSV callback. Unknown or expired nonce → `410 nonce_expired`, no payout.
- Google's **RSA-SHA256 signature** over the sorted `key=value` query string is mandatory; a bad
  signature → `403`, no payout.
- `transaction_id` is stored via `db.recordPurchase`; a repeat is answered `duplicate` and grants
  nothing.
- **Daily cap** from `rules.json` (`rewardedAdCaps.perDay`, mirrored by `ads.rewardedPerDay` in
  `remote-config.json` and `MAX_REWARDED_ADS_PER_DAY`), counted on server time.
- Reward amount is clamped (`≤ 100000`) and must be a positive integer.

### 5.4 Clock and time

Every entitlement decision — daily cap, daily reward, session expiry, duplicate windows, purchase
timestamps — uses server time. The client may report a timestamp for UX and analytics, but the server
never reads it for a grant. A device clock jump therefore changes nothing except local display.

### 5.5 Behavioural signals

- `MIN_HUMAN_REACTION_MS` (default 120 ms, published 150 ms) gates reaction-timed events; sub-human
  reaction chains are discarded and counted.
- Runs whose score curve is implausible for their duration (fare rate far above the economic model in
  `remote-config.json` → `economy.fareMultiplier`) are flagged for review.
- Repeated signature failures from one uid escalate: flag → admin webhook → manual ban.

---

## 6. Data Protection

### 6.1 In transit

- TLS 1.3 (TLS 1.2 accepted only as a fallback where the client cannot negotiate 1.3), modern cipher
  suites, no RC4/3DES/SSLv3.
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` on both the client and
  `api.lagosrun.dutchkem.com`. HTTP is redirected, never served.
- `helmet` on the API: CSP, `X-Content-Type-Options: nosniff`, `Referrer-Policy:
  strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy` denies camera,
  microphone and geolocation.
- No mixed content: the PWA loads no `http://` asset, and `connect-src` in the client CSP names only
  our API, Sentry and Kora.

### 6.2 At rest

- Player records (`backend/data/*.db`) contain an anonymous uid, balances, scores, reward counters and
  purchase references — no names, emails, phone numbers or payment card data.
- The database file is stored on an encrypted volume (host disk encryption / managed Postgres with
  encryption at rest) and is readable only by the service account running the API.
- Backups are encrypted with the same key management as production and are pruned on a schedule.
- Logs are retained 30 days and must never contain a token, a secret, a full `Authorization` header or
  a service-account blob. Log the uid and the decision, not the credential.

### 6.3 Privacy compliance (NDPR / GDPR / COPPA)

| Obligation | Implementation |
|------------|----------------|
| Lawful basis & notice | Consent gate at first launch (`client/consent.html`), privacy policy at `client/privacy.html` |
| Data minimisation | Anonymous uid only; no PII required to play |
| Right of access / portability | `GET /api/user/export` → full JSON of profile, scores, rewards, purchases |
| Right to erasure | `DELETE /api/user/me` → `db.deleteUser(uid)` removes profile, scores and rewards |
| Children (COPPA) | Age gate; no behavioural advertising to declared minors; no PII collected from any player |
| Retention | Scores and purchases retained for the life of the account; logs 30 days; deleted on request |
| Processor disclosure | Kora Pay (payments), Google AdMob (ads), Sentry (errors), host (compute) — listed in the policy |

Self-service export and deletion are deliberate: a player should never need to email support to see or
wipe their data. Support requests that arrive by email are honoured within 30 days regardless.

---

## 7. Incident Response

### 7.1 Severity

| Level | Definition | Examples | Response |
|-------|------------|----------|----------|
| **P0** | Active loss of money, secrets, or all service | Kora secret key leaked; webhook forgery granting kobo; full API outage; database exfiltration | Page on-call immediately, 24/7. Acknowledge ≤ 15 min, contain ≤ 1 h. |
| **P1** | Serious integrity or availability risk, contained | Score forgery wave; SSV bypass without confirmed payouts; one region/host down; auth bypass for a single account class | Acknowledge ≤ 1 h, contain ≤ 4 h, business-hours bridge. |
| **P2** | Limited impact, no confirmed loss | Elevated 5xx (>1% for 5 min); single account compromise; CORS misconfiguration on a non-money route; ad fraud signal | Acknowledge ≤ 1 business day, fix ≤ 5 days. |
| **P3** | Low risk, hygiene | Verbose error messages, missing header on a static page, outdated dependency with no reachable exploit | Next scheduled release. |

### 7.2 Playbook — Detect · Contain · Eradicate · Recover · Notify · Review

1. **Detect.** Alert fires (Better Uptime, Sentry, fraud webhook) or a report lands at
   security@dutchkem.com. Open an incident channel, assign a commander, start a timeline. Do not
   debate severity before containing a P0.
2. **Contain.** Stop the bleeding with the smallest reversible action:
   - rotate the implicated secret(s) — `SESSION_SIGNING_SECRET` logs everyone out;
   - ban the uid(s) (`db.banUser`) or add the offending IP to the host/WAF block list;
   - disable the affected feature via `remote-config.json` (`ads.ssvEnabled: false`,
     `features.*: false`) instead of redeploying;
   - if kobo is being minted, disable `/api/purchases/kora/initialize` at the edge first.
3. **Eradicate.** Find and fix the root cause: patch the route, add the missing gate, remove the leaked
   value from history and the store. Write a regression test or harness assertion that fails on the
   old code.
4. **Recover.** Redeploy, verify `/health`, `/api/version`, a session round-trip, one signed score
   submission and one webhook replay. Reconcile the wallet ledger against Kora's dashboard for the
   incident window and reverse fraudulent grants (`db.banUser` + balance correction).
5. **Notify.** Internal: commander → stakeholders → support macros. External, as required:
   - players, if credentials or balances were affected — plain language, what happened, what we did,
     what they should do;
   - **NDPR**: Nigeria's NDPC within 72 hours of becoming aware of a personal-data breach;
   - **GDPR**: the supervisory authority within 72 hours where EU players are affected, and affected
     data subjects without undue delay where the risk is high;
   - Kora Pay / AdMob / Google Play if their credentials or fraud budgets are implicated.
6. **Review.** Blameless post-mortem within 5 business days for P0/P1: timeline, impact, root cause,
   what worked, what did not, and dated action items with owners. Update this document and the
   `Pen-Test Checklist` if a new class of attack was found.

### 7.3 Contacts

| Role | Contact |
|------|---------|
| Security reports & incidents | security@dutchkem.com |
| Legal / regulatory notification | legal@dutchkem.com |
| Player support | support@dutchkem.com |
| Privacy / data requests | privacy@dutchkem.com |
| Payment provider | Kora Pay merchant dashboard → support |
| Hosting | Vercel / Render / Firebase status page + support |

Never place live credentials in an incident channel. Share them through the vault only.

---

## 8. Pen-Test Checklist

Run before every major release, and at minimum quarterly. Each item is a pass/fail with evidence
attached to the security log.

- [ ] **Session forgery** — attempt `POST /api/scores/submit` with a token signed by a different key,
      an `alg: none` token, and an expired token; expect `401` in all three cases.
- [ ] **Banned-player enforcement** — set `banned: true` on a test uid, then retry a valid token on
      `/api/scores/submit`, `/api/user/me` and `/api/purchases/kora/initialize`; expect `403` on each.
- [ ] **Score injection** — submit a valid signature with a score above `MAX_SCORE_PER_RUN`, replay a
      used `runId`, and submit a malformed `runId`; expect `400`/`409`, no leaderboard change.
- [ ] **Webhook forgery** — post a fake `charge.success` with no signature, a wrong signature, and a
      valid signature but `amount` below the bundle; expect `403`/`403`/`400`, no kobo granted.
- [ ] **Webhook replay** — deliver the same valid webhook twice; second response must be
      `already granted` with no balance change.
- [ ] **SSV bypass** — call `/api/ads/ssv-callback` with a valid signature but an unknown/expired
      nonce, and with a reused `transaction_id`; expect `410` and `duplicate`, no coins.
- [ ] **Clock tampering** — move the device clock +48 h and attempt a daily reward and a rewarded ad;
      server-side caps must still apply.
- [ ] **CORS** — send a preflight and a simple request with `Origin: https://evil.example`; expect no
      `Access-Control-Allow-Origin` and no successful credentialed response.
- [ ] **Rate limits** — exceed `authLimiter` (20/min), `scoreLimiter` (10/min), `purchaseLimiter`
      (5/min) and `rewardLimiter` (10/min); expect `429` with `Retry-After`, and no 5xx.
- [ ] **Input fuzzing** — oversized JSON (>16 kb), deeply nested objects, arrays where scalars are
      expected, unicode/emoji uids, and huge query strings; expect `400`/`413`, never `500`.
- [ ] **Error leakage** — trigger a 500 and inspect the body and headers for stack traces, file paths,
      env names or library versions.
- [ ] **Secret scan** — run the `build.js` scan and an independent grep over `dist/` for
      `SIGNING_SECRET|KORAPAY_SECRET|PRIVATE_KEY|service_account`; expect zero matches.
- [ ] **Transport** — TLS 1.3 negotiated, HSTS present with `includeSubDomains; preload`, HTTP → HTTPS
      redirect, no mixed content in the PWA, service worker serves from the right scope.
- [ ] **Data rights** — `GET /api/user/export` returns only the caller's data;
      `DELETE /api/user/me` actually removes the record and the following privileged call starts empty.
- [ ] **Dependency review** — `npm audit` in `dutchkem-lagos-run/` and `dutchkem-lagos-run/backend/`;
      triage every high/critical, and confirm no dev-only tooling is reachable in production.

---

## 9. Security Log Template

Copy this block for every security-relevant event: rotation, incident, penetration test, review, or
exception. Store entries in the private security log (not in the repository) and keep the last 24
months.

```markdown
### Security Log Entry

- **ID:** SEC-YYYYMMDD-NN
- **Date (UTC):** YYYY-MM-DD HH:MM
- **Type:** rotation | incident | pen-test | review | exception
- **Severity:** P0 | P1 | P2 | P3 | n/a
- **Owner / commander:** name, role
- **Systems affected:** client / backend / Kora / AdMob / Play / Apple / host / DNS
- **Secret(s) touched:** variable name(s) only — NEVER the value
- **Summary:** two or three sentences: what happened or what was changed, and why
- **Detection:** how it was found (alert, report, scheduled review, audit)
- **Impact:** players affected, currency involved, downtime, data exposure — state "none known" if so
- **Actions taken:** chronological, each with a timestamp and the acting engineer
- **Evidence:** log excerpts, request IDs, dashboard screenshots (no secrets in evidence)
- **Verification:** how the fix or rotation was confirmed (status codes, test names, replay results)
- **Player / regulator notification:** required? sent to whom, when, reference number
- **Follow-ups:** dated action items with owners
- **Post-mortem link:** (P0/P1 only)
- **Status:** open | contained | resolved | monitoring
```

---

**Dutchkem Ventures — Driving the Culture**
© 2026 Dutchkem Ventures. All rights reserved. Proprietary and confidential.
Questions about this document: security@dutchkem.com.
