import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  assignDocumentToCollection,
  createCollection,
  deleteCollection,
  getCollection,
  listCollectionDocuments,
  listCollections,
  listDocuments,
  updateCollection,
} from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { Collection, CollectionDetail, Document } from "../types";

export default function CollectionsPage() {
  const { collectionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collection, setCollection] = useState<CollectionDetail | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [availableDocuments, setAvailableDocuments] = useState<Document[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshCollection = async (id: string) => {
    const [collectionResponse, documentResponse] = await Promise.all([
      getCollection(id),
      listCollectionDocuments(id),
    ]);
    setCollection(collectionResponse.data);
    setDocuments(documentResponse.data);
    if (isAdmin) {
      const allDocuments = await listDocuments();
      setAvailableDocuments(allDocuments.data.filter((document) => document.collection_id !== id));
    }
  };

  useEffect(() => {
    setLoading(true);
    setError("");
    if (collectionId) {
      refreshCollection(collectionId)
        .catch(() => setError("Could not load this collection"))
        .finally(() => setLoading(false));
    } else {
      listCollections()
        .then((response) => setCollections(response.data))
        .catch(() => setError("Could not load collections"))
        .finally(() => setLoading(false));
    }
  }, [collectionId, isAdmin]);

  useEffect(() => {
    if (!collection) return;
    setName(collection.name);
    setDescription(collection.description);
  }, [collection]);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    try {
      const response = await createCollection(name.trim(), description.trim());
      setCollections((current) => [...current, response.data].sort((a, b) => a.name.localeCompare(b.name)));
      setName("");
      setDescription("");
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Could not create collection");
    }
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!collectionId) return;
    setError("");
    try {
      const response = await updateCollection(collectionId, name.trim(), description.trim());
      setCollection(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Could not update collection");
    }
  };

  const handleDelete = async (item: Collection | CollectionDetail) => {
    if (!window.confirm(`Delete the collection "${item.name}"? Documents will remain in the library.`)) return;
    try {
      await deleteCollection(item.id);
      navigate("/collections", { replace: true });
      setCollections((current) => current.filter((entry) => entry.id !== item.id));
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Could not delete collection");
    }
  };

  const handleAssignment = async (documentId: string, targetCollectionId: string | null) => {
    if (!collectionId) return;
    setError("");
    try {
      await assignDocumentToCollection(documentId, targetCollectionId);
      await refreshCollection(collectionId);
      const response = await listCollections();
      setCollections(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Could not update collection documents");
    }
  };

  const formatSize = (bytes: number) => bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(0)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  return (
    <main className="min-h-[calc(100vh-53px)] bg-slate-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-8">
        {collectionId ? (
          <>
            <Link to="/collections" className="text-sm text-slate-400 hover:text-white">← Collections</Link>
            <header className="mb-6 mt-4 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase text-indigo-400">Collection</p>
                <h1 className="mt-1 text-2xl font-bold">{collection?.name ?? "Loading…"}</h1>
                {collection?.description && <p className="mt-1 text-sm text-slate-400">{collection.description}</p>}
              </div>
              {collection && <Link to={`/chat?collection=${encodeURIComponent(collection.id)}`} className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500">Chat in collection</Link>}
            </header>

            {isAdmin && collection && (
              <div className="mb-8 flex flex-wrap items-center gap-3 border-y border-slate-700/70 py-4">
                <form onSubmit={handleSave} className="flex min-w-0 flex-1 flex-wrap gap-2">
                  <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required aria-label="Collection name" className="min-w-[180px] flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" />
                  <input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={300} aria-label="Collection description" placeholder="Description" className="min-w-[180px] flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500" />
                  <button type="submit" className="rounded-md border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:border-indigo-500">Save</button>
                </form>
                <button type="button" onClick={() => collection && handleDelete(collection)} className="rounded-md px-3 py-2 text-sm text-red-300 hover:bg-red-500/10">Delete collection</button>
              </div>
            )}

            {isAdmin && availableDocuments.length > 0 && (
              <label className="mb-4 flex flex-wrap items-center gap-3 text-sm text-slate-400">
                Add document
                <select defaultValue="" onChange={(event) => { if (event.target.value) void handleAssignment(event.target.value, collectionId); event.target.value = ""; }} className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white">
                  <option value="">Choose a document</option>
                  {availableDocuments.map((document) => <option key={document.id} value={document.id}>{document.original_name}</option>)}
                </select>
              </label>
            )}

            {error && <p role="alert" className="mb-4 text-sm text-red-400">{error}</p>}
            {loading ? <p className="py-12 text-center text-sm text-slate-500">Loading documents…</p> : documents.length === 0 ? (
              <p className="border-y border-slate-700/70 py-12 text-center text-sm text-slate-500">No documents in this collection yet.</p>
            ) : (
              <ul className="divide-y divide-slate-800 border-y border-slate-700/70">
                {documents.map((document) => (
                  <li key={document.id} className="flex items-center gap-4 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-200">{document.original_name}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatSize(document.file_size)} · {document.status} · {document.chunk_count} chunks</p>
                    </div>
                    {isAdmin && <button type="button" onClick={() => void handleAssignment(document.id, null)} className="shrink-0 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-800 hover:text-white">Remove</button>}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <>
            <header className="mb-7">
              <p className="text-xs font-semibold uppercase text-indigo-400">Knowledge library</p>
              <h1 className="mt-1 text-2xl font-bold">Collections</h1>
              <p className="mt-1 text-sm text-slate-400">{collections.length} collection{collections.length === 1 ? "" : "s"}</p>
            </header>

            {isAdmin && (
              <form onSubmit={handleCreate} className="mb-8 flex flex-wrap gap-2 border-y border-slate-700/70 py-4">
                <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required placeholder="Collection name" aria-label="Collection name" className="min-w-[200px] flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500" />
                <input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={300} placeholder="Description (optional)" aria-label="Collection description" className="min-w-[200px] flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500" />
                <button type="submit" className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"><span aria-hidden="true">+</span> New Collection</button>
              </form>
            )}

            {error && <p role="alert" className="mb-4 text-sm text-red-400">{error}</p>}
            {loading ? <p className="py-12 text-center text-sm text-slate-500">Loading collections…</p> : collections.length === 0 ? (
              <p className="border-y border-slate-700/70 py-12 text-center text-sm text-slate-500">No collections available.</p>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {collections.map((item) => (
                  <li key={item.id} className="border border-slate-700 bg-slate-900/60 p-4">
                    <div className="mb-5 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-base font-semibold text-slate-100">{item.name}</h2>
                        {item.description && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.description}</p>}
                      </div>
                      <span className="shrink-0 rounded bg-slate-800 px-2 py-1 text-xs tabular-nums text-slate-400">{item.document_count} docs</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <Link to={`/collections/${encodeURIComponent(item.id)}`} className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500">Open</Link>
                      {isAdmin && <button type="button" onClick={() => void handleDelete(item)} title={`Delete ${item.name}`} aria-label={`Delete ${item.name}`} className="rounded p-1.5 text-slate-500 hover:bg-slate-800 hover:text-red-400"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 6h18m-2 0-.867 12.142A2 2 0 0 1 16.138 20H7.862a2 2 0 0 1-1.995-1.858L5 6m4 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-6 4v6m4-6v6" /></svg></button>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </main>
  );
}
