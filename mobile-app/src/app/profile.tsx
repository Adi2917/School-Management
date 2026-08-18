import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { AppHeader, Avatar, Skeleton } from '@/components/ui';
import { colors } from '@/constants/colors';
import { useAuth } from '@/context/auth-context';
import { api, compressImage, mediaUrl, School, Student, type ExamFee } from '@/lib/api';

const CLASSES = ['Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

export default function ProfileScreen() {
  const { studentId } = useLocalSearchParams<{ studentId?: string }>();
  const { session, updateUser } = useAuth();
  const targetId = studentId || (session?.role === 'student' ? (session.user as Student).id : '');
  const editingSchool = session?.role === 'admin' && !targetId;
  const [school, setSchool] = useState<School | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [monthlyFees, setMonthlyFees] = useState<Record<string, string>>({});
  const [examFees, setExamFees] = useState<ExamFee[]>([]);
  const [examName, setExamName] = useState('');
  const [examType, setExamType] = useState('');
  const [examAmounts, setExamAmounts] = useState<Record<string, string>>({});

  const load = async () => {
    if (!session) return router.replace('/');
    setBusy(true);
    try {
      const [schoolRecord, studentRecord] = await Promise.all([
        api.getSchool(session.user.school_code),
        targetId ? api.getStudent(targetId) : Promise.resolve(null),
      ]);
      setSchool(schoolRecord);
      setMonthlyFees(Object.fromEntries(CLASSES.map(item => [item, String(schoolRecord?.monthly_fees?.[item] ?? '')])));
      setExamFees(schoolRecord?.exam_fees || []);
      setStudent(studentRecord);
      const source = studentRecord || schoolRecord;
      if (source) setForm(Object.fromEntries(Object.entries(source).map(([key, value]) => [key, value == null ? '' : String(value)])));
    } catch (error) {
      Alert.alert('Could not load profile', error instanceof Error ? error.message : 'Please retry.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { void load(); }, [targetId, session?.user.school_code]);

  const change = (key: string, value: string) => setForm(current => ({ ...current, [key]: value }));
  const save = async () => {
    const id = student?.id || school?.id;
    if (!id) return;
    const isStudent = Boolean(student);
    if (!isStudent && form.new_pin && !/^\d{6}$/.test(form.new_pin)) {
      return Alert.alert('Invalid PIN', 'Admin PIN must be 6 digits.');
    }
    setSaving(true);
    try {
      const fields = isStudent
        ? { name: form.name, father_name: form.father_name, number: form.number, email: form.email, address: form.address, class: form.class, section: form.section, roll: form.roll, photo_url: form.photo_url }
        : { school_name: form.school_name, admin_name: form.admin_name, admin_email: form.admin_email, phone: form.phone, location: form.location, school_logo: form.school_logo, monthly_fees: Object.fromEntries(CLASSES.map(item => [item, Number(monthlyFees[item] || 0)])), exam_fees: examFees, ...(form.new_pin ? { admin_pin: form.new_pin } : {}) };
      const updated = await api.updateRecord<Student | School>(isStudent ? 'students' : 'schools', id, fields);
      const next = updated[0];
      if (next && ((!studentId && session?.role === 'student') || editingSchool)) await updateUser(next);
      setForm(current => ({ ...current, new_pin: '' }));
      Alert.alert('Saved', 'Profile updated everywhere.');
      await load();
    } catch (error) {
      Alert.alert('Update failed', error instanceof Error ? error.message : 'Please retry.');
    } finally {
      setSaving(false);
    }
  };

  const choosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('Permission required', 'Photo access is needed to choose an image.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.75 });
    if (result.canceled) return;
    setSaving(true);
    try {
      const asset = result.assets[0];
      const compressed = await compressImage(asset.uri);
      const uploaded = await api.uploadFile(compressed, 'profile.jpg', 'image/jpeg');
      change(student ? 'photo_url' : 'school_logo', uploaded.url);
    } catch (error) {
      Alert.alert('Upload failed', error instanceof Error ? error.message : 'Please retry.');
    } finally {
      setSaving(false);
    }
  };

  const photo = form.photo_url || form.school_logo;
  const resolvedPhoto = mediaUrl(photo);
  const photoActions = () => Alert.alert(student ? 'Profile photo' : 'School logo', 'Choose an action', [
    ...(photo ? [
      { text: 'View', onPress: () => setImageOpen(true) },
      { text: 'Remove', style: 'destructive' as const, onPress: () => change(student ? 'photo_url' : 'school_logo', '') },
    ] : []),
    { text: photo ? 'Change' : 'Upload', onPress: () => { void choosePhoto(); } },
    { text: 'Cancel', style: 'cancel' as const },
  ]);

  if (!session) return null;
  const displayName = student?.name || school?.school_name || 'Profile';
  const addExamFee = () => {
    if (!examName.trim() || !examType.trim() || CLASSES.some(item => !examAmounts[item])) return Alert.alert('Complete exam fee', 'Enter exam name, type and amount for every class.');
    setExamFees(current => [...current, { id: `${Date.now()}`, name: examName.trim(), type: examType.trim(), class_amounts: Object.fromEntries(CLASSES.map(item => [item, Number(examAmounts[item])])) }]);
    setExamName(''); setExamType(''); setExamAmounts({});
  };

  return (
    <View style={styles.page}>
      <AppHeader school={school || undefined} back />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {busy ? (
          <View style={styles.card}>
            <Skeleton width={112} height={112} radius={56} />
            <Skeleton width="48%" height={28} />
            <Skeleton width="100%" height={58} />
            <Skeleton width="100%" height={58} />
            <Skeleton width="100%" height={58} />
          </View>
        ) : (
          <View style={styles.card}>
            <Pressable onPress={photoActions} style={styles.photoButton} accessibilityRole="button">
              <Avatar name={displayName} uri={photo} size={108} />
              <View style={styles.cameraBadge}><Text style={styles.cameraText}>✎</Text></View>
              <Text style={styles.photoHint}>{photo ? 'View or change photo' : 'Upload a photo'}</Text>
            </Pressable>
            <Text style={styles.kicker}>{student ? 'STUDENT PROFILE' : 'ADMIN & SCHOOL PROFILE'}</Text>
            <Text style={styles.title}>{displayName}</Text>
            <View style={styles.fields}>
              {student ? (
                <>
                  <Field label="Student name" value={form.name} onChangeText={value => change('name', value)} />
                  <Field label="Father's name" value={form.father_name} onChangeText={value => change('father_name', value)} />
                  <View style={styles.row}>
                    <Field label="Class" value={form.class} onChangeText={value => change('class', value)} compact />
                    <Field label="Section" value={form.section} onChangeText={value => change('section', value)} compact />
                    <Field label="Roll" value={form.roll} onChangeText={value => change('roll', value)} compact />
                  </View>
                  <Field label="Phone" value={form.number} onChangeText={value => change('number', value)} keyboardType="phone-pad" />
                  <Field label="Registered email" value={form.email} onChangeText={value => change('email', value.trim().toLowerCase())} keyboardType="email-address" autoCapitalize="none" />
                  <Field label="Address" value={form.address} onChangeText={value => change('address', value)} />
                </>
              ) : (
                <>
                  <Field label="School name" value={form.school_name} onChangeText={value => change('school_name', value)} />
                  <Field label="Admin name" value={form.admin_name} onChangeText={value => change('admin_name', value)} />
                  <Field label="Admin email" value={form.admin_email || form.email} onChangeText={value => change('admin_email', value)} keyboardType="email-address" />
                  <Field label="Phone" value={form.phone} onChangeText={value => change('phone', value)} keyboardType="phone-pad" />
                  <Field label="Location" value={form.location} onChangeText={value => change('location', value)} />
                  <View style={styles.configBox}><Text style={styles.configTitle}>MONTHLY FEES BY CLASS</Text>{CLASSES.map(item => <View key={item} style={styles.configRow}><Text style={styles.configLabel}>{['Nursery','LKG','UKG'].includes(item) ? item : `Class ${item}`}</Text><TextInput style={styles.amountInput} value={monthlyFees[item]} onChangeText={value => setMonthlyFees(current => ({...current,[item]:value.replace(/\D/g,'')}))} keyboardType="number-pad" placeholder="₹ amount" placeholderTextColor="#948b80"/></View>)}</View>
                  <View style={styles.configBox}><Text style={styles.configTitle}>EXAM FEE SETUP</Text><Field label="Exam name" value={examName} onChangeText={setExamName}/><Field label="Exam type" value={examType} onChangeText={setExamType}/>{CLASSES.map(item => <View key={item} style={styles.configRow}><Text style={styles.configLabel}>{['Nursery','LKG','UKG'].includes(item) ? item : `Class ${item}`}</Text><TextInput style={styles.amountInput} value={examAmounts[item] || ''} onChangeText={value => setExamAmounts(current => ({...current,[item]:value.replace(/\D/g,'')}))} keyboardType="number-pad" placeholder="₹ amount" placeholderTextColor="#948b80"/></View>)}<Pressable style={styles.addFee} onPress={addExamFee}><Text style={styles.addFeeText}>Add exam fee</Text></Pressable>{examFees.map(item => <View key={item.id} style={styles.examFeeCard}><View style={styles.flex}><Text style={styles.examFeeName}>{item.name}</Text><Text style={styles.examFeeType}>{item.type}</Text></View><Pressable onPress={() => setExamFees(current => current.filter(fee => fee.id !== item.id))}><Text style={styles.removeFee}>Remove</Text></Pressable></View>)}</View>
                </>
              )}
              {!student && <Field
                label="New 6-digit admin PIN (leave blank to keep current)"
                value={form.new_pin}
                onChangeText={value => change('new_pin', value.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                secureTextEntry
              />}
            </View>
            <Pressable disabled={saving} style={[styles.save, saving && styles.disabled]} onPress={save}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save changes</Text>}
            </Pressable>
            <Text style={styles.safe}>{student ? 'Student PIN changes are protected by email OTP from the login screen.' : 'Your current PIN stays private. Enter a new PIN only when you want to change it.'}</Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={imageOpen} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setImageOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setImageOpen(false)}>
          <Pressable style={styles.previewCard} onPress={() => undefined}>
            <Pressable onPress={() => setImageOpen(false)} style={styles.close} accessibilityLabel="Close image">
              <Text style={styles.closeText}>×</Text>
            </Pressable>
            {resolvedPhoto ? <Image source={{ uri: resolvedPhoto }} style={styles.fullImage} resizeMode="contain" /> : <Avatar name={displayName} size={220} />}
            <Text style={styles.previewName}>{displayName}</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Field({ label, compact, ...props }: React.ComponentProps<typeof TextInput> & { label: string; compact?: boolean }) {
  return (
    <View style={[styles.field, compact && styles.compactField]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor="#948b80" {...props} style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.cream },
  content: { paddingHorizontal: 18, paddingTop: 22, paddingBottom: 52, alignItems: 'center' },
  card: { width: '100%', maxWidth: 650, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 26, padding: 22, alignItems: 'center', gap: 10 },
  photoButton: { alignItems: 'center', position: 'relative' },
  cameraBadge: { position: 'absolute', right: 0, top: 76, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.gold, borderWidth: 3, borderColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  cameraText: { color: colors.ink, fontSize: 17, fontWeight: '900' },
  photoHint: { textAlign: 'center', color: colors.brown, fontWeight: '800', fontSize: 11, marginTop: 8 },
  kicker: { color: colors.brown, fontWeight: '900', fontSize: 10, letterSpacing: 1.5, marginTop: 10 },
  title: { color: colors.ink, fontSize: 30, fontWeight: '900', textAlign: 'center' },
  fields: { width: '100%', gap: 12, marginTop: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  field: { width: '100%', gap: 6 },
  configBox: { width:'100%', gap:10, padding:14, borderRadius:18, backgroundColor:colors.goldSoft }, configTitle:{color:colors.brown,fontWeight:'900',letterSpacing:1.2,fontSize:11}, configRow:{flexDirection:'row',alignItems:'center',gap:10,backgroundColor:colors.paper,padding:10,borderRadius:12}, configLabel:{flex:1,color:colors.ink,fontWeight:'800'}, amountInput:{width:120,minHeight:44,borderWidth:1,borderColor:colors.line,borderRadius:10,paddingHorizontal:10,color:colors.ink,backgroundColor:'#fbf7ef'}, addFee:{backgroundColor:colors.ink,borderRadius:12,padding:14},addFeeText:{color:'#fff',fontWeight:'900',textAlign:'center'},examFeeCard:{flexDirection:'row',alignItems:'center',backgroundColor:colors.paper,borderRadius:12,padding:12},flex:{flex:1},examFeeName:{fontWeight:'900',color:colors.ink},examFeeType:{color:colors.muted,fontSize:12,marginTop:3},removeFee:{color:colors.danger,fontWeight:'900'},
  compactField: { flex: 1, minWidth: 88 },
  label: { color: colors.ink, fontWeight: '800', fontSize: 12 },
  input: { minHeight: 52, backgroundColor: '#fbf7ef', borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, color: colors.ink, fontSize: 15 },
  save: { width: '100%', minHeight: 54, backgroundColor: colors.ink, borderBottomWidth: 5, borderBottomColor: colors.gold, borderRadius: 15, marginTop: 10, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.65 },
  saveText: { color: '#fff', fontWeight: '900', textAlign: 'center', fontSize: 16 },
  safe: { color: colors.muted, fontSize: 11, textAlign: 'center', lineHeight: 16, maxWidth: 430 },
  overlay: { flex: 1, backgroundColor: 'rgba(24,21,17,.88)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  previewCard: { width: '100%', maxWidth: 480, height: '64%', maxHeight: 560, minHeight: 320, backgroundColor: colors.paper, borderRadius: 28, padding: 18, alignItems: 'center', justifyContent: 'center' },
  fullImage: { width: '100%', height: '82%', borderRadius: 20 },
  close: { position: 'absolute', top: 12, right: 12, zIndex: 2, width: 42, height: 42, borderRadius: 21, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 27, lineHeight: 29, fontWeight: '900', color: '#fff' },
  previewName: { color: colors.ink, fontWeight: '900', fontSize: 18, marginTop: 10 },
});
