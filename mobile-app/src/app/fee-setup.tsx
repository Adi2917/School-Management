import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { AppHeader, Skeleton } from '@/components/ui';
import { colors } from '@/constants/colors';
import { useAuth } from '@/context/auth-context';
import { api, type ExamFee, type School } from '@/lib/api';

const CLASSES = ['Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
const label = (value: string) => ['Nursery','LKG','UKG'].includes(value) ? value : `Class ${value}`;

export default function FeeSetupScreen() {
  const { session, updateUser } = useAuth();
  const [school, setSchool] = useState<School | null>(null);
  const [monthly, setMonthly] = useState<Record<string,string>>({});
  const [examFees, setExamFees] = useState<ExamFee[]>([]);
  const [examName, setExamName] = useState('');
  const [examType, setExamType] = useState('');
  const [examAmounts, setExamAmounts] = useState<Record<string,string>>({});
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const code = session?.user.school_code || '';

  useEffect(() => {
    if (!session || session.role !== 'admin') { router.replace('/'); return; }
    api.getSchool(code).then(record => {
      setSchool(record); setMonthly(Object.fromEntries(CLASSES.map(item => [item,String(record?.monthly_fees?.[item] ?? '')]))); setExamFees(record?.exam_fees || []);
    }).catch(error => Alert.alert('Could not load fee setup', error.message)).finally(() => setBusy(false));
  }, [code, session?.role]);

  const addExam = () => {
    if (!examName.trim() || !examType.trim() || CLASSES.some(item => examAmounts[item] === undefined || examAmounts[item] === '')) return Alert.alert('Complete exam fee', 'Enter exam name, type and amount for every class.');
    setExamFees(current => [...current,{id:String(Date.now()),name:examName.trim(),type:examType.trim(),class_amounts:Object.fromEntries(CLASSES.map(item=>[item,Number(examAmounts[item])]))}]);
    setExamName(''); setExamType(''); setExamAmounts({});
  };
  const save = async () => {
    if (!school?.id) return;
    if (CLASSES.some(item => monthly[item] === undefined || monthly[item] === '')) return Alert.alert('Complete monthly fees', 'Enter an amount for every class. Use 0 where no fee applies.');
    setSaving(true);
    try {
      const updated = await api.updateRecord<School>('schools',school.id,{monthly_fees:Object.fromEntries(CLASSES.map(item=>[item,Number(monthly[item])])),exam_fees:examFees});
      if (updated[0]) { setSchool(updated[0]); await updateUser(updated[0]); }
      Alert.alert('Fee setup saved','Monthly and exam fees are now available in every student ledger.');
    } catch (error) { Alert.alert('Save failed',error instanceof Error?error.message:'Please retry.'); }
    finally { setSaving(false); }
  };
  if (!session) return null;
  return <View style={styles.page}><AppHeader school={school || undefined} back/><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets>
    <View style={styles.hero}><Text style={styles.kicker}>FINANCE CONFIGURATION</Text><Text style={styles.title}>Fee Setup</Text><Text style={styles.copy}>Set fees once for your school. Student ledgers use these class-wise amounts automatically.</Text></View>
    {busy ? <View style={styles.panel}><Skeleton width="55%" height={24}/>{[1,2,3,4].map(item=><Skeleton key={item} height={58}/>)}</View> : <>
      <View style={styles.panel}><Text style={styles.panelKicker}>MONTHLY FEES</Text><Text style={styles.panelTitle}>Class-wise monthly amount</Text><Text style={styles.hint}>Enter 0 when a class has no monthly fee.</Text>{CLASSES.map(item=><AmountRow key={item} title={label(item)} value={monthly[item] || ''} onChange={value=>setMonthly(current=>({...current,[item]:value}))}/>)}</View>
      <View style={styles.panel}><Text style={styles.panelKicker}>EXAM FEES</Text><Text style={styles.panelTitle}>Create an exam fee</Text><TextInput style={styles.input} placeholder="Exam name · e.g. Annual Examination" placeholderTextColor="#948b80" value={examName} onChangeText={setExamName}/><TextInput style={styles.input} placeholder="Exam type · e.g. Final" placeholderTextColor="#948b80" value={examType} onChangeText={setExamType}/>{CLASSES.map(item=><AmountRow key={item} title={label(item)} value={examAmounts[item] || ''} onChange={value=>setExamAmounts(current=>({...current,[item]:value}))}/>)}<Pressable style={styles.secondary} onPress={addExam}><Text style={styles.secondaryText}>＋ Add exam fee</Text></Pressable></View>
      {examFees.length ? <View style={styles.panel}><Text style={styles.panelKicker}>SAVED EXAM FEES</Text>{examFees.map(item=><View key={item.id} style={styles.examCard}><View style={styles.flex}><Text style={styles.examName}>{item.name}</Text><Text style={styles.examType}>{item.type} · {Object.keys(item.class_amounts || {}).length} classes</Text></View><Pressable onPress={()=>setExamFees(current=>current.filter(fee=>fee.id!==item.id))}><Text style={styles.remove}>Remove</Text></Pressable></View>)}</View> : null}
      <Pressable disabled={saving} style={[styles.save,saving&&styles.disabled]} onPress={save}>{saving?<ActivityIndicator color="#fff"/>:<Text style={styles.saveText}>Save complete fee setup</Text>}</Pressable>
    </>}
  </ScrollView></KeyboardAvoidingView></View>;
}

function AmountRow({title,value,onChange}:{title:string;value:string;onChange:(value:string)=>void}) { return <View style={styles.amountRow}><Text style={styles.amountLabel}>{title}</Text><View style={styles.amountBox}><Text style={styles.rupee}>₹</Text><TextInput style={styles.amountInput} value={value} onChangeText={text=>onChange(text.replace(/\D/g,''))} keyboardType="number-pad" placeholder="Amount" placeholderTextColor="#948b80"/></View></View>; }
const styles=StyleSheet.create({page:{flex:1,backgroundColor:colors.cream},content:{width:'100%',maxWidth:720,alignSelf:'center',padding:18,paddingBottom:60,gap:16},hero:{backgroundColor:colors.ink,borderRadius:24,padding:22},kicker:{color:colors.gold,fontSize:9,fontWeight:'900',letterSpacing:1.5},title:{color:'#fff',fontSize:31,fontWeight:'900',marginTop:5},copy:{color:'#d8d0c4',fontSize:13,lineHeight:19,marginTop:7},panel:{backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:22,padding:17,gap:10},panelKicker:{color:colors.brown,fontSize:9,fontWeight:'900',letterSpacing:1.4},panelTitle:{color:colors.ink,fontSize:21,fontWeight:'900'},hint:{color:colors.muted,fontSize:11,marginBottom:4},amountRow:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:'#fbf7ef',borderWidth:1,borderColor:'#eee2d1',borderRadius:14,padding:10},amountLabel:{flex:1,color:colors.ink,fontWeight:'800'},amountBox:{width:150,minHeight:46,flexDirection:'row',alignItems:'center',borderWidth:1,borderColor:colors.line,borderRadius:11,backgroundColor:'#fff'},rupee:{paddingLeft:12,color:colors.brown,fontWeight:'900'},amountInput:{flex:1,paddingHorizontal:8,color:colors.ink,fontWeight:'800'},input:{minHeight:52,borderWidth:1,borderColor:colors.line,borderRadius:13,paddingHorizontal:14,color:colors.ink,backgroundColor:'#fbf7ef'},secondary:{minHeight:50,borderRadius:13,backgroundColor:colors.gold,alignItems:'center',justifyContent:'center'},secondaryText:{color:colors.ink,fontWeight:'900'},examCard:{flexDirection:'row',alignItems:'center',gap:12,borderTopWidth:1,borderTopColor:'#eee4d5',paddingVertical:13},flex:{flex:1},examName:{color:colors.ink,fontWeight:'900',fontSize:15},examType:{color:colors.muted,fontSize:11,marginTop:3},remove:{color:colors.danger,fontWeight:'900'},save:{minHeight:56,borderRadius:15,backgroundColor:colors.ink,borderBottomWidth:5,borderBottomColor:colors.gold,alignItems:'center',justifyContent:'center'},saveText:{color:'#fff',fontWeight:'900',fontSize:15},disabled:{opacity:.6}});
