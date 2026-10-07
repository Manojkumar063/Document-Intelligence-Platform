# Teamspace

A small team workspace for projects and tasks, using the existing RAG backend for account authentication and linking to its document-grounded AI chat.

## Run locally

Start the existing RAG backend and its MongoDB/Qdrant services first, then run Teamspace:

```powershell
cd ..\rag-app
docker compose up mongodb qdrant backend

cd ..\team-workspace
npm install
npm run dev
```

Open <http://localhost:3001>. The Knowledge AI link opens the existing RAG frontend at `http://localhost:3000` by default. Set `VITE_RAG_APP_URL` in `.env` if it runs at another URL.

Teamspace login and registration call the same backend `/api/v1/auth` endpoints as RAG Workspace. Use your existing account to sign in. If you use a copied `backend/.env`, allow both frontend origins in `CORS_ORIGINS`, for example:

```dotenv
CORS_ORIGINS=["http://localhost:3000","http://localhost:3001"]
```

The authentication service and user accounts are shared, but browser sessions are separate because each frontend runs on a different origin; sign into each app separately. Project and task data are still a local prototype saved in this browser, scoped per signed-in account. Shared API-backed workspace data and embedded RAG chat are not implemented yet.
