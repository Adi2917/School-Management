import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Avatar, Back, Brand } from '@/components/ui';
import { colors } from '@/constants/colors';
import { useAuth } from '@/context/auth-context';
import { api, ExamType, Fee, Notice, Result, School, Student } from '@/lib/api';

type Kind = 'fees' | 'results' | 'notices';
const MONTHS = ['March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February'];

export default function RecordsScreen() {
  const params = useLocalSearchParams<{ kind?: string; studentId?: string }>();
  const kind = (params.kind || 'notices') as Kind;
  const { session } = useAuth();
  const [school, setSchool] = useState<School | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [records, setRecords] = useState<(Fee | Notice | Result)[]>([]);
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<{ url: string; type: string } | null>(null);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [exam, setExam] = useState('');
  const [examName, setExamName] = useState('');
  const [subject, setSubject] = useState('');
  const [obtained, setObtained] = useState('');
  const [fullMarks, setFullMarks] = useState('100');
  const [editingResult, setEditingResult] = useState<Result | null>(null);
  const schoolCode = session?.user.school_code || '';
  const studentId = params.studentId || (session?.role === 'student' ? (session.user as Student).id : '');
  const admin = session?.role === 'admin';

  const load = useCallback(async () => {
    if (!session) return router.replace('/');
    setBusy(true);
    try {
      const [target, schoolRecord, data, exams] = await Promise.all([
        studentId ? api.getStudent(studentId) : Promise.resolve(null),
        api.getSchool(schoolCode),
        kind === 'notices' ? api.getNotices(schoolCode) : kind === 'fees' ? api.getFees(studentId) : api.getResults(studentId),
        kind === 'results' ? api.getExamTypes(schoolCode) : Promise.resolve([]),
      ]);
      setSchool(schoolRecord);
      setStudent(target);
      setRecords(data);
      setExamTypes(exams);
      setExam(current => current || exams[0]?.name || '');
    } catch (error) {
      Alert.alert('Could not load', error instanceof Error ? error.message : 'Please retry.');
    } finally { setBusy(false); }
  }, [kind, schoolCode, session, studentId]);

  useEffect(() => { void load(); }, [load]);

  const remove = (collection: string, id?: string, after?: () => void) => id && Alert.alert(
    'Delete record?',
    'This will also disappear from the connected account.',
    [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => {
      try { await api.deleteRecord(collection, id); after?.(); await load(); }
      catch (error) { Alert.alert('Delete failed', error instanceof Error ? error.message : 'Please retry.'); }
    } }],
  );

  const ensureFees = async () => {
    if (!studentId || records.length) return;
    setSaving(true);
    try {
      await api.createRecord<Fee>('fees', MONTHS.map(month => ({ student_id: studentId, school_code: schoolCode, month, status: 'Pending' })));
      await load();
    } finally { setSaving(false); }
  };

  const updateFee = async (fee: Fee) => {
    if (!fee.id || !admin) return;
    setSaving(true);
    try {
      const paid = fee.status !== 'Paid';
      await api.updateRecord('fees', fee.id, { status: paid ? 'Paid' : 'Pending', paid_at: paid ? new Date().toISOString() : '' });
      await load();
    } catch (error) { Alert.alert('Update failed', error instanceof Error ? error.message : 'Please retry.'); }
    finally { setSaving(false); }
  };

  const pickAttachment = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('Permission required', 'Photo access is needed to attach an image.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.75 });
    if (result.canceled) return;
    setSaving(true);
    try {
      const asset = result.assets[0];
      const uploaded = await api.uploadFile(asset.uri, asset.fileName || 'notice.jpg', asset.mimeType || 'image/jpeg');
      setAttachment({ url: uploaded.url, type: asset.mimeType || 'image/jpeg' });
    } catch (error) { Alert.alert('Upload failed', error instanceof Error ? error.message : 'Please retry.'); }
    finally { setSaving(false); }
  };

  const resetNotice = () => { setTitle(''); setMessage(''); setAttachment(null); setEditingNotice(null); };
  const startNoticeEdit = (notice: Notice) => {
    setEditingNotice(notice); setTitle(notice.title || ''); setMessage(notice.message || '');
    setAttachment(notice.file_url ? { url: notice.file_url, type: notice.file_type || 'image/jpeg' } : null);
  };
  const saveNotice = async () => {
    if (!title.trim() || !message.trim()) return Alert.alert('Complete title and message');
    setSaving(true);
    try {
      const payload = { school_code: schoolCode, title: title.trim(), message: message.trim(), file_url: attachment?.url || '', file_type: attachment?.type || '', updated_at: new Date().toISOString() };
      if (editingNotice?.id) await api.updateRecord('notifications', editingNotice.id, payload);
      else await api.createRecord('notifications', { ...payload, created_at: new Date().toISOString() });
      resetNotice(); await load();
    } catch (error) { Alert.alert('Save failed', error instanceof Error ? error.message : 'Please retry.'); }
    finally { setSaving(false); }
  };

  const addExamType = async () => {
    const name = examName.trim();
    if (!name) return;
    if (examTypes.some(item => item.name.toLowerCase() === name.toLowerCase())) return Alert.alert('Exam type already exists');
    try { await api.createRecord('exam_types', { school_code: schoolCode, name }); setExam(name); setExamName(''); await load(); }
    catch (error) { Alert.alert('Could not add exam', error instanceof Error ? error.message : 'Please retry.'); }
  };
  const resetResult = () => { setSubject(''); setObtained(''); setFullMarks('100'); setEditingResult(null); };
  const startResultEdit = (row: Result) => {
    setEditingResult(row); setExam(row.exam_name || row.exam_type_id || ''); setSubject(row.subject);
    setObtained(String(row.obtained_marks ?? row.marks ?? '')); setFullMarks(String(row.full_marks ?? 100));
  };
  const saveResult = async () => {
    if (!studentId || !exam.trim() || !subject.trim() || !obtained || !fullMarks) return Alert.alert('Complete all result fields');
    if (+obtained < 0 || +fullMarks <= 0 || +obtained > +fullMarks) return Alert.alert('Enter valid obtained and full marks');
    setSaving(true);
    try {
      const examType = examTypes.find(item => item.name === exam);
      const payload = { student_id: studentId, school_code: schoolCode, exam_type_id: examType?.id || exam, exam_name: exam, subject: subject.trim(), obtained_marks: +obtained, marks: +obtained, full_marks: +fullMarks, updated_at: new Date().toISOString() };
      const existing = editingResult || (records as Result[]).find(row => (row.exam_name || row.exam_type_id) === exam && row.subject.toLowerCase() === subject.trim().toLowerCase());
      if (existing?.id) await api.updateRecord('results', existing.id, payload);
      else await api.createRecord('results', payload);
      resetResult(); await load();
    } catch (error) { Alert.alert('Save failed', error instanceof Error ? error.message : 'Please retry.'); }
    finally { setSaving(false); }
  };

  const groups = useMemo(() => Object.entries((records as Result[]).reduce<Record<string, Result[]>>((all, row) => {
    const key = row.exam_name || row.exam_type_id || 'Examination'; (all[key] ||= []).push(row); return all;
  }, {})), [records]);
  if (!session) return null;

  return <View style={styles.page}>
    <View style={styles.nav}><Back /><Brand school={school || undefined} /></View>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.hero}><Avatar name={student?.name || school?.school_name || 'CY'} uri={student?.photo_url || school?.school_logo} size={64}/><View style={styles.flex}><Text style={styles.kicker}>{kind.toUpperCase()} DESK · CODE {schoolCode}</Text><Text style={styles.title}>{kind === 'fees' ? 'Fee ledger' : kind === 'results' ? 'Exam results' : 'School notices'}</Text><Text style={styles.sub}>{student ? `${student.name} · Class ${student.class}-${student.section} · Roll ${student.roll}` : school?.school_name}</Text></View></View>
      {busy ? <ActivityIndicator color={colors.gold} size="large"/> : kind === 'fees' ? <>
        {!records.length && admin ? <Action label={saving ? 'Creating ledger...' : 'Create 12-month fee ledger'} onPress={ensureFees}/> : null}
        <View style={styles.cards}>{(records as Fee[]).map(fee => <View key={fee.id || fee.month} style={styles.record}><View style={styles.flex}><Text style={styles.recordTitle}>{fee.month}</Text><Text style={styles.recordCopy}>{fee.status === 'Paid' ? `Paid ${fee.paid_at ? new Date(fee.paid_at).toLocaleDateString() : ''}` : 'Payment pending'}</Text></View><Pressable disabled={!admin || saving} onPress={() => updateFee(fee)} style={[styles.status, fee.status === 'Paid' && styles.paid]}><Text style={styles.statusText}>{fee.status}</Text></Pressable></View>)}</View>
      </> : kind === 'notices' ? <>
        {admin && <View style={styles.form}><Text style={styles.sectionTitle}>{editingNotice ? 'Edit notification' : 'Create notification'}</Text><Input placeholder="Title" value={title} onChangeText={setTitle}/><Input placeholder="Write message" value={message} onChangeText={setMessage} multiline/>{attachment?.url ? <View style={styles.previewWrap}><Image source={{ uri: attachment.url }} style={styles.preview}/><Pressable onPress={() => setAttachment(null)}><Text style={styles.removeText}>Remove attachment</Text></Pressable></View> : null}<View style={styles.formRow}><Pressable onPress={pickAttachment} style={styles.outlineAction}><Text style={styles.outlineText}>{attachment ? 'Replace image' : 'Attach image'}</Text></Pressable>{editingNotice ? <Pressable onPress={resetNotice} style={styles.outlineAction}><Text style={styles.outlineText}>Cancel edit</Text></Pressable> : null}</View><Action label={saving ? 'Saving...' : editingNotice ? 'Save changes' : 'Send to this school'} onPress={saveNotice}/></View>}
        <View style={styles.cards}>{(records as Notice[]).map(notice => <View key={notice.id} style={styles.notice}><Text style={styles.recordTitle}>{notice.title || 'School update'}</Text><Text style={styles.noticeText}>{notice.message}</Text>{notice.file_url ? <Image source={{ uri: notice.file_url }} style={styles.noticeImage}/> : null}<Text style={styles.recordCopy}>{notice.created_at ? new Date(notice.created_at).toLocaleString() : ''}</Text>{admin ? <View style={styles.rowActions}><Pressable onPress={() => startNoticeEdit(notice)} style={styles.miniButton}><Text style={styles.miniText}>Edit</Text></Pressable><Pressable onPress={() => remove('notifications', notice.id, resetNotice)} style={[styles.miniButton, styles.dangerButton]}><Text style={[styles.miniText, styles.dangerText]}>Delete</Text></Pressable></View> : null}</View>)}</View>
      </> : <>
        {admin && <View style={styles.form}><Text style={styles.sectionTitle}>{editingResult ? 'Update marks' : 'Publish marks'}</Text><View style={styles.formRow}><Input placeholder="New exam type" value={examName} onChangeText={setExamName}/><Pressable onPress={addExamType} style={styles.smallAction}><Text style={styles.actionText}>Add</Text></Pressable></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{examTypes.map(item => <View key={item.id || item.name} style={[styles.chip, exam === item.name && styles.chipActive]}><Pressable onPress={() => setExam(item.name)}><Text style={styles.chipText}>{item.name}</Text></Pressable><Pressable onPress={() => remove('exam_types', item.id, () => exam === item.name && setExam(''))}><Text style={styles.chipDelete}>×</Text></Pressable></View>)}</ScrollView><Input placeholder="Subject" value={subject} onChangeText={setSubject}/><View style={styles.formRow}><Input placeholder="Obtained" value={obtained} onChangeText={setObtained} keyboardType="number-pad"/><Input placeholder="Full marks" value={fullMarks} onChangeText={setFullMarks} keyboardType="number-pad"/></View>{editingResult ? <Pressable onPress={resetResult} style={styles.outlineAction}><Text style={styles.outlineText}>Cancel edit</Text></Pressable> : null}<Action label={saving ? 'Saving...' : editingResult ? 'Update result' : 'Save result'} onPress={saveResult}/></View>}
        {groups.map(([name, rows]) => <View key={name} style={styles.result}><Text style={styles.sectionTitle}>{name}</Text>{rows.map(row => <View key={row.id || row.subject} style={styles.markRow}><Text style={styles.markSubject}>{row.subject}</Text><Text style={styles.mark}>{row.obtained_marks ?? row.marks} / {row.full_marks ?? 100}</Text>{admin ? <View style={styles.rowActions}><Pressable onPress={() => startResultEdit(row)}><Text style={styles.editText}>Edit</Text></Pressable><Pressable onPress={() => remove('results', row.id, resetResult)}><Text style={styles.deleteText}>Delete</Text></Pressable></View> : null}</View>)}</View>)}
      </>}
      {!busy && !records.length && !admin && <Text style={styles.empty}>No records available yet.</Text>}
    </ScrollView>
  </View>;
}

