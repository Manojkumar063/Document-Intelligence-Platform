import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminStats } from "../api/client";
import type { AdminStats } from "../types";

function Metric({ label, value, detail, accent }: { label: string; value: number; detail: string; accent: string }) {
  return (
    <div className="border-y border-slate-700/70 py-4">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tabular-nums ${accent}`}>{value.toLocaleString()}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = async () => {
    setError("");
    try {
      const response = await getAdminStats();
      setStats(response.data);
    } catch {
      setError("Could not load system statistics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);

  return (
    <main className="min-h-[calc(100vh-53px)] bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-indigo-400">Administration</p>
            <h1 className="mt-1 text-2xl font-bold">System overview</h1>
            <p className="mt-1 text-sm text-slate-400">Users, document processing, and workspace activity</p>
          </div>
          <button
            type="button"
            onClick={() => { setLoading(true); void refresh(); }}
            disabled={loading}
            title="Refresh statistics"
            aria-label="Refresh statistics"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-700 text-slate-300 transition-colors hover:bg-slate-800 disabled:opacity-50"
          >
            <svg className={`h-4 w-4 ${loading && stats ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7v5h-5M4 17v-5h5m10-1a7 7 0 0 0-12.9-3M5 13a7 7 0 0 0 12.9 3" />
            </svg>
          </button>
        </header>

        {error && (
          <div role="alert" className="mb-6 flex items-center justify-between gap-4 border-y border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-300">
            <span>{error}</span>
            <button type="button" onClick={() => { setLoading(true); void refresh(); }} className="font-medium text-white underline underline-offset-4">Retry</button>
          </div>
        )}

        {loading && !stats ? (
          <p className="py-16 text-center text-sm text-slate-500">Loading system statistics…</p>
        ) : stats && (
          <>
            <section aria-label="System statistics" className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4">
              <Metric label="Active users" value={stats.active_users} detail={`${stats.total_users} registered`} accent="text-white" />
              <Metric label="Administrators" value={stats.admin_users} detail="Privileged accounts" accent="text-indigo-300" />
              <Metric label="Documents" value={stats.total_documents} detail={`${stats.completed_documents} completed`} accent="text-emerald-300" />
              <Metric label="Chat questions" value={stats.chat_queries_30d} detail="Last 30 days" accent="text-sky-300" />
            </section>

            <section className="mt-10 border-y border-slate-700/70 py-5" aria-labelledby="usage-heading">
              <div className="mb-5">
                <h2 id="usage-heading" className="text-base font-semibold">Usage analytics</h2>
                <p className="mt-1 text-xs text-slate-500">Aggregate activity from the last 30 days. Message content is not tracked.</p>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div><p className="text-2xl font-semibold tabular-nums text-slate-200">{stats.chat_queries_30d}</p><p className="mt-1 text-xs text-slate-500">Chat questions</p></div>
                <div><p className="text-2xl font-semibold tabular-nums text-slate-200">{stats.uploads_30d}</p><p className="mt-1 text-xs text-slate-500">Document uploads</p></div>
                <div><p className="text-2xl font-semibold tabular-nums text-slate-200">{stats.usage_events_30d}</p><p className="mt-1 text-xs text-slate-500">Tracked actions</p></div>
              </div>
            </section>

            <section className="mt-10 border-y border-slate-700/70 py-5" aria-labelledby="processing-heading">
              <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <h2 id="processing-heading" className="text-base font-semibold">Document processing</h2>
                  <p className="mt-1 text-xs text-slate-500">Current ingestion status across all documents</p>
                </div>
                <Link to="/documents" className="text-sm font-medium text-indigo-300 hover:text-indigo-200">Manage documents <span aria-hidden="true">→</span></Link>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div><p className="text-2xl font-semibold tabular-nums text-slate-200">{stats.uploaded_documents}</p><p className="mt-1 text-xs text-slate-500">Uploaded</p></div>
                <div><p className="text-2xl font-semibold tabular-nums text-sky-300">{stats.processing_documents}</p><p className="mt-1 text-xs text-slate-500">Processing</p></div>
                <div><p className="text-2xl font-semibold tabular-nums text-emerald-300">{stats.completed_documents}</p><p className="mt-1 text-xs text-slate-500">Completed</p></div>
                <div><p className="text-2xl font-semibold tabular-nums text-red-300">{stats.failed_documents}</p><p className="mt-1 text-xs text-slate-500">Failed</p></div>
              </div>
            </section>

            <section className="mt-10" aria-labelledby="manage-heading">
              <h2 id="manage-heading" className="mb-4 text-base font-semibold">Administration</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <Link to="/admin/users" className="group flex items-center justify-between border-y border-slate-700/70 py-4 hover:border-indigo-500/70">
                  <div>
                    <p className="font-medium text-slate-100">Manage users</p>
                    <p className="mt-1 text-sm text-slate-500">Review accounts and update access roles</p>
                  </div>
                  <span className="text-slate-500 transition-transform group-hover:translate-x-1 group-hover:text-indigo-300" aria-hidden="true">→</span>
                </Link>
                <Link to="/documents" className="group flex items-center justify-between border-y border-slate-700/70 py-4 hover:border-indigo-500/70">
                  <div>
                    <p className="font-medium text-slate-100">Manage documents</p>
                    <p className="mt-1 text-sm text-slate-500">Upload, manage sharing, track processing, and restore versions</p>
                  </div>
                  <span className="text-slate-500 transition-transform group-hover:translate-x-1 group-hover:text-indigo-300" aria-hidden="true">→</span>
                </Link>
                <Link to="/collections" className="group flex items-center justify-between border-y border-slate-700/70 py-4 hover:border-indigo-500/70">
                  <div>
                    <p className="font-medium text-slate-100">Manage collections</p>
                    <p className="mt-1 text-sm text-slate-500">Group documents and scope chat retrieval</p>
                  </div>
                  <span className="text-slate-500 transition-transform group-hover:translate-x-1 group-hover:text-indigo-300" aria-hidden="true">→</span>
                </Link>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}