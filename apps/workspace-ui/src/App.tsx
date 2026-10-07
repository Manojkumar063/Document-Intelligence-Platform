import { useEffect, useState } from "react";
import AuthScreen from "./components/AuthScreen";
import Workspace from "./components/Workspace";
import { getMe, getToken, clearToken, logoutSession } from "./api";
import type { User } from "./types";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    clearToken();
    const token = getToken();
    const refreshSession = () => getMe(token ?? undefined)
      .then((u) => { if (u.is_active) setUser(u); else { clearToken(); setUser(null); } })
      .catch(() => { clearToken(); setUser(null); })
      .finally(() => setChecking(false));
    void refreshSession();
    const refreshOnFocus = () => { void refreshSession(); };
    window.addEventListener("focus", refreshOnFocus);
    return () => window.removeEventListener("focus", refreshOnFocus);
  }, []);

  function authenticate(_token: string, u: User) {
    setUser(u);
  }

  function logout() {
    clearToken();
    setUser(null);
    void logoutSession().catch((error: unknown) => {
      console.error("Could not clear the shared sign-in session", error);
    });
  }

  if (checking) {
    return <main className="auth-screen"><p className="auth-loading">Checking your Teamspace session…</p></main>;
  }

  return user
    ? <Workspace key={user.id} user={user} onLogout={logout} />
    : <AuthScreen onAuthenticated={authenticate} />;
}
