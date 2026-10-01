export type UserRole = "user" | "admin";

export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  role: UserRole;
  created_at: string;
}

export interface AdminStats {
  total_users: number;
  active_users: number;
  admin_users: number;
  total_documents: number;
  uploaded_documents: number;
  processing_documents: number;
  completed_documents: number;
  failed_documents: number;
  total_conversations: number;
  total_usage_events: number;
  usage_events_30d: number;
  chat_queries_30d: number;
  uploads_30d: number;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  href: string;
  created_at: string;
  read: boolean;
}

export interface NotificationList {
  items: AppNotification[];
  unread_count: number;
}

export interface Document {
  id: string;
  original_name: string;
  status: "uploaded" | "processing" | "completed" | "failed";
  file_size: number;
  chunk_count: number | null;
  is_shared: boolean;
  version: number;
  collection_id: string | null;
  created_at: string;
  error_message?: string | null;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  created_at: string;
  document_count: number;
}

export interface CollectionDetail {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface DocumentVersion {
  version: number;
  original_name: string;
  file_size: number;
  mime_type: string;
  status: Document["status"];
  created_at: string;
  is_current: boolean;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  collection_id?: string | null;
  feedback?: "up" | "down" | null;
  sources?: SourceReference[];
}

export interface SourceReference {
  chunk_id: string;
  document_id: string;
  filename: string;
  page: number | null;
  similarity: number;
  snippet?: string;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: Message[];
}
