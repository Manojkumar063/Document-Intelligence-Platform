import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { createConversation, sendMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { SourceReference } from "../types";

interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceReference[];
  action?: { label: string; href: string };
}

const QUICK_ANSWERS = [
  {
    prompt: "How do I use the app?",
    answer: "Browse Collections for shared document groups, then choose Chat in collection. You can also start a chat and select a search scope.",
    action: { label: "Browse collections", href: "/collections" },
  },
  {
    prompt: "How do I upload documents?",
    answer: "Admins can upload PDF, DOCX, or TXT files from Documents. Signed-in users can browse shared files, and processing status appears beside each document.",
    action: { label: "Open documents", href: "/documents" },
  },
  {
    prompt: "What is RAG?",
    answer: "Retrieval-augmented generation finds relevant passages in your documents, then uses them to ground an AI response. Chat answers include source citations.",
    action: { label: "Open chat", href: "/chat" },
  },
];

export function AIAssistant() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    { id: "welcome", role: "assistant", content: "Hi! How can I help you?" },
  ]);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    setOpen(false);
    setInput("");
    setConversationId(null);
    setMessages([{ id: "welcome", role: "assistant", content: "Hi! How can I help you?" }]);
  }, [user?.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const askQuestion = async (question: string) => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || sending) return;
    const userMessageId = `user-${Date.now()}`;
    const pendingMessageId = `pending-${Date.now()}`;
    setMessages((current) => [
      ...current,
      { id: userMessageId, role: "user", content: trimmedQuestion },
      { id: pendingMessageId, role: "assistant", content: "Thinking…" },
    ]);
    setInput("");
    setSending(true);
    setError("");
    try {
      let activeConversationId = conversationId;
      if (!activeConversationId) {
        const created = await createConversation("AI Assistant");
        activeConversationId = created.data.id;
        setConversationId(activeConversationId);
      }
      const response = await sendMessage(activeConversationId, trimmedQuestion);
      setMessages((current) => current.map((message) => message.id === pendingMessageId
        ? { ...message, id: response.data.message.id, content: response.data.message.content, sources: response.data.sources }
        : message));
    } catch {
      setMessages((current) => current.map((message) => message.id === pendingMessageId
        ? { ...message, content: "I couldn't get an answer just now. Please try again." }
        : message));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const askQuickQuestion = (item: typeof QUICK_ANSWERS[number]) => {
    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: "user", content: item.prompt },
      { id: `answer-${Date.now()}`, role: "assistant", content: item.answer, action: item.action },
    ]);
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open ? (
        <section role="dialog" aria-label="AI Assistant" className="flex h-[min(540px,calc(100dvh-6rem))] w-[min(360px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900 text-white shadow-2xl">
          <header className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-white">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Zm7 12 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" /></svg>
              </span>
              <h2 className="text-sm font-semibold">AI Assistant</h2>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close assistant" title="Close assistant" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" /></svg>
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] rounded-lg px-3 py-2.5 text-xs leading-relaxed ${message.role === "user" ? "bg-indigo-600 text-white" : "border border-slate-700 bg-slate-800 text-slate-200"}`}>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.action && <Link to={message.action.href} onClick={() => setOpen(false)} className="mt-2 inline-flex text-xs font-medium text-indigo-300 hover:text-indigo-200">{message.action.label} →</Link>}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-2 space-y-1.5 border-t border-slate-700 pt-2">
                      {message.sources.map((source) => (
                        <Link key={source.chunk_id} to={`/documents?document=${encodeURIComponent(source.document_id)}`} onClick={() => setOpen(false)} className="block truncate text-[11px] text-indigo-300 hover:text-indigo-200">
                          {source.filename}{source.page != null ? ` · Page ${source.page}` : ""}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {messages.length === 1 && (
              <div className="space-y-2 pt-2">
                {QUICK_ANSWERS.map((item) => (
                  <button key={item.prompt} type="button" onClick={() => askQuickQuestion(item)} className="block w-full rounded-lg border border-slate-700 px-3 py-2 text-left text-xs text-slate-300 transition-colors hover:border-indigo-500 hover:bg-slate-800 hover:text-white">
                    {item.prompt}
                  </button>
                ))}
              </div>
            )}
            {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
            <div ref={endRef} />
          </div>

          <form onSubmit={(event) => { event.preventDefault(); void askQuestion(input); }} className="flex items-center gap-2 border-t border-slate-700 p-3">
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask something"
              aria-label="Ask the AI Assistant"
              className="h-10 min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
            />
            <button type="submit" disabled={sending || !input.trim()} aria-label="Send message" title="Send message" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-7-7 7 7-7 7" /></svg>
            </button>
          </form>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open AI Assistant"
          title="AI Assistant"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition-transform hover:scale-105 hover:bg-indigo-500"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Zm7 12 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" /></svg>
        </button>
      )}
    </div>
  );
}
