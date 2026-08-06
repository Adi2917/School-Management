import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { api } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { Back, Brand, Field, Page } from '@/components/ui';
import { colors } from '@/constants/colors';

export function LoginScreen({ role }: { role: 'admin' | 'student' }) {
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuth();

  const login = async () => {
    setError('');
    const pinLength = role === 'admin' ? 6 : 4;
    if (code.length !== 6 || pin.length !== pinLength || (role === 'student' && phone.length !== 10)) {
      setError('Please enter all details in the correct format.');
      return;
    }

    setBusy(true);
    try {
      if (role === 'admin') {
        const authenticated = await api.adminLogin(code, pin);
        await signIn(authenticated as Parameters<typeof signIn>[0]);
        router.replace('/admin-dashboard');
      } else {
        const authenticated = await api.studentLogin(code, phone, pin);
        await signIn(authenticated as Parameters<typeof signIn>[0]);
        router.replace('/student-dashboard');
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Login failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const digits = (value: string, max: number) => value.replace(/\D/g, '').slice(0, max);

  return (
    <Page scroll>
      <View style={styles.top}><Back /><Brand /></View>
      <View style={styles.shell}>
        <Text style={styles.kicker}>{role === 'admin' ? 'SCHOOL ADMINISTRATION' : 'STUDENT WORKSPACE'}</Text>
        <Text style={styles.title}>{role === 'admin' ? 'Admin login' : 'Student login'}</Text>
        <Text style={styles.copy}>Sign in using your existing Connect Your School credentials.</Text>
        <View style={styles.form}>
          <Field label="6-digit school code" value={code} onChangeText={(value) => setCode(digits(value, 6))} keyboardType="number-pad" maxLength={6} />
          {role === 'student' && (
            <Field label="Registered phone number" value={phone} onChangeText={(value) => setPhone(digits(value, 10))} keyboardType="phone-pad" maxLength={10} />
          )}
          <Field label={(role === 'admin' ? '6' : '4') + '-digit PIN'} value={pin} onChangeText={(value) => setPin(digits(value, role === 'admin' ? 6 : 4))} keyboardType="number-pad" secureTextEntry maxLength={role === 'admin' ? 6 : 4} />
          {!!error && <Text style={styles.error}>{error}</Text>}
          <Pressable disabled={busy} style={[styles.button, busy && styles.disabled]} onPress={login}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Open dashboard  →</Text>}
          </Pressable>
        </View>
        <Text style={styles.help}>Your account and school data stay synced with the website.</Text>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  top: { width: '100%', padding: 20, flexDirection: 'row', alignItems: 'center', gap: 18 },
  shell: { width: '90%', maxWidth: 480, marginTop: 35, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 30, padding: 25, gap: 10, elevation: 5, shadowOpacity: 0.1, shadowRadius: 20 },
  kicker: { color: colors.brown, fontSize: 11, fontWeight: '900', letterSpacing: 1.8 },
  title: { fontSize: 38, fontWeight: '900', color: colors.ink, marginTop: 3 },
  copy: { color: colors.muted, lineHeight: 22 },
  form: { gap: 16, marginTop: 18 },
  error: { color: colors.danger, fontWeight: '700' },
  button: { backgroundColor: colors.ink, borderBottomWidth: 5, borderBottomColor: colors.gold, padding: 17, borderRadius: 16 },
  disabled: { opacity: 0.65 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '900', fontSize: 16 },
  help: { color: colors.muted, textAlign: 'center', fontSize: 12, marginTop: 14 },
});
