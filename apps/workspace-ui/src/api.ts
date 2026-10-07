import type { Notification, Project, Task, User, WorkspaceInfo, WorkspaceOption } from "./types";

const apiUrl = (import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1").replace(/\/$/, "");

interface APIError {
  error?: { message?: string };
}

export async function apiRequest<T>(
  path: string,
  body?: object,
  token?: string,
  method?: string
): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    method: method ?? (body ? "POST" : "GET"),
    credentials: "include",
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (response.status === 204) return undefined as T;
  const data = (await response.json()) as T & APIError;
  if (!response.ok) {
    throw new Error(data.error?.message || `Request failed (${response.status})`);
  }
  return data;
}

export interface ProjectPayload {
  name: string;
  description: string;
  status: Project["status"];
  due_date: string | null;
}

export interface TaskPayload {
  title: string;
  project_id: string;
  due_date: string | null;
  assignee_id?: string | null;
  done?: boolean;
}

interface ProjectResponse {
  id: string;
  name: string;
  description: string;
  color: string;
  due_date: string | null;
  status: Project["status"];
}

interface TaskResponse {
  id: string;
  title: string;
  project_id: string;
  due_date: string | null;
  done: boolean;
  assignee_id: string | null;
}

interface WorkspaceMemberResponse {
  id: string;
  email: string;
  full_name: string;
  role: "owner" | "member";
  joined_at: string;
}

interface WorkspaceResponse extends WorkspaceOption {
  members: WorkspaceMemberResponse[];
  workspaces: WorkspaceOption[];
}

interface WorkspaceInvitationResponse {
  id: string;
  email: string;
  token: string;
  expires_at: string;
}

function toProject(project: ProjectResponse): Project {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    color: project.color,
    dueDate: project.due_date,
    status: project.status,
  };
}

function toTask(task: TaskResponse): Task {
  return {
    id: task.id,
    title: task.title,
    projectId: task.project_id,
    dueDate: task.due_date,
    done: task.done,
    assigneeId: task.assignee_id ?? undefined,
  };
}

function toWorkspace(workspace: WorkspaceResponse): WorkspaceInfo {
  const colors = ["teal", "purple", "mint", "peach", "blue"];
  return {
    ...workspace,
    members: workspace.members.map((member, index) => {
      const initials = member.full_name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("");
      return {
        id: member.id,
        name: member.full_name || member.email,
        email: member.email,
        initials: (initials || member.email.slice(0, 2)).toUpperCase(),
        color: colors[index % colors.length],
        role: member.role,
        joinedAt: member.joined_at,
      };
    }),
  };
}

export async function getWorkspace(): Promise<WorkspaceInfo> {
  return toWorkspace(await apiRequest<WorkspaceResponse>("/workspace"));
}

export async function switchWorkspace(workspaceId: string): Promise<WorkspaceInfo> {
  return toWorkspace(await apiRequest<WorkspaceResponse>(`/workspace/active/${workspaceId}`, undefined, undefined, "PATCH"));
}

export async function createWorkspaceInvitation(email: string): Promise<WorkspaceInvitationResponse> {
  return apiRequest<WorkspaceInvitationResponse>("/workspace/invitations", { email });
}

export async function removeWorkspaceMember(memberId: string): Promise<void> {
  await apiRequest<void>(`/workspace/members/${memberId}`, undefined, undefined, "DELETE");
}

export async function acceptWorkspaceInvitation(token: string): Promise<WorkspaceInfo> {
  return toWorkspace(await apiRequest<WorkspaceResponse>("/workspace/invitations/accept", { token }));
}

export async function getWorkspaceData(): Promise<{ projects: Project[]; tasks: Task[] }> {
  const [projects, tasks] = await Promise.all([
    apiRequest<ProjectResponse[]>("/workspace/projects"),
    apiRequest<TaskResponse[]>("/workspace/tasks"),
  ]);
  return { projects: projects.map(toProject), tasks: tasks.map(toTask) };
}

export async function createProject(payload: ProjectPayload): Promise<Project> {
  return toProject(await apiRequest<ProjectResponse>("/workspace/projects", payload));
}

export async function updateProject(id: string, payload: ProjectPayload): Promise<Project> {
  return toProject(await apiRequest<ProjectResponse>(`/workspace/projects/${id}`, payload, undefined, "PATCH"));
}

export async function deleteProject(id: string): Promise<void> {
  await apiRequest<void>(`/workspace/projects/${id}`, undefined, undefined, "DELETE");
}

export async function createTask(payload: TaskPayload): Promise<Task> {
  return toTask(await apiRequest<TaskResponse>("/workspace/tasks", payload));
}

export async function updateTask(id: string, payload: TaskPayload): Promise<Task> {
  return toTask(await apiRequest<TaskResponse>(`/workspace/tasks/${id}`, payload, undefined, "PATCH"));
}

export async function deleteTask(id: string): Promise<void> {
  await apiRequest<void>(`/workspace/tasks/${id}`, undefined, undefined, "DELETE");
}

export async function login(email: string, password: string): Promise<User> {
  // /auth/login sets the rag_access_token HTTP-only cookie and returns the token.
  // We pass it explicitly to /users/me to avoid a race where the cookie isn't
  // available to the next fetch yet.
  const { access_token } = await apiRequest<{ access_token: string }>("/auth/login", { email, password });
  const user = await apiRequest<User>("/users/me", undefined, access_token);
  if (!user.is_active) throw new Error("This account is disabled. Contact your administrator.");
  return user;
}

export async function register(email: string, password: string, full_name: string): Promise<void> {
  await apiRequest<User>("/auth/register", { email, password, full_name });
}

export async function getMe(): Promise<User> {
  return apiRequest<User>("/users/me");
}

export async function logoutSession(): Promise<void> {
  await apiRequest<void>("/auth/logout", undefined, undefined, "POST");
}

interface NotificationListResponse {
  items: Notification[];
  unread_count: number;
}

export async function getNotifications(): Promise<NotificationListResponse> {
  return apiRequest<NotificationListResponse>("/notifications");
}

export async function markNotificationRead(id: string): Promise<Notification> {
  return apiRequest<Notification>(`/notifications/${encodeURIComponent(id)}/read`, undefined, undefined, "PATCH");
}

export function userInitials(user: User): string {
  const initials = user.full_name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
  return (initials || user.email.slice(0, 2)).toUpperCase();
}
