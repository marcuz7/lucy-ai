

## Lucy short-term memory

Lucy uses Redis for short-term conversation context when the server-side `REDIS_URL` environment variable is configured. Each conversation stores a working window of the latest 12 turns and a short-term history window of the latest 20 turns. Both Redis keys expire after 24 hours, so inactive conversations naturally disappear from short-term memory. Durable inbound, assistant, queue, audit, and tool records remain in MySQL.

If `REDIS_URL` is not configured or Redis is temporarily unavailable, Lucy falls back to the bounded in-process memory store for local development and continues using the durable MySQL records. Configure `REDIS_URL` only as a server-side secret; it must never be exposed through `VITE_` variables or client code.
