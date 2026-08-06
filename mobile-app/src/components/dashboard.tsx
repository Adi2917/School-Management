import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { Avatar, Brand } from '@/components/ui';
import { colors } from '@/constants/colors';
import { useAuth } from '@/context/auth-context';
import { api, School, Student } from '@/lib/api';

type StudentExtra = {
  school?: School | null;
  notices?: Record<string, unknown>[];
  fees?: Record<string, unknown>[];
  results?: Record<string, unknown>[];
};

export function Dashboard({ role }: { role: 'admin' | 'student' }) {
  const { session, signOut, updateUser, loading } = useAuth();
  const [freshUser, setFreshUser] = useState<School | Student>();
  const [students, setStudents] = useState<Student[]>([]);
  const [studentExtra, setStudentExtra] = useState<StudentExtra>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const sessionRole = session?.role;
  const sessionUser = session?.user;
  const recordId = String(sessionUser && 'id' in sessionUser ? sessionUser.id ?? '' : '');
  const schoolCode = sessionUser?.school_code ?? '';

  const refresh = useCallback(async () => {
    if (!sessionUser || sessionRole !== role) return;

    setBusy(true);
    setError('');

    try {
      if (role === 'admin') {
        const school = await api.getSchool(schoolCode);
        if (!school) throw new Error('School record not found.');

        const latestStudents = await api.getStudents(school.school_code);
        setFreshUser(school);
        setStudents(latestStudents);
        await updateUser(school);
      } else {
        const student = await api.getStudent(recordId);
        if (!student) throw new Error('Student record not found.');

        const [school, notices, fees, results] = await Promise.all([
          api.getSchool(student.school_code),
          api.getNotices(student.school_code),
          api.getFees(student.id),
          api.getResults(student.id),
        ]);

        setFreshUser(student);
        setStudentExtra({ school, notices, fees, results });
        await updateUser(student);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not sync data.');
    } finally {
      setBusy(false);
    }
  }, [recordId, role, schoolCode, sessionRole, sessionUser, updateUser]);

  useEffect(() => {
    if (loading) return;
    if (!session || session.role !== role) {
      router.replace('/');
      return;
    }
    void refresh();
  }, [loading, role, sessionRole]);

  const logout = async () => {
    await signOut();
    router.replace('/');
  };

  if (loading || !session || session.role !== role) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  const user = freshUser ?? session.user;
  const school =
    role === 'admin'
      ? (user as School)
      : studentExtra.school ?? {
          school_code: (user as Student).school_code,
          school_name: (user as Student).school_name || 'School Portal',
          school_logo: (user as Student).school_logo,
        };

  return (
    <View style={styles.page}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={busy} onRefresh={refresh} tintColor={colors.gold} />
        }
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.nav}>
          <Brand school={school} />
          <Pressable onPress={logout} hitSlop={12}>
            <Text style={styles.logout}>Logout</Text>
          </Pressable>
        </View>

        <View style={styles.welcome}>
          <Text style={styles.kicker}>
            {role === 'admin' ? 'SCHOOL CONSOLE' : 'STUDENT WORKSPACE'}
          </Text>
          <Text style={styles.title}>
            Good to see you,{' '}
            {role === 'admin'
              ? (user as School).admin_name || 'Admin'
              : (user as Student).name?.split(' ')[0] || 'Student'}.
          </Text>
          <Text style={styles.copy}>
            {role === 'admin'
              ? 'Your latest school records are synced below.'
              : 'Everything from your classroom, in one calm place.'}
          </Text>
        </View>

        {error ? (
          <Pressable onPress={refresh} style={styles.error}>
            <Text style={styles.errorText}>{error} Tap to retry.</Text>
          </Pressable>
        ) : null}

        {role === 'student' ? (
          <StudentView
            student={user as Student}
            school={school}
            extra={studentExtra}
          />
        ) : (
          <AdminView school={user as School} students={students} />
        )}

        <Text style={styles.sync}>
          {busy ? 'Syncing latest records...' : 'Live data from Connect Your School'}
        </Text>
      </ScrollView>
    </View>
  );
}

function StudentView({
  student,
  school,
  extra,
}: {
  student: Student;
  school: Pick<School, 'school_code' | 'school_name' | 'school_logo'>;
  extra: StudentExtra;
}) {
  const paidMonths = (extra.fees ?? []).filter((fee) => fee.status === 'Paid').length;
  const examCount = new Set(
    (extra.results ?? []).map((result) => String(result.exam_type_id ?? result.exam_name ?? '')),
  ).size;

  return (
    <>
      <View style={styles.schoolBand}>
        <Avatar name={school.school_name} uri={school.school_logo} size={58} />
        <View style={styles.flex}>
          <Text style={styles.bandLabel}>MY SCHOOL - CODE {student.school_code}</Text>
          <Text style={styles.bandTitle}>{school.school_name || student.school_name}</Text>
          <Text style={styles.bandCopy}>
            Class {student.class}-{student.section} - Roll {student.roll}
          </Text>
        </View>
      </View>

      <Pressable style={styles.profile} onPress={() => router.push('/profile')}>
        <Avatar name={student.name} uri={student.photo_url} size={104} />
        <Text style={styles.profileName}>{student.name}</Text>
        <Text style={styles.profileSub}>
          S/O {student.father_name || 'Not provided'} - {student.number}
        </Text>
        <Text style={styles.open}>View & edit profile →</Text>
      </Pressable>

      <View style={styles.actions}>
        <ActionCard icon="₹" value={`${paidMonths}/12`} label="Fees & receipts" onPress={() => router.push('/records?kind=fees')} />
        <ActionCard icon="A+" value={String(examCount)} label="Exam results" onPress={() => router.push('/records?kind=results')} />
        <ActionCard icon="✦" value={String(extra.notices?.length ?? 0)} label="School notices" onPress={() => router.push('/records?kind=notices')} />
      </View>
    </>
  );
}

