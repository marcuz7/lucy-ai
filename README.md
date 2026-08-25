# Lucy AI

Lucy AI is a provider-neutral messaging agent: people contact Lucy through a supported messaging channel, Lucy normalizes the message, runs the bounded agent pipeline, and replies through the original channel. The current project uses React, Express, tRPC, Drizzle/MySQL, Redis-compatible short-term memory, and encrypted Super-admin provider settings.

> **One Lucy. Many doors. Same mind.**

## Quick start

Install the repository dependencies and start the development server:

```bash
pnpm install
pnpm dev
```

Run the project checks before committing changes:

```bash
pnpm test
pnpm check
pnpm build
```

The hosted application runs behind HTTPS. The local development server uses the port supplied by the runtime; do not hard-code a production port in application code.

## Android SMS Gateway

Android SMS Gateway lets Lucy use an Android phone and its SIM as an SMS channel. The Android app receives SMS messages and sends webhook events to Lucy. When Lucy finishes processing a message, the server calls the gateway’s authenticated `POST /message` endpoint so the phone sends the reply. The provider adapter is additive: Twilio and Telnyx remain available and are not replaced.

Lucy’s Android integration follows the official Android SMS Gateway API and webhook model [1]. It accepts the `sms:received` event, validates the configured webhook token, checks the sender allowlist, applies STOP/START compliance handling and rate limits, rejects duplicate message IDs, and then hands the normalized message to Lucy’s existing asynchronous queue.

### 1. Install and prepare the Android app

Install the Android SMS Gateway application from its official distribution or repository, grant the required SMS and notification permissions, and keep the phone powered on with network access. The phone must be able to receive the inbound SMS and the configured gateway API must be reachable from Lucy’s hosted server.

The recommended production arrangement is the app’s Cloud Server mode. If the phone exposes only a local API, Lucy cannot reach `localhost` or a private address such as `192.168.x.x` from the hosted server. Use an authenticated HTTPS tunnel or another secure public relay instead. Never expose an unauthenticated phone-control API to the public internet.

### 2. Configure the protected Lucy settings

Sign in as the designated Super-admin and open **Super-admin settings → Android SMS Gateway**. Enter the values below. Lucy encrypts the username, password, and webhook token before storing them and returns only masked status information to the browser.

| Setting | Required value | Notes |
|---|---|---|
| Gateway API URL | The Android gateway API base URL | Use the Cloud Server URL or an authenticated HTTPS tunnel. Do not use `localhost` in production. |
| Gateway username | The gateway Basic Auth username | Stored encrypted. |
| Gateway password | The gateway Basic Auth password | Stored encrypted and never returned to the client. |
| Webhook token | A long random secret chosen by the administrator | Stored encrypted and required on every inbound webhook. |
| Android phone number | The phone SIM number in E.164 format | Example: `+15551234567`. |
| Approved sender numbers | One or more E.164 sender numbers | Only allowlisted senders can trigger Lucy when the gateway is configured. |

Save the settings and use **Test Android gateway**. A successful test confirms that Lucy can reach the configured gateway endpoint with the saved Basic Auth credentials; it does not send an SMS.

### 3. Register the inbound webhook

Copy the webhook URL displayed in the Android gateway settings page. Its structure is:

```text
https://YOUR_LUCY_DOMAIN/api/webhooks/android-gateway/incoming?token=YOUR_WEBHOOK_TOKEN
```

Register this URL in the Android app for the `sms:received` event. Treat the complete URL as a secret because it contains the webhook token. If you rotate the token in Lucy, update the Android app’s webhook URL at the same time.

Lucy expects a JSON event shaped like this:

```json
{
  "event": "sms:received",
  "payload": {
    "messageId": "provider-message-id",
    "phoneNumber": "+15551234567",
    "message": "Search for three weekend options",
    "receivedAt": "2026-08-25T12:00:00.000Z"
  }
}
```

The webhook responds quickly and does not run the agent inline. A valid message receives an HTTP `202` response after it has been handed to the durable queue. The worker loads memory, runs Lucy’s bounded agent loop, sends progress or final text through the Android gateway, and persists the resulting message and audit records.

### 4. Configure outbound delivery

The Android adapter sends an authenticated JSON request to the gateway’s `/message` endpoint:

```json
{
  "textMessage": { "text": "Lucy’s reply" },
  "phoneNumbers": ["+15551234567"]
}
```

The gateway API request uses HTTP Basic authentication. Lucy does not put the username, password, or webhook token into client-side code, logs, public launch cards, or the browser response.

### 5. Test the complete flow

After saving the settings and registering the webhook, send an SMS from an approved sender to the Android SIM. Start with a short request such as:

```text
Search the web for the latest AI news and summarize it.
```

The expected flow is **SMS → Android webhook → validation → durable queue → Lucy agent/search → Android gateway `/message` → SMS reply**. If the webhook is reachable but no reply arrives, check the gateway connection test, the approved sender list, the webhook token, the server logs, and whether the Android phone remains online.

A harmless local route smoke test can confirm that the route is registered without enqueueing a real SMS:

```bash
curl -i -X POST http://127.0.0.1:3000/api/webhooks/android-gateway/incoming \
  -H 'Content-Type: application/json' \
  --data '{"event":"app:started","payload":{}}'
```

The route should return `204 No Content` for an event other than `sms:received`.

## Environment variables

Secrets and environment variables belong on the server. Do not prefix server secrets with `VITE_`, do not paste them into source files, and do not commit `.env` files. In the managed Lucy deployment, use the project’s secret-management interface for required values. The Android gateway’s primary credentials are intentionally configured in the protected Super-admin settings rather than as browser-visible environment variables.

