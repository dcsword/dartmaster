# DartMaster 🎯

A full-stack 501 dart scoring app with singles & teams, double/triple/straight out rules, checkout suggestions, and full game history.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite + React Router |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Hosting | Vercel (frontend) + Railway (backend + DB) |

---

## Project Structure

```
dartmaster/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── pool.js          # DB connection
│   │   │   └── schema.sql       # All tables
│   │   ├── logic/
│   │   │   └── gameLogic.js     # 501 rules, bust, checkout suggestions
│   │   ├── middleware/
│   │   │   └── auth.js          # JWT auth
│   │   ├── routes/
│   │   │   ├── auth.js          # Register / login
│   │   │   ├── players.js       # Player profiles & stats
│   │   │   └── games.js         # Create game, submit turns, history
│   │   └── index.js             # Express entry point
│   └── package.json
└── frontend/
    ├── src/
    │   ├── context/AuthContext.jsx
    │   ├── pages/
    │   │   ├── Home.jsx
    │   │   ├── Setup.jsx        # Player/team setup + ruleset
    │   │   ├── Game.jsx         # Live scorer
    │   │   ├── Win.jsx          # Winner screen
    │   │   ├── History.jsx      # Past games
    │   │   ├── Login.jsx
    │   │   └── PlayerProfile.jsx
    │   ├── utils/api.js         # All API calls
    │   ├── App.jsx
    │   └── index.css
    └── package.json
```

---

## Local Setup

### 1. Database (PostgreSQL)

Install PostgreSQL locally or use a free cloud DB (e.g. Railway, Supabase, Neon).

```bash
psql -U postgres -c "CREATE DATABASE dartmaster;"
psql -U postgres -d dartmaster -f backend/src/db/schema.sql
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env — set DATABASE_URL and JWT_SECRET
npm install
npm run dev
# Runs on http://localhost:3001
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

---

## Deploying Online

### Backend → Railway

1. Create account at railway.app
2. New Project → Deploy from GitHub repo
3. Add a PostgreSQL plugin
4. Set environment variables: `DATABASE_URL` (auto-filled by Railway), `JWT_SECRET`, `FRONTEND_URL`
5. Run the schema: connect to DB and paste `backend/src/db/schema.sql`

### Frontend → Vercel

1. Push code to GitHub
2. Import repo at vercel.com
3. Set root to `frontend/`
4. Add env variable: `VITE_API_URL=https://your-railway-app.railway.app`
5. Update `frontend/src/utils/api.js` — change `BASE` to use `import.meta.env.VITE_API_URL`

---

## Game Rules Implemented

- **Double Out** (default) — final dart must be a double or bullseye
- **Straight Out** — any dart can finish
- **Triple Out** — final dart must be a triple
- **Bust rule** — exceed remaining score = turn cancelled, score resets
- **Checkout suggestions** — shown when ≤170 remaining (2–3 dart optimal routes)

---

## Next Steps (future features)

- [ ] Cricket game mode
- [ ] Round-the-clock practice mode  
- [ ] Leg/set match format (best of 3, best of 5)
- [ ] Sound effects
- [ ] Real-time multiplayer (WebSockets)
- [ ] Subscription / premium accounts
- [ ] Mobile app wrapper (Capacitor)
