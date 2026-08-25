import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader, Avatar, Skeleton } from '@/components/ui';
import { colors } from '@/constants/colors';
import { useAuth } from '@/context/auth-context';
import { api, School, Student } from '@/lib/api';

type StudentExtra = {
  school?: School | null;
  notices?: Record<string, unknown>[] | null;
  fees?: Record<string, unknown>[] | null;
  results?: Record<string, unknown>[] | null;
};

export function Dashboard({ role }: { role: 'admin' | 'student' }) {
  const { session, signOut, loading } = useAuth();
  const [freshUser, setFreshUser] = useState<School | Student>();
  const [students, setStudents] = useState<Student[] | null>(null);
  const [studentExtra, setStudentExtra] = useState<StudentExtra>({ notices: null, fees: null, results: null });
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');

  const sessionRole = session?.role;
  const sessionUser = session?.user;
  const recordId = String(sessionUser && 'id' in sessionUser ? sessionUser.id ?? '' : '');
  const schoolCode = sessionUser?.school_code ?? '';

  const refresh = useCallback(async (manual = false, silent = false) => {
    if (!sessionUser || sessionRole !== role) return;
    if (!silent) manual ? setRefreshing(true) : setSyncing(true);
    setError('');
    try {
      if (role === 'admin') {
        const [school, latestStudents] = await Promise.all([api.getSchool(schoolCode), api.getStudents(schoolCode)]);
        if (!school) throw new Error('School record not found.');
        setFreshUser(school);
        setStudents(latestStudents);
      } else {
        const student = await api.getStudent(recordId);
        if (!student) throw new Error('Student record not found.');
        const [school, notices, fees, results] = await Promise.all([
          api.getSchool(student.school_code), api.getNotices(student.school_code), api.getFees(student.id), api.getResults(student.id),
        ]);
        setFreshUser(student);
        setStudentExtra({ school, notices, fees, results });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not sync data.');
    } finally {
      if (!silent) { setRefreshing(false); setSyncing(false); }
    }
  }, [recordId, role, schoolCode, sessionRole, sessionUser]);

  useFocusEffect(useCallback(() => {
    if (loading) return;
    if (!session || session.role !== role) { router.replace('/'); return; }
    void refresh(false);
    const liveRefresh = setInterval(() => void refresh(false, true), 1500);
    return () => clearInterval(liveRefresh);
  }, [loading, role, sessionRole, refresh]));

  if (loading || !session || session.role !== role) return <View style={styles.boot}><Skeleton width={210} height={18} /><Skeleton width="88%" height={128} radius={24} /></View>;

  const user = freshUser ?? session.user;
  const school: School = role === 'admin' ? user as School : studentExtra.school ?? {
    school_code: (user as Student).school_code,
    school_name: (user as Student).school_name || 'School Portal',
    school_logo: (user as Student).school_logo,
  };

  const logout = async () => { await signOut(); router.replace('/'); };

  return (
    <View style={styles.page}>
      <AppHeader school={school} back={false} onLogout={logout} />
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => refresh(true)} tintColor={colors.gold} colors={[colors.gold]} />}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.welcome}>
          <Text style={styles.kicker}>{role === 'admin' ? 'SCHOOL CONSOLE' : 'STUDENT WORKSPACE'}</Text>
          <Text style={styles.title}>Good to see you, {role === 'admin' ? (user as School).admin_name || 'Admin' : (user as Student).name?.split(' ')[0] || 'Student'}.</Text>
          <Text style={styles.copy}>{role === 'admin' ? 'Your school workspace is ready.' : 'Everything from your classroom, in one calm place.'}</Text>
        </View>

        {error ? <Pressable onPress={() => refresh(true)} style={styles.error}><Text style={styles.errorText}>{error} Tap to retry.</Text></Pressable> : null}
        {role === 'student'
          ? <StudentView student={user as Student} school={school} extra={studentExtra} />
          : <AdminView school={user as School} students={students} />}
        <Text style={styles.sync}>{syncing ? 'Syncing latest records…' : 'Secure live data · Connect Your School'}</Text>
      </ScrollView>
    </View>
  );
}

