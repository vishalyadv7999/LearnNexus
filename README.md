# LearnNexus

LearnNexus is a full-stack study planner for students who want a distraction-free daily workflow. Students can register, receive a generated study plan tailored to their year and course track, mark tasks complete, and use a built-in problem solver to find videos and notes for weak areas.

## Tech Stack

- Frontend: React, React Router, Tailwind CSS, Axios
- Backend: Node.js, Express.js, Mongoose
- Database: MongoDB
- Authentication: JWT, bcrypt

## Project Structure

```text
LearnNexus/
|-- client/
|   |-- .env
|   |-- .env.example
|   |-- index.html
|   |-- package.json
|   |-- postcss.config.js
|   |-- tailwind.config.js
|   |-- vite.config.js
|   `-- src/
|       |-- api/
|       |   |-- auth.js
|       |   |-- client.js
|       |   |-- progress.js
|       |   `-- tasks.js
|       |-- components/
|       |   |-- EmptyState.jsx
|       |   |-- Navbar.jsx
|       |   |-- PageLoader.jsx
|       |   |-- ProgressBar.jsx
|       |   |-- ProtectedRoute.jsx
|       |   |-- StatsCard.jsx
|       |   `-- TaskCard.jsx
|       |-- context/
|       |   `-- AuthContext.jsx
|       |-- hooks/
|       |   `-- useAuth.js
|       |-- layouts/
|       |   `-- AppShell.jsx
|       |-- pages/
|       |   |-- DashboardPage.jsx
|       |   |-- LoginPage.jsx
|       |   |-- SignupPage.jsx
|       |   `-- StudyPlanPage.jsx
|       |-- utils/
|       |   |-- format.js
|       |   `-- token.js
|       |-- App.jsx
|       |-- index.css
|       `-- main.jsx
|-- server/
|   |-- .env
|   |-- .env.example
|   |-- package.json
|   `-- src/
|       |-- app.js
|       |-- server.js
|       |-- config/
|       |   |-- db.js
|       |   `-- env.js
|       |-- controllers/
|       |   |-- authController.js
|       |   |-- progressController.js
|       |   |-- taskController.js
|       |   `-- userController.js
|       |-- data/
|       |   |-- curriculum.js
|       |   `-- seed.js
|       |-- middleware/
|       |   |-- auth.js
|       |   |-- errorHandler.js
|       |   |-- notFound.js
|       |   `-- validate.js
|       |-- models/
|       |   |-- Progress.js
|       |   |-- StudyPlan.js
|       |   |-- Task.js
|       |   `-- User.js
|       |-- routes/
|       |   |-- authRoutes.js
|       |   |-- progressRoutes.js
|       |   |-- taskRoutes.js
|       |   `-- userRoutes.js
|       |-- services/
|       |   |-- curriculumService.js
|       |   |-- progressService.js
|       |   `-- studyPlanService.js
|       |-- utils/
|       |   |-- apiError.js
|       |   `-- jwt.js
|       `-- validation/
|           |-- authValidation.js
|           |-- progressValidation.js
|           |-- taskValidation.js
|           `-- userValidation.js
|-- package.json
`-- README.md
```

## Environment Variables

### Server

`server/.env`

```env
PORT=5001
NODE_ENV=development
MONGODB_URI=mongodb+srv://username:password@cluster.example.mongodb.net/learnnexus?retryWrites=true&w=majority
MONGO_CONNECT_RETRY_DELAY_MS=5000
MONGO_CONNECT_MAX_RETRIES=0
JWT_SECRET=replace_with_a_64_character_random_secret
JWT_ACCESS_EXPIRES_IN=15m
CLIENT_URL=http://localhost:5173
```

### Client

`client/.env`

```env
VITE_API_URL=http://localhost:5001/api
```

## Database Schema

### User

- `name`: student name
- `email`: unique email
- `password`: hashed password using bcrypt
- `course`: course or specialization
- `year`: 1-4
- `currentStreak`: active completion streak
- `lastActiveOn`: latest completed study day
- `preferences.studyMinutesPerDay`: daily study target
- `preferences.focusMode`: distraction-free mode toggle

### StudyPlan

- `user`: owner reference
- `date`: plan date
- `course`: student course
- `year`: student year
- `dayIndex`: progression index used for task difficulty
- `trackName`: curriculum track label
- `focusSummary`: plan summary for the day
- `subjects`: subject list for the plan
- `tasks`: task references
- `totalTasks`, `completedTasks`, `completionRate`

### Task

- `user`: owner reference
- `studyPlan`: parent plan
- `date`: plan date
- `order`: task sequence
- `subject`, `topic`, `conceptSummary`
- `difficultyLevel`, `difficultyLabel`
- `videoTitle`, `videoUrl`
- `notesText`, `notesPdfUrl`
- `practiceTask`
- `estimatedMinutes`
- `supportResources`
- `completed`, `completedAt`

### Progress

- `user`: owner reference
- `studyPlan`: linked plan
- `date`: study day
- `totalTasks`, `completedTasks`, `completionRate`
- `entries`: task-level completion states
- `subjectBreakdown`: completed vs total counts per subject
- `lastUpdatedAt`

## API Documentation

Base URL: `http://localhost:5001/api`

