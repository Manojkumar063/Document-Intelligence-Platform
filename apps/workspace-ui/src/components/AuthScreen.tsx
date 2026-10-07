import { useState } from "react";
import { login, register } from "../api";
import type { User } from "../types";

export default function AuthScreen({ onAuthenticated }: { onAuthenticated: (token: string, user: User) => void }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isRegistering) await register(email, password, fullName);
      const { token, user } = await login(email, password);
      onAuthenticated(token, user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect to the authentication service");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <a className="brand auth-brand" href="/" aria-label="Teamspace home">
          <span className="brand-mark">t</span>
          <span>teamspace<span className="brand-period">.</span></span>
        </a>
        <p className="eyebrow auth-eyebrow">YOUR TEAM'S HOME BASE</p>
        <h1>{isRegistering ? "Create your account" : "Welcome back"}</h1>
        <p className="auth-intro">
          {isRegistering ? "Create an account to get started with your workspace." : "Sign in with the account you use for RAG Workspace."}
        </p>
        {error && <div className="auth-error" role="alert">{error}</div>}
        <form onSubmit={submit}>
          {isRegistering && (
            <>
              <label className="form-label" htmlFor="auth-name">Full name</label>
              <input id="auth-name" className="form-input" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </>
          )}
          <label className="form-label" htmlFor="auth-email">Email</label>
          <input id="auth-email" className="form-input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label className="form-label" htmlFor="auth-password">Password</label>
          <input id="auth-password" className="form-input" type="password" autoComplete={isRegistering ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" className="button button-primary auth-submit" disabled={loading}>
            {loading ? "Please wait…" : isRegistering ? "Create account" : "Sign in"}
          </button>
        </form>
        <p className="auth-switch">
          {isRegistering ? "Already have an account?" : "New to RAG Workspace?"}{" "}
          <button type="button" onClick={() => { setIsRegistering((v) => !v); setError(""); }}>
            {isRegistering ? "Sign in" : "Create an account"}
          </button>
        </p>
        <p className="auth-note">Your account is managed by the existing RAG Workspace service.</p>
      </section>
    </main>
  );
}
