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
  color: string;
}

export type ProjectStatus = "Planning" | "In Progress" | "Completed" | "On Hold";

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  due: string;
  status: ProjectStatus;
}

export interface Task {
  id: string;
  title: string;
  projectId: string;
  due: string;
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
