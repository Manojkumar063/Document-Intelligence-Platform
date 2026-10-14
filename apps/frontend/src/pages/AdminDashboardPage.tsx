import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminStats } from "../api/client";
import type { AdminStats, PipelineStage } from "../types";

// ── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80, h = 28;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color, spark }: {
  icon: string; label: string; value: string | number; sub: string; color: string; spark?: number[];
}) {
  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-800/60 p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className={`text-lg ${color}`}>{icon}</span>
        <span className="text-xs text-slate-500">{sub}</span>
      </div>
      <p className="text-2xl font-bold text-white tabular-nums">{typeof value === "number" ? value.toLocaleString() : value}</p>
      <div className="flex items-end justify-between">
        <p className="text-xs text-slate-400">{label}</p>
        {spark && <Sparkline data={spark} color={color.replace("text-", "").includes("indigo") ? "#6366f1" : color.includes("emerald") ? "#34d399" : color.includes("sky") ? "#38bdf8" : color.includes("violet") ? "#a78bfa" : color.includes("amber") ? "#fbbf24" : color.includes("pink") ? "#f472b6" : "#6366f1"} />}
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function ProgressBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
      <span className="text-xs text-slate-300 w-14 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-slate-700">
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-xs text-slate-400 w-10 text-right">{value}%</span>
    </div>
  );
}

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-800/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-200">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function ViewAllLink({ to }: { to: string }) {
  return <Link to={to} className="text-xs text-indigo-400 hover:text-indigo-300">View all →</Link>;
}

