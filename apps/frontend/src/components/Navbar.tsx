import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getNotifications, markNotificationRead } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { GlobalSearch } from "./GlobalSearch";
import type { AppNotification } from "../types";

const workspaceUrl = (import.meta.env.VITE_WORKSPACE_URL || "http://localhost:3001").replace(/\/$/, "");

export function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    let mounted = true;
    const refresh = () => {
      getNotifications().then((response) => {
        if (!mounted) return;
        setNotifications(response.data.items);
        setUnreadCount(response.data.unread_count);
      }).catch(() => undefined);
    };
    refresh();
    const interval = window.setInterval(refresh, 30000);
    return () => { mounted = false; window.clearInterval(interval); };
  }, [user?.id]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Keep the user on the page if the server could not revoke the session.
      return;
    }
    navigate("/login");
  };

  const navLink = (to: string, label: string) => (
    <Link
      to={to}
      className={`app-nav-link px-3 py-1.5 text-sm font-medium transition-colors ${
        pathname === to ? "is-active" : ""
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="app-navbar sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur sm:px-6">
      <Link to="/" className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-teal-200 bg-teal-50 text-teal-700">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 4.75A1.75 1.75 0 0 1 6.75 3H20v15H6.75A1.75 1.75 0 0 0 5 19.75v-15ZM5 19.75A1.75 1.75 0 0 1 6.75 18H20M8 7h8m-8 4h8m-8 4h5" />
          </svg>
        </div>
        <span className="app-brand-title text-sm font-semibold tracking-tight text-slate-900">Document Intelligence</span>
      </Link>

      {user && (
        <div className="flex items-center gap-2">
          <GlobalSearch />
          {user.role === "admin" && navLink("/admin", "Overview")}
          {navLink("/documents", "Documents")}
          {navLink("/collections", "Collections")}
          {user.role === "admin" && navLink("/admin/users", "Users")}
          {navLink("/chat", "Chat")}
          <a
            href={workspaceUrl}
            className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500/30 px-3 py-1.5 text-sm font-medium text-teal-300 transition-colors hover:border-teal-400/50 hover:bg-teal-500/10 hover:text-teal-200"
            aria-label="Back to Teamspace"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 19l-7-7 7-7M3 12h18" />
            </svg>
            <span className="hidden lg:inline">Back to Teamspace</span>
            <span className="lg:hidden">Teamspace</span>
          </a>

          <div className="relative">
            <button
              type="button"
              onClick={() => setNotificationsOpen((open) => !open)}
              aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
              aria-expanded={notificationsOpen}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 0 0-4-5.7V5a2 2 0 1 0-4 0v.3A6 6 0 0 0 6 11v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0v1a3 3 0 0 1-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-red-500 px-1 text-[9px] leading-4 text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>}
            </button>
            {notificationsOpen && (
              <div className="absolute right-0 top-10 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">Notifications</p>
                  <span className="text-xs text-slate-500">{unreadCount} unread</span>
                </div>
                {notifications.length === 0 ? (
                  <p className="px-4 py-8 text-center text-xs text-slate-500">You’re all caught up.</p>
                ) : (
                  <ul className="max-h-80 overflow-y-auto">
                    {notifications.map((notification) => (
                      <li key={notification.id} className="border-b border-slate-100 last:border-0">
                        <Link
                          to={notification.href}
                          onClick={() => {
                            setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, read: true } : item));
                            if (!notification.read) setUnreadCount((count) => Math.max(0, count - 1));
                            void markNotificationRead(notification.id);
                            setNotificationsOpen(false);
                          }}
                          className={`block px-4 py-3 hover:bg-slate-800 ${notification.read ? "opacity-70" : ""}`}
                        >
                          <p className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                            {!notification.read && <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />}
                            {notification.title}
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-slate-400">{notification.message}</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            {theme === "dark" ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="4" strokeWidth={1.8} /><path strokeLinecap="round" strokeWidth={1.8} d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5 8.5 8.5 0 1 0 20.5 15.5Z" /></svg>
            )}
          </button>

          <div className="w-px h-5 bg-slate-700 mx-1" />

          <div className="flex items-center gap-2">
            <Link to="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-700 text-xs font-bold text-white">
                {user.full_name?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}
              </div>
              <span className="hidden max-w-[120px] truncate text-xs text-slate-600 sm:block">
                {user.full_name || user.email}
              </span>
            </Link>
          </div>

          <button
            onClick={handleLogout}
            className="ml-1 rounded-lg p-2 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
            title="Sign out"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      )}
    </nav>
  );
}
