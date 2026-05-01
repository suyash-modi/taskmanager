const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

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

export async function api<T = unknown>(path: string, opts: RequestInit = {}): Promise<T> {
  const auth = getAuth();
  const headers: Record<string, string> = {
    ...(opts.headers as Record<string, string> | undefined),
  };
  if (!headers["Content-Type"] && opts.body) {
    headers["Content-Type"] = "application/json";
  }
  if (auth?.accessToken) {
    headers.Authorization = `Bearer ${auth.accessToken}`;
  }
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || res.statusText);
  }
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as T;
  }
}
