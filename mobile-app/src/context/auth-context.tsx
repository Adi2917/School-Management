import * as SecureStore from 'expo-secure-store';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { setAccessToken, type School, type Session as ApiSession, type Student } from '@/lib/api';

const KEY = 'connect-your-school-session-v1';
export type Session = ApiSession;
type AuthValue = { session: Session | null; loading: boolean; signIn: (value: Session) => Promise<void>; signOut: () => Promise<void>; updateUser: (user: School | Student) => Promise<void> };
const AuthContext = createContext<AuthValue | null>(null);

function withoutPin<T extends School | Student>(user: T): T {
  const safeUser = { ...user };
  if ('admin_pin' in safeUser) delete safeUser.admin_pin;
  if ('pin' in safeUser) delete safeUser.pin;
  return safeUser;
}

function tokenSubject(token: string) { try { const payload=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'); return String(JSON.parse(globalThis.atob(payload)).subject || ''); } catch { return ''; } }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { Promise.race<string | null>([SecureStore.getItemAsync(KEY), new Promise(resolve => setTimeout(() => resolve(null), 1800))]).then(value => {
    if (!value) return;
    const saved = JSON.parse(value) as Session;
    if (!saved?.token || !saved?.user || !['admin', 'student'].includes(saved.role)) {
      return SecureStore.deleteItemAsync(KEY);
    }
    const normalized = saved.role === 'student' && !(saved.user as Student).id ? { ...saved, user: { ...saved.user, id: tokenSubject(saved.token) } } as Session : saved;
    setAccessToken(normalized.token);
    setSession(normalized);
  }).catch(() => SecureStore.deleteItemAsync(KEY)).finally(() => setLoading(false)); }, []);
  const signIn = useCallback(async (value: Session) => {
    if (!value?.token || !value?.user || !['admin', 'student'].includes(value.role)) throw new Error('Invalid login session. Please try again.');
    const safeSession = { ...value, user: withoutPin(value.user) } as Session;
    setAccessToken(safeSession.token);
    await SecureStore.setItemAsync(KEY, JSON.stringify(safeSession));
    setSession(safeSession);
  }, []);
  const signOut = useCallback(async () => { setAccessToken(); setSession(null); await SecureStore.deleteItemAsync(KEY); }, []);
  const updateUser = useCallback(async (user: School | Student) => {
    if (!session) return;
    await signIn({ ...session, user } as Session);
  }, [session, signIn]);
  const value = useMemo(() => ({ session, loading, signIn, signOut, updateUser }), [session, loading, signIn, signOut, updateUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('AuthProvider missing'); return value; }