function AdminView({ school, students }: { school: School; students: Student[] }) {
  const activeSections = new Set(students.map((student) => `${student.class}-${student.section}`));

  return (
    <>
      <View style={styles.schoolBand}>
        <Avatar name={school.school_name} uri={school.school_logo} size={70} />
        <View style={styles.flex}>
          <Text style={styles.bandLabel}>SCHOOL ADMINISTRATION - CODE {school.school_code}</Text>
          <Text style={styles.bandTitle}>{school.school_name}</Text>
          <Text style={styles.bandCopy}>{school.location || 'Connected school campus'}</Text>
        </View>
      </View>

      <View style={styles.grid}>
        <Metric icon="STUDENTS" value={String(students.length)} label="Registered students" />
        <Metric icon="CLASS" value={String(activeSections.size)} label="Active class sections" />
        <Metric icon="LIVE" value="Online" label="Database status" />
      </View>

      <View style={styles.actions}>
        <ActionCard icon="ID" value="Edit" label="Admin & school profile" onPress={() => router.push('/profile')} />
        <ActionCard icon="ALL" value={String(students.length)} label="Student directory" onPress={() => router.push('/students')} />
        <ActionCard icon="✦" value="Live" label="Manage school notices" onPress={() => router.push('/records?kind=notices')} />
      </View>

      <View style={styles.list}>
        <Text style={styles.listTitle}>Recently synced students</Text>
        {students.length ? (
          students.slice(0, 6).map((student) => (
            <Pressable key={student.id} style={styles.row} onPress={() => router.push({ pathname: '/student-detail', params: { studentId: student.id } })}>
              <Avatar name={student.name} uri={student.photo_url} size={46} />
              <View style={styles.flex}>
                <Text style={styles.rowName}>{student.name}</Text>
                <Text style={styles.rowSub}>
                  Class {student.class}-{student.section} - Roll {student.roll}
                </Text>
              </View>
              <Text style={styles.open}>Open →</Text>
            </Pressable>
          ))
        ) : (
          <Text style={styles.empty}>No students registered yet.</Text>
        )}
      </View>
    </>
  );
}

function Metric({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricIcon}>{icon}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function ActionCard({ icon, value, label, onPress }: { icon: string; value: string; label: string; onPress: () => void }) {
  return <Pressable style={styles.actionCard} onPress={onPress}><Text style={styles.actionIcon}>{icon}</Text><View style={styles.flex}><Text style={styles.actionValue}>{value}</Text><Text style={styles.actionLabel}>{label}</Text></View><Text style={styles.open}>→</Text></Pressable>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.cream },
  scroll: { padding: 20, paddingBottom: 45, gap: 22 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream },
  flex: { flex: 1 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 },
  logout: { color: colors.danger, fontWeight: '800' },
  welcome: { marginTop: 18, gap: 8 },
  kicker: { color: colors.brown, fontWeight: '900', letterSpacing: 2, fontSize: 11 },
  title: { color: colors.ink, fontSize: 36, lineHeight: 41, fontWeight: '900' },
  copy: { color: colors.muted, fontSize: 15 },
  error: { backgroundColor: '#fce8e4', padding: 14, borderRadius: 13 },
  errorText: { color: colors.danger, fontWeight: '700' },
  schoolBand: {
    backgroundColor: colors.ink,
    borderRadius: 24,
    padding: 19,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  bandLabel: { color: colors.gold, fontWeight: '800', fontSize: 9, letterSpacing: 1.1 },
  bandTitle: { color: '#fff', fontSize: 23, fontWeight: '900', marginTop: 3 },
  bandCopy: { color: '#ded7cb', fontSize: 12, marginTop: 2 },
  profile: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 27,
    padding: 25,
    alignItems: 'center',
    gap: 9,
  },
  profileName: { fontSize: 28, fontWeight: '900', color: colors.ink, marginTop: 5 },
  profileSub: { color: colors.muted, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actions: { gap: 10 },
  actionCard: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 19, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 13 },
  actionIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.gold, color: colors.ink, textAlign: 'center', textAlignVertical: 'center', fontWeight: '900', fontSize: 15 },
  actionValue: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  actionLabel: { color: colors.muted, fontSize: 12, marginTop: 2 },
  open: { color: colors.brown, fontWeight: '900', fontSize: 12 },
  metric: {
    minWidth: '30%',
    flexGrow: 1,
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 19,
    padding: 16,
  },
  metricIcon: { color: colors.brown, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  metricValue: { color: colors.ink, fontSize: 23, fontWeight: '900', marginTop: 10 },
  metricLabel: { color: colors.muted, fontSize: 11, marginTop: 2 },
  list: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 25, padding: 18, gap: 6 },
  listTitle: { fontSize: 21, fontWeight: '900', color: colors.ink, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee4d5' },
  rowName: { fontWeight: '800', color: colors.ink },
  rowSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  empty: { color: colors.muted, paddingVertical: 14 },
  sync: { textAlign: 'center', color: colors.muted, fontSize: 11 },
});