### Required platform variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | MySQL/TiDB connection used for users, messages, jobs, credentials, and audit records. |
| `JWT_SECRET` | Session-cookie signing secret and legacy credential-decryption fallback during migration. |
| `VITE_APP_ID` | Manus OAuth application identifier. |
| `OAUTH_SERVER_URL` | Manus OAuth server base URL. |
| `OWNER_OPEN_ID` | Owner identity metadata used by the authentication system. |
| `LUCY_SUPER_ADMIN_EMAIL` | Exact email allowed to manage provider secrets; currently configured as `marcuz7@gmail.com`. |
| `LUCY_CREDENTIALS_ENCRYPTION_KEY` | Base64-encoded 32-byte AES-256-GCM key for new encrypted provider credentials. Generate with `openssl rand -base64 32`. |
| `BUILT_IN_FORGE_API_URL` | Server-side base URL for managed built-in APIs. |
| `BUILT_IN_FORGE_API_KEY` | Server-side authorization key for managed built-in APIs. |

### Optional memory and provider variables

| Variable | Purpose |
|---|---|
| `REDIS_URL` | Optional server-side Redis URL for short-term memory. Lucy stores recent context with a 24-hour expiry and falls back safely when Redis is unavailable. It can also be configured later in Super-admin settings. |
| `ANDROID_GATEWAY_WEBHOOK_TOKEN` | Optional server-side fallback token for Android webhook validation when no encrypted Super-admin record is available. Prefer the protected settings record. |
| `LUCY_ALLOWED_SENDERS` | Optional fallback sender allowlist used when provider-specific encrypted settings are absent. Values must be E.164 numbers separated by spaces or commas. |
| `TWILIO_ACCOUNT_SID` | Optional environment fallback for Twilio Account SID. Prefer Super-admin settings. |
| `TWILIO_AUTH_TOKEN` | Optional environment fallback for Twilio Auth Token. Never expose it to the client. |
| `TWILIO_PHONE_NUMBER` | Optional environment fallback for the Twilio sender number. |
| `TELNYX_API_KEY` | Optional environment fallback for Telnyx API access. Prefer Super-admin settings. |
| `TELNYX_PUBLIC_KEY` | Optional Telnyx webhook verification key. |
| `TELNYX_PHONE_NUMBER` | Optional Telnyx sender number. |
| `TELNYX_ALLOWED_SENDERS` | Optional Telnyx sender allowlist. |

The Android gateway URL, username, password, webhook token, phone number, and sender allowlist are configured through **Super-admin settings** and stored in the encrypted database table `lucy_android_gateway_credentials`. The environment variables above are fallbacks or platform settings; they do not replace the protected UI flow.

### Local `.env` example

For local development only, create an untracked `.env` file with placeholder values that match your environment:

```dotenv
NODE_ENV=development
DATABASE_URL=mysql://user:password@127.0.0.1:3306/lucy
JWT_SECRET=replace-with-a-long-random-session-secret
VITE_APP_ID=your-manus-app-id
OAUTH_SERVER_URL=https://api.manus.im
OWNER_OPEN_ID=your-owner-open-id
LUCY_SUPER_ADMIN_EMAIL=marcuz7@gmail.com
LUCY_CREDENTIALS_ENCRYPTION_KEY=base64-encoded-32-byte-key
REDIS_URL=rediss://:password@redis.example.com:6379
```

Do not add real values to this README, GitHub issues, screenshots, test fixtures, or chat messages. The repository’s `.gitignore` should keep `.env*` files out of version control.

## Security model

Provider secrets are encrypted at rest with versioned AES-256-GCM using `LUCY_CREDENTIALS_ENCRYPTION_KEY`. The Super-admin boundary requires the authenticated admin role and the exact configured email. Status endpoints return masked metadata rather than plaintext secrets. Webhook handlers apply provider authentication, sender allowlisting, compliance commands, replay protection, and rate limits before the agent is invoked.

The Android gateway has an additional network boundary: the hosted Lucy server must reach the gateway through a secure reachable endpoint, while the Android app must reach Lucy’s HTTPS webhook. A local phone address is not a production deployment strategy. If a tunnel is used, protect both the tunnel and the gateway API with authentication and rotate credentials if the URL is exposed.

## Troubleshooting

| Symptom | Likely cause | Action |
|---|---|---|
| Android gateway test cannot connect | The API URL is local-only, the phone is offline, or the tunnel is unavailable | Use Cloud Server mode or an authenticated HTTPS tunnel and run the connection test again. |
| Android gateway returns HTTP 401 or 403 | The Basic Auth username or password is incorrect | Copy the credentials from the Android gateway configuration and save both values again. |
| Webhook returns 403 | The URL token is missing or does not match the saved webhook token | Copy the complete URL from Super-admin settings and update the Android app. |
| Webhook returns 403 for a sender | The sender is not on the approved E.164 allowlist | Add the sender in Super-admin settings, then resend the SMS. |
| Webhook returns 202 but no reply arrives | The queue worker, agent provider, or outbound gateway is unavailable | Inspect queue and agent-run status in the Admin dashboard and test the gateway connection. |
| Redis is unavailable | `REDIS_URL` is wrong or Redis is unreachable | Correct the URL later in Super-admin settings; Lucy continues with bounded fallback memory and MySQL durability. |

## References

[1]: https://github.com/capcom6/android-sms-gateway "Android SMS Gateway official repository and API documentation"