function StudentView({ student, school, extra }: { student: Student; school: School; extra: StudentExtra }) {
  const paidMonths = extra.fees ? extra.fees.filter((fee) => fee.status === 'Paid').length : null;
  const examCount = useMemo(() => extra.results ? new Set(extra.results.map((result) => String(result.exam_type_id ?? result.exam_name ?? ''))).size : null, [extra.results]);
  return (
    <>
      <View style={styles.schoolBand}>
        <Avatar name={school.school_name} uri={school.school_logo} size={56} />
        <View style={styles.flex}>
          <Text style={styles.bandLabel}>MY SCHOOL · CODE {student.school_code}</Text>
          <Text style={styles.bandTitle}>{school.school_name || student.school_name}</Text>
          <Text style={styles.bandCopy}>Class {student.class}-{student.section} · Roll {student.roll}</Text>
        </View>
      </View>
      <Pressable style={styles.studentHero} onPress={() => router.push('/profile')}>
        <Avatar name={student.name} uri={student.photo_url} size={90} />
        <View style={styles.studentCopy}>
          <Text style={styles.miniLabel}>ENROLLED STUDENT</Text>
          <Text style={styles.profileName}>{student.name}</Text>
          <Text style={styles.profileSub}>S/O {student.father_name || 'Not provided'}</Text>
          <Text style={styles.profileLink}>Open profile  →</Text>
        </View>
      </Pressable>
      <Text style={styles.sectionTitle}>Academic essentials</Text>
      <View style={styles.actions}>
        <ActionCard icon="₹" value={paidMonths === null ? '—' : `${paidMonths}/12`} label="Fees & receipts" onPress={() => router.push('/records?kind=fees')} />
        <ActionCard icon="A+" value={examCount === null ? '—' : String(examCount)} label="Published results" onPress={() => router.push('/records?kind=results')} />
        <ActionCard icon="✦" value={extra.notices === null ? '—' : String(extra.notices?.length ?? 0)} label="School notices" onPress={() => router.push('/records?kind=notices')} />
      </View>
    </>
  );
}

function AdminView({ school, students }: { school: School; students: Student[] | null }) {
  const activeSections = students ? new Set(students.map((student) => `${student.class}-${student.section}`)).size : null;
  return (
    <>
      <View style={styles.schoolBand}>
        <Avatar name={school.school_name} uri={school.school_logo} size={64} />
        <View style={styles.flex}>
          <Text style={styles.bandLabel}>SCHOOL ADMINISTRATION · CODE {school.school_code}</Text>
          <Text style={styles.bandTitle}>{school.school_name}</Text>
          <Text style={styles.bandCopy}>{school.location || 'Connected school campus'}</Text>
        </View>
      </View>
      <View style={styles.grid}>
        <Metric icon="STUDENTS" value={students ? String(students.length) : '—'} label="Registered students" />
        <Metric icon="SECTIONS" value={activeSections === null ? '—' : String(activeSections)} label="Active class sections" />
        <Metric icon="STATUS" value="Online" label="Database connected" wide />
      </View>
      <Text style={styles.sectionTitle}>School management</Text>
      <View style={styles.actions}>
        <ActionCard icon="₹" value="Collection" label="Daily, weekly, monthly & custom reports" onPress={() => router.push('/collections' as never)} />
        <ActionCard icon="ID" value="Profile" label="Admin & school settings" onPress={() => router.push('/profile')} />
        <ActionCard icon="₹" value="Fee Setup" label="Monthly & exam fee configuration" onPress={() => router.push('/fee-setup' as never)} />
        <ActionCard icon="ALL" value={students ? String(students.length) : '—'} label="Student directory" onPress={() => router.push('/students')} />
        <ActionCard icon="✦" value="Live" label="Manage school notices" onPress={() => router.push('/records?kind=notices')} />
      </View>
      <View style={styles.list}>
        <Text style={styles.listTitle}>Recently synced students</Text>
        {students === null ? [1, 2, 3].map((key) => <View key={key} style={styles.skeletonRow}><Skeleton width={44} height={44} radius={22} /><View style={styles.flex}><Skeleton width="58%" /><Skeleton width="38%" height={12} /></View></View>) : students.length ? students.slice(0, 5).map((student) => (
          <Pressable key={student.id} style={styles.row} onPress={() => router.push({ pathname: '/student-detail', params: { studentId: student.id } })}>
            <Avatar name={student.name} uri={student.photo_url} size={44} />
            <View style={styles.flex}><Text style={styles.rowName}>{student.name}</Text><Text style={styles.rowSub}>Class {student.class}-{student.section} · Roll {student.roll}</Text></View>
            <Text style={styles.open}>Open →</Text>
          </Pressable>
        )) : <Text style={styles.empty}>No students registered yet.</Text>}
      </View>
    </>
  );
}

