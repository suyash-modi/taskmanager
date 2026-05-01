# Team Task Manager

A full-stack team task management application built for role-based collaboration.

- **Backend:** Spring Boot, Spring Security (JWT), Spring Data JPA, MySQL
- **Frontend:** React + Vite + TypeScript
- **Roles:** `ADMIN`, `MEMBER`
- **Deployment target:** Railway

## Live Links

- **Frontend:** `https://web-production-2fdc3.up.railway.app/`
- **Backend API:** `https://taskmanager-production-9a5d.up.railway.app`
- **GitHub Repository:** `https://github.com/suyash-modi/taskmanager`

---

## Assignment Coverage

| Requirement | Status | Notes |
|---|---|---|
| Authentication (Signup/Login) | Implemented | JWT-based auth with role claims |
| Project & team management | Implemented | Create/list/get projects, members via `memberIds` |
| Task creation/assignment/status tracking | Implemented | Create task, assign task, update status, list by project/my tasks |
| Dashboard (tasks/status/overdue) | Implemented | Role-scoped dashboard metrics |
| REST APIs + Database | Implemented | Spring REST + MySQL |
| Validations & relationships | Implemented | DTO validation + entity relationships |
| RBAC | Implemented | Admin/member route restrictions |
| Railway deployment | Implemented/Ready | Procfile + env-based configuration |
| README | Implemented | This document |
| Demo video (2–5 min) | Prepared | See `DEMO_VIDEO_SCRIPT.md` |

---

## Architecture Summary

### Backend

- Stateless JWT authentication via filter
- DTO-based request/response contracts
- Global exception handling with structured error JSON
- Service-layer authorization checks for role and ownership
- JPA entities:
  - `User`
  - `Project`
  - `Task`

### Frontend

- Responsive React UI
- Role-aware actions (admin/member)
- Dashboard cards and status badges
- Error boundary and defensive API parsing
- Real-time ID-to-user-name lookup while assigning members/tasks

---

## Core Features

1. **User Signup/Login**
   - Password hashing with BCrypt
   - Login returns `accessToken`, `tokenType`, `expiresInSeconds`, `email`, `role`

2. **Project Management**
   - Admin creates project
   - Project members tracked by user IDs
   - Members can view accessible projects

3. **Task Management**
   - Admin creates tasks and assigns users
   - Admin or assignee can update task status
   - Member “My Tasks” view

4. **Dashboard**
   - Admin sees global counts
   - Member sees own assigned-task counts
   - Overdue logic based on deadline and non-DONE status

---

## API Overview

### Public APIs

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/signup` | Register user |
| `POST` | `/auth/login` | Login and receive JWT |

### Protected APIs (`Authorization: Bearer <token>`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/users/{id}` | Authenticated | User lookup by ID (for assignment UX) |
| `GET` | `/projects` | Authenticated | List accessible projects |
| `GET` | `/projects/{id}` | Authenticated | Get project details |
| `POST` | `/projects` | ADMIN | Create project |
| `POST` | `/tasks` | ADMIN | Create task |
| `GET` | `/tasks/project/{projectId}` | Authenticated | List tasks in project (access-checked) |
| `GET` | `/tasks/my` | Authenticated | List tasks assigned to current user |
| `PUT` | `/tasks/{id}/status` | ADMIN or assignee | Update task status |
| `PUT` | `/tasks/{id}/assign` | ADMIN | Assign task to user |
| `GET` | `/dashboard` | Authenticated | Dashboard metrics |

---

## Sample Payloads

### Signup
```json
{
  "name": "Admin User",
  "email": "admin@example.com",
  "password": "secret123",
  "role": "ADMIN"
}
```

### Login Response
```json
{
  "accessToken": "jwt_token",
  "tokenType": "Bearer",
  "expiresInSeconds": 3600,
  "email": "admin@example.com",
  "role": "ADMIN"
}
```

### Create Project
```json
{
  "name": "Project Alpha",
  "description": "Delivery project",
  "memberIds": [2, 3]
}
```

### Create Task
```json
{
  "title": "Implement API integration",
  "description": "Connect frontend to backend",
  "status": "TODO",
  "deadline": "2026-06-01",
  "projectId": 1,
  "assignedToUserId": 2
}
```

---

## Error Response Format

```json
{
  "timestamp": "2026-05-02T00:00:00Z",
  "status": 400,
  "error": "BAD_REQUEST",
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "path": "/auth/signup",
  "fieldErrors": {
    "email": "Invalid email"
  }
}
```

---

## Local Run Instructions

### Prerequisites
- Java 17+
- Node 18+
- MySQL 8+

### Backend
```powershell
.\mvnw.cmd spring-boot:run
```

### Frontend
```powershell
cd frontend
npm install
npm run dev
```

---

## Railway Deployment Notes

### Backend service
- Root directory: `/`
- Build command: `./mvnw -B -DskipTests package`
- Start command: `java -Dserver.port=$PORT -jar target/taskmanager-0.0.1-SNAPSHOT.jar`

Required vars:
- `SPRING_PROFILES_ACTIVE=prod`
- `SPRING_DATASOURCE_URL=jdbc:mysql://<MYSQLHOST>:<MYSQLPORT>/<MYSQLDATABASE>?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC`
- `SPRING_DATASOURCE_USERNAME=<MYSQLUSER>`
- `SPRING_DATASOURCE_PASSWORD=<MYSQLPASSWORD>`
- `JWT_SECRET=<secure_32+_chars>`
- `APP_CORS_ALLOWED_ORIGINS=https://<frontend-domain>`
- `SPRING_JPA_HIBERNATE_DDL_AUTO=update`

### Frontend service
- Root directory: `frontend`
- Build command: `npm run build` (or `npm ci && npm run build`)
- Start command: `npm install -g serve && serve -s dist -l $PORT`
- Variable: `VITE_API_BASE_URL=https://<backend-domain>`

---

## Test Evidence Checklist

- [ ] Signup works from frontend
- [ ] Login works and token is returned
- [ ] Admin can create project
- [ ] Admin can create task and assign user
- [ ] Member sees assigned tasks
- [ ] Status updates reflect in dashboard
- [ ] Overdue count updates correctly

---

## Security Notes

- No plain passwords are returned in API responses.
- Passwords are hashed with BCrypt.
- Secrets are env-driven for production.
- CORS is explicitly controlled by origin allow-list.