import { useState } from "react";
import Icon from "./Icon";
import { formatDateLabel } from "../date";
import type { Project, Task, NavItem, Member } from "../types";
import KanbanBoard from "./KanbanBoard";

const STATUS_CLASS: Record<string, string> = {
  "Planning": "status-planning",
  "In Progress": "status-inprogress",
  "Completed": "status-completed",
  "On Hold": "status-onhold",
};

interface Props {
  projects: Project[];
  tasks: Task[];
  members: Member[];
  onViewAll: (nav: NavItem) => void;
  onAddProject: () => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
  onToggleTask: (id: string, done: boolean) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onAddTask: () => void;
  showAll: boolean;
}

export default function ProjectsSection({ projects, tasks, members, onViewAll, onAddProject, onEditProject, onDeleteProject, onToggleTask, onEditTask, onDeleteTask, onAddTask, showAll }: Props) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const shownProjects = showAll ? projects : projects.slice(0, 3);

  return (
    <section className="section-block">
      <div className="section-heading">
        <div><h2>Your projects</h2><p>Big ideas, moving forward.</p></div>
        <div className="section-heading-actions">
          <div className="view-toggle">
            <button type="button" className={`view-toggle-btn ${view === "grid" ? "active" : ""}`} onClick={() => setView("grid")} aria-label="Grid view"><Icon name="grid" size={14} /></button>
            <button type="button" className={`view-toggle-btn ${view === "list" ? "active" : ""}`} onClick={() => setView("list")} aria-label="List view"><Icon name="list" size={14} /></button>
          </div>
          <button type="button" className="text-button" onClick={() => onViewAll("Projects")}>View all <span>→</span></button>
        </div>
      </div>
      {view === "board" && (
        <KanbanBoard tasks={tasks} projects={projects} members={members} onToggle={onToggleTask} onEditTask={onEditTask} onDeleteTask={onDeleteTask} onAddTask={onAddTask} />
      )}
      {view === "list" && <div className="project-list"><div className="project-list-header"><span>Project</span><span>Owner</span><span>Status</span><span>Due date</span><span>Progress</span><span>Actions</span></div>{shownProjects.map((project) => { const projectTasks = tasks.filter((task) => task.projectId === project.id); const done = projectTasks.filter((task) => task.done).length; const percent = projectTasks.length ? Math.round(done / projectTasks.length * 100) : 0; const owner = members.find((member) => member.role === "owner"); return <div className="project-list-row" key={project.id}><span className="project-list-name"><strong>{project.name}</strong><small>{projectTasks.length} tasks</small></span><span>{owner?.name ?? "Not assigned"}</span><span><span className={`status-badge ${STATUS_CLASS[project.status]}`}>{project.status}</span></span><span className="due-label">{formatDateLabel(project.dueDate)}</span><span className="project-list-progress"><span className="progress-track"><span style={{ width: `${percent}%` }} /></span><small>{percent}%</small></span><span className="project-list-actions"><button type="button" onClick={() => onEditProject(project)}>Edit</button><button type="button" onClick={() => onEditProject({ ...project, status: "On Hold" })}>On hold</button></span></div>; })}{shownProjects.length === 0 && <div className="empty-state project-empty"><strong>No projects yet</strong><p>Create your first project to organize tasks and track progress.</p><button type="button" className="button button-primary" onClick={onAddProject}>Create your first project</button></div>}<button type="button" className="new-project-card project-list-create" onClick={onAddProject}>+ Create project</button></div>}
      {view === "grid" && <div className="project-grid">
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
                      <button type="button" onClick={() => { setOpenMenu(null); onEditProject({ ...project, status: "On Hold" }); }}>Move to On Hold</button><button type="button" className="danger-action" onClick={() => { setOpenMenu(null); onDeleteProject(project); }}>Delete project</button>
                    </div>
                  )}
                </div>
              </div>
              <h3>{project.name}</h3>
              <p className="project-description">{project.description}</p>
              <div className="project-owner-row"><span className="project-owner-avatar">{(members.find((member) => member.role === "owner")?.initials ?? "?").slice(0, 2)}</span><span className="project-owner-name">{members.find((member) => member.role === "owner")?.name ?? "Owner not assigned"}</span></div>
              <div className="project-card-meta">
                <span className="project-task-count">{projectTasks.length} {projectTasks.length === 1 ? "task" : "tasks"}</span>
                <span className="due-label"><Icon name="calendar" size={14} /> {formatDateLabel(project.dueDate)}</span>
              </div>
              <div className="progress-label"><span>Progress</span><strong>{percent}%</strong></div>
              <div className="progress-track"><span style={{ width: `${percent}%` }} /></div>
            </article>
          );
        })}
        {shownProjects.length === 0 && <div className="empty-state project-empty"><strong>No projects yet</strong><p>Create your first project to organize tasks and track progress.</p><button type="button" className="button button-primary" onClick={onAddProject}>Create your first project</button></div>}
        <button type="button" className="new-project-card" onClick={onAddProject}>
          <span className="new-project-icon"><Icon name="plus" size={20} /></span>
          <strong>Start something new</strong>
          <span>Bring your next big idea to life</span>
        </button>
      </div>}
    </section>
  );
}
