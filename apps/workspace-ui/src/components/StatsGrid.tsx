import Icon from "./Icon";
import type { Project, Task, Member, NavItem } from "../types";

interface Props {
  projects: Project[];
  tasks: Task[];
  members: Member[];
  onNavigate: (nav: NavItem) => void;
}

export default function StatsGrid({ projects, tasks, members, onNavigate }: Props) {
  const pending = tasks.filter((task) => !task.done).length;
  const completed = tasks.filter((task) => task.done).length;
  const formatCount = (value: number) => value.toLocaleString();

  return (
    <section className="stats-grid" aria-label="Workspace overview">
      <button type="button" className="stat-card stat-card-interactive" onClick={() => onNavigate("Projects")} aria-label={`View ${projects.length} projects`}>
        <div className="stat-top">
          <span className="stat-icon green"><Icon name="grid" /></span>
          <span className="stat-trend">Current workspace</span>
        </div>
        <strong className="stat-number">{formatCount(projects.length)}</strong>
        <span className="stat-label">Active projects</span>
        <span className="stat-description">Projects in this workspace</span>
        <span className="stat-open-hint">View projects →</span>
      </button>
      <button type="button" className="stat-card stat-card-interactive" onClick={() => onNavigate("My tasks")} aria-label={`View ${pending} tasks in progress`}>
        <div className="stat-top">
          <span className="stat-icon purple"><Icon name="check" /></span>
          <span className="stat-trend">{formatCount(completed)} completed</span>
        </div>
        <strong className="stat-number">{formatCount(pending)}</strong>
        <span className="stat-label">Tasks in progress</span>
        <span className="stat-description">{formatCount(completed)} completed · {formatCount(pending)} remaining</span>
        <span className="stat-open-hint">View my tasks →</span>
      </button>
      <button type="button" className="stat-card team-stat stat-card-interactive" onClick={() => onNavigate("Overview")} aria-label={`Workspace has ${members.length} members`}>
        <div className="stat-top">
          <span className="stat-icon orange"><span className="people-symbol">♧</span></span>
          <span className="stat-trend">Workspace team</span>
        </div>
        <strong className="stat-number">{formatCount(members.length)}</strong>
        <span className="stat-label">People in your workspace</span>
        <div className="mini-avatars" aria-label="Workspace members">
          {members.slice(0, 3).map((member) => <span key={member.id} className={`member-${member.color}`}>{member.initials}</span>)}
          {members.length > 3 && <span>+{formatCount(members.length - 3)}</span>}
        </div>
        <span className="stat-description">Members in this workspace</span>
        <span className="stat-open-hint">Workspace overview →</span>
      </button>
    </section>
  );
}
