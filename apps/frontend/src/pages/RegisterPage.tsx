import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getMe, login, register } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const { setUser } = useAuth();
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
      await login(email, password);
      const { data: userData } = await getMe();
      setUser(userData);
      navigate("/chat");
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <div className="auth-container">
        <div className="auth-brand">
          <div className="auth-brand-mark" aria-hidden="true">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 4.75A1.75 1.75 0 0 1 6.75 3H20v15H6.75A1.75 1.75 0 0 0 5 19.75v-15ZM5 19.75A1.75 1.75 0 0 1 6.75 18H20M8 7h8m-8 4h8m-8 4h5" />
            </svg>
          </div>
          <div>
            <p className="auth-brand-title">Document Intelligence</p>
            <p className="auth-brand-caption">Knowledge workspace</p>
          </div>
        </div>

        <section className="auth-card" aria-labelledby="register-title">
          <div className="mb-7">
            <p className="auth-eyebrow">Get started</p>
            <h1 id="register-title" className="auth-title">Create your account</h1>
            <p className="auth-description">Set up your account to start working with your organization's documents.</p>
          </div>

          {error && (
            <div role="alert" className="auth-error">
              <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="register-name" className="auth-label">Full name</label>
              <input id="register-name" type="text" autoComplete="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" className="auth-input" />
            </div>
            <div className="space-y-2">
              <label htmlFor="register-email" className="auth-label">Work email</label>
              <input id="register-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="auth-input" />
            </div>
            <div className="space-y-2">
              <label htmlFor="register-password" className="auth-label">Password</label>
              <input id="register-password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password" className="auth-input" />
            </div>
            <button type="submit" disabled={loading} className="auth-submit">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Creating account…
                </span>
              ) : "Create account"}
            </button>
          </form>

          <p className="auth-footer">
            Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
          </p>
        </section>

        <p className="auth-legal">Secure access to your organization's knowledge.</p>
      </div>
    </main>
  );
}
