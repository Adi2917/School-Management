import { useCallback, useMemo, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { AppHeader, Avatar, Skeleton } from '@/components/ui';
import { colors } from '@/constants/colors';
import { useAuth } from '@/context/auth-context';
import { api, compressImage, ExamType, Fee, mediaUrl, Notice, Result, School, Student } from '@/lib/api';

type Kind = 'fees' | 'results' | 'notices';
const MONTHS = ['March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February'];
const DEFAULT_SUBJECTS = ['English', 'Hindi', 'Maths', 'Computer', 'GK', 'Science', 'Social Studies'];

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
  const [feeDrafts, setFeeDrafts] = useState<Record<string, { due: string; status: string; duesPaid: boolean }>>({});
  const [feeView, setFeeView] = useState<'monthly' | 'exam'>('monthly');
  const [selectedExamFee, setSelectedExamFee] = useState('');
  const [examFeeMenu, setExamFeeMenu] = useState(false);
  const [subjects, setSubjects] = useState(DEFAULT_SUBJECTS);
  const [marks, setMarks] = useState<Record<string, { obtained: string; full: string }>>(Object.fromEntries(DEFAULT_SUBJECTS.map(item => [item, { obtained: '', full: '100' }])));
  const [newSubject, setNewSubject] = useState('');
  const schoolCode = session?.user.school_code || '';
  const studentId = params.studentId || (session?.role === 'student' ? (session.user as Student).id : '');
  const admin = session?.role === 'admin';

  const load = useCallback(async (silent = false) => {
    if (!session) return router.replace('/');
    if(!silent)setBusy(true);
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
      if (kind === 'fees') { const fees=data as Fee[]; setFeeDrafts(Object.fromEntries(fees.map(fee => [fee.id || `${fee.fee_type || 'monthly'}-${fee.month || fee.exam_fee_id}`, { due: String(fee.due_amount ?? 0), status: fee.status || 'Pending', duesPaid:Boolean(fee.dues_paid) }]))); setSelectedExamFee(current=>current || fees.find(fee=>fee.fee_type==='exam')?.exam_fee_id || ''); }
      setExamTypes(exams);
      setExam(current => current || exams[0]?.name || '');
    } catch (error) {
      Alert.alert('Could not load', error instanceof Error ? error.message : 'Please retry.');
    } finally { if(!silent)setBusy(false); }
  }, [kind, schoolCode, session, studentId]);

  useFocusEffect(useCallback(() => { void load();const live=setInterval(()=>void load(true),1500);return()=>clearInterval(live); }, [load]));

  const remove = (collection: string, id?: string, after?: () => void) => id && Alert.alert(
    'Delete record?',
    'This will also disappear from the connected account.',
    [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => {
      try { await api.deleteRecord(collection, id); after?.(); await load(); }
      catch (error) { Alert.alert('Delete failed', error instanceof Error ? error.message : 'Please retry.'); }
    } }],
  );

  const ensureFees = async () => {
    if (!studentId || !student) return;
    setSaving(true);
    try {
      const latestSchool = await api.getSchool(schoolCode);
      if (!latestSchool) throw new Error('School fee setup could not be loaded.');
      const monthly = MONTHS.map(month => ({ student_id: studentId, school_code: schoolCode, month, fee_type: 'monthly', status: 'Pending', amount: Number(latestSchool.monthly_fees?.[student.class || ''] || 0), carried_due:0,due_amount:0 }));
      const exams = (latestSchool.exam_fees || []).map(item => ({ student_id: studentId, school_code: schoolCode, month: item.name, title: `${item.name} · ${item.type}`, fee_type: 'exam', exam_fee_id: item.id, status: 'Pending', amount: Number(item.class_amounts[student.class || ''] || 0), carried_due:0,due_amount:0 }));
      const synced = await api.createRecord<Fee>('fees', [...monthly, ...exams]);
      setSchool(latestSchool);
      setRecords(synced);
      setFeeDrafts(Object.fromEntries(synced.map(fee => [fee.id || `${fee.fee_type || 'monthly'}-${fee.month || fee.exam_fee_id}`, { due: String(fee.due_amount ?? 0), status: fee.status || 'Pending', duesPaid: Boolean(fee.dues_paid) }])));
      setSelectedExamFee(current => synced.some(fee => fee.exam_fee_id === current) ? current : synced.find(fee => fee.fee_type === 'exam')?.exam_fee_id || '');
    } catch (error) {
      Alert.alert('Sync failed', error instanceof Error ? error.message : 'Please retry.');
    } finally { setSaving(false); }
  };

  const updateFee = async (fee: Fee, status: string) => {
    if (!fee.id || !admin) return;
    setSaving(true);
    try {
      const key = fee.id;
      const due = Number(feeDrafts[key]?.due || 0);
      const duesPaid = Boolean(feeDrafts[key]?.duesPaid);
      const balance=duesPaid?0:due;
      await api.updateRecord('fees', fee.id, { status:balance>0&&status==='Paid'?'Partial':status, due_amount:balance, dues_paid:duesPaid, paid_at:status==='Paid'&&balance===0?new Date().toISOString():'' });
      if ((fee.fee_type || 'monthly') === 'monthly') { const monthly=(records as Fee[]).filter(item=>(item.fee_type||'monthly')==='monthly').sort((a,b)=>MONTHS.indexOf(a.month)-MONTHS.indexOf(b.month)); const next=monthly[monthly.findIndex(item=>item.id===fee.id)+1]; if(next?.id) await api.updateRecord('fees',next.id,{carried_due:balance}); }
      await load();
    } catch (error) { Alert.alert('Update failed', error instanceof Error ? error.message : 'Please retry.'); }
    finally { setSaving(false); }
  };
  const toggleDuesPaid = async (fee: Fee, due: number, checked: boolean) => {
    if (!fee.id || !admin) return;
    const key=fee.id; setFeeDrafts(current=>({...current,[key]:{...(current[key]||{due:String(due),status:fee.status}),duesPaid:checked}})); setSaving(true);
    try { const balance=checked?0:due;await api.updateRecord('fees',fee.id,{dues_paid:checked,due_amount:balance}); const monthly=(records as Fee[]).filter(item=>(item.fee_type||'monthly')==='monthly').sort((a,b)=>MONTHS.indexOf(a.month)-MONTHS.indexOf(b.month)); const next=monthly[monthly.findIndex(item=>item.id===fee.id)+1]; if(next?.id)await api.updateRecord('fees',next.id,{carried_due:balance}); await load(); }
    catch(error){Alert.alert('Dues update failed',error instanceof Error?error.message:'Please retry.');}
    finally{setSaving(false);}
  };

  const pickAttachment = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('Permission required', 'Photo access is needed to attach an image.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.75 });
    if (result.canceled) return;
    setSaving(true);
    try {
      const asset = result.assets[0];
      const compressed = await compressImage(asset.uri);
      const uploaded = await api.uploadFile(compressed, 'notice.jpg', 'image/jpeg');
      setAttachment({ url: uploaded.url, type: 'image/jpeg' });
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
      const payload = { school_code: schoolCode, audience:'student', student_id:null, event_type:'notice', title: title.trim(), message: message.trim(), file_url: attachment?.url || '', file_type: attachment?.type || '', updated_at: new Date().toISOString() };
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
    if (!studentId || !exam.trim()) return Alert.alert('Choose an exam type');
    const completed = subjects.filter(item => marks[item]?.obtained !== '');
    if (!completed.length) return Alert.alert('Enter obtained marks for at least one subject');
    if (completed.some(item => Number(marks[item].obtained) < 0 || Number(marks[item].full) <= 0 || Number(marks[item].obtained) > Number(marks[item].full))) return Alert.alert('Enter valid obtained and full marks');
    setSaving(true);
    try {
      const examType = examTypes.find(item => item.name === exam);
      for (const item of completed) {
        const value = marks[item];
        const payload = { student_id: studentId, school_code: schoolCode, exam_type_id: examType?.id || exam, exam_name: exam, subject: item, obtained_marks: Number(value.obtained), marks: Number(value.obtained), full_marks: Number(value.full), updated_at: new Date().toISOString() };
        const existing = (records as Result[]).find(row => (row.exam_name || row.exam_type_id) === exam && row.subject.toLowerCase() === item.toLowerCase());
        if (existing?.id) await api.updateRecord('results', existing.id, payload); else await api.createRecord('results', payload);
      }
      setMarks(Object.fromEntries(subjects.map(item => [item, { obtained: '', full: '100' }]))); await load();
    } catch (error) { Alert.alert('Save failed', error instanceof Error ? error.message : 'Please retry.'); }
    finally { setSaving(false); }
  };

  const groups = useMemo(() => Object.entries((records as Result[]).reduce<Record<string, Result[]>>((all, row) => {
    const key = row.exam_name || row.exam_type_id || 'Examination'; (all[key] ||= []).push(row); return all;
  }, {})), [records]);
  const monthlyFeeRecords = (records as Fee[]).filter(item => (item.fee_type || 'monthly') === 'monthly');
  const examFeeRecords = (records as Fee[]).filter(item => item.fee_type === 'exam');
  const visibleFeeRecords = feeView === 'monthly' ? monthlyFeeRecords : examFeeRecords.filter(item => !selectedExamFee || item.exam_fee_id === selectedExamFee);
  if (!session) return null;

  return <View style={styles.page}>
    <AppHeader school={school || undefined} back />
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets>
      <View style={styles.hero}><Avatar name={student?.name || school?.school_name || 'CY'} uri={student?.photo_url || school?.school_logo} size={64}/><View style={styles.flex}><Text style={styles.kicker}>{kind.toUpperCase()} DESK · CODE {schoolCode}</Text><Text style={styles.title}>{kind === 'fees' ? 'Fee ledger' : kind === 'results' ? 'Exam results' : 'School notices'}</Text><Text style={styles.sub}>{student ? `${student.name} · Class ${student.class}-${student.section} · Roll ${student.roll}` : school?.school_name}</Text></View></View>
      {busy ? <RecordSkeleton /> : kind === 'fees' ? <>
        {admin ? <Action label={saving ? 'Syncing ledger...' : 'Sync ledger with school fee setup'} onPress={ensureFees}/> : null}
        <View style={feeStyles.tabs}><Pressable style={[feeStyles.tab,feeView==='monthly'&&feeStyles.tabActive]} onPress={()=>setFeeView('monthly')}><Text style={[feeStyles.tabText,feeView==='monthly'&&feeStyles.tabTextActive]}>Monthly</Text></Pressable><Pressable style={[feeStyles.tab,feeView==='exam'&&feeStyles.tabActive]} onPress={()=>setFeeView('exam')}><Text style={[feeStyles.tabText,feeView==='exam'&&feeStyles.tabTextActive]}>Exam</Text></Pressable></View>
        {feeView==='exam' ? <View style={feeStyles.dropdownWrap}><Pressable style={feeStyles.dropdown} onPress={()=>setExamFeeMenu(value=>!value)}><View><Text style={feeStyles.dropdownLabel}>SELECT EXAM FEE</Text><Text style={feeStyles.dropdownValue}>{examFeeRecords.find(item=>item.exam_fee_id===selectedExamFee)?.title || 'Choose configured exam'}</Text></View><Text style={feeStyles.dropdownArrow}>{examFeeMenu?'▲':'▼'}</Text></Pressable>{examFeeMenu?<View style={feeStyles.menu}>{examFeeRecords.map(item=><Pressable key={item.exam_fee_id||item.id} style={feeStyles.menuItem} onPress={()=>{setSelectedExamFee(item.exam_fee_id||'');setExamFeeMenu(false)}}><Text style={feeStyles.menuText}>{item.title||item.month}</Text><Text style={feeStyles.menuAmount}>₹{Number(item.amount||0).toLocaleString('en-IN')}</Text></Pressable>)}</View>:null}</View>:null}
        {feeView==='exam' && !examFeeRecords.length ? <View style={feeStyles.empty}><Text style={feeStyles.emptyTitle}>No exam fee in ledger</Text><Text style={feeStyles.emptyCopy}>{admin?'Save exam fees in Fee Setup, then tap Sync ledger above.':'Your school has not added an exam fee yet.'}</Text></View>:null}
        <View style={styles.cards}>{visibleFeeRecords.map(fee => { const key=fee.id || fee.month; const draft=feeDrafts[key] || {due:String(fee.due_amount ?? 0),status:fee.status,duesPaid:Boolean(fee.dues_paid)};const base=Number(fee.amount||0),carry=Number(fee.carried_due||0),total=base+carry,balance=draft.duesPaid?0:Number(draft.due||0),paid=Math.max(0,total-balance); return <View key={key} style={styles.feeCard}><View style={styles.feeHead}><View style={styles.flex}><Text style={styles.recordTitle}>{fee.title || fee.month}</Text><Text style={styles.recordCopy}>{fee.fee_type === 'exam' ? 'Exam fee' : 'Monthly fee'}{fee.paid_at ? ` · Paid on ${new Date(fee.paid_at).toLocaleDateString()}` : ''}</Text></View><Text style={styles.amount}>₹{base.toLocaleString('en-IN')}</Text></View><View style={feeStyles.calculation}><Text>Monthly / exam fee <Text>₹{base.toLocaleString('en-IN')}</Text></Text><Text>Previous dues <Text>₹{carry.toLocaleString('en-IN')}</Text></Text><Text style={feeStyles.totalLine}>Total payable <Text>₹{total.toLocaleString('en-IN')}</Text></Text><Text style={feeStyles.paidLine}>Total paid <Text>₹{paid.toLocaleString('en-IN')}</Text></Text></View><View style={styles.dueRow}><Text style={styles.dueLabel}>Balance due</Text>{admin ? <TextInput style={styles.dueInput} value={draft.duesPaid?'0':draft.due} onChangeText={value => setFeeDrafts(current => ({...current,[key]:{...draft,duesPaid:false,due:value.replace(/\D/g,'')}}))} keyboardType="number-pad"/> : <Text style={styles.dueValue}>₹{Number(fee.due_amount || 0).toLocaleString('en-IN')}</Text>}</View>{admin && (fee.fee_type||'monthly')==='monthly' ? <Pressable style={[feeStyles.checkRow,draft.duesPaid&&feeStyles.checkActive]} onPress={()=>toggleDuesPaid(fee,Number(draft.due||0),!draft.duesPaid)}><View style={[feeStyles.checkbox,draft.duesPaid&&feeStyles.checkboxActive]}><Text style={feeStyles.tick}>{draft.duesPaid?'✓':''}</Text></View><View style={styles.flex}><Text style={feeStyles.checkTitle}>Dues cleared</Text><Text style={feeStyles.checkCopy}>{draft.duesPaid?'Balance is zero and nothing carries forward':'Balance automatically carries to the next month'}</Text></View></Pressable> : null}{admin ? <View style={styles.statusOptions}>{['Pending','Partial','Paid'].map(status => <Pressable key={status} disabled={saving} onPress={() => updateFee(fee,status)} style={[styles.statusChoice,(draft.status || fee.status)===status && styles.statusChoiceActive,status==='Paid' && (draft.status || fee.status)===status && styles.paid]}><Text style={styles.statusText}>{status}</Text></Pressable>)}</View> : <View style={[styles.status,fee.status==='Paid'&&styles.paid]}><Text style={styles.statusText}>{fee.status}</Text></View>}</View>})}</View>
      </> : kind === 'notices' ? <>
        {admin && <View style={styles.form}><Text style={styles.sectionTitle}>{editingNotice ? 'Edit notification' : 'Create notification'}</Text><Input placeholder="Title" value={title} onChangeText={setTitle}/><Input placeholder="Write message" value={message} onChangeText={setMessage} multiline/>{attachment?.url ? <View style={styles.previewWrap}><Image source={{ uri: mediaUrl(attachment.url) || attachment.url }} style={styles.preview}/><Pressable onPress={() => setAttachment(null)}><Text style={styles.removeText}>Remove attachment</Text></Pressable></View> : null}<View style={styles.formRow}><Pressable onPress={pickAttachment} style={styles.outlineAction}><Text style={styles.outlineText}>{attachment ? 'Replace image' : 'Attach image'}</Text></Pressable>{editingNotice ? <Pressable onPress={resetNotice} style={styles.outlineAction}><Text style={styles.outlineText}>Cancel edit</Text></Pressable> : null}</View><Action label={saving ? 'Saving...' : editingNotice ? 'Save changes' : 'Send to this school'} onPress={saveNotice}/></View>}
        <View style={styles.cards}>{(records as Notice[]).map(notice => <View key={notice.id} style={styles.notice}><Text style={styles.recordTitle}>{notice.title || 'School update'}</Text><Text style={styles.noticeText}>{notice.message}</Text>{notice.file_url ? <Image source={{ uri: mediaUrl(notice.file_url) || notice.file_url }} style={styles.noticeImage}/> : null}<Text style={styles.recordCopy}>{notice.created_at ? new Date(notice.created_at).toLocaleString() : ''}</Text>{admin ? <View style={styles.rowActions}><Pressable onPress={() => startNoticeEdit(notice)} style={styles.miniButton}><Text style={styles.miniText}>Edit</Text></Pressable><Pressable onPress={() => remove('notifications', notice.id, resetNotice)} style={[styles.miniButton, styles.dangerButton]}><Text style={[styles.miniText, styles.dangerText]}>Delete</Text></Pressable></View> : null}</View>)}</View>
      </> : <>
        {admin && <View style={styles.form}><Text style={styles.sectionTitle}>Publish complete result</Text><View style={styles.formRow}><Input placeholder="New exam type" value={examName} onChangeText={setExamName}/><Pressable onPress={addExamType} style={styles.smallAction}><Text style={styles.actionText}>Add</Text></Pressable></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{examTypes.map(item => <View key={item.id || item.name} style={[styles.chip, exam === item.name && styles.chipActive]}><Pressable onPress={() => setExam(item.name)}><Text style={styles.chipText}>{item.name}</Text></Pressable><Pressable onPress={() => remove('exam_types', item.id, () => exam === item.name && setExam(''))}><Text style={styles.chipDelete}>×</Text></Pressable></View>)}</ScrollView>{subjects.map(item => <View key={item} style={styles.subjectRow}><Text style={styles.subjectName}>{item}</Text><TextInput style={styles.markInput} placeholder="Obtained" placeholderTextColor="#948b80" value={marks[item]?.obtained || ''} onChangeText={value => setMarks(current => ({...current,[item]:{obtained:value.replace(/\D/g,''),full:current[item]?.full || '100'}}))} keyboardType="number-pad"/><TextInput style={styles.markInput} placeholder="Full" placeholderTextColor="#948b80" value={marks[item]?.full || '100'} onChangeText={value => setMarks(current => ({...current,[item]:{obtained:current[item]?.obtained || '',full:value.replace(/\D/g,'')}}))} keyboardType="number-pad"/>{!DEFAULT_SUBJECTS.includes(item) && <Pressable onPress={() => setSubjects(current => current.filter(value => value !== item))}><Text style={styles.deleteText}>×</Text></Pressable>}</View>)}<View style={styles.formRow}><Input placeholder="Add another subject" value={newSubject} onChangeText={setNewSubject}/><Pressable style={styles.smallAction} onPress={() => { const value=newSubject.trim(); if(value && !subjects.includes(value)){setSubjects(current=>[...current,value]);setMarks(current=>({...current,[value]:{obtained:'',full:'100'}}));setNewSubject('');} }}><Text style={styles.actionText}>Add</Text></Pressable></View><Action label={saving ? 'Saving complete result...' : 'Save all entered subjects'} onPress={saveResult}/></View>}
        {groups.map(([name, rows]) => { const total=rows.reduce((sum,row)=>sum+Number(row.obtained_marks ?? row.marks ?? 0),0); const maximum=rows.reduce((sum,row)=>sum+Number(row.full_marks ?? 100),0); const percent=maximum?total/maximum*100:0; return <View key={name} style={resultStyles.sheet}><View style={resultStyles.schoolHead}><Avatar name={school?.school_name || 'School'} uri={school?.school_logo} size={50}/><View style={styles.flex}><Text style={resultStyles.schoolName}>{school?.school_name || 'School'}</Text><Text style={resultStyles.schoolMeta}>ACADEMIC RESULT · CODE {schoolCode}</Text></View></View><View style={resultStyles.examBand}><View style={styles.flex}><Text style={resultStyles.examLabel}>PUBLISHED EXAM</Text><Text style={resultStyles.examName}>{name}</Text><Text style={resultStyles.studentLine}>{student?.name} · Class {student?.class}-{student?.section} · Roll {student?.roll}</Text></View><View style={resultStyles.percentBadge}><Text style={resultStyles.percentValue}>{percent.toFixed(1)}%</Text><Text style={resultStyles.percentLabel}>SCORE</Text></View></View><View style={resultStyles.tableHead}><Text style={resultStyles.subjectHead}>SUBJECT</Text><Text style={resultStyles.markHead}>OBTAINED / FULL</Text></View>{rows.map(row => <View key={row.id || row.subject} style={styles.markRow}><Text style={styles.markSubject}>{row.subject}</Text><Text style={styles.mark}>{row.obtained_marks ?? row.marks} / {row.full_marks ?? 100}</Text>{admin ? <View style={styles.rowActions}><Pressable onPress={() => startResultEdit(row)}><Text style={styles.editText}>Edit</Text></Pressable><Pressable onPress={() => remove('results', row.id, resetResult)}><Text style={styles.deleteText}>Delete</Text></Pressable></View> : null}</View>)}<View style={resultStyles.summary}><View><Text style={resultStyles.summaryLabel}>TOTAL MARKS</Text><Text style={resultStyles.summaryValue}>{total} / {maximum}</Text></View><View><Text style={resultStyles.summaryLabel}>RESULT</Text><Text style={resultStyles.pass}>{percent>=33?'PASS':'NEEDS IMPROVEMENT'}</Text></View></View><Text style={resultStyles.footer}>Official academic record · Connect Your School</Text></View>; })}
      </>}
      {!busy && !records.length && !admin && <Text style={styles.empty}>No records available yet.</Text>}
    </ScrollView>
    </KeyboardAvoidingView>
  </View>;
}

