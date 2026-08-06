import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/auth-context';
import { Brand, Page } from '@/components/ui';
import { colors } from '@/constants/colors';

export default function WelcomeScreen() {
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading && session) {
      router.replace(session.role === 'admin' ? '/admin-dashboard' : '/student-dashboard');
    }
  }, [loading, session]);

  if (loading || session) {
    return <Page><ActivityIndicator size="large" color={colors.gold} /></Page>;
  }

  return (
    <Page>
      <View style={styles.shell}>
        <Brand large />
        <View style={styles.hero}>
          <Text style={styles.kicker}>ONE CONNECTED CAMPUS</Text>
          <Text style={styles.title}>Your school, always with you.</Text>
          <Text style={styles.copy}>
            Open fees, results, notices and school records from one mobile workspace.
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Choose your access</Text>
          <Text style={styles.cardCopy}>Use the same school code and PIN as the website.</Text>
          <Pressable style={styles.primary} onPress={() => router.push('/student-login')}>
            <Text style={styles.primaryText}>Student login  →</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={() => router.push('/admin-login')}>
            <Text style={styles.secondaryText}>School administrator</Text>
          </Pressable>
        </View>
        <Text style={styles.footer}>Powered by BeyondNull · Synced with Connect Your School</Text>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  shell: { width: '100%', maxWidth: 520, padding: 24, gap: 30 },
  hero: { gap: 12, marginTop: 10 },
  kicker: { color: colors.brown, fontWeight: '800', letterSpacing: 2, fontSize: 12 },
  title: { color: colors.ink, fontWeight: '900', fontSize: 45, lineHeight: 49 },
  copy: { color: colors.muted, fontSize: 17, lineHeight: 26 },
  card: { backgroundColor: colors.paper, borderColor: colors.line, borderWidth: 1, borderRadius: 28, padding: 22, gap: 14, shadowColor: '#372F24', shadowOpacity: 0.12, shadowRadius: 24, elevation: 5 },
  cardTitle: { color: colors.ink, fontSize: 24, fontWeight: '900' },
  cardCopy: { color: colors.muted, lineHeight: 21, marginBottom: 4 },
  primary: { backgroundColor: colors.ink, padding: 18, borderRadius: 16, borderBottomColor: colors.gold, borderBottomWidth: 5 },
  primaryText: { color: '#fff', textAlign: 'center', fontWeight: '800', fontSize: 17 },
  secondary: { borderColor: colors.line, borderWidth: 1, padding: 17, borderRadius: 16 },
  secondaryText: { textAlign: 'center', color: colors.ink, fontWeight: '800', fontSize: 16 },
  footer: { color: colors.muted, textAlign: 'center', fontSize: 12 },
});
