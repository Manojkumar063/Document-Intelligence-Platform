import { useCallback } from "react";
import Icon from "./Icon";
import type { Task, Project, NavItem, Member } from "../types";

interface Props {
  tasks: Task[];
  projects: Project[];
  members: Member[];
  activeNav: NavItem;
  onToggle: (id: string) => void;
  onAddTask: () => void;
  onViewAll: (nav: NavItem) => void;
}

export default function TasksPanel({ tasks, projects, members, activeNav, onToggle, onAddTask, onViewAll }: Props) {
  const projectNameFor = useCallback(
    (id: string) => projects.find((p) => p.id === id)?.name ?? "General",
    [projects]
  );
  const memberFor = useCallback(
    (id?: string) => members.find((m) => m.id === id),
    [members]
  );

  return (
    <div className="tasks-panel">
      <div className="section-heading task-heading">
        <div><h2>{activeNav === "My tasks" ? "My tasks" : "Up next"}</h2><p>The next small steps.</p></div>
        <button type="button" className="text-button" onClick={() => onViewAll("My tasks")}>See all <span>→</span></button>
      </div>
      <div className="task-list">
        {tasks.slice(0, 5).map((task) => {
          const assignee = memberFor(task.assigneeId);
          return (
            <div className={`task-row ${task.done ? "task-done" : ""}`} key={task.id}>
              <button
                className="task-checkbox"
                type="button"
                aria-label={`${task.done ? "Mark incomplete" : "Complete"}: ${task.title}`}
                aria-pressed={task.done}
                onClick={() => onToggle(task.id)}
              >
                {task.done && <Icon name="check" size={14} />}
              </button>
              <div className="task-copy">
                <strong>{task.title}</strong>
                <span>{projectNameFor(task.projectId)}</span>
              </div>
              {assignee && (
                <span className={`task-assignee member-${assignee.color}`} title={assignee.name}>
                  {assignee.initials}
                </span>
              )}
              <span className={`task-due ${task.due === "Today" ? "due-today" : ""}`}>{task.due}</span>
              <button type="button" className="icon-button subtle task-more" aria-label={`More options for ${task.title}`}>
                <Icon name="more" size={17} />
              </button>
            </div>
          );
        })}
        {tasks.length === 0 && <p className="empty-state">No tasks match your search. Try another phrase or add a task.</p>}
      </div>
      <button type="button" className="add-task-link" onClick={onAddTask}>
        <Icon name="plus" size={16} /> Add a task
      </button>
    </div>
  );
}
