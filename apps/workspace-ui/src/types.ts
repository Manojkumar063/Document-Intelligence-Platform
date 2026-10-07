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

export interface Task {
  id: string;
  title: string;
  projectId: string;
  dueDate: string | null;
  done: boolean;
  assigneeId?: string;
}

export interface Notification {
  id: string;
  message: string;
  time: string;
  read: boolean;
}

export type NavItem = "Overview" | "My tasks" | "Projects";
