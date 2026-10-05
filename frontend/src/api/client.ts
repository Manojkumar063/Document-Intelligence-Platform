import axios from "axios";
import type { AdminStats, AgentMode, AppNotification, Collection, CollectionDetail, Conversation, Document, DocumentVersion, Message, NotificationList, SourceReference, User, UserRole } from "../types";

const api = axios.create({ baseURL: "http://localhost:8000/api/v1" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth
export const register = (email: string, password: string, full_name: string) =>
  api.post<{ access_token: string; token_type: string }>("/auth/register", { email, password, full_name });

export const login = (email: string, password: string) =>
  api.post<{ access_token: string; token_type: string }>("/auth/login", { email, password });

// Users
export const getMe = () => api.get<User>("/users/me");
export const updateMe = (full_name: string) => api.patch<User>("/users/me", { full_name });
export const listUsers = () => api.get<User[]>("/users");
export const updateUserRole = (id: string, role: UserRole) =>
  api.patch<User>(`/users/${encodeURIComponent(id)}/role`, { role });
export const getAdminStats = () => api.get<AdminStats>("/admin/stats");
export const getNotifications = () => api.get<NotificationList>("/notifications");
export const markNotificationRead = (id: string) =>
  api.patch<AppNotification>(`/notifications/${encodeURIComponent(id)}/read`);

// Documents
export const uploadDocument = (file: File, onProgress?: (percentage: number) => void) => {
  const form = new FormData();
  form.append("file", file);
  return api.post<{ document: Document }>("/documents", form, {
    onUploadProgress: (event) => {
      if (event.total) onProgress?.(Math.round((event.loaded / event.total) * 100));
    },
  });
};

export const listDocuments = () => api.get<Document[]>("/documents");
export const updateDocumentAccess = (id: string, is_shared: boolean) =>
  api.patch<Document>(`/documents/${encodeURIComponent(id)}/access`, { is_shared });
export const getDocumentVersions = (id: string) =>
  api.get<DocumentVersion[]>(`/documents/${encodeURIComponent(id)}/versions`);
export const uploadDocumentVersion = (id: string, file: File, onProgress?: (percentage: number) => void) => {
  const form = new FormData();
  form.append("file", file);
  return api.post<Document>(`/documents/${encodeURIComponent(id)}/versions`, form, {
    onUploadProgress: (event) => {
      if (event.total) onProgress?.(Math.round((event.loaded / event.total) * 100));
    },
  });
};
export const restoreDocumentVersion = (id: string, version: number) =>
  api.post<Document>(`/documents/${encodeURIComponent(id)}/versions/${version}/restore`);
export const retryDocument = (id: string) => api.post<Document>(`/documents/${encodeURIComponent(id)}/retry`);
export const deleteDocument = (id: string) => api.delete(`/documents/${id}`);
export const assignDocumentToCollection = (documentId: string, collectionId: string | null) =>
  api.patch<Document>(`/collections/documents/${encodeURIComponent(documentId)}/collection`, { collection_id: collectionId });

// Collections
export const listCollections = () => api.get<Collection[]>("/collections");
export const createCollection = (name: string, description: string) =>
  api.post<Collection>("/collections", { name, description });
export const getCollection = (id: string) =>
  api.get<CollectionDetail>(`/collections/${encodeURIComponent(id)}`);
export const updateCollection = (id: string, name: string, description: string) =>
  api.patch<Collection>(`/collections/${encodeURIComponent(id)}`, { name, description });
export const deleteCollection = (id: string) => api.delete(`/collections/${encodeURIComponent(id)}`);
export const listCollectionDocuments = (id: string) =>
  api.get<Document[]>(`/collections/${encodeURIComponent(id)}/documents`);

// Conversations
export const createConversation = (title: string) =>
  api.post<Conversation>("/conversations", { title });

export const listConversations = () => api.get<Conversation[]>("/conversations");

export const getConversation = (id: string) =>
  api.get<Conversation>(`/conversations/${id}`);

export const renameConversation = (id: string, title: string) =>
  api.patch<Conversation>(`/conversations/${encodeURIComponent(id)}`, { title });

export const sendMessage = (conv_id: string, message: string, collection_id?: string, agent_mode: AgentMode = "chat") =>
  api.post<{ conversation_id: string; message: Message; sources: SourceReference[] }>(
    `/conversations/${conv_id}/messages`,
    { message, collection_id, agent_mode }
  );

export const regenerateMessage = (conversationId: string, messageId: string) =>
  api.post<{ conversation_id: string; message: Message; sources: SourceReference[] }>(
    `/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}/regenerate`
  );

export const rateMessage = (conversationId: string, messageId: string, rating: "up" | "down") =>
  api.patch<Message>(
    `/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}/feedback`,
    { rating }
  );

export const openDocumentSource = (documentId: string) =>
  api.get<Blob>(`/documents/${encodeURIComponent(documentId)}/file`, { responseType: "blob" });

export const deleteConversation = (id: string) => api.delete(`/conversations/${encodeURIComponent(id)}`);
