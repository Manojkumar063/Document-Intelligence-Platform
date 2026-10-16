import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getRAGEvaluation } from "../api/client";
import type { RAGEvaluationDashboard } from "../api/client";

function Metric({ title, value, suffix = "", note }: { title: string; value: number | string | null; suffix?: string; note?: string }) {
  const shown = value === null || value === undefined ? "Not measured" : typeof value === "number" ? `${value.toLocaleString()}${suffix}` : value;
  return <div className="rounded-xl border border-slate-700/60 bg-slate-800/60 p-4"><p className="text-xs text-slate-400">{title}</p><p className="mt-2 text-xl font-semibold text-white">{shown}</p>{note && <p className="mt-1 text-xs text-slate-500">{note}</p>}</div>;
}

export default function RAGEvaluationPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<RAGEvaluationDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function refresh(range = days) {
    setLoading(true);
    setError("");
    try {
      const response = await getRAGEvaluation(range);
      setData(response.data);
    } catch {
      setError("Could not load evaluation telemetry. Check that the backend is running and you have admin access.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(days); }, [days]);

  return <div className="min-h-screen bg-slate-950 p-6 text-white">
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><Link to="/admin" className="text-xs text-teal-400 hover:text-teal-300">← Admin dashboard</Link><h1 className="mt-2 text-2xl font-bold">RAG Evaluation</h1><p className="mt-1 text-sm text-slate-400">Observed query telemetry and measured evaluation runs.</p></div>
        <div className="flex items-center gap-3"><label className="text-sm text-slate-400">Time range <select value={days} onChange={e => setDays(Number(e.target.value))} className="ml-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"><option value={1}>24 hours</option><option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option></select></label><button onClick={() => void refresh()} disabled={loading} className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800 disabled:opacity-50">{loading ? "Refreshing…" : "Refresh"}</button></div>
      </div>
      {error && <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}
      {loading && !data ? <p className="py-12 text-center text-slate-400">Loading measured metrics…</p> : data && <>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric title="Successful queries" value={data.successful_queries} note={`Last ${data.days} days`} />
          <Metric title="Failed queries" value={data.failed_queries} note="Recorded generation failures" />
          <Metric title="Average response latency" value={data.average_latency_ms} suffix=" ms" />
          <Metric title="P95 response latency" value={data.p95_latency_ms} suffix=" ms" />
          <Metric title="Prompt tokens" value={data.prompt_tokens} note="Only where provider usage is recorded" />
          <Metric title="Completion tokens" value={data.completion_tokens} note="Only where provider usage is recorded" />
          <Metric title="Positive feedback" value={data.positive_feedback} />
          <Metric title="Negative feedback" value={data.negative_feedback} />
        </div>
        <section className="rounded-xl border border-slate-700/60 bg-slate-800/60 p-5">
          <h2 className="font-semibold">Retrieval and answer quality</h2>
          <p className="mt-1 text-sm text-slate-400">{data.quality_metrics_note}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric title="Precision@K" value={data.precision_at_k === null ? null : Number((data.precision_at_k * 100).toFixed(1))} suffix="%" />
            <Metric title="Recall@K" value={data.recall_at_k === null ? null : Number((data.recall_at_k * 100).toFixed(1))} suffix="%" />
            <Metric title="Answer relevance" value={data.answer_relevance === null ? null : Number((data.answer_relevance * 100).toFixed(1))} suffix="%" />
            <Metric title="Faithfulness" value={data.faithfulness === null ? null : Number((data.faithfulness * 100).toFixed(1))} suffix="%" />
          </div>
        </section>
        <section className="rounded-xl border border-slate-700/60 bg-slate-800/60 p-5">
          <h2 className="font-semibold">Evaluation history</h2>
          {data.history.length === 0 ? <p className="mt-3 text-sm text-slate-400">No evaluation runs have been recorded yet. Run a labelled evaluation dataset to populate this history.</p> : <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs text-slate-400"><tr><th className="py-2">Date</th><th>Cases</th><th>Precision@K</th><th>Recall@K</th><th>Relevance</th><th>Faithfulness</th></tr></thead><tbody>{data.history.map(item => <tr key={item.id} className="border-t border-slate-700"><td className="py-3">{item.created_at ? new Date(item.created_at).toLocaleString() : "—"}</td><td>{item.case_count}</td><td>{item.precision_at_k === null ? "—" : `${(item.precision_at_k * 100).toFixed(1)}%`}</td><td>{item.recall_at_k === null ? "—" : `${(item.recall_at_k * 100).toFixed(1)}%`}</td><td>{item.answer_relevance === null ? "Not measured" : item.answer_relevance}</td><td>{item.faithfulness === null ? "Not measured" : item.faithfulness}</td></tr>)}</tbody></table></div>}
        </section>
      </>}
    </div>
  </div>;
}
