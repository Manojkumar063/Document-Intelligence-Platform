import { useState } from "react";
import type { ProjectPayload, TaskPayload } from "../api";
import type { Project, Member, Task, TaskPriority } from "../types";

interface Props {
  mode: "task" | "project";
  projects: Project[];
  members: Member[];
  task?: Task;
  project?: Project;
  onSaveTask: (payload: TaskPayload) => Promise<void>;
  onSaveProject: (payload: ProjectPayload) => Promise<void>;
  onClose: () => void;
}

export default function Modal({ mode, projects, members, task, project, onSaveTask, onSaveProject, onClose }: Props) {
  const [taskTitle, setTaskTitle] = useState(task?.title ?? "");
  const [taskProject, setTaskProject] = useState(task?.projectId ?? projects[0]?.id ?? "");
  const [taskAssignee, setTaskAssignee] = useState(task?.assigneeId ?? "");
  const [taskDueDate, setTaskDueDate] = useState(task?.dueDate ?? "");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>(task?.priority ?? "medium");
  const [projectName, setProjectName] = useState(project?.name ?? "");
  const [projectDescription, setProjectDescription] = useState(project?.description ?? "");
  const [projectDueDate, setProjectDueDate] = useState(project?.dueDate ?? "");
  const [projectStatus, setProjectStatus] = useState<Project["status"]>(project?.status ?? "Planning");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submitTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const title = taskTitle.trim();
    if (!title || !taskProject) return;
    setSaving(true);
    setError("");
    try {
      await onSaveTask({
        title,
        project_id: taskProject,
        due_date: taskDueDate || null,
        assignee_id: taskAssignee || null,
        priority: taskPriority,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save task");
    } finally {
      setSaving(false);
    }
  }

  async function submitProject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = projectName.trim();
    if (!name) return;
    setSaving(true);
    setError("");
    try {
      await onSaveProject({
        name,
        description: projectDescription.trim(),
        due_date: projectDueDate || null,
        status: projectStatus,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save project");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button className="modal-close" type="button" aria-label="Close dialog" onClick={onClose}>×</button>
        {mode === "task" ? (
          <>
            <p className="eyebrow">MAKE A LITTLE PROGRESS</p>
            <h2 id="modal-title">{task ? "Edit task" : "Create a task"}</h2>
            <p className="modal-description">Add a next step to one of your projects.</p>
            {error && <p className="form-error" role="alert">{error}</p>}
            <form onSubmit={submitTask}>
              <label className="form-label" htmlFor="task-title">Task name</label>
              <input id="task-title" className="form-input" autoFocus value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="What needs to get done?" required maxLength={160} />
              <label className="form-label" htmlFor="task-project">Project</label>
              <select id="task-project" className="form-input" value={taskProject} onChange={(e) => setTaskProject(e.target.value)} required>
                {projects.map((p) => <option value={p.id} key={p.id}>{p.name}</option>)}
              </select>
              {projects.length === 0 && <p className="form-hint">Create a project before adding a task.</p>}
              <label className="form-label" htmlFor="task-assignee">Assignee</label>
              <select id="task-assignee" className="form-input" value={taskAssignee} onChange={(e) => setTaskAssignee(e.target.value)}>
                <option value="">Unassigned</option>
                {members.map((m) => <option value={m.id} key={m.id}>{m.name}</option>)}
              </select>
              <label className="form-label" htmlFor="task-due-date">Due date</label>
              <input id="task-due-date" className="form-input" type="date" value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} />
              <label className="form-label" htmlFor="task-priority">Priority</label>
              <select id="task-priority" className="form-input" value={taskPriority} onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <div className="modal-actions">
                <button type="button" className="button button-secondary" onClick={onClose} disabled={saving}>Cancel</button>
                <button type="submit" className="button button-primary" disabled={saving || projects.length === 0}>{saving ? "Saving…" : task ? "Save changes" : "Create task"}</button>
              </div>
            </form>
          </>
        ) : (
          <>
            <p className="eyebrow">A NEW SPACE TO GROW</p>
            <h2 id="modal-title">{project ? "Edit project" : "Start a project"}</h2>
            <p className="modal-description">Give your team's next idea a home.</p>
            {error && <p className="form-error" role="alert">{error}</p>}
            <form onSubmit={submitProject}>
              <label className="form-label" htmlFor="project-name">Project name</label>
              <input id="project-name" className="form-input" autoFocus value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="e.g. Website launch" required maxLength={80} />
              <label className="form-label" htmlFor="project-description">Description</label>
              <input id="project-description" className="form-input" value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} placeholder="What is this project about?" maxLength={300} />
              <label className="form-label" htmlFor="project-status">Status</label>
              <select id="project-status" className="form-input" value={projectStatus} onChange={(e) => setProjectStatus(e.target.value as Project["status"])}>
                <option>Planning</option>
                <option>In Progress</option>
                <option>Completed</option>
                <option>On Hold</option>
              </select>
              <label className="form-label" htmlFor="project-due-date">Due date</label>
              <input id="project-due-date" className="form-input" type="date" value={projectDueDate} onChange={(e) => setProjectDueDate(e.target.value)} />
              <div className="modal-actions">
                <button type="button" className="button button-secondary" onClick={onClose} disabled={saving}>Cancel</button>
                <button type="submit" className="button button-primary" disabled={saving}>{saving ? "Saving…" : project ? "Save changes" : "Create project"}</button>
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
