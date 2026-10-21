# PRD: Lucy v2.0

## 1. Product
Lucy is an open, self-hostable autonomous agent you text. Save a number, say what you need, Lucy executes. One Lucy. Many doors. Same mind.

## 2. Problem
AI agents require installs, terminals, and infrastructure. 5 billion people have phones; almost none will configure a server. Instinct proved the demand at a $10B valuation but is invite-only, US-first, and closed. The open, international, self-hostable version does not exist.

## 3. Users
- Primary: non-technical users and small businesses in emerging markets, starting with Malaysia/SEA.
- Secondary: self-hosters and developers who want an extensible agent they own.

## 4. User Stories
- I text Lucy a question, she answers with live sources.
- I say "every monday 8am send me the top AI news in bahasa" and a persistent job is created.
- I connect Telegram to the same Lucy that already knows me from SMS, verified by OTP.
- When Lucy wants to spend money or send anything on my behalf, she asks first and waits for my YES.
- I self-host her on my own SIM and server, owning my data.

## 5. Functional Requirements

### P0 (vertical slice, ships first)
- F1 Inbound SMS via Android gateway; Twilio adapter as fallback.
- F2 Bounded agent loop with tool calling, max 6 iterations.
- F3 search_web tool.
- F4 Working-tier conversation memory.
- F5 Instant "on it" ack, real answer follows async.

### P1 (identity and persistence)
- F6 LucyUser UUID + ChannelIdentity model.
- F7 OTP channel linking. Identifier matching is never proof of ownership.
- F8 Persistent scheduled jobs.
- F9 Structured memory: user facts, preferences.

### P2 (action)
- F10 Action policy enforced in code: L0 read, L1 memory write, L2 scheduled job, L3 communicate, L4 transact, L5 irreversible.
- F11 Anything L3+ requires explicit user confirmation.
- F12 More tools: browse_page, run_code sandbox, email.

### P3 (growth)
- F13 Group chat attention engine: IGNORE / REMEMBER / RESPOND / EXECUTE.
- F14 Semantic memory (gbrain-style).
- F15 Web client.

## 6. Architecture
- Messaging adapters: one gateway abstraction, many doors (Android SIM, Twilio, Telnyx, Telegram).
- Ingestion: validate, sanitize, rate-limit. Every inbound message is untrusted input, never instruction.
- Agent runtime: bounded ReAct loop, provider-neutral LLM.
- Tool registry: schema-defined, hot-addable.
- Action policy: deterministic layer between reasoning and execution. The model requests, the code decides.
- Memory: working (recent turns), structured (who you are), semantic (long ago).
- Identity: UUID is permanent, phone number is the human-facing credential, channels link only through verified ownership.

## 7. Tech
TypeScript monorepo (existing lucy-ai repo): React client, Express + tRPC, Drizzle on TiDB, Upstash Redis, AES-256-GCM secrets. Deploy on Render, move to Fly.io when stable. Target cost: $0/month.

## 8. Metrics
- Activation: first sourced answer within 60s of first text.
- Retention: user still texting on day 7.
- Jobs: persistent jobs per active user.
- Trust: confirmation acceptance rate.
- Cost: under $0.50 per active user per month.

## 9. Milestones
- M1 (week 1): P0 live on Render + TiDB + own SIM. Dogfood daily.
- M2 (weeks 2-3): Identity + scheduled jobs. Ship the 7am news demo. Record it.
- M3 (week 4): Action policy + confirmation flow. Open-source launch: Show HN, r/selfhosted, r/LocalLLaMA.
- M4 (month 2+): Attention engine, semantic memory, first external users.

## 10. Risks
- Personal-phone gateway reliability. Mitigation: Twilio upgrade path once revenue exists.
- Free tier sleep. Mitigation: Fly.io.
- LLM cost at scale. Mitigation: Groq limits, model fallback.
- Competition from Instinct/Boba. Moat: open, international, self-hostable.
- Solo builder burnout. Mitigation: ship P0 before touching anything else.

## 11. Open Questions
- Bilingual persona: Bahasa + English?
- License: MIT vs AGPL (AGPL protects against closed forks)?
- Monetization: self-host free, managed hosting paid?
