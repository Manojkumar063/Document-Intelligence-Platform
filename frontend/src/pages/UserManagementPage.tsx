import { useEffect, useState } from "react";
import { listUsers, updateUserRole } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { User, UserRole } from "../types";

export default function UserManagementPage() {
  const { user: currentUser, setUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    listUsers()
      .then((response) => setUsers(response.data))
      .catch((err: any) => setError(err.response?.data?.error?.message || "Could not load users"))
      .finally(() => setLoading(false));
  }, []);

  const changeRole = async (id: string, role: UserRole) => {
    setSavingId(id);
    setError("");
    try {
      const response = await updateUserRole(id, role);
      setUsers((current) => current.map((user) => user.id === id ? response.data : user));
      if (id === currentUser?.id) setUser(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Could not update user role");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <main className="min-h-[calc(100vh-53px)] bg-slate-950 text-white">
      <section className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold">User management</h1>
          <p className="text-slate-400 text-sm mt-1">{users.length} registered user{users.length === 1 ? "" : "s"}</p>
        </div>

        {error && (
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
                        value={managedUser.role}
                        disabled={savingId === managedUser.id}
                        onChange={(event) => changeRole(managedUser.id, event.target.value as UserRole)}
                        className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-sm text-slate-200 disabled:opacity-50"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
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
    </main>
  );
}