import { notifyUnauthorized } from "./authEvents";

const BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080").replace(/\/+$/, "");

export type Role = "ADMIN" | "MEMBER";

export type LoginResponse = {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  email: string;
  role: Role;
};

export type UserResponse = {
  id: number;
  name: string;
  email: string;
  role: Role;
};

export type ProjectResponse = {
  id: number;
  name: string;
  description: string | null;
  createdById: number | null;
  memberIds: number[];
};

export type TaskResponse = {
  id: number;
  title: string;
  description: string | null;
  status: string;
  deadline: string | null;
  projectId: number | null;
  assignedToUserId: number | null;
};

export type DashboardStats = {
  completed: number;
  pending: number;
  overdue: number;
};

const AUTH_KEY = "tm_auth";

export function getAuth(): LoginResponse | null {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LoginResponse;
  } catch {
    return null;
  }
}

export function setAuth(data: LoginResponse) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(data));
}

export function clearAuth() {
  localStorage.removeItem(AUTH_KEY);
}

function normalizeApiPath(path: string): string {
  if (path.startsWith("http")) {
    try {
      return new URL(path).pathname;
    } catch {
      return path;
    }
  }
  return path.startsWith("/") ? path : `/${path}`;
}

export async function api<T = unknown>(path: string, opts: RequestInit = {}): Promise<T> {
  const auth = getAuth();
  const headers: Record<string, string> = {
    ...(opts.headers as Record<string, string> | undefined),
  };
  if (!headers["Content-Type"] && opts.body) {
    headers["Content-Type"] = "application/json";
  }
  const pathOnly = normalizeApiPath(path);
  const isPublicAuth = pathOnly === "/auth/login" || pathOnly === "/auth/signup";
  if (auth?.accessToken && !isPublicAuth) {
    headers.Authorization = `Bearer ${auth.accessToken}`;
  }
  const url = path.startsWith("http") ? path : `${BASE}${pathOnly}`;
  const res = await fetch(url, { ...opts, headers });
  const text = await res.text();
  if (!res.ok) {
    if (res.status === 401 && !isPublicAuth && auth?.accessToken) {
      clearAuth();
      notifyUnauthorized();
    }
    let message = text || res.statusText;
    if (text) {
      try {
        const parsed = JSON.parse(text) as { message?: string };
        if (parsed.message) message = parsed.message;
      } catch {
        /* keep raw body as message */
      }
    }
    throw new Error(message);
  }
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as T;
  }
}

export async function fetchUserById(id: number): Promise<UserResponse | null> {
  try {
    return await api<UserResponse>(`/users/${id}`, { method: "GET" });
  } catch {
    return null;
  }
}

export async function fetchCurrentUser(): Promise<UserResponse | null> {
  try {
    return await api<UserResponse>("/users/me", { method: "GET" });
  } catch (e) {
    console.warn("fetchCurrentUser failed:", e);
    return null;
  }
}
