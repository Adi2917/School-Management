const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://connectyourschool.in/api').replace(/\/$/, '');

export type UserRole = 'admin' | 'student';
export type School = { id?: string; school_code: string; school_name: string; admin_name?: string; admin_email?: string; email?: string; phone?: string; location?: string; school_logo?: string };
export type Student = { id: string; school_code: string; name: string; father_name?: string; number?: string; class?: string; section?: string; roll?: string; address?: string; photo_url?: string; school_name?: string; school_logo?: string };
export type Fee = { id?: string; student_id: string; school_code?: string; month: string; status: string; amount?: string; paid_at?: string };
export type Notice = { id?: string; school_code: string; title?: string; message?: string; file_url?: string; file_type?: string; created_at?: string; updated_at?: string };
export type Result = { id?: string; student_id: string; school_code?: string; exam_type_id?: string; exam_name?: string; subject: string; marks?: string | number; obtained_marks?: string | number; full_marks?: string | number };
export type ExamType = { id?: string; school_code: string; name: string };
export type Session =
  | { role: 'admin'; user: School; token: string }
  | { role: 'student'; user: Student; token: string };
export type PlatformStats = { schools: number; students: number };

let accessToken = '';
export const setAccessToken = (token?: string) => { accessToken = token || ''; };

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(API_URL + path, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    const message = typeof payload === 'object' && payload
      ? String((payload as { message?: unknown; error?: unknown }).message || (payload as { error?: unknown }).error || 'Request failed')
      : String(payload || `Request failed (${response.status})`);
    throw new Error(message);
  }
  if (typeof payload === 'string') throw new Error('Server returned an invalid response.');
  const value = (payload && typeof payload === 'object' && 'data' in payload) ? payload.data : payload;
  return normalizeUrls(value) as T;
}

function normalizeUrls(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeUrls);
  if (!value || typeof value !== 'object') return value;
  const origin = API_URL.replace(/\/api$/, '');
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => {
    if (['school_logo', 'photo_url', 'file_url'].includes(key) && typeof item === 'string' && item.startsWith('/')) return [key, origin + item];
    return [key, normalizeUrls(item)];
  }));
}

function query(values: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => value !== undefined && params.set(key, value));
  return `?${params.toString()}`;
}
function first<T>(value: T | T[] | null | undefined): T | null { return Array.isArray(value) ? value[0] ?? null : value ?? null; }

type LoginPayload = Omit<Session, 'role'> & { role?: UserRole };
function normalizeSession(role: 'admin', value: LoginPayload): Extract<Session, { role: 'admin' }>;
function normalizeSession(role: 'student', value: LoginPayload): Extract<Session, { role: 'student' }>;
function normalizeSession(role: UserRole, value: LoginPayload): Session {
  if (!value?.token || !value?.user) throw new Error('The server returned an incomplete login response.');
  return { role, token: value.token, user: value.user } as Session;
}
export const loginAdmin = async (schoolCode: string, pin: string) => normalizeSession('admin', await request<LoginPayload>('/auth/admin/login', { method: 'POST', body: JSON.stringify({ school_code: schoolCode.trim(), pin: pin.trim() }) }));
export const loginStudent = async (schoolCode: string, phone: string, pin: string) => normalizeSession('student', await request<LoginPayload>('/auth/student/login', { method: 'POST', body: JSON.stringify({ school_code: schoolCode.trim(), number: phone.trim(), pin: pin.trim() }) }));
export const getStats = () => request<PlatformStats>('/stats');
export async function getSchool(schoolCode: string) { return first(await request<School[]>('/schools' + query({ school_code: schoolCode }))); }
export async function getStudent(id: string) { return first(await request<Student[]>('/students' + query({ id }))); }
export const getStudents = (schoolCode: string) => request<Student[]>('/students' + query({ school_code: schoolCode, sort: 'class:asc' }));
export const getNotifications = (schoolCode: string) => request<Notice[]>('/notifications' + query({ school_code: schoolCode, sort: 'createdAt:desc' }));
export const getFees = (studentId: string) => request<Fee[]>('/fees' + query({ student_id: studentId }));
export const getResults = (studentId: string) => request<Result[]>('/results' + query({ student_id: studentId, sort: 'updatedAt:desc' }));
export const getExamTypes = (schoolCode: string) => request<ExamType[]>('/exam_types' + query({ school_code: schoolCode }));
export const createRecord = <T>(collection: string, value: unknown) => request<T[]>(`/${collection}`, { method: 'POST', body: JSON.stringify(value) });
export const updateRecord = <T>(collection: string, id: string, value: unknown) => request<T[]>(`/${collection}${query({ id })}`, { method: 'PATCH', body: JSON.stringify(value) });
export const deleteRecord = (collection: string, id: string) => request(`/${collection}${query({ id })}`, { method: 'DELETE' });
export async function uploadFile(uri: string, name = 'upload.jpg', type = 'image/jpeg') {
  const data = new FormData();
  data.append('file', { uri, name, type } as unknown as Blob);
  return request<{ url: string }>('/uploads', { method: 'POST', body: data });
}
export function imageUrl(record: School | Student) {
  const raw = (record as Student).photo_url || (record as School).school_logo;
  if (!raw) return undefined;
  if (/^https?:\/\//i.test(raw)) return raw;
  const origin = API_URL.replace(/\/api$/, '');
  return raw.startsWith('/') ? origin + raw : `${origin}/${raw}`;
}
export const api = { adminLogin: loginAdmin, studentLogin: loginStudent, getStats, getSchool, getStudent, getStudents, getNotices: getNotifications, getFees, getResults, getExamTypes, createRecord, updateRecord, deleteRecord, uploadFile };
export { API_URL };
