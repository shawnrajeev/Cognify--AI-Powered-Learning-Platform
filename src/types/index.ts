export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  subject: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuizResult {
  id: string;
  user_id: string;
  note_id: string;
  score: number;
  total_questions: number;
  created_at: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface DashboardStats {
  totalNotes: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  averageScore: number | null;
  recentNotes: Note[];
  upcomingTasks: Task[];
}
