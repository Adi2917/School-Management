import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Avatar, Back, Brand } from '@/components/ui';
import { colors } from '@/constants/colors';
import { useAuth } from '@/context/auth-context';
import { api, School, Student } from '@/lib/api';

export default function StudentsScreen() {
  const { session } = useAuth();
  const [school, setSchool] = useState<School | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [query, setQuery] = useState('');
  const [section, setSection] = useState('ALL');
  useEffect(() => {
    if (!session || session.role !== 'admin') return router.replace('/');
    void Promise.all([api.getSchool(session.user.school_code), api.getStudents(session.user.school_code)]).then(([nextSchool, nextStudents]) => { setSchool(nextSchool); setStudents(nextStudents); });
  }, [session?.user.school_code]);
  const filtered = useMemo(() => students.filter(student => (section === 'ALL' || student.section === section) && `${student.name} ${student.roll} ${student.class}`.toLowerCase().includes(query.toLowerCase())), [query, section, students]);
  if (!session) return null;
  return <View style={styles.page}><View style={styles.nav}><Back/><Brand school={school || undefined}/></View><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.kicker}>STUDENT DIRECTORY</Text><Text style={styles.title}>All students</Text><Text style={styles.sub}>{students.length} records connected to school code {session.user.school_code}</Text>
    <TextInput value={query} onChangeText={setQuery} placeholder="Search name, class or roll" placeholderTextColor="#948b80" style={styles.search}/>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{['ALL','A','B','C'].map(item => <Pressable key={item} onPress={()=>setSection(item)} style={[styles.chip,section===item&&styles.active]}><Text style={styles.chipText}>{item === 'ALL' ? 'All sections' : `Section ${item}`}</Text></Pressable>)}</ScrollView>
    {!school ? <ActivityIndicator color={colors.gold}/> : <View style={styles.list}>{filtered.map(student => <Pressable key={student.id} style={styles.row} onPress={()=>router.push({pathname:'/student-detail',params:{studentId:student.id}})}><Avatar name={student.name} uri={student.photo_url} size={50}/><View style={styles.flex}><Text style={styles.name}>{student.name}</Text><Text style={styles.meta}>Class {student.class}-{student.section} · Roll {student.roll}</Text></View><Text style={styles.arrow}>→</Text></Pressable>)}</View>}
  </ScrollView></View>;
}
const styles=StyleSheet.create({page:{flex:1,backgroundColor:colors.cream},nav:{padding:18,flexDirection:'row',alignItems:'center',gap:18,backgroundColor:colors.paper},content:{padding:20,paddingBottom:60,gap:12},kicker:{color:colors.brown,fontSize:10,fontWeight:'900',letterSpacing:1.5},title:{color:colors.ink,fontSize:34,fontWeight:'900'},sub:{color:colors.muted},search:{backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:15,padding:15,fontSize:16,color:colors.ink,marginTop:8},chips:{gap:8,paddingVertical:3},chip:{borderWidth:1,borderColor:colors.line,borderRadius:999,paddingHorizontal:15,paddingVertical:10,backgroundColor:colors.paper},active:{backgroundColor:colors.gold},chipText:{fontWeight:'800',color:colors.ink},list:{gap:10},row:{backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:18,padding:14,flexDirection:'row',alignItems:'center',gap:12},flex:{flex:1},name:{fontWeight:'900',fontSize:16,color:colors.ink},meta:{color:colors.muted,fontSize:12,marginTop:3},arrow:{color:colors.brown,fontSize:21,fontWeight:'900'}});
