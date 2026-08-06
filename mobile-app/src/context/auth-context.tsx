import * as SecureStore from 'expo-secure-store';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { setAccessToken, type School, type Student } from '@/lib/api';

const KEY = 'connect-your-school-session-v1';
export type Session = ({ role: 'admin'; user: School } | { role: 'student'; user: Student }) & { token: string };
type AuthValue = { session: Session | null; loading: boolean; signIn: (value: Session) => Promise<void>; signOut: () => Promise<void>; updateUser: (user: School | Student) => Promise<void> };
const AuthContext = createContext<AuthValue | null>(null);

function withoutPin<T extends School | Student>(user: T): T {
  const safeUser = { ...user };
  if ('admin_pin' in safeUser) delete safeUser.admin_pin;
  if ('pin' in safeUser) delete safeUser.pin;
  return safeUser;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { SecureStore.getItemAsync(KEY).then(value => { if (value) { const saved = JSON.parse(value) as Session; setAccessToken(saved.token); setSession(saved); } }).catch(() => {}).finally(() => setLoading(false)); }, []);
  const signIn = async (value: Session) => {
    const safeSession = { ...value, user: withoutPin(value.user) } as Session;
    setAccessToken(safeSession.token);
    await SecureStore.setItemAsync(KEY, JSON.stringify(safeSession));
    setSession(safeSession);
  };
  const signOut = async () => { await SecureStore.deleteItemAsync(KEY); setAccessToken(); setSession(null); };
  const updateUser = async (user: School | Student) => { if (!session) return; await signIn({ ...session, user } as Session); };
  return <AuthContext.Provider value={{ session, loading, signIn, signOut, updateUser }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('AuthProvider missing'); return value; }
