import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login, register } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { AuthArtwork } from "../components/AuthArtwork";

export default function RegisterPage() {
  const { setToken } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(email, password, fullName);
      const res = await login(email, password);
      setToken(res.data.access_token);
      navigate("/chat");
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page min-h-screen">
      <div className="mx-auto grid min-h-screen w-full max-w-[1320px] items-center gap-5 px-4 py-5 sm:px-8 lg:grid-cols-[minmax(0,1fr)_430px] lg:gap-14 lg:px-10">
        <AuthArtwork />
        <div className="w-full">
        <div className="mb-5 flex items-center gap-3 px-1">
          <div className="auth-mark flex h-11 w-11 items-center justify-center rounded-xl border border-teal-400/20 text-teal-300">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 4.75A1.75 1.75 0 0 1 6.75 3H20v15H6.75A1.75 1.75 0 0 0 5 19.75v-15ZM5 19.75A1.75 1.75 0 0 1 6.75 18H20M8 7h8m-8 4h8m-8 4h5" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">RAG Workspace</p>
            <p className="mt-0.5 text-[10px] font-medium uppercase text-slate-500">DOCUMENT INTELLIGENCE</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="auth-frame space-y-5 rounded-2xl border border-slate-700/70 p-6 shadow-2xl sm:p-8">
          <div className="mb-1">
            <p className="mb-2 text-[10px] font-semibold uppercase text-teal-300">Create workspace access</p>
            <h1 className="text-2xl font-semibold text-white">Create your account</h1>
            <p className="mt-1 text-sm text-slate-400">Set up your sign-in details</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Full Name</label>
            <input
              type="text" required value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-3 text-sm text-white placeholder-slate-500 transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Email</label>
            <input
              type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-3 text-sm text-white placeholder-slate-500 transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Password</label>
            <input
              type="password" required value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-3 text-sm text-white placeholder-slate-500 transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-950/20 transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Creating account…
              </span>
            ) : "Create Account"}
          </button>

          <p className="text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors">
              Sign in
            </Link>
          </p>
        </form>
        </div>
      </div>
    </div>
  );
}
