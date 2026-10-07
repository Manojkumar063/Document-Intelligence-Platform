import { useEffect, useRef, useState } from "react";
import {
  deleteDocument,
  getDocumentVersions,
  listDocuments,
  restoreDocumentVersion,
  retryDocument,
  updateDocumentAccess,
  uploadDocument,
  uploadDocumentVersion,
} from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useSearchParams } from "react-router-dom";
import type { Document, DocumentVersion } from "../types";

const STATUS_LABELS: Record<Document["status"], string> = {
  uploaded: "Uploaded",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};

const STATUS_STYLES: Record<Document["status"], string> = {
  uploaded:   "bg-slate-700 text-slate-300",
  processing: "bg-blue-500/20 text-blue-400",
  completed:  "bg-emerald-500/20 text-emerald-400",
  failed:     "bg-red-500/20 text-red-400",
};

const STATUS_DOT: Record<Document["status"], string> = {
  uploaded:   "bg-slate-400",
  processing: "bg-blue-400 animate-pulse",
  completed:  "bg-emerald-400",
  failed:     "bg-red-400",
};

function FileIcon({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase();
  const colors: Record<string, string> = { pdf: "text-red-400", docx: "text-blue-400", txt: "text-slate-400" };
  const color = colors[ext ?? ""] ?? "text-slate-400";
  return (
    <div className={`w-9 h-9 rounded-lg bg-slate-700 flex items-center justify-center shrink-0 ${color}`}>
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    </div>
  );
}

export default function DocumentsPage() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [docs, setDocs] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadFileName, setUploadFileName] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [versionTargetId, setVersionTargetId] = useState<string | null>(null);
  const [versionsDocument, setVersionsDocument] = useState<Document | null>(null);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const versionFileRef = useRef<HTMLInputElement>(null);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const res = await listDocuments();
      setDocs(res.data);
    } catch {
      setError("Could not load documents");
    } finally {
      setLoadingDocuments(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const documentId = searchParams.get("document");
    if (!documentId || loadingDocuments) return;
    document.getElementById(`document-${documentId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [docs, loadingDocuments, searchParams]);

  const hasActiveProcessing = docs.some((doc) => doc.status === "uploaded" || doc.status === "processing");
  useEffect(() => {
    if (!hasActiveProcessing) return;
    const interval = window.setInterval(() => {
      listDocuments().then((res) => setDocs(res.data)).catch(() => setError("Could not refresh document status"));
    }, 2000);
    return () => window.clearInterval(interval);
  }, [hasActiveProcessing]);

  const handleFile = async (file: File) => {
    setUploading(true);
    setUploadFileName(file.name);
    setUploadProgress(0);
    setError("");
    try {
      const response = await uploadDocument(file, setUploadProgress);
      setUploadProgress(100);
      setDocs((current) => [response.data.document, ...current]);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Upload failed");
    } finally {
      setUploading(false);
      setUploadFileName("");
      setUploadProgress(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleDelete = async (id: string) => {
    await deleteDocument(id);
    setDocs((d) => d.filter((doc) => doc.id !== id));
  };

  const handleRetry = async (id: string) => {
    setRetryingId(id);
    setError("");
    try {
      const response = await retryDocument(id);
      setDocs((current) => current.map((doc) => doc.id === id ? response.data : doc));
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Could not retry document processing");
    } finally {
      setRetryingId(null);
    }
  };

  const handleSharingChange = async (doc: Document, is_shared: boolean) => {
    setSharingId(doc.id);
    setError("");
    try {
      const response = await updateDocumentAccess(doc.id, is_shared);
      setDocs((current) => current.map((item) => item.id === doc.id ? response.data : item));
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Could not update document access");
    } finally {
      setSharingId(null);
    }
  };

  const showVersions = async (doc: Document) => {
    setVersionsDocument(doc);
    setVersionsLoading(true);
    setError("");
    try {
      const response = await getDocumentVersions(doc.id);
      setVersions(response.data);
    } catch {
      setError("Could not load document versions");
    } finally {
      setVersionsLoading(false);
    }
  };

  const handleVersionUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const documentId = versionTargetId;
    if (!file || !documentId) return;
    setUploading(true);
    setUploadFileName(file.name);
    setUploadProgress(0);
    setError("");
    try {
      const response = await uploadDocumentVersion(documentId, file, setUploadProgress);
      setDocs((current) => current.map((doc) => doc.id === documentId ? response.data : doc));
      await load();
      const updatedDocument = response.data;
      await showVersions(updatedDocument);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Could not upload a new version");
    } finally {
      setUploading(false);
      setVersionTargetId(null);
      setUploadFileName("");
      setUploadProgress(null);
      if (versionFileRef.current) versionFileRef.current.value = "";
    }
  };

  const handleRestoreVersion = async (version: number) => {
    if (!versionsDocument) return;
    setError("");
    try {
      const response = await restoreDocumentVersion(versionsDocument.id, version);
      setDocs((current) => current.map((doc) => doc.id === versionsDocument.id ? response.data : doc));
      setVersionsDocument(null);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Could not restore this version");
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-[calc(100vh-53px)] bg-slate-950 text-white">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">Documents</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              {docs.length} file{docs.length !== 1 ? "s" : ""}
              {hasActiveProcessing && <span className="text-blue-400"> · Processing in progress</span>}
            </p>
          </div>
          {isAdmin && <label
            className={`cursor-pointer flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              uploading
                ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-500 text-white"
            }`}
          >
            {uploading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Uploading…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload File
              </>
            )}
            <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>}
          {isAdmin && <input ref={versionFileRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={handleVersionUpload} />}
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg mb-4">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {uploading && (
          <div role="status" className="mb-4 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3">
            <div className="mb-2 flex items-center justify-between gap-3 text-xs">
              <span className="min-w-0 truncate text-slate-300">Uploading {uploadFileName}</span>
              <span className="shrink-0 text-slate-400">{uploadProgress == null ? "Sending…" : `${uploadProgress}%`}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-700">
              <div
                className="h-full rounded-full bg-indigo-500 transition-[width] duration-200"
                style={{ width: `${uploadProgress ?? 6}%` }}
              />
            </div>
          </div>
        )}

        {/* Drop zone (empty state) */}
        {loadingDocuments ? (
          <p className="py-12 text-center text-sm text-slate-500">Loading documents…</p>
        ) : docs.length === 0 && !uploading ? (
          <div
            onDragOver={(e) => { if (isAdmin) { e.preventDefault(); setDragOver(true); } }}
            onDragLeave={() => setDragOver(false)}
            onDrop={isAdmin ? handleDrop : undefined}
            onClick={() => isAdmin && fileRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors ${isAdmin ? "cursor-pointer" : ""} ${
              dragOver ? "border-indigo-500 bg-indigo-500/5" : "border-slate-700"
            }`}
          >
            <svg className="w-10 h-10 text-slate-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-slate-400 text-sm font-medium">{isAdmin ? "Drop a file here or click to upload" : "No shared documents yet"}</p>
            {isAdmin && <p className="text-slate-600 text-xs mt-1">PDF, DOCX, TXT — up to 50 MB</p>}
          </div>
        ) : (
          <ul className="space-y-2">
            {docs.map((doc) => (
              <li id={`document-${doc.id}`} key={doc.id} className="bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3.5 flex items-center gap-3 hover:bg-slate-800 transition-colors">
                <FileIcon name={doc.original_name} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{doc.original_name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatSize(doc.file_size)}
                    {doc.chunk_count != null && doc.chunk_count > 0 && ` · ${doc.chunk_count} chunks`}
                  </p>
                  {doc.error_message && <p className="text-xs text-red-400 mt-0.5">{doc.error_message}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {isAdmin && (
                    <label className="flex items-center gap-1.5 text-xs text-slate-500" title="Allow signed-in users to find this document in chat">
                      <input
                        type="checkbox"
                        checked={doc.is_shared}
                        disabled={sharingId === doc.id}
                        onChange={(event) => handleSharingChange(doc, event.target.checked)}
                        aria-label={`Share ${doc.original_name} with users`}
                        className="accent-indigo-500"
                      />
                      Shared
                    </label>
                  )}
                  {isAdmin && (
                    <button type="button" onClick={() => showVersions(doc)} className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:border-slate-500 hover:text-white" title={`Version ${doc.version} history`}>
                      v{doc.version}
                    </button>
                  )}
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[doc.status]}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[doc.status]}`} />
                    {STATUS_LABELS[doc.status]}
                  </span>
                  {isAdmin && doc.status === "failed" && (
                    <button
                      onClick={() => handleRetry(doc.id)}
                      disabled={retryingId === doc.id}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-300 transition-colors hover:border-indigo-500 hover:text-white disabled:opacity-50"
                      title="Retry document processing"
                    >
                      <svg className={`h-3.5 w-3.5 ${retryingId === doc.id ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7v5h-5M4 17v-5h5m10-1a7 7 0 0 0-12.9-3M5 13a7 7 0 0 0 12.9 3" />
                      </svg>
                      {retryingId === doc.id ? "Retrying" : "Retry"}
                    </button>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button type="button" onClick={() => { setVersionTargetId(doc.id); versionFileRef.current?.click(); }} className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:border-indigo-500 hover:text-white" title="Upload a new version">New version</button>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="text-slate-600 hover:text-red-400 transition-colors p-1 rounded"
                      title="Delete"
                      aria-label={`Delete ${doc.original_name}`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 01-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      {versionsDocument && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setVersionsDocument(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="versions-title" className="w-full max-w-lg border border-slate-700 bg-slate-900 shadow-2xl">
            <header className="flex items-start justify-between border-b border-slate-700 px-5 py-4">
              <div className="min-w-0">
                <h2 id="versions-title" className="text-base font-semibold">Document versions</h2>
                <p className="mt-1 truncate text-xs text-slate-500">{versionsDocument.original_name}</p>
              </div>
              <button type="button" onClick={() => setVersionsDocument(null)} title="Close version history" aria-label="Close version history" className="rounded p-1 text-slate-400 hover:text-white">×</button>
            </header>
            {versionsLoading ? <p className="px-5 py-8 text-sm text-slate-400">Loading versions…</p> : (
              <ul className="max-h-96 divide-y divide-slate-800 overflow-y-auto px-5">
                {versions.map((version) => (
                  <li key={version.version} className="flex items-center justify-between gap-4 py-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200">Version {version.version}{version.is_current ? " · Current" : ""}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{version.original_name} · {formatSize(version.file_size)}</p>
                      <p className="mt-1 text-xs text-slate-600">{new Date(version.created_at).toLocaleString()}</p>
                    </div>
                    {!version.is_current && (
                      <button type="button" onClick={() => handleRestoreVersion(version.version)} className="shrink-0 rounded-md border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:border-indigo-500 hover:text-white">Restore</button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
