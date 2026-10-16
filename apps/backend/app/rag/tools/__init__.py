"""Tool definitions and executor for OpenAI function calling."""
import json
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.rag.retrieval import retrieve

# ── OpenAI tool schemas ────────────────────────────────────────────────────────

TOOL_SCHEMAS: list[dict] = [
    {
        "type": "function",
        "function": {
            "name": "search_documents",
            "description": (
                "Search the user's document collection using semantic similarity. "
                "Use this when the question requires information from uploaded documents."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "The search query"},
                    "top_k": {"type": "integer", "description": "Number of results (1-10)", "default": 5},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_collection_info",
            "description": "Get metadata about a document collection: name, description, and document count.",
            "parameters": {
                "type": "object",
                "properties": {
                    "collection_id": {"type": "string", "description": "The collection ID to look up"},
                },
                "required": ["collection_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_workspace_tasks",
            "description": (
                "List the user's workspace tasks. Optionally filter by status. "
                "Use this when the user asks about their tasks, todos, or work items."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "enum": ["all", "done", "pending"],
                        "description": "Filter tasks by completion status",
                        "default": "all",
                    },
                },
                "required": [],
            },
        },
    },
]


# ── Tool executor ──────────────────────────────────────────────────────────────

async def execute_tool(
    name: str,
    args: dict[str, Any],
    db: AsyncIOMotorDatabase,
    user_id: str,
    collection_id: str | None,
) -> str:
    if name == "search_documents":
        return await _search_documents(args, db, user_id, collection_id)
    if name == "get_collection_info":
        return await _get_collection_info(args, db)
    if name == "get_workspace_tasks":
        return await _get_workspace_tasks(args, db, user_id)
    return f"Unknown tool: {name}"


async def _search_documents(
    args: dict[str, Any],
    db: AsyncIOMotorDatabase,
    user_id: str,
    collection_id: str | None,
) -> str:
    query = args["query"]
    top_k = min(int(args.get("top_k", 5)), 10)
    try:
        chunks = await retrieve(query, db, user_id, top_k=top_k, collection_id=collection_id)
    except Exception as exc:
        return f"Search failed: {exc}"
    if not chunks:
        return "No relevant documents found."
    results = [
        {
            "filename": c.metadata.get("filename", "unknown"),
            "page": c.page_number,
            "similarity": round(c.similarity, 3),
            "snippet": c.content[:400],
        }
        for c in chunks
    ]
    return json.dumps(results, ensure_ascii=False)


async def _get_collection_info(args: dict[str, Any], db: AsyncIOMotorDatabase) -> str:
    collection_id = args["collection_id"]
    col = await db["collections"].find_one({"_id": collection_id})
    if not col:
        return f"Collection '{collection_id}' not found."
    doc_count = await db["documents"].count_documents({"collection_id": collection_id})
    return json.dumps(
        {"id": col["_id"], "name": col["name"], "description": col.get("description", ""), "document_count": doc_count},
        ensure_ascii=False,
    )


async def _get_workspace_tasks(
    args: dict[str, Any], db: AsyncIOMotorDatabase, user_id: str
) -> str:
    status_filter = args.get("status", "all")
    user = await db["users"].find_one({"_id": user_id})
    workspace_id = user.get("active_workspace_id") if user else None
    if not workspace_id:
        return "No active workspace found."
    query: dict[str, Any] = {"workspace_id": workspace_id}
    if status_filter == "done":
        query["done"] = True
    elif status_filter == "pending":
        query["done"] = False
    cursor = db["workspace_tasks"].find(query).sort("created_at", -1).limit(20)
    tasks = [
        {
            "id": t["_id"],
            "title": t["title"],
            "done": t.get("done", False),
            "due_date": t["due_date"].isoformat() if t.get("due_date") else None,
            "project_id": t.get("project_id"),
        }
        async for t in cursor
    ]
    if not tasks:
        return "No tasks found."
    return json.dumps(tasks, ensure_ascii=False)
