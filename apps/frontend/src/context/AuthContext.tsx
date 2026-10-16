import React, { createContext, useContext, useEffect, useState } from "react";
import { getMe, logout as logoutRequest } from "../api/client";
import type { User } from "../types";

interface AuthCtx {
  user: User | null;
  setUser: (u: User | null) => void;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = async () => {
    await logoutRequest();
    setUser(null);
  };

  useEffect(() => {
    // Remove tokens persisted by older frontend versions; the browser now uses HttpOnly cookies.
    window.localStorage.removeItem("token");
    let active = true;
    const refreshSession = async () => {
      try {
        const response = await getMe();
        if (active) setUser(response.data);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    void refreshSession();
    const refreshOnFocus = () => { void refreshSession(); };
    window.addEventListener("focus", refreshOnFocus);
    return () => {
      active = false;
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
