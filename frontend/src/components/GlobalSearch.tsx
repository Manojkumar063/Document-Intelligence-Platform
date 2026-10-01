import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listCollections, listConversations, listDocuments } from "../api/client";
import type { Collection, Conversation, Document } from "../types";

interface SearchResult {
  id: string;
  title: string;
  category: "Document" | "Conversation" | "Collection";
  destination: string;
}

export function GlobalSearch() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    let mounted = true;
    setLoading(true);
    setError("");
    Promise.all([listDocuments(), listConversations(), listCollections()])
      .then(([documentResponse, conversationResponse, collectionResponse]) => {
        if (!mounted) return;
        setDocuments(documentResponse.data);
        setConversations(conversationResponse.data);
        setCollections(collectionResponse.data);
      })
      .catch(() => { if (mounted) setError("Search is temporarily unavailable"); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [open]);

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return [];
    const documentResults: SearchResult[] = documents
      .filter((document) => document.original_name.toLowerCase().includes(normalizedQuery))
      .map((document) => ({
        id: document.id,
        title: document.original_name,
        category: "Document",
        destination: `/documents?document=${encodeURIComponent(document.id)}`,
      }));
    const conversationResults: SearchResult[] = conversations
      .filter((conversation) => conversation.title.toLowerCase().includes(normalizedQuery))
      .map((conversation) => ({
        id: conversation.id,
        title: conversation.title,
        category: "Conversation",
        destination: `/chat?conversation=${encodeURIComponent(conversation.id)}`,
      }));
    const collectionResults: SearchResult[] = collections
      .filter((collection) => collection.name.toLowerCase().includes(normalizedQuery))
      .map((collection) => ({
        id: collection.id,
        title: collection.name,
        category: "Collection",
        destination: `/collections/${encodeURIComponent(collection.id)}`,
      }));
    return [...collectionResults, ...documentResults, ...conversationResults].slice(0, 12);
  }, [query, documents, conversations, collections]);

  const openResult = (result: SearchResult) => {
    setOpen(false);
    setQuery("");
    navigate(result.destination);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search"
        className="inline-flex h-8 items-center gap-2 rounded-md px-2 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <circle cx="11" cy="11" r="7" strokeWidth={2} />
          <path strokeLinecap="round" strokeWidth={2} d="m20 20-4-4" />
        </svg>
        <span className="hidden text-xs sm:block">Search</span>
        <kbd className="hidden rounded border border-slate-700 px-1 py-0.5 text-[10px] text-slate-500 lg:block">Ctrl K</kbd>
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-950/70 px-4 pt-[12vh]"
          role="presentation"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
        >
          <section role="dialog" aria-modal="true" aria-label="Global search" className="w-full max-w-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-slate-700 px-4">
              <svg className="h-5 w-5 shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="11" cy="11" r="7" strokeWidth={2} />
                <path strokeLinecap="round" strokeWidth={2} d="m20 20-4-4" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search documents and chats"
                aria-label="Search documents and chats"
                className="h-14 min-w-0 flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
              />
              <button type="button" onClick={() => setOpen(false)} className="rounded border border-slate-700 px-1.5 py-1 text-[10px] text-slate-500 hover:text-white" title="Close search">ESC</button>
            </div>
            <div className="max-h-[55vh] overflow-y-auto p-2">
              {loading ? (
                <p className="px-3 py-8 text-center text-sm text-slate-500">Loading results…</p>
              ) : error ? (
                <p role="alert" className="px-3 py-8 text-center text-sm text-red-400">{error}</p>
              ) : !query.trim() ? (
                <p className="px-3 py-8 text-center text-sm text-slate-500">Start typing to search.</p>
              ) : results.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-slate-500">No matching documents or conversations.</p>
              ) : (
                <ul>
                  {results.map((result) => (
                    <li key={`${result.category}-${result.id}`}>
                      <button type="button" onClick={() => openResult(result)} className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left hover:bg-slate-800">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-slate-800 text-indigo-300">
                          {result.category === "Document" ? (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm7 0v5h5M9 13h6m-6 4h6" /></svg>
                          ) : result.category === "Collection" ? (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></svg>
                          ) : (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.4-4 8-9 8a10 10 0 0 1-4-.9L3 20l1.4-3.7A7 7 0 0 1 3 12c0-4.4 4-8 9-8s9 3.6 9 8Z" /></svg>
                          )}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm text-slate-200">{result.title}</span>
                        <span className="shrink-0 text-[10px] uppercase text-slate-500">{result.category}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}