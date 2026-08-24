# LucyAi Build Route Map

## Executive direction

LucyAi should remain a **contact, not an app**: a person saves a phone number, sends natural-language intent, and Lucy performs bounded work server-side. The governing loop is:

> Text → Understand → Reason → Act → Observe → Continue → Result

The attached `BUILD LUCY v0.1` specification is directionally correct, but the safest implementation route is a staged vertical slice. Lucy should not expand into scheduling, sandboxed code, or consequential integrations until the first text-to-search-to-SMS loop is proven with a real carrier account.

## Current architecture and implementation status

| Layer | Current LucyAi implementation | Status |
|---|---|---|
| Public product surface | Lucy.ai editorial landing page, launch number, SMS composer, QR code, and onboarding CTA | Complete |
| Identity and admin access | Manus OAuth session, admin-role authorization, protected dashboard and settings pages | Complete |
| Messaging adapters | Provider-neutral channel contracts with Twilio and Telnyx adapters | Complete in stub/test mode |
| Ingestion | Signed webhook validation, normalization, immediate acknowledgement, sender allowlisting, compliance handling, and idempotency | Complete in stub/test mode |
| Async execution | Durable MySQL-backed queue, retries, dead-letter handling, and per-conversation serialization | Complete |
| Attention layer | Deterministic speak-or-silent classification with provider-neutral routing | Complete for the initial scope |
| Managed agent | Bounded tool-calling loop with step, tool, time, and cost budgets; cancellation; progress events; redacted audits | Complete |
| Read-only tools | Public web lookup, public URL fetch, and bounded public JSON API reads | Complete |
| LLM providers | Built-in Lucy LLM fallback plus encrypted BYO OpenAI-compatible routing; Groq preset accepts a single `gsk_…` key | Complete in stub/test mode |
| Admin control plane | Queue metrics, message history, conversation drill-down, run cancellation, provider setup, and masked credential status | Complete |
| Persistent scheduled agents | Durable recurring-job model and scheduler execution path | Next milestone |
| Sandboxed code execution | Explicit future boundary; not enabled in the managed phase | Deferred until after P0.2 |
| Memory layers | Working conversation memory and durable events exist; structured facts and semantic retrieval remain future work | Partial |
| Consequential integrations | Email, calendar, browser automation, payments, booking, and external mutations | Future, human-gated |

## The build route

### Route 0 — Operator setup

This is the only setup required before the live smoke test. An administrator signs in and opens `/admin/settings`. The page contains three sections: the LLM brain, Twilio SMS, and Telnyx SMS.

For Groq, select **Groq**, paste the complete `gsk_…` API key, and save. Lucy supplies the Groq-compatible endpoint and default model automatically. The key is encrypted at rest, and status responses expose only provider metadata and a configured flag. For other OpenAI-compatible providers, the administrator can provide a base URL and model explicitly.

For Telnyx, enter the API key, Telnyx public key, provisioned number, and approved sender number. Configure the Telnyx messaging profile to send `message.received` events to the public webhook path shown in the page. The administrator must also ensure the sender has opted in and that STOP handling is enabled.

| Operator action | Expected result |
|---|---|
| Select Groq and paste the full `gsk_…` key | Groq endpoint/model defaults appear automatically |
| Save LLM settings | Secret is encrypted; browser receives no plaintext key |
| Test LLM connection | Endpoint reachability result is shown without exposing the key |
| Enter Telnyx credentials and sender allowlist | Telnyx status becomes configured and masked |
| Configure the Telnyx webhook | Inbound messages can reach Lucy’s ingestion endpoint |

### Route 1 — P0 live vertical slice: text to search to SMS

The first production acceptance test is a direct text such as: “What are the three most important AI developments today?” The request must travel through the following path:

```text
User SMS
  → Telnyx signed webhook
  → normalize and persist inbound message
  → enqueue durable job and acknowledge immediately
  → load conversation context
  → managed Lucy agent
  → public web lookup tool
  → observe search results
  → LLM synthesis with source URLs
  → concise plain-text response
  → Telnyx outbound SMS
  → persist assistant event and audit outcome
```

**Acceptance criteria:** the inbound message is persisted exactly once; the webhook acknowledges quickly; the agent invokes the real public web-search tool; tool output is treated as untrusted data; the response is concise and source-backed; the outbound message is sent through the configured Telnyx adapter; and the admin dashboard shows the message, job, run, tool call, and final result.

The automated suite already covers the signed Telnyx route, queue path, agent integration, dashboard observability, compliance replies, rate limiting, cancellation, budgets, and redaction. The remaining live dependency is the user-owned Telnyx account and its webhook configuration.

### Route 2 — P0 hardening and operating readiness

After one successful live task, run a short controlled set of cases: duplicate webhook delivery, an unapproved sender, STOP, START, a rate-limited sender, a provider outage, a search timeout, and an LLM failure. Confirm that each case produces the expected durable status and safe user-facing reply.

