import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  Animated,
  Easing,
  AccessibilityInfo,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StudentQuiz, StudentQuizQuestion } from '@/services/studentApi';

interface WaygroundStudentQuizModalProps {
  visible: boolean;
  quiz: StudentQuiz;
  topicTitle: string;
  onClose: () => void;
  onSubmit: (answers: Record<string, string>) => Promise<{
    success: boolean;
    passed?: boolean;
    scorePercent?: number;
    passingScorePercent?: number;
    correctCount?: number;
    totalQuestions?: number;
    earnedPoints?: number;
    totalPossiblePoints?: number;
    totalScore?: string;
    attemptsCount?: number;
    unlockedNextTopic?: boolean;
  }>;
  onReviewContent: () => void;
  onProceedToNextTopic: () => void;
}

/* ------------------------------------------------------------------ */
/*  Brand tokens (same as login / welcome / dashboard)                 */
/* ------------------------------------------------------------------ */
const C = {
  bg: '#FDE680',
  yellow: '#FFE97F',
  coral: '#FF6B81',
  coralDeep: '#D94D63',
  pink: '#FFD1D4',
  pinkDeep: '#E8A9AE',
  cream: '#FFF5BA',
  creamDeep: '#E8D77A',
  red: '#D4381C',
  blue: '#00A3EB',
  blueDeep: '#0079AD',
  ink: '#4A1A24',
  muted: '#8F5F68',
  paper: '#FFFBF0',
  green: '#2FB57A',
  greenDeep: '#1E8A5A',
};
const F = {
  body: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  bold: 'Outfit_700Bold',
  display: 'TitanOne_400Regular',
};

const PICK_LINES = ['Ooh, interesting.', 'Bold choice.', 'Locked in!', 'I would have said that too.', 'Hmm, are you sure?'];
const OPTION_BADGES = [C.cream, C.pink, C.yellow, C.pink];

/* ------------------------------------------------------------------ */
/*  Small pieces                                                       */
/* ------------------------------------------------------------------ */
function Chunky({
  children,
  onPress,
  face,
  shadow,
  radius = 16,
  depth = 5,
  style,
  faceStyle,
  disabled,
  held,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  face: string;
  shadow: string;
  radius?: number;
  depth?: number;
  style?: any;
  faceStyle?: any;
  disabled?: boolean;
  held?: boolean;
}) {
  const p = useRef(new Animated.Value(held ? 1 : 0)).current;
  const heldRef = useRef(!!held);
  useEffect(() => {
    heldRef.current = !!held;
    Animated.spring(p, { toValue: held ? 1 : 0, friction: 6, tension: 120, useNativeDriver: true }).start();
  }, [held, p]);
  const rest = () =>
    Animated.spring(p, { toValue: heldRef.current ? 1 : 0, friction: 5, useNativeDriver: true }).start();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => Animated.timing(p, { toValue: 1, duration: 70, useNativeDriver: true }).start()}
      onPressOut={rest}
      style={[{ paddingBottom: depth, opacity: disabled ? 0.5 : 1 }, style]}
    >
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: depth,
          bottom: 0,
          borderRadius: radius,
          backgroundColor: shadow,
          borderWidth: 2.5,
          borderColor: C.ink,
        }}
      />
      <Animated.View
        style={[
          {
            backgroundColor: face,
            borderRadius: radius,
            borderWidth: 2.5,
            borderColor: C.ink,
            transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, depth] }) }],
          },
          faceStyle,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

function Btn({
  label,
  onPress,
  tone = 'coral',
  icon,
  loading,
  disabled,
}: {
  label: string;
  onPress: () => void;
  tone?: 'coral' | 'blue' | 'paper' | 'green';
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
}) {
  const t = {
    coral: { face: C.coral, shadow: C.coralDeep, text: C.cream },
    blue: { face: C.blue, shadow: C.blueDeep, text: '#FFFFFF' },
    green: { face: C.green, shadow: C.greenDeep, text: '#FFFFFF' },
    paper: { face: C.paper, shadow: C.pinkDeep, text: C.ink },
  }[tone];
  return (
    <Chunky face={t.face} shadow={t.shadow} onPress={onPress} disabled={disabled || loading} faceStyle={s.btnFace}>
      {loading ? (
        <ActivityIndicator color={t.text} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon ? <Ionicons name={icon} size={18} color={t.text} /> : null}
          <Text style={[s.btnText, { color: t.text }]}>{label}</Text>
        </View>
      )}
    </Chunky>
  );
}

