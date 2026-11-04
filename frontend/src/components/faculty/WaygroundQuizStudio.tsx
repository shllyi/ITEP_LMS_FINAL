import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Image, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WaygroundQuiz, QuizQuestion } from '@/types/faculty';
import { Bob, Btn, C, CountUp, F, Field, IconBtn, IconName, Pop, Segmented, Toggle } from '@/components/faculty/brand';

interface WaygroundQuizStudioProps {
  quiz?: WaygroundQuiz;
  token: string | null;
  onSaveQuiz: (quiz: WaygroundQuiz) => Promise<void>;
  onUploadQuizDocument: (file: File) => Promise<{ extractedText: string; fileName: string } | null>;
}

/** Card for one quiz setting. */
function Setting({
  icon,
  tint,
  title,
  right,
  children,
}: {
  icon: IconName;
  tint: string;
  title: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <View style={st.setting}>
      <View style={st.settingHead}>
        <View style={[st.settingIcon, { backgroundColor: tint }]}>
          <Ionicons name={icon} size={15} color={C.ink} />
        </View>
        <Text style={st.settingTitle}>{title}</Text>
        {right}
      </View>
      {children}
    </View>
  );
}

/** Minus, number, plus. */
function Stepper({
  value,
  unit,
  error,
  onMinus,
  onPlus,
  onText,
}: {
  value: number;
  unit: string;
  error: boolean;
  onMinus: () => void;
  onPlus: () => void;
  onText: (v: string) => void;
}) {
  return (
    <View style={st.stepper}>
      <IconBtn icon="remove" size={30} label={`Decrease ${unit}`} onPress={onMinus} />
      <Field
        containerStyle={{ width: 64 }}
        style={{ textAlign: 'center', fontFamily: F.display, fontSize: 18, paddingVertical: 5 }}
        keyboardType="numeric"
        value={String(value)}
        onChangeText={onText}
        error={error}
      />
      <IconBtn icon="add" size={30} label={`Increase ${unit}`} onPress={onPlus} />
      <Text style={st.unit}>{unit}</Text>
    </View>
  );
}

