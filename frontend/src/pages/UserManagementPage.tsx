import { useEffect, useState } from "react";
import { listUsers, updateUserRole } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { User, UserRole } from "../types";

export default function UserManagementPage() {
  const { user: currentUser, setUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, UserRole>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [pendingRoleChange, setPendingRoleChange] = useState<{ user: User; role: UserRole } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    listUsers()
      .then((response) => setUsers(response.data))
      .catch((err: any) => setError(err.response?.data?.error?.message || "Could not load users"))
      .finally(() => setLoading(false));
  }, []);

  const confirmRoleChange = async () => {
    if (!pendingRoleChange) return;

    const { user: managedUser, role } = pendingRoleChange;
    setSavingId(managedUser.id);
    setError("");
    try {
      const response = await updateUserRole(managedUser.id, role);
      setUsers((current) => current.map((user) => user.id === managedUser.id ? response.data : user));
      setRoleDrafts((current) => {
        const { [managedUser.id]: _savedRole, ...remaining } = current;
        return remaining;
      });
      if (managedUser.id === currentUser?.id) setUser(response.data);
      setPendingRoleChange(null);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Could not update user role");
    } finally {
      setSavingId(null);
    }
  };

  const isSavingRoleChange = pendingRoleChange !== null && savingId === pendingRoleChange.user.id;

  return (
    <main className="min-h-[calc(100vh-53px)] bg-slate-950 text-white">
      <section className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold">User management</h1>
          <p className="text-slate-400 text-sm mt-1">{users.length} registered user{users.length === 1 ? "" : "s"}</p>
        </div>

        {error && !pendingRoleChange && (
          <div role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <p className="py-8 text-center text-sm text-slate-400">Loading users…</p>
        ) : (
          <div className="overflow-x-auto border-y border-slate-700/70">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map((managedUser) => (
                  <tr key={managedUser.id}>
                    <td className="px-4 py-3 font-medium text-slate-200">
                      {managedUser.full_name || "Unnamed user"}
                      {managedUser.id === currentUser?.id && <span className="ml-2 text-xs text-slate-500">You</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{managedUser.email}</td>
                    <td className="px-4 py-3 text-slate-400">{managedUser.is_active ? "Active" : "Inactive"}</td>
                    <td className="px-4 py-3">
                      <select
                        aria-label={`Role for ${managedUser.email}`}
                        value={roleDrafts[managedUser.id] ?? managedUser.role}
                        disabled={savingId === managedUser.id}
                        onChange={(event) => {
                          setRoleDrafts((current) => ({ ...current, [managedUser.id]: event.target.value as UserRole }));
                          setError("");
                        }}
                        className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-sm text-slate-200 disabled:opacity-50"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                      {roleDrafts[managedUser.id] !== undefined && roleDrafts[managedUser.id] !== managedUser.role && (
                        <button
                          type="button"
                          disabled={savingId === managedUser.id}
                          onClick={() => {
                            setError("");
                            setPendingRoleChange({ user: managedUser, role: roleDrafts[managedUser.id] });
                          }}
                          className="ml-2 rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                        >
                          Save
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No users found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {pendingRoleChange && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSavingRoleChange) setPendingRoleChange(null);
          }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="role-change-title" className="w-full max-w-md border border-slate-700 bg-slate-900 p-5 shadow-2xl">
            <h2 id="role-change-title" className="text-base font-semibold">Confirm role change</h2>
            <p className="mt-3 text-sm text-slate-300">
              Change <span className="font-medium text-white">{pendingRoleChange.user.full_name || pendingRoleChange.user.email}</span>
              {" "}from <span className="font-medium text-white">{pendingRoleChange.user.role}</span> to{" "}
              <span className="font-medium text-white">{pendingRoleChange.role}</span>?
            </p>
            {pendingRoleChange.role === "admin" && pendingRoleChange.user.role !== "admin" && (
              <p className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
                This grants administrative access, including the ability to manage users and permissions. Only continue if this is intended.
              </p>
            )}
            {error && (
              <div role="alert" className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={isSavingRoleChange}
                onClick={() => setPendingRoleChange(null)}
                className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingRoleChange}
                onClick={confirmRoleChange}
                className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {isSavingRoleChange ? "Saving…" : "Confirm change"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}