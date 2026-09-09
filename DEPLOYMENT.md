# Production Deployment

## Security

Rotate any credentials that were ever stored in a local `backend/.env` file. Production secrets belong only in Hostinger's environment-variable panel. Do not upload `.env` files or commit real credentials.

The frontend build exposes only variables prefixed with `VITE_`. Set only this frontend variable:

```env
VITE_BASE_URL=https://api.example.com
```

Keep MongoDB, JWT, Retell, Twilio, admin, and Redis credentials in the backend environment only.

## Hostinger backend

Create a Node.js application with:

- Application root: `backend`
- Node.js: 20 or newer
- Build command: `npm ci && npm run build`
- Entry file: `dist/server.js`
- Start command: `npm start`

Set `NODE_ENV=production`, a real `DATABASE_URL`, random JWT secrets of at least 32 characters, `RETELL_WEBHOOK_SECRET`, and the required Retell/Twilio values. Set `CORS_ORIGINS` to the exact HTTPS frontend origin and `TRUST_PROXY=true` when Hostinger is terminating HTTPS in front of Node.

Check both endpoints after deployment:

```text
GET https://api.example.com/health
GET https://api.example.com/health/ready
```

## Frontend hosting

Build the repository root with `npm ci && npm run build` and serve `dist`. For a separate Vercel or Hostinger static site, set `VITE_BASE_URL` to the public HTTPS backend URL before building. Configure SPA fallback to `index.html` so React Router paths work on refresh.

## Capacity

The API is stateless and uses MongoDB connection pooling, request timeouts, and endpoint-specific rate limits. For 1,000 users, use MongoDB Atlas with appropriate tier sizing and a Hostinger plan with enough CPU/RAM. Run a staged load test against representative authenticated and public traffic before launch; the application build alone cannot guarantee 1,000 concurrent users.

For multiple backend instances, set `CACHE_PROVIDER=upstash` and provide the Upstash REST URL/token so cache and rate-limit state are shared. Keep document processing traffic controlled because file parsing is CPU and memory intensive.