import React, { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

const PROFILES = {
  recruiter: {
    id: 'recruiter-001',
    name: 'Sarah Mitchell',
    role: 'recruiter',
    title: 'Senior Recruitment Consultant',
    avatar: 'SM',
    email: 'sarah.mitchell@xlventures.io',
  },
  client: {
    id: 'client-001',
    name: 'James Crawford',
    role: 'client',
    title: 'VP of Engineering',
    avatar: 'JC',
    email: 'j.crawford@techcorp.com',
    company: 'TechCorp Inc.',
  },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = useCallback((role) => {
    const profile = PROFILES[role];
    if (profile) {
      setUser(profile);
      setIsAuthenticated(true);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const switchRole = useCallback((role) => {
    login(role);
  }, [login]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { PROFILES };
