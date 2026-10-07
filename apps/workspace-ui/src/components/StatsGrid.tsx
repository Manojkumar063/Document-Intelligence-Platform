import Icon from "./Icon";
import type { Project, Task } from "../types";

interface Props {
  projects: Project[];
  tasks: Task[];
}

export default function StatsGrid({ projects, tasks }: Props) {
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
        <strong className="stat-number">06</strong>
        <span className="stat-label">People in your workspace</span>
        <div className="mini-avatars" aria-label="Six workspace members">
          <span>PM</span><span>AL</span><span>JK</span><span>+3</span>
        </div>
      </article>
    </section>
  );
}
