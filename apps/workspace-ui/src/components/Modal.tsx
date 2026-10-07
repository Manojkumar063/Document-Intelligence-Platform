import { useState } from "react";
import type { Project, Member, ProjectStatus } from "../types";

interface Props {
  mode: "task" | "project";
  projects: Project[];
  members: Member[];
  onAddTask: (title: string, projectId: string, assigneeId?: string) => void;
  onAddProject: (name: string, status: ProjectStatus) => void;
  onClose: () => void;
}

export default function Modal({ mode, projects, members, onAddTask, onAddProject, onClose }: Props) {
  const [taskTitle, setTaskTitle] = useState("");
  const [taskProject, setTaskProject] = useState(projects[0]?.id ?? "");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>("Planning");

  function submitTask(e: React.FormEvent) {
    e.preventDefault();
    const title = taskTitle.trim();
    if (!title) return;
    onAddTask(title, taskProject, taskAssignee || undefined);
    onClose();
  }

  function submitProject(e: React.FormEvent) {
    e.preventDefault();
    const name = projectName.trim();
    if (!name) return;
    onAddProject(name, projectStatus);
    onClose();
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button className="modal-close" type="button" aria-label="Close dialog" onClick={onClose}>×</button>
        {mode === "task" ? (
          <>
            <p className="eyebrow">MAKE A LITTLE PROGRESS</p>
            <h2 id="modal-title">Create a task</h2>
            <p className="modal-description">Add a next step to one of your projects.</p>
            <form onSubmit={submitTask}>
              <label className="form-label" htmlFor="task-title">Task name</label>
              <input id="task-title" className="form-input" autoFocus value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="What needs to get done?" required />
              <label className="form-label" htmlFor="task-project">Project</label>
              <select id="task-project" className="form-input" value={taskProject} onChange={(e) => setTaskProject(e.target.value)}>
                {projects.map((p) => <option value={p.id} key={p.id}>{p.name}</option>)}
              </select>
              <label className="form-label" htmlFor="task-assignee">Assignee</label>
              <select id="task-assignee" className="form-input" value={taskAssignee} onChange={(e) => setTaskAssignee(e.target.value)}>
                <option value="">Unassigned</option>
                {members.map((m) => <option value={m.id} key={m.id}>{m.name}</option>)}
              </select>
              <div className="modal-actions">
                <button type="button" className="button button-secondary" onClick={onClose}>Cancel</button>
                <button type="submit" className="button button-primary">Create task</button>
              </div>
            </form>
          </>
        ) : (
          <>
            <p className="eyebrow">A NEW SPACE TO GROW</p>
            <h2 id="modal-title">Start a project</h2>
            <p className="modal-description">Give your team's next idea a home.</p>
            <form onSubmit={submitProject}>
              <label className="form-label" htmlFor="project-name">Project name</label>
              <input id="project-name" className="form-input" autoFocus value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="e.g. Website launch" required />
              <label className="form-label" htmlFor="project-status">Status</label>
              <select id="project-status" className="form-input" value={projectStatus} onChange={(e) => setProjectStatus(e.target.value as ProjectStatus)}>
                <option>Planning</option>
                <option>In Progress</option>
                <option>Completed</option>
                <option>On Hold</option>
              </select>
              <div className="modal-actions">
                <button type="button" className="button button-secondary" onClick={onClose}>Cancel</button>
                <button type="submit" className="button button-primary">Create project</button>
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
