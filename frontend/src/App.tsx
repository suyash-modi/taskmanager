import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  api,
  clearAuth,
  fetchCurrentUser,
  fetchUserById,
  getAuth,
  setAuth,
  type DashboardStats,
  type LoginResponse,
  type ProjectResponse,
  type Role,
  type TaskResponse,
  type UserResponse,
} from "./api";
import { UNAUTHORIZED_EVENT } from "./authEvents";

function parseRole(value: unknown): Role {
  if (value === "ADMIN" || value === "MEMBER") return value;
  if (typeof value === "string") {
    const u = value.trim().toUpperCase();
    if (u === "ADMIN" || u === "MEMBER") return u as Role;
  }
  throw new Error("Login response missing or invalid role");
}

type SignupForm = {
  name: string;
  email: string;
  password: string;
  role: Role;
};

type LookupMap = Record<number, UserResponse | null>;

type Feedback = { kind: "success" | "error"; message: string };

export default function App() {
  const [auth, setAuthState] = useState<LoginResponse | null>(() => getAuth());
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);

  const [signup, setSignup] = useState<SignupForm>({
    name: "",
    email: "",
    password: "",
    role: "MEMBER",
  });
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | "">("");
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [memberIds, setMemberIds] = useState("");

  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskStatus, setTaskStatus] = useState("TODO");
  const [taskDeadline, setTaskDeadline] = useState("");
  const [assigneeId, setAssigneeId] = useState("");

  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [myTasks, setMyTasks] = useState<TaskResponse[]>([]);
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
  const [userLookup, setUserLookup] = useState<LookupMap>({});
  const userLookupRef = useRef<LookupMap>({});
  userLookupRef.current = userLookup;
  const [currentUser, setCurrentUser] = useState<UserResponse | null>(null);

  const isAdmin = useMemo(() => auth?.role === "ADMIN", [auth]);
  const fallbackProjectIds = useMemo(
    () =>
      Array.from(
        new Set(
          myTasks
            .map((t) => t.projectId)
            .filter((id): id is number => typeof id === "number"),
        ),
      ),
    [myTasks],
  );

  const refreshProjects = useCallback(async () => {
    if (!getAuth()) return;
    const raw = await api<unknown>("/projects", { method: "GET" });
    const list = Array.isArray(raw) ? (raw as ProjectResponse[]) : [];
    setProjects(list);
    setSelectedProjectId((prev) => {
      if (list.length === 0) return "";
      if (prev === "") return list[0]?.id ?? "";
      return list.some((p) => p.id === prev) ? prev : (list[0]?.id ?? "");
    });
  }, []);

  const refreshDashboard = useCallback(async () => {
    if (!getAuth()) return;
    const raw = await api<unknown>("/dashboard", { method: "GET" });
    if (raw && typeof raw === "object") {
      const obj = raw as Record<string, unknown>;
      setDashboard({
        completed: Number(obj.completed ?? 0),
        pending: Number(obj.pending ?? 0),
        overdue: Number(obj.overdue ?? 0),
      });
    } else {
      setDashboard({ completed: 0, pending: 0, overdue: 0 });
    }
  }, []);

  const refreshMyTasks = useCallback(async () => {
    if (!getAuth()) return;
    const raw = await api<unknown>("/tasks/my", { method: "GET" });
    setMyTasks(Array.isArray(raw) ? (raw as TaskResponse[]) : []);
  }, []);

  const refreshTasksForProject = useCallback(async (projectId: number, signal?: AbortSignal) => {
    if (!getAuth()) return;
    const raw = await api<unknown>(`/tasks/project/${projectId}`, { method: "GET", signal });
    setTasks(Array.isArray(raw) ? (raw as TaskResponse[]) : []);
  }, []);

  useEffect(() => {
    const onSessionExpired = () => {
      setAuthState(null);
      setCurrentUser(null);
      setSelectedProjectId("");
      setProjects([]);
      setTasks([]);
      setMyTasks([]);
      setDashboard(null);
      setUserLookup({});
      setLoadingMessage(null);
      setFeedback({ kind: "error", message: "Session expired. Please log in again." });
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onSessionExpired);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onSessionExpired);
  }, []);

  useEffect(() => {
    if (!auth) return;
    void (async () => {
      try {
        setFeedback(null);
        setLoadingMessage("Loading workspace...");
        const me = await fetchCurrentUser();
        setCurrentUser(me);
        if (!me) {
          setFeedback({
            kind: "error",
            message: "Could not load your profile. If this persists, log out and sign in again.",
          });
        }
        await refreshProjects();
        await refreshDashboard();
        await refreshMyTasks();
        setLoadingMessage(null);
      } catch (e) {
        setFeedback({ kind: "error", message: e instanceof Error ? e.message : String(e) });
        setLoadingMessage(null);
      }
    })();
  }, [auth, refreshProjects, refreshDashboard, refreshMyTasks]);

  useEffect(() => {
    if (typeof selectedProjectId !== "number") {
      setTasks([]);
      setTasksLoading(false);
      return;
    }
    const ac = new AbortController();
    setTasksLoading(true);
    void (async () => {
      try {
        setFeedback(null);
        await refreshTasksForProject(selectedProjectId, ac.signal);
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        setTasks([]);
        setFeedback({ kind: "error", message: e instanceof Error ? e.message : String(e) });
      } finally {
        if (!ac.signal.aborted) setTasksLoading(false);
      }
    })();
    return () => ac.abort();
  }, [selectedProjectId, refreshTasksForProject]);

  useEffect(() => {
    if (selectedProjectId !== "") return;
    if (projects.length > 0) {
      setSelectedProjectId(projects[0]?.id ?? "");
      return;
    }
    if (fallbackProjectIds.length > 0) {
      setSelectedProjectId(fallbackProjectIds[0]);
    }
  }, [selectedProjectId, projects, fallbackProjectIds]);

  const parsedMemberIds = useMemo(
    () =>
      memberIds
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => Number(s))
        .filter((n) => Number.isFinite(n)),
    [memberIds],
  );

  const parsedAssigneeId = useMemo(() => {
    const val = Number(assigneeId.trim());
    return Number.isFinite(val) ? val : null;
  }, [assigneeId]);

  const knownUserIds = useMemo(() => {
    const ids = new Set<number>();
    parsedMemberIds.forEach((id) => ids.add(id));
    if (parsedAssigneeId) ids.add(parsedAssigneeId);
    tasks.forEach((t) => {
      if (t.assignedToUserId != null) ids.add(t.assignedToUserId);
    });
    myTasks.forEach((t) => {
      if (t.assignedToUserId != null) ids.add(t.assignedToUserId);
    });
    return Array.from(ids);
  }, [parsedMemberIds, parsedAssigneeId, tasks, myTasks]);

  const knownUserIdsKey = useMemo(
    () => [...new Set(knownUserIds)].sort((a, b) => a - b).join(","),
    [knownUserIds],
  );

  useEffect(() => {
    if (!auth || knownUserIds.length === 0) return;
    const missing = [...new Set(knownUserIds)].filter((id) => userLookupRef.current[id] === undefined);
    if (missing.length === 0) return;
    let cancelled = false;
    void (async () => {
      for (const id of missing) {
        if (cancelled) return;
        const user = await fetchUserById(id);
        if (cancelled) return;
        setUserLookup((prev) => (prev[id] !== undefined ? prev : { ...prev, [id]: user }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth, knownUserIdsKey]);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      await api<UserResponse>("/auth/signup", {
        method: "POST",
        body: JSON.stringify(signup),
      });
      setSignup({ name: "", email: "", password: "", role: "MEMBER" });
      setFeedback({ kind: "success", message: "Account created. You can log in now." });
    } catch (err) {
      setFeedback({ kind: "error", message: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      const raw = await api<unknown>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      if (!raw || typeof raw !== "object") {
        throw new Error("Unexpected login response");
      }
      const res = raw as Partial<LoginResponse>;
      if (!res.accessToken || !res.email || res.role === undefined || res.role === null) {
        throw new Error("Invalid login payload. Re-check backend /auth/login response.");
      }
      const normalized: LoginResponse = {
        accessToken: res.accessToken,
        tokenType: res.tokenType ?? "Bearer",
        expiresInSeconds: Number(res.expiresInSeconds ?? 3600),
        email: res.email,
        role: parseRole(res.role),
      };
      setAuth(normalized);
      setAuthState(normalized);
      setSelectedProjectId("");
      setProjects([]);
      setTasks([]);
      setMyTasks([]);
      setDashboard(null);
      setUserLookup({});
      setCurrentUser(null);
      setFeedback(null);
    } catch (err) {
      setFeedback({ kind: "error", message: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  function handleLogout() {
    clearAuth();
    setAuthState(null);
    setCurrentUser(null);
    setSelectedProjectId("");
    setProjects([]);
    setTasks([]);
    setMyTasks([]);
    setDashboard(null);
    setUserLookup({});
    setLoadingMessage(null);
    setFeedback(null);
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setBusy(true);
    setFeedback(null);
    try {
      const ids = memberIds
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => Number(s))
        .filter((n) => !Number.isNaN(n))
        .filter((n) => (currentUser ? n !== currentUser.id : true));
      await api<ProjectResponse>("/projects", {
        method: "POST",
        body: JSON.stringify({
          name: projectName,
          description: projectDesc || null,
          memberIds: ids.length ? ids : null,
        }),
      });
      setProjectName("");
      setProjectDesc("");
      setMemberIds("");
      await refreshProjects();
      await refreshDashboard();
      setFeedback({ kind: "success", message: "Project created." });
    } catch (err) {
      setFeedback({ kind: "error", message: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin || typeof selectedProjectId !== "number") return;
    setBusy(true);
    setFeedback(null);
    try {
      const body: Record<string, unknown> = {
        title: taskTitle,
        description: taskDesc || null,
        status: taskStatus,
        projectId: selectedProjectId,
      };
      if (taskDeadline) body.deadline = taskDeadline;
      if (assigneeId.trim()) body.assignedToUserId = Number(assigneeId);
      await api<TaskResponse>("/tasks", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setTaskTitle("");
      setTaskDesc("");
      setTaskStatus("TODO");
      setTaskDeadline("");
      setAssigneeId("");
      await refreshTasksForProject(selectedProjectId);
      await refreshDashboard();
      await refreshMyTasks();
      setFeedback({ kind: "success", message: "Task created." });
    } catch (err) {
      setFeedback({ kind: "error", message: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  async function updateTaskStatus(taskId: number, status: string) {
    setBusy(true);
    setFeedback(null);
    try {
      await api<TaskResponse>(`/tasks/${taskId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      if (typeof selectedProjectId === "number") {
        await refreshTasksForProject(selectedProjectId);
      }
      await refreshDashboard();
      await refreshMyTasks();
    } catch (err) {
      setFeedback({ kind: "error", message: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  function statusClass(status: string): string {
    const normalized = status?.toUpperCase?.() ?? "";
    if (normalized === "DONE") return "status status-done";
    if (normalized === "IN_PROGRESS") return "status status-inprogress";
    if (normalized === "TODO") return "status status-todo";
    return "status";
  }

  function renderUserHint(id: number) {
    const entry = userLookup[id];
    if (entry === undefined) return <span className="id-chip pending">#{id} checking...</span>;
    if (!entry) return <span className="id-chip bad">#{id} not found</span>;
    return (
      <span className="id-chip ok">
        #{id} {entry.name}
      </span>
    );
  }

  return (
    <div className="app">
      <header className="topbar card">
        <div>
          <h1>Team Task Manager</h1>
          <p className="muted">
            API: <code>{import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"}</code>
          </p>
        </div>
        {auth && (
          <div className="row">
            <div className="user-pill">
              {currentUser
                ? `#${currentUser.id} ${currentUser.name}`
                : `${auth.email} (loading profile…)`}{" "}
              <span className="badge">{typeof auth.role === "string" ? auth.role : String(auth.role)}</span>
            </div>
            <button type="button" className="secondary" onClick={handleLogout}>
              Log out
            </button>
          </div>
        )}
      </header>

      {feedback && (
        <div className={`card notice ${feedback.kind === "success" ? "notice-success" : "notice-error"}`}>
          {feedback.message}
        </div>
      )}
      {loadingMessage && <div className="card muted">{loadingMessage}</div>}

      {!auth ? (
        <div className="auth-grid">
          <form className="card" onSubmit={handleSignup} style={{ flex: 1 }}>
            <h2>Sign up</h2>
            <div className="row">
              <label>
                Name
                <input
                  value={signup.name}
                  onChange={(e) => setSignup({ ...signup, name: e.target.value })}
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={signup.email}
                  onChange={(e) => setSignup({ ...signup, email: e.target.value })}
                  required
                />
              </label>
            </div>
            <div className="row">
              <label>
                Password
                <input
                  type="password"
                  value={signup.password}
                  onChange={(e) => setSignup({ ...signup, password: e.target.value })}
                  required
                  minLength={6}
                />
              </label>
              <label>
                Role
                <select
                  value={signup.role}
                  onChange={(e) => setSignup({ ...signup, role: e.target.value as Role })}
                >
                  <option value="MEMBER">MEMBER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </label>
            </div>
            <button type="submit" disabled={busy}>
              Create account
            </button>
          </form>

          <form className="card" onSubmit={handleLogin} style={{ flex: 1 }}>
            <h2>Log in</h2>
            <label>
              Email
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
            </label>
            <button type="submit" disabled={busy}>
              Log in
            </button>
          </form>
        </div>
      ) : (
        <>
          {dashboard && (
            <div className="card">
              <h2>Dashboard</h2>
              <div className="stats">
                <div className="stat">
                  Completed<strong>{dashboard.completed}</strong>
                </div>
                <div className="stat">
                  Pending<strong>{dashboard.pending}</strong>
                </div>
                <div className="stat">
                  Overdue<strong>{dashboard.overdue}</strong>
                </div>
              </div>
            </div>
          )}

          {isAdmin && (
            <form className="card" onSubmit={handleCreateProject}>
              <h2>Create project (Admin)</h2>
              <div className="row">
                <label>
                  Name
                  <input value={projectName} onChange={(e) => setProjectName(e.target.value)} required />
                </label>
                <label>
                  Description
                  <input value={projectDesc} onChange={(e) => setProjectDesc(e.target.value)} />
                </label>
                <label>
                  Member user IDs (comma)
                  <input
                    value={memberIds}
                    onChange={(e) => setMemberIds(e.target.value)}
                    placeholder="2,3 (creator auto-added)"
                  />
                </label>
              </div>
              {currentUser && (
                <p className="muted">
                  Creator auto-added to project members: #{currentUser.id} {currentUser.name}
                </p>
              )}
              {parsedMemberIds.length > 0 && (
                <div className="row chips">{parsedMemberIds.map((id) => <span key={id}>{renderUserHint(id)}</span>)}</div>
              )}
              <button type="submit" disabled={busy}>
                Create project
              </button>
            </form>
          )}

          <div className="card">
            <h2>Projects</h2>
            {projects.length === 0 && fallbackProjectIds.length === 0 ? (
              <p>No projects visible. Ask ADMIN to add you as a project member.</p>
            ) : (
              <ul>
                {projects.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="secondary"
                      style={{ marginRight: "0.5rem" }}
                      onClick={() => setSelectedProjectId(p.id)}
                    >
                      {selectedProjectId === p.id ? "Selected" : "Select"}
                    </button>
                    <strong>{p.name}</strong> — {p.description || "—"}
                  </li>
                ))}
                {projects.length === 0 &&
                  fallbackProjectIds.map((pid) => (
                    <li key={pid}>
                      <button
                        type="button"
                        className="secondary"
                        style={{ marginRight: "0.5rem" }}
                        onClick={() => setSelectedProjectId(pid)}
                      >
                        {selectedProjectId === pid ? "Selected" : "Select"}
                      </button>
                      <strong>Project #{pid}</strong> — from your assigned tasks
                    </li>
                  ))}
              </ul>
            )}
          </div>

          {isAdmin && typeof selectedProjectId === "number" && (
            <form className="card" onSubmit={handleCreateTask}>
              <h2>Create task (Admin) for project #{selectedProjectId}</h2>
              <div className="row">
                <label>
                  Title
                  <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} required />
                </label>
                <label>
                  Status
                  <select value={taskStatus} onChange={(e) => setTaskStatus(e.target.value)}>
                    <option value="TODO">TODO</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="DONE">DONE</option>
                  </select>
                </label>
                <label>
                  Deadline
                  <input type="date" value={taskDeadline} onChange={(e) => setTaskDeadline(e.target.value)} />
                </label>
                <label>
                  Assignee user ID
                  <input value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} placeholder="optional" />
                </label>
              </div>
              {parsedAssigneeId && <div className="row chips">{renderUserHint(parsedAssigneeId)}</div>}
              <label>
                Description
                <textarea rows={2} value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} />
              </label>
              <button type="submit" disabled={busy}>
                Create task
              </button>
            </form>
          )}

          {typeof selectedProjectId === "number" && (
            <div className="card">
              <h2>Tasks in project #{selectedProjectId}</h2>
              {tasksLoading ? (
                <p className="muted">Loading tasks…</p>
              ) : tasks.length === 0 ? (
                <p>No tasks in this project (or none assigned to you).</p>
              ) : (
                <ul className="tasks">
                  {tasks.map((t) => (
                    <li key={t.id}>
                      <strong>{t.title}</strong>{" "}
                      <span className={statusClass(t.status)}>{t.status}</span> — assignee:{" "}
                      {t.assignedToUserId ? renderUserHint(t.assignedToUserId) : "—"}
                      <div className="row" style={{ marginTop: "0.35rem" }}>
                        <button
                          type="button"
                          className="secondary"
                          disabled={busy}
                          onClick={() => void updateTaskStatus(t.id, "TODO")}
                        >
                          TODO
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          disabled={busy}
                          onClick={() => void updateTaskStatus(t.id, "IN_PROGRESS")}
                        >
                          In progress
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          disabled={busy}
                          onClick={() => void updateTaskStatus(t.id, "DONE")}
                        >
                          Done
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="card">
            <h2>My tasks</h2>
            {myTasks.length === 0 ? (
              <p>No tasks assigned to you.</p>
            ) : (
              <ul className="tasks">
                {myTasks.map((t) => (
                  <li key={t.id}>
                    <strong>{t.title}</strong>{" "}
                    <span className={statusClass(t.status)}>{t.status}</span> (project #{t.projectId})
                    <div className="row" style={{ marginTop: "0.35rem" }}>
                      <button
                        type="button"
                        className="secondary"
                        disabled={busy}
                        onClick={() => void updateTaskStatus(t.id, "TODO")}
                      >
                        TODO
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        disabled={busy}
                        onClick={() => void updateTaskStatus(t.id, "IN_PROGRESS")}
                      >
                        In progress
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        disabled={busy}
                        onClick={() => void updateTaskStatus(t.id, "DONE")}
                      >
                        Done
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
