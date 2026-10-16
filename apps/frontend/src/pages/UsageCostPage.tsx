import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyUsage, getUsageByUser, updateUserBudget } from "../api/client";
import type { MyUsage, UsageByUser } from "../api/client";

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="rounded-xl border border-slate-700/60 bg-slate-800/60 p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p>{detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}</div>;
}

export default function UsageCostPage() {
  const [usage, setUsage] = useState<MyUsage | null>(null);
  const [users, setUsers] = useState<UsageByUser[]>([]);
  const [days, setDays] = useState(30);
  const [budgetUser, setBudgetUser] = useState("");
  const [budget, setBudget] = useState("25");
  const [quota, setQuota] = useState("500000");
  const [rpm, setRpm] = useState("20");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    setError("");
    try {
      const mine = await getMyUsage();
      setUsage(mine.data);
      try {
        const admin = await getUsageByUser(days);
        setUsers(admin.data.users);
      } catch {
        setUsers([]);
      }
    } catch {
      setError("Unable to load usage. Check backend connectivity and permissions.");
    }
  }
  useEffect(() => { void refresh(); }, [days]);

  async function saveBudget() {
    setNotice("");
    setError("");
    if (!budgetUser.trim()) { setError("Enter the user ID before saving a budget."); return; }
    try {
      await updateUserBudget(budgetUser.trim(), Number(budget), Number(quota), Number(rpm));
      setNotice("Budget and quota settings saved.");
      await refresh();
    } catch {
      setError("Could not save budget. Verify the user ID and administrator permissions.");
    }
  }

  const money = (value: number) => `$${value.toFixed(4)}`;
  return <main className="min-h-screen bg-slate-950 p-6 text-white"><div className="mx-auto max-w-6xl space-y-6">
    <div><Link to="/admin" className="text-xs text-teal-400">← Admin dashboard</Link><h1 className="mt-2 text-2xl font-bold">Usage & Cost Management</h1><p className="mt-1 text-sm text-slate-400">Monitor recorded usage, configure per-user quotas, and review budget estimates.</p></div>
    {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
    {notice && <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{notice}</p>}
    {usage && <><section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Stat label="Requests this month" value={usage.requests.toLocaleString()} />
      <Stat label="Prompt tokens recorded" value={usage.prompt_tokens.toLocaleString()} />
      <Stat label="Completion tokens recorded" value={usage.completion_tokens.toLocaleString()} />
      <Stat label="Embedding tokens recorded" value={usage.embedding_tokens.toLocaleString()} />
      <Stat label="Estimated cost" value={money(usage.estimated_cost_usd)} detail="Based on captured provider usage only" />
      <Stat label="Monthly budget" value={money(usage.monthly_budget_usd)} detail={`${usage.budget_used_percent}% used`} />
      <Stat label="Monthly token quota" value={usage.monthly_token_quota.toLocaleString()} detail={`${usage.token_quota_used_percent}% used`} />
      <Stat label="Requests per minute" value={String(usage.requests_per_minute_limit)} detail="Configured limit; enforcement requires request middleware" />
    </section><p className="text-xs text-amber-300">{usage.pricing_note} Provider token usage and cost are not populated until the LLM and embedding calls record actual token counts.</p></>}
    <section className="rounded-xl border border-slate-700/60 bg-slate-800/60 p-5 space-y-4"><div><h2 className="font-semibold">Configure user budget and quotas</h2><p className="mt-1 text-sm text-slate-400">Settings are stored per user. This first version does not yet enforce hard stops or send email warnings.</p></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="text-xs text-slate-400">User ID<input value={budgetUser} onChange={e=>setBudgetUser(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm text-white" placeholder="User ID" /></label><label className="text-xs text-slate-400">Monthly budget (USD)<input type="number" min="0.01" step="0.01" value={budget} onChange={e=>setBudget(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm text-white" /></label><label className="text-xs text-slate-400">Monthly token quota<input type="number" min="1" value={quota} onChange={e=>setQuota(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm text-white" /></label><label className="text-xs text-slate-400">Requests per minute<input type="number" min="1" value={rpm} onChange={e=>setRpm(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm text-white" /></label></div>
      <button onClick={()=>void saveBudget()} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium hover:bg-teal-500">Save budget settings</button>
    </section>
    <section className="rounded-xl border border-slate-700/60 bg-slate-800/60 p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Usage by user</h2><p className="mt-1 text-xs text-slate-400">Highest recorded estimated cost first</p></div><select value={days} onChange={e=>setDays(Number(e.target.value))} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"><option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option></select></div>
      {users.length===0 ? <p className="text-sm text-slate-400">No admin usage rows are available yet, or this account does not have admin access.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs text-slate-400"><tr><th className="py-2">User ID</th><th>Requests</th><th>Total tokens</th><th>Estimated cost</th></tr></thead><tbody>{users.map(user=><tr key={user.user_id} className="border-t border-slate-700"><td className="py-3">{user.user_id}</td><td>{user.requests.toLocaleString()}</td><td>{user.total_tokens.toLocaleString()}</td><td>{money(user.estimated_cost_usd)}</td></tr>)}</tbody></table></div>}
    </section>
  </div></main>;
}
