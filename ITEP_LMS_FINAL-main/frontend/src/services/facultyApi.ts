import {
  Subject,
  CreateSubjectPayload,
  UpdateSubjectPayload,
  TopicContent,
  WaygroundQuiz,
  EnrolledStudent,
} from '@/types/faculty';

export interface SubjectProgressReport {
  subject: { id: string; name: string; code: string; academicYear?: string; semester?: string; yearLevel?: string; professorName?: string; professorEmail?: string };
  generatedAt: string;
  topics: Array<{ topicId: string; topicTitle: string; moduleId: string; moduleTitle: string; passingScorePercent: number }>;
  modules: Array<{ moduleId: string; moduleTitle: string; topicCount: number; studentCount: number; averageScorePercent: number }>;
  students: Array<{
    studentId: string;
    studentNumber: string;
    firstName: string;
    lastName: string;
    email: string;
    attemptsTotal: number;
    passedTopics: number;
    totalTopics: number;
    overallScorePercent: number;
    passedAll: boolean;
    topicScores: Array<{
      topicId: string;
      topicTitle: string;
      moduleTitle: string;
      attempts: Array<{ attempt: number; scorePercent: number; correctCount: number; totalQuestions: number; passed: boolean; submittedAt?: string }>;
      attemptsCount: number;
      bestScorePercent: number;
      lastScorePercent: number;
      passed: boolean;
    }>;
  }>;
}

const API_BASE = `${process.env.EXPO_PUBLIC_API_URL}/api`;

const getHeaders = (token?: string | null) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

