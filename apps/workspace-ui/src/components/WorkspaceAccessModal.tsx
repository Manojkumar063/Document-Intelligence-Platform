import { useState } from "react";
import type { Member } from "../types";

interface Invitation {
  email: string;
  token: string;
  expires_at: string;
}

interface Props {
  members: Member[];
  currentUserId: string;
  onInvite: (email: string) => Promise<Invitation>;
  onRemoveMember: (member: Member) => Promise<void>;
  onClose: () => void;
}

export default function WorkspaceAccessModal({
  members, currentUserId, onInvite, onRemoveMember, onClose,
}: Props) {
  const [email, setEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const invitation = await onInvite(email.trim());
      const url = new URL(window.location.href);
      url.search = "";
      url.hash = "";
      url.searchParams.set("invite", invitation.token);
      setInviteUrl(url.toString());
      setEmail("");
      setMessage(`Invitation link created for ${invitation.email}. Share it before it expires.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create invitation");
    } finally {
      setSaving(false);
    }
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setMessage("Invitation link copied.");
    } catch {
      setError("Could not copy the link. Select and copy it manually.");
    }
  }

  async function removeMember(member: Member) {
    if (!window.confirm(`Remove ${member.name} from this workspace?`)) return;
    setRemovingId(member.id);
    setError("");
    try {
      await onRemoveMember(member);
      setMessage(`${member.name} was removed from the workspace.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove member");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="modal-card workspace-access-modal" role="dialog" aria-modal="true" aria-labelledby="workspace-access-title">
        <button className="modal-close" type="button" aria-label="Close dialog" onClick={onClose}>×</button>
        <p className="eyebrow">WORK BETTER TOGETHER</p>
        <h2 id="workspace-access-title">Workspace members</h2>
        <p className="modal-description">Invite teammates with a private link tied to their email address.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        {message && <p className="form-success" role="status">{message}</p>}

        <form onSubmit={submit} className="invite-form">
          <label className="form-label" htmlFor="invite-email">Teammate's email</label>
          <div className="invite-input-row">
            <input id="invite-email" className="form-input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@example.com" required />
            <button type="submit" className="button button-primary" disabled={saving}>{saving ? "Creating…" : "Create invite"}</button>
          </div>
        </form>
        {inviteUrl && (
          <div className="invite-link-row">
            <input className="form-input invite-link-input" aria-label="Invitation link" readOnly value={inviteUrl} onFocus={(e) => e.currentTarget.select()} />
            <button type="button" className="button button-secondary" onClick={() => void copyInvite()}>Copy link</button>
          </div>
        )}

        <div className="member-list-heading"><strong>{members.length} {members.length === 1 ? "member" : "members"}</strong><span>Workspace access</span></div>
        <ul className="workspace-member-list">
          {members.map((member) => (
            <li key={member.id} className="workspace-member-row">
              <span className={`task-assignee member-${member.color}`}>{member.initials}</span>
              <span className="workspace-member-copy"><strong>{member.name}</strong><small>{member.email}</small></span>
              <span className="workspace-member-role">{member.role}</span>
              {member.role !== "owner" && member.id !== currentUserId && (
                <button type="button" className="remove-member-button" disabled={removingId === member.id} onClick={() => void removeMember(member)}>
                  {removingId === member.id ? "Removing…" : "Remove"}
                </button>
              )}
            </li>
          ))}
        </ul>
        <div className="modal-actions">
          <button type="button" className="button button-secondary" onClick={onClose}>Done</button>
        </div>
      </section>
    </div>
  );
}
