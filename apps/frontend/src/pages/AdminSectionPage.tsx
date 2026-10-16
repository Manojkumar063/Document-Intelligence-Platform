import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getAdminStats, listDocuments } from "../api/client";
import type { AdminStats, Document } from "../types";

const SECTIONS = [
  { path: "/admin/analytics", icon: "📊", label: "Query Analytics", description: "Query volume and usage trends." },
  { path: "/admin/retrieval", icon: "🔍", label: "Retrieval Performance", description: "Review indexed content and retrieval pipeline timings." },
  { path: "/admin/generation", icon: "⚡", label: "Generation Quality", description: "Inspect pipeline reliability and response quality indicators." },
  { path: "/admin/data", icon: "🗄️", label: "Data & Indexing", description: "Monitor document processing and open the document manager." },
  { path: "/admin/feedback", icon: "⭐", label: "Feedback & Evaluation", description: "Review feedback availability and test responses in Chat." },
  { path: "/admin/alerts", icon: "🔔", label: "Alerts", description: "Check document processing failures and system connectivity." },
  { path: "/admin/integrations", icon: "🔗", label: "Integrations", description: "Check the configured backend and available application integrations." },
  { path: "/admin/settings", icon: "⚙️", label: "Settings", description: "Adjust dashboard display preferences." },
];