function Input(props: React.ComponentProps<typeof TextInput>) { return <TextInput placeholderTextColor="#948b80" {...props} style={[styles.input, props.multiline && styles.multiline]}/>; }
function Action({ label, onPress }: { label: string; onPress: () => void }) { return <Pressable style={styles.action} onPress={onPress}><Text style={styles.actionText}>{label}</Text></Pressable>; }
function RecordSkeleton() { return <View style={styles.skeletonCard}><Skeleton height={24} width="44%"/><Skeleton height={66}/><Skeleton height={66}/><Skeleton height={66}/></View>; }

const feeStyles = StyleSheet.create({
  tabs:{flexDirection:'row',gap:9,backgroundColor:'#eadfce',borderRadius:16,padding:5},tab:{flex:1,minHeight:46,borderRadius:12,alignItems:'center',justifyContent:'center'},tabActive:{backgroundColor:colors.ink},tabText:{color:colors.muted,fontWeight:'900'},tabTextActive:{color:'#fff'},calculation:{backgroundColor:'#fbf7ef',borderRadius:13,padding:12,gap:7},totalLine:{borderTopWidth:1,borderTopColor:colors.line,paddingTop:7,fontWeight:'900',color:colors.ink},paidLine:{fontWeight:'900',color:'#218052'},dropdownWrap:{gap:7},dropdown:{minHeight:64,backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:16,padding:14,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},dropdownLabel:{color:colors.brown,fontSize:8,fontWeight:'900',letterSpacing:1.2},dropdownValue:{color:colors.ink,fontSize:15,fontWeight:'900',marginTop:4},dropdownArrow:{color:colors.brown,fontWeight:'900'},menu:{backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:15,overflow:'hidden'},menuItem:{flexDirection:'row',justifyContent:'space-between',gap:10,padding:15,borderBottomWidth:1,borderBottomColor:'#eee4d5'},menuText:{flex:1,color:colors.ink,fontWeight:'800'},menuAmount:{color:colors.brown,fontWeight:'900'},checkRow:{flexDirection:'row',alignItems:'center',gap:11,padding:11,borderWidth:1,borderColor:colors.line,borderRadius:13,backgroundColor:'#fbf7ef'},checkActive:{backgroundColor:'#e5f5e9',borderColor:'#85c69a'},checkbox:{width:24,height:24,borderRadius:7,borderWidth:2,borderColor:'#b9aa95',alignItems:'center',justifyContent:'center'},checkboxActive:{backgroundColor:'#218052',borderColor:'#218052'},tick:{color:'#fff',fontWeight:'900'},checkTitle:{color:colors.ink,fontWeight:'900'},checkCopy:{color:colors.muted,fontSize:9,marginTop:2},empty:{backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:18,padding:25,alignItems:'center'},emptyTitle:{color:colors.ink,fontSize:17,fontWeight:'900'},emptyCopy:{color:colors.muted,fontSize:11,textAlign:'center',marginTop:5,lineHeight:16}
});