function Input(props: React.ComponentProps<typeof TextInput>) { return <TextInput placeholderTextColor="#948b80" {...props} style={[styles.input, props.multiline && styles.multiline]}/>; }
function Action({ label, onPress }: { label: string; onPress: () => void }) { return <Pressable style={styles.action} onPress={onPress}><Text style={styles.actionText}>{label}</Text></Pressable>; }

const styles = StyleSheet.create({
  page:{flex:1,backgroundColor:colors.cream},nav:{padding:18,flexDirection:'row',alignItems:'center',gap:18,backgroundColor:colors.paper},content:{padding:20,paddingBottom:60,gap:18},hero:{backgroundColor:colors.ink,borderRadius:24,padding:18,flexDirection:'row',alignItems:'center',gap:14},flex:{flex:1},kicker:{color:colors.gold,fontWeight:'900',fontSize:9,letterSpacing:1.2},title:{color:'#fff',fontSize:28,fontWeight:'900',marginTop:4},sub:{color:'#ddd4c6',marginTop:3},cards:{gap:10},record:{backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:18,padding:16,flexDirection:'row',alignItems:'center',gap:12},recordTitle:{color:colors.ink,fontSize:18,fontWeight:'900'},recordCopy:{color:colors.muted,fontSize:11,marginTop:5},status:{backgroundColor:'#fee8e5',paddingHorizontal:14,paddingVertical:10,borderRadius:12},paid:{backgroundColor:'#dff4e6'},statusText:{fontWeight:'800',color:colors.ink},form:{backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:22,padding:17,gap:12},sectionTitle:{fontSize:22,fontWeight:'900',color:colors.ink},input:{backgroundColor:'#fbf7ef',borderWidth:1,borderColor:colors.line,borderRadius:14,padding:14,color:colors.ink,fontSize:16,flex:1},multiline:{minHeight:100,textAlignVertical:'top'},formRow:{flexDirection:'row',gap:10},action:{backgroundColor:colors.ink,borderBottomWidth:5,borderBottomColor:colors.gold,padding:16,borderRadius:15},smallAction:{backgroundColor:colors.ink,paddingHorizontal:22,justifyContent:'center',borderRadius:14},actionText:{color:'#fff',fontWeight:'900',textAlign:'center'},outlineAction:{flex:1,borderWidth:1,borderColor:colors.line,borderRadius:13,padding:12,backgroundColor:'#fbf7ef'},outlineText:{color:colors.brown,fontWeight:'900',textAlign:'center'},notice:{backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:20,padding:18,gap:8},noticeText:{fontSize:15,lineHeight:22,color:colors.ink},noticeImage:{width:'100%',height:220,borderRadius:16,resizeMode:'cover'},previewWrap:{gap:6},preview:{width:'100%',height:180,borderRadius:14,resizeMode:'cover'},removeText:{color:colors.danger,fontWeight:'800',textAlign:'center'},chips:{gap:8},chip:{borderWidth:1,borderColor:colors.line,borderRadius:999,paddingLeft:14,paddingRight:8,paddingVertical:9,backgroundColor:'#fbf7ef',flexDirection:'row',gap:10,alignItems:'center'},chipActive:{backgroundColor:colors.gold},chipText:{color:colors.ink,fontWeight:'700'},chipDelete:{fontSize:20,color:colors.danger,fontWeight:'900',lineHeight:20},result:{backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:22,padding:17,gap:3},markRow:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:14,borderBottomWidth:1,borderBottomColor:'#eee4d5'},markSubject:{fontWeight:'700',color:colors.ink,flex:1},mark:{fontWeight:'900',color:colors.brown},rowActions:{flexDirection:'row',gap:10,alignItems:'center',marginTop:8},miniButton:{borderWidth:1,borderColor:colors.line,borderRadius:10,paddingHorizontal:15,paddingVertical:8},dangerButton:{borderColor:'#efc4bd'},miniText:{color:colors.brown,fontWeight:'900'},dangerText:{color:colors.danger},editText:{color:colors.brown,fontWeight:'900'},deleteText:{color:colors.danger,fontWeight:'900'},empty:{textAlign:'center',color:colors.muted,padding:30}
});
