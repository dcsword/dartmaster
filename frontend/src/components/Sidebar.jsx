import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const path = location.pathname;

  const items = [
    {
      label: 'Play',
      route: '/',
      active: path === '/' || path === '/setup' || path === '/join',
      icon: (active) => (
        <svg viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--accent)' : 'var(--muted)'} strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>
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
    {
      label: 'Guide',
      route: '/help',
      active: path === '/help',
      icon: (active) => (
        <svg viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--accent)' : 'var(--muted)'} strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
          <circle cx="12" cy="17" r="0.5" fill={active ? 'var(--accent)' : 'var(--muted)'} stroke="none"/>
        </svg>
      ),
    },
  ];

  return (
    <nav className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div style={{ fontFamily: 'Barlow Condensed', fontSize: '22px', fontWeight: 800, color: 'var(--text)', lineHeight: 1, letterSpacing: '0.02em' }}>
          DART<span style={{ color: 'var(--accent)' }}>MASTER</span>
        </div>
        <div className="label-xs" style={{ marginTop: '4px' }}>501 scoring</div>
      </div>

      {/* Nav items */}
      <div className="sidebar-nav">
        {items.map(item => (
          <button key={item.label} className={`sidebar-item ${item.active ? 'active' : ''}`} onClick={() => navigate(item.route)}>
            {item.icon(item.active)}
            {item.label}
            {item.active && <div className="sidebar-dot" />}
          </button>
        ))}
      </div>

      {/* User footer */}
      <div className="sidebar-footer">
        {user ? (
          <div>
            <div className="sidebar-user" onClick={() => navigate(`/player/${user.id}`)}>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: user.avatar_color || 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {user.name[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                {user.username && <div style={{ fontSize: '11px', color: 'var(--accent)' }}>@{user.username}</div>}
              </div>
            </div>
            <button onClick={logout} style={{ background: 'none', color: 'var(--muted)', fontSize: '11px', marginTop: '8px', textDecoration: 'underline', textAlign: 'left', padding: '0' }}>
              Sign out
            </button>
          </div>
        ) : (
          <button className="btn-primary" style={{ fontSize: '13px', padding: '10px' }} onClick={() => navigate('/login')}>
            Sign In
          </button>
        )}
      </div>
    </nav>
  );
}
