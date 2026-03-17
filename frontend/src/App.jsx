import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import Setup from './pages/Setup';
import Game from './pages/Game';
import Win from './pages/Win';
import History from './pages/History';
import Login from './pages/Login';
import PlayerProfile from './pages/PlayerProfile';
import GameDetail from './pages/GameDetail';
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
          <Route path="/login" element={<Login />} />
          <Route path="/player/:id" element={<PlayerProfile />} />
          <Route path="/game/:id/detail" element={<GameDetail />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
