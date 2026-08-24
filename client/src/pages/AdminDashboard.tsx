import { useMemo, useState } from "react";
import { Activity, Bot, CheckCircle2, Clock3, Inbox, RefreshCw, Search, ShieldAlert, XCircle } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";

const time = (value: Date | string | null) => value ? new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
const label = (value: string) => value.replaceAll("_", " ");

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const enabled = user?.role === "admin";
  const canManageSecrets = user?.isSuperAdmin === true;
  const summary = trpc.dashboard.summary.useQuery(undefined, { enabled, refetchInterval: 15_000 });
  const jobs = trpc.dashboard.jobs.useQuery(undefined, { enabled, refetchInterval: 15_000 });
  const agentRuns = trpc.dashboard.agentRuns.useQuery(undefined, { enabled, refetchInterval: 15_000 });
  const cancelRun = trpc.dashboard.cancelAgentRun.useMutation({ onSuccess: () => void agentRuns.refetch() });
  const [query, setQuery] = useState("");
  const [channel, setChannel] = useState("all");
  const [status, setStatus] = useState("all");
  const [runStatus, setRunStatus] = useState("all");

  const filteredMessages = useMemo(() => (summary.data?.messages ?? []).filter(message => {
    const haystack = `${message.text} ${message.senderId} ${message.chatId}`.toLowerCase();
    return (!query || haystack.includes(query.toLowerCase())) && (channel === "all" || message.channel === channel);
  }), [summary.data?.messages, query, channel]);
  const filteredJobs = useMemo(() => (jobs.data ?? []).filter(job => status === "all" || job.status === status), [jobs.data, status]);
  const filteredRuns = useMemo(() => (agentRuns.data ?? []).filter(run => runStatus === "all" || run.status === runStatus), [agentRuns.data, runStatus]);

  if (loading) return <main className="dashboard-shell"><p>Loading Lucy dashboard…</p></main>;
  if (!user) return <main className="settings-shell"><div className="settings-card"><span className="eyebrow">LUCY ADMIN</span><h1>Sign up to view the dashboard.</h1><p>Sign in to see Lucy’s incoming messages and queue health.</p><button className="pill-button settings-button" onClick={() => startLogin()}>Sign up / Log in</button><Link href="/" className="back-link">Back to Lucy</Link></div></main>;
  if (user.role !== "admin") return <main className="settings-shell"><div className="settings-card"><ShieldAlert className="access-icon" /><span className="eyebrow">ACCESS LIMITED</span><h1>Admin access required.</h1><p>Your account does not have permission to view Lucy’s operational data.</p><Link href="/" className="back-link">Back to Lucy</Link></div></main>;

  const queue = summary.data?.queue ?? { pending: 0, processing: 0, completed: 0, deadLetter: 0 };
  const retry = () => { void summary.refetch(); void jobs.refetch(); void agentRuns.refetch(); };
  return <main className="dashboard-shell"><div className="dashboard-wrap">
    <div className="dashboard-top"><div><Link href="/" className="back-link">← Back to Lucy</Link><span className="eyebrow">LUCY CONTROL PLANE</span><h1>Message dashboard</h1><p>Monitor conversations, agent execution, and the worker queue.</p></div><div className="dashboard-actions">{canManageSecrets && <Link href="/admin/settings" className="secondary-button">Super-admin secrets</Link>}<button className="secondary-button" onClick={retry}><RefreshCw size={16} /> Refresh</button></div></div>
    {summary.isError ? <div className="dashboard-error"><ShieldAlert size={18} /><div><strong>Couldn’t load dashboard data.</strong><span>Check your connection and try again.</span></div><button className="secondary-button" onClick={retry}>Retry</button></div> : <>
      <div className="metric-grid"><div className="metric-card"><Inbox /><strong>{queue.pending}</strong><span>Pending</span></div><div className="metric-card"><Activity /><strong>{queue.processing}</strong><span>Processing</span></div><div className="metric-card"><CheckCircle2 /><strong>{queue.completed}</strong><span>Completed</span></div><div className="metric-card danger"><XCircle /><strong>{queue.deadLetter}</strong><span>Dead letter</span></div></div>
      <section className="dashboard-panel"><div className="panel-heading"><div><span className="eyebrow">INBOX</span><h2>Recent incoming messages</h2></div><span className="live-pill"><span /> Live · refreshes every 15s</span></div><div className="filter-bar"><label><Search size={15} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search text, sender, or chat" /></label><select value={channel} onChange={event => setChannel(event.target.value)}><option value="all">All channels</option><option value="twilio-sms">Twilio SMS</option><option value="telnyx-sms">Telnyx SMS</option><option value="rcs">RCS</option><option value="imessage-relay">iMessage relay</option></select></div>{summary.isLoading ? <p className="empty-state">Loading messages…</p> : filteredMessages.length ? <div className="message-table"><div className="table-head"><span>Message</span><span>Channel</span><span>Received</span></div>{filteredMessages.map(message => <div className="table-row" key={message.id}><div><Link href={`/admin/messages/${encodeURIComponent(message.id)}`} className="message-link"><strong>{message.text}</strong></Link><small>{message.senderId} · {message.chatId}{message.mediaCount ? ` · ${message.mediaCount} attachment${message.mediaCount > 1 ? "s" : ""}` : ""}</small></div><span className="channel-badge">{message.channel}</span><span className="timestamp">{time(message.receivedAt)}</span></div>)}</div> : <p className="empty-state">No messages match these filters.</p>}</section>
      <section className="dashboard-panel"><div className="panel-heading"><div><span className="eyebrow">MANAGED AGENT</span><h2>Execution runs</h2></div><Bot /></div><div className="filter-bar compact"><select value={runStatus} onChange={event => setRunStatus(event.target.value)}><option value="all">All run statuses</option><option value="queued">Queued</option><option value="planning">Planning</option><option value="running">Running</option><option value="awaiting_approval">Awaiting approval</option><option value="completed">Completed</option><option value="failed">Failed</option><option value="cancelled">Cancelled</option><option value="limit_reached">Limit reached</option></select></div>{agentRuns.isError ? <p className="empty-state error-copy">Agent runs could not be loaded.</p> : agentRuns.isLoading ? <p className="empty-state">Loading agent runs…</p> : filteredRuns.length ? <div className="job-list">{filteredRuns.slice(0, 12).map(run => <div className="job-row agent-row" key={run.id}><span className={`status-dot ${run.status}`} /><div><strong>{label(run.status)}</strong><small>{run.senderId} · step {run.currentStep}/{run.maxSteps} · tools {run.toolCallsUsed}/{run.maxToolCalls} · cost {run.costUnitsUsed}/{run.maxCostUnits} · {run.requestText}</small></div><span className="timestamp">{time(run.completedAt ?? run.createdAt)}</span>{["queued", "planning", "running"].includes(run.status) && <button className="run-cancel-button" onClick={() => cancelRun.mutate({ runId: run.id })} disabled={cancelRun.isPending}>Cancel</button>}</div>)}</div> : <p className="empty-state">No managed agent runs match this filter.</p>}</section>
      <section className="dashboard-panel"><div className="panel-heading"><div><span className="eyebrow">WORKER QUEUE</span><h2>Recent jobs</h2></div><Clock3 /></div><div className="filter-bar compact"><select value={status} onChange={event => setStatus(event.target.value)}><option value="all">All job statuses</option><option value="pending">Pending</option><option value="processing">Processing</option><option value="completed">Completed</option><option value="dead_letter">Dead letter</option></select></div>{jobs.isError ? <p className="empty-state error-copy">Queue jobs could not be loaded.</p> : filteredJobs.length ? <div className="job-list">{filteredJobs.slice(0, 12).map(job => <div className="job-row" key={job.id}><span className={`status-dot ${job.status}`} /><div><strong>{label(job.status)}</strong><small>{job.chatId} · attempt {job.attempts}{job.lastError ? ` · ${job.lastError}` : ""}</small></div><span className="timestamp">{time(job.completedAt ?? job.createdAt)}</span></div>)}</div> : <p className="empty-state">No queue jobs match this filter.</p>}</section>
    </>}
  </div></main>;
}
