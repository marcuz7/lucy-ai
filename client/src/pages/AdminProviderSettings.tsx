import { useState } from "react";
import { ArrowLeft, CheckCircle2, LockKeyhole, ShieldAlert, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";

const senderList = (value: string) => value.split(/[\s,]+/).map(item => item.trim()).filter(Boolean);

function ProtectedState({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <main className="settings-shell"><p>Loading Lucy settings…</p></main>;
  if (!user) return <main className="settings-shell"><div className="settings-card"><span className="eyebrow">LUCY ADMIN</span><h1>Sign in to manage channels.</h1><p>Provider credentials are available only to authenticated Lucy administrators.</p><button className="pill-button settings-button" onClick={() => startLogin()}>Sign up / Log in <ArrowLeft size={18} /></button><Link href="/" className="back-link">Back to Lucy</Link></div></main>;
  if (user.role !== "admin") return <main className="settings-shell"><div className="settings-card"><ShieldAlert className="access-icon" /><span className="eyebrow">ACCESS LIMITED</span><h1>Admin access required.</h1><p>Your account is signed in, but it does not have permission to manage messaging credentials.</p><Link href="/" className="back-link">Back to Lucy</Link></div></main>;
  return <>{children}</>;
}

function StatusNote({ configured, children }: { configured?: boolean; children: React.ReactNode }) {
  if (!configured) return null;
  return <div className="configured-note"><CheckCircle2 size={18} /><span>{children}</span></div>;
}

function TwilioSection() {
  const status = trpc.twilio.status.useQuery();
  const save = trpc.twilio.save.useMutation({ onSuccess: () => status.refetch() });
  const test = trpc.twilio.test.useMutation();
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [allowedSenders, setAllowedSenders] = useState("");
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    save.mutate({ accountSid, authToken, phoneNumber, allowedSenders: senderList(allowedSenders) });
  };

  return <section className="provider-section">
    <div className="provider-heading"><div><span className="eyebrow">CHANNEL 01</span><h2>Twilio SMS</h2><p>Use an existing Twilio number for inbound messages and Lucy replies.</p></div><span className="provider-badge">SMS</span></div>
    <StatusNote configured={status.data?.configured}>Connected to <strong>{status.data?.phoneNumber}</strong> · {status.data?.accountSid} · {status.data?.allowedSendersCount} approved sender{status.data?.allowedSendersCount === 1 ? "" : "s"}</StatusNote>
    <form onSubmit={submit} className="provider-form"><label>Account SID<input value={accountSid} onChange={event => setAccountSid(event.target.value)} placeholder="AC…" required /></label><label>Auth Token<input type="password" value={authToken} onChange={event => setAuthToken(event.target.value)} placeholder={status.data?.configured ? "Enter a new token to rotate it" : "Your Twilio Auth Token"} required /></label><label>Twilio phone number<input value={phoneNumber} onChange={event => setPhoneNumber(event.target.value)} placeholder="+15551234567" pattern="^\+[1-9]\d{7,14}$" required /></label><label>Approved sender numbers<textarea value={allowedSenders} onChange={event => setAllowedSenders(event.target.value)} placeholder="+15550000000\n+15550000001" rows={3} required /><small className="field-help">E.164 numbers separated by spaces, commas, or new lines. Only these senders can trigger Lucy.</small></label><button className="pill-button settings-button" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save Twilio settings"}</button>{save.isSuccess && <p className="form-success"><ShieldCheck size={17} /> Twilio credentials and sender allowlist saved securely.</p>}{save.error && <p className="form-error">Could not save Twilio settings. Check the values and try again.</p>}</form>
    <div className="test-row"><button className="secondary-button" disabled={test.isPending || !status.data?.configured} onClick={() => test.mutate()}>{test.isPending ? "Testing…" : "Test Twilio connection"}</button>{test.data && <span className={test.data.ok ? "test-ok" : "test-bad"}>{test.data.message}</span>}{test.error && <span className="test-bad">Connection test failed.</span>}</div>
    <div className="setup-note"><strong>Twilio webhook</strong><code>/api/webhooks/twilio/incoming</code><span>Use the full Lucy site URL plus this path in Twilio’s incoming message webhook setting.</span></div>
  </section>;
}

function TelnyxSection() {
  const status = trpc.telnyx.status.useQuery();
  const save = trpc.telnyx.save.useMutation({ onSuccess: () => status.refetch() });
  const test = trpc.telnyx.test.useMutation();
  const [apiKey, setApiKey] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [allowedSenders, setAllowedSenders] = useState("");
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    save.mutate({ apiKey, publicKey, phoneNumber, allowedSenders: senderList(allowedSenders) });
  };

  return <section className="provider-section">
    <div className="provider-heading"><div><span className="eyebrow">CHANNEL 02 · P0</span><h2>Telnyx SMS</h2><p>Use Telnyx for the first automated text-to-search-to-SMS path.</p></div><span className="provider-badge">P0</span></div>
    <StatusNote configured={status.data?.configured}>Connected to <strong>{status.data?.phoneNumber}</strong> · {status.data?.allowedSendersCount} approved sender{status.data?.allowedSendersCount === 1 ? "" : "s"}</StatusNote>
    <form onSubmit={submit} className="provider-form"><label>Telnyx API key<input type="password" value={apiKey} onChange={event => setApiKey(event.target.value)} placeholder={status.data?.configured ? "Enter a new key to rotate it" : "Your Telnyx API key"} required /></label><label>Telnyx public key<textarea value={publicKey} onChange={event => setPublicKey(event.target.value)} placeholder="-----BEGIN PUBLIC KEY-----" rows={3} required /><small className="field-help">Used to verify Telnyx Ed25519 webhook signatures. This public key is not secret.</small></label><label>Telnyx phone number<input value={phoneNumber} onChange={event => setPhoneNumber(event.target.value)} placeholder="+15551234567" pattern="^\+[1-9]\d{7,14}$" required /></label><label>Approved sender numbers<textarea value={allowedSenders} onChange={event => setAllowedSenders(event.target.value)} placeholder="+15550000000\n+15550000001" rows={3} required /><small className="field-help">E.164 numbers separated by spaces, commas, or new lines. Only these senders can trigger Lucy.</small></label><button className="pill-button settings-button" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save Telnyx settings"}</button>{save.isSuccess && <p className="form-success"><ShieldCheck size={17} /> Telnyx credentials and sender allowlist saved securely.</p>}{save.error && <p className="form-error">Could not save Telnyx settings. Check the values and try again.</p>}</form>
    <div className="test-row"><button className="secondary-button" disabled={test.isPending || !status.data?.configured} onClick={() => test.mutate()}>{test.isPending ? "Testing…" : "Test Telnyx connection"}</button>{test.data && <span className={test.data.ok ? "test-ok" : "test-bad"}>{test.data.message}</span>}{test.error && <span className="test-bad">Connection test failed.</span>}</div>
    <div className="setup-note"><strong>Telnyx webhook</strong><code>/api/webhooks/telnyx/incoming</code><span>Use the full Lucy site URL plus this path in the Telnyx messaging profile webhook setting. Send message.received events.</span></div>
  </section>;
}

export default function AdminProviderSettings() {
  return <ProtectedState><main className="settings-shell"><div className="settings-card wide provider-settings-card"><Link href="/admin" className="back-link"><ArrowLeft size={16} /> Back to dashboard</Link><div className="settings-title"><div className="settings-icon"><LockKeyhole /></div><div><span className="eyebrow">PROTECTED ADMIN SETTINGS</span><h1>Messaging channels</h1></div></div><p className="settings-intro">Set up every Lucy messaging secret from one page. Credentials are encrypted before storage, masked in status responses, and never returned to the browser. Only accounts with the admin role can view or change these settings.</p><div className="security-banner"><ShieldCheck size={18} /><div><strong>Admin-only and encrypted</strong><span>Use your Lucy administrator account. Never paste these credentials into chat or public code.</span></div></div><TwilioSection /><TelnyxSection /></div></main></ProtectedState>;
}
