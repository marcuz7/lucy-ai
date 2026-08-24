# Lucy messaging architecture

Lucy is designed as a channel-neutral messaging assistant. An iMessage relay, RCS/SMS provider, or future channel adapter normalizes an inbound event into the same `InboundMessage` contract. The webhook acknowledges quickly; it does not wait for an LLM or carrier send.

## End-to-end flow

```text
Channel bridge / carrier
  -> webhook validation + idempotency + opt-out gate
  -> normalized inbound message
  -> per-conversation queue/lock
  -> memory snapshot
  -> fast speak-or-silent classifier
       -> silent: save memory, stop
       -> speak: route to conversation / web-RAG / image / music engine
  -> concise plain-text response
  -> natural chunks with typing-delay metadata
  -> outbound channel adapter
  -> working memory + fact store + retrieval index update
```

## Concurrency model

Lucy processes different conversations concurrently but serializes work within one conversation. The current skeleton uses an in-process promise lock keyed by `chatId`, which makes the behavior deterministic in development. Production should replace it with a distributed queue keyed by conversation ID, such as BullMQ with deterministic sharding or a Redis/Postgres lock. Every provider message ID must be unique in storage so carrier retries are harmless.

A short debounce window can combine multiple texts sent within a few hundred milliseconds into one LLM turn while preserving each original message in the audit log. This prevents Lucy from replying three times when a person sends three fragments in quick succession.

## Speak decision

The classifier runs before the expensive engine. Casual group banter is stored but produces no outbound message. Direct mentions, questions, and clear requests route to an engine. STOP, CANCEL, UNSUBSCRIBE, END, and equivalent commands bypass the queue and AI completely.

The current classifier is intentionally deterministic and provider-neutral. It is a safe stub that can later be replaced by a small low-latency model without changing the webhook or engine contracts.

## Engine routing

The router selects a capability before generation. General conversation uses the built-in server-side LLM helper. Current/latest questions are reserved for a web-RAG adapter. Image and music requests have explicit route names so generation providers can be added without coupling them to the channel layer.

All outbound text is normalized for mobile messaging: concise plain text, no Markdown-dependent formatting, and no claims about actions the system did not perform. The production system should add output safety and policy checks before dispatch.

## Layered memory

Working memory holds recent turns for continuity. A fact store holds stable structured facts such as names, preferences, and group plans. Older history is retained for retrieval; production retrieval should combine semantic similarity with recency weighting. The current in-memory store exposes all three boundaries so a Postgres + vector implementation can replace it without changing the pipeline.

## Production configuration still required

The Twilio adapter runs in stub mode when credentials are absent. To send real SMS, add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER`, configure the Twilio inbound webhook as `/api/webhooks/twilio/incoming`, and add signature validation before accepting provider traffic. US deployments also need carrier registration such as A2P 10DLC where applicable.

The iMessage path is deliberately not faked. It requires a separately operated bridge, such as an approved Apple Messages for Business integration or a self-hosted Mac relay, which should implement the same normalized channel contract.