function Metric({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return <div className="rounded-xl border border-slate-700/60 bg-slate-800/60 p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-2 text-2xl font-bold text-white">{typeof value === "number" ? value.toLocaleString() : value}</p>{detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}</div>;
}

export default function AdminSectionPage() {
  const { pathname } = useLocation();
  const section = SECTIONS.find(item => item.path === pathname) ?? SECTIONS[0];
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [compact, setCompact] = useState(() => localStorage.getItem("rag-admin-compact") === "true");
  const [autoRefresh, setAutoRefresh] = useState(() => localStorage.getItem("rag-admin-auto-refresh") === "true");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const results = await Promise.allSettled([getAdminStats(), listDocuments()]);
      if (results[0].status === "fulfilled") setStats(results[0].value.data);
      else throw new Error("Could not load admin statistics. Check that the backend is running and you are signed in as an admin.");
      if (results[1].status === "fulfilled") setDocuments(results[1].value.data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = window.setInterval(() => { void refresh(); }, 60000);
    return () => window.clearInterval(timer);
  }, [autoRefresh]);

  const failedDocs = useMemo(() => documents.filter(doc => doc.status === "failed"), [documents]);
  const processingDocs = useMemo(() => documents.filter(doc => doc.status === "processing" || doc.status === "uploaded"), [documents]);
  const stageRows = stats?.pipeline_stages ?? [];
  const saveCompact = (value: boolean) => { setCompact(value); localStorage.setItem("rag-admin-compact", String(value)); };
  const saveAutoRefresh = (value: boolean) => { setAutoRefresh(value); localStorage.setItem("rag-admin-auto-refresh", String(value)); };

  return <div className="min-h-screen bg-slate-950 text-white">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-700/60 px-6 py-5">
      <div><Link to="/admin" className="text-xs text-teal-400 hover:text-teal-300">← Dashboard overview</Link><h1 className="mt-2 text-xl font-bold">{section.icon} {section.label}</h1><p className="mt-1 text-sm text-slate-400">{section.description}</p></div>
      <div className="flex items-center gap-3"><span className="text-xs text-slate-500">{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : "Not updated yet"}</span><button onClick={() => void refresh()} disabled={loading} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700 disabled:opacity-50">{loading ? "Refreshing…" : "Refresh data"}</button></div>
    </header>
    <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-[210px_minmax(0,1fr)]">
      <nav className="space-y-1 rounded-xl border border-slate-800 bg-slate-900 p-2">{[{path:"/admin",label:"Overview",icon:"⊞"}, ...SECTIONS].map(item => <Link key={item.path} to={item.path} className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm ${pathname === item.path ? "bg-teal-700 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}><span>{item.icon}</span>{item.label}</Link>)}</nav>
      <main className={compact ? "space-y-3" : "space-y-5"}>
        {error && <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error} <button onClick={() => void refresh()} className="ml-2 underline">Try again</button></div>}
        {loading && !stats ? <p className="p-8 text-center text-slate-400">Loading live data…</p> : stats && <>
          {pathname === "/admin/analytics" && <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Queries (30 days)" value={stats.chat_queries_30d} /><Metric label="Usage events (30 days)" value={stats.usage_events_30d} /><Metric label="All-time usage events" value={stats.total_usage_events} /><Metric label="Conversations" value={stats.total_conversations} /></div><Panel title="Query analytics"><p className="text-sm text-slate-300">Query counts come from recorded chat-query usage events over the last 30 days. This backend currently provides totals rather than a per-hour history or category breakdown.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><Metric label="Document uploads (30 days)" value={stats.uploads_30d} /><Metric label="Success estimate" value={stats.chat_queries_30d ? `${Math.round(stats.successful_responses_30d / stats.chat_queries_30d * 100)}%` : "—"} detail="Calculated from the API's reported successful response count" /></div><Link className="mt-4 inline-block text-sm text-teal-400" to="/chat">Open Chat to run a query →</Link></Panel></>}
          {pathname === "/admin/retrieval" && <><div className="grid gap-3 sm:grid-cols-3"><Metric label="Indexed chunks" value={stats.total_chunks} /><Metric label="Documents" value={stats.total_documents} /><Metric label="Completed documents" value={stats.completed_documents} /></div><Panel title="Pipeline timings">{stageRows.map(stage => <div key={stage.stage} className="mb-4 rounded-lg border border-slate-700 p-3"><div className="flex justify-between gap-3"><strong className="text-sm">{stage.stage}</strong><span className="text-sm text-emerald-400">{stage.success_rate}% success</span></div><div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-400"><span>Average: {stage.avg_time_ms} ms</span><span>P95: {stage.p95_time_ms} ms</span></div></div>)}<p className="text-xs text-amber-300">Retrieval quality scores such as Recall@K are not exposed by the current API, so they are not fabricated here.</p></Panel></>}
          {pathname === "/admin/generation" && <><div className="grid gap-3 sm:grid-cols-3"><Metric label="Queries (30 days)" value={stats.chat_queries_30d} /><Metric label="Reported successful responses" value={stats.successful_responses_30d} /><Metric label="Pipeline stages" value={stageRows.length} /></div><Panel title="Generation pipeline">{stageRows.map(stage => <div key={stage.stage} className="mb-3 flex items-center justify-between gap-4 border-b border-slate-800 pb-3"><span className="text-sm text-slate-300">{stage.stage}</span><span className="text-sm text-emerald-400">{stage.success_rate}% success</span><span className="text-xs text-slate-400">avg {stage.avg_time_ms} ms</span></div>)}<p className="mt-3 text-xs text-slate-400">Faithfulness, answer relevance and hallucination metrics require an evaluation dataset and are not currently returned by the backend.</p><Link className="mt-4 inline-block text-sm text-teal-400" to="/chat">Test a response in Chat →</Link></Panel></>}
          {pathname === "/admin/data" && <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Total documents" value={stats.total_documents} /><Metric label="Completed" value={stats.completed_documents} /><Metric label="Processing / uploaded" value={processingDocs.length} /><Metric label="Failed" value={failedDocs.length} /><Metric label="Indexed chunks" value={stats.total_chunks} /><Metric label="Collections" value={stats.collections_count} /></div><Panel title="Document processing status"><div className="space-y-2">{(["completed","processing","uploaded","failed"] as const).map(status => <div key={status} className="flex justify-between rounded-lg bg-slate-900 px-3 py-2 text-sm"><span className="capitalize text-slate-300">{status}</span><span>{documents.filter(doc => doc.status === status).length}</span></div>)}</div><Link to="/documents" className="mt-4 inline-block text-sm text-teal-400">Manage documents and retry failed indexing →</Link></Panel></>}
          {pathname === "/admin/feedback" && <><div className="grid gap-3 sm:grid-cols-3"><Metric label="Recorded queries" value={stats.chat_queries_30d} /><Metric label="Conversations" value={stats.total_conversations} /><Metric label="Usage events" value={stats.total_usage_events} /></div><Panel title="Feedback & evaluation"><p className="text-sm text-slate-300">The current backend does not provide an aggregate feedback/evaluation endpoint. You can test answers in Chat and use the response feedback controls; these summary metrics are not a substitute for an evaluation score.</p><Link to="/chat" className="mt-4 inline-block text-sm text-teal-400">Open Chat and evaluate an answer →</Link></Panel></>}
          {pathname === "/admin/alerts" && <><div className="grid gap-3 sm:grid-cols-3"><Metric label="Failed documents" value={failedDocs.length} detail="Based on the live document list" /><Metric label="Pending / processing" value={processingDocs.length} /><Metric label="API stats" value="Connected" detail="Admin stats endpoint responded" /></div><Panel title="Actionable alerts">{failedDocs.length === 0 && processingDocs.length === 0 && <p className="text-sm text-emerald-400">No document-processing issues found in the loaded document list.</p>}{failedDocs.map(doc => <div key={doc.id} className="mb-3 rounded-lg border border-red-500/30 bg-red-500/5 p-3"><p className="text-sm font-medium text-red-300">{doc.original_name}</p><p className="mt-1 text-xs text-slate-400">{doc.error_message || "Processing failed. Open documents to retry indexing."}</p></div>)}{processingDocs.map(doc => <div key={doc.id} className="mb-2 rounded-lg border border-amber-500/30 p-3 text-sm text-amber-200">{doc.original_name}: {doc.status}</div>)}<Link to="/documents" className="mt-3 inline-block text-sm text-teal-400">Open document manager →</Link></Panel></>}
          {pathname === "/admin/integrations" && <><div className="grid gap-3 sm:grid-cols-2"><Metric label="Backend API" value="Connected" detail="Admin stats request succeeded" /><Metric label="Document API" value={documents.length >= 0 ? "Responding" : "Unknown"} detail="Document list request" /><Metric label="Vector retrieval" value="Not independently checked" detail="No diagnostic endpoint exposed" /><Metric label="External integrations" value="Not configured here" detail="No integration management API exposed" /></div><Panel title="Integration status"><p className="text-sm text-slate-300">This view checks the backend endpoints available to the dashboard. It does not claim to verify MongoDB, Redis, Qdrant or an LLM provider individually because the current health/admin API does not expose those dependency checks.</p><a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm text-teal-400">Open backend API documentation ↗</a></Panel></>}
          {pathname === "/admin/settings" && <Panel title="Dashboard preferences"><p className="mb-5 text-sm text-slate-400">These display preferences are saved in this browser only; they do not change backend or security configuration.</p><label className="flex items-center justify-between gap-4 border-b border-slate-800 py-4"><span><span className="block text-sm text-white">Compact layout</span><span className="text-xs text-slate-500">Reduce spacing between dashboard panels.</span></span><input type="checkbox" checked={compact} onChange={event => saveCompact(event.target.checked)} className="h-4 w-4 accent-teal-500" /></label><label className="flex items-center justify-between gap-4 py-4"><span><span className="block text-sm text-white">Auto-refresh</span><span className="text-xs text-slate-500">Refresh this page's data every 60 seconds.</span></span><input type="checkbox" checked={autoRefresh} onChange={event => saveAutoRefresh(event.target.checked)} className="h-4 w-4 accent-teal-500" /></label><button onClick={() => { saveCompact(false); saveAutoRefresh(false); }} className="mt-3 rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800">Reset preferences</button></Panel>}
        </>}
      </main>
    </div>
  </div>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-slate-700/60 bg-slate-800/60 p-5"><h2 className="mb-4 text-sm font-semibold text-slate-100">{title}</h2>{children}</section>;
}
