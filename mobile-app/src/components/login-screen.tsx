import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Back, Brand, Field, Page } from '@/components/ui';
import { colors } from '@/constants/colors';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api';

export function LoginScreen({ role }: { role: 'admin' | 'student' }) {
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuth();

  const digits = (value: string, max: number) => value.replace(/\D/g, '').slice(0, max);
  const login = async () => {
    if (busy) return;
    setError('');
    const pinLength = role === 'admin' ? 6 : 4;
    if (code.length !== 6 || pin.length !== pinLength || (role === 'student' && phone.length !== 10)) {
      setError('Please enter all details in the correct format.');
      return;
    }
    setBusy(true);
    try {
      const authenticated = role === 'admin'
        ? await api.adminLogin(code, pin)
        : await api.studentLogin(code, phone, pin);
      await signIn(authenticated);
      router.replace(role === 'admin' ? '/admin-dashboard' : '/student-dashboard');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Login failed. Please try again.');
      setBusy(false);
    }
  };

  return (
    <Page scroll>
      <View style={styles.top}><Back /><Brand /></View>
      <View style={styles.shell}>
        <View style={styles.heading}>
          <Text style={styles.kicker}>{role === 'admin' ? 'SCHOOL ADMINISTRATION' : 'STUDENT WORKSPACE'}</Text>
          <Text style={styles.title}>{role === 'admin' ? 'Admin login' : 'Student login'}</Text>
          <Text style={styles.copy}>Use the same secure credentials as the Connect Your School website.</Text>
        </View>
        <View style={styles.form}>
          <Field label="6-digit school code" value={code} onChangeText={(value) => setCode(digits(value, 6))} keyboardType="number-pad" maxLength={6} />
          {role === 'student' && <Field label="Registered phone number" value={phone} onChangeText={(value) => setPhone(digits(value, 10))} keyboardType="phone-pad" maxLength={10} />}
          <Field label={`${role === 'admin' ? '6' : '4'}-digit PIN`} value={pin} onChangeText={(value) => setPin(digits(value, role === 'admin' ? 6 : 4))} keyboardType="number-pad" secureTextEntry maxLength={role === 'admin' ? 6 : 4} onSubmitEditing={login} />
          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <Pressable disabled={busy} style={[styles.button, busy && styles.disabled]} onPress={login}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Open dashboard  →</Text>}
          </Pressable>
        </View>
        <Pressable onPress={() => router.push((role === 'admin' ? '/school-register' : '/student-register') as never)}>
          <Text style={styles.register}>{role === 'admin' ? 'New school? Register here' : 'New student? Register here'}</Text>
        </Pressable>
        <Text style={styles.help}>Your app and website always use the same live account.</Text>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  top: { width: '100%', maxWidth: 760, paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 14 },
  shell: { width: '90%', maxWidth: 480, marginTop: 10, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 28, padding: 24, gap: 16, elevation: 5, shadowColor: colors.ink, shadowOpacity: 0.1, shadowRadius: 20 },
  heading: { gap: 8 },
  kicker: { color: colors.brown, fontSize: 11, fontWeight: '900', letterSpacing: 1.8 },
  title: { fontSize: 38, lineHeight: 43, fontWeight: '900', color: colors.ink },
  copy: { color: colors.muted, lineHeight: 21 },
  form: { gap: 14, marginTop: 4 },
  error: { color: colors.danger, fontWeight: '700', lineHeight: 19 },
  button: { minHeight: 58, justifyContent: 'center', backgroundColor: colors.ink, borderBottomWidth: 5, borderBottomColor: colors.gold, padding: 15, borderRadius: 16 },
  disabled: { opacity: 0.65 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '900', fontSize: 16 },
  register: { color: colors.brown, textAlign: 'center', fontWeight: '900', paddingVertical: 2 },
  help: { color: colors.muted, textAlign: 'center', fontSize: 12 },
});
