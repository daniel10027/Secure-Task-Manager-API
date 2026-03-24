# Task Manager REST API

**Course:** Computer Systems and Their Fundamentals  
**Student:** JEAN MARIE DANIEL VIANNEY GUEDEGBE  
**Platform:** GOMYCODE

---

## Overview

A secure Task Manager REST API built with Node.js and Express. Users can sign up, log in (via JWT or Google OAuth), and manage their personal tasks. Every security best practice from the checkpoint is implemented.

---

## Project Structure

```
task-manager/
├── config/
│   └── passport.js          ← Google OAuth strategy (Passport.js)
├── middleware/
│   ├── verifyToken.js        ← JWT authentication guard
│   └── errorHandler.js       ← Centralized error-handling middleware
├── models/
│   ├── User.js               ← User schema (bcrypt hash on save)
│   └── Task.js               ← Task schema (owner reference)
├── routes/
│   ├── authRoutes.js         ← /api/auth/* (signup, login, logout, google)
│   └── taskRoutes.js         ← /api/tasks/* (CRUD, protected)
├── utils/
│   ├── AppError.js           ← Reusable custom error class
│   └── catchAsync.js         ← Async error wrapper
├── app.js                    ← Express app (middleware + routes)
├── server.js                 ← Entry point (DB connection + server start)
├── package.json
├── .env.example              ← Environment variable template
└── README.md
```

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
PORT=3000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/task-manager
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=7d
JWT_COOKIE_EXPIRES_IN=7
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

### 3. Start MongoDB

Make sure MongoDB is running locally:

```bash
# macOS / Linux
mongod

# Windows (run as admin)
net start MongoDB
```

Or use a free MongoDB Atlas cluster and paste the connection string into `MONGO_URI`.

### 4. Start the server

```bash
# Development (auto-restart on file changes)
npm run dev

# Production
npm start
```

---

## API Reference

### Base URL

```
http://localhost:3000/api
```

---

### Authentication Routes

#### POST /auth/signup

Create a new account.

**Request body:**
```json
{
  "name":     "Jean Marie",
  "email":    "jean@example.com",
  "password": "securepassword"
}
```

**Response 201:**
```json
{
  "status":  "success",
  "message": "Account created successfully",
  "token":   "eyJhbGciOiJIUzI1NiJ9...",
  "data": {
    "user": { "id": "...", "name": "Jean Marie", "email": "jean@example.com" }
  }
}
```

---

#### POST /auth/login

Log in with email and password.

**Request body:**
```json
{
  "email":    "jean@example.com",
  "password": "securepassword"
}
```

**Response 200:**
```json
{
  "status":  "success",
  "message": "Logged in successfully",
  "token":   "eyJhbGciOiJIUzI1NiJ9..."
}
```

The JWT is also stored in an **HTTP-only cookie** named `jwt` automatically.

---

#### POST /auth/logout

Clears the JWT cookie.

**Response 200:**
```json
{ "status": "success", "message": "Logged out successfully" }
```

---

#### GET /auth/google

Redirects the user to Google's OAuth consent screen.

---

#### GET /auth/google/callback

Google redirects here after the user consents. Returns a JWT token.

---

### Task Routes (all require authentication)

Send the JWT in one of two ways:

```
Cookie:  jwt=eyJhbGciOiJIUzI1NiJ9...   (set automatically after login)
Header:  Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```

---

#### POST /tasks

Create a new task.

**Request body:**
```json
{
  "title":       "Buy groceries",
  "description": "Milk, eggs, bread",
  "completed":   false
}
```

**Response 201:**
```json
{
  "status": "success",
  "data": {
    "task": {
      "id":          "64f1a2b3c4d5e6f7g8h9i0j1",
      "title":       "Buy groceries",
      "description": "Milk, eggs, bread",
      "completed":   false,
      "owner":       "64f1a2b3c4d5e6f7g8h9i0j0",
      "createdAt":   "2026-03-24T12:00:00.000Z"
    }
  }
}
```

---

#### GET /tasks

Retrieve all tasks belonging to the logged-in user.

