import type { ActivityEvent, ActivityEventType } from "../types";

interface Props {
  events: ActivityEvent[];
  loading: boolean;
  error: string;
}

const EVENT_ICON: Record<ActivityEventType, string> = {
  task_completed: "✓",
  task_created:   "+",
  project_created: "◒",
  member_joined:  "♧",
};

const EVENT_LABEL: Record<ActivityEventType, string> = {
  task_completed:  "completed a task",
  task_created:    "created a task",
  project_created: "created a project",
  member_joined:   "joined the workspace",
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ActivityFeed({ events, loading, error }: Props) {
  return (
    <div className="activity-feed">
      <div className="section-heading" style={{ marginBottom: 18 }}>
        <div><h2>Activity</h2><p>What's been happening in your workspace.</p></div>
      </div>

      {error && <p className="workspace-error" role="alert">{error}</p>}
      {loading && <p className="workspace-loading">Loading activity…</p>}

      {!loading && !error && events.length === 0 && (
        <p className="empty-state">No activity yet. Start by creating a project or task.</p>
      )}

      <ol className="activity-list">
        {events.map((event) => (
          <li key={event.id} className="activity-item">
            <span className={`activity-avatar member-${event.actor_color}`}>
              {event.actor_initials}
            </span>
            <div className="activity-body">
              <p>
                <strong>{event.actor_name}</strong>
                {" "}{EVENT_LABEL[event.type]}{" "}
                <span className="activity-subject">{event.subject}</span>
              </p>
              <span className="activity-time">{timeAgo(event.created_at)}</span>
            </div>
            <span className={`activity-icon activity-icon-${event.type}`}>
              {EVENT_ICON[event.type]}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
