export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

export interface Member {
  id: string;
  initials: string;
  name: string;
  email: string;
  color: string;
  role: "owner" | "member";
  joinedAt: string;
}

export interface WorkspaceOption {
  id: string;
  name: string;
  role: "owner" | "member";
}

export interface WorkspaceInfo extends WorkspaceOption {
  members: Member[];
  workspaces: WorkspaceOption[];
}

export type ProjectStatus = "Planning" | "In Progress" | "Completed" | "On Hold";

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  dueDate: string | null;
  status: ProjectStatus;
}

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Task {
  id: string;
  title: string;
  projectId: string;
  dueDate: string | null;
  done: boolean;
  assigneeId?: string;
  priority: TaskPriority;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  href: string;
  created_at: string;
  read: boolean;
}

export type NavItem = "Overview" | "My tasks" | "Projects" | "Activity";

export type ActivityEventType = "task_completed" | "task_created" | "project_created" | "member_joined";

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  actor_name: string;
  actor_initials: string;
  actor_color: string;
  subject: string;
  created_at: string;
}
