import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Avatar, Back, Brand } from '@/components/ui';
import { colors } from '@/constants/colors';
import { useAuth } from '@/context/auth-context';
import { api, School, Student } from '@/lib/api';

export default function StudentDetail() {
  const { studentId } = useLocalSearchParams<{studentId:string}>();
  const { session } = useAuth(); const [student,setStudent]=useState<Student|null>(null); const [school,setSchool]=useState<School|null>(null);
  useEffect(()=>{if(!session||session.role!=='admin')return router.replace('/');void Promise.all([api.getStudent(studentId),api.getSchool(session.user.school_code)]).then(([s,sc])=>{setStudent(s);setSchool(sc);});},[studentId,session?.user.school_code]);
  if(!student)return <View style={styles.center}><ActivityIndicator color={colors.gold}/></View>;
  const go=(path:string)=>router.push(`${path}${path.includes('?')?'&':'?'}studentId=${student.id}` as never);
  return <View style={styles.page}><View style={styles.nav}><Back/><Brand school={school||undefined}/></View><ScrollView contentContainerStyle={styles.content}><View style={styles.hero}><Avatar name={student.name} uri={student.photo_url} size={110}/><Text style={styles.name}>{student.name}</Text><Text style={styles.meta}>Class {student.class}-{student.section} · Roll {student.roll}</Text><Text style={styles.meta}>{student.number}</Text></View><View style={styles.actions}><Card title="Student profile" copy="View, edit, photo and PIN" onPress={()=>go('/profile')}/><Card title="Fee ledger" copy="Persistent paid and pending months" onPress={()=>go('/records?kind=fees')}/><Card title="Exam results" copy="Create, update and publish marks" onPress={()=>go('/records?kind=results')}/></View></ScrollView></View>;
}
function Card({title,copy,onPress}:{title:string;copy:string;onPress:()=>void}){return <Pressable style={styles.card} onPress={onPress}><View><Text style={styles.cardTitle}>{title}</Text><Text style={styles.cardCopy}>{copy}</Text></View><Text style={styles.arrow}>→</Text></Pressable>}
const styles=StyleSheet.create({page:{flex:1,backgroundColor:colors.cream},center:{flex:1,justifyContent:'center',backgroundColor:colors.cream},nav:{padding:18,flexDirection:'row',alignItems:'center',gap:18,backgroundColor:colors.paper},content:{padding:20,paddingBottom:60,gap:18},hero:{backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:28,padding:24,alignItems:'center',gap:6},name:{fontSize:30,fontWeight:'900',color:colors.ink,marginTop:8},meta:{color:colors.muted},actions:{gap:10},card:{backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:19,padding:18,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},cardTitle:{fontSize:18,fontWeight:'900',color:colors.ink},cardCopy:{fontSize:12,color:colors.muted,marginTop:4},arrow:{fontSize:23,color:colors.brown,fontWeight:'900'}});
