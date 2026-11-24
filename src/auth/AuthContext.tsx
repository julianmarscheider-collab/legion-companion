import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth, type User } from './auth';

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn(username: string, password: string): Promise<void>;
  signUp(username: string, password: string): Promise<void>;
  signOut(): Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    auth.currentUser().then((u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const value: AuthState = {
    user,
    loading,
    signIn: async (u, p) => setUser(await auth.signIn(u, p)),
    signUp: async (u, p) => setUser(await auth.signUp(u, p)),
    signOut: async () => {
      await auth.signOut();
      setUser(null);
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
