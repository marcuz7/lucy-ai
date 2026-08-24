import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { ArrowRight, Check, CheckCheck, Copy, MessageCircle, Plus, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Link } from "wouter";
import { copyFeedbackLabel } from "./copyFeedback";

const pickleballImage = "/manus-storage/pickleball-blue-court_2e8ca9c0.jpg";
const dinnerImage = "/manus-storage/dinner-table_decb8fd1.jpg";
const cabinImage = "/manus-storage/cabin-sunset_54a8ba8b.jpg";
const launchNumber = "+84837841663";
const launchSmsHref = `sms:${launchNumber}?body=${encodeURIComponent("Hi Lucy")}`;

async function copyToClipboard(value: string) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
  const area = document.createElement("textarea");
  area.value = value;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  area.remove();
}

const faqs = [
  ["What is Lucy?", "Lucy is your first AI agent: a helpful teammate you can launch from a text. Ask for a plan, a draft, a decision, or a creative spark and Lucy gets to work in the conversation you already use."],
  ["Do I need to install anything?", "No installation, app download, or new dashboard. Lucy starts from a message and works inside the messaging app you already know."],
  ["How do I launch Lucy?", "Tap the launch button, send the prepared hello, and Lucy will guide you from there. Your first message is the beginning of the setup."],
  ["Can Lucy join a group chat?", "Yes. Start with Lucy one-on-one, then add Lucy to a group when you want an extra pair of hands for planning, research, writing, or decisions."],
  ["What can I ask Lucy to do?", "Start with anything that has a next step: organize a trip, compare options, draft a difficult note, summarize a thread, create an image, or turn a rough idea into a plan."],
  ["Does Lucy speak every time?", "No. Lucy is designed to notice context. If a conversation does not need help, Lucy can stay quiet. When a clear request arrives, Lucy steps in with a concise response."],
  ["How does Lucy handle my data?", "Lucy uses conversation context to make its help more useful. We do not sell your messages or use your phone number for marketing. Review the Privacy Notice for the complete policy."],
];

function Logo() {
  return <a href="#top" className="brand" aria-label="Lucy.ai home"><img className="brand-mark" src="/manus-storage/lucyai-head-lightbulb_ceeb63b0.png" alt="" /><span className="wordmark">Lucy<span aria-hidden="true">.</span>ai</span></a>;
}

function Header({ onText }: { onText: () => void }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isSuperAdmin = user?.isSuperAdmin === true;
  return <header className="site-header"><div className="header-inner"><Logo /><div className="header-right"><span className="header-kicker">YOUR FIRST AI AGENT</span>{isAdmin ? <><Link href="/admin" className="signup-link">Admin dashboard</Link>{isSuperAdmin && <Link href="/admin/settings" className="signup-link">Super-admin settings</Link>}</> : <button className="signup-link" onClick={() => startLogin()}>Log in / Sign up</button>}<button className="pill-button header-cta" onClick={onText}>Launch Lucy</button></div></div></header>;
}

