import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Avatar, Back, Brand } from '@/components/ui';
import { colors } from '@/constants/colors';
import { useAuth } from '@/context/auth-context';
import { api, School, Student } from '@/lib/api';

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
  const editable = session?.role === 'student' || session?.role === 'admin';

  const load = async () => {
    if (!session) return router.replace('/');
    setBusy(true);
    try {
      const [schoolRecord, studentRecord] = await Promise.all([api.getSchool(session.user.school_code), targetId ? api.getStudent(targetId) : Promise.resolve(null)]);
      setSchool(schoolRecord); setStudent(studentRecord);
      const source = studentRecord || schoolRecord;
      if (source) setForm(Object.fromEntries(Object.entries(source).map(([key, value]) => [key, value == null ? '' : String(value)])));
    } finally { setBusy(false); }
  };
  useEffect(() => { void load(); }, [targetId, session?.user.school_code]);
  const change = (key: string, value: string) => setForm(current => ({ ...current, [key]: value }));
  const save = async () => {
    const id = student?.id || school?.id;
    if (!id) return;
    const isStudent = Boolean(student);
    if (form.new_pin && !new RegExp(`^\\d{${isStudent ? 4 : 6}}$`).test(form.new_pin)) return Alert.alert('Invalid PIN', `PIN must be ${isStudent ? 4 : 6} digits.`);
    setSaving(true);
    try {
      const fields = isStudent
        ? { name: form.name, father_name: form.father_name, number: form.number, address: form.address, class: form.class, section: form.section, roll: form.roll, photo_url: form.photo_url, ...(form.new_pin ? { pin: form.new_pin } : {}) }
        : { school_name: form.school_name, admin_name: form.admin_name, admin_email: form.admin_email, phone: form.phone, location: form.location, school_logo: form.school_logo, ...(form.new_pin ? { admin_pin: form.new_pin } : {}) };
      const updated = await api.updateRecord<Student | School>(isStudent ? 'students' : 'schools', id, fields);
      const next = updated[0]; if (next && ((!studentId && session?.role === 'student') || editingSchool)) await updateUser(next);
      setForm(current => ({ ...current, new_pin: '' })); Alert.alert('Saved', 'Profile updated everywhere.'); await load();
    } catch (error) { Alert.alert('Update failed', error instanceof Error ? error.message : 'Please retry.'); }
    finally { setSaving(false); }
  };
  const choosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('Permission required', 'Photo access is needed to choose an image.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.75 });
    if (result.canceled) return;
    setSaving(true);
    try { const asset = result.assets[0]; const uploaded = await api.uploadFile(asset.uri, asset.fileName || 'profile.jpg', asset.mimeType || 'image/jpeg'); change(student ? 'photo_url' : 'school_logo', uploaded.url); }
    catch (error) { Alert.alert('Upload failed', error instanceof Error ? error.message : 'Please retry.'); }
    finally { setSaving(false); }
  };
  const removePhoto = () => change(student ? 'photo_url' : 'school_logo', '');
  const photo = form.photo_url || form.school_logo;
  const photoActions = () => Alert.alert(student ? 'Profile photo' : 'School logo', 'Choose an action', [
    ...(photo ? [{ text: 'View', onPress: () => setImageOpen(true) }, { text: 'Remove', style: 'destructive' as const, onPress: removePhoto }] : []),
    { text: photo ? 'Change' : 'Upload', onPress: () => { void choosePhoto(); } },
    { text: 'Cancel', style: 'cancel' as const },
  ]);

  if (!session) return null;
  return <View style={styles.page}><View style={styles.nav}><Back/><Brand school={school || undefined}/></View><ScrollView contentContainerStyle={styles.content}>
    {busy ? <ActivityIndicator color={colors.gold} size="large"/> : <View style={styles.card}>
      <Pressable onPress={photoActions}><Avatar name={student?.name || school?.school_name || 'CY'} uri={photo} size={112}/><Text style={styles.photoHint}>Tap to view or change</Text></Pressable>
      <Text style={styles.kicker}>{student ? 'STUDENT PROFILE' : 'ADMIN & SCHOOL PROFILE'}</Text>
      <Text style={styles.title}>{student?.name || school?.school_name}</Text>
      <View style={styles.fields}>
        {student ? <><Field label="Student name" value={form.name} onChangeText={v=>change('name',v)}/><Field label="Father's name" value={form.father_name} onChangeText={v=>change('father_name',v)}/><View style={styles.row}><Field label="Class" value={form.class} onChangeText={v=>change('class',v)}/><Field label="Section" value={form.section} onChangeText={v=>change('section',v)}/><Field label="Roll" value={form.roll} onChangeText={v=>change('roll',v)}/></View><Field label="Phone" value={form.number} onChangeText={v=>change('number',v)} keyboardType="phone-pad"/><Field label="Address" value={form.address} onChangeText={v=>change('address',v)}/></> : <><Field label="School name" value={form.school_name} onChangeText={v=>change('school_name',v)}/><Field label="Admin name" value={form.admin_name} onChangeText={v=>change('admin_name',v)}/><Field label="Admin email" value={form.admin_email || form.email} onChangeText={v=>change('admin_email',v)} keyboardType="email-address"/><Field label="Phone" value={form.phone} onChangeText={v=>change('phone',v)} keyboardType="phone-pad"/><Field label="Location" value={form.location} onChangeText={v=>change('location',v)}/></>}
        <Field label={`New ${student ? '4' : '6'}-digit PIN (leave blank to keep current)`} value={form.new_pin} onChangeText={v=>change('new_pin',v.replace(/\D/g,'').slice(0,student?4:6))} keyboardType="number-pad" secureTextEntry/>
      </View>
      {editable && <Pressable disabled={saving} style={styles.save} onPress={save}>{saving ? <ActivityIndicator color="#fff"/> : <Text style={styles.saveText}>Save changes</Text>}</Pressable>}
      <Text style={styles.safe}>For security, the current PIN is never displayed. Enter a new PIN only when you want to change it.</Text>
    </View>}
  </ScrollView><Modal visible={imageOpen} transparent animationType="fade" onRequestClose={() => setImageOpen(false)}><View style={styles.overlay}><Pressable onPress={() => setImageOpen(false)} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable>{photo ? <Image source={{ uri: photo }} style={styles.fullImage} resizeMode="contain"/> : null}</View></Modal></View>;
}
function Field({ label, ...props }: React.ComponentProps<typeof TextInput> & { label: string }) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput placeholderTextColor="#948b80" {...props} style={styles.input}/></View>; }
const styles=StyleSheet.create({page:{flex:1,backgroundColor:colors.cream},nav:{padding:18,flexDirection:'row',alignItems:'center',gap:18,backgroundColor:colors.paper},content:{padding:20,paddingBottom:60,alignItems:'center'},card:{width:'100%',maxWidth:650,backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:28,padding:24,alignItems:'center',gap:10},photoHint:{textAlign:'center',color:colors.brown,fontWeight:'800',fontSize:11,marginTop:8},kicker:{color:colors.brown,fontWeight:'900',fontSize:10,letterSpacing:1.5,marginTop:12},title:{color:colors.ink,fontSize:31,fontWeight:'900'},fields:{width:'100%',gap:12,marginTop:10},row:{flexDirection:'row',gap:8},field:{flex:1,gap:6},label:{color:colors.ink,fontWeight:'800',fontSize:12},input:{backgroundColor:'#fbf7ef',borderWidth:1,borderColor:colors.line,borderRadius:14,padding:14,color:colors.ink,fontSize:15},save:{width:'100%',backgroundColor:colors.ink,borderBottomWidth:5,borderBottomColor:colors.gold,padding:16,borderRadius:15,marginTop:10},saveText:{color:'#fff',fontWeight:'900',textAlign:'center'},safe:{color:colors.muted,fontSize:11,textAlign:'center',lineHeight:16},overlay:{flex:1,backgroundColor:'rgba(24,21,17,.94)',alignItems:'center',justifyContent:'center',padding:20},fullImage:{width:'100%',height:'78%',borderRadius:24},close:{position:'absolute',top:48,right:22,zIndex:2,width:48,height:48,borderRadius:24,backgroundColor:colors.gold,alignItems:'center',justifyContent:'center'},closeText:{fontSize:32,lineHeight:34,fontWeight:'900',color:colors.ink}});
