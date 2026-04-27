import React, { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem('ch_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = useCallback(async (username, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (data.success) {
      const userData = { username: data.username, role: 'ADMIN' };
      sessionStorage.setItem('ch_user', JSON.stringify(userData));
      setUser(userData);
      return { success: true };
    }
    return { success: false, message: data.message };
  }, []);

  const crewLogin = useCallback(async (phone, password) => {
    const res = await fetch('/api/helpers/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password }),
    });
    const data = await res.json();
    if (data.success) {
      const userData = {
        id: data.id,
        username: `${data.firstName} ${data.lastName}`,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        category: data.category,
        role: 'CREW',
      };
      sessionStorage.setItem('ch_user', JSON.stringify(userData));
      setUser(userData);
      return { success: true };
    }
    return { success: false, message: data.message };
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem('ch_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, crewLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