**Response 200:**
```json
{
  "status":  "success",
  "results": 2,
  "data": {
    "tasks": [
      { "id": "...", "title": "Buy groceries", "completed": false },
      { "id": "...", "title": "Read a book",   "completed": true  }
    ]
  }
}
```

---

#### DELETE /tasks/:id

Delete a task. Only the owner can delete their own tasks.

**Response 200:**
```json
{
  "status":  "success",
  "message": "Task deleted successfully.",
  "data":    null
}
```

**Response 403 (not the owner):**
```json
{
  "status":  "fail",
  "message": "You are not authorized to delete this task."
}
```

---

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK — request succeeded |
| 201 | Created — resource created successfully |
| 400 | Bad Request — invalid or missing input |
| 401 | Unauthorized — missing or invalid token |
| 403 | Forbidden — authenticated but not authorized |
| 404 | Not Found — resource or route does not exist |
| 429 | Too Many Requests — rate limit exceeded |
| 500 | Internal Server Error — unexpected error |

---

## Security Features

### helmet

Sets secure HTTP response headers automatically:

```javascript
app.use(helmet());
```

Protects against XSS, clickjacking, MIME sniffing, and more.

---

### express-mongo-sanitize

Strips MongoDB operators (`$`, `.`) from request bodies to prevent NoSQL injection:

```javascript
app.use(mongoSanitize());
// { "email": { "$gt": "" } } → stripped before reaching the database
```

---

### xss-clean

Sanitizes user input to remove HTML tags and JavaScript:

```javascript
app.use(xss());
// "<script>alert('xss')</script>" → "&lt;script&gt;..."
```

---

### express-rate-limit

| Route | Limit |
|-------|-------|
| All `/api/*` routes | 100 requests / 15 min / IP |
| `/api/auth/login` | 10 requests / 15 min / IP |
| `/api/auth/signup` | 10 requests / 15 min / IP |

---

### HTTP-only JWT Cookie

The JWT is stored in a cookie that JavaScript cannot access, protecting against XSS token theft:

```javascript
res.cookie('jwt', token, {
  httpOnly: true,   // not accessible via document.cookie
  secure:   true,   // HTTPS only in production
  sameSite: 'strict',
});
```

---

## Architecture

### Error Handling Flow

```
Route handler throws or calls next(err)
          ↓
catchAsync() catches the rejected promise → calls next(err)
          ↓
errorHandler middleware (4 parameters)
          ↓
AppError (operational) → sends structured JSON response
Unknown error          → logs error + sends generic 500
```

### AppError Class

```javascript
// Create a specific, descriptive error anywhere in the app
throw new AppError('Task not found.', 404);
throw new AppError('Invalid credentials.', 401);
throw new AppError('You are not authorized.', 403);
```

### catchAsync Wrapper

```javascript
// Wraps any async route handler — no try/catch needed
router.get('/', catchAsync(async (req, res) => {
  const tasks = await Task.find({ owner: req.user._id });
  res.json({ data: { tasks } });
  // If Task.find() throws → automatically forwarded to errorHandler
}));
```

### JWT Authentication Flow

```
1. POST /api/auth/login → server validates credentials
2. Server signs JWT → sends it as HTTP-only cookie + response body
3. Client sends JWT in cookie (automatic) or Authorization header
4. verifyToken middleware:
   a. Extracts token from cookie or header
   b. Verifies signature with JWT_SECRET
   c. Fetches user from database
   d. Attaches user to req.user
5. Route handler runs with req.user available
```

---

## Google OAuth Setup

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project
3. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
4. Set **Authorized redirect URIs** to `http://localhost:3000/api/auth/google/callback`
5. Copy **Client ID** and **Client Secret** into your `.env` file

---

## Testing with curl

```bash
# Signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Jean","email":"jean@example.com","password":"password123"}'

# Login (save the token)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jean@example.com","password":"password123"}'

# Create task (replace TOKEN with the token from login)
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"title":"Buy groceries","description":"Milk and eggs"}'

# Get all tasks
curl http://localhost:3000/api/tasks \
  -H "Authorization: Bearer TOKEN"

# Delete a task
curl -X DELETE http://localhost:3000/api/tasks/TASK_ID \
  -H "Authorization: Bearer TOKEN"
```
