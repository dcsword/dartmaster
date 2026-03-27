import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Home from './pages/Home';
import Setup from './pages/Setup';
import Game from './pages/Game';
import Win from './pages/Win';
import History from './pages/History';
import GameDetail from './pages/GameDetail';
import Login from './pages/Login';
import PlayerProfile from './pages/PlayerProfile';
import JoinRoom from './pages/JoinRoom';
import Stats from './pages/Stats';
import Help from './pages/Help';
import './index.css';

// Redirects to /login if not authenticated
// Guests (no token but have guest IDs) can access game-related pages
function ProtectedRoute({ children, allowGuests = false }) {
  const { user } = useAuth();

  if (user) return children;

  if (allowGuests) {
    // Check if device has guest history — allow access
    try {
      const guestIds = JSON.parse(localStorage.getItem('dm_guest_ids') || '[]');
      if (guestIds.length > 0) return children;
    } catch {}
  }

  return <Navigate to="/login" replace />;
}

// Redirects logged-in users away from login page
function PublicOnlyRoute({ children }) {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public — anyone */}
      <Route path="/"          element={<Home />} />
      <Route path="/help"      element={<Help />} />
      <Route path="/join"      element={<JoinRoom />} />
      <Route path="/join/:code" element={<JoinRoom />} />

      {/* Public only — redirect logged-in users to home */}
      <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />

      {/* Game routes — guests allowed (they play too) */}
      <Route path="/setup"          element={<Setup />} />
      <Route path="/game/:id"       element={<Game />} />
      <Route path="/win/:id"        element={<Win />} />
      <Route path="/game/:id/detail" element={<GameDetail />} />

      {/* Protected — requires account OR guest history */}
      <Route path="/history" element={<ProtectedRoute allowGuests><History /></ProtectedRoute>} />

      {/* Protected — requires account */}
      <Route path="/stats"       element={<ProtectedRoute><Stats /></ProtectedRoute>} />
      <Route path="/player/:id"  element={<ProtectedRoute><PlayerProfile /></ProtectedRoute>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
