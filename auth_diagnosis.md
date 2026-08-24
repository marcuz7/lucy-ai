# Super-admin login diagnosis

Checked the canonical deployed route `https://bobalanding-tpwh9ugw.manus.space/admin/settings` on 2026-08-24.

The route first showed `Loading Lucy settings…`, then resolved to `SUPER-ADMIN ONLY — Secret management is restricted.` It did not show the unauthenticated login screen, which means the browser session is authenticated but its account does not satisfy the exact super-admin policy. The page correctly hides provider secrets and offers only a Back to dashboard link.

Next action: the user must sign in with the exact Google/Manus account whose email is `marcuz7@gmail.com`. If the user is already using that address and still sees this page, the server-side profile email or OWNER_OPEN_ID does not match the configured email and needs a controlled identity check.

No provider keys or encryption secrets were recorded.
