import { useCallback, useState } from "react";
import Icon from "./Icon";
import { userInitials } from "../api";
import type { User, NavItem, Project, Task, WorkspaceInfo } from "../types";

const ragUrl = (import.meta.env.VITE_RAG_APP_URL || "http://localhost:3000").replace(/\/$/, "");

interface Props {
  user: User;
  projects: Project[];
  tasks: Task[];
  activeNav: NavItem;
  onNavChange: (nav: NavItem) => void;
  onAddProject: () => void;
  onLogout: () => void;
  workspace: WorkspaceInfo;
  onInvite: () => void;
  onSwitchWorkspace: (id: string) => void;
}

export default function Sidebar({ user, projects, tasks, activeNav, onNavChange, onAddProject, onLogout, workspace, onInvite, onSwitchWorkspace }: Props) {
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const pendingCount = tasks.filter((t) => !t.done).length;

  const handleNav = useCallback((item: NavItem) => () => onNavChange(item), [onNavChange]);

  return (
    <aside className="sidebar">
      <a className="brand" href="/" aria-label="Teamspace home">
        <span className="brand-mark">t</span>
        <span>teamspace<span className="brand-period">.</span></span>
      </a>

      <div className="workspace-switcher-wrap">
        <button className="workspace-switcher" type="button" aria-expanded={workspaceMenuOpen} onClick={() => setWorkspaceMenuOpen((open) => !open)}>
          <span className="workspace-avatar">{workspace.name.slice(0, 1).toUpperCase()}</span>
          <span className="workspace-name"><strong>{workspace.name}</strong><small>{workspace.role === "owner" ? "Owner" : "Member"} · {workspace.members.length} {workspace.members.length === 1 ? "member" : "members"}</small></span>
          <span className="switcher-chevron">⌄</span>
        </button>
        {workspaceMenuOpen && (
          <div className="workspace-menu">
            <p className="workspace-menu-label">YOUR WORKSPACES</p>
            {workspace.workspaces.map((option) => (
              <button type="button" key={option.id} className="workspace-menu-item" onClick={() => { setWorkspaceMenuOpen(false); if (option.id !== workspace.id) onSwitchWorkspace(option.id); }}>
                <span>{option.name}</span>
                {option.id === workspace.id && <span aria-label="Current workspace">✓</span>}
              </button>
            ))}
            {workspace.role === "owner" && <button type="button" className="workspace-menu-invite" onClick={() => { setWorkspaceMenuOpen(false); onInvite(); }}>Invite a teammate</button>}
          </div>
        )}
      </div>

      <p className="nav-label">WORKSPACE</p>
      <nav className="primary-nav" aria-label="Main navigation">
        {(["Overview", "My tasks", "Projects"] as NavItem[]).map((item) => (
          <button className={`nav-item ${activeNav === item ? "active" : ""}`} key={item} onClick={handleNav(item)} type="button">
            <Icon name={item === "Overview" ? "home" : item === "My tasks" ? "check" : "grid"} />
            <span>{item}</span>
            {item === "My tasks" && <span className="nav-count">{pendingCount}</span>}
          </button>
        ))}
      </nav>

      <div className="project-nav-heading">
        <p className="nav-label">YOUR PROJECTS</p>
        <button type="button" className="icon-button subtle" aria-label="Add project" onClick={onAddProject}>
          <Icon name="plus" size={16} />
        </button>
      </div>
      <nav className="project-nav" aria-label="Projects">
        {projects.map((p) => (
          <button className="project-nav-item" key={p.id} onClick={handleNav("Projects")} type="button">
            <span className={`project-dot ${p.color}`} />
            <span>{p.name}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-spacer" />
      <a className="knowledge-link" href={`${ragUrl}/chat`} target="_blank" rel="noreferrer">
        <span className="knowledge-icon"><Icon name="book" size={19} /></span>
        <span className="knowledge-copy"><strong>Knowledge AI</strong><small>Ask your team docs</small></span>
        <Icon name="arrow" size={15} />
      </a>
      <div className="sidebar-profile">
        <div className="profile-avatar">{userInitials(user)}</div>
        <div className="profile-copy">
          <strong>{user.full_name || user.email}</strong>
          <small>{workspace.role === "owner" ? "Workspace owner" : user.email}</small>
        </div>
        <button type="button" className="logout-button" onClick={onLogout}>Sign out</button>
      </div>
    </aside>
  );
}
