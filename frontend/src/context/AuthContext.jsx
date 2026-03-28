import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { setRefreshFn } from '../utils/api';

const AuthContext = createContext(null);

const THEME_COLORS = {
  '#e8293c': { accent: '#e8293c', tint: 'rgba(232,41,60,0.1)',  glow: 'rgba(232,41,60,0.25)' },
  '#00d4ff': { accent: '#00d4ff', tint: 'rgba(0,212,255,0.1)',  glow: 'rgba(0,212,255,0.25)' },
  '#f0a030': { accent: '#f0a030', tint: 'rgba(240,160,48,0.1)', glow: 'rgba(240,160,48,0.25)' },
  '#2dcb75': { accent: '#2dcb75', tint: 'rgba(45,203,117,0.1)', glow: 'rgba(45,203,117,0.25)' },
};

export function applyTheme(color) {
  const theme = THEME_COLORS[color] || THEME_COLORS['#e8293c'];
  const root = document.documentElement;
  root.style.setProperty('--accent',      theme.accent);
  root.style.setProperty('--accent-tint', theme.tint);
  root.style.setProperty('--accent-glow', theme.glow);
}

function readStoredJson(key, fallbackValue) {
  try {
    return JSON.parse(localStorage.getItem(key) || fallbackValue);
  } catch {
    return JSON.parse(fallbackValue);
  }
}

// Apply on initial load from localStorage
const storedUser = localStorage.getItem('dm_user');
if (storedUser) {
  try {
    const parsedUser = JSON.parse(storedUser);
    if (parsedUser?.theme_color) applyTheme(parsedUser.theme_color);
  } catch (err) {
    console.warn('Could not restore saved theme:', err.message);
  }
}

export function AuthProvider({ children }) {
  // Wire the refresh function into api.js so it can auto-refresh tokens
  // We do this lazily to avoid circular imports
  const [user, setUser] = useState(() => readStoredJson('dm_user', 'null'));
  const refreshInFlight = useRef(null);

  function login(userData, token, refreshToken) {
    localStorage.setItem('dm_token', token);
    if (refreshToken) localStorage.setItem('dm_refresh_token', refreshToken);
    localStorage.setItem('dm_user', JSON.stringify(userData));
    setUser(userData);
    if (userData?.theme_color) applyTheme(userData.theme_color);
    else applyTheme('#e8293c');
  }

  function logout() {
    // Tell backend to revoke the refresh token
    const refreshToken = localStorage.getItem('dm_refresh_token');
    if (refreshToken) {
      fetch(`${import.meta.env.VITE_API_URL || '/api'}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      }).catch(err => {
        console.warn('Logout request failed:', err.message);
      });
    }
    localStorage.removeItem('dm_token');
    localStorage.removeItem('dm_refresh_token');
    localStorage.removeItem('dm_user');
    setUser(null);
    applyTheme('#e8293c');
  }

  // Called by api.js when it gets a TOKEN_EXPIRED response
  // Returns new access token or null if refresh fails
  async function refreshAccessToken() {
    const refreshToken = localStorage.getItem('dm_refresh_token');
    if (!refreshToken) return null;

    // Deduplicate concurrent refresh calls
    if (refreshInFlight.current) return refreshInFlight.current;

    refreshInFlight.current = (async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        const refreshPayload = await response.json();
        if (!response.ok) throw new Error(refreshPayload.error);
        localStorage.setItem('dm_token', refreshPayload.token);
        return refreshPayload.token;
      } catch (err) {
        console.warn('Access token refresh failed:', err.message);
        // Refresh failed — log out
        logout();
        return null;
      } finally {
        refreshInFlight.current = null;
      }
    })();

    return refreshInFlight.current;
  }

  // Register refresh function with api.js so requests can retry once on expiry.
  useEffect(() => {
    setRefreshFn(refreshAccessToken);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, applyTheme, refreshAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
