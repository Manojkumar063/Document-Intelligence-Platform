# Teamspace

A workspace UI for managing projects and tasks, using the RAG backend for account authentication and linking to its document-grounded AI chat.

## Run locally

Start MongoDB, Qdrant, and the backend locally first. See the repository README for backend setup. Then, from the repository root:

```powershell
cd apps\workspace-ui
npm ci
npm run dev
```

Open <http://localhost:3001>. The Knowledge AI link opens the RAG frontend at `http://localhost:3000` by default. Set `VITE_RAG_APP_URL` in `.env` if it runs at another URL. The RAG Workspace navigation links back here at `http://localhost:3001` by default; set `VITE_WORKSPACE_URL` in `apps/frontend/.env` if Teamspace runs elsewhere.

Teamspace login and registration call the same backend `/api/v1/auth` endpoints as RAG Workspace. In local development, Vite proxies `/api` to the backend at `http://localhost:8000`; the Docker Nginx configuration does the same. Set `VITE_API_URL` in `.env` only if your backend uses a different URL. Both apps share the backend's HTTP-only sign-in cookie, so a login in either app works in the other. Use `localhost` consistently for both frontends. If you use the RAG frontend, include its origin in the backend `CORS_ORIGINS`, for example:

```dotenv
CORS_ORIGINS=["http://localhost:3000"]
```

The authentication service and user accounts are shared across both frontends. Each account gets a workspace on first visit; owners can invite teammates by email from the workspace switcher. The generated invitation link is valid for seven days, can only be accepted by an account with the invited email, and can be used once. Share the link with the invitee; invitation email delivery is not configured. Members can switch between their workspaces, see the member roster, and share projects and tasks. Owners can remove members. Projects and tasks are scoped to the active workspace, and deleting a project also deletes its tasks.
