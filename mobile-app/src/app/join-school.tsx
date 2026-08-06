import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Back, Brand, Page } from '@/components/ui';
import { colors } from '@/constants/colors';

export default function JoinSchoolScreen() {
  return (
    <Page scroll>
      <View style={styles.top}><Back /><Brand /></View>
      <View style={styles.shell}>
        <Text style={styles.kicker}>CONNECT TO YOUR CAMPUS</Text>
        <Text style={styles.title}>Choose your access</Text>
        <Text style={styles.copy}>Register once or sign in with your existing school credentials.</Text>
        <Pressable style={styles.primary} onPress={() => router.push('/student-register' as never)}><Text style={styles.primaryText}>Register as student  →</Text></Pressable>
        <Pressable style={styles.option} onPress={() => router.push('/student-login')}><Text style={styles.optionTitle}>Student login</Text><Text style={styles.optionCopy}>Phone number and 4-digit PIN</Text></Pressable>
        <Pressable style={styles.option} onPress={() => router.push('/admin-login')}><Text style={styles.optionTitle}>School administrator</Text><Text style={styles.optionCopy}>School code and 6-digit PIN</Text></Pressable>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  top: { width: '100%', maxWidth: 760, paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 14 },
  shell: { width: '90%', maxWidth: 520, marginTop: 20, padding: 24, borderRadius: 28, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, gap: 15, elevation: 4 },
  kicker: { color: colors.brown, fontWeight: '900', letterSpacing: 1.7, fontSize: 10 },
  title: { color: colors.ink, fontSize: 36, lineHeight: 41, fontWeight: '900' },
  copy: { color: colors.muted, fontSize: 16, lineHeight: 23, marginBottom: 5 },
  primary: { backgroundColor: colors.ink, padding: 18, borderRadius: 16, borderBottomWidth: 5, borderBottomColor: colors.gold },
  primaryText: { color: '#fff', textAlign: 'center', fontWeight: '900', fontSize: 16 },
  option: { borderWidth: 1, borderColor: colors.line, borderRadius: 17, padding: 17, gap: 3 },
  optionTitle: { color: colors.ink, fontSize: 17, fontWeight: '900' },
  optionCopy: { color: colors.muted, fontSize: 12 },
});
