import type { User } from "./types";

const apiUrl = (import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1").replace(/\/$/, "");

interface APIError {
  error?: { message?: string };
}

export async function apiRequest<T>(
  path: string,
  body?: Record<string, string>,
  token?: string
): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = (await response.json()) as T & APIError;
  if (!response.ok) {
    throw new Error(data.error?.message || `Request failed (${response.status})`);
  }
  return data;
}

export async function login(email: string, password: string): Promise<{ token: string; user: User }> {
  const tokenResponse = await apiRequest<{ access_token: string }>("/auth/login", { email, password });
  const user = await apiRequest<User>("/users/me", undefined, tokenResponse.access_token);
  if (!user.is_active) throw new Error("This account is disabled. Contact your administrator.");
  return { token: tokenResponse.access_token, user };
}

export async function register(email: string, password: string, full_name: string): Promise<void> {
  await apiRequest<User>("/auth/register", { email, password, full_name });
}

export async function getMe(token: string): Promise<User> {
  return apiRequest<User>("/users/me", undefined, token);
}

export function getToken(): string | null {
  return sessionStorage.getItem("token");
}

export function saveToken(token: string): void {
  sessionStorage.setItem("token", token);
}

export function clearToken(): void {
  sessionStorage.removeItem("token");
}

export function userInitials(user: User): string {
  const initials = user.full_name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
  return (initials || user.email.slice(0, 2)).toUpperCase();
}
