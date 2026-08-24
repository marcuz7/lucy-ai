import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";

export default function AdminSettings() {
  const { user, loading } = useAuth();
  const status = trpc.twilio.status.useQuery(undefined, { enabled: user?.role === "admin" });
  const save = trpc.twilio.save.useMutation({ onSuccess: () => status.refetch() });
  const test = trpc.twilio.test.useMutation();
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  if (loading) return <main className="settings-shell"><p>Loading Lucy settings…</p></main>;
  if (!user) return <main className="settings-shell"><div className="settings-card"><span className="eyebrow">LUCY ADMIN</span><h1>Sign up to connect Lucy.</h1><p>Use your account to manage the messaging channel that powers Lucy.</p><button className="pill-button settings-button" onClick={() => startLogin()}>Sign up / Log in <ArrowLeft size={18} /></button><Link href="/" className="back-link">Back to Lucy</Link></div></main>;
  if (user.role !== "admin") return <main className="settings-shell"><div className="settings-card"><span className="eyebrow">ACCESS LIMITED</span><h1>This area is for admins.</h1><p>Your account is signed in, but it does not have permission to manage Lucy’s messaging credentials.</p><Link href="/" className="back-link">Back to Lucy</Link></div></main>;

  return <main className="settings-shell"><div className="settings-card wide"><Link href="/" className="back-link"><ArrowLeft size={16} /> Back to Lucy</Link><div className="settings-title"><div className="settings-icon"><LockKeyhole /></div><div><span className="eyebrow">ADMIN SETTINGS</span><h1>Connect Twilio</h1></div></div><p className="settings-intro">Lucy can receive texts and send replies through your Twilio number. Your Auth Token is encrypted before it is stored and is never returned to the browser.</p>{status.data?.configured && <div className="configured-note"><CheckCircle2 size={18} /><span>Connected to <strong>{status.data.phoneNumber}</strong> · {status.data.accountSid}</span></div>}<form onSubmit={event => { event.preventDefault(); save.mutate({ accountSid, authToken, phoneNumber }); }}><label>Account SID<input value={accountSid} onChange={event => setAccountSid(event.target.value)} placeholder="AC…" required /></label><label>Auth Token<input type="password" value={authToken} onChange={event => setAuthToken(event.target.value)} placeholder={status.data?.configured ? "Enter a new token to rotate it" : "Your Twilio Auth Token"} required /></label><label>Twilio phone number<input value={phoneNumber} onChange={event => setPhoneNumber(event.target.value)} placeholder="+15551234567" pattern="^\\+[1-9]\\d{7,14}$" required /></label><button className="pill-button settings-button" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save Twilio credentials"}</button>{save.isSuccess && <p className="form-success"><ShieldCheck size={17} /> Credentials saved securely.</p>}{save.error && <p className="form-error">Could not save credentials. Check the values and try again.</p>}</form><div className="test-row"><button className="secondary-button" disabled={test.isPending || !status.data?.configured} onClick={() => test.mutate()}>{test.isPending ? "Testing…" : "Test connection"}</button>{test.data && <span className={test.data.ok ? "test-ok" : "test-bad"}>{test.data.message}</span>}{test.error && <span className="test-bad">Connection test failed.</span>}</div><div className="setup-note"><strong>Webhook URL</strong><code>/api/webhooks/twilio/incoming</code><span>Paste the full Lucy site URL plus this path into Twilio’s incoming message webhook setting.</span></div></div></main>;
}
