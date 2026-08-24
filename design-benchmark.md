# LucyAi design benchmark

## Reference observations

The live reference uses a compact sticky header, a quiet pale-lavender canvas, a strongly asymmetric hero with copy and product UI, a restrained aubergine primary action, thin rules, small uppercase labels, and a clear progression from hero to benefits to product explanation to capability cards to FAQ and final CTA. Its polish comes from consistent spacing, restrained radii, a limited color hierarchy, and repeated message-native moments rather than from dense decoration.

## Current LucyAi observations

LucyAi already has the right broad editorial direction: lavender background, plum type, a split hero, a phone mockup, rounded onboarding card, benefits strip, feature grid, FAQ, and closing CTA. The current version feels less refined because the navigation and hero proportions are a little loose, the first fold carries many competing accents, the mustard action surface is too dominant, and the lower feature grid alternates between message snippets and generic lifestyle images. The visual system also needs a more deliberate section rhythm, quieter borders/shadows, and more consistent message-native signals.

## Refinement decisions

Keep the LucyAi identity, original copy, full LUCY.ai lockup, provisioned number, QR/SMS behavior, and admin routes. Refine the public page with tighter header/hero geometry, deep aubergine as the primary CTA surface, mustard only as a small accent, clearer message UI in every major content band, more consistent card hierarchy, stronger responsive stacking, and restrained motion for hover/focus/FAQ/modal interactions. Do not copy the reference’s wording, logo, or product identity.


## Refinement pass verification

The updated desktop fold now has a more deliberate split: the hero headline has stronger scale and whitespace, the launch card reads as a single conversion unit, the phone is balanced by a compact launch-action stack, and primary interaction color is aubergine. The mobile fold keeps the lockup and controls accessible, preserves the large editorial headline, and stacks the launch card before the phone/action module without clipping. The phone begins naturally below the fold rather than competing with the headline.


## Route and runtime verification

The full-page desktop pass confirms the revised rhythm holds through the intro, product capability grid, FAQ, closing CTA, and footer. Every major lower-page card now carries an explicit thread or group-chat signal. The protected `/admin` and `/admin/twilio` routes still render correctly after the public CSS changes. Latest client/network inspection shows successful page and analytics requests; the only server log errors are historical pre-repair OAuth entries for the missing `users` table.
