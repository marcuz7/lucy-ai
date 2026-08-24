import { useState } from "react";
import { ArrowLeft, CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";

export default function AdminTelnyx() {
  const { user, loading } = useAuth();
  const enabled = user?.role === "admin";
  const status = trpc.telnyx.status.useQuery(undefined, { enabled });
  const save = trpc.telnyx.save.useMutation({ onSuccess: () => status.refetch() });
  const test = trpc.telnyx.test.useMutation();
  const [apiKey, setApiKey] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [allowedSenders, setAllowedSenders] = useState("");
  const senderValues = allowedSenders.split(/[\s,]+/).map(value => value.trim()).filter(Boolean);

  if (loading) return <main className="settings-shell"><p>Loading Lucy settings…</p></main>;
  if (!user) return <main className="settings-shell"><div className="settings-card"><span className="eyebrow">LUCY ADMIN</span><h1>Sign up to connect Telnyx.</h1><p>Use your account to manage the messaging channel that powers Lucy.</p><button className="pill-button settings-button" onClick={() => startLogin()}>Sign up / Log in <ArrowLeft size={18} /></button><Link href="/" className="back-link">Back to Lucy</Link></div></main>;
  if (user.role !== "admin") return <main className="settings-shell"><div className="settings-card"><span className="eyebrow">ACCESS LIMITED</span><h1>This area is for admins.</h1><p>Your account is signed in, but it does not have permission to manage Lucy’s messaging credentials.</p><Link href="/" className="back-link">Back to Lucy</Link></div></main>;

  return <main className="settings-shell"><div className="settings-card wide"><Link href="/admin" className="back-link"><ArrowLeft size={16} /> Back to dashboard</Link><div className="settings-title"><div className="settings-icon"><LockKeyhole /></div><div><span className="eyebrow">P0 PROVIDER</span><h1>Connect Telnyx</h1></div></div><p className="settings-intro">Lucy can receive texts and send real agent answers through your Telnyx number. The API key is encrypted before storage and never returned to the browser.</p>{status.data?.configured && <div className="configured-note"><CheckCircle2 size={18} /><span>Connected to <strong>{status.data.phoneNumber}</strong> · {status.data.allowedSendersCount} approved sender{status.data.allowedSendersCount === 1 ? "" : "s"}</span></div>}<form onSubmit={event => { event.preventDefault(); save.mutate({ apiKey, publicKey, phoneNumber, allowedSenders: senderValues }); }}><label>Telnyx API key<input type="password" value={apiKey} onChange={event => setApiKey(event.target.value)} placeholder={status.data?.configured ? "Enter a new key to rotate it" : "Your Telnyx API key"} required /></label><label>Telnyx public key<textarea value={publicKey} onChange={event => setPublicKey(event.target.value)} placeholder="-----BEGIN PUBLIC KEY-----" rows={3} required /><small className="field-help">Used to verify Telnyx Ed25519 webhook signatures. This public key is not secret.</small></label><label>Telnyx phone number<input value={phoneNumber} onChange={event => setPhoneNumber(event.target.value)} placeholder="+15551234567" pattern="^\+[1-9]\d{7,14}$" required /></label><label>Approved sender numbers<textarea value={allowedSenders} onChange={event => setAllowedSenders(event.target.value)} placeholder="+15550000000\n+15550000001" rows={3} required /><small className="field-help">Only these senders can trigger Lucy. Use E.164 numbers separated by spaces, commas, or new lines.</small></label><button className="pill-button settings-button" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save Telnyx credentials"}</button>{save.isSuccess && <p className="form-success"><ShieldCheck size={17} /> Telnyx credentials and sender allowlist saved securely.</p>}{save.error && <p className="form-error">Could not save Telnyx credentials. Check the values and try again.</p>}</form><div className="test-row"><button className="secondary-button" disabled={test.isPending || !status.data?.configured} onClick={() => test.mutate()}>{test.isPending ? "Testing…" : "Test connection"}</button>{test.data && <span className={test.data.ok ? "test-ok" : "test-bad"}>{test.data.message}</span>}{test.error && <span className="test-bad">Connection test failed.</span>}</div><div className="setup-note"><strong>Webhook URL</strong><code>/api/webhooks/telnyx/incoming</code><span>Paste the full Lucy site URL plus this path into the Telnyx messaging profile webhook setting. Telnyx must be configured to send message.received events.</span></div></div></main>;
}
