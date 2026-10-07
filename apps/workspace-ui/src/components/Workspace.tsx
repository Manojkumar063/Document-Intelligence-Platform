import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import StatsGrid from "./StatsGrid";
import ProjectsSection from "./ProjectsSection";
import TasksPanel from "./TasksPanel";
import KnowledgeCard from "./KnowledgeCard";
import Modal from "./Modal";
import type { User, Project, Task, NavItem, Member, Notification } from "../types";

const startingProjects: Project[] = [
  { id: "atlas", name: "Atlas refresh", description: "A clearer home for our customers", color: "lilac", due: "Oct 18", status: "In Progress" },
  { id: "onboarding", name: "Team onboarding", description: "Make every first week count", color: "mint", due: "Oct 22", status: "Planning" },
  { id: "research", name: "Customer research", description: "Listen, learn, and build better", color: "peach", due: "Oct 29", status: "In Progress" },
];

export const ORG_MEMBERS: Member[] = [
  { id: "m1", initials: "PM", name: "Priya M.", color: "teal" },
  { id: "m2", initials: "AL", name: "Alex L.", color: "purple" },
  { id: "m3", initials: "JK", name: "Jordan K.", color: "mint" },
  { id: "m4", initials: "SR", name: "Sam R.", color: "peach" },
  { id: "m5", initials: "TN", name: "Taylor N.", color: "blue" },
  { id: "m6", initials: "CW", name: "Casey W.", color: "teal" },
];

const startingTasks: Task[] = [
  { id: "t1", title: "Review the latest homepage concepts", projectId: "atlas", due: "Today", done: false, assigneeId: "m1" },
  { id: "t2", title: "Share feedback with the design team", projectId: "atlas", due: "Today", done: false, assigneeId: "m2" },
  { id: "t3", title: "Collect onboarding docs in one place", projectId: "onboarding", due: "Tomorrow", done: false, assigneeId: "m3" },
  { id: "t4", title: "Summarize the interview notes", projectId: "research", due: "Oct 9", done: true, assigneeId: "m1" },
];

const startingNotifications: Notification[] = [
  { id: "n1", message: "Alex L. completed 'Share feedback with design'", time: "2m ago", read: false },
  { id: "n2", message: "Jordan K. added a task to Team onboarding", time: "1h ago", read: false },
  { id: "n3", message: "Customer research due date is approaching", time: "3h ago", read: true },
];

function readSaved<T>(key: string, fallback: T): T {
  try {
    const stored = sessionStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

interface Props {
  user: User;
  onLogout: () => void;
}

export default function Workspace({ user, onLogout }: Props) {
  const projectKey = `teamspace.${user.id}.projects`;
  const taskKey = `teamspace.${user.id}.tasks`;

  const [projects, setProjects] = useState<Project[]>(() => readSaved(projectKey, startingProjects));
  const [tasks, setTasks] = useState<Task[]>(() => readSaved(taskKey, startingTasks));
  const [notifications, setNotifications] = useState<Notification[]>(startingNotifications);
  const [activeNav, setActiveNav] = useState<NavItem>("Overview");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<"task" | "project" | null>(null);

  useEffect(() => { sessionStorage.setItem(projectKey, JSON.stringify(projects)); }, [projectKey, projects]);
  useEffect(() => { sessionStorage.setItem(taskKey, JSON.stringify(tasks)); }, [taskKey, tasks]);

  const visibleTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter((t) => {
      const matchesView = activeNav !== "My tasks" || !t.done;
      const matchesQuery = !q || t.title.toLowerCase().includes(q);
      return matchesView && matchesQuery;
    });
  }, [activeNav, query, tasks]);

  const addTask = useCallback((title: string, projectId: string, assigneeId?: string) => {
    setTasks((prev) => [{ id: crypto.randomUUID(), title, projectId, due: "Today", done: false, assigneeId }, ...prev]);
  }, []);

  const addProject = useCallback((name: string, status: import("../types").ProjectStatus) => {
    const colors = ["lilac", "mint", "peach"];
    setProjects((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name, description: "A new space for good work", color: colors[prev.length % colors.length], due: "Coming soon", status },
    ]);
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const toggleTask = useCallback((id: string) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, done: !t.done } : t));
  }, []);

  return (
    <div className="app-shell">
      <Sidebar
        user={user}
        projects={projects}
        tasks={tasks}
        activeNav={activeNav}
        onNavChange={setActiveNav}
        onAddProject={() => setModal("project")}
        onLogout={onLogout}
      />
      <main className="main-area">
        <Topbar
          user={user}
          activeNav={activeNav}
          query={query}
          onQueryChange={setQuery}
          notifications={notifications}
          onMarkAllRead={markAllRead}
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
              <button type="button" className="button button-secondary" onClick={() => setModal("project")}>New project</button>
              <button type="button" className="button button-primary" onClick={() => setModal("task")}>Create task</button>
            </div>
          </section>

          <StatsGrid projects={projects} tasks={tasks} members={ORG_MEMBERS} />

          <ProjectsSection
            projects={projects}
            tasks={tasks}
            onViewAll={setActiveNav}
            onAddProject={() => setModal("project")}
          />

          <section className="lower-grid">
            <TasksPanel
              tasks={visibleTasks}
              projects={projects}
              members={ORG_MEMBERS}
              activeNav={activeNav}
              onToggle={toggleTask}
              onAddTask={() => setModal("task")}
              onViewAll={setActiveNav}
            />
            <KnowledgeCard />
          </section>

          <footer className="page-footer">
            <span>Made for good work, together.</span>
            <span>Teamspace <b>·</b> Your workspace, at a glance</span>
          </footer>
        </div>
      </main>

      {modal && (
        <Modal
          mode={modal}
          projects={projects}
          members={ORG_MEMBERS}
          onAddTask={addTask}
          onAddProject={addProject}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