// ── Query Volume Chart ────────────────────────────────────────────────────────
function QueryVolumeChart({ total }: { total: number }) {
  const points = Array.from({ length: 24 }, (_, i) => {
    const base = total / 24;
    return Math.max(10, base * (0.5 + Math.sin(i * 0.7 + 1) * 0.3 + Math.cos(i * 0.4) * 0.2));
  });
  const max = Math.max(...points);
  const w = 500, h = 80;
  const pts = points.map((v, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - (v / max) * h;
    return `${x},${y}`;
  }).join(" ");
  const area = `0,${h} ` + pts + ` ${w},${h}`;
  const hours = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"];
  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${w} ${h + 4}`} preserveAspectRatio="none" className="h-20">
        <defs>
          <linearGradient id="qvGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#qvGrad)" />
        <polyline points={pts} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="flex justify-between mt-1">
        {hours.map(h => <span key={h} className="text-[10px] text-slate-500">{h}</span>)}
      </div>
    </div>
  );
}

// ── Top Query Categories ──────────────────────────────────────────────────────
const QUERY_CATEGORIES = [
  { label: "Technical Support", pct: 28.4, color: "#6366f1" },
  { label: "Product Information", pct: 23.7, color: "#8b5cf6" },
  { label: "How-to Guides", pct: 19.6, color: "#a78bfa" },
  { label: "Troubleshooting", pct: 14.9, color: "#c4b5fd" },
  { label: "Other", pct: 13.6, color: "#ddd6fe" },
];

function TopQueryCategories() {
  return (
    <div className="space-y-3">
      {QUERY_CATEGORIES.map(cat => (
        <div key={cat.label} className="flex items-center gap-3">
          <span className="text-xs text-slate-300 w-36 flex-shrink-0 truncate">{cat.label}</span>
          <div className="flex-1 h-2 rounded-full bg-slate-700">
            <div className="h-full rounded-full" style={{ width: `${cat.pct}%`, background: cat.color }} />
          </div>
          <span className="text-xs text-slate-400 w-10 text-right">{cat.pct}%</span>
        </div>
      ))}
    </div>
  );
}

// ── Recent Alerts ─────────────────────────────────────────────────────────────
const MOCK_ALERTS = [
  { id: 1, level: "warn", title: "High response time detected", detail: "P95 response time is above 2s", ago: "7m ago" },
  { id: 2, level: "error", title: "Embedding service error rate", detail: "Error rate is above 2%", ago: "1h ago" },
  { id: 3, level: "info", title: "Indexing completed", detail: "Successfully indexed 5,245 documents", ago: "3h ago" },
];

function RecentAlerts() {
  const icon = (level: string) => {
    if (level === "error") return <span className="text-red-400 text-base">⚠</span>;
    if (level === "warn") return <span className="text-amber-400 text-base">⚠</span>;
    return <span className="text-emerald-400 text-base">✓</span>;
  };
  return (
    <div className="space-y-3">
      {MOCK_ALERTS.map(a => (
        <div key={a.id} className="flex items-start gap-3">
          <div className="mt-0.5 flex-shrink-0">{icon(a.level)}</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-200 truncate">{a.title}</p>
            <p className="text-xs text-slate-500 truncate">{a.detail}</p>
          </div>
          <span className="text-[10px] text-slate-500 flex-shrink-0">{a.ago}</span>
        </div>
      ))}
    </div>
  );
}

// ── User Feedback Donut ───────────────────────────────────────────────────────
function UserFeedbackDonut({ total, positive, neutral, negative }: {
  total: number; positive: number; neutral: number; negative: number;
}) {
  const r = 40, cx = 50, cy = 50, circ = 2 * Math.PI * r;
  const posD = (positive / total) * circ;
  const neuD = (neutral / total) * circ;
  const negD = (negative / total) * circ;
  let offset = 0;
  const segments = [
    { dash: posD, color: "#34d399", label: "Positive", count: positive, pct: Math.round(positive / total * 100) },
    { dash: neuD, color: "#fbbf24", label: "Neutral", count: neutral, pct: Math.round(neutral / total * 100) },
    { dash: negD, color: "#f87171", label: "Negative", count: negative, pct: Math.round(negative / total * 100) },
  ];
  return (
    <div className="flex items-center gap-4">
      <div className="relative flex-shrink-0 w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {segments.map((seg, i) => {
            const el = (
              <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth="12"
                strokeDasharray={`${seg.dash} ${circ - seg.dash}`}
                strokeDashoffset={-offset}
              />
            );
            offset += seg.dash;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-white">{total}</span>
          <span className="text-[10px] text-slate-400">Total</span>
        </div>
      </div>
      <div className="space-y-2">
        {segments.map(seg => (
          <div key={seg.label} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: seg.color }} />
            <span className="text-xs text-slate-300">{seg.label}</span>
            <span className="text-xs text-slate-400 ml-1">{seg.pct}%</span>
            <span className="text-xs text-slate-500">({seg.count})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { icon: "⊞", label: "Overview", to: "/admin", active: true },
  { icon: "📊", label: "Query Analytics", to: "/admin", active: false },
  { icon: "🔍", label: "Retrieval Performance", to: "/admin", active: false },
  { icon: "⚡", label: "Generation Quality", to: "/admin", active: false },
  { icon: "🗄️", label: "Data & Indexing", to: "/documents", active: false },
  { icon: "⭐", label: "Feedback & Evaluation", to: "/admin", active: false },
  { icon: "🔔", label: "Alerts", to: "/admin", active: false },
  { icon: "🔗", label: "Integrations", to: "/admin", active: false },
  { icon: "⚙️", label: "Settings", to: "/admin", active: false },
];

function Sidebar({ user }: { user: { full_name: string; email: string } | null }) {
  return (
    <aside className="w-52 flex-shrink-0 flex flex-col bg-slate-900 border-r border-slate-700/60 min-h-screen">
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-slate-700/60">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-sm font-bold">R</div>
        <span className="text-sm font-semibold text-white">RAG System</span>
      </div>
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map(item => (
          <Link key={item.label} to={item.to}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors ${item.active ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}>
            <span className="text-sm">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="px-3 py-3 border-t border-slate-700/60 space-y-3">
        <div className="text-[10px] text-slate-500 uppercase tracking-wider px-1">System Info</div>
        <div className="space-y-1 px-1">
          <div className="flex justify-between text-xs"><span className="text-slate-500">Version</span><span className="text-slate-300">1.4.2</span></div>
          <div className="flex justify-between text-xs"><span className="text-slate-500">Environment</span><span className="bg-violet-500/20 text-violet-300 px-1.5 rounded text-[10px]">Production</span></div>
          <div className="flex justify-between text-xs"><span className="text-slate-500">Region</span><span className="text-slate-300">us-east-1</span></div>
        </div>
        <div className="text-[10px] text-slate-500 uppercase tracking-wider px-1 pt-1">Quick Links</div>
        <div className="space-y-1 px-1">
          {["Documentation", "API Reference", "Support"].map(l => (
            <a key={l} href="#" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white">
              <span>↗</span>{l}
            </a>
          ))}
        </div>
        {user && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-700/60">
            <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user.full_name?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-white truncate">{user.full_name || "Admin User"}</p>
              <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = async () => {
    setError("");
    try {
      const res = await getAdminStats();
      setStats(res.data);
    } catch {
      setError("Could not load system statistics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);

  const successRate = stats
    ? Math.round((stats.successful_responses_30d / Math.max(stats.chat_queries_30d, 1)) * 100)
    : 0;

  const mockUser = stats ? { full_name: "Admin User", email: "admin@company.com" } : null;

  // Deterministic sparkline seeds
  const spark1 = [60, 72, 65, 80, 75, 90, 85, 95, 88, 100];
  const spark2 = [55, 68, 72, 78, 82, 88, 85, 91, 94, 96];
  const spark3 = [1.8, 1.6, 1.9, 1.5, 1.4, 1.7, 1.3, 1.5, 1.4, 1.45];
  const spark4 = [1.2, 1.5, 1.8, 2.0, 2.1, 2.2, 2.25, 2.3, 2.32, 2.34];
  const spark5 = [4.1, 4.2, 4.3, 4.2, 4.4, 4.5, 4.4, 4.6, 4.5, 4.6];
  const spark6 = [30, 35, 38, 40, 42, 44, 45, 47, 48, 48.72];

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar user={mockUser} />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-slate-700/60">
          <div>
            <h1 className="text-lg font-bold text-white">RAG System Dashboard</h1>
            <p className="text-xs text-slate-400 mt-0.5">Monitor and optimize your Retrieval-Augmented Generation system</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300">
              <span>📅</span> Last 24 hours <span className="ml-1 text-slate-500">▾</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              System Status: Healthy
            </div>
            <button type="button" onClick={() => { setLoading(true); void refresh(); }} disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-50">
              <svg className={`h-3.5 w-3.5 ${loading && stats ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7v5h-5M4 17v-5h5m10-1a7 7 0 0 0-12.9-3M5 13a7 7 0 0 0 12.9 3" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        <main className="flex-1 px-6 py-5 space-y-5 overflow-auto">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 flex justify-between">
              <span>{error}</span>
              <button type="button" onClick={() => { setLoading(true); void refresh(); }} className="underline">Retry</button>
            </div>
          )}

          {loading && !stats ? (
            <div className="flex items-center justify-center py-32">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-400">Loading dashboard…</p>
              </div>
            </div>
          ) : stats && (
            <>
              {/* Top stat cards - 6 cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                <StatCard icon="💬" label="Total Queries" value={stats.chat_queries_30d} sub="↑ 18.2% vs yesterday" color="text-indigo-400" spark={spark1} />
                <StatCard icon="✅" label="Successful Responses" value={stats.successful_responses_30d} sub={`${successRate}% success rate`} color="text-emerald-400" spark={spark2} />
                <StatCard icon="⏱" label="Avg. Response Time" value="1.45s" sub="↓ 12.3% vs yesterday" color="text-sky-400" spark={spark3} />
                <StatCard icon="🔤" label="Tokens Generated" value="2.34M" sub="↑ 24.7% vs yesterday" color="text-violet-400" spark={spark4} />
                <StatCard icon="⭐" label="User Satisfaction" value="4.6 / 5" sub="↑ 5.2% vs yesterday" color="text-amber-400" spark={spark5} />
                <StatCard icon="💲" label="Cost (USD)" value="$48.72" sub="↓ 8.4% vs yesterday" color="text-pink-400" spark={spark6} />
              </div>

              {/* Pipeline + Retrieval Performance */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <SectionCard title="RAG Pipeline Overview">
                  <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
                    {["Query", "Retrieval", "Reranking", "Generation", "Response"].map((step, i) => (
                      <div key={step} className="flex items-center gap-1 flex-shrink-0">
                        <div className="rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-3 py-2 text-center min-w-[68px]">
                          <p className="text-xs font-semibold text-indigo-300">{step}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{stats.chat_queries_30d.toLocaleString()}</p>
                          <p className="text-xs text-emerald-400">100%</p>
                        </div>
                        {i < 4 && <span className="text-slate-600 text-sm">→</span>}
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <div className="grid grid-cols-4 text-xs text-slate-500 pb-1 border-b border-slate-700">
                      <span>Stage</span><span className="text-right">Success Rate</span><span className="text-right">Avg Time</span><span className="text-right">P95 Time</span>
                    </div>
                    {stats.pipeline_stages.map((s: PipelineStage) => (
                      <div key={s.stage} className="grid grid-cols-4 text-xs">
                        <span className="text-slate-300">{s.stage}</span>
                        <span className="text-right text-emerald-400">{s.success_rate}%</span>
                        <span className="text-right text-slate-300">{s.avg_time_ms}ms</span>
                        <span className="text-right text-slate-400">{s.p95_time_ms > 999 ? `${(s.p95_time_ms / 1000).toFixed(1)}s` : `${s.p95_time_ms}ms`}</span>
                      </div>
                    ))}
                  </div>
                  <Link to="/admin" className="mt-3 inline-block text-xs text-indigo-400 hover:text-indigo-300">View detailed pipeline analytics →</Link>
                </SectionCard>

                <SectionCard title="Retrieval Performance" action={<ViewAllLink to="/admin" />}>
                  <div className="flex items-center gap-6 mb-4">
                    <div className="relative w-28 h-28 flex-shrink-0">
                      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e293b" strokeWidth="3" />
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f59e0b" strokeWidth="3"
                          strokeDasharray={`${78.6} ${100 - 78.6}`} strokeLinecap="round" />
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#6366f1" strokeWidth="3"
                          strokeDasharray={`${successRate * 0.4} ${100 - successRate * 0.4}`}
                          strokeDashoffset={-(78.6)} strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-bold text-white">78.6%</span>
                        <span className="text-[10px] text-slate-400">Top-4 Hit Rate</span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-2.5">
                      <ProgressBar label="Top-1" value={45} color="#6366f1" />
                      <ProgressBar label="Top-3" value={78} color="#22d3ee" />
                      <ProgressBar label="Top-5" value={89} color="#a78bfa" />
                      <ProgressBar label="Top-10" value={95} color="#34d399" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-700">
                    <div className="text-center">
                      <p className="text-lg font-bold text-white">0.72 <span className="text-xs text-slate-500">/ 1.00</span></p>
                      <p className="text-xs text-slate-400">Context Relevance (Avg.)</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-white">0.68</p>
                      <p className="text-xs text-slate-400">Recall@5</p>
                    </div>
                  </div>
                  <Link to="/admin" className="mt-3 inline-block text-xs text-indigo-400 hover:text-indigo-300">View retrieval analytics →</Link>
                </SectionCard>
              </div>

              {/* Query Volume + Top Query Categories + Generation Quality */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <SectionCard title="Query Volume Over Time">
                  <QueryVolumeChart total={stats.chat_queries_30d} />
                </SectionCard>

                <SectionCard title="Top Query Categories" action={<ViewAllLink to="/admin" />}>
                  <TopQueryCategories />
                </SectionCard>

                <SectionCard title="Generation Quality" action={<ViewAllLink to="/admin" />}>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-slate-400">Answer Relevance (Avg.)</p>
                        <p className="text-lg font-bold text-white">0.83 <span className="text-xs text-slate-500">/ 1.00</span></p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Faithfulness (Avg.)</p>
                        <p className="text-lg font-bold text-white">0.87 <span className="text-xs text-slate-500">/ 1.00</span></p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-slate-700">
                      <div>
                        <p className="text-xs text-slate-400">Hallucination Rate</p>
                        <p className="text-lg font-bold text-red-400">2.3%</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Completeness (Avg.)</p>
                        <p className="text-lg font-bold text-white">0.76 <span className="text-xs text-slate-500">/ 1.00</span></p>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-slate-700">
                      <p className="text-xs text-slate-400 mb-2">Trend</p>
                      <div className="flex items-end gap-1 h-10">
                        {[82, 88, 85, 91, 89, 93, 95, 92, 96, 95].map((v, i) => (
                          <div key={i} className="flex-1 rounded-sm bg-indigo-500/60" style={{ height: `${v}%` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </SectionCard>
              </div>

              {/* Knowledge Base + Recent Alerts + User Feedback */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <SectionCard title="Knowledge Base & Indexing">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="rounded-lg border border-slate-700 bg-slate-700/30 p-3 text-center">
                      <span className="text-2xl">🗄️</span>
                      <p className="text-xs text-slate-400 mt-1">Data Sources</p>
                      <p className="text-lg font-bold text-white">24</p>
                    </div>
                    <div className="rounded-lg border border-slate-700 bg-slate-700/30 p-3 text-center">
                      <span className="text-2xl">📄</span>
                      <p className="text-xs text-slate-400 mt-1">Documents</p>
                      <p className="text-lg font-bold text-white">{stats.total_documents.toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg border border-slate-700 bg-slate-700/30 p-3 text-center">
                      <span className="text-2xl">🔷</span>
                      <p className="text-xs text-slate-400 mt-1">Indexed Chunks</p>
                      <p className="text-lg font-bold text-white">{(stats.total_chunks / 1000).toFixed(0)}K</p>
                    </div>
                    <div className="rounded-lg border border-slate-700 bg-slate-700/30 p-3 text-center">
                      <span className="text-2xl">🔄</span>
                      <p className="text-xs text-slate-400 mt-1">Last Updated</p>
                      <p className="text-lg font-bold text-white">2h ago</p>
                    </div>
                  </div>
                  <Link to="/documents" className="text-xs text-indigo-400 hover:text-indigo-300">View data & indexing details →</Link>
                </SectionCard>

                <SectionCard title="Recent Alerts" action={<ViewAllLink to="/admin" />}>
                  <RecentAlerts />
                </SectionCard>

                <SectionCard title="User Feedback (Last 24h)">
                  <UserFeedbackDonut
                    total={356}
                    positive={Math.round(356 * 0.719)}
                    neutral={Math.round(356 * 0.180)}
                    negative={Math.round(356 * 0.096)}
                  />
                  <Link to="/admin" className="mt-4 inline-block text-xs text-indigo-400 hover:text-indigo-300">View feedback & evaluations →</Link>
                </SectionCard>
              </div>

              {/* Quick links */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: "Manage Users", desc: "Roles & access", to: "/admin/users", icon: "👤", color: "border-violet-500/40 hover:border-violet-400" },
                  { label: "Documents", desc: "Upload & process", to: "/documents", icon: "📄", color: "border-sky-500/40 hover:border-sky-400" },
                  { label: "Collections", desc: "Group & scope", to: "/collections", icon: "🗂️", color: "border-amber-500/40 hover:border-amber-400" },
                  { label: "Chat", desc: "Test the RAG", to: "/chat", icon: "💬", color: "border-emerald-500/40 hover:border-emerald-400" },
                ].map(item => (
                  <Link key={item.to} to={item.to}
                    className={`rounded-xl border bg-slate-800/60 p-4 flex items-center gap-3 transition-colors ${item.color}`}>
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-white">{item.label}</p>
                      <p className="text-xs text-slate-400">{item.desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
