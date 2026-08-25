

## Lucy short-term memory

Lucy uses Redis for short-term conversation context when the server-side `REDIS_URL` environment variable is configured. Each conversation stores a working window of the latest 12 turns and a short-term history window of the latest 20 turns. Both Redis keys expire after 24 hours, so inactive conversations naturally disappear from short-term memory. Durable inbound, assistant, queue, audit, and tool records remain in MySQL.

If `REDIS_URL` is not configured or Redis is temporarily unavailable, Lucy falls back to the bounded in-process memory store for local development and continues using the durable MySQL records. Configure `REDIS_URL` only as a server-side secret; it must never be exposed through `VITE_` variables or client code.

## Android SMS Gateway (optional zero-cost channel)

Lucy can use an Android phone and SIM as an alternative SMS channel. The official Android SMS Gateway app supports an outbound `POST /message` API with HTTP Basic authentication and inbound `sms:received` webhooks. Lucy’s protected Super-admin settings include the gateway API URL, username, password, webhook token, Android phone number, and approved sender numbers. These credentials are encrypted at rest and never returned to the browser.

For a hosted device, use the app’s Cloud Server API base URL. For a local device, Lucy’s hosted server cannot reach `localhost` or a private phone IP; use an authenticated HTTPS tunnel or the app’s cloud-server mode. In the Android app, register the webhook URL shown in Super-admin settings for the `sms:received` event. The URL contains the configured webhook token, so treat it as private. Lucy validates the token, sender allowlist, STOP/START commands, rate limits, and message IDs before handing work to the existing durable queue.

This channel is additive: Twilio and Telnyx remain available. If Android gateway settings are absent or unreachable, they do not disable the other providers or Lucy’s safe fallback behavior.

Reference: https://github.com/capcom6/android-sms-gateway
