export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  due: string;
}

export interface Task {
  id: string;
  title: string;
  projectId: string;
  due: string;
  done: boolean;
}

export type NavItem = "Overview" | "My tasks" | "Projects";