function PhoneMockup() {
  const [copied, setCopied] = useState(false);
  const copyNumber = async () => { try { await copyToClipboard(launchNumber); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { setCopied(false); } };
  return <div className="phone-wrap" aria-label="Lucy in a group text message">
    <div className="phone">
      <div className="phone-notch" />
      <div className="phone-status"><span>9:41</span><span>▮▮▮ ◉ ▰</span></div>
      <div className="chat-head"><div className="avatar-row"><span className="avatar green">M</span><span className="avatar lilac">J</span><span className="avatar plum">L</span></div><strong>Weekend plan ✦</strong><small>You, Maya, Jon · Lucy joined</small></div>
      <div className="messages"><div className="bubble user">we need a plan for saturday</div><div className="bubble user">somewhere easy, not too expensive</div><div className="bubble question">can you find three options for all four of us?</div><div className="typing-bubble"><span /><span /><span /></div><div className="bubble boba"><strong>Lucy</strong><br />On it. I found three nearby options, sorted by price and travel time. Want the shortlist?</div></div>
      <div className="imessage">Message <span>↑</span></div>
    </div>
    <div className="launch-actions">
      <button className="launch-number" onClick={copyNumber} aria-label={`Copy Lucy launch number ${launchNumber}`}><span><small>LUCY LAUNCH NUMBER</small><strong>{launchNumber}</strong></span>{copied ? <><CheckCheck size={18} /><b aria-live="polite">{copyFeedbackLabel(true)}</b></> : <><Copy size={18} /><b aria-live="polite">{copyFeedbackLabel(false)}</b></>}</button>
      <a className="launch-sms" href={launchSmsHref}>Text Lucy <ArrowRight size={16} /></a>
      <div className="launch-qr"><QRCodeSVG value={launchSmsHref} size={72} bgColor="#ffffff" fgColor="#21122f" /><span><small>DESKTOP?</small><b>Scan to launch</b></span></div>
    </div>
  </div>;
}

function SignupCard({ onText }: { onText: () => void }) {
  return <div className="signup-card"><button className="open-messages" onClick={onText}><MessageCircle size={25} /> Message to launch</button><p className="legal">By selecting “Message to launch”, you agree to Lucy’s <u>Terms of Service</u> and <u>Privacy Notice</u>. Lucy is an AI assistant and may get things wrong. Reply STOP to opt out of messages at any time.</p><div className="steps"><span><b>1</b> Open messages</span><ArrowRight size={18} /><span><b>2</b> Send hello</span><ArrowRight size={18} /><span><b>3</b> Lucy gets to work</span></div></div>;
}

function ThreadSignal({ label }: { label: string }) {
  return <div className="feature-thread"><span className="thread-avatars" aria-hidden="true"><span>M</span><span>J</span><span>L</span></span><span>{label}</span><span className="thread-status"><i /> in thread</span></div>;
}

function FeatureCard({ image, eyebrow, title, body, children, signal }: { image?: string; eyebrow: string; title: string; body: string; children?: React.ReactNode; signal: string }) {
  return <article className="feature-card">{image && <img className="feature-image" src={image} alt="" />}<div className="feature-copy"><ThreadSignal label={signal} /><span className="eyebrow">{eyebrow}</span><h3>{title}</h3><p>{body}</p>{children}</div></article>;
}

export default function Home() {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [modal, setModal] = useState(false);
  return <div id="top" className="site-shell"><Header onText={() => setModal(true)} /><main>
    <section className="hero section-pad"><div className="hero-copy"><div className="eyebrow-tag"><span /> ZERO INSTALLATION · MESSAGE TO LAUNCH</div><h1>Your first AI agent.<br /><em>One message away.</em></h1><p className="hero-lede">Meet Lucy, the useful teammate that starts where you already are. No app to learn, no setup maze, no new tab to manage. Send a message and turn a loose thought into the next right move.</p><SignupCard onText={() => setModal(true)} /></div><PhoneMockup /></section>
    <section className="benefits"><div><Check /> <span>Start from a message</span></div><div><Check /> <span>No installation</span></div><div><Check /> <span>Help that fits the moment</span></div></section>
    <section className="intro section-pad"><span className="eyebrow">BUILT FOR THE WAY YOU ALREADY TALK</span><h2>Bring an agent<br className="mobile-only" /> into the thread.</h2><p>Lucy is not another place to keep open. It is an agent you can call into the conversation when a plan needs making, a question needs answering, or an idea needs momentum.</p><p className="small-copy">Start one-on-one, then invite Lucy wherever the work or the group chat is happening.</p><div className="assistant-card"><div className="assistant-topline"><span className="assistant-dot">✦</span><span className="assistant-live"><i /> available when needed</span></div><h3>Lucy</h3><span>YOUR AI AGENT</span><div className="assistant-thread"><span>can you help us decide?</span><span>Lucy is listening · no rush</span></div><div className="assistant-buttons"><button>message</button><button>add to<br />group</button></div></div></section>
    <section className="uses section-pad"><div className="uses-heading"><span className="eyebrow">ONE MESSAGE. MANY MODES.</span><h2>Think it. Text it.<br />Move it forward.</h2><p>Lucy turns everyday conversations into useful progress without asking you to change your workflow.</p></div><div className="feature-list"><FeatureCard image={pickleballImage} eyebrow="MAKE A PLAN" title="Turn “what should we do?” into a real plan" body="Lucy gathers the constraints, finds the options, and brings the group to a decision everyone can act on." signal="Weekend plans · 4 people" /><FeatureCard image={dinnerImage} eyebrow="MAKE A CALL" title="Get past the endless maybe" body="Give Lucy the preferences and the tradeoffs. It will narrow the choices and explain the recommendation clearly." signal="Dinner thread · two preferences" /><FeatureCard eyebrow="MAKE IT CLEAR" title="Shape the message before you send it" body="Drop in the rough version. Lucy can make it warmer, sharper, shorter, or easier to understand." signal="Drafting together"><div className="mini-chat"><span>make this sound confident, not cold</span><span>Try this: “I’m excited to move ahead. Here’s what I need next…”</span></div></FeatureCard><FeatureCard eyebrow="MAKE SOMETHING" title="Turn a spark into a creative draft" body="Describe the mood, image, song, or idea. Lucy gives the thought a first form you can build on." signal="Creative spark · first draft"><div className="music-note">✦ first draft ready · want it bolder or more surprising?</div></FeatureCard><FeatureCard eyebrow="GET UNSTUCK" title="Ask the question you keep circling" body="Compare, summarize, decode, research, or simply ask for the next step. Lucy helps you start." signal="A question worth asking" /><FeatureCard image={cabinImage} eyebrow="KEEP IT MOVING" title="Remember the details that matter" body="Lucy can keep track of the people, dates, preferences, and decisions that make a plan hold together." signal="Lucy is keeping the details" /></div></section>
    <section className="faq-section section-pad"><div className="faq-heading"><span className="eyebrow">GOOD TO KNOW</span><h2>Before you launch</h2></div><div className="faq-list">{faqs.map(([q, a], i) => <div className={`faq-item ${activeFaq === i ? "open" : ""}`} key={q}><button className="faq-trigger" onClick={() => setActiveFaq(activeFaq === i ? null : i)}><span>{q}</span>{activeFaq === i ? <span className="minus">−</span> : <Plus />}</button>{activeFaq === i && <p>{a}</p>}</div>)}</div></section>
    <section className="final-cta section-pad"><span className="eyebrow">NO INSTALL. NO WAITING.</span><h2>Send one message.<br /><span>Start with Lucy.</span></h2><button className="pill-button final-button" onClick={() => setModal(true)}>Launch Lucy <ArrowRight size={20} /></button></section>
  </main><footer><Logo /><span>© 2026 Lucy</span><span>Terms · Privacy</span><a href="mailto:hello@lucy.ai">hello@lucy.ai</a></footer>
  {modal && <div className="modal-backdrop" onClick={() => setModal(false)}><div className="modal" onClick={(e) => e.stopPropagation()}><button className="modal-close" onClick={() => setModal(false)} aria-label="Close launch dialog"><X /></button><span className="eyebrow">MESSAGE TO LAUNCH</span><h2>Your first agent<br />starts here.</h2><p>Send Lucy a message and begin with a real task. The product is designed to meet you in the tools you already use.</p><button className="open-messages" onClick={() => setModal(false)}>Start with Lucy <ArrowRight size={20} /></button></div></div>}
  </div>;
}
