import Icon from "./Icon";
import type { Project, Task, Member } from "../types";

interface Props {
  projects: Project[];
  tasks: Task[];
  members: Member[];
}

export default function StatsGrid({ projects, tasks, members }: Props) {
  const pending = tasks.filter((t) => !t.done).length;
  const completed = tasks.filter((t) => t.done).length;

  return (
    <section className="stats-grid" aria-label="Workspace overview">
      <article className="stat-card">
        <div className="stat-top">
          <span className="stat-icon green"><Icon name="grid" /></span>
          <span className="stat-trend">This month</span>
        </div>
        <strong className="stat-number">{projects.length.toString().padStart(2, "0")}</strong>
        <span className="stat-label">Active projects</span>
      </article>
      <article className="stat-card">
        <div className="stat-top">
          <span className="stat-icon purple"><Icon name="check" /></span>
          <span className="stat-trend">{completed} done</span>
        </div>
        <strong className="stat-number">{pending.toString().padStart(2, "0")}</strong>
        <span className="stat-label">Tasks in progress</span>
      </article>
      <article className="stat-card team-stat">
        <div className="stat-top">
          <span className="stat-icon orange"><span className="people-symbol">♧</span></span>
          <span className="stat-trend">All together</span>
        </div>
        <strong className="stat-number">{members.length.toString().padStart(2, "0")}</strong>
        <span className="stat-label">People in your workspace</span>
        <div className="mini-avatars" aria-label="Workspace members">
          {members.slice(0, 3).map((m) => (
            <span key={m.id} className={`member-${m.color}`}>{m.initials}</span>
          ))}
          {members.length > 3 && <span>+{members.length - 3}</span>}
        </div>
      </article>
    </section>
  );
}
