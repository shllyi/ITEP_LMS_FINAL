export type QuestionType = 'multiple_choice';

export interface QuizQuestion {
  id: string;
  type: 'multiple_choice';
  prompt: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
  points: number;
}

export interface WaygroundQuiz {
  title: string;
  hasTimer: boolean;
  durationMinutes: number; // Enforced 10 - 20 mins when timer enabled
  passingScorePercent: number; // e.g. 50 - 100
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  questions: QuizQuestion[];
}

export interface TopicContent {
  richText?: string;
  presentationS3Key?: string;
  presentationUrl?: string;
  presentationFileName?: string;
  presentationFileSize?: number;
  presentationExtractedText?: string;
  summaryText?: string;
  summaryBullets?: string[];
}

export interface Topic {
  id: string;
  title: string;
  order: number;
  status: 'draft' | 'published';
  content?: TopicContent;
  quiz?: WaygroundQuiz;
}

export interface Module {
  id: string;
  title: string;
  order: number;
  topics: Topic[];
}

export type SemesterType = '1st Semester' | '2nd Semester' | '3rd Semester';
export type YearLevelType = '1st Year' | '2nd Year' | '3rd Year' | '4th Year';

export interface Subject {
  _id: string;
  name: string;
  code: string;
  academicYear: string;
  semester: SemesterType;
  yearLevel: YearLevelType;
  faculty: string;
  modules: Module[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubjectPayload {
  name: string;
  code: string;
  academicYear: string;
  semester: SemesterType;
  yearLevel: YearLevelType;
}

export interface UpdateSubjectPayload {
  name?: string;
  code?: string;
  academicYear?: string;
  semester?: SemesterType;
  yearLevel?: YearLevelType;
}

export interface QuizScore {
  topicId: string;
  topicTitle: string;
  moduleTitle?: string;
  totalQuestions: number;
  correctCount: number | null;
}

export interface EnrolledStudent {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  studentNumber?: string;
  section?: string;
  tuptId?: string;
  quizScorePercent?: number;
  passedQuizzes?: number;
  totalQuizzes?: number;
  attemptsTotal?: number;
  quizScores?: QuizScore[];
}
