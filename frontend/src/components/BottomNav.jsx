import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const path = location.pathname;

  const items = [
    {
      label: 'Play',
      route: '/',
      active: path === '/' || path === '/setup',
      icon: (active) => (
        <svg viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--accent)' : 'var(--muted)'} strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="9"/>
          <circle cx="12" cy="12" r="4"/>
          <circle cx="12" cy="12" r="1.5" fill={active ? 'var(--accent)' : 'var(--muted)'} stroke="none"/>
        </svg>
      ),
    },
    {
      label: 'History',
      route: '/history',
      active: path === '/history' || path.includes('/detail'),
      icon: (active) => (
        <svg viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--accent)' : 'var(--muted)'} strokeWidth="2" strokeLinecap="round">
          <rect x="3" y="4" width="18" height="16" rx="2"/>
          <line x1="3" y1="9" x2="21" y2="9"/>
          <line x1="8" y1="14" x2="12" y2="14"/>
          <line x1="8" y1="17" x2="16" y2="17"/>
        </svg>
      ),
    },
    {
      label: 'Stats',
      route: '/stats',
      active: path === '/stats',
      icon: (active) => (
        <svg viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--accent)' : 'var(--muted)'} strokeWidth="2" strokeLinecap="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
      ),
    },
    {
      label: 'Profile',
      route: user ? `/player/${user.id}` : '/login',
      active: path.startsWith('/player') || path === '/login',
      icon: (active) => (
        <svg viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--accent)' : 'var(--muted)'} strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="8" r="4"/>
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
        </svg>
      ),
    },
  ];

  return (
    <nav className="bottom-nav">
      {items.map(item => (
        <button key={item.label} className={`nav-item ${item.active ? 'active' : ''}`} onClick={() => navigate(item.route)}>
          <div className="nav-icon-wrap">{item.icon(item.active)}</div>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
