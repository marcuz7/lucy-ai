# Verification notes

## 2026-08-24

- Public landing page inspected at 1280x720: the durable LUCY.ai lockup is visible in the header, the hero and launch card render correctly, and the provisioned number appears as +84837841663.
- Public landing page inspected at 390x844: the lockup remains legible in the compact header, the sign-up and Launch Lucy controls remain reachable, and the hero/Message to launch card stack without clipping.
- Live `/admin` inspection succeeded for the promoted admin account. Current data has no inbound messages; one legacy pending job remains with `SyntaxError: "[object Object]" is not valid JSON`.
- Live `/admin/twilio` inspection succeeded and shows the protected credential form with masked/unconfigured fields and the webhook path `/api/webhooks/twilio/incoming`.
- Queue worker fix: MySQL JSON payloads are now decoded whether the driver returns an object or a string; regression tests cover both forms.