const resultStyles = StyleSheet.create({
  sheet:{backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:24,padding:17,overflow:'hidden'},schoolHead:{flexDirection:'row',alignItems:'center',gap:12,paddingBottom:15,borderBottomWidth:1,borderBottomColor:'#eee4d5'},schoolName:{color:colors.ink,fontSize:18,fontWeight:'900'},schoolMeta:{color:colors.brown,fontSize:8,fontWeight:'900',letterSpacing:1,marginTop:3},examBand:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:colors.ink,marginHorizontal:-17,padding:17,marginTop:15},examLabel:{color:colors.gold,fontSize:8,fontWeight:'900',letterSpacing:1.2},examName:{color:'#fff',fontSize:22,fontWeight:'900',marginTop:3},studentLine:{color:'#d8d0c4',fontSize:10,marginTop:4},percentBadge:{width:70,height:70,borderRadius:35,backgroundColor:colors.gold,alignItems:'center',justifyContent:'center'},percentValue:{color:colors.ink,fontSize:17,fontWeight:'900'},percentLabel:{color:colors.brown,fontSize:7,fontWeight:'900'},tableHead:{flexDirection:'row',paddingTop:17,paddingBottom:8},subjectHead:{flex:1,color:colors.muted,fontSize:8,fontWeight:'900',letterSpacing:1},markHead:{color:colors.muted,fontSize:8,fontWeight:'900',letterSpacing:1},summary:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',backgroundColor:'#fff5dd',borderRadius:14,padding:14,marginTop:15},summaryLabel:{color:colors.muted,fontSize:8,fontWeight:'900',letterSpacing:1},summaryValue:{color:colors.ink,fontSize:18,fontWeight:'900',marginTop:3},pass:{color:'#218052',fontSize:13,fontWeight:'900',marginTop:3},footer:{color:colors.muted,fontSize:9,textAlign:'center',marginTop:14}
});

