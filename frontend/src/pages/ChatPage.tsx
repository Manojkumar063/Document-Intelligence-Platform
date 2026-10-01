import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  createConversation,
  deleteConversation,
  getConversation,
  listCollections,
  listConversations,
  openDocumentSource,
  rateMessage,
  regenerateMessage,
  renameConversation,
  sendMessage,
} from "../api/client";
import type { Collection, Conversation, Message, SourceReference } from "../types";

function groupHistory(conversations: Conversation[], query: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const groups = new Map<string, Conversation[]>();
  const filtered = conversations.filter((conversation) =>
    conversation.title.toLowerCase().includes(query.trim().toLowerCase())
  );

  for (const conversation of filtered) {
    const updated = new Date(conversation.updated_at || conversation.created_at);
    updated.setHours(0, 0, 0, 0);
    const daysAgo = Math.floor((today.getTime() - updated.getTime()) / 86_400_000);
    const label = daysAgo <= 0 ? "Today" : daysAgo === 1 ? "Yesterday" : daysAgo < 7 ? "Previous 7 days" : "Older";
    groups.set(label, [...(groups.get(label) ?? []), conversation]);
  }

  return [...groups.entries()];
}

function Avatar({ role }: { role: string }) {
  if (role === "user") {
    return (
      <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-7 h-7 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center shrink-0">
      <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <Avatar role="assistant" />
      <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [messageActionError, setMessageActionError] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [ratingMessageId, setRatingMessageId] = useState<string | null>(null);
  const selectionRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let mounted = true;
    listConversations()
      .then((r) => { if (mounted) setConversations(r.data); })
      .catch(() => { if (mounted) setHistoryError("Could not load conversation history"); })
      .finally(() => { if (mounted) setLoadingHistory(false); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    listCollections().then((response) => setCollections(response.data)).catch(() => undefined);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const selectConversation = async (id: string) => {
    const selection = ++selectionRef.current;
    setActiveId(id);
    setMessages([]);
    setOpeningId(id);
    setHistoryError("");
    try {
      const res = await getConversation(id);
      if (selectionRef.current === selection) setMessages(res.data.messages);
    } catch {
      if (selectionRef.current === selection) setHistoryError("Could not open this conversation");
    } finally {
      if (selectionRef.current === selection) setOpeningId(null);
    }
  };

  useEffect(() => {
    const requestedCollection = searchParams.get("collection");
    const requestedConversation = searchParams.get("conversation");
    if (requestedCollection) setSelectedCollectionId(requestedCollection);
    if (requestedConversation && !loadingHistory) void selectConversation(requestedConversation);
    if ((requestedCollection || (requestedConversation && !loadingHistory))) {
      const remainingParams = new URLSearchParams(searchParams);
      if (requestedCollection) remainingParams.delete("collection");
      if (requestedConversation && !loadingHistory) remainingParams.delete("conversation");
      setSearchParams(remainingParams, { replace: true });
    }
  }, [loadingHistory, searchParams, setSearchParams]);

  const newConversation = async () => {
    setCreating(true);
    setHistoryError("");
    try {
      const res = await createConversation("New Chat");
      selectionRef.current += 1;
      setConversations((current) => [res.data, ...current]);
      setActiveId(res.data.id);
      setOpeningId(null);
      setMessages([]);
      setRenameId(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch {
      setHistoryError("Could not start a new chat");
    } finally {
      setCreating(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !activeId || sending) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg]);
    const question = input.trim();
    const conversationId = activeId;
    const selection = selectionRef.current;
    setInput("");
    setSending(true);
    try {
      const res = await sendMessage(conversationId, question, selectedCollectionId || undefined);
      if (selectionRef.current === selection) setMessages((m) => [...m, res.data.message]);
      setConversations((current) => {
        const conversation = current.find((item) => item.id === conversationId);
        if (!conversation) return current;
        const updated = { ...conversation, updated_at: new Date().toISOString() };
        return [updated, ...current.filter((item) => item.id !== conversationId)];
      });
    } catch {
      if (selectionRef.current === selection) {
        setMessages((m) => [
          ...m,
          {
            id: `error-${Date.now()}`,
            role: "assistant",
            content: "Sorry, I couldn't get a response. Please try again.",
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = async (message: Message) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMessageId(message.id);
      window.setTimeout(() => setCopiedMessageId((current) => current === message.id ? null : current), 1600);
    } catch {
      setMessageActionError("Could not copy the answer");
    }
  };

  const handleOpenSource = async (source: SourceReference) => {
    const sourceWindow = window.open("about:blank", "_blank");
    if (!sourceWindow) {
      setMessageActionError("Allow pop-ups to open source documents");
      return;
    }
    try {
      const response = await openDocumentSource(source.document_id);
      const objectUrl = URL.createObjectURL(response.data);
      sourceWindow.location.href = source.page == null ? objectUrl : `${objectUrl}#page=${source.page}`;
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    } catch {
      sourceWindow.close();
      setMessageActionError("Could not open this source document");
    }
  };

  const handleRegenerate = async (message: Message) => {
    if (!activeId || sending) return;
    setRegeneratingId(message.id);
    setSending(true);
    setMessageActionError("");
    try {
      const response = await regenerateMessage(activeId, message.id);
      setMessages((current) => current.map((item) => item.id === message.id ? response.data.message : item));
    } catch (err: any) {
      setMessageActionError(err.response?.data?.error?.message || "Could not regenerate this answer");
    } finally {
      setRegeneratingId(null);
      setSending(false);
    }
  };

  const handleRating = async (message: Message, rating: "up" | "down") => {
    if (!activeId) return;
    setRatingMessageId(message.id);
    setMessageActionError("");
    try {
      const response = await rateMessage(activeId, message.id, rating);
      setMessages((current) => current.map((item) => item.id === message.id ? response.data : item));
    } catch (err: any) {
      setMessageActionError(err.response?.data?.error?.message || "Could not save feedback");
    } finally {
      setRatingMessageId(null);
    }
  };

  const handleDelete = async (conversation: Conversation) => {
    if (!window.confirm(`Delete "${conversation.title}" and its messages?`)) return;
    setDeletingId(conversation.id);
    setHistoryError("");
    try {
      await deleteConversation(conversation.id);
      setConversations((current) => current.filter((item) => item.id !== conversation.id));
      if (activeId === conversation.id) {
        selectionRef.current += 1;
        setActiveId(null);
        setOpeningId(null);
        setMessages([]);
      }
      if (renameId === conversation.id) setRenameId(null);
    } catch {
      setHistoryError("Could not delete this conversation");
    } finally {
      setDeletingId(null);
    }
  };

  const beginRename = (conversation: Conversation) => {
    setHistoryError("");
    setRenameId(conversation.id);
    setRenameTitle(conversation.title);
  };

  const saveRename = async (event: React.FormEvent<HTMLFormElement>, id: string) => {
    event.preventDefault();
    const title = renameTitle.trim();
    if (!title) {
      setHistoryError("A conversation name is required");
      return;
    }
    setRenaming(true);
    setHistoryError("");
    try {
      const res = await renameConversation(id, title);
      setConversations((current) => [res.data, ...current.filter((item) => item.id !== id)]);
      setRenameId(null);
    } catch (err: any) {
      setHistoryError(err.response?.data?.error?.message || "Could not rename this conversation");
    } finally {
      setRenaming(false);
    }
  };

  const activeConv = conversations.find((c) => c.id === activeId);
  const historyGroups = groupHistory(conversations, historyQuery);
  const latestAssistantId = [...messages].reverse().find((message) => message.role === "assistant")?.id;

  return (
    <div className="flex h-[calc(100vh-53px)] bg-slate-950 text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 sm:w-64 bg-slate-900 border-r border-slate-700/60 flex flex-col shrink-0">
        <div className="p-3 border-b border-slate-700/60 space-y-3">
          <button
            onClick={newConversation}
            disabled={creating}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {creating ? "Starting…" : "New Chat"}
          </button>
          <label className="relative block">
            <span className="sr-only">Search conversation history</span>
            <svg className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="11" cy="11" r="7" strokeWidth={2} />
              <path strokeLinecap="round" strokeWidth={2} d="m20 20-4-4" />
            </svg>
            <input
              value={historyQuery}
              onChange={(event) => setHistoryQuery(event.target.value)}
              placeholder="Search history"
              className="w-full rounded-md border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </label>
        </div>

        {historyError && <p role="alert" className="px-3 pt-2 text-xs text-red-400">{historyError}</p>}

        <div className="flex-1 overflow-y-auto py-2 px-2">
          <div className="flex items-center justify-between px-3 py-2">
            <h2 className="text-[10px] font-semibold uppercase text-slate-500">Chat history</h2>
            <span className="font-mono text-[10px] tabular-nums text-slate-600">{conversations.length.toString().padStart(2, "0")}</span>
          </div>
          {loadingHistory ? (
            <p className="text-slate-500 text-xs text-center py-6">Loading history…</p>
          ) : conversations.length === 0 ? (
            <p className="text-slate-600 text-xs text-center py-6">No conversations yet</p>
          ) : historyGroups.length === 0 ? (
            <p className="text-slate-500 text-xs text-center py-6">No matches found</p>
          ) : historyGroups.map(([label, group]) => (
            <section key={label} className="mb-4">
              <h2 className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-600">{label}</h2>
              <ul className="space-y-0.5">
                {group.map((conversation) => (
                  <li key={conversation.id} className={`group flex items-center gap-1 rounded-lg transition-colors ${
                    activeId === conversation.id ? "bg-indigo-600/20 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}>
                    {renameId === conversation.id ? (
                      <form onSubmit={(event) => saveRename(event, conversation.id)} className="flex min-w-0 flex-1 items-center gap-1 px-2 py-1.5">
                        <input
                          autoFocus
                          aria-label="Conversation name"
                          value={renameTitle}
                          onChange={(event) => setRenameTitle(event.target.value)}
                          onKeyDown={(event) => { if (event.key === "Escape") setRenameId(null); }}
                          maxLength={100}
                          className="min-w-0 flex-1 rounded border border-slate-600 bg-slate-950 px-2 py-1 text-xs text-white focus:border-indigo-500 focus:outline-none"
                        />
                        <button type="submit" disabled={renaming || !renameTitle.trim()} title="Save name" aria-label="Save name" className="p-1 text-emerald-400 hover:text-emerald-300 disabled:opacity-40">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m5 12 4 4L19 6" /></svg>
                        </button>
                        <button type="button" onClick={() => setRenameId(null)} title="Cancel rename" aria-label="Cancel rename" className="p-1 text-slate-500 hover:text-white">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" /></svg>
                        </button>
                      </form>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => selectConversation(conversation.id)}
                          className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left"
                          aria-current={activeId === conversation.id ? "page" : undefined}
                        >
                          <svg className="h-3.5 w-3.5 shrink-0 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <span className="truncate text-xs">{conversation.title}</span>
                        </button>
                        <div className="flex shrink-0 items-center sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                          <button type="button" onClick={() => beginRename(conversation)} title="Rename conversation" aria-label={`Rename ${conversation.title}`} className="rounded p-1 text-slate-500 hover:text-white">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m16.862 4.487 1.687-1.687a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19.5 7.125 16.875 4.5" /></svg>
                          </button>
                          <button type="button" onClick={() => handleDelete(conversation)} disabled={deletingId === conversation.id} title="Delete conversation" aria-label={`Delete ${conversation.title}`} className="rounded p-1 text-slate-500 hover:text-red-400 disabled:opacity-40">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 6h18m-2 0-.867 12.142A2 2 0 0 1 16.138 20H7.862a2 2 0 0 1-1.995-1.858L5 6m4 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-6 4v6m4-6v6" /></svg>
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </aside>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat header */}
        {activeConv && (
          <div className="px-6 py-3 border-b border-slate-700/60 bg-slate-900/50 backdrop-blur">
            <p className="text-sm font-medium text-white truncate">{activeConv.title}</p>
            <p className="text-xs text-slate-500">{messages.length} message{messages.length !== 1 ? "s" : ""}{selectedCollectionId && ` · ${collections.find((collection) => collection.id === selectedCollectionId)?.name ?? "Collection"}`}</p>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {messageActionError && <p role="alert" className="mx-auto max-w-3xl text-sm text-red-400">{messageActionError}</p>}
          {openingId === activeId && activeId ? (
            <p className="pt-4 text-center text-sm text-slate-500">Loading conversation…</p>
          ) : !activeId ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-slate-300 font-medium">Start a conversation</p>
              <p className="text-slate-600 text-sm mt-1">Create a new chat or select one from the sidebar</p>
            </div>
          ) : messages.length === 0 && !sending ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <p className="text-slate-500 text-sm">Ask anything about your uploaded documents</p>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div key={msg.id} className={`flex items-end gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <Avatar role={msg.role} />
                  <div className={`max-w-[75%] space-y-1 ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-indigo-600 text-white rounded-br-sm"
                          : "bg-slate-800 border border-slate-700 text-slate-100 rounded-bl-sm"
                      }`}
                    >
                      {msg.content}
                    </div>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="w-full space-y-2">
                        {msg.sources.map((source) => (
                          <article key={source.chunk_id} className="max-w-xl rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="min-w-0 truncate text-xs font-semibold text-slate-200">{source.filename}</p>
                              {source.page != null && <span className="shrink-0 text-[11px] text-slate-500">Page {source.page}</span>}
                            </div>
                            {source.snippet && <blockquote className="mt-2 line-clamp-4 border-l-2 border-indigo-500/70 pl-3 text-xs leading-relaxed text-slate-400">“{source.snippet}”</blockquote>}
                            <button type="button" onClick={() => void handleOpenSource(source)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-300 hover:text-indigo-200">
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14 3h7v7m-1-6L10 14M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>
                              Open Source
                            </button>
                          </article>
                        ))}
                      </div>
                    )}
                    {msg.role === "assistant" && !msg.id.startsWith("error-") && (
                      <div className="flex flex-wrap items-center gap-1 px-1 pt-1">
                        <button type="button" onClick={() => void handleCopy(msg)} title="Copy answer" aria-label="Copy answer" className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-800 hover:text-slate-200">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="8" y="8" width="13" height="13" rx="2" strokeWidth={1.8} /><path strokeLinecap="round" strokeWidth={1.8} d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></svg>
                          {copiedMessageId === msg.id ? "Copied" : "Copy"}
                        </button>
                        {msg.id === latestAssistantId && (
                          <button type="button" onClick={() => void handleRegenerate(msg)} disabled={sending} title="Regenerate answer" className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-50">
                            <svg className={`h-3.5 w-3.5 ${regeneratingId === msg.id ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7v5h-5M4 17v-5h5m10-1a7 7 0 0 0-12.9-3M5 13a7 7 0 0 0 12.9 3" /></svg>
                            Regenerate
                          </button>
                        )}
                        <button type="button" onClick={() => void handleRating(msg, "up")} disabled={ratingMessageId === msg.id} title="Helpful answer" aria-label="Helpful answer" aria-pressed={msg.feedback === "up"} className={`rounded p-1.5 hover:bg-slate-800 disabled:opacity-50 ${msg.feedback === "up" ? "text-emerald-400" : "text-slate-500 hover:text-slate-200"}`}>
                          <svg className="h-4 w-4" fill={msg.feedback === "up" ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 10v12m0-12 4-8c1.5 0 2.5 1 2 3l-1 5h6a2 2 0 0 1 2 2l-2 8a2 2 0 0 1-2 2H7m0-12H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3" /></svg>
                        </button>
                        <button type="button" onClick={() => void handleRating(msg, "down")} disabled={ratingMessageId === msg.id} title="Not helpful" aria-label="Not helpful" aria-pressed={msg.feedback === "down"} className={`rounded p-1.5 hover:bg-slate-800 disabled:opacity-50 ${msg.feedback === "down" ? "text-red-400" : "text-slate-500 hover:text-slate-200"}`}>
                          <svg className="h-4 w-4 rotate-180" fill={msg.feedback === "down" ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 10v12m0-12 4-8c1.5 0 2.5 1 2 3l-1 5h6a2 2 0 0 1 2 2l-2 8a2 2 0 0 1-2 2H7m0-12H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3" /></svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {sending && <TypingIndicator />}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Input */}
        {activeId && (
          <div className="px-6 py-4 border-t border-slate-700/60 bg-slate-900/50 backdrop-blur">
            <label className="mb-2 flex items-center gap-2 text-xs text-slate-500">
              Search scope
              <select
                value={selectedCollectionId}
                onChange={(event) => setSelectedCollectionId(event.target.value)}
                className="max-w-[240px] rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200"
              >
                <option value="">All available documents</option>
                {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
              </select>
            </label>
            <div className="flex items-end gap-3 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus-within:border-indigo-500 transition-colors">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about your documents…"
                rows={1}
                className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 resize-none focus:outline-none max-h-32"
                style={{ lineHeight: "1.5" }}
              />
              <button
                onClick={handleSend}
                disabled={sending || !input.trim()}
                className="shrink-0 w-8 h-8 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <p className="text-slate-600 text-xs mt-2 text-center">Enter to send · Shift+Enter for new line</p>
          </div>
        )}
      </div>
    </div>
  );
}