### Auth

`POST /auth/register`

Request body:

```json
{
  "name": "Aarav Sharma",
  "email": "aarav@example.com",
  "password": "StrongPass123",
  "course": "Computer Science and Engineering",
  "year": 2
}
```

Response:

```json
{
  "message": "Account created successfully.",
  "token": "jwt-token",
  "user": {
    "id": "user-id",
    "name": "Aarav Sharma",
    "email": "aarav@example.com",
    "course": "Computer Science and Engineering",
    "year": 2
  }
}
```

`POST /auth/login`

Request body:

```json
{
  "email": "aarav@example.com",
  "password": "StrongPass123"
}
```

Response:

```json
{
  "message": "Login successful.",
  "token": "jwt-token",
  "user": {
    "id": "user-id",
    "name": "Aarav Sharma",
    "email": "aarav@example.com",
    "course": "Computer Science and Engineering",
    "year": 2
  }
}
```

`POST /auth/logout`

Response:

```json
{
  "message": "Logout successful."
}
```

### Users

`GET /users/me`

Headers:

```text
Authorization: Bearer <jwt-token>
```

Response:

```json
{
  "user": {
    "id": "user-id",
    "name": "Aarav Sharma",
    "email": "aarav@example.com",
    "course": "Computer Science and Engineering",
    "year": 2,
    "currentStreak": 3,
    "preferences": {
      "studyMinutesPerDay": 120,
      "focusMode": true
    }
  }
}
```

`PATCH /users/me/preferences`

Request body:

```json
{
  "studyMinutesPerDay": 150,
  "focusMode": true
}
```

Response:

```json
{
  "message": "Preferences updated.",
  "user": {
    "id": "user-id",
    "preferences": {
      "studyMinutesPerDay": 150,
      "focusMode": true
    }
  }
}
```

### Tasks

`GET /tasks?date=2026-04-25`

Response:

```json
{
  "plan": {
    "_id": "plan-id",
    "date": "2026-04-25T00:00:00.000Z",
    "trackName": "Software Engineering",
    "focusSummary": "Build strong coding fundamentals...",
    "subjects": ["Programming Foundations", "Mathematics for Computing"],
    "tasks": []
  },
  "progress": {
    "_id": "progress-id",
    "totalTasks": 3,
    "completedTasks": 1,
    "completionRate": 33
  }
}
```

`GET /tasks/subjects`

Response:

```json
{
  "course": "Computer Science and Engineering",
  "year": 2,
  "subjects": [
    {
      "name": "Data Structures and Algorithms",
      "goal": "Choose the right structure before you start writing code.",
      "topicCount": 3
    }
  ]
}
```

