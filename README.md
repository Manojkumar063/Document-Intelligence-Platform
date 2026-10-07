# RAG Application

A production-oriented Retrieval-Augmented Generation application.

## Stack

- **Backend**: Python 3.12, FastAPI, Motor (async MongoDB), LangChain
- **Database**: MongoDB 7
- **Vector search**: Qdrant
- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Infrastructure**: Docker, Docker Compose

## Quick Start

```bash
# 1. Copy and configure environment
cp apps/backend/.env.example apps/backend/.env
# Edit apps/backend/.env — set LLM_API_KEY for AI and embedding features

# 2. Start MongoDB, Qdrant, and the backend
docker compose up mongodb qdrant backend

# 3. If upgrading an existing database, copy stored embeddings into Qdrant once
docker compose exec backend python scripts/reindex_vectors.py

# 4. API docs
open http://localhost:8000/docs
```

## Development (without Docker)

```bash
# Start MongoDB and Qdrant locally (or use Docker)
docker compose up mongodb qdrant -d

cd apps/backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt

uvicorn app.main:app --reload --port 8000
```

## Frontend

The RAG Workspace navigation includes a **Back to Teamspace** link. By default it opens `http://localhost:3001`; set `VITE_WORKSPACE_URL` in `apps/frontend/.env` before starting/building the frontend to use a different Teamspace URL.
Both frontends use the backend's shared HTTP-only sign-in cookie, so signing in to either app also signs you into the other. For local development, access both frontends using `localhost` (not a mix of `localhost` and `127.0.0.1`) and allow both frontend URLs in `CORS_ORIGINS`.

```bash
cd apps/frontend
npm install
npm run dev   # http://localhost:5173
```

## Teamspace workspace UI

With the backend and MongoDB running, start the workspace UI:

```bash
cd apps/workspace-ui
npm install
npm run dev   # http://localhost:3001
```

Projects and tasks created in Teamspace are stored in MongoDB and scoped to the active workspace. Workspace owners can invite teammates with email-bound links from the workspace switcher. See [apps/workspace-ui/README.md](apps/workspace-ui/README.md) for details.

## Running Tests

```bash
cd apps/backend
pytest tests/ -v
```

## Docker (full stack)

```bash
docker compose --profile frontend up
```

## AWS S3 document storage

By default, uploads are stored in the local `uploads/` directory. To use S3:

1. In the AWS Console, create a private S3 bucket in the region you intend to use. Keep **Block all public access** enabled and leave default encryption enabled.
2. Give the backend's IAM role (recommended) or IAM user permission to access only this bucket. The document workflow needs `s3:PutObject`, `s3:GetObject`, and `s3:DeleteObject` on `arn:aws:s3:::<bucket-name>/*`. Do not put AWS root credentials in the application.
3. Set these values in `apps/backend/.env`:

   ```dotenv
   STORAGE_BACKEND=s3
   AWS_REGION=us-east-1
   S3_BUCKET=<your-globally-unique-bucket-name>
   ```

   For local development, configure the AWS CLI profile with `aws configure` (or set `AWS_PROFILE`). In AWS, prefer assigning an IAM role to the backend. If static credentials are unavoidable, set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` together; set `AWS_SESSION_TOKEN` when using temporary credentials.
4. Restart the backend so it loads the new environment variables. For Docker, rebuild the backend image to install the S3 SDK: `docker compose up --build -d backend`. New uploads, versions, processing, restores, downloads, and deletes will use S3. Existing documents stored locally remain at their recorded local paths; switching the setting does not migrate them.

The bucket is private; files are returned through the authenticated backend API and are not exposed as public URLs.

## Research agent

In chat, select **Research agent** under **Answer mode** to make the backend plan up to two focused follow-up searches, retrieve evidence from the same authorized Qdrant scope, deduplicate and rerank passages, then synthesize an answer with inline source-number citations. The normal **Quick answer** mode remains the default. The selected mode is saved with assistant messages so regenerating an answer uses the same mode.

## Project Structure

```
rag-app/
├── backend/
│   ├── app/
│   │   ├── api/routes/      # FastAPI routers
│   │   ├── core/            # Config, security, middleware
│   │   ├── db/              # MongoDB models & repositories
│   │   ├── rag/             # Loaders, chunking, embeddings, retrieval, workflows
│   │   ├── schemas/         # Pydantic request/response models
│   │   └── services/        # Business logic
│   └── tests/
└── frontend/
    └── src/
        ├── api/             # Axios client
        ├── components/      # Navbar, ProtectedRoute
        ├── context/         # AuthContext
        └── pages/           # Login, Register, Documents, Chat
```
