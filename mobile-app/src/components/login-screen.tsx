import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader, Field } from '@/components/ui';
import { colors } from '@/constants/colors';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api';

export function LoginScreen({ role }: { role: 'admin' | 'student' }) {
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resetMode, setResetMode] = useState(false);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPin, setNewPin] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSeconds, setOtpSeconds] = useState(0);
  const { signIn } = useAuth();

  const digits = (value: string, max: number) => value.replace(/\D/g, '').slice(0, max);
  useEffect(() => { if (!otpSeconds) return; const timer=setInterval(() => setOtpSeconds(value => Math.max(0,value-1)),1000); return () => clearInterval(timer); }, [otpSeconds]);
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

  const requestOtp = async () => {
    setError('');
    if (code.length !== 6 || phone.length !== 10 || !/^\S+@\S+\.\S+$/.test(email)) return setError('Enter your school code, phone and registered email.');
    setBusy(true);
    try { await api.requestStudentPinReset(code, phone, email); setOtpSent(true); setOtpSeconds(300); setOtp(''); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not send OTP.'); }
    finally { setBusy(false); }
  };

  const resetPin = async () => {
    setError('');
    if (otp.length !== 4 || newPin.length !== 4) return setError('Enter the 4-digit OTP and a new 4-digit PIN.');
    setBusy(true);
    try { await api.resetStudentPin(code, phone, email, otp, newPin); setResetMode(false); setOtpSent(false); setOtpSeconds(0); setOtp(''); setNewPin(''); setPin(''); setError('PIN reset complete. You can now log in.'); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not reset PIN.'); }
    finally { setBusy(false); }
  };

  return (
    <View style={styles.page}>
      <AppHeader back />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets contentContainerStyle={styles.scroll}>
      <View style={styles.shell}>
        <View style={styles.heading}>
          <Text style={styles.kicker}>{role === 'admin' ? 'SCHOOL ADMINISTRATION' : 'STUDENT WORKSPACE'}</Text>
          <Text style={styles.title}>{role === 'admin' ? 'Admin login' : 'Student login'}</Text>
          <Text style={styles.copy}>Use the same secure credentials as the Connect Your School website.</Text>
        </View>
        <View style={styles.form}>
          <Field label="6-digit school code" value={code} onChangeText={(value) => setCode(digits(value, 6))} keyboardType="number-pad" maxLength={6} />
          {role === 'student' && <Field label="Registered phone number" value={phone} onChangeText={(value) => setPhone(digits(value, 10))} keyboardType="phone-pad" maxLength={10} />}
          {!resetMode && <Field label={`${role === 'admin' ? '6' : '4'}-digit PIN`} value={pin} onChangeText={(value) => setPin(digits(value, role === 'admin' ? 6 : 4))} keyboardType="number-pad" secureTextEntry maxLength={role === 'admin' ? 6 : 4} onSubmitEditing={login} />}
          {resetMode && <><Field label="Registered email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />{otpSent && otpSeconds > 0 && <><View style={styles.timer}><Text style={styles.timerLabel}>OTP valid for</Text><Text style={styles.timerValue}>{String(Math.floor(otpSeconds/60)).padStart(2,'0')}:{String(otpSeconds%60).padStart(2,'0')}</Text></View><Field label="4-digit OTP" value={otp} onChangeText={value => setOtp(digits(value, 4))} keyboardType="number-pad" maxLength={4}/><Field label="New 4-digit PIN" value={newPin} onChangeText={value => setNewPin(digits(value, 4))} keyboardType="number-pad" secureTextEntry maxLength={4}/></>}</>}
          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <Pressable disabled={busy} style={[styles.button, busy && styles.disabled]} onPress={resetMode ? (otpSent && otpSeconds > 0 ? resetPin : requestOtp) : login}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{resetMode ? (!otpSent || otpSeconds === 0 ? (otpSent ? 'Resend OTP' : 'Send secure OTP') : 'Verify OTP & reset PIN') : 'Open dashboard →'}</Text>}
          </Pressable>
          {role === 'student' && <Pressable onPress={() => { setResetMode(value => !value); setOtpSent(false); setOtpSeconds(0); setError(''); }}><Text style={styles.resetLink}>{resetMode ? 'Back to student login' : 'Forgot PIN? Reset with email OTP'}</Text></Pressable>}
        </View>
        <Pressable onPress={() => router.push((role === 'admin' ? '/school-register' : '/student-register') as never)}>
          <Text style={styles.register}>{role === 'admin' ? 'New school? Register here' : 'New student? Register here'}</Text>
        </Pressable>
        <Text style={styles.help}>Your app and website always use the same live account.</Text>
      </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.cream },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 16, paddingTop: 24, paddingBottom: 36 },
  shell: { width: '100%', maxWidth: 480, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 28, padding: 24, gap: 16, elevation: 5, shadowColor: colors.ink, shadowOpacity: 0.1, shadowRadius: 20 },
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
  resetLink: { color: colors.brown, textAlign: 'center', fontWeight: '800', paddingVertical: 4 },
  timer: { flexDirection:'row',justifyContent:'space-between',alignItems:'center',backgroundColor:colors.goldSoft,borderRadius:12,padding:12 }, timerLabel:{color:colors.muted,fontWeight:'700'},timerValue:{color:colors.brown,fontWeight:'900',fontSize:16},
  help: { color: colors.muted, textAlign: 'center', fontSize: 12 },
});
