import Icon from "./Icon";
import { userInitials } from "../api";
import type { User, NavItem } from "../types";

interface Props {
  user: User;
  activeNav: NavItem;
  query: string;
  onQueryChange: (q: string) => void;
}

export default function Topbar({ user, activeNav, query, onQueryChange }: Props) {
  return (
    <header className="topbar">
      <div className="breadcrumbs">
        <span>Studio North</span>
        <span className="crumb-separator">/</span>
        <strong>{activeNav}</strong>
      </div>
      <div className="topbar-actions">
        <label className="search-field">
          <Icon name="search" size={17} />
          <input aria-label="Search tasks" placeholder="Search anything..." value={query} onChange={(e) => onQueryChange(e.target.value)} />
          <kbd>⌘ K</kbd>
        </label>
        <button type="button" className="icon-button notification-button" aria-label="Notifications">
          <Icon name="bell" /><i />
        </button>
        <div className="profile-avatar top-avatar">{userInitials(user)}</div>
      </div>
    </header>
  );
}
