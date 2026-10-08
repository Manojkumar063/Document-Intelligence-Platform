import { useRef, useState } from "react";
import Icon from "./Icon";
import { userInitials } from "../api";
import type { User, NavItem, Notification } from "../types";

interface Props {
  user: User;
  workspaceName: string;
  activeNav: NavItem;
  query: string;
  onQueryChange: (q: string) => void;
  notifications: Notification[];
  onMarkAllRead: () => void;
  dark: boolean;
  onToggleTheme: () => void;
}

export default function Topbar({ user, workspaceName, activeNav, query, onQueryChange, notifications, onMarkAllRead, dark, onToggleTheme }: Props) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <header className="topbar">
      <div className="breadcrumbs">
        <span>{workspaceName}</span>
        <span className="crumb-separator">/</span>
        <strong>{activeNav}</strong>
      </div>
      <div className="topbar-actions">
        <label className="search-field">
          <Icon name="search" size={17} />
          <input aria-label="Search tasks" placeholder="Search anything..." value={query} onChange={(e) => onQueryChange(e.target.value)} />
          <kbd>⌘ K</kbd>
        </label>
        <button type="button" className="icon-button theme-toggle" aria-label="Toggle theme" title={dark ? "Switch to light mode" : "Switch to dark mode"} onClick={onToggleTheme}>
          {dark ? "☀" : "☾"}
        </button>
        <div className="notif-wrap">
          <button
            ref={btnRef}
            type="button"
            className="icon-button notification-button"
            aria-label="Notifications"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <Icon name="bell" />
            {unread > 0 && <i className="notif-badge">{unread}</i>}
          </button>
          {open && (
            <div className="notif-dropdown" role="dialog" aria-label="Notifications">
              <div className="notif-header">
                <span>Notifications</span>
                {unread > 0 && (
                  <button type="button" className="notif-mark-read" onClick={onMarkAllRead}>Mark all read</button>
                )}
              </div>
              <ul className="notif-list">
                {notifications.length === 0 && (
                  <li className="notif-item notif-empty">You're all caught up.</li>
                )}
                {notifications.map((n) => (
                  <li key={n.id} className={`notif-item ${n.read ? "notif-read" : ""}`}>
                    <span className="notif-dot" />
                    <div className="notif-body">
                      <a href={n.href} className="notif-title" onClick={() => setOpen(false)}>{n.title}</a>
                      <p>{n.message}</p>
                      <span>{new Date(n.created_at).toLocaleString()}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="profile-avatar top-avatar">{userInitials(user)}</div>
      </div>
    </header>
  );
}
