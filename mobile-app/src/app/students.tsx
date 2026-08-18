import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { AppHeader, Avatar, Skeleton } from '@/components/ui';
import { colors } from '@/constants/colors';
import { useAuth } from '@/context/auth-context';
import { api, School, Student } from '@/lib/api';

const SECTIONS = ['ALL', 'A', 'B', 'C'];
const CLASSES = ['Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
const classLabel = (value: string) => ['Nursery', 'LKG', 'UKG'].includes(value) ? value : `Class ${value}`;

export default function StudentsScreen() {
  const { session } = useAuth();
  const [school, setSchool] = useState<School | null>(null);
  const [students, setStudents] = useState<Student[] | null>(null);
  const [query, setQuery] = useState('');
  const [section, setSection] = useState('ALL');
  const [selectedClass, setSelectedClass] = useState('');
  const role = session?.role;
  const schoolCode = session?.user.school_code || '';

  useEffect(() => {
    if (!session || role !== 'admin') { router.replace('/'); return; }
    let active = true;
    Promise.all([api.getSchool(schoolCode), api.getStudents(schoolCode)])
      .then(([nextSchool, nextStudents]) => { if (active) { setSchool(nextSchool); setStudents(nextStudents); } })
      .catch(() => { if (active) setStudents([]); });
    return () => { active = false; };
  }, [role, schoolCode]);

  const filtered = useMemo(() => (students || []).filter(student => {
    const sameClass = String(student.class || '').toLowerCase() === selectedClass.toLowerCase();
    const sameSection = section === 'ALL' || student.section?.toUpperCase() === section;
    const term = `${student.name} ${student.roll}`.toLowerCase();
    return sameClass && sameSection && term.includes(query.trim().toLowerCase());
  }), [query, section, selectedClass, students]);

  if (!session) return null;
  return <View style={styles.page}>
    <AppHeader school={school || undefined} back />
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.heading}><Text style={styles.kicker}>STUDENT DIRECTORY</Text><Text style={styles.title}>{selectedClass ? `${classLabel(selectedClass)} students` : 'Choose a class'}</Text><Text style={styles.sub}>{selectedClass ? `${filtered.length} matching students · School code ${schoolCode}` : 'Open a class, then choose All, A, B or C section.'}</Text></View>
      {!selectedClass ? <View style={styles.classGrid}>{CLASSES.map(item => {
        const count = (students || []).filter(student => String(student.class || '').toLowerCase() === item.toLowerCase()).length;
        return <Pressable key={item} style={styles.classCard} onPress={() => { setSelectedClass(item); setSection('ALL'); setQuery(''); }}><Text style={styles.classKicker}>CLASS DIRECTORY</Text><Text style={styles.className}>{classLabel(item)}</Text><Text style={styles.classCount}>{students === null ? '—' : count} students  →</Text></Pressable>;
      })}</View> : <>
        <Pressable style={styles.changeClass} onPress={() => { setSelectedClass(''); setSection('ALL'); setQuery(''); }}><Text style={styles.changeClassText}>← Change class</Text></Pressable>
        <TextInput value={query} onChangeText={setQuery} placeholder="Search name or roll number" placeholderTextColor="#948b80" style={styles.search}/>
        <View style={styles.chips}>{SECTIONS.map(item => <Pressable key={item} onPress={() => setSection(item)} style={[styles.chip, section === item && styles.active]}><Text style={styles.chipText}>{item === 'ALL' ? 'All' : item}</Text></Pressable>)}</View>
        {students === null ? <View style={styles.list}>{[1,2,3,4].map(i => <View key={i} style={styles.row}><Skeleton width={50} height={50} radius={25}/><View style={styles.flex}><Skeleton width="55%" height={16}/><Skeleton width="38%" height={11}/></View></View>)}</View> : filtered.length ? <View style={styles.list}>{filtered.map(student => <Pressable key={student.id} style={styles.row} onPress={() => router.push({ pathname:'/student-detail', params:{ studentId:student.id } })}><Avatar name={student.name} uri={student.photo_url} size={50}/><View style={styles.flex}><Text style={styles.name}>{student.name}</Text><Text style={styles.meta}>Class {student.class}-{student.section} · Roll {student.roll}</Text></View><Text style={styles.arrow}>›</Text></Pressable>)}</View> : <View style={styles.empty}><Text style={styles.emptyIcon}>⌕</Text><Text style={styles.emptyTitle}>No students found</Text><Text style={styles.emptyCopy}>This class or section has no matching student.</Text></View>}
      </>}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  page:{flex:1,backgroundColor:colors.cream},content:{padding:20,paddingBottom:70,gap:16},heading:{gap:6},kicker:{color:colors.brown,fontSize:10,fontWeight:'900',letterSpacing:1.7},title:{color:colors.ink,fontSize:34,fontWeight:'900',letterSpacing:-1},sub:{color:colors.muted,fontSize:14,lineHeight:20},
  classGrid:{flexDirection:'row',flexWrap:'wrap',gap:11},classCard:{width:'47%',flexGrow:1,minHeight:132,backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:20,padding:17,justifyContent:'space-between'},classKicker:{color:colors.brown,fontSize:8,fontWeight:'900',letterSpacing:1.2},className:{color:colors.ink,fontSize:22,fontWeight:'900'},classCount:{color:colors.muted,fontSize:11,fontWeight:'700'},changeClass:{alignSelf:'flex-start',backgroundColor:colors.ink,borderRadius:12,paddingHorizontal:15,paddingVertical:11},changeClassText:{color:'#fff',fontWeight:'900'},
  search:{backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:16,paddingHorizontal:17,paddingVertical:15,fontSize:16,color:colors.ink},chips:{flexDirection:'row',gap:8},chip:{flex:1,minWidth:58,borderWidth:1,borderColor:colors.line,borderRadius:14,paddingVertical:11,alignItems:'center',backgroundColor:colors.paper},active:{backgroundColor:colors.gold,borderColor:colors.gold},chipText:{fontWeight:'900',color:colors.ink},list:{gap:10},row:{minHeight:78,backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:19,padding:13,flexDirection:'row',alignItems:'center',gap:12},flex:{flex:1,gap:7},name:{fontWeight:'900',fontSize:16,color:colors.ink},meta:{color:colors.muted,fontSize:12},arrow:{color:colors.brown,fontSize:28,fontWeight:'700'},empty:{backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:22,padding:38,alignItems:'center',gap:7},emptyIcon:{fontSize:36,color:colors.brown},emptyTitle:{fontSize:19,fontWeight:'900',color:colors.ink},emptyCopy:{color:colors.muted,textAlign:'center'}
});
