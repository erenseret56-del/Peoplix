# PEOPLIX Conference Experience

This feature adds `/conference`, a homepage CTA between Business Value and FAQ, and `/admin/conference` in the existing Super Admin portal. Existing customer accounts, phone assignments and Twilio flows are unchanged. Conference web calls use the existing Retell HTTP client, browser SDK and signed `/api/retell/webhook` endpoint.

## Enable the voice experience

Conference calling uses the same public/demo Retell agent and call creator as the working homepage demo. It becomes available whenever the existing backend `RETELL_API_KEY` and `RETELL_AGENT_ID` are configured; there is no second conference agent or browser secret.

1. Keep the existing homepage demo agent assigned to `RETELL_AGENT_ID`. Its prompt and approved public knowledge must describe PEOPLIX and must not expose customer or employee data.
2. Configure that existing demo agent to retain recordings/transcripts and deliver `call_started`, `call_ended`, and `call_analyzed` to the existing signed `https://YOUR_BACKEND/api/retell/webhook` endpoint.
3. Optionally add these conference policy variables to the **backend** environment:

   ```env
   CONFERENCE_BLOCKED_EMAIL_DOMAINS=
   CONFERENCE_IP_SESSIONS_PER_MINUTE=600
   ```

4. No new browser secrets, Twilio numbers, customer accounts or separate admin credentials are needed. If the frontend/API have different origins, retain the existing `VITE_BASE_URL` and CORS setup. HTTPS is required for microphone access outside localhost. Route SPA refreshes to `index.html`.
5. Start the backend normally (`npm run build && npm start`). Startup creates additive indexes for `conference` and `conference_rate_limits`. Do not run a production server locally against production MongoDB merely to test this feature.
6. Perform a real staging voice call before enabling the conference publicly. Verify the existing v2 web-call flow with the installed `retell-client-js-sdk` version, audio on iOS Safari and Android Chrome, all webhook deliveries and recording playback. The automated SDK double is not a provider compatibility test.