/** A/B/C/D marker. Turns into a green check when it is the right answer. */
function Letter({ letter, on, onPress, small }: { letter: string; on: boolean; onPress?: () => void; small?: boolean }) {
  const pop = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (on) {
      pop.setValue(0.7);
      Animated.spring(pop, { toValue: 1, friction: 3, tension: 200, useNativeDriver: true }).start();
    }
  }, [on, pop]);
  const size = small ? 28 : 34;
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`Choice ${letter}`}>
      <Animated.View
        style={[
          st.letter,
          { width: size, height: size, borderRadius: size / 2 },
          on && { backgroundColor: C.green },
          { transform: [{ scale: pop }] },
        ]}
      >
        {on ? (
          <Ionicons name="checkmark" size={small ? 16 : 20} color="#FFFFFF" />
        ) : (
          <Text style={[st.letterText, small && { fontSize: 12 }]}>{letter}</Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

export function WaygroundQuizStudio({
  quiz,
  token,
  onSaveQuiz,
  onUploadQuizDocument,
}: WaygroundQuizStudioProps) {
  // Quiz Configuration State
  const [title, setTitle] = useState(quiz?.title || 'Topic Knowledge Assessment');
  const [hasTimer, setHasTimer] = useState(quiz?.hasTimer ?? true);
  const [durationMinutes, setDurationMinutes] = useState(
    quiz?.durationMinutes && quiz.durationMinutes >= 10 && quiz.durationMinutes <= 20
      ? quiz.durationMinutes
      : 15
  );
  const [passingScorePercent, setPassingScorePercent] = useState(quiz?.passingScorePercent || 75);
  const [shuffleQuestions, setShuffleQuestions] = useState(quiz?.shuffleQuestions ?? true);
  const [shuffleOptions, setShuffleOptions] = useState(quiz?.shuffleOptions ?? true);

  const [durationError, setDurationError] = useState('');
  const [passingScoreError, setPassingScoreError] = useState('');

  // Questions List (Strictly Multiple Choice)
  const [questions, setQuestions] = useState<QuizQuestion[]>(quiz?.questions || []);

  // Form State for Adding/Editing Multiple Choice Question
  const [prompt, setPrompt] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [selectedCorrectIndex, setSelectedCorrectIndex] = useState(0); // 0 = A, 1 = B, 2 = C, 3 = D
  const [explanation, setExplanation] = useState('');
  const [points, setPoints] = useState('1');

  // Saving states
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Document upload state (for quiz extraction)
  const [quizDocMode, setQuizDocMode] = useState<'manual' | 'upload'>('manual');
  const [isExtractingDoc, setIsExtractingDoc] = useState(false);
  const [docUploadMsg, setDocUploadMsg] = useState('');
  const [docUploadError, setDocUploadError] = useState('');
  const [extractedRawText, setExtractedRawText] = useState('');
  const [isDragOverQuiz, setIsDragOverQuiz] = useState(false);
  const quizFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setTitle(quiz?.title || 'Topic Knowledge Assessment');
    setHasTimer(quiz?.hasTimer ?? true);
    setDurationMinutes(
      quiz?.durationMinutes && quiz.durationMinutes >= 10 && quiz.durationMinutes <= 20
        ? quiz.durationMinutes
        : 15
    );
    setPassingScorePercent(quiz?.passingScorePercent || 75);
    setShuffleQuestions(quiz?.shuffleQuestions ?? true);
    setShuffleOptions(quiz?.shuffleOptions ?? true);
    setQuestions(quiz?.questions || []);
    setDurationError('');
    setPassingScoreError('');
  }, [quiz]);

  const handleDurationChange = (valStr: string) => {
    const num = parseInt(valStr, 10);
    if (isNaN(num)) {
      setDurationMinutes(0);
      setDurationError('Please enter a valid number (10 - 20 minutes)');
      return;
    }
    setDurationMinutes(num);
    if (num < 10) {
      setDurationError('Time limit must be at least 10 minutes.');
    } else if (num > 20) {
      setDurationError('Time limit cannot exceed 20 minutes.');
    } else {
      setDurationError('');
    }
  };

  const handlePassingScoreChange = (valStr: string) => {
    const num = parseInt(valStr, 10);
    if (isNaN(num)) {
      setPassingScorePercent(0);
      setPassingScoreError('Please enter a valid percentage (1 - 100)');
      return;
    }
    setPassingScorePercent(num);
    if (num < 1 || num > 100) {
      setPassingScoreError('Passing score must be between 1% and 100%.');
    } else {
      setPassingScoreError('');
    }
  };

  // ─── QUIZ DOCUMENT HANDLERS ──────────────────────────────────

  const processQuizDoc = async (file: File) => {
    const allowed = ['.pdf', '.docx', '.txt', '.pptx'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowed.includes(ext)) {
      setDocUploadError(`Unsupported file type "${ext}". Allowed: .pdf, .docx, .txt, .pptx`);
      return;
    }

    setDocUploadError('');
    setIsExtractingDoc(true);
    setDocUploadMsg('Uploading and extracting text from document...');

    const result = await onUploadQuizDocument(file);
    if (result && result.extractedText) {
      setExtractedRawText(result.extractedText);
      setDocUploadMsg(`Text extracted successfully from "${result.fileName}". Review below and add questions.`);
    } else {
      setDocUploadError('Could not extract readable text from the document. Ensure it contains selectable text.');
      setDocUploadMsg('');
    }
    setIsExtractingDoc(false);
  };

  const handleQuizDocDrop = (e: any) => {
    e.preventDefault();
    setIsDragOverQuiz(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) processQuizDoc(file);
  };

  const handleQuizFilePick = (e: any) => {
    const file = e.target?.files?.[0];
    if (file) processQuizDoc(file);
  };

  const handleParseExtractedQuestions = () => {
    if (!extractedRawText.trim()) return;

    const parsedQuestions: QuizQuestion[] = [];
    // Split into question blocks
    const blocks = extractedRawText.split(/\n\s*(?:(?:Q|Question)?\s*\d+[\.\:\)]|\d+\.\s+)/i);

    for (const rawBlock of blocks) {
      const block = rawBlock.trim();
      if (block.length < 15) continue;

      // Match options A, B, C, D
      const optAMatch = block.match(/(?:^|\n)\s*[A|a][\.\)]\s*([^\n]+)/);
      const optBMatch = block.match(/(?:^|\n)\s*[B|b][\.\)]\s*([^\n]+)/);
      const optCMatch = block.match(/(?:^|\n)\s*[C|c][\.\)]\s*([^\n]+)/);
      const optDMatch = block.match(/(?:^|\n)\s*[D|d][\.\)]\s*([^\n]+)/);

      let questionPrompt = block.split(/(?:^|\n)\s*[A-Da-d][\.\)]/)[0].trim();
      if (!questionPrompt) {
        questionPrompt = block.split('\n')[0].trim();
      }

      const options: string[] = [];
      if (optAMatch) options.push(optAMatch[1].trim());
      if (optBMatch) options.push(optBMatch[1].trim());
      if (optCMatch) options.push(optCMatch[1].trim());
      if (optDMatch) options.push(optDMatch[1].trim());

      if (options.length >= 2 && questionPrompt.length > 5) {
        const ansMatch = block.match(/(?:Answer|Ans|Key|Correct(?:\s+Answer)?)\s*[:\-\s]+([^\n]+)/i);
        let correctIdx = 0;
        if (ansMatch) {
          const answerValue = ansMatch[1].trim();
          const letter = answerValue.charAt(0).toUpperCase();
          if (letter === 'A') correctIdx = 0;
          else if (letter === 'B') correctIdx = 1;
          else if (letter === 'C') correctIdx = 2;
          else if (letter === 'D') correctIdx = 3;
          else {
            const answerIndex = options.findIndex(option => option.toLowerCase() === answerValue.toLowerCase());
            if (answerIndex >= 0) correctIdx = answerIndex;
          }
        }

        parsedQuestions.push({
          id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          type: 'multiple_choice',
          prompt: questionPrompt,
          options,
          correctAnswer: options[correctIdx] || options[0],
          points: 1,
        });
      }
    }

    if (parsedQuestions.length > 0) {
      setQuestions(prev => [...prev, ...parsedQuestions]);
      setDocUploadMsg(`Successfully extracted and created ${parsedQuestions.length} multiple choice questions.`);
      setQuizDocMode('manual');
    } else {
      const firstPara = extractedRawText.split(/\n\s*\n/)[0].trim();
      setPrompt(firstPara.slice(0, 200));
      setDocUploadMsg('Auto-parsing completed: First question prompt pre-filled in manual form below.');
      setQuizDocMode('manual');
    }
  };

  const handleAddQuestion = () => {
    if (!prompt.trim()) return;
    const options = [optionA.trim(), optionB.trim(), optionC.trim(), optionD.trim()].filter(Boolean);
    if (options.length < 2) return;

    const correctAnswer = options[selectedCorrectIndex] || options[0];

    const newQ: QuizQuestion = {
      id: `q_${Date.now()}`,
      type: 'multiple_choice',
      prompt: prompt.trim(),
      options,
      correctAnswer,
      explanation: explanation.trim(),
      points: Number(points) || 1,
    };

    setQuestions([...questions, newQ]);

    // Reset inputs
    setPrompt('');
    setOptionA('');
    setOptionB('');
    setOptionC('');
    setOptionD('');
    setSelectedCorrectIndex(0);
    setExplanation('');
    setPoints('1');
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleSaveQuiz = async () => {
    if (hasTimer && (durationMinutes < 10 || durationMinutes > 20)) {
      setDurationError('Duration must be between 10 and 20 minutes.');
      return;
    }
    if (passingScorePercent < 1 || passingScorePercent > 100) {
      setPassingScoreError('Passing score must be between 1% and 100%.');
      return;
    }

    setSaving(true);
    setSaveSuccess(false);

    const payload: WaygroundQuiz = {
      title,
      hasTimer,
      durationMinutes: hasTimer ? durationMinutes : 15,
      passingScorePercent,
      shuffleQuestions,
      shuffleOptions,
      questions,
    };

    await onSaveQuiz(payload);
    setSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);

  const choices = [
    { letter: 'A', value: optionA, set: setOptionA, ph: 'Choice A' },
    { letter: 'B', value: optionB, set: setOptionB, ph: 'Choice B' },
    { letter: 'C', value: optionC, set: setOptionC, ph: 'Choice C (optional)' },
    { letter: 'D', value: optionD, set: setOptionD, ph: 'Choice D (optional)' },
  ];

  return (
    <View style={st.container}>
      {/* Studio Header */}
      <View style={st.header}>
        <View style={st.headerTop}>
          <View style={st.headerIcon}>
            <Ionicons name="flash" size={20} color={C.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.headerTitle}>Quiz settings</Text>
            <Text style={st.headerSub}>Multiple choice only. Set the timer, pass mark and how questions are mixed.</Text>
          </View>
        </View>

        <View style={st.settings}>
          <Setting
            icon="timer"
            tint={C.blue}
            title="Timer"
            right={<View style={{ marginLeft: 'auto' }}><Toggle value={hasTimer} onChange={setHasTimer} onLabel="On" offLabel="Off" /></View>}
          >
            {hasTimer ? (
              <>
                <Stepper
                  value={durationMinutes}
                  unit="min"
                  error={!!durationError}
                  onMinus={() => handleDurationChange(String(Math.max(10, (durationMinutes || 15) - 1)))}
                  onPlus={() => handleDurationChange(String(Math.min(20, (durationMinutes || 9) + 1)))}
                  onText={handleDurationChange}
                />
                {durationError ? <Text style={st.errCaption}>{durationError}</Text> : <Text style={st.caption}>Pick 10 to 20 minutes.</Text>}
              </>
            ) : (
              <Text style={st.caption}>No time limit. Students can take as long as they need.</Text>
            )}
          </Setting>

          <Setting icon="ribbon" tint={C.yellow} title="Pass mark">
            <Stepper
              value={passingScorePercent}
              unit="%"
              error={!!passingScoreError}
              onMinus={() => handlePassingScoreChange(String(Math.max(1, (passingScorePercent || 5) - 5)))}
              onPlus={() => handlePassingScoreChange(String(Math.min(100, (passingScorePercent || 0) + 5)))}
              onText={handlePassingScoreChange}
            />
            {passingScoreError ? <Text style={st.errCaption}>{passingScoreError}</Text> : <Text style={st.caption}>Students need at least this to pass.</Text>}
          </Setting>

          <Setting icon="shuffle" tint={C.pink} title="Mix it up">
            <View style={st.toggleRow}>
              <Text style={st.toggleLabel}>Shuffle questions</Text>
              <Toggle value={shuffleQuestions} onChange={setShuffleQuestions} />
            </View>
            <View style={st.toggleRow}>
              <Text style={st.toggleLabel}>Shuffle choices</Text>
              <Toggle value={shuffleOptions} onChange={setShuffleOptions} />
            </View>
          </Setting>
        </View>
      </View>

      {/* Main Body */}
      <View style={st.body}>
        {/* QUESTION INPUT MODE SELECTOR */}
        <Segmented
          width={340}
          value={quizDocMode}
          onChange={setQuizDocMode}
          options={[
            { key: 'manual', label: 'Write questions', icon: 'create' },
            { key: 'upload', label: 'Import from a file', icon: 'cloud-upload' },
          ]}
        />

        {/* DOCUMENT UPLOAD MODE */}
        {quizDocMode === 'upload' && (
          <Pop key="upload" from={10} style={st.docSection}>
            <Text style={st.sectionTitle}>Import from a document</Text>
            <Text style={st.sectionSub}>
              Upload a PDF, DOCX, PPTX or TXT file. We pull out the text so you can review it and turn it into questions.
            </Text>

            {docUploadError ? (
              <View style={st.errorBanner}>
                <Ionicons name="alert-circle" size={18} color={C.red} />
                <Text style={st.errorText}>{docUploadError}</Text>
              </View>
            ) : null}

            {Platform.OS === 'web' ? (
              <View
                style={[st.dropzone, isDragOverQuiz && st.dropzoneActive]}
                // @ts-ignore web-only
                onDragOver={(e: any) => { e.preventDefault(); setIsDragOverQuiz(true); }}
                onDragLeave={() => setIsDragOverQuiz(false)}
                onDrop={handleQuizDocDrop}
              >
                <Bob active={isDragOverQuiz}>
                  <View style={st.dropIcon}>
                    <Ionicons name={isExtractingDoc ? 'sync' : 'document-attach'} size={26} color={C.ink} />
                  </View>
                </Bob>
                <Text style={st.dropTitle}>
                  {isExtractingDoc ? 'Reading your file...' : isDragOverQuiz ? 'Let go to upload' : 'Drop a document here'}
                </Text>
                <Text style={st.sectionSub}>.pdf, .docx, .pptx or .txt, up to 10 MB</Text>

                {!isExtractingDoc && (
                  <>
                    <Btn size="sm" tone="blue" icon="folder-open" title="Browse files" onPress={() => quizFileInputRef.current?.click()} style={{ marginTop: 10 }} />
                    {/* @ts-ignore */}
                    <input
                      ref={quizFileInputRef as any}
                      type="file"
                      accept=".pdf,.docx,.pptx,.txt"
                      style={{ display: 'none' }}
                      onChange={handleQuizFilePick}
                    />
                  </>
                )}
              </View>
            ) : (
              <View style={st.dropzone}>
                <Ionicons name="desktop-outline" size={26} color={C.ink} />
                <Text style={st.dropTitle}>Import from a browser</Text>
                <Text style={st.sectionSub}>Open this dashboard in a web browser to upload documents.</Text>
              </View>
            )}

            {docUploadMsg ? <Text style={st.successMsg}>{docUploadMsg}</Text> : null}

            {extractedRawText ? (
              <View style={st.extracted}>
                <Text style={st.extractedTitle}>Extracted text</Text>
                <Text style={st.sectionSub}>Check it over, then turn it into questions or write them yourself.</Text>
                <Field
                  multiline
                  value={extractedRawText}
                  onChangeText={setExtractedRawText}
                  textAlignVertical="top"
                  scrollEnabled
                  style={{ minHeight: 180, maxHeight: 280, lineHeight: 19, fontSize: 13, borderRadius: 14 }}
                  containerStyle={{ marginTop: 10 }}
                />
                <View style={st.extractedActions}>
                  <Btn size="sm" tone="coral" icon="color-wand" title="Turn into questions" onPress={handleParseExtractedQuestions} />
                  <Btn size="sm" tone="paper" icon="create" title="Write them myself" onPress={() => setQuizDocMode('manual')} />
                </View>
              </View>
            ) : null}
          </Pop>
        )}

        {/* ADD NEW QUESTION FORM */}
        <View style={[st.form, quizDocMode === 'upload' && !!extractedRawText && { opacity: 0.7 }]}>
          <Text style={st.sectionTitle}>New question</Text>

          <Text style={st.fieldLabel}>Question</Text>
          <Field placeholder="Type the question..." value={prompt} onChangeText={setPrompt} />

          <Text style={[st.fieldLabel, { marginTop: 14 }]}>Choices. Tap a letter to mark the right answer.</Text>
          <View style={{ gap: 8 }}>
            {choices.map((c, i) => (
              <View key={c.letter} style={st.choiceRow}>
                <Letter letter={c.letter} on={selectedCorrectIndex === i} onPress={() => setSelectedCorrectIndex(i)} />
                <Field containerStyle={{ flex: 1 }} placeholder={c.ph} value={c.value} onChangeText={c.set} />
              </View>
            ))}
          </View>

          <View style={st.metaRow}>
            <View style={{ flex: 1, minWidth: 200 }}>
              <Text style={st.fieldLabel}>Why it is right (optional)</Text>
              <Field placeholder="Explain the correct answer..." value={explanation} onChangeText={setExplanation} />
            </View>
            <View style={{ width: 84 }}>
              <Text style={st.fieldLabel}>Points</Text>
              <Field style={{ textAlign: 'center', fontFamily: F.bold }} keyboardType="numeric" value={points} onChangeText={setPoints} />
            </View>
          </View>

          <Btn title="Add question" tone="blue" size="sm" icon="add-circle" onPress={handleAddQuestion} style={{ marginTop: 16 }} />
        </View>

        {/* QUESTIONS LIST */}
        <View style={{ marginTop: 8 }}>
          <View style={st.listHead}>
            <Text style={st.sectionTitle}>Questions ({questions.length})</Text>
            <View style={st.totalChip}>
              <Ionicons name="star" size={13} color={C.ink} />
              <CountUp to={totalPoints} style={st.totalText} />
              <Text style={st.totalText}>{totalPoints === 1 ? 'point' : 'points'}</Text>
            </View>
          </View>

          {questions.length === 0 ? (
            <View style={st.empty}>
              <Image source={require('@/assets/images/mascot.png')} style={{ width: 90, height: 78 }} resizeMode="contain" />
              <Text style={st.emptyTitle}>No questions yet</Text>
              <Text style={st.emptyText}>Write one above or import a document to get started.</Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {questions.map((q, idx) => (
                <Pop key={q.id} delay={Math.min(idx, 6) * 40} from={14}>
                  <View style={st.qCard}>
                    <View style={st.qTop}>
                      <View style={st.qNum}>
                        <Text style={st.qNumText}>{idx + 1}</Text>
                      </View>
                      <View style={st.qPoints}>
                        <Text style={st.qPointsText}>
                          {q.points} {q.points === 1 ? 'pt' : 'pts'}
                        </Text>
                      </View>
                      <View style={{ marginLeft: 'auto' }}>
                        <IconBtn icon="trash" size={28} tone="coral" label="Delete question" onPress={() => handleDeleteQuestion(q.id)} />
                      </View>
                    </View>

                    <Text style={st.qPrompt}>{q.prompt}</Text>

                    <View style={{ gap: 6 }}>
                      {q.options.map((opt, optIdx) => {
                        const isCorrect = String(q.correctAnswer).toLowerCase() === opt.toLowerCase();
                        return (
                          <Pressable
                            key={optIdx}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: isCorrect }}
                            style={[st.option, isCorrect && st.optionCorrect]}
                            onPress={() => setQuestions(prev => prev.map(item => item.id === q.id ? { ...item, correctAnswer: opt } : item))}
                          >
                            <Letter small letter={String.fromCharCode(65 + optIdx)} on={isCorrect} />
                            <Text style={[st.optText, isCorrect && { fontFamily: F.bold, color: C.greenDeep }]}>{opt}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <Text style={st.hint}>Tap a choice to change the right answer.</Text>

                    {q.explanation ? (
                      <View style={st.note}>
                        <Ionicons name="bulb" size={16} color={C.ink} />
                        <Text style={st.noteText}>{q.explanation}</Text>
                      </View>
                    ) : null}
                  </View>
                </Pop>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Footer */}
      <View style={st.footer}>
        <View style={{ flex: 1, gap: 2 }}>
          {saveSuccess ? (
            <Pop from={6}>
              <View style={st.savedNote}>
                <Ionicons name="checkmark-circle" size={18} color={C.greenDeep} />
                <Text style={st.savedText}>Quiz saved.</Text>
              </View>
            </Pop>
          ) : null}
          {durationError ? <Text style={st.errCaption}>{durationError}</Text> : null}
          {passingScoreError ? <Text style={st.errCaption}>{passingScoreError}</Text> : null}
        </View>
        <Btn
          title={saving ? 'Saving...' : saveSuccess ? 'Saved' : 'Save quiz'}
          tone={saveSuccess ? 'green' : 'coral'}
          icon={saveSuccess ? 'checkmark' : 'save'}
          loading={saving}
          disabled={Boolean(durationError || passingScoreError)}
          onPress={handleSaveQuiz}
        />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: { backgroundColor: C.paper, borderRadius: 24, borderWidth: 3, borderColor: C.ink, overflow: 'hidden' },

  header: { backgroundColor: C.pink, borderBottomWidth: 3, borderBottomColor: C.ink, paddingTop: 26, paddingHorizontal: 16, paddingBottom: 16 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  headerIcon: { width: 40, height: 40, borderRadius: 20, borderWidth: 2.5, borderColor: C.ink, backgroundColor: C.yellow, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: F.display, fontSize: 18, color: C.ink },
  headerSub: { fontFamily: F.medium, fontSize: 12.5, color: C.ink, opacity: 0.75, marginTop: 1 },

  settings: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  setting: { flex: 1, minWidth: 220, backgroundColor: C.paper, borderWidth: 2.5, borderColor: C.ink, borderRadius: 18, padding: 12, gap: 10 },
  settingHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  settingIcon: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  settingTitle: { fontFamily: F.bold, fontSize: 14, color: C.ink },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unit: { fontFamily: F.bold, fontSize: 13, color: C.muted },
  caption: { fontFamily: F.medium, fontSize: 12, color: C.muted },
  errCaption: { fontFamily: F.bold, fontSize: 12, color: C.red },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { fontFamily: F.medium, fontSize: 13, color: C.ink },

  body: { padding: 16, gap: 16 },

  sectionTitle: { fontFamily: F.display, fontSize: 16, color: C.ink },
  sectionSub: { fontFamily: F.medium, fontSize: 12.5, color: C.muted, lineHeight: 18 },
  fieldLabel: { fontFamily: F.bold, fontSize: 12.5, color: C.ink, marginBottom: 6 },

  docSection: { backgroundColor: C.cream, borderWidth: 2.5, borderColor: C.ink, borderRadius: 20, padding: 14, gap: 8 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFE3DE', borderWidth: 2.5, borderColor: C.red, borderRadius: 14, padding: 10 },
  errorText: { flex: 1, fontFamily: F.bold, fontSize: 13, color: C.red },
  dropzone: { alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 170, padding: 22, borderRadius: 18, borderWidth: 3, borderColor: C.ink, borderStyle: 'dashed', backgroundColor: C.paper },
  dropzoneActive: { backgroundColor: C.pink, borderColor: C.coralDeep },
  dropIcon: { width: 52, height: 52, borderRadius: 26, borderWidth: 2.5, borderColor: C.ink, backgroundColor: C.yellow, alignItems: 'center', justifyContent: 'center' },
  dropTitle: { fontFamily: F.display, fontSize: 16, color: C.ink, marginTop: 6, textAlign: 'center' },
  successMsg: { fontFamily: F.bold, fontSize: 13, color: C.greenDeep },
  extracted: { marginTop: 6, backgroundColor: C.paper, borderWidth: 2.5, borderColor: C.ink, borderRadius: 16, padding: 12 },
  extractedTitle: { fontFamily: F.bold, fontSize: 14, color: C.ink },
  extractedActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },

  form: { backgroundColor: C.cream, borderWidth: 2.5, borderColor: C.ink, borderRadius: 20, padding: 14 },
  choiceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  letter: { alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper, borderWidth: 2.5, borderColor: C.ink },
  letterText: { fontFamily: F.display, fontSize: 14, color: C.ink },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14 },

  listHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  totalChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.yellow, borderWidth: 2.5, borderColor: C.ink, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  totalText: { fontFamily: F.bold, fontSize: 13, color: C.ink },

  empty: { alignItems: 'center', backgroundColor: C.cream, borderWidth: 3, borderColor: C.ink, borderStyle: 'dashed', borderRadius: 22, padding: 22 },
  emptyTitle: { fontFamily: F.display, fontSize: 18, color: C.ink, marginTop: 4 },
  emptyText: { fontFamily: F.medium, fontSize: 13, color: C.muted, marginTop: 2, textAlign: 'center' },

  qCard: { backgroundColor: C.paper, borderWidth: 3, borderColor: C.ink, borderRadius: 20, padding: 14, gap: 10 },
  qTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qNum: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.blue, borderWidth: 2.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  qNumText: { fontFamily: F.display, fontSize: 14, color: '#FFFFFF' },
  qPoints: { backgroundColor: C.cream, borderWidth: 2, borderColor: C.ink, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2 },
  qPointsText: { fontFamily: F.bold, fontSize: 11.5, color: C.ink },
  qPrompt: { fontFamily: F.bold, fontSize: 15, lineHeight: 21, color: C.ink },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.cream, borderWidth: 2.5, borderColor: 'transparent', borderRadius: 14, paddingVertical: 6, paddingHorizontal: 8 },
  optionCorrect: { backgroundColor: '#D6F5E6', borderColor: C.green },
  optText: { flex: 1, fontFamily: F.medium, fontSize: 13.5, color: C.ink },
  hint: { fontFamily: F.medium, fontSize: 11.5, color: C.muted },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: C.yellow, borderWidth: 2, borderColor: C.ink, borderRadius: 12, padding: 9 },
  noteText: { flex: 1, fontFamily: F.medium, fontSize: 12.5, lineHeight: 18, color: C.ink },

  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.cream, borderTopWidth: 3, borderTopColor: C.ink },
  savedNote: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  savedText: { fontFamily: F.bold, fontSize: 13, color: C.greenDeep },
});