const styles = StyleSheet.create({
  page:{flex:1,backgroundColor:colors.cream},content:{width:'100%',maxWidth:820,alignSelf:'center',paddingHorizontal:18,paddingTop:20,paddingBottom:60,gap:18},hero:{backgroundColor:colors.ink,borderRadius:22,padding:16,flexDirection:'row',alignItems:'center',gap:13},flex:{flex:1},kicker:{color:colors.gold,fontWeight:'900',fontSize:9,letterSpacing:1.1},title:{color:'#fff',fontSize:24,fontWeight:'900',marginTop:4},sub:{color:'#ddd4c6',fontSize:12,marginTop:3},cards:{gap:10},record:{backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:18,padding:16,flexDirection:'row',alignItems:'center',gap:12},feeCard:{backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:18,padding:16,gap:13},feeHead:{flexDirection:'row',alignItems:'center',gap:12},amount:{fontSize:20,fontWeight:'900',color:colors.brown},dueRow:{flexDirection:'row',alignItems:'center',gap:12},dueLabel:{flex:1,color:colors.muted,fontWeight:'700'},dueInput:{width:110,minHeight:44,borderWidth:1,borderColor:colors.line,borderRadius:10,paddingHorizontal:12,color:colors.ink,backgroundColor:'#fbf7ef'},dueValue:{fontWeight:'900',color:colors.ink},statusOptions:{flexDirection:'row',gap:7},statusChoice:{flex:1,backgroundColor:'#fee8e5',padding:10,borderRadius:11,alignItems:'center'},statusChoiceActive:{borderWidth:2,borderColor:colors.gold},recordTitle:{color:colors.ink,fontSize:18,fontWeight:'900'},recordCopy:{color:colors.muted,fontSize:11,marginTop:5},status:{alignSelf:'flex-end',backgroundColor:'#fee8e5',paddingHorizontal:14,paddingVertical:10,borderRadius:12},paid:{backgroundColor:'#dff4e6'},statusText:{fontWeight:'800',color:colors.ink},form:{backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:22,padding:17,gap:12},sectionTitle:{fontSize:22,fontWeight:'900',color:colors.ink},input:{minWidth:130,backgroundColor:'#fbf7ef',borderWidth:1,borderColor:colors.line,borderRadius:14,padding:14,color:colors.ink,fontSize:16,flex:1},multiline:{minHeight:100,textAlignVertical:'top'},formRow:{flexDirection:'row',flexWrap:'wrap',gap:10},subjectRow:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'#fbf7ef',borderRadius:14,padding:10},subjectName:{flex:1,minWidth:100,color:colors.ink,fontWeight:'800'},markInput:{width:92,minHeight:44,borderWidth:1,borderColor:colors.line,borderRadius:10,paddingHorizontal:9,color:colors.ink,backgroundColor:colors.paper},action:{backgroundColor:colors.ink,borderBottomWidth:5,borderBottomColor:colors.gold,padding:16,borderRadius:15},smallAction:{minHeight:52,backgroundColor:colors.ink,paddingHorizontal:22,justifyContent:'center',borderRadius:14},actionText:{color:'#fff',fontWeight:'900',textAlign:'center'},outlineAction:{minWidth:130,flex:1,borderWidth:1,borderColor:colors.line,borderRadius:13,padding:12,backgroundColor:'#fbf7ef'},outlineText:{color:colors.brown,fontWeight:'900',textAlign:'center'},notice:{backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:20,padding:18,gap:8},noticeText:{fontSize:15,lineHeight:22,color:colors.ink},noticeImage:{width:'100%',aspectRatio:16/9,borderRadius:16,resizeMode:'cover'},previewWrap:{gap:6},preview:{width:'100%',aspectRatio:16/9,borderRadius:14,resizeMode:'cover'},removeText:{color:colors.danger,fontWeight:'800',textAlign:'center'},chips:{gap:8},chip:{borderWidth:1,borderColor:colors.line,borderRadius:999,paddingLeft:14,paddingRight:8,paddingVertical:9,backgroundColor:'#fbf7ef',flexDirection:'row',gap:10,alignItems:'center'},chipActive:{backgroundColor:colors.gold},chipText:{color:colors.ink,fontWeight:'700'},chipDelete:{fontSize:20,color:colors.danger,fontWeight:'900',lineHeight:20},result:{backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:22,padding:17,gap:3},markRow:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:10,paddingVertical:14,borderBottomWidth:1,borderBottomColor:'#eee4d5'},markSubject:{minWidth:110,fontWeight:'700',color:colors.ink,flex:1},mark:{fontWeight:'900',color:colors.brown},rowActions:{flexDirection:'row',gap:10,alignItems:'center',marginTop:8},miniButton:{borderWidth:1,borderColor:colors.line,borderRadius:10,paddingHorizontal:15,paddingVertical:8},dangerButton:{borderColor:'#efc4bd'},miniText:{color:colors.brown,fontWeight:'900'},dangerText:{color:colors.danger},editText:{color:colors.brown,fontWeight:'900'},deleteText:{color:colors.danger,fontWeight:'900'},empty:{textAlign:'center',color:colors.muted,padding:30},skeletonCard:{backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:22,padding:18,gap:12}
});
