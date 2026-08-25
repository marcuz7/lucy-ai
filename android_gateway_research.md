# Android SMS Gateway integration findings

Source: https://github.com/capcom6/android-sms-gateway

The official repository documents webhook support for `sms:received` and related events. A webhook is registered on the Android device through `POST http://<device_local_ip>:8080/webhooks` using HTTP Basic authentication, with JSON containing an id, public HTTPS URL, and event. Incoming SMS webhook payloads have the shape `{ event: "sms:received", payload: { messageId, message, phoneNumber, simNumber, receivedAt } }`.

The device API is intended to be accessed directly on the local device or through the project’s cloud-server option when direct device access is unavailable. The Android phone’s local `localhost:8080` is not reachable from Lucy’s hosted backend. A secure relay/cloud-server mode or a user-maintained tunnel is required for outbound API access. The inbound webhook URL must be public HTTPS, and the device API credentials must remain server-side.

Implementation implication: add a provider-neutral Android gateway adapter with an authenticated inbound webhook, replay/deduplication protection, sender allowlisting, and an outbound API URL/token configuration. Do not replace Twilio. Do not expose the Android device API publicly without authentication. The repository’s documented outbound API contract must be checked before sending messages; the webhook event contract above is verified.

## References

[1]: https://github.com/capcom6/android-sms-gateway "capcom6/android-sms-gateway official repository"
[2]: https://github.com/capcom6/android-sms-gateway/tree/master/docs "Android SMS Gateway documentation"
---

Note: The user’s proposed `/messages` endpoint and payload were not verified from the official repository page inspected, so they must not be hardcoded without confirming the exact outbound API contract.

Author: Manus AI
Date: 2026-08-25

