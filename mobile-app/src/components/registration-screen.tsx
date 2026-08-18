import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader, Field } from '@/components/ui';
import { colors } from '@/constants/colors';
import { api, compressImage, type School, type Student } from '@/lib/api';

const classes = ['Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
const sections = ['A', 'B', 'C'];

type SchoolForm = { school_name: string; admin_name: string; email: string; phone: string; school_code: string; admin_pin: string; location: string };
type StudentForm = { name: string; father_name: string; number: string; email: string; school_code: string; class: string; section: string; roll: string; pin: string; address: string };
const emptySchool: SchoolForm = { school_name: '', admin_name: '', email: '', phone: '', school_code: '', admin_pin: '', location: '' };
const emptyStudent: StudentForm = { name: '', father_name: '', number: '', email: '', school_code: '', class: '', section: '', roll: '', pin: '', address: '' };

export function RegistrationScreen({ role }: { role: 'school' | 'student' }) {
  const [schoolForm, setSchoolForm] = useState(emptySchool);
  const [studentForm, setStudentForm] = useState(emptyStudent);
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset>();
  const [school, setSchool] = useState<School | null>(null);
  const [busy, setBusy] = useState(false);
  const [monthlyFees, setMonthlyFees] = useState<Record<string, string>>(Object.fromEntries(classes.map(item => [item, ''])));
  const isSchool = role === 'school';
  const title = isSchool ? 'Register your school' : 'Student registration';
  const subtitle = isSchool ? 'Create a secure school workspace for administrators and students.' : 'Join your registered school using its unique school code.';
  const previewLabel = useMemo(() => asset ? (isSchool ? 'School logo selected' : 'Student photo selected') : (isSchool ? 'Add school logo (optional)' : 'Add student photo (optional)'), [asset, isSchool]);

  const update = (key: string, value: string) => {
    if (isSchool) setSchoolForm(current => ({ ...current, [key]: value }));
    else setStudentForm(current => ({ ...current, [key]: value }));
  };
  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('Photo permission needed', 'Allow photo access to choose an image.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.78 });
    if (!result.canceled) setAsset(result.assets[0]);
  };
  const findSchool = async (code = studentForm.school_code) => {
    if (!/^\d{6}$/.test(code)) { setSchool(null); return null; }
    const found = await api.getSchool(code); setSchool(found); return found;
  };
  const upload = async () => {
    if (!asset) return '';
    const compressed = await compressImage(asset.uri);
    return (await api.uploadFile(compressed, `${role}-photo.jpg`, 'image/jpeg')).url;
  };
  const submitSchool = async () => {
    const value = schoolForm;
    if (!value.school_name.trim() || !value.admin_name.trim() || !value.email.trim() || !value.location.trim()) throw new Error('Please complete every required field.');
    if (!/^\S+@\S+\.\S+$/.test(value.email.trim())) throw new Error('Enter a valid admin email.');
    if (!/^\d{10}$/.test(value.phone)) throw new Error('Phone number must contain 10 digits.');
    if (!/^\d{6}$/.test(value.school_code)) throw new Error('School code must contain 6 digits.');
    if (!/^\d{6}$/.test(value.admin_pin)) throw new Error('Admin PIN must contain 6 digits.');
    if (await api.getSchool(value.school_code)) throw new Error('This school code is already registered. Please choose another code.');
    const school_logo = await upload();
    if (classes.some(item => !monthlyFees[item] || Number(monthlyFees[item]) < 0)) throw new Error('Enter the monthly fee for every class from Nursery to 10th.');
    await api.createRecord<School>('schools', { ...value, admin_email: value.email.trim().toLowerCase(), email: value.email.trim().toLowerCase(), school_name: value.school_name.trim(), admin_name: value.admin_name.trim(), location: value.location.trim(), school_logo, monthly_fees: Object.fromEntries(classes.map(item => [item, Number(monthlyFees[item])])) });
    Alert.alert('School registered', 'Your school workspace is ready. Sign in with the school code and admin PIN.', [{ text: 'Open login', onPress: () => router.replace('/admin-login') }]);
  };
  const submitStudent = async () => {
    const value = studentForm;
    if (!value.name.trim() || !value.father_name.trim() || !value.roll.trim() || !value.address.trim() || !value.class || !value.section) throw new Error('Please complete every required field.');
    if (!/^\d{10}$/.test(value.number)) throw new Error('Phone number must contain 10 digits.');
    if (!/^\S+@\S+\.\S+$/.test(value.email.trim())) throw new Error('Enter the student registered email for secure PIN recovery.');
    if (!/^\d{6}$/.test(value.school_code)) throw new Error('School code must contain 6 digits.');
    if (!/^\d{4}$/.test(value.pin)) throw new Error('Student PIN must contain 4 digits.');
    const matched = school || await findSchool();
    if (!matched) throw new Error('No registered school was found for this code.');
    const photo_url = await upload();
    await api.createRecord<Student>('students', { ...value, email: value.email.trim().toLowerCase(), name: value.name.trim(), father_name: value.father_name.trim(), roll: value.roll.trim(), address: value.address.trim(), school_name: matched.school_name, school_logo: matched.school_logo || '', photo_url });
    Alert.alert('Student registered', 'Sign in with the same school code, phone number and PIN.', [{ text: 'Open login', onPress: () => router.replace('/student-login') }]);
  };
  const submit = async () => {
    if (busy) return; setBusy(true);
    try { if (isSchool) await submitSchool(); else await submitStudent(); }
    catch (error) { Alert.alert('Registration failed', error instanceof Error ? error.message : 'Please try again.'); }
    finally { setBusy(false); }
  };

  return <View style={styles.page}>
    <AppHeader back />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
    <View style={styles.shell}>
    <View style={styles.hero}><Text style={styles.kicker}>{isSchool ? 'SCHOOL ONBOARDING' : 'STUDENT ONBOARDING'}</Text><Text style={styles.title}>{title}</Text><Text style={styles.subtitle}>{subtitle}</Text></View>
    <View style={styles.card}>
      {isSchool ? <>
        <Field label="School name" value={schoolForm.school_name} onChangeText={v => update('school_name', v)} autoCapitalize="words" />
        <Field label="Administrator name" value={schoolForm.admin_name} onChangeText={v => update('admin_name', v)} autoCapitalize="words" />
        <Field label="Administrator email" value={schoolForm.email} onChangeText={v => update('email', v.trim())} keyboardType="email-address" />
        <Field label="Phone number" value={schoolForm.phone} onChangeText={v => update('phone', v.replace(/\D/g, '').slice(0, 10))} keyboardType="number-pad" maxLength={10} />
        <Field label="6-digit school code" value={schoolForm.school_code} onChangeText={v => update('school_code', v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} />
        <Field label="6-digit admin PIN" value={schoolForm.admin_pin} onChangeText={v => update('admin_pin', v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" secureTextEntry maxLength={6} />
        <Field label="School address" value={schoolForm.location} onChangeText={v => update('location', v)} autoCapitalize="sentences" multiline />
        <View style={styles.feeBox}><Text style={styles.feeTitle}>MONTHLY FEE STRUCTURE</Text><Text style={styles.feeCopy}>Set the default monthly amount once. Each student's ledger will use the amount for their class.</Text>{classes.map(item => <View key={item} style={styles.feeRow}><Text style={styles.feeClass}>{item === 'Nursery' || item === 'LKG' || item === 'UKG' ? item : `Class ${item}`}</Text><Field label="Amount (₹)" value={monthlyFees[item]} onChangeText={value => setMonthlyFees(current => ({ ...current, [item]: value.replace(/\D/g, '') }))} keyboardType="number-pad" /></View>)}</View>
      </> : <>
        <Field label="6-digit school code" value={studentForm.school_code} onChangeText={v => { const code = v.replace(/\D/g, '').slice(0, 6); update('school_code', code); if (code.length === 6) findSchool(code).catch(() => setSchool(null)); else setSchool(null); }} keyboardType="number-pad" maxLength={6} />
        {studentForm.school_code.length === 6 && <View style={[styles.schoolResult, !school && styles.schoolMissing]}><Text style={styles.schoolResultLabel}>{school ? 'JOINING SCHOOL' : 'SCHOOL CHECK'}</Text><Text style={styles.schoolResultName}>{school?.school_name || 'Code will be verified on submit'}</Text></View>}
        <Field label="Student name" value={studentForm.name} onChangeText={v => update('name', v)} autoCapitalize="words" />
        <Field label="Father's name" value={studentForm.father_name} onChangeText={v => update('father_name', v)} autoCapitalize="words" />
        <Field label="Registered phone number" value={studentForm.number} onChangeText={v => update('number', v.replace(/\D/g, '').slice(0, 10))} keyboardType="number-pad" maxLength={10} />
        <Field label="Registered email (used for secure PIN reset)" value={studentForm.email} onChangeText={v => update('email', v.trim().toLowerCase())} keyboardType="email-address" autoCapitalize="none" />
        <Text style={styles.optionLabel}>CLASS</Text><View style={styles.options}>{classes.map(item => <Choice key={item} label={item} active={studentForm.class === item} onPress={() => update('class', item)} />)}</View>
        <Text style={styles.optionLabel}>SECTION</Text><View style={styles.options}>{sections.map(item => <Choice key={item} label={item} active={studentForm.section === item} onPress={() => update('section', item)} />)}</View>
        <Field label="Roll number" value={studentForm.roll} onChangeText={v => update('roll', v.replace(/\D/g, '').slice(0, 5))} keyboardType="number-pad" />
        <Field label="4-digit student PIN" value={studentForm.pin} onChangeText={v => update('pin', v.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" secureTextEntry maxLength={4} />
        <Field label="Home address" value={studentForm.address} onChangeText={v => update('address', v)} autoCapitalize="sentences" multiline />
      </>}
      <Pressable onPress={pickImage} style={styles.upload}>{asset ? <Image source={{ uri: asset.uri }} style={styles.preview} /> : <View style={styles.previewFallback}><Text style={styles.previewIcon}>+</Text></View>}<View style={styles.uploadCopy}><Text style={styles.uploadTitle}>{previewLabel}</Text><Text style={styles.uploadHint}>JPG, PNG or WebP · square image recommended</Text></View></Pressable>
      <Pressable disabled={busy} onPress={submit} style={[styles.submit, busy && styles.disabled]}><Text style={styles.submitText}>{busy ? 'Registering securely…' : (isSchool ? 'Create school workspace' : 'Complete registration')}</Text></Pressable>
      <Pressable onPress={() => router.replace(isSchool ? '/admin-login' : '/student-login')}><Text style={styles.loginLink}>Already registered? Open login</Text></Pressable>
    </View>
    </View>
    </ScrollView>
  </View>;
}

function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.choice, active && styles.choiceActive]}><Text style={styles.choiceText}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.cream },
  scroll: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 16, paddingTop: 22, paddingBottom: 40 },
  shell: { width: '100%', maxWidth: 680, gap: 20 }, hero: { gap: 8, paddingHorizontal: 4 },
  kicker: { color: colors.brown, fontWeight: '900', letterSpacing: 1.6, fontSize: 10 }, title: { color: colors.ink, fontWeight: '900', fontSize: 38, lineHeight: 42, letterSpacing: -1 }, subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  card: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 26, padding: 20, gap: 17, shadowColor: '#342c20', shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 5 },
  schoolResult: { backgroundColor: colors.goldSoft, borderColor: '#e5c36d', borderWidth: 1, borderRadius: 15, padding: 13, gap: 3 }, schoolMissing: { backgroundColor: '#fbf7ef', borderColor: colors.line }, schoolResultLabel: { color: colors.brown, fontSize: 9, letterSpacing: 1.3, fontWeight: '900' }, schoolResultName: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  optionLabel: { color: colors.brown, fontSize: 10, letterSpacing: 1.3, fontWeight: '900', marginBottom: -8 }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, choice: { minWidth: 48, paddingHorizontal: 13, paddingVertical: 11, alignItems: 'center', borderRadius: 13, backgroundColor: '#fbf7ef', borderWidth: 1, borderColor: colors.line }, choiceActive: { backgroundColor: colors.gold, borderColor: colors.gold }, choiceText: { color: colors.ink, fontWeight: '800' },
  feeBox: { gap: 12, backgroundColor: colors.goldSoft, borderRadius: 18, padding: 14 }, feeTitle: { color: colors.brown, fontWeight: '900', letterSpacing: 1.2, fontSize: 11 }, feeCopy: { color: colors.muted, lineHeight: 18, fontSize: 12 }, feeRow: { backgroundColor: colors.paper, borderRadius: 14, padding: 12, gap: 8 }, feeClass: { color: colors.ink, fontWeight: '900', fontSize: 16 },
  upload: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: '#fbf7ef', borderWidth: 1, borderStyle: 'dashed', borderColor: '#d6a64b', padding: 12, borderRadius: 16 }, preview: { width: 58, height: 58, borderRadius: 29 }, previewFallback: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center' }, previewIcon: { color: colors.brown, fontSize: 29, lineHeight: 31 }, uploadCopy: { flex: 1, gap: 3 }, uploadTitle: { color: colors.ink, fontWeight: '900', fontSize: 14 }, uploadHint: { color: colors.muted, fontSize: 10, lineHeight: 14 },
  submit: { minHeight: 58, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink, borderRadius: 16, borderBottomWidth: 6, borderBottomColor: colors.gold }, disabled: { opacity: 0.65 }, submitText: { color: '#fff', fontWeight: '900', fontSize: 16 }, loginLink: { color: colors.brown, fontWeight: '800', textAlign: 'center', paddingVertical: 5 },
});
