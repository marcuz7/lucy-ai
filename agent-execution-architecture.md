# Lucy Execution-Agent Architecture Decision Brief

Lucy’s next product step is to move from “receive a text and answer” to “receive a text, plan work, use approved tools, and text back the result.” The existing messaging gateway, durable queue, conversation persistence, admin dashboard, and Twilio settings provide the foundation. The main architecture decision is where long-running agent execution and dangerous tools should live.

| Approach | Tradeoffs | Cost | Setup complexity |
| --- | --- | --- | --- |
| **Safe-first managed agent**: keep Lucy on the existing managed web application, run the durable queue in a persistent hosting mode, use the built-in server-side LLM, and start with allowlisted tools such as public web retrieval, structured API calls, and read-only status checks. No arbitrary shell or code execution in phase one. | Fastest path to a usable product and easiest to observe in the existing admin panel. It deliberately postpones arbitrary code execution and private-service integrations until their security boundaries are ready. | Existing managed hosting plus usage-based LLM/API costs. Persistent hosting has a higher usage ceiling than autoscale and should be enabled only after confirming the expected traffic. | Moderate. Reuses Lucy’s current queue and admin system, but requires agent-run records, tool schemas, progress events, and confirmation state. |
| **Full execution agent**: run the agent worker on a durable Linux host with a container sandbox, connect a tool-using framework such as LangGraph, smolagents, CrewAI, or a small custom loop, and expose only explicitly granted tools. | Supports browser automation, code execution, shell commands, and richer integrations. Requires strict isolation, resource limits, network policy, secrets handling, audit logs, and operational monitoring. The sandbox must never run untrusted commands on the application host. | A separate persistent Linux environment starts around $10/month, plus model, browser, and external API costs. | High. Requires a worker deployment, container hardening, job handoff, sandbox lifecycle management, and a secure bridge back to Lucy’s messaging backend. |

## Recommended first scope

Start with the safe-first managed agent and implement the complete orchestration contract without enabling arbitrary shell execution. The first tools should be read-only and low-risk: public web lookup, URL fetching with size/time limits, deterministic JSON/API calls, and a progress update tool. Every run should have an execution ID, a bounded step budget, a deadline, a transcript of tool calls, and a final result. Actions that send, delete, purchase, or modify external data should create a pending approval and text the user for an explicit `YES` before execution.

The full sandboxed route can then be added as a separate execution provider once the product has real traffic and a clear allowlist of commands. This keeps the public messaging endpoint reliable while ensuring the “agent can execute” promise is delivered incrementally rather than by exposing the web server to unrestricted commands.

## Decisions needed before implementation

1. Confirm whether phase one should use the safe-first managed route or begin immediately with a separate sandboxed Linux worker.
2. Confirm which messaging provider is authoritative for launch: the current Twilio number, Telnyx, or an iMessage bridge.
3. Confirm the first three user-facing tools. A practical default is public web lookup, URL fetch, and a read-only API tool.
4. Confirm whether Lucy should send intermediate SMS updates after a short delay, or only send a final response until the progress-event UI is complete.

## Safety baseline

Lucy must allowlist the sender or conversation before any agent run, enforce per-sender rate and cost limits, redact secrets from logs, reject prompt requests to reveal system instructions, and require explicit confirmation for destructive, financial, communication, or account-changing actions. Tool results must be size-limited and time-limited. Every run must be cancelable and visible in the admin control plane.


## Verified Twilio gateway constraints

Twilio’s official messaging documentation confirms that an incoming message can invoke a configured HTTP POST or GET webhook and that the application must return TwiML. Twilio also documents the incoming payload fields Lucy already normalizes, including `MessageSid`, `From`, `To`, `Body`, `NumMedia`, and media URL/content-type pairs. Twilio’s timeout guidance explicitly recommends asynchronous application-side processing with an immediate response, which supports Lucy’s durable queue design. Twilio also requires HTTPS and recommends validating the `X-Twilio-Signature` using the official SDK rather than a hand-rolled validator.

References: [1] https://www.twilio.com/docs/usage/webhooks/messaging-webhooks — Messaging Webhooks; [2] https://www.twilio.com/docs/messaging/guides/webhook-request — Twilio’s request to your incoming message Webhook URL; [3] https://www.twilio.com/docs/usage/webhooks/webhooks-security — Secure webhooks; [4] https://www.twilio.com/docs/api/errors/50076 — Webhook timeout guidance.

## UI and route verification

After the managed-agent and allowlist pass, the public launch page remains visually intact at desktop and mobile widths. The protected admin dashboard now presents inbox metrics, recent queue jobs, and a managed-agent execution-runs panel with lifecycle filtering. The Twilio settings form now includes an approved sender-number field and remains readable on mobile. `/admin` and `/admin/twilio` resolve successfully in the preview; production build and automated tests also pass. One expected legacy pending queue count is visible in the dashboard data.

The hardened desktop admin verification shows the new execution-runs surface does not disturb the existing dashboard layout, and the Twilio settings page presents the approved sender-number control within the existing security-focused form. The dashboard API batch returns 200 for summary, jobs, and agentRuns; auth.me returns the promoted admin; and Twilio status returns a stable unconfigured response with zero approved senders until the user saves credentials.

The final mobile verification confirms the admin dashboard stacks its metrics and controls without clipping, while the Twilio allowlist form remains legible with explanatory copy and a full-width save action. Active-run cancellation controls are present only on cancellable statuses; terminal and limit-reached statuses remain non-destructive and filterable.