`POST /tasks/solve`

Request body:

```json
{
  "query": "linked lists and pointer updates"
}
```

Response:

```json
{
  "query": "linked lists and pointer updates",
  "results": [
    {
      "year": 2,
      "subject": "Data Structures and Algorithms",
      "topic": "Linked Lists and Pointer Reasoning",
      "explanation": "Understand node-to-node relationships...",
      "videoUrl": "https://www.youtube.com/...",
      "notesPdfUrl": "https://www.google.com/..."
    }
  ],
  "fallbackSearch": "https://www.youtube.com/results?search_query=..."
}
```

### Progress

`GET /progress`

Response:

```json
{
  "overview": {
    "totalTasks": 18,
    "completedTasks": 11,
    "completionRate": 61,
    "activeDays": 5,
    "totalStudyPlans": 6,
    "currentStreak": 3,
    "subjectMomentum": []
  },
  "recentActivity": [
    {
      "date": "2026-04-25T00:00:00.000Z",
      "completedTasks": 2,
      "totalTasks": 3,
      "completionRate": 67
    }
  ]
}
```

`PATCH /progress/:taskId`

Request body:

```json
{
  "completed": true
}
```

Response:

```json
{
  "plan": {
    "_id": "plan-id",
    "tasks": []
  },
  "progress": {
    "_id": "progress-id",
    "completedTasks": 2,
    "completionRate": 67
  },
  "overview": {
    "overview": {
      "completedTasks": 11,
      "completionRate": 61
    },
    "recentActivity": []
  }
}
```

## How the Planner Works

- The backend resolves a curriculum track from the student's course.
- The day index is based on the number of days since registration.
- Each date receives a persistent plan with one task per subject for that day.
- Difficulty increases with both academic year and progression over time.
- Doubt solving searches the curriculum catalog and returns the closest explanations, videos, and notes.

## Local Setup

1. Install Node.js 18+ and set `MONGODB_URI` to MongoDB Atlas for permanent cloud storage. Use localhost only when you intentionally want a local MongoDB database.
2. From the project root, install dependencies:

```bash
npm install
```

3. Start the API and frontend together:

```bash
npm run dev
```

4. Open the frontend at `http://localhost:5173`.
5. The backend runs at `http://localhost:5001`.

MongoDB Atlas is required for app runtime storage. If `MONGODB_URI` is missing, points to localhost, or MongoDB Atlas is unreachable after the configured retries, startup fails with a clear error and the API does not start a temporary database.

## Sample Data

Seed a demo user and a generated study plan:

```bash
npm run seed
```

Demo credentials:

- Email: `demo@learnnexus.app`
- Password: `DemoPass123`

## Deployment

### Frontend on Vercel

1. Import the `client` folder as a Vercel project.
2. Set the build command to `npm run build`.
3. Set the output directory to `dist`.
4. Add `VITE_API_URL` as the deployed backend URL plus `/api`.

### Backend on Render

1. Create a new Web Service from the `server` folder.
2. Use `npm install` as the build command.
3. Use `npm start` as the start command.
4. Add `PORT`, `MONGODB_URI`, `JWT_SECRET`, `JWT_ACCESS_EXPIRES_IN`, and `CLIENT_URL`.

### MongoDB Atlas

1. Create a cluster and database user.
2. Whitelist your deployment IPs or allow access from trusted sources.
3. Copy the Atlas connection string into `MONGODB_URI`.
4. Restart the Render service after updating the environment variable.

## Production Notes

- Replace the development JWT secret before deploying.
- Tighten CORS to your deployed frontend domain.
- Use HTTPS-only deployment targets in production.
- Extend `server/src/data/curriculum.js` to add more course-specific tracks or institution-specific content.
- In production, point `MONGODB_URI` to MongoDB Atlas or another managed MongoDB deployment.
