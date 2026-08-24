# Reverse-engineered Lucy landing page

- [x] Replace all visible Boba references with Lucy.
- [x] Update page metadata, CTA modal copy, FAQ copy, and brand labels.
- [x] Verify the rename at mobile and desktop widths.
- [x] Save a Lucy-branded checkpoint and deliver it.
- [x] Upgrade Lucy to full-stack backend support.
- [x] Add the Twilio webhook contract and immediate acknowledgment.
- [x] Add STOP/CANCEL/START opt-out and re-opt-in handling with per-user rate limiting.
- [x] Add durable queued message processing, per-conversation serialization, conversation state, and outbound reply boundaries.
- [x] Verify backend behavior and document required secrets and Twilio setup.

- [x] Map all reference sections and responsive behaviors, including the feature card, FAQ states, and closing CTA.
- [x] Create the ground-truth design brief in `ideas.md`.
- [x] Prepare visual assets and typography for the screenshot-informed recreation.
- [x] Implement the sticky header, hero, onboarding panel, feature sections, FAQ accordion, and closing CTA.
- [x] Validate the page at the reference mobile viewport and refine spacing, type, color, and interactions.
- [x] Save the final checkpoint and deliver the project version.

- [x] Define Lucy’s channel-agnostic inbound event, speak decision, engine route, outbound chunk, and memory contracts.
- [x] Add persistence boundaries for inbound messages, speak decisions, conversation memory, facts, and retrieval metadata.
- [x] Add a fast classifier-first pipeline with silent handling and provider-neutral engine routing.
- [x] Add chunking, typing-delay metadata, outbound dispatch boundaries, and layered memory retrieval interfaces.
- [x] Verify the architecture in stub mode and document what requires real channel/provider credentials.
- [x] Save the architecture-enabled Lucy checkpoint and deliver it.

- [x] Add a clear signup/login entry point using the existing Manus OAuth flow.
- [x] Add admin-only Twilio credential storage and management procedures.
- [x] Add an admin settings UI for Account SID, Auth Token, and Twilio phone number.
- [x] Add masking, validation, and credential test feedback without exposing secrets.
- [x] Verify regular-user access is denied and admin flows work responsively.
- [x] Save the admin-enabled Lucy checkpoint and deliver it.

- [x] Add persisted incoming-message records linked to Lucy conversations.
- [x] Add admin-only dashboard queries for message history and queue status.
- [x] Build the responsive admin dashboard with queue metrics, filters, and recent messages.
- [x] Verify admin authorization, empty/loading/error states, and mobile/desktop layouts.
- [x] Save the admin dashboard checkpoint and deliver it.

- [x] Fix the deployed landing page brand regression so all visible Boba copy renders as Lucy.

- [x] Add a protected message-detail query with full conversation history and related queue activity.
- [x] Add dashboard drill-down links from each incoming message to its detail view.
- [x] Build responsive message detail and conversation timeline states.
- [x] Verify detail authorization, loading/empty/error states, and mobile/desktop layouts through protected UI branches, backend authorization tests, missing-message coverage, and mobile/desktop route checks; live-data admin inspection requires a real admin session.
- [x] Save the message-detail checkpoint and deliver it.
- [x] Add authorization coverage for the message-detail procedure.

- [x] Replace reference-derived public copy with original Lucy positioning and messaging.
- [x] Reframe the hero around “your first AI agent,” zero installation, and message-to-launch.
- [x] Rewrite feature cards, onboarding steps, FAQ, CTA, and metadata in Lucy’s own voice.
- [x] Verify the new public site at mobile and desktop widths without breaking admin routes.
- [x] Save and deliver the differentiated Lucy website checkpoint.

- [x] Add a visible configurable launch phone number to the phone demo.
- [x] Add click-to-copy behavior with clipboard fallback and success feedback.
- [x] Verify keyboard accessibility and mobile/desktop behavior through a native button with focus styling, clipboard fallback, explicit feedback labeling, and mobile/desktop visual checks.
- [x] Save and deliver the interactive phone demo checkpoint.

- [ ] Replace the demo launch number with +84837841663.
- [ ] Link the launch card to a native SMS composer using the provisioned number.
- [ ] Add a desktop QR code for launching Lucy by message.
- [ ] Add image and voice-note previews to conversation details.
- [ ] Add privacy-safe export and redaction controls for conversation records.
- [ ] Inspect a live conversation in an authenticated admin session.
- [ ] Verify launch, media, export/redaction, and responsive admin flows.
- [ ] Save and deliver the completed Lucy upgrade checkpoint.

- [x] Replace Boba Landing Recreation with LucyAi in project-facing titles and metadata.
- [x] Update the OAuth/sign-in project title to LucyAi through the managed application-title setting.
- [x] Search for and remove remaining user-facing legacy references; remaining repository-name strings are internal project identifiers/log history.
- [x] Verify public, admin, and authentication entry points after the rename.
- [x] Save and deliver the LucyAi rename checkpoint.

- [x] Replace the old logo asset with the provided head-and-lightbulb logo.
- [x] Update visible logo references and favicon to the new asset.
- [x] Verify the new logo on public and admin entry points.
- [x] Save and deliver the logo replacement checkpoint.
