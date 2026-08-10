import { router } from 'expo-router';
import { ReactNode, useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import { mediaUrl } from '@/lib/api';

export function Page({ children, scroll = false }: { children: ReactNode; scroll?: boolean }) {
  const content = scroll ? (
    <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.scroll}>
      {children}
    </ScrollView>
  ) : <View style={styles.page}>{children}</View>;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom', 'left']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Avatar({ name, uri, size = 72 }: { name: string; uri?: string; size?: number }) {
  const source = mediaUrl(uri);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [source]);

  if (source && !failed) {
    return (
      <Image
        source={{ uri: source }}
        onError={() => setFailed(true)}
        resizeMode="cover"
        style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: colors.gold, backgroundColor: colors.goldSoft }}
      />
    );
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.gold, borderWidth: 2, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '900', fontSize: size * 0.31 }}>{initials(name)}</Text>
    </View>
  );
}

export function Brand({ large = false, school }: { large?: boolean; school?: { school_name?: string; school_logo?: string } }) {
  const name = school?.school_name || 'Connect Your School';
  return (
    <View style={styles.brand}>
      {school ? <Avatar name={name} uri={school.school_logo} size={large ? 58 : 46} /> : (
        <Image source={require('../../assets/images/connect-your-school-icon.png')} style={[styles.mark, large && styles.largeMark]} />
      )}
      <View style={styles.brandCopy}>
        <Text style={styles.brandOverline}>{school ? 'CONNECTED SCHOOL' : 'BEYONDNULL PRESENTS'}</Text>
        <Text numberOfLines={2} style={[styles.brandName, large && styles.largeName]}>{name}</Text>
      </View>
    </View>
  );
}

export function Back() {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.back}>
      <Text style={styles.backText}>{'\u2039'}</Text>
    </Pressable>
  );
}

export function AppHeader({ school, back = true, onLogout }: { school?: { school_name?: string; school_logo?: string }; back?: boolean; onLogout?: () => void }) {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.headerSafe}>
      <View style={styles.header}>
        <View style={styles.headerSide}>{back ? <Back /> : null}</View>
        <View style={styles.headerBrand}><Brand school={school} /></View>
        <View style={[styles.headerSide, styles.headerRight]}>
          {onLogout ? <Pressable onPress={onLogout} hitSlop={8} style={styles.logoutButton}><Text style={styles.logoutText}>Logout</Text></Pressable> : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

export function Field(props: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput placeholderTextColor="#9b9288" autoCapitalize="none" {...props} style={[styles.input, props.multiline && styles.multiline, props.style]} />
    </View>
  );
}

export function Skeleton({ width = '100%', height = 18, radius = 10 }: { width?: number | `${number}%`; height?: number; radius?: number }) {
  return <View style={{ width, height, borderRadius: radius, backgroundColor: '#eee5d7' }} />;
}

export const initials = (name = '') => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'CYS';

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.cream },
  page: { flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%' },
  scroll: { flexGrow: 1, alignItems: 'center', paddingBottom: 42, width: '100%' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9, flexShrink: 1, minWidth: 0 },
  brandCopy: { flexShrink: 1, minWidth: 0 },
  mark: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.ink, borderWidth: 2, borderColor: colors.gold },
  largeMark: { width: 58, height: 58, borderRadius: 29 },
  brandOverline: { color: colors.brown, letterSpacing: 1.1, fontSize: 8, fontWeight: '900' },
  brandName: { color: colors.ink, fontWeight: '900', fontSize: 15, maxWidth: 235, lineHeight: 18 },
  largeName: { fontSize: 20, lineHeight: 23 },
  back: { width: 44, height: 44, borderRadius: 15, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper },
  backText: { fontSize: 35, lineHeight: 37, color: colors.ink, marginTop: -4 },
  headerSafe: { backgroundColor: colors.paper, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  header: { minHeight: 66, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8 },
  headerSide: { width: 64, alignItems: 'flex-start', justifyContent: 'center' },
  headerRight: { alignItems: 'flex-end' },
  headerBrand: { flex: 1, minWidth: 0, alignItems: 'center' },
  logoutButton: { paddingVertical: 10, paddingHorizontal: 2 },
  logoutText: { color: colors.danger, fontWeight: '900', fontSize: 12 },
  field: { gap: 7 },
  label: { color: colors.ink, fontWeight: '800', fontSize: 13 },
  input: { minHeight: 52, backgroundColor: '#fbf7ef', borderWidth: 1, borderColor: colors.line, borderRadius: 15, paddingHorizontal: 16, paddingVertical: 13, color: colors.ink, fontSize: 16 },
  multiline: { minHeight: 92, textAlignVertical: 'top' },
});
