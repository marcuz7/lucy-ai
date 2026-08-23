/*
 * Reference-faithful Boba editorial system: aubergine type, lavender canvas,
 * mustard accents, rounded product cards, and conversational product UI.
 */
import { useState } from "react";
import { ArrowRight, Check, ChevronDown, MessageCircle, Plus, X } from "lucide-react";

const logoMark = "/manus-storage/boba-logo-mark_5dd20a42.png";
const pickleballImage = "/manus-storage/pickleball-blue-court_2e8ca9c0.jpg";
const dinnerImage = "/manus-storage/dinner-table_decb8fd1.jpg";
const cabinImage = "/manus-storage/cabin-sunset_54a8ba8b.jpg";

const faqs = [
  ["Is Boba really free?", "Yes. No subscription, no ads, no awkward free trial. Boba is free to use."],
  ["Does it work on Android?", "Yes, over RCS. Boba works over RCS, not plain SMS, so turn on chat features (RCS) in Google Messages first. Then tap Open Messages here or text the number shown, and you're in. Boba also works in group chats that mix iPhone and Android, as long as the group runs over RCS too — SMS/MMS group texts won't reach Boba. If your phone falls back to SMS (no Wi-Fi or data), sign-up won't go through, so make sure RCS is on."],
  ["How do I add Boba to a group chat?", "Text Boba 1:1 first. Then add the Boba number to any group from your Messages app, same as adding any other contact."],
  ["Do I need to download an app?", "No. Boba lives inside the Messages app you already have: iMessage on iPhone, Google Messages on Android. There's nothing to install and nothing new to learn."],
  ["How do I start?", "Tap Open Messages and send the pre-written message. Your invite code travels with it automatically, and that first text is your sign-up."],
  ["What can I actually ask it?", "Pretty much anything: plan a trip or a group hang, make or edit an image, write a song about the moment, draft a tricky message, settle a debate, or just get a quick, smart answer. Add it to a group chat and it helps everyone at once."],
  ["How does Boba safeguard my data?", "Messages are stored so the conversation has memory. We may use them to improve our AI and future products, but we never sell them to advertisers or use them to train third-party models. Your phone number is only used to deliver the service. Never for marketing, never shared, never sold. Full details in the Privacy Notice."],
];

function Logo() {
  return <a href="#top" className="brand" aria-label="Boba home"><img src={logoMark} alt="" /><span>boba</span></a>;
}

function Header({ onText }: { onText: () => void }) {
  return <header className="site-header"><div className="header-inner"><Logo /><div className="header-right"><span className="header-kicker">AI IN YOUR TEXTS</span><button className="pill-button header-cta" onClick={onText}>Text Boba</button></div></div></header>;
}

function PhoneMockup() {
  return <div className="phone-wrap" aria-label="Boba in a group text message"><div className="phone"><div className="phone-notch" /><div className="phone-status"><span>9:41</span><span>▮▮▮ ◉ ▰</span></div><div className="chat-head"><div className="avatar-row"><span className="avatar green">M</span><span className="avatar lilac">J</span><span className="avatar plum">•••</span></div><strong>Lake Trip 🏔️</strong><small>You, Maya, Jon · Boba added 🧋</small></div><div className="messages"><div className="bubble user">ok who's actually free the 14th?? 😩</div><div className="bubble user">i'm in 🙌 someone find us a cabin</div><div className="bubble question">are there any cabins for all 5 of us near the lake for under $400?</div><div className="bubble boba"><strong>Boba</strong><br />Found 3 🏔️ Lakeview Cabin sleeps 6 · $320/night · 4-min walk to the water. Want the links + a Sat 9am departure plan?</div></div><div className="imessage">iMessage <span>↑</span></div></div></div>;
}

function SignupCard({ onText }: { onText: () => void }) {
  return <div className="signup-card"><button className="open-messages" onClick={onText}><MessageCircle size={25} /> Open Messages</button><p className="legal">By clicking “Open Messages”, you agree to Boba’s <u>Terms of Service</u> and <u>Privacy Notice</u> and consent to receive text messages from Boba. Boba is an AI assistant and can get things wrong. Reply STOP to any Boba message to opt out at any time. Messages you send may be used to improve Boba.</p><div className="steps"><span><b>1</b> Open Messages</span><ArrowRight size={18} /><span><b>2</b> Send the hello</span><ArrowRight size={18} /><span><b>3</b> Create a group with Boba</span></div></div>;
}

function FeatureCard({ image, eyebrow, title, body, children }: { image?: string; eyebrow: string; title: string; body: string; children?: React.ReactNode }) {
  return <article className="feature-card">{image && <img className="feature-image" src={image} alt="" />}<div className="feature-copy"><span className="eyebrow">{eyebrow}</span><h3>{title}</h3><p>{body}</p>{children}</div></article>;
}