Relevant provider references: [Create web call](https://docs.retellai.com/api-references/create-web-call), [Stop call](https://docs.retellai.com/api-references/stop-call), [Browser calling](https://docs.retellai.com/deploy/web-call). Retell's latest documentation also describes v3 calling; existing PEOPLIX calls remain on v2 with the existing SDK. Do not migrate the production calling integration as part of conference configuration.

## Session and call enforcement

- A random 256-bit opaque token authorizes only a single unfinished conference session. Only its SHA-256 hash is stored. It cannot authorize the normal JWT endpoints. The browser temporarily stores it in session storage for pending/active recovery and removes it at completion or expiry; terminal tokens never bypass the email screen. Only an active call restores automatically.
- Email is normalized and validated on the server. The configurable blocklist rejects known personal/disposable domains, including their subdomains. Unknown domains are allowed; this does **not** verify mailbox ownership or prove the sender represents a company. MongoDB is the usage authority: a normalized email with a completed/expired participating call receives `CONFERENCE_ALREADY_USED`, regardless of device or browser.
- A five-minute absolute expiry is set by the backend at admission. Every visitor API checks it independently of cleanup. MongoDB retains the activity after expiration; it is not a TTL-deleted session record.
- The three-minute conversation budget starts when a call is reserved and includes connection setup. Retries share the original deadline and cannot extend it. At most three attempts are retained per session. The backend deadline worker stops the Retell call at the shared deadline, while the browser timer ends local audio promptly. New attempts with less than 75 seconds left are refused to leave enough setup and conversation time.
- Each backend process runs one deadline scan per second using shared MongoDB leases. It terminates overdue/explicitly ended calls with Retell's stop-call API, retries failures, expires inactive sessions and reconciles missing artifacts for up to ten minutes after session expiry. Call shutdown has normal scheduler/provider network latency; provider outages cannot be made instantaneous by the application. Alert on worker/provider errors and test delayed connection attempts before launch.
- A sparse unique hashed-email reservation prevents two tabs or instances from creating concurrent first-use sessions. Legacy records remain readable without a destructive migration. Entering an email without participating does not permanently consume it; the same tab can resume its unfinished reservation, and an untouched expired reservation can be recycled. Call IDs are bound before credentials are released. The provider's metadata includes `source=conference`, `conferenceSessionId` and `conferenceAttemptId`, with no tenant ID or visitor email.
- Signed webhooks update the reserved call attempt, tolerate duplicates and do not downgrade terminal/analyzed state. A conflicting update returns an error for Retell retry. Unreserved conference metadata is rejected instead of creating an orphan customer call. Earlier failed attempts retain their own media.
- The visitor can explicitly recheck a disconnected session. Only that recovery action queries Retell; the visual countdown makes no API requests. A page exit requests a durable stop and stops browser audio. The server and provider limits remain active if the tab crashes or frontend code is altered.

## Super Admin data and security

The existing `authenticateJWT` and `requireSuperAdmin` middleware protect every activity/list/detail/recording endpoint. The frontend route explicitly permits `super_admin`, rather than the broader existing `admin` alias. Company admins, company users and conference tokens are rejected by the API.

The `conference` collection holds visitor identity and a bounded array of call attempts. Transcript, summary and recording references are stored once per attempt; normal `call_logs`, customer collections and billing are not used. Indexes cover session IDs, token hashes, call IDs, email, domain, chronological activity, status and deadline scans.

List responses are paginated and omit transcripts, provider URLs and token hashes. Search uses literal email/domain prefixes or an exact call ID; dates are UTC and inclusive. Detail requests retrieve full text only on demand. Playback refreshes the provider-signed URL, validates its HTTPS storage host, then streams through an authenticated endpoint. The browser receives a local blob URL, never an unauthenticated recording link. Provider media retention still determines how long recordings remain retrievable; set the conference data-retention policy in the deployment process.

The form explicitly records recording/transcription consent with a notice version. Do not encourage visitors to supply sensitive employee information. The shared per-IP admission control is a high-volume abuse/throughput limit, not a usage identity or one-demo restriction, and its MongoDB counters have TTL cleanup. Review ingress/WAF rate limits and trusted-proxy configuration for the conference network; many visitors may share one public IP.

## Verification

From the repository root:

```text
npm run build
npm run test:conference
```

The browser suite tests the **production build** with Playwright and locally installed Chrome. On a CI host, install Chrome with `npx playwright install chrome` or adjust the Playwright channel. It covers desktop/mobile/tablet layout, animation/reduced motion, email errors, same-device email switching, terminal-token cleanup, pending refresh, active reconnect, voice UI using an SDK double, expiry, CTA placement, navigation and admin routing. Generated images go to ignored `test-results/`.

From `backend`:

```text
npm run build
npm run test:conference
```

Backend tests use an isolated ephemeral MongoDB and mocked Retell HTTP responses. They exercise authentication, normalized one-use email enforcement, simultaneous same-email admission, abandoned reservations, repeat/delayed webhooks, persistent deadline enforcement, retry budgets, private media, filters, and 300 simultaneous distinct-email session admissions/call reservations. They never connect to the configured production database or place paid calls.

## Capacity and launch checks

**300 simultaneous voice conversations are a target, not a guarantee.** The application shares its existing MongoDB pool, uses persistent state/leases across replicas, avoids periodic visitor API polling, and code-splits the conference/shared voice code from the main portals. Browser audio goes directly to the provider, not through PEOPLIX API processes. Browser web calls do not use a Twilio phone number; any phone/SIP testing remains subject to Twilio capacity as well as Retell limits.

Confirm Retell concurrent-call allowance, API rate limits, billing and the existing public-demo agent configuration. Verify Twilio capacity separately for any simultaneous phone demos. Size backend replicas and MongoDB using staging metrics, not synthetic success alone. Observe event delivery lag, deadline-worker lag, MongoDB pool waits, API p95/p99, 429s, failed registrations, missed recordings and microphone/audio errors.

`tests/conference-sessions.k6.js` exercises admission/status/end requests on an explicitly selected staging URL. It does not establish WebRTC conversations and cannot validate voice capacity. Run actual browser/provider voice load in controlled stages (25, 50, 100, 200, 300) with the account owner, the staging public-demo agent and approved test participants. Include one shared-NAT test, two backend replicas, dropped webhooks, a backend restart, late token connection, stale/forged credentials, clock changes, and starting near the five-minute expiry.

Before the conference verify: a real three-minute server-enforced cutoff with frontend timers disabled; a five-minute expiry and late join; signed started/ended/analyzed events; authorized recording/transcript/summary playback; denied company-user/admin access; existing client login/dashboard; existing public Retell demo; an existing Twilio phone call. These provider/device checks require a configured staging environment and cannot be inferred from builds or mocked tests.

Rollback by removing the public conference route/CTA in the deployment while keeping backend workers running long enough to finish existing calls and retain activity. Do not disable or replace the shared homepage demo agent as a conference rollback. No customer database migration or collection deletion is needed.
