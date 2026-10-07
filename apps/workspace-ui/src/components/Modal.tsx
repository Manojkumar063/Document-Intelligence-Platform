import { useState } from "react";
import type { Project } from "../types";

interface Props {
  mode: "task" | "project";
  projects: Project[];
  onAddTask: (title: string, projectId: string) => void;
  onAddProject: (name: string) => void;
  onClose: () => void;
}

export default function Modal({ mode, projects, onAddTask, onAddProject, onClose }: Props) {
  const [taskTitle, setTaskTitle] = useState("");
  const [taskProject, setTaskProject] = useState(projects[0]?.id ?? "");
  const [projectName, setProjectName] = useState("");

  function submitTask(e: React.FormEvent) {
    e.preventDefault();
    const title = taskTitle.trim();
    if (!title) return;
    onAddTask(title, taskProject);
    onClose();
  }

  function submitProject(e: React.FormEvent) {
    e.preventDefault();
    const name = projectName.trim();
    if (!name) return;
    onAddProject(name);
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
