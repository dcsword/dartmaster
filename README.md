# DartMaster 🎯

A full-stack 501 dart scoring app with singles and teams, room-based game setup, guest play, checkout suggestions, match history, and player stats.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite + React Router |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Hosting | Vercel (frontend) + Railway (backend + DB) |

---

## Project Structure

```text
dartmaster/
├── README.md
├── backend/
│   ├── .env.example                 # Backend environment template
│   ├── package.json
│   └── src/
│       ├── db/
│       │   ├── all_migrations.sql   # Idempotent migration bundle for existing DBs
│       │   ├── pool.js              # PostgreSQL connection + SSL config
│       │   └── schema.sql           # Fresh database schema
│       ├── logic/
│       │   └── gameLogic.js         # 501 rules, bust logic, checkout suggestions
│       ├── middleware/
│       │   └── auth.js              # JWT auth helpers
│       ├── routes/
│       │   ├── auth.js              # Register, login, refresh, account deletion
│       │   ├── games.js             # Game creation, live turns, history, details
│       │   ├── players.js           # Player search, profile, profile updates
│       │   ├── rooms.js             # Room create/join/poll/close
│       │   └── stats.js             # Stats + head-to-head endpoints
│       ├── services/
│       │   └── email.js             # Welcome email integration
│       └── index.js                 # Express app entry point
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vercel.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx                  # App routes
│       ├── index.css                # Global styling
│       ├── main.jsx                 # React bootstrap
│       ├── components/
│       │   ├── BottomNav.jsx
│       │   ├── Layout.jsx
│       │   └── Sidebar.jsx
│       ├── context/
│       │   └── AuthContext.jsx      # Auth state, token refresh, theme
│       ├── pages/
│       │   ├── Game.jsx             # Live scoring screen
│       │   ├── GameDetail.jsx       # Finished game detail view
│       │   ├── Help.jsx
│       │   ├── History.jsx
│       │   ├── Home.jsx
│       │   ├── JoinRoom.jsx
│       │   ├── Login.jsx
│       │   ├── PlayerProfile.jsx
│       │   ├── Setup.jsx            # Match setup + guest creation
│       │   ├── Stats.jsx
│       │   └── Win.jsx
│       └── utils/
│           ├── api.js               # API wrapper
│           ├── gameAccess.js        # Game-scoped guest access helpers
│           └── guestSessions.js     # Guest ID/token persistence helpers
└── package.json                     # Root-level shared deps used during development
```

---

## Local Setup

### 1. Database (PostgreSQL)

Install PostgreSQL locally or use a cloud database such as Railway, Supabase, or Neon.

For a fresh local database:

```bash
psql -U postgres -c "CREATE DATABASE dartmaster;"
psql -U postgres -d dartmaster -f backend/src/db/schema.sql
```

If you already have an existing database and want to upgrade it safely:

```bash
psql -U postgres -d dartmaster -f backend/src/db/all_migrations.sql
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env
npm install
npm run dev
```

To apply the idempotent migration bundle against an existing database:

```bash
cd backend
npm run db:migrate
```

Default local backend URL:

```text
http://127.0.0.1:3001
```

Required backend environment variables:

- `DATABASE_URL`
- `JWT_SECRET`

Common backend environment variables:

- `PORT=3001`
- `NODE_ENV=development`
- `FRONTEND_URL=http://localhost:5173`
- `HOST=127.0.0.1`

Optional backend environment variables:

- `GOOGLE_CLIENT_ID` for Google sign-in
- `RESEND_API_KEY` for welcome emails
- `DB_SSL_REJECT_UNAUTHORIZED` for stricter PostgreSQL TLS validation in production

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Default local frontend URL:

```text
http://127.0.0.1:5173
```

Optional frontend environment variables:

- `VITE_API_URL=http://127.0.0.1:3001/api`
- `VITE_GOOGLE_CLIENT_ID=...`

If `VITE_API_URL` is not set, the frontend falls back to `/api`.

---

## Deployment

### Backend → Railway

1. Create a Railway project and deploy the `backend/` service from GitHub.
2. Attach a PostgreSQL database.
3. Set backend environment variables:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `FRONTEND_URL=https://your-frontend-domain`
   - `NODE_ENV=production`
4. Run `backend/src/schema.sql` for a brand-new database.
5. Run `backend/src/db/all_migrations.sql` for upgrades or to ensure all current fields/tables exist.

Because the backend is environment-aware, production defaults to `HOST=0.0.0.0`. You usually do not need to set `HOST` manually on Railway.

### Frontend → Vercel

1. Import the repo into Vercel.
2. Set the root directory to `frontend/`.
3. Add frontend environment variables as needed:
   - `VITE_API_URL=https://your-railway-app.up.railway.app/api`
   - `VITE_GOOGLE_CLIENT_ID=...`
4. Deploy.

You do not need to edit `frontend/src/utils/api.js` for deployment. It already reads `VITE_API_URL`.

---

## Core Features

- Singles and teams scoring
- Straight out, double out, and triple out rule sets
- Match formats with legs and sets
- Room-based game setup
- Guest play without full account signup
- Player profiles and stats
- Head-to-head comparison
- Checkout suggestions for finishable scores
- Game history and finished-game detail screens
- Account deletion endpoint for store compliance

---

## Notes

- Guest players are still persisted as backend users so their games and history can be tracked safely.
- Active live games now require participant access rather than being publicly writable.
- Room membership polling is restricted to the host or joined members.
- The backend runs on `127.0.0.1` by default in development and `0.0.0.0` in production.

---

## Future Ideas

- Cricket game mode
- Practice mode / round-the-clock mode
- Real-time multiplayer over WebSockets
- Premium / subscription features
- Mobile packaging via Capacitor or a native wrapper
