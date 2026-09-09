# Twilio and Retell Phone Setup

This guide explains the complete process for making a phone number generated from the PEOPLIX admin portal receive calls through a Retell AI agent.

## Important distinction

Clicking **Generate Number** currently does two things:

1. Requests an available voice-enabled number from Twilio.
2. Purchases that number through the Twilio API and stores its phone number and Twilio SID in MongoDB.

The number is real and belongs to the configured Twilio account. However, purchasing it does **not** automatically connect it to Retell. The number must also be configured for telephony routing before inbound or outbound AI calls can work.

The implementation is in:

- `backend/src/modules/phone-numbers/phone-numbers.service.ts`
- `backend/src/modules/phone-numbers/phone-numbers.routes.ts`
- `src/pages/Admin/AdminPortal.tsx`

## Required services

You need active accounts and credentials for:

- Twilio
- Retell AI
- MongoDB Atlas
- A public HTTPS deployment for the PEOPLIX backend

A local URL such as `http://localhost:3000` cannot receive callbacks from Twilio or Retell over the public internet.

## Step 1: Configure backend environment variables

Set these values in the backend deployment environment. Do not commit real credentials to Git.

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=mongodb+srv://<user>:<password>@<cluster>/<database>
DB_NAME=Peoplix

JWT_SECRET=<long-random-secret-at-least-32-characters>
RETELL_API_KEY=<retell-api-key>
RETELL_AGENT_ID=<retell-agent-id>
RETELL_LLM_ID=<retell-llm-id>
RETELL_WEBHOOK_SECRET=<retell-webhook-secret>

TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=<twilio-auth-token>
TWILIO_COUNTRY_CODE=US

FRONTEND_URL=https://<frontend-domain>
CORS_ORIGINS=https://<frontend-domain>
```

`TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` must belong to the Twilio account that owns the purchased number.

## Step 2: Deploy the backend

Deploy the backend to a stable public HTTPS URL, for example:

```text
https://api.example.com
```

Verify that it is reachable:

```text
GET https://api.example.com/health
```

Expected response:

```json
{
  "status": "ok"
}
```

The backend must remain running while calls are being made. The deployment must expose these routes to Retell:

```text
POST /api/retell/webhook/call-started
POST /api/retell/webhook/call-ended
POST /api/retell/functions/search-employee
POST /api/retell/functions/search-department
POST /api/retell/functions/search-faq
POST /api/retell/functions/search-policy
POST /api/retell/functions/search-company-info
```

### Hostinger Node.js deployment

For Hostinger, create a Node.js application with these settings:

- Application root: `backend`
- Entry file: `dist/server.js`
- Build command: `npm ci && npm run build`
- Start command: `npm start`
- Node.js version: 20 or newer
- Application port: the port supplied by Hostinger, or `3000` when running directly

Add the environment variables from Step 1 in Hostinger's environment-variable panel. Do not upload `backend/.env` with production secrets. After deployment, open the public `/health` URL and confirm it returns `status: "ok"`.

If using Docker instead, run the backend from the `backend` directory:

```text
docker compose up -d --build
```

### Vercel frontend deployment

Create a separate Vercel project for the repository root, not the `backend` directory. The existing `vercel.json` builds the Vite frontend and keeps React Router URLs working.

Set this Vercel environment variable for Production, Preview, and Development:

```env
VITE_BASE_URL=https://api.example.com
```

Use the real public Hostinger backend URL instead of `https://api.example.com`. Then deploy with:

```text
Build command: npm run build
Output directory: dist
Install command: npm ci
```

The frontend and backend must use HTTPS in production. Update the backend `FRONTEND_URL` and `CORS_ORIGINS` values to the final Vercel URL before testing login or API requests.

## Step 3: Configure Retell webhooks

In the Retell dashboard, configure the agent or workspace webhook for call-started as:

```text
https://api.example.com/api/retell/webhook/call-started
```

Configure the call-ended webhook separately as:

```text
https://api.example.com/api/retell/webhook/call-ended
```

Use the same secret in Retell and the backend environment variable:

```env
RETELL_WEBHOOK_SECRET=<same-secret-in-both-places>
```

Retell webhook requests must include the `X-Retell-Signature` header. The backend verifies this signature.

