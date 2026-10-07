import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createProject,
  createTask,
  createWorkspaceInvitation,
  acceptWorkspaceInvitation,
  deleteProject,
  deleteTask,
  getWorkspace,
  getWorkspaceData,
  removeWorkspaceMember,
  switchWorkspace,
  updateProject,
  updateTask,
  type ProjectPayload,
  type TaskPayload,
} from "../api";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import StatsGrid from "./StatsGrid";
import ProjectsSection from "./ProjectsSection";
import TasksPanel, { type TaskFilters } from "./TasksPanel";
import KnowledgeCard from "./KnowledgeCard";
import Modal from "./Modal";
import type { User, Project, Task, NavItem, Member, Notification, WorkspaceInfo } from "../types";
import WorkspaceAccessModal from "./WorkspaceAccessModal";

const emptyFilters: TaskFilters = { projectId: "", assigneeId: "", status: "all", due: "all" };

interface Props {
  user: User;
  onLogout: () => void;
}

function localDateString(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

export default function Workspace({ user, onLogout }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const notifications: Notification[] = [];
  const [activeNav, setActiveNav] = useState<NavItem>("Overview");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<TaskFilters>(emptyFilters);
  const [modal, setModal] = useState<{ mode: "task" | "project"; task?: Task; project?: Project } | null>(null);
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const members = workspace?.members ?? [];

  useEffect(() => {
    let cancelled = false;
    const loadWorkspace = async () => {
      let info: WorkspaceInfo;
      const invitationToken = new URLSearchParams(window.location.search).get("invite");
      if (invitationToken) {
        try {
          info = await acceptWorkspaceInvitation(invitationToken);
          const url = new URL(window.location.href);
          url.searchParams.delete("invite");
          window.history.replaceState({}, "", url);
        } catch (invitationError) {
          if (cancelled) return;
          setError(invitationError instanceof Error ? invitationError.message : "Could not accept invitation");
          info = await getWorkspace();
        }
      } else {
        info = await getWorkspace();
      }
      const data = await getWorkspaceData();
      if (cancelled) return;
      setWorkspace(info);
      setProjects(data.projects);
      setTasks(data.tasks);
    };
    void loadWorkspace()
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load workspace data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const changeWorkspace = useCallback(async (workspaceId: string) => {
    setLoading(true);
    setError("");
    try {
      const info = await switchWorkspace(workspaceId);
      const data = await getWorkspaceData();
      setWorkspace(info);
      setProjects(data.projects);
      setTasks(data.tasks);
      setFilters(emptyFilters);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not switch workspace");
    } finally {
      setLoading(false);
    }
  }, []);

  const inviteMember = useCallback((email: string) => createWorkspaceInvitation(email), []);

  const removeMember = useCallback(async (member: Member) => {
    await removeWorkspaceMember(member.id);
    setWorkspace((current) => current
      ? { ...current, members: current.members.filter((item) => item.id !== member.id) }
      : current);
  }, []);

  const visibleTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    const today = localDateString();
    return tasks.filter((task) => {
      const project = projects.find((item) => item.id === task.projectId);
      const matchesView = activeNav !== "My tasks"
        || (task.assigneeId === user.id && (filters.status === "completed" || !task.done));
      const matchesQuery = !q || task.title.toLowerCase().includes(q) || (project?.name.toLowerCase().includes(q) ?? false);
      const matchesProject = !filters.projectId || task.projectId === filters.projectId;
      const matchesAssignee = !filters.assigneeId
        || (filters.assigneeId === "unassigned" ? !task.assigneeId : task.assigneeId === filters.assigneeId);
      const matchesStatus = filters.status === "all"
        || (filters.status === "completed" ? task.done : !task.done);
      const matchesDue = filters.due === "all"
        || (filters.due === "overdue" && Boolean(task.dueDate && task.dueDate < today && !task.done))
        || (filters.due === "today" && task.dueDate === today)
        || (filters.due === "upcoming" && Boolean(task.dueDate && task.dueDate > today))
        || (filters.due === "no-date" && !task.dueDate);
      return matchesView && matchesQuery && matchesProject && matchesAssignee && matchesStatus && matchesDue;
    });
  }, [activeNav, filters, projects, query, tasks, user.id]);

  const saveTask = useCallback(async (payload: TaskPayload, task?: Task) => {
    const saved = task
      ? await updateTask(undefined, task.id, payload)
      : await createTask(undefined, payload);
    setTasks((previous) => task
      ? previous.map((item) => item.id === task.id ? saved : item)
      : [saved, ...previous]);
    setError("");
  }, []);

  const saveProject = useCallback(async (payload: ProjectPayload, project?: Project) => {
    const saved = project
      ? await updateProject(undefined, project.id, payload)
      : await createProject(undefined, payload);
    setProjects((previous) => project
      ? previous.map((item) => item.id === project.id ? saved : item)
      : [saved, ...previous]);
    setError("");
  }, []);

  const removeProject = useCallback(async (project: Project) => {
    if (!window.confirm(`Delete "${project.name}" and its tasks? This cannot be undone.`)) return;
    try {
      await deleteProject(undefined, project.id);
      setProjects((previous) => previous.filter((item) => item.id !== project.id));
      setTasks((previous) => previous.filter((item) => item.projectId !== project.id));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete project");
    }
  }, []);

  const removeTask = useCallback(async (task: Task) => {
    if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    try {
      await deleteTask(undefined, task.id);
      setTasks((previous) => previous.filter((item) => item.id !== task.id));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete task");
    }
  }, []);

  const toggleTask = useCallback(async (id: string, done: boolean) => {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    try {
      const saved = await updateTask(undefined, id, {
        title: task.title,
        project_id: task.projectId,
        due_date: task.dueDate,
        assignee_id: task.assigneeId ?? null,
        done,
      });
      setTasks((previous) => previous.map((item) => item.id === id ? saved : item));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update task");
    }
  }, [tasks]);

  if (loading && !workspace) {
    return <main className="auth-screen"><p className="auth-loading">Loading your shared workspace…</p></main>;
  }
  if (!workspace) {
    return (
      <main className="auth-screen">
        <section className="auth-card">
          <h1>Could not load workspace</h1>
          <p className="auth-intro">{error || "The workspace service is unavailable."}</p>
          <button type="button" className="button button-primary auth-submit" onClick={() => window.location.reload()}>Try again</button>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        user={user}
        projects={projects}
        tasks={tasks}
        activeNav={activeNav}
        onNavChange={setActiveNav}
        onAddProject={() => setModal({ mode: "project" })}
        onLogout={onLogout}
        workspace={workspace}
        onInvite={() => setAccessModalOpen(true)}
        onSwitchWorkspace={(id) => void changeWorkspace(id)}
      />
      <main className="main-area">
        <Topbar
          user={user}
          workspaceName={workspace.name}
          activeNav={activeNav}
          query={query}
          onQueryChange={setQuery}
          notifications={notifications}
          onMarkAllRead={() => {}}
        />
        <div className="page-content">
          <section className="welcome-row">
            <div>
              <p className="eyebrow">
                <span className="sun-dot" />
                {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }).toUpperCase()}
              </p>
              <h1>{activeNav === "Overview" ? `Welcome, ${user.full_name.split(" ")[0] || user.email}` : activeNav}</h1>
              <p className="welcome-subtitle">A little progress every day adds up to big things.</p>
            </div>
            <div className="welcome-actions">
              <button type="button" className="button button-secondary" onClick={() => setModal({ mode: "project" })}>New project</button>
              <button type="button" className="button button-primary" onClick={() => setModal({ mode: "task" })} disabled={projects.length === 0}>Create task</button>
            </div>
          </section>

          {error && <div className="workspace-error" role="alert">{error}</div>}
          {loading ? (
            <p className="workspace-loading" role="status">Loading your workspace…</p>
          ) : (
            <>
              <StatsGrid projects={projects} tasks={tasks} members={members} />
              <ProjectsSection
                projects={projects}
                tasks={tasks}
                onViewAll={setActiveNav}
                onAddProject={() => setModal({ mode: "project" })}
                onEditProject={(project) => setModal({ mode: "project", project })}
                onDeleteProject={removeProject}
                showAll={activeNav === "Projects"}
              />
              <section className="lower-grid">
                <TasksPanel
                  tasks={visibleTasks}
                  projects={projects}
                  members={members}
                  activeNav={activeNav}
                  filters={filters}
                  onFiltersChange={setFilters}
                  onToggle={toggleTask}
                  onAddTask={() => setModal({ mode: "task" })}
                  onEditTask={(task) => setModal({ mode: "task", task })}
                  onDeleteTask={removeTask}
                  onViewAll={setActiveNav}
                />
                <KnowledgeCard />
              </section>
              <footer className="page-footer">
                <span>Made for good work, together.</span>
                <span>Teamspace <b>·</b> Your workspace, at a glance</span>
              </footer>
            </>
          )}
        </div>
      </main>

      {modal && (
        <Modal
          mode={modal.mode}
          task={modal.task}
          project={modal.project}
          projects={projects}
          members={members}
          onSaveTask={(payload) => saveTask(payload, modal.task)}
          onSaveProject={(payload) => saveProject(payload, modal.project)}
          onClose={() => setModal(null)}
        />
      )}
      {accessModalOpen && (
        <WorkspaceAccessModal
          members={members}
          currentUserId={user.id}
          onInvite={inviteMember}
          onRemoveMember={removeMember}
          onClose={() => setAccessModalOpen(false)}
        />
      )}
    </div>
  );
}
