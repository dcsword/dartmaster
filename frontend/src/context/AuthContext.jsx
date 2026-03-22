import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

const THEME_COLORS = {
  '#e8293c': { accent: '#e8293c', tint: 'rgba(232,41,60,0.1)',  glow: 'rgba(232,41,60,0.25)' },
  '#00d4ff': { accent: '#00d4ff', tint: 'rgba(0,212,255,0.1)',  glow: 'rgba(0,212,255,0.25)' },
  '#f0a030': { accent: '#f0a030', tint: 'rgba(240,160,48,0.1)', glow: 'rgba(240,160,48,0.25)' },
  '#2dcb75': { accent: '#2dcb75', tint: 'rgba(45,203,117,0.1)', glow: 'rgba(45,203,117,0.25)' },
};

function applyTheme(color) {
  const theme = THEME_COLORS[color] || THEME_COLORS['#e8293c'];
  const root = document.documentElement;
  root.style.setProperty('--accent',      theme.accent);
  root.style.setProperty('--accent-tint', theme.tint);
  root.style.setProperty('--accent-glow', theme.glow);
}

// Apply on initial load from localStorage
const stored = localStorage.getItem('dm_user');
if (stored) {
  try {
    const u = JSON.parse(stored);
    if (u?.theme_color) applyTheme(u.theme_color);
  } catch {}
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem('dm_user');
    return u ? JSON.parse(u) : null;
  });

  function login(userData, token) {
    localStorage.setItem('dm_token', token);
    localStorage.setItem('dm_user', JSON.stringify(userData));
    setUser(userData);
    // Apply theme immediately on login
    if (userData?.theme_color) applyTheme(userData.theme_color);
    else applyTheme('#e8293c');
  }

  function logout() {
    localStorage.removeItem('dm_token');
    localStorage.removeItem('dm_user');
    setUser(null);
    applyTheme('#e8293c'); // reset to default red on logout
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, applyTheme }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
