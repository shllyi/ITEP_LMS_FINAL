import { API_BASE, getHeaders } from './api';

export interface StudentTopicContent {
  richText: string;
  presentationS3Key?: string;
  presentationUrl?: string;
  presentationFileName?: string;
  presentationFileSize?: number;
  summaryText?: string;
  summaryBullets?: string[];
}

export interface StudentQuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  points: number;
}

export interface StudentQuiz {
  title: string;
  hasTimer: boolean;
  durationMinutes: number;
  passingScorePercent: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  questions: StudentQuizQuestion[];
}

export interface StudentTopic {
  id: string;
  title: string;
  order: number;
  status: 'published';
  unlocked: boolean;
  contentReviewed: boolean;
  quizPassed: boolean;
  bestScorePercent: number;
  attemptsCount: number;
  content?: StudentTopicContent;
  quiz?: StudentQuiz;
}

export interface StudentModule {
  id: string;
  title: string;
  order: number;
  topics: StudentTopic[];
}

export interface StudentSubjectDetails {
  subject: {
    _id: string;
    name: string;
    code: string;
    academicYear: string;
    semester: string;
    yearLevel: string;
    faculty?: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  overallProgressPercent: number;
  streak?: { current: number; target: number; unlocked: boolean };
  modules: StudentModule[];
}

export const studentApi = {
  getSubjectDetails: async (
    token: string | null,
    subjectId: string
  ): Promise<{ success: boolean; data?: StudentSubjectDetails; message?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/student/subjects/${subjectId}`, {
        headers: getHeaders(token),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Network error loading course details.' };
    }
  },

  markTopicReviewed: async (
    token: string | null,
    subjectId: string,
    topicId: string
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/student/topics/mark-reviewed`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ subjectId, topicId }),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Network error updating review progress.' };
    }
  },

  submitQuiz: async (
    token: string | null,
    subjectId: string,
    topicId: string,
    answers: Record<string, string>
  ): Promise<{
    success: boolean;
    passed?: boolean;
    scorePercent?: number;
    totalScore?: string;
    passingScorePercent?: number;
    correctCount?: number;
    totalQuestions?: number;
    earnedPoints?: number;
    totalPossiblePoints?: number;
    attemptsCount?: number;
    unlockedNextTopic?: boolean;
    message?: string;
  }> => {
    try {
      const res = await fetch(`${API_BASE}/student/topics/quiz/submit`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ subjectId, topicId, answers }),
      });
      const response = await res.json();
      // The backend keeps evaluation values under `data`; expose them at the
      // service boundary so the quiz modal can render the submitted result.
      return {
        success: Boolean(response.success),
        message: response.message,
        ...(response.data || {}),
        passingScorePercent: response.data?.passingScorePercent ?? response.data?.passingThreshold,
      };
    } catch {
      return { success: false, message: 'Network error submitting quiz.' };
    }
  },
};
