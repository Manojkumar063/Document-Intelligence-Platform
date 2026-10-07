import { useState } from "react";
import Icon from "./Icon";
import { formatDateLabel } from "../date";
import type { Project, Task, NavItem } from "../types";

const STATUS_CLASS: Record<string, string> = {
  "Planning": "status-planning",
  "In Progress": "status-inprogress",
  "Completed": "status-completed",
  "On Hold": "status-onhold",
};

interface Props {
  projects: Project[];
  tasks: Task[];
  onViewAll: (nav: NavItem) => void;
  onAddProject: () => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
  showAll: boolean;
}

export default function ProjectsSection({ projects, tasks, onViewAll, onAddProject, onEditProject, onDeleteProject, showAll }: Props) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const shownProjects = showAll ? projects : projects.slice(0, 3);

  return (
    <section className="section-block">
      <div className="section-heading">
        <div><h2>Your projects</h2><p>Big ideas, moving forward.</p></div>
        <button type="button" className="text-button" onClick={() => onViewAll("Projects")}>View all <span>→</span></button>
      </div>
      <div className="project-grid">
        {shownProjects.map((project, index) => {
          const projectTasks = tasks.filter((t) => t.projectId === project.id);
          const done = projectTasks.filter((t) => t.done).length;
          const percent = projectTasks.length ? Math.round((done / projectTasks.length) * 100) : 0;
          return (
            <article className={`project-card card-${project.color}`} key={project.id}>
              <div className="project-card-top">
                <div className={`project-symbol ${project.color}`}>{["✳", "◒", "⌘"][index % 3]}</div>
                <div className="project-card-top-right">
                  <span className={`status-badge ${STATUS_CLASS[project.status]}`}>{project.status}</span>
                  <button type="button" className="icon-button subtle" aria-label={`More options for ${project.name}`} aria-expanded={openMenu === project.id} onClick={() => setOpenMenu(openMenu === project.id ? null : project.id)}>
                    <Icon name="more" />
                  </button>
                  {openMenu === project.id && (
                    <div className="item-menu" role="group" aria-label={`Actions for ${project.name}`}>
                      <button type="button" onClick={() => { setOpenMenu(null); onEditProject(project); }}>Edit project</button>
                      <button type="button" className="danger-action" onClick={() => { setOpenMenu(null); onDeleteProject(project); }}>Delete project</button>
                    </div>
                  )}
                </div>
              </div>
              <h3>{project.name}</h3>
              <p className="project-description">{project.description}</p>
              <div className="project-card-meta">
                <span className="project-task-count">{projectTasks.length} {projectTasks.length === 1 ? "task" : "tasks"}</span>
                <span className="due-label"><Icon name="calendar" size={14} /> {formatDateLabel(project.dueDate)}</span>
              </div>
              <div className="progress-label"><span>Progress</span><strong>{percent}%</strong></div>
              <div className="progress-track"><span style={{ width: `${percent}%` }} /></div>
            </article>
          );
        })}
        {shownProjects.length === 0 && <p className="empty-state project-empty">No projects yet. Create one to give your work a home.</p>}
        <button type="button" className="new-project-card" onClick={onAddProject}>
          <span className="new-project-icon"><Icon name="plus" size={20} /></span>
          <strong>Start something new</strong>
          <span>Bring your next big idea to life</span>
        </button>
      </div>
    </section>
  );
}
