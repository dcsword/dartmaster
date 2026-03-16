import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem('dm_user');
    return u ? JSON.parse(u) : null;
  });

  function login(user, token) {
    localStorage.setItem('dm_token', token);
    localStorage.setItem('dm_user', JSON.stringify(user));
    setUser(user);
  }

  function logout() {
    localStorage.removeItem('dm_token');
    localStorage.removeItem('dm_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
