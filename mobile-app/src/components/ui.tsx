import { ReactNode } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/colors';

export function Page({ children, scroll = false }: { children: ReactNode; scroll?: boolean }) {
  const content = scroll
    ? <ScrollView contentContainerStyle={styles.scroll}>{children}</ScrollView>
    : <View style={styles.page}>{children}</View>;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Brand({
  large = false,
  school,
}: {
  large?: boolean;
  school?: { school_name?: string; school_logo?: string };
}) {
  const name = school?.school_name || 'Connect Your School';
  return (
    <View style={styles.brand}>
      {school?.school_logo ? (
        <Image source={{ uri: school.school_logo }} style={[styles.mark, large && styles.largeMark]} />
      ) : (
        <View style={[styles.mark, large && styles.largeMark]}>
          <Text style={styles.markText}>{school ? initials(name) : 'CY'}</Text>
        </View>
      )}
      <View>
        <Text style={styles.brandOverline}>{school ? 'CONNECTED SCHOOL' : 'BEYONDNULL PRESENTS'}</Text>
        <Text style={[styles.brandName, large && styles.largeName]}>{name}</Text>
      </View>
    </View>
  );
}

export function Back() {
  return (
    <Pressable onPress={() => router.back()} style={styles.back}>
      <Text style={styles.backText}>‹</Text>
    </Pressable>
  );
}

export function Field(props: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput placeholderTextColor="#9b9288" {...props} style={[styles.input, props.style]} />
    </View>
  );
}

export function Avatar({ name, uri, size = 72 }: { name: string; uri?: string; size?: number }) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        resizeMode="cover"
        style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 3, borderColor: colors.gold }}
      />
    );
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.34 }}>{initials(name)}</Text>
    </View>
  );
}

export const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'CY';

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.cream },
  page: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flexGrow: 1, alignItems: 'center', paddingBottom: 42 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  mark: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.ink, borderWidth: 3, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  largeMark: { width: 58, height: 58, borderRadius: 29 },
  markText: { color: colors.gold, fontWeight: '900', fontSize: 17 },
  brandOverline: { color: colors.brown, letterSpacing: 1.3, fontSize: 9, fontWeight: '800' },
  brandName: { color: colors.ink, fontWeight: '900', fontSize: 17, maxWidth: 260 },
  largeName: { fontSize: 21 },
  back: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper },
  backText: { fontSize: 38, lineHeight: 39, color: colors.ink },
  field: { gap: 7 },
  label: { color: colors.ink, fontWeight: '800', fontSize: 13 },
  input: { backgroundColor: '#fbf7ef', borderWidth: 1, borderColor: colors.line, borderRadius: 15, paddingHorizontal: 16, paddingVertical: 15, color: colors.ink, fontSize: 16 },
});
