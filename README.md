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
cp backend/.env.example backend/.env
# Edit backend/.env — set LLM_API_KEY at minimum

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

cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt

uvicorn app.main:app --reload
```

## Frontend

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173
```

## Running Tests

```bash
cd backend
pytest tests/ -v
```

## Docker (full stack)

```bash
docker compose --profile frontend up
```

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
