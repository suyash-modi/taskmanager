import { useCallback, useEffect, useMemo, useState } from "react";
import {
  api,
  clearAuth,
  getAuth,
  setAuth,
  type DashboardStats,
  type LoginResponse,
  type ProjectResponse,
  type Role,
  type TaskResponse,
  type UserResponse,
} from "./api";

type SignupForm = {
  name: string;
  email: string;
  password: string;
  role: Role;
};

export default function App() {
  const [auth, setAuthState] = useState<LoginResponse | null>(() => getAuth());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  const [myTasks, setMyTasks] = useState<TaskResponse[]>([]);
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);

  const isAdmin = useMemo(() => auth?.role === "ADMIN", [auth]);

  const refreshProjects = useCallback(async () => {
    if (!getAuth()) return;
    const list = await api<ProjectResponse[]>("/projects", { method: "GET" });
    setProjects(list);
    if (list.length && selectedProjectId === "") {
      setSelectedProjectId(list[0].id);
    }
  }, [selectedProjectId]);

  const refreshDashboard = useCallback(async () => {
    if (!getAuth()) return;
    const d = await api<DashboardStats>("/dashboard", { method: "GET" });
    setDashboard(d);
  }, []);

  const refreshMyTasks = useCallback(async () => {
    if (!getAuth()) return;
    const t = await api<TaskResponse[]>("/tasks/my", { method: "GET" });
    setMyTasks(t);
  }, []);

  const refreshTasksForProject = useCallback(
    async (projectId: number) => {
      if (!getAuth()) return;
      const t = await api<TaskResponse[]>(`/tasks/project/${projectId}`, { method: "GET" });
      setTasks(t);
    },
    [],
  );

  useEffect(() => {
    if (!auth) return;
    void (async () => {
      try {
        setError(null);
        await refreshProjects();
        await refreshDashboard();
        await refreshMyTasks();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [auth, refreshProjects, refreshDashboard, refreshMyTasks]);

  useEffect(() => {
    if (typeof selectedProjectId === "number") {
      void (async () => {
        try {
          setError(null);
          await refreshTasksForProject(selectedProjectId);
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
        }
      })();
    } else {
      setTasks([]);
    }
  }, [selectedProjectId, refreshTasksForProject]);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api<UserResponse>("/auth/signup", {
        method: "POST",
        body: JSON.stringify(signup),
      });
      setSignup({ name: "", email: "", password: "", role: "MEMBER" });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      setAuth(res);
      setAuthState(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function handleLogout() {
    clearAuth();
    setAuthState(null);
    setProjects([]);
    setTasks([]);
    setMyTasks([]);
    setDashboard(null);
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setBusy(true);
    setError(null);
    try {
      const ids = memberIds
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => Number(s))
        .filter((n) => !Number.isNaN(n));
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
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin || typeof selectedProjectId !== "number") return;
    setBusy(true);
    setError(null);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function updateTaskStatus(taskId: number, status: string) {
    setBusy(true);
    setError(null);
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
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app">
      <h1>Team Task Manager</h1>
      <p>
        API: <code>{import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"}</code>
      </p>

      {error && <div className="card error">{error}</div>}

      {!auth ? (
        <div className="row" style={{ alignItems: "stretch" }}>
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
          <div className="card row">
            <div>
              Signed in as <strong>{auth.email}</strong>{" "}
              <span className="badge">{auth.role}</span>
            </div>
            <button type="button" className="secondary" onClick={handleLogout}>
              Log out
            </button>
          </div>

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
                    placeholder="2,3"
                  />
                </label>
              </div>
              <button type="submit" disabled={busy}>
                Create project
              </button>
            </form>
          )}

          <div className="card">
            <h2>Projects</h2>
            {projects.length === 0 ? (
              <p>No projects yet.</p>
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
              {tasks.length === 0 ? (
                <p>No tasks.</p>
              ) : (
                <ul className="tasks">
                  {tasks.map((t) => (
                    <li key={t.id}>
                      <strong>{t.title}</strong> ({t.status}) — assignee: {t.assignedToUserId ?? "—"}
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
                    <strong>{t.title}</strong> — {t.status} (project #{t.projectId})
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
