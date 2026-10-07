import { useEffect, useState } from "react";
import AuthScreen from "./components/AuthScreen";
import Workspace from "./components/Workspace";
import { getMe, logoutSession } from "./api";
import type { User } from "./types";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const refreshSession = () => getMe()
      .then((u) => { if (u.is_active) setUser(u); else setUser(null); })
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
    void refreshSession();
    const refreshOnFocus = () => { void refreshSession(); };
    window.addEventListener("focus", refreshOnFocus);
    return () => window.removeEventListener("focus", refreshOnFocus);
  }, []);

  function authenticate(u: User) {
    setUser(u);
  }

  function logout() {
    setUser(null);
    void logoutSession().catch((error: unknown) => {
      console.error("Could not clear the shared sign-in session", String(error));
    });
  }

  if (checking) {
    return <main className="auth-screen"><p className="auth-loading">Checking your Teamspace session…</p></main>;
  }

  return user
    ? <Workspace key={user.id} user={user} onLogout={logout} />
    : <AuthScreen onAuthenticated={authenticate} />;
}
