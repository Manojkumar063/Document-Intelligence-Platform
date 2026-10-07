import Icon from "./Icon";
import type { Project, Task, NavItem } from "../types";

interface Props {
  projects: Project[];
  tasks: Task[];
  onViewAll: (nav: NavItem) => void;
  onAddProject: () => void;
}

export default function ProjectsSection({ projects, tasks, onViewAll, onAddProject }: Props) {
  return (
    <section className="section-block">
      <div className="section-heading">
        <div><h2>Your projects</h2><p>Big ideas, moving forward.</p></div>
        <button type="button" className="text-button" onClick={() => onViewAll("Projects")}>View all <span>→</span></button>
      </div>
      <div className="project-grid">
        {projects.slice(0, 3).map((project, index) => {
          const projectTasks = tasks.filter((t) => t.projectId === project.id);
          const done = projectTasks.filter((t) => t.done).length;
          const percent = projectTasks.length ? Math.round((done / projectTasks.length) * 100) : 0;
          return (
            <article className={`project-card card-${project.color}`} key={project.id}>
              <div className="project-card-top">
                <div className={`project-symbol ${project.color}`}>{["✳", "◒", "⌘"][index % 3]}</div>
                <button type="button" className="icon-button subtle" aria-label={`More options for ${project.name}`}>
                  <Icon name="more" />
                </button>
              </div>
              <h3>{project.name}</h3>
              <p className="project-description">{project.description}</p>
              <div className="project-card-meta">
                <div className="member-stack" aria-label="Project members"><span>PM</span><span>AL</span><span>JK</span><i>+2</i></div>
                <span className="due-label"><Icon name="calendar" size={14} /> {project.due}</span>
              </div>
              <div className="progress-label"><span>Progress</span><strong>{percent}%</strong></div>
              <div className="progress-track"><span style={{ width: `${percent}%` }} /></div>
            </article>
          );
        })}
        <button type="button" className="new-project-card" onClick={onAddProject}>
          <span className="new-project-icon"><Icon name="plus" size={20} /></span>
          <strong>Start something new</strong>
          <span>Bring your next big idea to life</span>
        </button>
      </div>
    </section>
  );
}
