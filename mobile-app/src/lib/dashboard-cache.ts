import * as SecureStore from 'expo-secure-store';

import type { PlatformStats, School, Student } from '@/lib/api';

const STATS_KEY = 'connect-your-school-stats-v1';
const dashboardKey = (role: string, schoolCode: string) => `cys-dashboard-${role}-${schoolCode}`;

export type AdminDashboardSnapshot = {
  school: School;
  students: Student[];
  studentCount: number;
  activeSections: number;
};

export async function loadStatsSnapshot() {
  try {
    const raw = await SecureStore.getItemAsync(STATS_KEY);
    return raw ? JSON.parse(raw) as PlatformStats : null;
  } catch { return null; }
}

export async function saveStatsSnapshot(value: PlatformStats) {
  try { await SecureStore.setItemAsync(STATS_KEY, JSON.stringify(value)); } catch { /* network data remains authoritative */ }
}

export async function loadAdminDashboardSnapshot(schoolCode: string) {
  try {
    const raw = await SecureStore.getItemAsync(dashboardKey('admin', schoolCode));
    return raw ? JSON.parse(raw) as AdminDashboardSnapshot : null;
  } catch { return null; }
}

export async function saveAdminDashboardSnapshot(schoolCode: string, value: Omit<AdminDashboardSnapshot, 'studentCount' | 'activeSections'>) {
  // Only the fields needed to paint the dashboard are persisted, keeping SecureStore small.
  const snapshot: AdminDashboardSnapshot = {
    school: value.school,
    students: value.students.slice(0, 8),
    studentCount: value.students.length,
    activeSections: new Set(value.students.map(student => `${student.class}-${student.section}`)).size,
  };
  try { await SecureStore.setItemAsync(dashboardKey('admin', schoolCode), JSON.stringify(snapshot)); } catch { /* optional cache */ }
}
