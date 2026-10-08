import type { Task, Project, Member } from "../types";
import { formatDateLabel } from "../date";

interface Props {
  tasks: Task[];
  projects: Project[];
  members: Member[];
  onToggle: (id: string, done: boolean) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onAddTask: () => void;
}

const COLUMNS = [
  { key: "todo",        label: "To Do",       cls: "kanban-col-todo" },
  { key: "inprogress",  label: "In Progress",  cls: "kanban-col-inprogress" },
  { key: "done",        label: "Done",         cls: "kanban-col-done" },
] as const;

type ColKey = typeof COLUMNS[number]["key"];

const PRIORITY_CLS: Record<string, string> = {
  low: "priority-low", medium: "priority-medium", high: "priority-high", urgent: "priority-urgent",
};
const PRIORITY_LABEL: Record<string, string> = {
  low: "Low", medium: "Med", high: "High", urgent: "!!",
};

function taskColumn(task: Task, project: Project | undefined): ColKey {
  if (task.done) return "done";
  if (project?.status === "In Progress") return "inprogress";
  return "todo";
}

export default function KanbanBoard({ tasks, projects, members, onToggle, onEditTask, onDeleteTask, onAddTask }: Props) {
  const projectById = Object.fromEntries(projects.map((p) => [p.id, p]));
  const memberById = Object.fromEntries(members.map((m) => [m.id, m]));

  const columns: Record<ColKey, Task[]> = { todo: [], inprogress: [], done: [] };
  for (const task of tasks) {
    columns[taskColumn(task, projectById[task.projectId])].push(task);
  }

  return (
    <div className="kanban-board">
      {COLUMNS.map(({ key, label, cls }) => (
        <div key={key} className={`kanban-col ${cls}`}>
          <div className="kanban-col-header">
            <span className="kanban-col-label">{label}</span>
            <span className="kanban-col-count">{columns[key].length}</span>
          </div>
          <div className="kanban-cards">
            {columns[key].map((task) => {
              const project = projectById[task.projectId];
              const assignee = task.assigneeId ? memberById[task.assigneeId] : undefined;
              return (
                <div key={task.id} className={`kanban-card ${task.done ? "kanban-card-done" : ""}`}>
                  <div className="kanban-card-top">
                    <span className={`priority-badge ${PRIORITY_CLS[task.priority]}`}>
                      {PRIORITY_LABEL[task.priority]}
                    </span>
                    <div className="kanban-card-actions">
                      <button type="button" className="kanban-action-btn" onClick={() => onEditTask(task)}>Edit</button>
                      <button type="button" className="kanban-action-btn danger" onClick={() => onDeleteTask(task)}>Del</button>
                    </div>
                  </div>
                  <p className="kanban-card-title">{task.title}</p>
                  {project && (
                    <span className={`kanban-project-dot project-dot ${project.color}`} title={project.name}>
                      <span>{project.name}</span>
                    </span>
                  )}
                  <div className="kanban-card-footer">
                    <span className="kanban-due">{formatDateLabel(task.dueDate)}</span>
                    <div className="kanban-card-right">
                      {assignee && (
                        <span className={`task-assignee member-${assignee.color}`} title={assignee.name}>
                          {assignee.initials}
                        </span>
                      )}
                      <button
                        type="button"
                        className={`kanban-check ${task.done ? "kanban-check-done" : ""}`}
                        aria-label={task.done ? "Mark incomplete" : "Mark complete"}
                        onClick={() => onToggle(task.id, !task.done)}
                      >
                        {task.done ? "✓" : "○"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {columns[key].length === 0 && (
              <p className="kanban-empty">No tasks here.</p>
            )}
          </div>
          {key === "todo" && (
            <button type="button" className="kanban-add-btn" onClick={onAddTask}>+ Add task</button>
          )}
        </div>
      ))}
    </div>
  );
}
