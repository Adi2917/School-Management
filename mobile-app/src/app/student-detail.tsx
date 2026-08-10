import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppHeader, Avatar, Skeleton } from '@/components/ui';
import { colors } from '@/constants/colors';
import { useAuth } from '@/context/auth-context';
import { api, School, Student } from '@/lib/api';

export default function StudentDetail() {
  const { studentId } = useLocalSearchParams<{studentId:string}>();
  const { session } = useAuth();
  const [student,setStudent] = useState<Student|null>(null);
  const [school,setSchool] = useState<School|null>(null);
  const [loaded,setLoaded] = useState(false);
  useEffect(() => {
    if (!session || session.role !== 'admin') { router.replace('/'); return; }
    let active = true;
    Promise.all([api.getStudent(studentId), api.getSchool(session.user.school_code)])
      .then(([nextStudent,nextSchool]) => { if (active) { setStudent(nextStudent); setSchool(nextSchool); } })
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [studentId,session?.role,session?.user.school_code]);
  if (!session) return null;
  const go = (path:string) => student && router.push(`${path}${path.includes('?')?'&':'?'}studentId=${student.id}` as never);
  return <View style={styles.page}><AppHeader school={school || undefined} back/><ScrollView contentContainerStyle={styles.content}>
    {!loaded ? <><View style={styles.schoolBand}><Skeleton width={50} height={50} radius={25}/><View style={styles.flex}><Skeleton width="70%" height={13}/><Skeleton width="52%" height={22}/></View></View><View style={styles.hero}><Skeleton width={98} height={98} radius={49}/><Skeleton width="62%" height={26}/><Skeleton width="38%" height={14}/></View></> : !student ? <View style={styles.missing}><Text style={styles.missingTitle}>Student not found</Text><Text style={styles.copy}>This record may have been removed or is unavailable.</Text></View> : <>
      <View style={styles.schoolBand}><Avatar name={school?.school_name || 'School'} uri={school?.school_logo} size={50}/><View style={styles.flex}><Text style={styles.bandKicker}>SCHOOL STUDENT RECORD · CODE {session.user.school_code}</Text><Text style={styles.bandTitle} numberOfLines={2}>{school?.school_name || 'Connected school'}</Text></View></View>
      <View style={styles.hero}><Avatar name={student.name} uri={student.photo_url} size={102}/><Text style={styles.enrolled}>ENROLLED STUDENT</Text><Text style={styles.name}>{student.name}</Text><Text style={styles.meta}>Class {student.class}-{student.section} · Roll {student.roll}</Text>{student.number ? <Text style={styles.phone}>{student.number}</Text> : null}</View>
      <View style={styles.actions}><Card badge="ID" title="Student profile" copy="Personal details, photo and PIN" onPress={() => go('/profile')}/><Card badge="₹" title="Fee ledger" copy="Paid and pending monthly fees" onPress={() => go('/records?kind=fees')}/><Card badge="A+" title="Exam results" copy="Create and publish academic results" onPress={() => go('/records?kind=results')}/></View>
    </>}
  </ScrollView></View>;
}
function Card({badge,title,copy,onPress}:{badge:string;title:string;copy:string;onPress:()=>void}) { return <Pressable style={styles.card} onPress={onPress}><View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View><View style={styles.flex}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.copy}>{copy}</Text></View><Text style={styles.arrow}>›</Text></Pressable>; }
const styles = StyleSheet.create({page:{flex:1,backgroundColor:colors.cream},content:{padding:20,paddingBottom:70,gap:16},schoolBand:{backgroundColor:colors.ink,borderRadius:22,padding:16,flexDirection:'row',alignItems:'center',gap:13},flex:{flex:1,gap:5},bandKicker:{color:colors.gold,fontSize:8,fontWeight:'900',letterSpacing:1.2},bandTitle:{color:'#fff',fontSize:19,fontWeight:'900'},hero:{backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:26,padding:24,alignItems:'center',gap:7},enrolled:{color:colors.brown,fontSize:9,fontWeight:'900',letterSpacing:1.4,marginTop:7},name:{fontSize:29,fontWeight:'900',color:colors.ink,textAlign:'center'},meta:{color:colors.muted,fontSize:15},phone:{color:colors.brown,fontWeight:'800'},actions:{gap:10},card:{backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:19,padding:15,flexDirection:'row',alignItems:'center',gap:13},badge:{width:49,height:49,borderRadius:15,backgroundColor:colors.gold,alignItems:'center',justifyContent:'center'},badgeText:{fontWeight:'900',fontSize:15,color:colors.ink},cardTitle:{fontSize:17,fontWeight:'900',color:colors.ink},copy:{fontSize:12,color:colors.muted,lineHeight:17},arrow:{fontSize:28,color:colors.brown},missing:{backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:24,padding:36,alignItems:'center',gap:8},missingTitle:{fontSize:22,fontWeight:'900',color:colors.ink}});
