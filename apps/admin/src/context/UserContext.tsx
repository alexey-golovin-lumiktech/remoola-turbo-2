'use client';
import { createContext, useContext, useState, useEffect } from 'react';

export type Role = `superadmin` | `admin` | `client`;
export type User = { id: string; email: string; role: Role };
export type MeResponse = { sub: string; email: string; role: Role; iat: number; exp: number };
export const UserContext = createContext<User | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch(`/api/me`, { credentials: `include` })
      .then((r) => {
        if (r.ok) return r.json();
        return null;
      })
      .then((json) => {
        if (json?.data) {
          const { data } = json;
          setUser((prev) => ({ ...prev, id: data.sub, role: data.role, email: data.email }));
        } else setUser(null);
      });
  }, []);

  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export const useUser = () => useContext(UserContext);