function Metric({ icon, value, label, wide = false }: { icon: string; value: string; label: string; wide?: boolean }) {
  return <View style={[styles.metric, wide && styles.metricWide]}><Text style={styles.metricIcon}>{icon}</Text><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

function ActionCard({ icon, value, label, onPress }: { icon: string; value: string; label: string; onPress: () => void }) {
  return <Pressable style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]} onPress={onPress}><Text style={styles.actionIcon}>{icon}</Text><View style={styles.flex}><Text style={styles.actionValue}>{value}</Text><Text style={styles.actionLabel}>{label}</Text></View><Text style={styles.chevron}>→</Text></Pressable>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.cream },
  scroll: { paddingHorizontal: 18, paddingTop: 24, paddingBottom: 44, gap: 18 },
  boot: { flex: 1, gap: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream },
  flex: { flex: 1, minWidth: 0 },
  welcome: { gap: 7 },
  kicker: { color: colors.brown, fontWeight: '900', letterSpacing: 2, fontSize: 10 },
  title: { color: colors.ink, fontSize: 30, lineHeight: 34, fontWeight: '900' },
  copy: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  error: { backgroundColor: '#fce8e4', padding: 13, borderRadius: 14 },
  errorText: { color: colors.danger, fontWeight: '700', fontSize: 13 },
  schoolBand: { backgroundColor: colors.ink, borderRadius: 24, padding: 17, flexDirection: 'row', alignItems: 'center', gap: 14 },
  bandLabel: { color: colors.gold, fontWeight: '900', fontSize: 8, letterSpacing: 1 },
  bandTitle: { color: '#fff', fontSize: 21, lineHeight: 24, fontWeight: '900', marginTop: 4 },
  bandCopy: { color: '#ded7cb', fontSize: 12, marginTop: 3 },
  studentHero: { backgroundColor: colors.paper, borderColor: colors.line, borderWidth: 1, borderRadius: 25, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 17 },
  studentCopy: { flex: 1, minWidth: 0, gap: 4 },
  miniLabel: { color: colors.brown, fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  profileName: { fontSize: 25, lineHeight: 29, fontWeight: '900', color: colors.ink },
  profileSub: { color: colors.muted, fontSize: 12 },
  profileLink: { color: colors.brown, fontWeight: '900', fontSize: 12, marginTop: 7 },
  sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '900', marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actions: { gap: 10 },
  actionCard: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 13 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  actionIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: colors.gold, color: colors.ink, textAlign: 'center', textAlignVertical: 'center', fontWeight: '900', fontSize: 14 },
  actionValue: { color: colors.ink, fontSize: 17, fontWeight: '900' },
  actionLabel: { color: colors.muted, fontSize: 12, marginTop: 2 },
  chevron: { color: colors.brown, fontWeight: '900', fontSize: 20 },
  open: { color: colors.brown, fontWeight: '900', fontSize: 11 },
  metric: { width: '48%', flexGrow: 1, backgroundColor: colors.paper, borderColor: colors.line, borderWidth: 1, borderRadius: 18, padding: 15 },
  metricWide: { width: '100%' },
  metricIcon: { color: colors.brown, fontSize: 9, fontWeight: '900', letterSpacing: 0.9 },
  metricValue: { color: colors.ink, fontSize: 23, fontWeight: '900', marginTop: 8 },
  metricLabel: { color: colors.muted, fontSize: 11, marginTop: 2 },
  list: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 23, padding: 16, gap: 4 },
  listTitle: { fontSize: 19, fontWeight: '900', color: colors.ink, marginBottom: 7 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee4d5' },
  skeletonRow: { flexDirection: 'row', gap: 11, alignItems: 'center', paddingVertical: 10 },
  rowName: { fontWeight: '800', color: colors.ink },
  rowSub: { color: colors.muted, fontSize: 11, marginTop: 2 },
  empty: { color: colors.muted, paddingVertical: 14 },
  sync: { textAlign: 'center', color: colors.muted, fontSize: 10 },
});
