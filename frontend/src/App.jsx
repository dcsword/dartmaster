import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
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

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/game/:id" element={<Game />} />
          <Route path="/win/:id" element={<Win />} />
          <Route path="/history" element={<History />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/login" element={<Login />} />
          <Route path="/player/:id" element={<PlayerProfile />} />
          <Route path="/game/:id/detail" element={<GameDetail />} />
          <Route path="/join" element={<JoinRoom />} />
          <Route path="/join/:code" element={<JoinRoom />} />
          <Route path="/help" element={<Help />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