Then establish operational baselines. Track time to first progress message, time to useful result, task completion rate, tool success rate, failed-job rate, retry volume, estimated model cost, and user intervention rate. The technical north star is successful autonomous task completions per dollar of execution cost, not messages per dollar.

### Route 3 — P0.2 persistent task demonstration

The next product-defining capability is turning text into a durable scheduled agent. The acceptance request is: “Every morning at 7 send me the top three Malaysian AI stories in Bahasa Malaysia.” Lucy must identify that the request is persistent, resolve the user’s timezone, create a durable job, confirm the schedule, execute without a new inbound message, research current information, send the result, update `last_run` and `next_run`, and recover from failures.

The job record should include the owner, objective, instruction, trigger type, schedule, timezone, allowed tools, authority level, status, execution budget, notification policy, success criteria, and failure policy. Scheduling should use the platform’s durable job mechanism rather than a process-local timer.

### Route 4 — Memory and attention expansion

Once scheduled execution is reliable, improve continuity without dumping entire transcripts into every LLM request. Keep recent working memory for immediate context, structured relational facts for preferences and recurring details, and semantic memory for older relevant turns. Retrieval should combine semantic relevance, recency, and importance.

Expand the attention engine from the current deterministic scope toward the five-way behavior model in the specification: **IGNORE, REMEMBER, RESPOND, EXECUTE, SCHEDULE**, with **NEEDS_CONFIRMATION** as a policy outcome. Direct one-to-one conversations should default toward responding; future group chats should support silence during irrelevant banter.

### Route 5 — Sandboxed creation tools

Only after the read-only agent and persistent jobs are stable should Lucy gain `run_code`. Generated code must execute in an isolated worker or sandbox, never directly on the application host. The sandbox requires resource limits, a restricted filesystem, explicit network policy, secret isolation, execution timeout, artifact storage, and audit records.

The first sandbox acceptance test should be a bounded transformation such as converting a user-provided CSV into a chart artifact. The result should be stored safely and returned through a controlled link or message summary. Arbitrary host shell access is out of scope.

### Route 6 — Human-gated integrations

Add explicit capability adapters for email, calendar, files, cloud storage, CRM, browser automation, travel, payments, and deployment. Each tool must declare its risk level, permissions, timeout, logging policy, and required authority.

Use the policy ladder from the specification:

| Authority | Meaning | Default behavior |
|---|---|---|
| L0 | Read and inspect | Usually automatic |
| L1 | Create drafts, files, or artifacts | Usually automatic |
| L2 | Modify user-controlled systems | Confirm depending on context |
| L3 | Communicate externally | Explicit authorization |
| L4 | Transact or create financial commitment | Explicit confirmation |
| L5 | Destructive or irreversible action | Strong confirmation or refusal |

Lucy must persist a pending action and bind any confirmation to the specific action, identity, expiration, and authorization context. A model response or conversation phrase must never be sufficient to bypass this policy layer.

### Route 7 — Future governed agent platform

Lucy should remain standalone in v0.1. Keep persistent-agent boundaries clean enough that a later Agent Passport can carry identity, role, objective, skills, tools, authority, budget, KPI, memory, supervisor, and audit history. Only after Lucy’s runtime is reliable should it become an execution substrate beneath a broader governed AI workforce such as Allynix.

## Security gates that apply to every route

Security is enforced in application code, not only in prompts. Every inbound path must validate the provider signature, normalize input, enforce sender authorization, apply idempotency, and handle STOP/CANCEL/START before expensive execution. Every tool must be allowlisted and bounded. Every credential must remain server-side and encrypted where applicable. Retrieved websites and API responses are untrusted data. Audit records must redact API keys, bearer tokens, phone numbers where required, and sensitive tool arguments.

The admin settings page is protected by the authenticated administrator account and server-side `adminProcedure` checks. Regular users cannot read, save, or test provider or LLM credentials. A separate shared application password is intentionally not used because it would create a second secret and a weaker access model than the existing identity-plus-admin-role boundary.

## Recommended next action

The next action is **Route 1 live P0 verification**. In `/admin/settings`, save the full Groq key if the LLM test is desired, then configure Telnyx with the provisioned number, public key, approved sender, and messaging-profile webhook. Send one real search request and inspect the resulting run in `/admin`.

Do not start the scheduler, sandbox, or external integrations until that live vertical slice succeeds. If the live test fails, classify the failure as one of four boundaries—carrier webhook, queue, LLM/tool execution, or outbound dispatch—and fix that boundary before adding scope.

## Current blocking dependency

The repository implementation is ready for the live P0 test. The remaining blocker is not application code: it is the user-owned Telnyx configuration and an approved sending identity. Until those are available, the automated tests and stub adapters are the correct evidence, but a real text-to-search-to-SMS result must not be claimed.

## Source

This route map synthesizes the user-provided `BUILD LUCY v0.1` specification with the current LucyAi repository implementation and its verified test/build state.