export const facultyApi = {
  getSubjectProgressReport: async (token: string | null, subjectId: string): Promise<{ success: boolean; data?: SubjectProgressReport; message?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/faculty/subjects/${subjectId}/progress-report`, {
        headers: getHeaders(token),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Network error loading progress report' };
    }
  },
  getSubjectStudents: async (token: string | null, subjectId: string): Promise<{ success: boolean; data?: EnrolledStudent[]; message?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/faculty/subjects/${subjectId}/students`, {
        headers: getHeaders(token),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.message || `Unable to load students (${res.status}).` };
      }
      return {
        success: Boolean(data.success),
        data: Array.isArray(data.data) ? data.data : undefined,
        message: data.message,
      };
    } catch {
      return { success: false, message: 'Network error loading students' };
    }
  },
  generateTopicSummary: async (token: string | null, richText: string, presentationText: string): Promise<{ success: boolean; data?: { summary: string }; message?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/faculty/topics/generate-summary`, {
        method: 'POST', headers: getHeaders(token), body: JSON.stringify({ richText, presentationText }),
      });
      if (res.status === 204) return { success: false, message: 'AI summary is not configured' };
      return await res.json();
    } catch (err) { return { success: false, message: 'Network error generating summary' }; }
  },
  // ─── SUBJECTS CRUD ──────────────────────────────────────────
  getFacultySubjects: async (token: string | null): Promise<{ success: boolean; data?: Subject[]; message?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/faculty/subjects`, {
        method: 'GET',
        headers: getHeaders(token),
      });
      const data = await res.json();
      if (!res.ok) {
        const roleHint = data.authenticatedRole ? ` Authenticated role: ${data.authenticatedRole}.` : '';
        return { success: false, message: `${data.message || `Unable to load subjects (${res.status}).`}${roleHint}` };
      }
      return {
        success: Boolean(data.success),
        data: Array.isArray(data.data) ? data.data : undefined,
        message: data.message,
      };
    } catch (err) {
      return { success: false, message: 'Network error fetching subjects' };
    }
  },

  getSubjectById: async (token: string | null, subjectId: string): Promise<{ success: boolean; data?: Subject; message?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/faculty/subjects/${subjectId}`, {
        method: 'GET',
        headers: getHeaders(token),
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: 'Network error fetching subject details' };
    }
  },

  createSubject: async (token: string | null, payload: CreateSubjectPayload): Promise<{ success: boolean; data?: Subject; message?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/faculty/subjects`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.message || `Unable to create subject (${res.status}).` };
      }
      return {
        success: Boolean(data.success),
        data: data.data,
        message: data.message,
      };
    } catch (err) {
      return { success: false, message: 'Network error creating subject' };
    }
  },

  updateSubject: async (token: string | null, subjectId: string, payload: UpdateSubjectPayload): Promise<{ success: boolean; data?: Subject; message?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/faculty/subjects/${subjectId}`, {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: 'Network error updating subject' };
    }
  },

  deleteSubject: async (token: string | null, subjectId: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/faculty/subjects/${subjectId}`, {
        method: 'DELETE',
        headers: getHeaders(token),
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: 'Network error deleting subject' };
    }
  },

  // ─── MODULES CRUD ───────────────────────────────────────────
  addModule: async (token: string | null, subjectId: string, title?: string): Promise<{ success: boolean; data?: Subject; message?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/faculty/subjects/${subjectId}/modules`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ title }),
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: 'Network error adding module' };
    }
  },

  updateModule: async (token: string | null, subjectId: string, moduleId: string, title: string): Promise<{ success: boolean; data?: Subject; message?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/faculty/subjects/${subjectId}/modules/${moduleId}`, {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify({ title }),
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: 'Network error updating module' };
    }
  },

  deleteModule: async (token: string | null, subjectId: string, moduleId: string): Promise<{ success: boolean; data?: Subject; message?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/faculty/subjects/${subjectId}/modules/${moduleId}`, {
        method: 'DELETE',
        headers: getHeaders(token),
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: 'Network error deleting module' };
    }
  },

  // ─── TOPICS CRUD ────────────────────────────────────────────
  addTopic: async (token: string | null, subjectId: string, moduleId: string, title?: string): Promise<{ success: boolean; data?: Subject; message?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/faculty/subjects/${subjectId}/modules/${moduleId}/topics`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ title }),
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: 'Network error adding topic' };
    }
  },

  updateTopic: async (
    token: string | null,
    subjectId: string,
    topicId: string,
    payload: { title?: string; status?: 'draft' | 'published'; content?: TopicContent }
  ): Promise<{ success: boolean; data?: Subject; message?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/faculty/subjects/${subjectId}/topics/${topicId}`, {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: 'Network error updating topic' };
    }
  },

  deleteTopic: async (token: string | null, subjectId: string, moduleId: string, topicId: string): Promise<{ success: boolean; data?: Subject; message?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/faculty/subjects/${subjectId}/modules/${moduleId}/topics/${topicId}`, {
        method: 'DELETE',
        headers: getHeaders(token),
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: 'Network error deleting topic' };
    }
  },

  // ─── WAYGROUND QUIZ ─────────────────────────────────────────
  saveTopicQuiz: async (
    token: string | null,
    subjectId: string,
    topicId: string,
    quiz: WaygroundQuiz
  ): Promise<{ success: boolean; data?: Subject; message?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/faculty/subjects/${subjectId}/topics/${topicId}/quiz`, {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify({ quiz }),
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: 'Network error saving quiz' };
    }
  },

  // ─── S3 PRE-SIGNED UPLOAD SIGNATURE ─────────────────────────
  getS3UploadUrl: async (
    token: string | null,
    topicId: string,
    fileName: string,
    mimeType?: string
  ): Promise<{ success: boolean; data?: { uploadUrl: string; s3Key: string; publicUrl: string; fileName: string }; message?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/faculty/lessons/s3-upload-url`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ topicId, fileName, mimeType }),
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: 'Network error generating S3 signature' };
    }
  },

  // ─── REAL FILE UPLOAD: PRESENTATION TO AWS S3 ───────────────
  uploadPresentation: async (
    token: string | null,
    topicId: string,
    file: File,
    subjectId?: string
  ): Promise<{ success: boolean; data?: { s3Key: string; publicUrl: string; fileName: string; fileSize: number; extractedText?: string }; subject?: Subject; message?: string }> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('topicId', topicId);
      if (subjectId) formData.append('subjectId', subjectId);

      const res = await fetch(`${API_BASE}/faculty/upload/presentation`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: 'Network error uploading presentation' };
    }
  },

  // ─── QUIZ DOCUMENT UPLOAD & TEXT EXTRACTION ─────────────────
  uploadQuizDocument: async (
    token: string | null,
    file: File
  ): Promise<{ success: boolean; data?: { extractedText: string; fileName: string; fileSize: number; s3Key: string }; message?: string }> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE}/faculty/upload/quiz-document`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: 'Network error uploading quiz document' };
    }
  },
};
