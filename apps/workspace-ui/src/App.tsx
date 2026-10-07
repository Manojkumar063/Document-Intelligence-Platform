import { useEffect, useState } from "react";
import AuthScreen from "./components/AuthScreen";
import Workspace from "./components/Workspace";
import { getMe, getToken, saveToken, clearToken } from "./api";
import type { User } from "./types";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) { setChecking(false); return; }
    getMe(token)
      .then((u) => { if (u.is_active) setUser(u); else clearToken(); })
      .catch(() => clearToken())
      .finally(() => setChecking(false));
  }, []);

  function authenticate(token: string, u: User) {
    saveToken(token);
    setUser(u);
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  if (checking) {
    return <main className="auth-screen"><p className="auth-loading">Checking your Teamspace session…</p></main>;
  }

  return user
    ? <Workspace key={user.id} user={user} onLogout={logout} />
    : <AuthScreen onAuthenticated={authenticate} />;
}
