import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand, Page } from '@/components/ui';
import { colors } from '@/constants/colors';
import { useAuth } from '@/context/auth-context';
import { api, PlatformStats } from '@/lib/api';

export default function WelcomeScreen() {
  const { session, loading } = useAuth();
  const [stats, setStats] = useState<PlatformStats>();

  useEffect(() => { api.getStats().then(setStats).catch(() => undefined); }, []);
  useEffect(() => {
    if (!loading && session) router.replace(session.role === 'admin' ? '/admin-dashboard' : '/student-dashboard');
  }, [loading, session]);

  if (loading || session) return <Page><ActivityIndicator size="large" color={colors.gold} /></Page>;

  return (
    <Page scroll>
      <View style={styles.shell}>
        <View style={styles.nav}><Brand large /><View style={styles.liveDot} /></View>
        <View style={styles.badge}><Text style={styles.badgeText}>✦ BUILT FOR MODERN SCHOOLS</Text></View>
        <View style={styles.hero}>
          <Text style={styles.title}>School management, <Text style={styles.accent}>beautifully connected.</Text></Text>
          <Text style={styles.copy}>Bring students, administrators, fees, results and school updates together in one secure mobile workspace.</Text>
        </View>
        <View style={styles.actions}>
          <Pressable style={styles.primary} onPress={() => router.push('/school-register' as never)}><Text style={styles.primaryText}>Register your school  →</Text></Pressable>
          <Pressable style={styles.secondary} onPress={() => router.push('/join-school' as never)}><Text style={styles.secondaryText}>Join your school</Text></Pressable>
        </View>
        <View style={styles.stats}>
          <View style={styles.stat}><Text style={styles.statNumber}>{stats?.schools ?? '—'}</Text><Text style={styles.statLabel}>Trusted schools</Text></View>
          <View style={styles.divider} />
          <View style={styles.stat}><Text style={styles.statNumber}>{stats?.students?.toLocaleString('en-IN') ?? '—'}</Text><Text style={styles.statLabel}>Connected students</Text></View>
        </View>
        <View style={styles.featureGrid}>
          <View style={styles.feature}><Text style={styles.featureIcon}>₹</Text><Text style={styles.featureTitle}>Fees</Text><Text style={styles.featureCopy}>Live payment records</Text></View>
          <View style={styles.feature}><Text style={styles.featureIcon}>✓</Text><Text style={styles.featureTitle}>Results</Text><Text style={styles.featureCopy}>Academic progress</Text></View>
          <View style={styles.feature}><Text style={styles.featureIcon}>◉</Text><Text style={styles.featureTitle}>Notices</Text><Text style={styles.featureCopy}>School-only updates</Text></View>
        </View>
        <Text style={styles.footer}>A BeyondNull product · connectyourschool.in</Text>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  shell: { width: '100%', maxWidth: 720, paddingHorizontal: 22, paddingTop: 14, paddingBottom: 18, gap: 22 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4d9d65', borderWidth: 2, borderColor: '#d8eadc' },
  badge: { alignSelf: 'flex-start', backgroundColor: colors.goldSoft, borderWidth: 1, borderColor: '#e8ca83', borderRadius: 30, paddingHorizontal: 14, paddingVertical: 9 },
  badgeText: { color: colors.brown, fontWeight: '900', letterSpacing: 1.2, fontSize: 10 },
  hero: { gap: 14 },
  title: { color: colors.ink, fontWeight: '900', fontSize: 43, lineHeight: 46, letterSpacing: -1.4 },
  accent: { color: '#bd780c' },
  copy: { color: colors.muted, fontSize: 17, lineHeight: 25 },
  actions: { gap: 11 },
  primary: { backgroundColor: colors.gold, padding: 18, borderRadius: 16, borderBottomWidth: 6, borderBottomColor: colors.ink },
  primaryText: { color: colors.ink, textAlign: 'center', fontWeight: '900', fontSize: 17 },
  secondary: { backgroundColor: colors.paper, borderColor: colors.line, borderWidth: 1, padding: 17, borderRadius: 16 },
  secondaryText: { textAlign: 'center', color: colors.ink, fontWeight: '900', fontSize: 16 },
  stats: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.ink, borderRadius: 22, paddingVertical: 18, paddingHorizontal: 12 },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statNumber: { color: colors.gold, fontSize: 24, fontWeight: '900' },
  statLabel: { color: '#eee6da', fontSize: 11, fontWeight: '700' },
  divider: { width: 1, height: 38, backgroundColor: '#5c554b' },
  featureGrid: { flexDirection: 'row', gap: 8 },
  feature: { flex: 1, minHeight: 112, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 12, gap: 3 },
  featureIcon: { color: colors.brown, fontWeight: '900', fontSize: 21 },
  featureTitle: { color: colors.ink, fontWeight: '900', fontSize: 14 },
  featureCopy: { color: colors.muted, fontSize: 10, lineHeight: 14 },
  footer: { color: colors.muted, textAlign: 'center', fontSize: 11 },
});
