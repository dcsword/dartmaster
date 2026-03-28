import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../utils/api';
import WinSummaryCards from '../components/win/WinSummaryCards';
import '../styles/win.css';

export default function Win() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { winnerName, teamName, result } = location.state || {};
  const [game, setGame] = useState(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    api.getGame(id)
      .then(setGame)
      .catch(err => {
        console.warn('Could not load finished game:', err.message);
        setLoadError('Could not load match details');
      });
  }, [id]);

  const displayName = teamName || winnerName || 'Winner';
  const checkoutDart = result?.turnResult?.checkoutDart;

  return (
    <div className="win-page">
      <div className="win-trophy">🏆</div>

      <div>
        <div className="label-xs win-winner-label">Match winner</div>
        <h1 className="win-title">{displayName}</h1>
        <p className="win-subtitle">WINS THE MATCH!</p>
      </div>

      {loadError && <p className="win-load-error">{loadError}</p>}
      {game && <WinSummaryCards game={game} checkoutDart={checkoutDart} />}

      <div className="win-actions">
        <button className="btn-primary win-primary" onClick={() => navigate('/setup')}>
          PLAY AGAIN
        </button>
        <button className="btn-ghost" onClick={() => navigate('/history')}>View History</button>
        <button className="btn-ghost" onClick={() => navigate('/')}>Home</button>
      </div>
    </div>
  );
}