## Step 4: Connect Twilio to Retell

For a Twilio-owned number, Retell's supported custom telephony process uses Twilio Elastic SIP Trunking.

### Create the Twilio Elastic SIP Trunk

In Twilio:

1. Open **Elastic SIP Trunking**.
2. Create a trunk.
3. Configure **Termination** using the localized Twilio termination URI.
4. Configure **Origination** with Retell's SIP server:

```text
sip:sip.retellai.com
```

5. Configure authentication or whitelist Retell's SIP IP range as required by the Retell instructions.
6. Add the purchased Twilio number to the trunk.

The exact termination URI, credentials, and geographic permissions come from the Twilio and Retell dashboards. They are not the same as the Twilio Account SID or Auth Token.

## Step 5: Import and bind the number in Retell

Import the Twilio number into Retell using Retell's phone number settings or the **Import Phone Number** API.

The import must include:

- The phone number in E.164 format, such as `+19786446144`.
- The Twilio SIP termination URI.
- The inbound Retell agent.
- The outbound Retell agent, if outbound calling is required.

The Retell API endpoint is:

```text
POST https://api.retellai.com/import-phone-number
```

The request conceptually looks like this:

```json
{
  "phone_number": "+19786446144",
  "termination_uri": "<twilio-termination-uri>",
  "inbound_agents": [
    {
      "agent_id": "<retell-agent-id>",
      "weight": 1
    }
  ],
  "outbound_agents": [
    {
      "agent_id": "<retell-agent-id>",
      "weight": 1
    }
  ],
  "nickname": "PEOPLIX Main"
}
```

Do not guess the termination URI. It must be the URI configured for the Twilio trunk.

## Step 6: Configure the company in PEOPLIX

Before testing a company's number:

1. Create the company in the admin portal.
2. Link or configure its Retell agent ID.
3. Add company documents, FAQs, policies, and employee data if the agent needs them.
4. Click **Generate Number** only once for that company.
5. Copy the displayed phone number and Twilio SID.
6. Confirm that the same phone number appears in both Twilio and Retell.

The company must have an agent configured. The backend can fall back to the global `RETELL_AGENT_ID`, but a per-company agent configuration is preferred for multi-tenant use.

## Step 7: Test the number

Test inbound calling from a phone that is allowed by Twilio and Retell geographic permissions.

Check each system in this order:

1. The call appears in Twilio logs.
2. The call is routed through the Elastic SIP Trunk.
3. The call appears in Retell call logs.
4. Retell selects the expected agent.
5. PEOPLIX receives the Retell webhook.
6. The call appears in the PEOPLIX recordings or call logs.

If the call never appears in Twilio logs, check the number purchase and Twilio account. If it appears in Twilio but not Retell, check the SIP trunk and Retell import. If it appears in Retell but not PEOPLIX, check the public backend URL, webhook secret, and deployment logs.

## Why deployment matters

Deployment is required for real phone calls because Twilio and Retell need to reach the backend from the public internet. But deployment alone is not enough.

The current Generate Number flow purchases and stores a real Twilio number. It does not currently:

- Create an Elastic SIP Trunk.
- Add the number to a Twilio trunk.
- Import the number into Retell.
- Bind the number to an inbound Retell agent.

Those telephony steps must be completed separately, or the backend purchase flow must be extended to call the relevant APIs after the Twilio number is purchased.

## Security checklist

- Rotate any Twilio Auth Token, Retell API key, database password, or admin password that has been exposed.
- Store credentials only in local untracked `.env` files or deployment secret settings.
- Never put Twilio or Retell secrets in frontend code.
- Use HTTPS in production.
- Configure `RETELL_WEBHOOK_SECRET` before enabling production webhooks.
- Restrict Twilio geographic permissions to the countries you actually need.

## Relevant project files

- `backend/src/modules/phone-numbers/phone-numbers.service.ts`
- `backend/src/modules/phone-numbers/phone-numbers.routes.ts`
- `backend/src/modules/retell/retell.routes.ts`
- `backend/src/modules/retell/retell.service.ts`
- `backend/src/config/env.ts`
- `backend/docs/RETELL_INTEGRATION.md`
