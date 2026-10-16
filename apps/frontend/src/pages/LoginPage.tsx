import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login, getMe } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { AuthArtwork } from "../components/AuthArtwork";

export default function LoginPage() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // The browser sends the HttpOnly session cookie automatically.
      await login(email, password);
      const { data: userData } = await getMe();
      setUser(userData);
      navigate("/chat");
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f6f8f7] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8">
        <header className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 text-white shadow-sm">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 4.75A1.75 1.75 0 0 1 6.75 3H20v15H6.75A1.75 1.75 0 0 0 5 19.75v-15ZM5 19.75A1.75 1.75 0 0 1 6.75 18H20M8 7h8m-8 4h8m-8 4h5" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight text-slate-900">RAG Workspace</p>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">Document intelligence</p>
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_80px_-36px_rgba(15,23,42,0.24)] md:grid-cols-[0.9fr_1.1fr]">
            <section className="relative hidden flex-col justify-between overflow-hidden bg-[#103d3a] p-9 text-white md:flex lg:p-11">
              <div className="absolute -right-20 -top-16 h-64 w-64 rounded-full border border-white/10" />
              <div className="absolute -right-8 -top-4 h-40 w-40 rounded-full border border-white/10" />
              <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
                <svg className="h-6 w-6 text-teal-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M5 4.75A1.75 1.75 0 0 1 6.75 3H20v15H6.75A1.75 1.75 0 0 0 5 19.75v-15ZM5 19.75A1.75 1.75 0 0 1 6.75 18H20M8 7h8m-8 4h8m-8 4h5" />
                </svg>
              </div>
              <div className="relative my-12">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-teal-200">Your knowledge, connected</p>
                <h2 className="max-w-xs text-3xl font-semibold leading-tight tracking-tight lg:text-4xl">Find answers in your documents.</h2>
                <p className="mt-4 max-w-sm text-sm leading-6 text-teal-50/75">Bring your files together, ask better questions, and explore the information that matters.</p>
              </div>
              <div className="relative flex items-center gap-2 text-xs text-teal-100/70">
                <span className="h-2 w-2 rounded-full bg-teal-300" />
                Private workspace · Source-aware answers
              </div>
            </section>

            <section className="p-6 sm:p-9 lg:p-11">
              <div className="mb-8 md:mb-9">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Welcome back</p>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Sign in to continue</h1>
                <p className="mt-2 text-sm leading-6 text-slate-500">Access your documents and pick up where you left off.</p>
              </div>

              {error && (
                <div role="alert" className="mb-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-teal-700">
                  <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="login-email" className="block text-sm font-medium text-slate-700">Email address</label>
                  <input
                    id="login-email" type="email" autoComplete="email" required value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="login-password" className="block text-sm font-medium text-slate-700">Password</label>
                  <input
                    id="login-password" type="password" autoComplete="current-password" required value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"
                  />
                </div>

                <button
                  type="submit" disabled={loading}
                  className="mt-2 flex w-full items-center justify-center rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-700/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Signing in…
                    </span>
                  ) : "Sign in"}
                </button>
              </form>

              <p className="mt-7 text-center text-sm text-slate-500">
                New to RAG Workspace?{" "}
                <Link to="/register" className="font-semibold text-teal-700 transition hover:text-teal-900">Create an account</Link>
              </p>
              <p className="mt-8 border-t border-slate-100 pt-5 text-center text-xs text-slate-400">Your workspace, ready when you are.</p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
