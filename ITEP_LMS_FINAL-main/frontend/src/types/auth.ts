export interface EnrolledSubject {
  id?: string;
  code: string;
  title: string;
  instructor: string;
  schedule: string;
  publishedTopicsCount?: number;
  totalModulesCount?: number;
  semester?: string;
  academicYear?: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar: string;
  role?: 'student' | 'faculty' | 'program chair' | 'program_chair' | 'admin';
  yearLevel?: string;
  activeSemester?: string;
  schoolYear?: string;
  section?: string;
  tuptId?: string;
  isVerified: boolean;
  enrolledSubjects: EnrolledSubject[];
}

export interface ProfileUpdatePayload {
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  yearLevel?: string;
  activeSemester?: string;
  section?: string;
  tuptId?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  section?: string;
  tuptId?: string;
  password: string;
  confirmPassword: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  token?: string;
  user?: User;
  data?: T;
  code?: string;
}

export interface DashboardProfile {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  username: string;
  avatar: string;
  studentId: string;
  memberSince: string;
}

export interface DashboardAcademics {
  enrolledSubjects: EnrolledSubject[];
  totalSubjects: number;
  gpa: number | null;
  totalCredits?: number;
  completedCredits?: number;
  completedSubjects: number;
  academicYear: string | null;
  semester: string | null;
  standing: string | null;
}

export interface DashboardData {
  profile: DashboardProfile;
  academics: DashboardAcademics;
}
