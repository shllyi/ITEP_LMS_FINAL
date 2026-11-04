import { API_BASE, getHeaders } from './api';

export interface ChairAccount {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  role: 'student' | 'faculty' | 'program chair' | 'program_chair' | 'admin';
  yearLevel?: string;
  activeSemester?: string;
  schoolYear?: string;
  section?: string;
  tuptId?: string;
  isVerified?: boolean;
  enrolledSubjects?: { id?: string; code: string; title: string; instructor?: string; schedule?: string }[];
  createdAt: string;
}

export interface ChairSubject {
  id: string;
  _id: string;
  code: string;
  name: string;
  academicYear: string;
  semester: string;
  yearLevel: string;
  facultyName: string;
  enrolledCount: number;
  modulesCount: number;
}

export interface ChairStats {
  totalUsers: number;
  studentCount: number;
  facultyCount: number;
  chairCount: number;
}

export interface GetAccountsResponse {
  success: boolean;
  data?: {
    accounts: ChairAccount[];
    totalCount: number;
    page: number;
    totalPages: number;
    stats: ChairStats;
  };
  message?: string;
}

export interface CreateAccountPayload {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  role: 'student' | 'faculty' | 'program_chair';
  yearLevel?: string;
  activeSemester?: string;
  schoolYear?: string;
}

export interface BatchUpdateStatusPayload {
  studentIds: string[];
  yearLevel?: string;
  activeSemester?: string;
  schoolYear?: string;
}

export interface SmartEnrollmentPreview {
  criteria: {
    yearLevel: string;
    activeSemester: string;
    schoolYear: string;
  };
  matchedStudentsCount: number;
  matchedSubjectsCount: number;
  potentialEnrollmentCount: number;
  matchingSubjects: {
    id: string;
    code: string;
    name: string;
    instructor: string;
    enrolledCount: number;
  }[];
  studentBreakdown: {
    id: string;
    name: string;
    email: string;
    alreadyEnrolledCount: number;
    newSubjectsCount: number;
    subjectsToAdd: { code: string; name: string }[];
  }[];
}

export interface ChairReportsData {
  summary: {
    totalStudents: number;
    totalFaculty: number;
    totalSubjects: number;
    overallAverageCompletion: number;
  };
  yearLevelDistribution: {
    firstYear: number;
    secondYear: number;
    thirdYear: number;
    fourthYear: number;
  };
  subjectReports: {
    subjectId: string;
    code: string;
    name: string;
    faculty: string;
    yearLevel: string;
    semester: string;
    academicYear: string;
    enrolledCount: number;
    publishedTopicsCount: number;
    averageProgressPercent: number;
    completedStudentsCount: number;
  }[];
}

export const chairApi = {
  getAccounts: async (
    token: string | null,
    params: {
      search?: string;
      role?: string;
      yearLevel?: string;
      semester?: string;
      schoolYear?: string;
      subjectId?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<GetAccountsResponse> => {
    try {
      const q = new URLSearchParams();
      if (params.search) q.append('search', params.search);
      if (params.role) q.append('role', params.role);
      if (params.yearLevel) q.append('yearLevel', params.yearLevel);
      if (params.semester) q.append('semester', params.semester);
      if (params.schoolYear) q.append('schoolYear', params.schoolYear);
      if (params.subjectId) q.append('subjectId', params.subjectId);
      if (params.page) q.append('page', String(params.page));
      if (params.limit) q.append('limit', String(params.limit));

      const res = await fetch(`${API_BASE}/chair/accounts?${q.toString()}`, {
        headers: getHeaders(token),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Network error fetching accounts' };
    }
  },

  getAllSubjects: async (
    token: string | null,
    params: { yearLevel?: string; semester?: string; schoolYear?: string } = {}
  ): Promise<{ success: boolean; data?: ChairSubject[]; message?: string }> => {
    try {
      const q = new URLSearchParams();
      if (params.yearLevel) q.append('yearLevel', params.yearLevel);
      if (params.semester) q.append('semester', params.semester);
      if (params.schoolYear) q.append('schoolYear', params.schoolYear);

      const res = await fetch(`${API_BASE}/chair/subjects?${q.toString()}`, {
        headers: getHeaders(token),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Network error fetching subjects' };
    }
  },

  createAccount: async (token: string | null, payload: CreateAccountPayload) => {
    try {
      const res = await fetch(`${API_BASE}/chair/accounts`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Network error creating account' };
    }
  },

  updateAccount: async (token: string | null, id: string, payload: Partial<ChairAccount>) => {
    try {
      const res = await fetch(`${API_BASE}/chair/accounts/${id}`, {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Network error updating account' };
    }
  },

  changeRole: async (token: string | null, id: string, role: string) => {
    try {
      const res = await fetch(`${API_BASE}/chair/accounts/${id}/role`, {
        method: 'PATCH',
        headers: getHeaders(token),
        body: JSON.stringify({ role }),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Network error updating user role' };
    }
  },

  deleteAccount: async (token: string | null, id: string) => {
    try {
      const res = await fetch(`${API_BASE}/chair/accounts/${id}`, {
        method: 'DELETE',
        headers: getHeaders(token),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Network error deleting account' };
    }
  },

  enrollStudentDirect: async (
    token: string | null,
    studentId: string,
    subjectId: string
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/chair/enrollment/direct`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ studentId, subjectId }),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Network error enrolling student' };
    }
  },

  unenrollStudentDirect: async (
    token: string | null,
    studentId: string,
    subjectId: string
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/chair/enrollment/unenroll`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ studentId, subjectId }),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Network error unenrolling student' };
    }
  },

  batchUpdateStudentStatus: async (token: string | null, payload: BatchUpdateStatusPayload) => {
    try {
      const res = await fetch(`${API_BASE}/chair/students/batch-status`, {
        method: 'PATCH',
        headers: getHeaders(token),
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Network error updating student cohorts' };
    }
  },

  previewEnrollmentRules: async (
    token: string | null,
    criteria: { yearLevel: string; activeSemester: string; schoolYear: string }
  ): Promise<{ success: boolean; data?: SmartEnrollmentPreview; message?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/chair/enrollment/preview`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(criteria),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Network error previewing smart enrollment' };
    }
  },

  executeEnrollmentRules: async (
    token: string | null,
    payload: {
      yearLevel: string;
      activeSemester: string;
      schoolYear: string;
      selectedStudentIds?: string[];
      selectedSubjectIds?: string[];
    }
  ): Promise<{ success: boolean; data?: any; message?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/chair/enrollment/execute`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Network error executing smart enrollment' };
    }
  },

  getChairReports: async (
    token: string | null,
    params: { subjectId?: string; yearLevel?: string; semester?: string; schoolYear?: string } = {}
  ): Promise<{ success: boolean; data?: ChairReportsData; message?: string }> => {
    try {
      const q = new URLSearchParams();
      if (params.subjectId) q.append('subjectId', params.subjectId);
      if (params.yearLevel) q.append('yearLevel', params.yearLevel);
      if (params.semester) q.append('semester', params.semester);
      if (params.schoolYear) q.append('schoolYear', params.schoolYear);

      const res = await fetch(`${API_BASE}/chair/reports?${q.toString()}`, {
        headers: getHeaders(token),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Network error generating reports' };
    }
  },
};
