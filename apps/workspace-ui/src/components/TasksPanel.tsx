import { useCallback, useState } from "react";
import Icon from "./Icon";
import { formatDateLabel } from "../date";
import type { Task, Project, NavItem, Member } from "../types";

export interface TaskFilters {
  projectId: string;
  assigneeId: string;
  status: "all" | "open" | "completed";
  due: "all" | "overdue" | "today" | "upcoming" | "no-date";
}

interface Props {
  tasks: Task[];
  projects: Project[];
  members: Member[];
  activeNav: NavItem;
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
  onToggle: (id: string, done: boolean) => void;
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onViewAll: (nav: NavItem) => void;
}

function isOverdue(dueDate: string | null, done: boolean): boolean {
  if (!dueDate || done) return false;
  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return dueDate < todayString;
}

export default function TasksPanel({
  tasks, projects, members, activeNav, filters, onFiltersChange, onToggle,
  onAddTask, onEditTask, onDeleteTask, onViewAll,
}: Props) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const projectNameFor = useCallback(
    (id: string) => projects.find((p) => p.id === id)?.name ?? "General",
    [projects]
  );
  const memberFor = useCallback(
    (id?: string) => members.find((m) => m.id === id),
    [members]
  );
  const changeFilter = (key: keyof TaskFilters, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };
  const hasFilters = filters.projectId !== "" || filters.assigneeId !== "" || filters.status !== "all" || filters.due !== "all";

  return (
    <div className="tasks-panel">
      <div className="section-heading task-heading">
        <div><h2>{activeNav === "My tasks" ? "My tasks" : "Up next"}</h2><p>The next small steps.</p></div>
        <button type="button" className="text-button" onClick={() => onViewAll("My tasks")}>See all <span>→</span></button>
      </div>
      <div className="task-filters" aria-label="Filter tasks">
        <select className="filter-select" aria-label="Filter by project" value={filters.projectId} onChange={(e) => changeFilter("projectId", e.target.value)}>
          <option value="">All projects</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
        <select className="filter-select" aria-label="Filter by assignee" value={filters.assigneeId} onChange={(e) => changeFilter("assigneeId", e.target.value)}>
          <option value="">All assignees</option>
          <option value="unassigned">Unassigned</option>
          {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
        </select>
        <select className="filter-select" aria-label="Filter by status" value={filters.status} onChange={(e) => changeFilter("status", e.target.value)}>
          <option value="all">Any status</option>
          <option value="open">Open</option>
          <option value="completed">Completed</option>
        </select>
        <select className="filter-select" aria-label="Filter by due date" value={filters.due} onChange={(e) => changeFilter("due", e.target.value)}>
          <option value="all">Any due date</option>
          <option value="overdue">Overdue</option>
          <option value="today">Due today</option>
          <option value="upcoming">Upcoming</option>
          <option value="no-date">No due date</option>
        </select>
        {hasFilters && <button type="button" className="clear-filters" onClick={() => onFiltersChange({ projectId: "", assigneeId: "", status: "all", due: "all" })}>Clear</button>}
      </div>
      <div className="task-list">
        {tasks.map((task) => {
          const assignee = memberFor(task.assigneeId);
          const overdue = isOverdue(task.dueDate, task.done);
          return (
            <div className={`task-row ${task.done ? "task-done" : ""}`} key={task.id}>
              <button
                className="task-checkbox"
                type="button"
                aria-label={`${task.done ? "Mark incomplete" : "Complete"}: ${task.title}`}
                aria-pressed={task.done}
                onClick={() => onToggle(task.id, !task.done)}
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
              <span className={`task-due ${overdue ? "due-overdue" : ""}`}>{formatDateLabel(task.dueDate)}</span>
              <div className="task-menu-wrap">
                <button type="button" className="icon-button subtle task-more" aria-label={`More options for ${task.title}`} aria-expanded={openMenu === task.id} onClick={() => setOpenMenu(openMenu === task.id ? null : task.id)}>
                  <Icon name="more" size={17} />
                </button>
                {openMenu === task.id && (
                  <div className="item-menu" role="group" aria-label={`Actions for ${task.title}`}>
                    <button type="button" onClick={() => { setOpenMenu(null); onEditTask(task); }}>Edit task</button>
                    <button type="button" className="danger-action" onClick={() => { setOpenMenu(null); onDeleteTask(task); }}>Delete task</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {tasks.length === 0 && <p className="empty-state">{hasFilters ? "No tasks match these filters." : "No tasks yet. Add a task to make a little progress."}</p>}
      </div>
      <button type="button" className="add-task-link" onClick={onAddTask}>
        <Icon name="plus" size={16} /> Add a task
      </button>
    </div>
  );
}
