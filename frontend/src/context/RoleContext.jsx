import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import client from '../api/client';

// No authentication is implemented (not required by the brief). Instead, the app lets you
// pick "who you are acting as" from the seeded users, and every ticket-list / ticket-action
// request is scoped to that user's role. This is documented as an assumption in the README.
const RoleContext = createContext(null);

export function RoleProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.get('/users/');
      const list = res.data.results || res.data;
      setUsers(list);
      const stored = localStorage.getItem('currentUserId');
      const found = list.find((u) => String(u.id) === stored);
      setCurrentUser(found || list[0] || null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const switchUser = (userId) => {
    const user = users.find((u) => u.id === userId);
    setCurrentUser(user || null);
    if (user) localStorage.setItem('currentUserId', String(user.id));
  };

  return (
    <RoleContext.Provider value={{ users, currentUser, switchUser, loading, reload: loadUsers }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within a RoleProvider');
  return ctx;
}
