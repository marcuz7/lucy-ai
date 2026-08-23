# Boba landing page reverse-engineering brief

## Reference ground truth

The provided screenshots and the live getboba.ai page are the source of truth. Recreate the page as a light, mobile-first marketing site for a text-based social assistant. The visual language is warm, editorial, and product-led: pale lavender surfaces, deep plum typography, rounded white cards, mustard accents, and a sticky top navigation. The screenshots show a narrow mobile layout; the live page confirms a wider desktop composition with the hero split between copy and a phone mockup.

The recreation should preserve the hierarchy and content patterns rather than the browser chrome visible in screenshots. The site includes a header, hero, onboarding panel, messaging demo, benefits strip, group-chat feature explanation, product capability cards, FAQ accordion, and closing CTA/footer.

## Chosen direction: Reference-faithful social utility editorial

### Design Movement
Contemporary editorial SaaS marketing with a soft neo-grotesk system and tactile product-card composition.

### Core Principles
1. Make the message thread feel like the product: conversational copy, chat bubbles, and phone UI are the dominant visual evidence.
2. Use generous vertical rhythm and rounded cards to make dense information feel calm and approachable.
3. Keep the palette restrained: plum for trust and recognition, lavender for softness, mustard for warmth, and blue only for the SMS action.
4. Treat the mobile viewport as the primary composition while allowing the desktop version to open into an asymmetric split layout.

### Color Philosophy
The near-white lavender background (#fbf9ff) creates a quiet canvas; deep aubergine (#21122f) carries headlines and buttons with strong contrast; muted violet (#6d5a7b) makes supporting text feel human rather than technical; mustard (#e9b837) marks moments of delight and emphasis; pale lilac (#efe8f8) separates content bands without heavy borders.

### Layout Paradigm
A vertically paced narrative built from alternating open lavender sections and floating white rounded cards. On desktop, the hero becomes a two-column stage with copy and onboarding on the left and a tall phone mockup on the right; lower content stays in a deliberately narrow editorial measure with staggered feature cards.

### Signature Elements
- A compact uppercase eyebrow treatment with a mustard dot or rule.
- Deep-plum pill buttons with subtle lift and soft shadows.
- Conversation UI: avatars, message bubbles, typing dots, and small emoji accents.

### Interaction Philosophy
Interactions should feel like adding a thoughtful friend: clear, low-friction, and reassuring. The primary CTA opens a simulated SMS flow modal instead of pretending to send a real message. FAQ items use native-feeling disclosure behavior with one or more items open at a time.

### Animation
Use short, physically intuitive transitions: buttons compress on press, cards lift slightly on hover, phone messages fade upward in a stagger, and the CTA modal scales from 0.97 with opacity. Respect reduced-motion preferences and avoid decorative motion that competes with reading.

### Typography System
Use Plus Jakarta Sans for the rounded, friendly display/headline voice and DM Sans for body copy and controls. Headlines are bold, compact, and slightly tracked tight; body copy uses a relaxed 1.55–1.65 line height. Uppercase eyebrows use 0.16em tracking.

### Brand Essence
A socially aware assistant that lives in the messages app you already use, for people who plan, decide, and create together without another app. Personality: observant, warm, capable.

### Brand Voice
Headlines are direct, lightly playful, and specific. CTAs sound like a natural next message, never like enterprise software.

Example lines: “Not artificial intelligence (AI), social intelligence.” / “Say hi to boba.”

### Wordmark & Logo
Use a custom text treatment for “boba” with a distinctive oversized first letter and circular counters, paired with a simple bubble mark made from three plum dots. Do not use the brand name as an unstyled default heading.

### Signature Brand Color
Deep aubergine #21122f.
