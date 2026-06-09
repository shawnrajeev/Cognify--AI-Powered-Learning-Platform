import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Note, QuizQuestion, QuizResult } from '../types';
import Layout from '../components/Layout/Layout';
import {
  HelpCircle,
  FileText,
  Trophy,
  CheckCircle,
  XCircle,
  RotateCcw,
  Loader2,
  ArrowRight,
  Award,
  Target,
} from 'lucide-react';

export default function Quizzes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [quizMode, setQuizMode] = useState<'select' | 'quiz' | 'result'>('select');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [notesRes, resultsRes] = await Promise.all([
        supabase.from('notes').select('*').order('created_at', { ascending: false }),
        supabase.from('quiz_results').select('*').order('created_at', { ascending: false }),
      ]);

      if (notesRes.error) throw notesRes.error;
      if (resultsRes.error) throw resultsRes.error;

      setNotes(notesRes.data || []);
      setQuizResults(resultsRes.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }

  const generateQuiz = (note: Note) => {
    const questions = generateQuestionsFromNote(note);
    setQuestions(questions);
    setSelectedNote(note);
    setCurrentQuestion(0);
    setAnswers([]);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setScore(0);
    setQuizMode('quiz');
  };

  const generateQuestionsFromNote = (note: Note): QuizQuestion[] => {
    const content = note.content;
    const words = content.split(/\s+/);
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 10);

    const generatedQuestions: QuizQuestion[] = [];

    // Generate 5 questions using different strategies
    for (let i = 0; i < 5; i++) {
      let question: QuizQuestion;

      if (sentences.length > i) {
        // Extract key terms from the sentence
        const sentence = sentences[i % sentences.length].trim();
        const keyTerms = sentence.match(/\b[A-Z][a-z]+\b|\b[a-z]{5,}\b/g) || [];
        const importantWord = keyTerms.length > 0 ? keyTerms[0] : null;

        if (importantWord && sentence.includes(importantWord)) {
          // Fill in the blank style
          question = {
            question: `What completes this statement: "${sentence.replace(importantWord, '_____')}"?`,
            options: generateOptions(importantWord, words),
            correctAnswer: 0,
          };
        } else {
          // Concept question
          question = {
            question: `Based on your notes, what is mentioned about: "${sentence.substring(0, 50)}..."?`,
            options: generateConceptOptions(sentence, words),
            correctAnswer: 0,
          };
        }
      } else {
        // Fallback generic questions
        const randomWords = words.filter((w) => w.length > 4).slice(0, 5);
        const term = randomWords[i % randomWords.length] || 'concept';
        question = {
          question: `In the context of ${note.subject}, what is the significance of "${term}"?`,
          options: [
            'It is a key concept mentioned in your notes',
            'It is unrelated to the topic',
            'It contradicts the main idea',
            'It is only mentioned once',
          ],
          correctAnswer: 0,
        };
      }

      generatedQuestions.push(question);
    }

    return generatedQuestions;
  };

  const generateOptions = (correct: string, allWords: string[]): string[] => {
    const options = [correct];
    const similarWords = allWords.filter(
      (w) => w.length >= 4 && w.toLowerCase() !== correct.toLowerCase() && !options.includes(w)
    );

    // Shuffle similar words and add 3
    for (let i = 0; i < 3 && similarWords.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * similarWords.length);
      options.push(similarWords[randomIndex]);
      similarWords.splice(randomIndex, 1);
    }

    // Fill remaining with distractors
    while (options.length < 4) {
      options.push(`Option ${options.length + 1}`);
    }

    return options.slice(0, 4);
  };

  const generateConceptOptions = (sentence: string, allWords: string[]): string[] => {
    return [
      sentence.substring(0, 80) + '...',
      'This contradicts the main topic',
      'This is unrelated to the subject',
      'This was not mentioned in your notes',
    ];
  };

  const handleAnswer = (answerIndex: number) => {
    if (showFeedback) return;
    setSelectedAnswer(answerIndex);
  };

  const submitAnswer = () => {
    if (selectedAnswer === null) return;

    setShowFeedback(true);
    const isCorrect = selectedAnswer === questions[currentQuestion].correctAnswer;

    if (isCorrect) {
      setScore(score + 1);
    }

    setAnswers([...answers, selectedAnswer]);
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
    } else {
      // Save quiz result
      saveQuizResult();
      setQuizMode('result');
    }
  };

  const saveQuizResult = async () => {
    if (!selectedNote) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('quiz_results').insert({
        user_id: user.id,
        note_id: selectedNote.id,
        score: score,
        total_questions: 5,
      });

      if (error) throw error;
      await fetchData();
    } catch (err) {
      console.error('Error saving quiz result:', err);
    }
  };

  const resetQuiz = () => {
    setSelectedNote(null);
    setQuestions([]);
    setQuizMode('select');
  };

  const averageScore =
    quizResults.length > 0
      ? Math.round((quizResults.reduce((sum, r) => sum + r.score, 0) / quizResults.length) * 20)
      : null;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Quiz Mode</h1>
          <p className="text-slate-400">Test your knowledge with AI-generated questions</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : quizMode === 'select' ? (
          <div>
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Target className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{quizResults.length}</p>
                    <p className="text-sm text-slate-400">Quizzes Taken</p>
                  </div>
                </div>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-teal-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {averageScore !== null ? `${averageScore}%` : '-'}
                    </p>
                    <p className="text-sm text-slate-400">Average Score</p>
                  </div>
                </div>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                    <Award className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {quizResults.length > 0
                        ? `${Math.max(...quizResults.map((r) => r.score))}/5`
                        : '-'}
                    </p>
                    <p className="text-sm text-slate-400">Best Score</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Note selection */}
            <h2 className="text-xl font-semibold text-white mb-4">Select a note to quiz yourself</h2>

            {notes.length === 0 ? (
              <div className="text-center py-12 bg-slate-800/50 border border-slate-700 rounded-xl">
                <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 mb-2">No notes available for quizzes</p>
                <p className="text-sm text-slate-500">Create some notes first to generate quizzes</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="group bg-slate-800/50 border border-slate-700 rounded-xl p-5 hover:border-emerald-500/50 transition-all cursor-pointer"
                    onClick={() => generateQuiz(note)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <HelpCircle className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white mb-1">{note.title}</h3>
                        <p className="text-sm text-emerald-400 mb-2">{note.subject}</p>
                        <p className="text-sm text-slate-500 line-clamp-2">{note.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : quizMode === 'quiz' && selectedNote ? (
          <div>
            {/* Quiz progress */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Question {currentQuestion + 1} of 5</span>
                <span className="text-sm font-medium text-emerald-400">Score: {score}</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                  style={{ width: `${((currentQuestion + 1) / 5) * 100}%` }}
                />
              </div>
            </div>

            {/* Question */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
              <p className="text-lg text-white leading-relaxed mb-2">
                {questions[currentQuestion].question}
              </p>
              <p className="text-sm text-slate-500">
                Based on your note: "{selectedNote.title}"
              </p>
            </div>

            {/* Options */}
            <div className="space-y-3 mb-6">
              {questions[currentQuestion].options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswer(index)}
                  disabled={showFeedback}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    showFeedback
                      ? index === questions[currentQuestion].correctAnswer
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                        : selectedAnswer === index
                          ? 'bg-red-500/10 border-red-500/50 text-red-400'
                          : 'border-slate-700 text-slate-500'
                      : selectedAnswer === index
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-white'
                        : 'border-slate-700 text-slate-300 hover:border-slate-600 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium ${
                        showFeedback && index === questions[currentQuestion].correctAnswer
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : selectedAnswer === index
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {String.fromCharCode(65 + index)}
                    </div>
                    <span className="flex-1">{option}</span>
                    {showFeedback && index === questions[currentQuestion].correctAnswer && (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    )}
                    {showFeedback && selectedAnswer === index && index !== questions[currentQuestion].correctAnswer && (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-3">
              {!showFeedback ? (
                <button
                  onClick={submitAnswer}
                  disabled={selectedAnswer === null}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white font-semibold rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Submit Answer
                </button>
              ) : (
                <button
                  onClick={nextQuestion}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white font-semibold rounded-lg hover:bg-emerald-600 transition-colors"
                >
                  {currentQuestion < questions.length - 1 ? (
                    <>
                      Next Question
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    'See Results'
                  )}
                </button>
              )}
            </div>
          </div>
        ) : (
          // Results
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 mb-6">
              <Trophy className="w-12 h-12 text-emerald-400" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Quiz Complete!</h2>
            <p className="text-slate-400 mb-6">Your performance on "{selectedNote?.title}"</p>

            <div className="inline-flex items-center gap-4 bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-8">
              <div className="text-center">
                <p className="text-5xl font-bold text-white mb-1">
                  {score}/{questions.length}
                </p>
                <p className="text-sm text-slate-400">Correct Answers</p>
              </div>
              <div className="h-16 w-px bg-slate-700" />
              <div className="text-center">
                <p className="text-5xl font-bold text-emerald-400 mb-1">
                  {Math.round((score / questions.length) * 100)}%
                </p>
                <p className="text-sm text-slate-400">Score</p>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={resetQuiz}
                className="flex items-center gap-2 px-6 py-3 bg-slate-700 text-white font-semibold rounded-lg hover:bg-slate-600 transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
                Try Another Quiz
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