function Bubble({ text, anim, style }: { text: string; anim: Animated.Value; style?: any }) {
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        s.bubble,
        style,
        { opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] },
      ]}
    >
      <Text style={s.bubbleText}>{text}</Text>
      <View style={s.bubbleTail} />
    </Animated.View>
  );
}

function CountUp({ to, suffix = '', style }: { to: number; suffix?: string; style?: any }) {
  const v = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = v.addListener(({ value }) => setShown(Math.round(value)));
    Animated.timing(v, { toValue: to, duration: 1100, delay: 250, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => v.removeListener(id);
  }, [to, v]);
  return (
    <Text style={style}>
      {shown}
      {suffix}
    </Text>
  );
}

/** Paper confetti that rains once when the quiz is passed. */
function Confetti({ run }: { run: boolean }) {
  const { height } = useWindowDimensions();
  const pieces = useRef(
    Array.from({ length: 26 }, (_, i) => ({
      x: Math.random(),
      size: 9 + Math.random() * 9,
      color: [C.coral, C.blue, C.cream, C.pink, C.green][i % 5],
      spin: 240 + Math.random() * 480,
      dur: 1900 + Math.random() * 1400,
      delay: Math.random() * 600,
      round: i % 3 === 0,
      v: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    if (!run) return;
    pieces.forEach((p) => {
      p.v.setValue(0);
      Animated.timing(p.v, {
        toValue: 1,
        duration: p.dur,
        delay: p.delay,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start();
    });
  }, [run, pieces]);

  if (!run) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            top: -30,
            left: `${p.x * 100}%`,
            width: p.size,
            height: p.size * (p.round ? 1 : 1.6),
            borderRadius: p.round ? p.size : 3,
            backgroundColor: p.color,
            borderWidth: 2,
            borderColor: C.ink,
            opacity: p.v.interpolate({ inputRange: [0, 0.05, 0.85, 1], outputRange: [0, 1, 1, 0] }),
            transform: [
              { translateY: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, height + 60] }) },
              { rotate: p.v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Modal                                                              */
/* ------------------------------------------------------------------ */
export function WaygroundStudentQuizModal({
  visible,
  quiz,
  topicTitle,
  onClose,
  onSubmit,
  onReviewContent,
  onProceedToNextTopic,
}: WaygroundStudentQuizModalProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 700;

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const selectedAnswersRef = useRef<Record<string, string>>({});
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(
    (quiz.hasTimer ? quiz.durationMinutes || 15 : 15) * 60
  );
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [result, setResult] = useState<{
    submitted: boolean;
    passed: boolean;
    scorePercent: number;
    passingScorePercent: number;
    correctCount: number;
    totalQuestions: number;
    earnedPoints: number;
    totalPossiblePoints: number;
    totalScore: string;
    attemptsCount: number;
  } | null>(null);

  const questions: StudentQuizQuestion[] = quiz.questions || [];
  const currentQuestion: StudentQuizQuestion | undefined = questions[currentSlideIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(selectedAnswers).length;

  // animation state
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => {});
  }, []);
  const slide = useRef(new Animated.Value(1)).current;
  const dir = useRef(1);
  const bob = useRef(new Animated.Value(0)).current;
  const hop = useRef(new Animated.Value(0)).current;
  const timerShake = useRef(new Animated.Value(0)).current;
  const bubbleAnim = useRef(new Animated.Value(0)).current;
  const [bubbleText, setBubbleText] = useState('');
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pickIdx = useRef(0);

  const say = (msg: string, ms = 2400) => {
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    setBubbleText(msg);
    bubbleAnim.setValue(0);
    Animated.spring(bubbleAnim, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }).start();
    bubbleTimer.current = setTimeout(() => {
      Animated.timing(bubbleAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }, ms);
  };
  const doHop = () =>
    Animated.sequence([
      Animated.timing(hop, { toValue: -22, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(hop, { toValue: 0, friction: 3, tension: 120, useNativeDriver: true }),
    ]).start();

  useEffect(() => {
    if (reduce) return;
    const l = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    l.start();
    return () => l.stop();
  }, [reduce, bob]);

  useEffect(() => () => { if (bubbleTimer.current) clearTimeout(bubbleTimer.current); }, []);

  // Reset the attempt only when the modal opens. The parent refreshes the quiz
  // object after submission; that refresh must not erase the result screen.
  useEffect(() => {
    if (visible) {
      setCurrentSlideIndex(0);
      setSelectedAnswers({});
      selectedAnswersRef.current = {};
      setResult(null);
      submittingRef.current = false;
      setTimeLeftSeconds((quiz.hasTimer ? quiz.durationMinutes || 15 : 15) * 60);
      const t = setTimeout(() => say('Take your time. I’m rooting for you.', 3000), 500);
      return () => clearTimeout(t);
    }
    // The quiz is intentionally read from the opening render. A changed quiz
    // object while visible represents the post-submit progress refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Countdown
  useEffect(() => {
    if (!visible || !quiz.hasTimer || result?.submitted) return;
    const timer = setInterval(() => setTimeLeftSeconds((prev) => (prev <= 0 ? 0 : prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [visible, quiz.hasTimer, result?.submitted]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (visible && quiz.hasTimer && timeLeftSeconds === 0 && !result?.submitted && !submittingRef.current) {
      handleFinalSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeftSeconds]);

  // Timer pressure cues
  useEffect(() => {
    if (!quiz.hasTimer || result?.submitted || !visible) return;
    if (timeLeftSeconds === 300) say('Five minutes left.', 2600);
    if (timeLeftSeconds === 120) say('Two minutes! Pick up the pace.', 3000);
    if (timeLeftSeconds > 0 && timeLeftSeconds < 120 && !reduce) {
      Animated.sequence(
        [6, -6, 4, -4, 0].map((to) => Animated.timing(timerShake, { toValue: to, duration: 50, useNativeDriver: true }))
      ).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeftSeconds]);

  // Slide between questions
  useEffect(() => {
    slide.setValue(0);
    Animated.spring(slide, { toValue: 1, friction: 8, tension: 90, useNativeDriver: true }).start();
  }, [currentSlideIndex, slide]);

  // Celebrate / console on result
  useEffect(() => {
    if (!result?.submitted) return;
    doHop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.submitted]);

  const go = (to: number) => {
    if (to < 0 || to >= totalQuestions || to === currentSlideIndex) return;
    dir.current = to > currentSlideIndex ? 1 : -1;
    setCurrentSlideIndex(to);
  };

  const handleSelectOption = (questionId: string, option: string) => {
    const nextAnswers = { ...selectedAnswersRef.current, [questionId]: option };
    selectedAnswersRef.current = nextAnswers;
    setSelectedAnswers(nextAnswers);
    doHop();
    say(PICK_LINES[pickIdx.current++ % PICK_LINES.length], 1800);
  };

  const handleFinalSubmit = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    const answers = selectedAnswersRef.current;
    setSubmitting(true);
    const res = await onSubmit(answers);
    setSubmitting(false);
    if (res.success) {
      setResult({
        submitted: true,
        passed: Boolean(res.passed),
        scorePercent: res.scorePercent ?? 0,
        passingScorePercent: res.passingScorePercent ?? quiz.passingScorePercent ?? 75,
        correctCount: res.correctCount ?? 0,
        totalQuestions: res.totalQuestions ?? totalQuestions,
        earnedPoints: res.earnedPoints ?? 0,
        totalPossiblePoints:
          res.totalPossiblePoints ?? questions.reduce((sum, question) => sum + (question.points || 1), 0),
        totalScore: res.totalScore ?? `${res.correctCount ?? 0} / ${res.totalQuestions ?? totalQuestions} Correct`,
        attemptsCount: res.attemptsCount ?? 1,
      });
    } else {
      submittingRef.current = false;
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`;
  };

  const totalSeconds = (quiz.durationMinutes || 15) * 60;
  const timerRatio = quiz.hasTimer ? Math.max(0, Math.min(1, timeLeftSeconds / totalSeconds)) : 1;
  const timerTone =
    timeLeftSeconds < 120
      ? { face: C.red, text: '#FFFFFF', fill: C.red }
      : timeLeftSeconds < 300
      ? { face: C.coral, text: C.cream, fill: C.coral }
      : { face: C.paper, text: C.ink, fill: C.blue };

  if (!visible) return null;

  const mascotStyle = {
    width: 150,
    height: 130,
    transform: [
      { translateY: Animated.add(hop, bob.interpolate({ inputRange: [0, 1], outputRange: [0, -5] })) },
      { rotate: bob.interpolate({ inputRange: [0, 1], outputRange: ['-2deg', '2deg'] }) },
    ],
  } as any;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={s.screen}>
        <View pointerEvents="none" style={s.blobCoral} />
        <View pointerEvents="none" style={s.blobBlue} />

        {/* ---------- top bar ---------- */}
        <View style={s.topBar}>
          {!result?.submitted ? (
            <Chunky
              face={C.paper}
              shadow={C.pinkDeep}
              radius={12}
              depth={4}
              onPress={onClose}
              faceStyle={{ paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <Ionicons name="close" size={16} color={C.ink} />
              <Text style={s.smallBtnText}>Exit quiz</Text>
            </Chunky>
          ) : (
            <View style={{ width: 4 }} />
          )}

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.brand}>Topic quiz</Text>
            <Text style={s.topicTitle} numberOfLines={1}>
              {topicTitle}
            </Text>
          </View>

          {quiz.hasTimer && !result?.submitted && (
            <Animated.View style={{ transform: [{ translateX: timerShake }], alignItems: 'stretch', width: 132 }}>
              <View style={[s.timerPill, { backgroundColor: timerTone.face }]}>
                <Ionicons name="stopwatch" size={18} color={timerTone.text} />
                <Text style={[s.timerText, { color: timerTone.text }]}>{formatTime(timeLeftSeconds)}</Text>
              </View>
              <View style={s.timerTrack}>
                <View style={[s.timerFill, { width: `${timerRatio * 100}%`, backgroundColor: timerTone.fill }]} />
              </View>
            </Animated.View>
          )}
        </View>

        {/* ---------- result ---------- */}
        {result?.submitted ? (
          <View style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={s.resultScroll} showsVerticalScrollIndicator={false}>
              <View style={s.resultWrap}>
                <Animated.View style={[s.resultMascot, { transform: [{ translateY: hop }] }]}>
                  <Image
                    source={
                      result.passed
                        ? require('@/assets/images/mascot_gif.gif')
                        : require('@/assets/images/mascot.png')
                    }
                    style={{ width: 170, height: 150 }}
                    resizeMode="contain"
                  />
                </Animated.View>

                <View style={{ zIndex: 2 }}>
                  <View style={[s.cardShadow, { backgroundColor: result.passed ? C.green : C.coral }]} />
                  <View style={s.resultCard}>
                    <View style={[s.verdict, { backgroundColor: result.passed ? C.green : C.coral }]}>
                      <Ionicons name={result.passed ? 'trophy' : 'refresh-circle'} size={22} color="#FFFFFF" />
                      <Text style={s.verdictText}>
                        {result.passed ? 'You passed!' : 'Not quite there yet'}
                      </Text>
                    </View>

                    <Text style={s.resultLead}>
                      {result.passed
                        ? 'Nice work. The next topic is now unlocked.'
                        : 'Review the lesson, then give it another shot. The next topic stays locked until you reach the passing score.'}
                    </Text>

                    <CountUp to={result.scorePercent} suffix="%" style={s.bigPercent} />

                    {/* score track with a tick at the passing mark */}
                    <View style={s.scoreTrackWrap}>
                      <View style={s.scoreTrack}>
                        <ScoreFill pct={result.scorePercent} color={result.passed ? C.green : C.coral} />
                      </View>
                      <View style={[s.passTick, { left: `${Math.min(100, result.passingScorePercent)}%` }]} />
                    </View>
                    <View style={s.scoreLegend}>
                      <Text style={s.legendText}>0%</Text>
                      <Text style={[s.legendText, { color: C.ink, fontFamily: F.bold }]}>
                        Pass at {result.passingScorePercent}%
                      </Text>
                      <Text style={s.legendText}>100%</Text>
                    </View>

                    <View style={s.metricRow}>
                      <View style={[s.metric, { backgroundColor: C.cream, transform: [{ rotate: '-1.2deg' }] }]}>
                        <Text style={s.metricValue}>
                          {result.correctCount}/{result.totalQuestions}
                        </Text>
                        <Text style={s.metricLabel}>Correct</Text>
                      </View>
                      <View style={[s.metric, { backgroundColor: C.pink, transform: [{ rotate: '1deg' }] }]}>
                        <Text style={s.metricValue}>
                          {result.earnedPoints}/{result.totalPossiblePoints}
                        </Text>
                        <Text style={s.metricLabel}>Points</Text>
                      </View>
                      <View style={[s.metric, { backgroundColor: C.cream, transform: [{ rotate: '-0.8deg' }] }]}>
                        <Text style={s.metricValue}>#{result.attemptsCount}</Text>
                        <Text style={s.metricLabel}>Attempt</Text>
                      </View>
                    </View>

                    <View style={{ marginTop: 24, alignItems: 'center' }}>
                      {result.passed ? (
                        <Btn label="Next topic" tone="green" icon="arrow-forward" onPress={onProceedToNextTopic} />
                      ) : (
                        <Btn
                          label="Review and retry"
                          tone="coral"
                          icon="book"
                          onPress={() => {
                            onClose();
                            onReviewContent();
                          }}
                        />
                      )}
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>
            <Confetti run={result.passed && !reduce} />
          </View>
        ) : (
          /* ---------- question runner ---------- */
          <View style={{ flex: 1 }}>
            {totalQuestions === 0 ? (
              <View style={s.empty}>
                <Image source={require('@/assets/images/mascot.png')} style={{ width: 150, height: 130 }} resizeMode="contain" />
                <Text style={s.emptyTitle}>No questions yet</Text>
                <Text style={s.emptySub}>Your instructor hasn’t added questions to this quiz.</Text>
                <View style={{ marginTop: 18 }}>
                  <Btn label="Close" tone="paper" onPress={onClose} />
                </View>
              </View>
            ) : (
              <>
                {/* tappable progress segments */}
                <View style={s.segRow}>
                  {questions.map((q, i) => {
                    const answered = selectedAnswers[q.id] !== undefined;
                    const current = i === currentSlideIndex;
                    return (
                      <Pressable
                        key={q.id}
                        onPress={() => go(i)}
                        accessibilityLabel={`Go to question ${i + 1}`}
                        style={[
                          s.seg,
                          answered && { backgroundColor: C.blue },
                          current && { backgroundColor: C.coral, transform: [{ scaleY: 1.5 }] },
                        ]}
                      />
                    );
                  })}
                </View>

                {currentQuestion ? (
                  <ScrollView contentContainerStyle={s.qScroll} showsVerticalScrollIndicator={false}>
                    <Animated.View
                      style={{
                        opacity: slide,
                        transform: [
                          { translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [dir.current * 46, 0] }) },
                        ],
                      }}
                    >
                      <View style={s.promptArea}>
                        <Pressable
                          onPress={() => {
                            doHop();
                            say('You can do this one.');
                          }}
                          style={s.promptMascot}
                          accessibilityLabel="Mascot"
                        >
                          <Animated.Image source={require('@/assets/images/mascot.png')} resizeMode="contain" style={mascotStyle} />
                        </Pressable>
                        <Bubble text={bubbleText} anim={bubbleAnim} style={{ position: 'absolute', top: -58, right: 150, zIndex: 5 }} />

                        <View style={{ zIndex: 2 }}>
                          <View style={[s.cardShadow, { backgroundColor: C.coral }]} />
                          <View style={s.prompt}>
                            <View style={s.promptMeta}>
                              <View style={[s.tag, { backgroundColor: C.cream }]}>
                                <Text style={s.tagText}>
                                  Question {currentSlideIndex + 1} of {totalQuestions}
                                </Text>
                              </View>
                              <View style={[s.tag, { backgroundColor: C.pink }]}>
                                <Ionicons name="star" size={12} color={C.ink} />
                                <Text style={s.tagText}>
                                  {currentQuestion.points || 1} {(currentQuestion.points || 1) === 1 ? 'point' : 'points'}
                                </Text>
                              </View>
                            </View>
                            <Text style={[s.promptText, isDesktop && { fontSize: 26, lineHeight: 34 }]}>
                              {currentQuestion.prompt}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={s.options}>
                        {currentQuestion.options.map((option, idx) => {
                          const isSelected = selectedAnswers[currentQuestion.id] === option;
                          return (
                            <Chunky
                              key={idx}
                              held={isSelected}
                              face={isSelected ? C.blue : '#FFFFFF'}
                              shadow={isSelected ? C.blueDeep : C.pinkDeep}
                              radius={18}
                              depth={6}
                              onPress={() => handleSelectOption(currentQuestion.id, option)}
                              faceStyle={s.optionFace}
                            >
                              <View
                                style={[
                                  s.badge,
                                  { backgroundColor: isSelected ? '#FFFFFF' : OPTION_BADGES[idx % OPTION_BADGES.length] },
                                ]}
                              >
                                <Text style={s.badgeText}>{String.fromCharCode(65 + idx)}</Text>
                              </View>
                              <Text style={[s.optionText, isSelected && { color: '#FFFFFF', fontFamily: F.bold }]}>{option}</Text>
                              {isSelected ? <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" /> : null}
                            </Chunky>
                          );
                        })}
                      </View>
                    </Animated.View>
                  </ScrollView>
                ) : null}

                {/* bottom bar */}
                <View style={s.navBar}>
                  <Btn
                    label="Previous"
                    tone="paper"
                    icon="arrow-back"
                    disabled={currentSlideIndex === 0}
                    onPress={() => go(currentSlideIndex - 1)}
                  />

                  <View style={s.counter}>
                    <Text style={s.counterBig}>
                      {answeredCount}
                      <Text style={s.counterSmall}>/{totalQuestions}</Text>
                    </Text>
                    <Text style={[s.counterLabel, answeredCount < totalQuestions && currentSlideIndex === totalQuestions - 1 && { color: C.red }]}>
                      {answeredCount === totalQuestions
                        ? 'all answered'
                        : `${totalQuestions - answeredCount} left unanswered`}
                    </Text>
                  </View>

                  {currentSlideIndex === totalQuestions - 1 ? (
                    <Btn
                      label={submitting ? 'Checking…' : 'Submit quiz'}
                      tone="green"
                      icon="send"
                      loading={submitting}
                      onPress={handleFinalSubmit}
                    />
                  ) : (
                    <Btn label="Next" tone="blue" icon="arrow-forward" onPress={() => go(currentSlideIndex + 1)} />
                  )}
                </View>
              </>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

/** Score bar that grows from 0 when the result screen appears. */
function ScoreFill({ pct, color }: { pct: number; color: string }) {
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(w, { toValue: pct, duration: 1100, delay: 250, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [pct, w]);
  return (
    <Animated.View
      style={{
        height: '100%',
        backgroundColor: color,
        width: w.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  blobCoral: { position: 'absolute', width: 280, height: 280, borderRadius: 999, top: -110, right: -100, backgroundColor: C.coral },
  blobBlue: { position: 'absolute', width: 190, height: 190, borderRadius: 999, bottom: 60, left: -100, backgroundColor: C.blue },

  btnFace: { paddingHorizontal: 20, height: 48, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: F.display, fontSize: 16, letterSpacing: 0.3 },
  smallBtnText: { fontFamily: F.bold, fontSize: 13, color: C.ink },

  // bubble
  bubble: { maxWidth: 220, backgroundColor: '#FFFFFF', borderWidth: 2.5, borderColor: C.ink, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 },
  bubbleText: { fontFamily: F.medium, fontSize: 14, color: C.ink },
  bubbleTail: { position: 'absolute', bottom: -8, right: 24, width: 12, height: 12, backgroundColor: '#FFFFFF', borderRightWidth: 2.5, borderBottomWidth: 2.5, borderColor: C.ink, transform: [{ rotate: '45deg' }] },

  // top bar
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 12, backgroundColor: C.paper, borderBottomWidth: 3, borderBottomColor: C.ink },
  brand: { fontFamily: F.bold, fontSize: 12, color: C.muted },
  topicTitle: { fontFamily: F.display, fontSize: 18, color: C.ink, marginTop: 1 },
  timerPill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 2.5, borderColor: C.ink, borderRadius: 14, paddingVertical: 7 },
  timerText: { fontFamily: F.display, fontSize: 18 },
  timerTrack: { height: 8, borderRadius: 4, borderWidth: 2, borderColor: C.ink, backgroundColor: '#FFFFFF', marginTop: 5, overflow: 'hidden' },
  timerFill: { height: '100%' },

  // progress segments
  segRow: { flexDirection: 'row', gap: 5, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 6, maxWidth: 900, width: '100%', alignSelf: 'center' },
  seg: { flex: 1, height: 10, minWidth: 6, borderRadius: 5, borderWidth: 2, borderColor: C.ink, backgroundColor: '#FFFFFF' },

  // question
  qScroll: { padding: 20, paddingBottom: 30, maxWidth: 900, width: '100%', alignSelf: 'center' },
  promptArea: { marginTop: 78 },
  promptMascot: { position: 'absolute', top: -92, right: 18, zIndex: 1 },
  cardShadow: { position: 'absolute', top: 9, left: 9, right: -9, bottom: -9, borderRadius: 26, borderWidth: 3, borderColor: C.ink },
  prompt: { backgroundColor: C.paper, borderRadius: 26, borderWidth: 3, borderColor: C.ink, padding: 22 },
  promptMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 2, borderColor: C.ink, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  tagText: { fontFamily: F.bold, fontSize: 12, color: C.ink },
  promptText: { fontFamily: F.bold, fontSize: 21, lineHeight: 29, color: C.ink },

  options: { gap: 14, marginTop: 34 },
  optionFace: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingVertical: 14 },
  badge: { width: 36, height: 36, borderRadius: 18, borderWidth: 2.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: F.display, fontSize: 16, color: C.ink },
  optionText: { flex: 1, fontFamily: F.medium, fontSize: 17, lineHeight: 24, color: C.ink },

  // bottom bar
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 18, paddingVertical: 14, backgroundColor: C.paper, borderTopWidth: 3, borderTopColor: C.ink },
  counter: { alignItems: 'center' },
  counterBig: { fontFamily: F.display, fontSize: 24, color: C.ink },
  counterSmall: { fontFamily: F.display, fontSize: 16, color: C.muted },
  counterLabel: { fontFamily: F.medium, fontSize: 12, color: C.muted },

  // result
  resultScroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20, paddingTop: 40, paddingBottom: 40 },
  resultWrap: { width: '100%', maxWidth: 600, marginTop: 70 },
  resultMascot: { position: 'absolute', top: -100, alignSelf: 'center', zIndex: 1 },
  resultCard: { backgroundColor: C.paper, borderRadius: 28, borderWidth: 3, borderColor: C.ink, padding: 24, alignItems: 'center' },
  verdict: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2.5, borderColor: C.ink, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 8, marginTop: 6 },
  verdictText: { fontFamily: F.display, fontSize: 18, color: '#FFFFFF' },
  resultLead: { fontFamily: F.medium, fontSize: 15, lineHeight: 22, color: C.muted, textAlign: 'center', marginTop: 14, maxWidth: 420 },
  bigPercent: { fontFamily: F.display, fontSize: 76, lineHeight: 84, color: C.ink, marginTop: 10 },
  scoreTrackWrap: { width: '100%', marginTop: 8, justifyContent: 'center' },
  scoreTrack: { height: 20, borderRadius: 10, borderWidth: 2.5, borderColor: C.ink, backgroundColor: '#FFFFFF', overflow: 'hidden' },
  passTick: { position: 'absolute', top: -5, width: 4, height: 30, marginLeft: -2, borderRadius: 2, backgroundColor: C.ink },
  scoreLegend: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 },
  legendText: { fontFamily: F.medium, fontSize: 12, color: C.muted },
  metricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, width: '100%', marginTop: 22 },
  metric: { flexGrow: 1, flexBasis: 110, borderWidth: 2.5, borderColor: C.ink, borderRadius: 18, paddingVertical: 14, alignItems: 'center' },
  metricValue: { fontFamily: F.display, fontSize: 24, color: C.ink },
  metricLabel: { fontFamily: F.medium, fontSize: 13, color: C.muted, marginTop: 2 },

  // empty
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { fontFamily: F.display, fontSize: 26, color: C.ink, marginTop: 6 },
  emptySub: { fontFamily: F.medium, fontSize: 15, color: C.muted, marginTop: 6, textAlign: 'center' },
});