export default function Home() {
  const [activeFaq, setActiveFaq] = useState<number | null>(1);
  const [modal, setModal] = useState(false);
  return <div id="top" className="site-shell"><Header onText={() => setModal(true)} /><main>
    <section className="hero section-pad"><div className="hero-copy"><div className="eyebrow-tag"><span /> FREE · NO APP · NO SIGN-UP</div><h1>Not artificial intelligence (AI),<br /><em>social intelligence.</em></h1><p className="hero-lede">Meet Boba, a genuinely smart assistant with real social instincts, living in the Messages app you already have. Text it one-on-one, or <strong>start a group chat with it</strong> to plan with everyone at once. No download, no login, no $20/mo.</p><SignupCard onText={() => setModal(true)} /></div><PhoneMockup /></section>
    <section className="benefits"><div><Check /> $0, no card</div><div><Check /> Nothing to download</div><div><Check /> Works in the Messages app you already have</div></section>
    <section className="intro section-pad"><span className="eyebrow">READS THE ROOM</span><h2>At home in group<br className="mobile-only" /> chats</h2><p>Boba hangs back during normal chatter and jumps in only when someone needs it, to pick the restaurant, settle the argument, plan the trip, even spin a shared memory into a song. It picks up on your group&apos;s style as it goes, and you can kick it out any time.</p><p className="small-copy">Text Boba once, then add it to any group chat right from your Messages app, just like adding a friend.</p><div className="assistant-card"><div className="assistant-dot">•••</div><h3>Boba 🧋</h3><span>AI ASSISTANT</span><div className="assistant-buttons"><button>message</button><button>add to<br />group</button></div></div></section>
    <section className="uses section-pad"><div className="uses-heading"><span className="eyebrow">ONE NUMBER. A THOUSAND USES.</span><h2>Plan, create, decide.<br />All by text.</h2><p>Boba answers, plans, drafts and creates, right in the thread you&apos;re already in.</p></div><div className="feature-list"><FeatureCard image={pickleballImage} eyebrow="PLAN TOGETHER" title="Start a group chat with it" body="Start a new group with Boba and it finds the time, the place and the plan everyone can agree on." /><FeatureCard image={dinnerImage} eyebrow="DATE NIGHT" title="End ‘where should we eat?’" body="Ask in your couple&apos;s thread and Boba lands on a plan you&apos;ll both actually like, and suggests a time." /><FeatureCard eyebrow="CREATE & EDIT" title="Make or edit any image" body="Send a photo to tweak, or just describe one, and Boba creates it on the spot, fitting whatever you&apos;re talking about."><div className="mini-chat"><span>give this a wild sunset sky 🌅</span><span>done ✨ want it warmer or more dramatic?</span></div></FeatureCard><FeatureCard eyebrow="CREATE" title="Turn a moment into a song" body="Boba writes and produces a track in any genre, about the trip, the inside joke, or whoever&apos;s always late."><div className="music-note">🎶 one indie-folk anthem about Tahoe, coming up</div></FeatureCard><FeatureCard eyebrow="GET ANSWERS" title="A smart answer, instantly" body="Settle a debate, draft a tricky text, decode a menu, plan your week. Just say what you need." /><FeatureCard image={cabinImage} eyebrow="STAY ON TOP OF IT" title="Keep everyone&apos;s plans straight" body="Juggling a lot of people and calendars? Boba tracks who&apos;s free and finds the plan that works for all of them." /></div></section>
    <section className="faq-section section-pad"><div className="faq-heading"><span className="eyebrow">GOOD QUESTIONS</span><h2>Before you say hi</h2></div><div className="faq-list">{faqs.map(([q, a], i) => <div className={`faq-item ${activeFaq === i ? "open" : ""}`} key={q}><button className="faq-trigger" onClick={() => setActiveFaq(activeFaq === i ? null : i)}><span>{q}</span>{activeFaq === i ? <span className="minus">−</span> : <Plus />}</button>{activeFaq === i && <p>{a}</p>}</div>)}</div></section>
    <section className="final-cta section-pad"><span className="eyebrow">IT&apos;S ALREADY IN YOUR PHONE.</span><h2>Say hi to <span>boba</span></h2><button className="pill-button final-button" onClick={() => setModal(true)}>Text Boba <ArrowRight size={20} /></button></section>
  </main><footer><Logo /><span>© 2026 Boba</span><span>Terms · Privacy</span><a href="mailto:hello@getboba.ai">hello@getboba.ai</a></footer>
  {modal && <div className="modal-backdrop" onClick={() => setModal(false)}><div className="modal" onClick={(e) => e.stopPropagation()}><button className="modal-close" onClick={() => setModal(false)}><X /></button><span className="eyebrow">YOUR NEXT MESSAGE</span><h2>Open Messages<br />and say hello.</h2><p>This recreation keeps the action local to the page. Connect your SMS deep link when you have the live number.</p><button className="open-messages" onClick={() => setModal(false)}>Got it <ArrowRight size={20} /></button></div></div>}
  </div>;
}
