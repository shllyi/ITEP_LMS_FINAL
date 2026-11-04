import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Animated,
  Easing,
  AccessibilityInfo,
  useWindowDimensions,
  Alert,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import { TitanOne_400Regular } from '@expo-google-fonts/titan-one';
import { useAuth } from '@/context/AuthContext';
import { DashboardData } from '@/types/auth';
import { studentApi, StudentSubjectDetails } from '@/services/studentApi';
import PageLoading from '@/components/PageLoading';
import { WaygroundStudentQuizModal } from '@/components/student/WaygroundStudentQuizModal';
import { PresentationViewer } from '@/components/presentation/PresentationViewer';
import { StreakBadge } from '@/components/student/StreakBadge';

/* ------------------------------------------------------------------ */
/*  Brand tokens (same as login + welcome)                             */
/* ------------------------------------------------------------------ */
const C = {
  bg: '#FDE680',
  yellow: '#FFE97F',
  coral: '#FF6B81',
  coralDeep: '#D94D63',
  pink: '#FFD1D4',
  pinkDeep: '#E8A9AE',
  cream: '#FFF5BA',
  red: '#D4381C',
  blue: '#00A3EB',
  blueDeep: '#0079AD',
  ink: '#4A1A24',
  muted: '#8F5F68',
  paper: '#FFFBF0',
  green: '#2FB57A',
  greenDeep: '#1E8A5B',
};
const F = {
  body: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  bold: 'Outfit_700Bold',
  display: 'TitanOne_400Regular',
};

const ACCENTS = [
  { face: C.blue, deep: C.blueDeep, fg: '#FFFFFF' },
  { face: C.coral, deep: C.coralDeep, fg: C.cream },
  { face: C.cream, deep: '#E8D77A', fg: C.ink },
  { face: C.pink, deep: C.pinkDeep, fg: C.ink },
];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/* ------------------------------------------------------------------ */
/*  Progress helpers (everything is computed from real topic data)     */
/* ------------------------------------------------------------------ */
type ModuleT = StudentSubjectDetails['modules'][number];
type TopicT = ModuleT['topics'][number];

type CourseStats = {
  totalTopics: number;
  doneTopics: number;
  totalModules: number;
  doneModules: number;
  pct: number;
  completed: boolean;
  scores: number[]; // "passed with X%" for every passed quiz
  accuracy: number | null;
  quizzesPassed: number;
  best: number | null;
  lowest: { title: string; score: number } | null;
  streak?: { current: number; target: number; unlocked: boolean };
};

const isTopicDone = (t: TopicT) =>
  !!(t.quizPassed || (t.contentReviewed && (!t.quiz || (t.quiz.questions?.length ?? 0) === 0)));

const isModuleDone = (m: ModuleT) => m.topics.length > 0 && m.topics.every(isTopicDone);

const avg = (list: number[]) => (list.length ? Math.round(list.reduce((a, b) => a + b, 0) / list.length) : null);

function computeStats(d: StudentSubjectDetails): CourseStats {
  const modules = d.modules ?? [];
  let totalTopics = 0;
  let doneTopics = 0;
  const scores: number[] = [];
  let lowest: { title: string; score: number } | null = null;
  modules.forEach((m) =>
    m.topics.forEach((t) => {
      totalTopics += 1;
      if (isTopicDone(t)) doneTopics += 1;
      if (t.quizPassed && typeof t.bestScorePercent === 'number') {
        scores.push(t.bestScorePercent);
        if (!lowest || t.bestScorePercent < lowest.score) lowest = { title: t.title, score: t.bestScorePercent };
      }
    })
  );
  const streak = (d as any).streak
    ? {
        current: Number((d as any).streak.current) || 0,
        target: Number((d as any).streak.target) || 0,
        unlocked: !!(d as any).streak.unlocked,
      }
    : undefined;
  return {
    totalTopics,
    doneTopics,
    totalModules: modules.length,
    doneModules: modules.filter(isModuleDone).length,
    pct: totalTopics ? Math.round((doneTopics / totalTopics) * 100) : 0,
    completed: totalTopics > 0 && doneTopics === totalTopics,
    scores,
    accuracy: avg(scores),
    quizzesPassed: scores.length,
    best: scores.length ? Math.max(...scores) : null,
    lowest,
    streak,
  };
}

const subjectName = (d: StudentSubjectDetails) => d.subject?.name || (d as any).name || 'Course';
const subjectCode = (d: StudentSubjectDetails) => d.subject?.code || (d as any).code || 'COURSE';

type Celebration =
  | {
      type: 'module';
      moduleTitle: string;
      topics: number;
      accuracy: number | null;
      modulesDone: number;
      modulesTotal: number;
      coursePct: number;
      nextTitle?: string;
    }
  | { type: 'course'; code: string; title: string; stats: CourseStats };

/* ------------------------------------------------------------------ */
/*  Small shared pieces                                                */
/* ------------------------------------------------------------------ */
function useBubble() {
  const anim = useRef(new Animated.Value(0)).current;
  const [text, setText] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const say = (msg: string, ms = 2600) => {
    if (timer.current) clearTimeout(timer.current);
    setText(msg);
    anim.setValue(0);
    Animated.spring(anim, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }).start();
    timer.current = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }, ms);
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return { anim, text, say };
}

function useBob(reduce: boolean, ms = 1700) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) return;
    const l = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    l.start();
    return () => l.stop();
  }, [reduce, ms, v]);
  return v;
}

function Bubble({
  text,
  anim,
  style,
  center,
}: {
  text: string;
  anim: Animated.Value;
  style?: any;
  center?: boolean;
}) {
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
      <View style={[s.bubbleTail, center && { left: '50%', marginLeft: -6 }]} />
    </Animated.View>
  );
}

/** Confetti pop. Bump `trigger` to fire it. */
function Burst({ trigger, disabled }: { trigger: number; disabled?: boolean }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!trigger || disabled) return;
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [trigger, disabled, v]);
  if (disabled) return null;
  const colors = [C.coral, C.blue, C.cream, C.pink, C.green, C.red];
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: '50%', top: '45%', width: 0, height: 0, zIndex: 20 }}>
      {Array.from({ length: 14 }).map((_, i) => {
        const a = (i / 14) * Math.PI * 2;
        const d = 80 + (i % 3) * 26;
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              width: 11,
              height: 11,
              borderRadius: i % 2 ? 6 : 3,
              borderWidth: 2,
              borderColor: C.ink,
              backgroundColor: colors[i % colors.length],
              opacity: v.interpolate({ inputRange: [0, 0.08, 0.8, 1], outputRange: [0, 1, 1, 0] }),
              transform: [
                { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(a) * d] }) },
                { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(a) * d + 30] }) },
                { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${(i % 2 ? 1 : -1) * 220}deg`] }) },
                { scale: v.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.2, 1.2, 0.8] }) },
              ],
            }}
          />
        );
      })}
    </View>
  );
}

/** Key-style button that sinks when pressed. */
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
      style={[{ paddingBottom: depth, opacity: disabled ? 0.55 : 1 }, style]}
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
  loading,
  disabled,
  icon,
}: {
  label: string;
  onPress: () => void;
  tone?: 'coral' | 'blue' | 'paper' | 'green';
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const t = {
    coral: { face: C.coral, shadow: C.coralDeep, text: C.cream },
    blue: { face: C.blue, shadow: C.blueDeep, text: '#FFFFFF' },
    paper: { face: C.paper, shadow: C.pinkDeep, text: C.ink },
    green: { face: C.green, shadow: C.greenDeep, text: '#FFFFFF' },
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

/** Number that rolls up from 0 when it mounts. */
function CountUp({
  to,
  decimals = 0,
  suffix = '',
  style,
}: {
  to: number;
  decimals?: number;
  suffix?: string;
  style?: any;
}) {
  const v = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState((0).toFixed(decimals));
  useEffect(() => {
    const id = v.addListener(({ value }) => setShown(value.toFixed(decimals)));
    Animated.timing(v, { toValue: to, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => v.removeListener(id);
  }, [to, decimals, v]);
  return (
    <Text style={style}>
      {shown}
      {suffix}
    </Text>
  );
}

/* ------------------------------------------------------------------ */
/*  Streak flame: gray until activated, then lights up                 */
/* ------------------------------------------------------------------ */
function StreakFlame({
  current,
  target,
  active,
  reduce,
  onPress,
}: {
  current: number;
  target: number;
  active: boolean;
  reduce: boolean;
  onPress: () => void;
}) {
  const lit = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const flick = useBob(reduce, 420);

  useEffect(() => {
    Animated.timing(lit, {
      toValue: active ? 1 : 0,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    if (active && !reduce) {
      pop.setValue(0);
      glow.setValue(0);
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pop, { toValue: 1, duration: 150, useNativeDriver: true }),
          Animated.spring(pop, { toValue: 0, friction: 3, tension: 140, useNativeDriver: true }),
        ]),
        Animated.timing(glow, { toValue: 1, duration: 800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start();
    }
  }, [active, reduce, lit, pop, glow]);

  const label = active
    ? `${current} day streak${target ? `, goal ${target}` : ''}`
    : 'Streak is off. Study to light it up';

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <View>
        <Animated.View
          pointerEvents="none"
          style={[
            s.streakGlow,
            {
              opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
              transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] }) }],
            },
          ]}
        />
        <Animated.View
          style={[
            s.streakChip,
            { transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }] },
          ]}
        >
          <View style={[StyleSheet.absoluteFill, s.streakOff]} />
          <Animated.View style={[StyleSheet.absoluteFill, s.streakOn, { opacity: lit }]} />
          <View style={s.flameBox}>
            <Ionicons name="flame" size={20} color="#B9AEB0" />
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                {
                  opacity: lit,
                  transform: [
                    { scale: flick.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] }) },
                    { rotate: flick.interpolate({ inputRange: [0, 1], outputRange: ['-6deg', '6deg'] }) },
                  ],
                },
              ]}
            >
              <Ionicons name="flame" size={20} color={C.coral} />
            </Animated.View>
          </View>
          <Text style={[s.streakText, !active && { color: '#9A8D90' }]}>
            {active ? `${current} day streak` : 'Streak off'}
          </Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/*  Celebration popup (module finished / course finished)              */
/* ------------------------------------------------------------------ */
function MiniStat({ label, value, bg, fg }: { label: string; value: string; bg: string; fg: string }) {
  return (
    <View style={[s.miniStat, { backgroundColor: bg }]}>
      <Text style={[s.miniStatValue, { color: fg }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[s.miniStatLabel, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function verdict(pct: number) {
  if (pct >= 90) return 'Outstanding work!';
  if (pct >= 80) return 'Great job!';
  if (pct >= 75) return 'Well done!';
  return 'You made it!';
}

function CelebrationPopup({
  item,
  onClose,
  onHome,
  reduce,
}: {
  item: Celebration;
  onClose: () => void;
  onHome: () => void;
  reduce: boolean;
}) {
  const { height } = useWindowDimensions();
  const enter = useRef(new Animated.Value(0)).current;
  const bob = useBob(reduce, 700);
  useEffect(() => {
    Animated.spring(enter, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }).start();
  }, [enter]);

  const mascot = (
    <Animated.View
      style={{
        marginTop: -64,
        transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }],
      }}
    >
      <Image source={require('@/assets/images/mascot.png')} style={{ width: 130, height: 114 }} resizeMode="contain" />
    </Animated.View>
  );

  return (
    <View style={s.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      <Animated.View
        style={[
          s.celebWrap,
          {
            opacity: enter,
            transform: [
              { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
              { rotate: enter.interpolate({ inputRange: [0, 1], outputRange: ['-3deg', '0deg'] }) },
            ],
          },
        ]}
      >
        <View style={s.celebShadow} />
        <View style={s.celebCard}>
          {mascot}
          <ScrollView
            style={{ maxHeight: Math.max(240, height * 0.62), width: '100%' }}
            contentContainerStyle={{ alignItems: 'center', paddingBottom: 4 }}
            showsVerticalScrollIndicator={false}
          >
            {item.type === 'module' ? (
              <>
                <View style={[s.trophy, { backgroundColor: C.blue }]}>
                  <Ionicons name="medal" size={28} color="#FFFFFF" />
                </View>
                <Text style={s.celebTitle}>Module complete!</Text>
                <Text style={s.celebSub}>You finished “{item.moduleTitle}”. Nice work.</Text>

                <View style={s.miniRow}>
                  <MiniStat label="Topics done" value={`${item.topics}`} bg={C.cream} fg={C.ink} />
                  <MiniStat label="Modules" value={`${item.modulesDone}/${item.modulesTotal}`} bg={C.blue} fg="#FFFFFF" />
                  <MiniStat
                    label="Accuracy"
                    value={item.accuracy != null ? `${item.accuracy}%` : '—'}
                    bg={C.pink}
                    fg={C.ink}
                  />
                </View>

                <View style={s.celebBarBox}>
                  <View style={s.celebBarHead}>
                    <Text style={s.celebBarLabel}>Course progress</Text>
                    <Text style={s.celebBarPct}>{item.coursePct}%</Text>
                  </View>
                  <View style={s.celebTrack}>
                    <View style={[s.celebFill, { width: `${item.coursePct}%` }]} />
                  </View>
                </View>

                {item.nextTitle ? (
                  <View style={s.nextRow}>
                    <Ionicons name="arrow-forward-circle" size={20} color={C.coralDeep} />
                    <Text style={s.nextText} numberOfLines={2}>
                      Up next: {item.nextTitle}
                    </Text>
                  </View>
                ) : null}

                <View style={s.celebBtns}>
                  <Btn label="Keep going" tone="coral" icon="rocket" onPress={onClose} />
                </View>
              </>
            ) : (
              <>
                <View style={[s.trophy, { backgroundColor: C.coral }]}>
                  <Ionicons name="trophy" size={28} color={C.cream} />
                </View>
                <Text style={s.celebTitle}>Course complete!</Text>
                <View style={s.courseChipRow}>
                  <View style={s.codeChip}>
                    <Text style={s.codeChipText}>{item.code}</Text>
                  </View>
                  <Text style={s.celebCourse} numberOfLines={2}>
                    {item.title}
                  </Text>
                </View>
                <Text style={s.celebSub}>{verdict(item.stats.accuracy ?? 100)}</Text>

                <View style={s.bigScore}>
                  <CountUp to={item.stats.accuracy ?? 100} suffix="%" style={s.bigScoreValue} />
                  <Text style={s.bigScoreLabel}>
                    {item.stats.accuracy != null ? 'Overall score' : 'Course progress'}
                  </Text>
                </View>

                <View style={[s.miniRow, { flexWrap: 'wrap' }]}>
                  <MiniStat
                    label="Modules"
                    value={`${item.stats.doneModules}/${item.stats.totalModules}`}
                    bg={C.blue}
                    fg="#FFFFFF"
                  />
                  <MiniStat
                    label="Topics"
                    value={`${item.stats.doneTopics}/${item.stats.totalTopics}`}
                    bg={C.cream}
                    fg={C.ink}
                  />
                  <MiniStat label="Quizzes passed" value={`${item.stats.quizzesPassed}`} bg={C.pink} fg={C.ink} />
                  <MiniStat
                    label="Highest score"
                    value={item.stats.best != null ? `${item.stats.best}%` : '—'}
                    bg={C.coral}
                    fg={C.cream}
                  />
                </View>

                {item.stats.lowest && item.stats.scores.length > 1 ? (
                  <View style={s.nextRow}>
                    <Ionicons name="bulb" size={20} color={C.coralDeep} />
                    <Text style={s.nextText} numberOfLines={3}>
                      Room to grow: {item.stats.lowest.title} ({item.stats.lowest.score}%)
                    </Text>
                  </View>
                ) : null}

                <View style={s.celebBtns}>
                  <Btn label="Back to courses" tone="blue" icon="home" onPress={onHome} />
                  <Btn label="Keep reviewing" tone="paper" onPress={onClose} />
                </View>
              </>
            )}
          </ScrollView>
        </View>
        <Burst trigger={1} disabled={reduce} />
      </Animated.View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Reading progress: sticks above the document while scrolling        */
/* ------------------------------------------------------------------ */
function ReadBar({ anim, pct, label }: { anim: Animated.Value; pct: number; label: string }) {
  const done = pct >= 100;
  const w = anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'], extrapolate: 'clamp' });
  return (
    <View style={s.readWrap}>
      <View style={s.readBar}>
        <View style={[s.readIcon, done && { backgroundColor: C.green }]}>
          <Ionicons name={done ? 'checkmark' : 'book'} size={14} color={done ? '#FFFFFF' : C.ink} />
        </View>
        <View style={s.readLabelBox}>
          <Text style={s.readLabel} numberOfLines={1}>
            {done ? 'Reached the end' : label}
          </Text>
        </View>
        <View style={s.readTrackWrap}>
          <View style={s.readTrack}>
            <Animated.View style={[s.readFill, { width: w }, done && { backgroundColor: C.green }]} />
          </View>
          <Animated.View pointerEvents="none" style={[s.readMarker, { left: w }]}>
            <Image source={require('@/assets/images/mascot.png')} style={{ width: 34, height: 30 }} resizeMode="contain" />
          </Animated.View>
        </View>
        <Text style={s.readPct}>{pct}%</Text>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat sticker: pops in once, then squishes + talks when tapped      */
/* ------------------------------------------------------------------ */
function StatSticker({
  label,
  icon,
  accent,
  rot,
  radius = 20,
  delay = 0,
  children,
  onTap,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: typeof ACCENTS[number];
  rot: number;
  radius?: number;
  delay?: number;
  children: React.ReactNode;
  onTap: () => void;
}) {
  const sq = useRef(new Animated.Value(0)).current;
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(enter, { toValue: 1, delay, friction: 5, tension: 90, useNativeDriver: true }).start();
  }, [delay, enter]);
  const tap = () => {
    sq.setValue(0);
    Animated.sequence([
      Animated.timing(sq, { toValue: 1, duration: 90, useNativeDriver: true }),
      Animated.spring(sq, { toValue: 0, friction: 3, tension: 130, useNativeDriver: true }),
    ]).start();
    onTap();
  };
  return (
    <Animated.View
      style={{
        flexGrow: 1,
        flexBasis: 150,
        opacity: enter,
        transform: [
          { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) },
          { rotate: enter.interpolate({ inputRange: [0, 1], outputRange: [`${rot * 6}deg`, `${rot}deg`] }) },
        ],
      }}
    >
      <Animated.View
        style={{
          transform: [
            { scaleX: sq.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) },
            { scaleY: sq.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] }) },
          ],
        }}
      >
        <Chunky face={accent.face} shadow={accent.deep} radius={radius} depth={6} onPress={tap} faceStyle={{ padding: 16 }}>
          <View style={s.statIcon}>
            <Ionicons name={icon} size={16} color={C.ink} />
          </View>
          {children}
          <Text style={[s.statLabel, { color: accent.fg }]}>{label}</Text>
        </Chunky>
      </Animated.View>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/*  Course folder: tab, peeking sheet, colored body, label sticker     */
/* ------------------------------------------------------------------ */
function FolderCard({
  code,
  title,
  instructor,
  schedule,
  accent,
  tilt,
  width,
  featured,
  stat,
  onPress,
}: {
  code: string;
  title: string;
  instructor?: string;
  schedule?: string;
  accent: typeof ACCENTS[number];
  tilt: number;
  width: any;
  featured?: boolean;
  stat?: CourseStats;
  onPress: () => void;
}) {
  const press = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(0)).current;
  const sheetTo = (v: number) =>
    Animated.spring(lift, { toValue: v, friction: 6, tension: 120, useNativeDriver: true }).start();
  const DEPTH = 7;
  const completed = !!stat?.completed;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={() => {
        Animated.timing(press, { toValue: 1, duration: 70, useNativeDriver: true }).start();
        sheetTo(1);
      }}
      onPressOut={() => {
        Animated.spring(press, { toValue: 0, friction: 5, useNativeDriver: true }).start();
        sheetTo(0);
      }}
      {...({ onHoverIn: () => sheetTo(1), onHoverOut: () => sheetTo(0) } as any)}
      style={{ width, paddingBottom: DEPTH, transform: [{ rotate: `${tilt}deg` }] }}
    >
      <View style={[s.folderShadow, { backgroundColor: accent.deep, bottom: 0, top: 36 + DEPTH }]} />
      <Animated.View style={{ transform: [{ translateY: press.interpolate({ inputRange: [0, 1], outputRange: [0, DEPTH] }) }] }}>
        <Animated.View
          pointerEvents="none"
          style={[
            s.folderSheet,
            { transform: [{ translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -9] }) }] },
          ]}
        >
          <View style={s.sheetLine} />
          <View style={[s.sheetLine, { width: '60%' }]} />
        </Animated.View>

        <View style={[s.folderTab, { backgroundColor: accent.face }]}>
          <Ionicons name="folder-open" size={15} color={accent.fg} />
          <Text style={[s.folderTabText, { color: accent.fg }]} numberOfLines={1}>
            {code}
          </Text>
        </View>

        {completed ? (
          <View style={[s.featBadge, { backgroundColor: C.green }]}>
            <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
            <Text style={[s.featBadgeText, { color: '#FFFFFF' }]}>Completed</Text>
          </View>
        ) : featured ? (
          <View style={s.featBadge}>
            <Ionicons name="star" size={13} color={C.ink} />
            <Text style={s.featBadgeText}>Up first</Text>
          </View>
        ) : null}

        <View style={[s.folderBody, { backgroundColor: accent.face }]}>
          <View style={s.folderLabel}>
            <View style={{ flex: 1 }}>
              <Text style={[s.courseTitle, featured && { fontSize: 22, lineHeight: 28 }]} numberOfLines={2}>
                {title}
              </Text>
              <View style={{ gap: 5, marginTop: 8 }}>
                {instructor ? (
                  <View style={s.infoLine}>
                    <Ionicons name="person-outline" size={14} color={C.muted} />
                    <Text style={s.courseMeta} numberOfLines={1}>
                      {instructor}
                    </Text>
                  </View>
                ) : null}
                <View style={s.infoLine}>
                  <Ionicons name="time-outline" size={14} color={C.muted} />
                  <Text style={s.courseMeta} numberOfLines={1}>
                    {schedule || 'Schedule to be announced'}
                  </Text>
                </View>
              </View>

              {stat ? (
                <View style={{ marginTop: 12 }}>
                  <View style={s.cardProgressRow}>
                    <View style={s.cardTrack}>
                      <View
                        style={[
                          s.cardFill,
                          { width: `${stat.pct}%` },
                          completed && { backgroundColor: C.green },
                        ]}
                      />
                    </View>
                    <Text style={s.cardPct}>{stat.pct}%</Text>
                  </View>
                  <Text style={s.cardSub} numberOfLines={1}>
                    {stat.doneTopics}/{stat.totalTopics} topics · {stat.doneModules}/{stat.totalModules} modules
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={[s.courseGo, completed && { backgroundColor: C.green }]}>
              <Ionicons name={completed ? 'checkmark' : 'arrow-forward'} size={20} color={completed ? '#FFFFFF' : C.ink} />
            </View>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen                                                             */
/* ------------------------------------------------------------------ */
export default function DashboardScreen() {
  const { fetchDashboard, user, token, isLoading: authLoading } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const [fontsLoaded] = useFonts({ Outfit_400Regular, Outfit_500Medium, Outfit_700Bold, TitanOne_400Regular });

  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => {});
  }, []);

  // Role gate
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login' as any);
      return;
    }
    if (user.role !== 'student') {
      if (user.role === 'program chair' || user.role === 'program_chair' || user.role === 'admin') {
        router.replace('/chair/dashboard' as any);
      } else {
        router.replace('/faculty/dashboard' as any);
      }
    }
  }, [authLoading, user]);

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Course viewer state
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [subjectDetails, setSubjectDetails] = useState<StudentSubjectDetails | null>(null);
  const [loadingSubject, setLoadingSubject] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [workspaceTab, setWorkspaceTab] = useState<'text' | 'presentation' | 'summary'>('text');
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [markingReviewed, setMarkingReviewed] = useState(false);
  const [mobileCurriculumOpen, setMobileCurriculumOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [burst, setBurst] = useState(0);

  // Real progress across every course (computed from topic data, not hardcoded)
  const [courseStats, setCourseStats] = useState<Record<string, CourseStats>>({});
  const [statsReady, setStatsReady] = useState(false);
  // Queue of congratulation popups (module finished / course finished)
  const [queue, setQueue] = useState<Celebration[]>([]);
  const celebratedRef = useRef<{ id: string | null; modules: Set<string>; course: boolean }>({
    id: null,
    modules: new Set(),
    course: false,
  });
  const [avatarFailed, setAvatarFailed] = useState(false);

  // Mascot
  const bob = useBob(reduce);
  const jump = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const { anim: bubbleAnim, text: bubbleText, say } = useBubble();
  const pokeIdx = useRef(0);

  const hop = () =>
    Animated.sequence([
      Animated.timing(jump, { toValue: -26, duration: 170, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(jump, { toValue: 0, friction: 3, tension: 110, useNativeDriver: true }),
    ]).start();

  // Reading progress (how far through the document the learner has scrolled)
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const readAnim = useRef(new Animated.Value(0)).current;
  const [readPct, setReadPct] = useState(0);
  const viewport = useRef({ y: 0, h: 0 });
  const docBox = useRef({ y: 0, h: 0 });
  const userScrolled = useRef(false);
  const reachedEnd = useRef(false);

  const recalcRead = () => {
    const { y: off, h: vh } = viewport.current;
    const { y: dy, h: dh } = docBox.current;
    if (!dh || !vh) return;
    const p = Math.max(0, Math.min(100, ((off + vh - dy) / dh) * 100));
    readAnim.setValue(p);
    const r = Math.round(p);
    setReadPct((prev) => (prev === r ? prev : r));
  };

  const onMainScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement } = e.nativeEvent;
    viewport.current = { y: contentOffset.y, h: layoutMeasurement.height };
    if (contentOffset.y > 20) userScrolled.current = true;
    recalcRead();
  };

  useEffect(() => {
    if (!authLoading) loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    const result = await fetchDashboard();
    if (result.success && result.data) setData(result.data);
    else setError(result.message || 'Failed to load your courses');
    setLoading(false);
  };

  /* ---------- derived dashboard values ---------- */
  const academics = data?.academics;
  const profile = data?.profile;
  const subjects = (academics?.enrolledSubjects ?? []).filter(Boolean);
  const keyOf = (sub: { id?: any; code: string }) => String(sub.id || sub.code);

  const totalSubjects = subjects.length || academics?.totalSubjects || 0;
  const completedCount = statsReady
    ? subjects.filter((sub) => courseStats[keyOf(sub)]?.completed).length
    : academics?.completedSubjects ?? 0;
  const pct = totalSubjects ? Math.min(Math.round((completedCount / totalSubjects) * 100), 100) : 0;

  const allScores = Object.values(courseStats).flatMap((c) => c.scores);
  const accuracy = avg(allScores);

  const streaks = Object.values(courseStats)
    .map((c) => c.streak)
    .filter(Boolean) as { current: number; target: number; unlocked: boolean }[];
  const bestStreak = streaks.reduce(
    (best, cur) => (cur.current > best.current ? cur : best),
    { current: 0, target: streaks[0]?.target ?? 0, unlocked: false }
  );
  const streakActive = bestStreak.current > 0;

  // Fetch every enrolled course once so progress, accuracy and streak are real
  useEffect(() => {
    if (!data || !token) return;
    const list = (data.academics?.enrolledSubjects ?? []).filter(Boolean);
    let alive = true;
    Promise.all(
      list.map(async (sub) => {
        const key = String(sub.id || sub.code);
        try {
          const res = await studentApi.getSubjectDetails(token, key);
          if (res.success && res.data) return [key, computeStats(res.data)] as const;
        } catch {
          // ignore: this course just keeps its fallback numbers
        }
        return null;
      })
    ).then((entries) => {
      if (!alive) return;
      setCourseStats((prev) => {
        const next = { ...prev };
        entries.forEach((e) => {
          if (e) next[e[0]] = e[1];
        });
        return next;
      });
      setStatsReady(list.length === 0 || entries.some(Boolean));
    });
    return () => {
      alive = false;
    };
  }, [data, token]);

  // Greet once data arrives
  useEffect(() => {
    if (!data) return;
    const t = setTimeout(() => say(`${greeting()}! Ready to study?`), 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Walk the trail mascot to the spot that matches subjects done
  useEffect(() => {
    if (!data) return;
    Animated.timing(progressAnim, {
      toValue: pct,
      duration: 1100,
      delay: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [data, pct, progressAnim]);

  const handleOpenCourse = async (subjectId: string) => {
    celebratedRef.current = { id: null, modules: new Set(), course: false };
    setQueue([]);
    setActiveSubjectId(subjectId);
    setLoadingSubject(true);
    const res = await studentApi.getSubjectDetails(token, subjectId);
    setLoadingSubject(false);
    if (res.success && res.data) {
      setSubjectDetails(res.data);
      const firstMod = res.data.modules[0];
      if (firstMod) {
        setActiveModuleId(firstMod.id);
        const firstTopic = firstMod.topics[0];
        if (firstTopic) setActiveTopicId(firstTopic.id);
      }
      setWorkspaceTab('text');
    } else {
      Alert.alert('Course unavailable', res.message || 'Could not load this course.');
      setActiveSubjectId(null);
    }
  };

  const reloadSubjectDetails = async () => {
    if (!activeSubjectId) return;
    const res = await studentApi.getSubjectDetails(token, activeSubjectId);
    if (res.success && res.data) setSubjectDetails(res.data);
  };

  const leaveCourse = () => {
    setActiveSubjectId(null);
    setSubjectDetails(null);
    setQueue([]);
  };

  const activeModule =
    subjectDetails?.modules.find((m) => m.id === activeModuleId) || subjectDetails?.modules[0] || null;
  const activeTopic =
    activeModule?.topics.find((t) => t.id === activeTopicId) || activeModule?.topics[0] || null;

  // Keep stats fresh and detect newly finished modules / courses
  useEffect(() => {
    if (!subjectDetails || !activeSubjectId) return;
    const st = computeStats(subjectDetails);
    setCourseStats((prev) => ({ ...prev, [activeSubjectId]: st }));

    const doneMods = new Set(subjectDetails.modules.filter(isModuleDone).map((m) => m.id));
    const ref = celebratedRef.current;
    if (ref.id !== activeSubjectId) {
      // first load of this course: just remember where things stand
      celebratedRef.current = { id: activeSubjectId, modules: doneMods, course: st.completed };
      return;
    }

    const freshModules = subjectDetails.modules.filter((m) => doneMods.has(m.id) && !ref.modules.has(m.id));
    const newCourse = st.completed && !ref.course;
    celebratedRef.current = { id: activeSubjectId, modules: doneMods, course: st.completed };

    const items: Celebration[] = [];
    if (newCourse) {
      items.push({ type: 'course', code: subjectCode(subjectDetails), title: subjectName(subjectDetails), stats: st });
    } else {
      freshModules.forEach((m) => {
        const mScores = m.topics
          .filter((t) => t.quizPassed && typeof t.bestScorePercent === 'number')
          .map((t) => t.bestScorePercent as number);
        const next = subjectDetails.modules.find((x) => !doneMods.has(x.id));
        items.push({
          type: 'module',
          moduleTitle: m.title,
          topics: m.topics.length,
          accuracy: avg(mScores),
          modulesDone: st.doneModules,
          modulesTotal: st.totalModules,
          coursePct: st.pct,
          nextTitle: next?.title,
        });
      });
    }
    if (items.length) setQueue((q) => [...q, ...items]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectDetails]);

  // Reset reading progress whenever the learner switches topic or tab
  useEffect(() => {
    viewport.current = { ...viewport.current, y: 0 };
    userScrolled.current = false;
    reachedEnd.current = false;
    readAnim.setValue(0);
    setReadPct(0);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    const t = setTimeout(recalcRead, 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTopic?.id, workspaceTab]);

  // Small celebration the first time they reach the end of a document
  useEffect(() => {
    if (readPct >= 100 && userScrolled.current && !reachedEnd.current && activeTopic) {
      reachedEnd.current = true;
      hop();
      say('You made it to the end!', 2400);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readPct]);

  const handleProceedToNextTopic = async () => {
    if (!subjectDetails || !activeTopic) {
      setShowQuizModal(false);
      return;
    }
    const topics = subjectDetails.modules.flatMap((m) => m.topics);
    const i = topics.findIndex((t) => t.id === activeTopic.id);
    const next = i >= 0 ? topics[i + 1] : undefined;
    setShowQuizModal(false);
    if (next) {
      const nextMod = subjectDetails.modules.find((m) => m.topics.some((t) => t.id === next.id));
      if (nextMod) {
        setActiveModuleId(nextMod.id);
        setActiveTopicId(next.id);
        setWorkspaceTab('text');
      }
    }
    await reloadSubjectDetails();
  };

  const handleMarkReviewed = async () => {
    if (!activeSubjectId || !activeTopic) return;
    setMarkingReviewed(true);
    const res = await studentApi.markTopicReviewed(token, activeSubjectId, activeTopic.id);
    if (res.success) {
      await reloadSubjectDetails();
      hop();
      setBurst((b) => b + 1);
      say('Quiz unlocked. You got this!', 3000);
    } else {
      Alert.alert('Error', res.message || 'Could not update review status.');
    }
    setMarkingReviewed(false);
  };

  const handleQuizSubmit = async (answers: Record<string, string>) => {
    if (!activeSubjectId || !activeTopic) return { success: false };
    const res = await studentApi.submitQuiz(token, activeSubjectId, activeTopic.id, answers);
    if (res.success) {
      await reloadSubjectDetails();
      hop();
      setBurst((b) => b + 1);
    }
    return res;
  };

  const pokeGate = () => {
    hop();
    const lines = ['Boop!', 'Almost there.', 'Take your time.', 'Tiny steps count.'];
    say(lines[pokeIdx.current++ % lines.length], 2000);
  };

  /* ---------------- loading / error ---------------- */
  if (!fontsLoaded || authLoading || loading) {
    return <PageLoading title="Packing your books…" subtitle="Getting your courses ready" />;
  }

  if (error) {
    return (
      <View style={s.centered}>
        <Image source={require('@/assets/images/mascot.png')} style={{ width: 170, height: 150 }} resizeMode="contain" />
        <Text style={s.centeredTitle}>Couldn’t load your courses</Text>
        <Text style={[s.centeredSub, { marginBottom: 20 }]}>{error}</Text>
        <Btn label="Try again" icon="refresh" onPress={loadDashboard} />
      </View>
    );
  }

  /* ================================================================ */
  /*  COURSE VIEWER                                                    */
  /* ================================================================ */
  if (activeSubjectId && subjectDetails) {
    const hasQuiz = activeTopic?.quiz && (activeTopic.quiz.questions?.length || 0) > 0;
    const viewStats = computeStats(subjectDetails);
    const tabs: { key: typeof workspaceTab; label: string; icon: keyof typeof Ionicons.glyphMap; reading: string }[] = [
      { key: 'text', label: 'Read', icon: 'book-outline', reading: 'Reading' },
      { key: 'presentation', label: 'Slides', icon: 'easel-outline', reading: 'Viewing slides' },
      { key: 'summary', label: 'Recap', icon: 'sparkles-outline', reading: 'Reading recap' },
    ];
    const readingLabel = tabs.find((t) => t.key === workspaceTab)?.reading || 'Reading';
    const masteryLine = activeTopic?.quizPassed
      ? 'Passed! The next lesson is open.'
      : activeTopic?.contentReviewed
      ? `Review done. Score ${activeTopic.quiz?.passingScorePercent || 75}% or higher on the quiz to move on.`
      : 'Read the text and slides, then tap “I’ve reviewed this” to unlock the quiz.';

    // wait for the quiz dialog to close before showing a popup
    const celebration = !showQuizModal ? queue[0] : undefined;

    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <SafeAreaView style={s.safe} edges={['top']}>
          {/* Top bar */}
          <View style={[s.topBar, !isDesktop && { flexWrap: 'wrap', gap: 10 }]}>
            <View style={s.topLeft}>
              <Chunky
                face={C.paper}
                shadow={C.pinkDeep}
                radius={12}
                depth={4}
                onPress={leaveCourse}
                faceStyle={{ paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <Ionicons name="chevron-back" size={16} color={C.ink} />
                <Text style={s.smallBtnText}>Courses</Text>
              </Chunky>
              {!isDesktop && (
                <Chunky
                  face={mobileCurriculumOpen ? C.coral : C.cream}
                  shadow={mobileCurriculumOpen ? C.coralDeep : '#E8D77A'}
                  radius={12}
                  depth={4}
                  onPress={() => setMobileCurriculumOpen((p) => !p)}
                  faceStyle={{ paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                >
                  <Ionicons name={mobileCurriculumOpen ? 'close' : 'list'} size={16} color={C.ink} />
                  <Text style={s.smallBtnText}>{mobileCurriculumOpen ? 'Close' : 'Modules'}</Text>
                </Chunky>
              )}
              <View style={s.codeChip}>
                <Text style={s.codeChipText}>{subjectCode(subjectDetails)}</Text>
              </View>
              <Text style={s.topTitle} numberOfLines={1}>
                {subjectName(subjectDetails)}
              </Text>
            </View>

            <View style={[s.topProgress, !isDesktop && { width: '100%', marginLeft: 0 }]}>
              <View style={{ flex: 1 }}>
                <View style={s.trackOuter}>
                  <View style={[s.trackInner, { width: `${viewStats.pct}%` }, viewStats.completed && { backgroundColor: C.green }]} />
                </View>
                <Text style={s.topSub} numberOfLines={1}>
                  {viewStats.doneTopics}/{viewStats.totalTopics} topics · {viewStats.doneModules}/{viewStats.totalModules} modules
                </Text>
              </View>
              <Text style={s.topPct}>{viewStats.pct}%</Text>
            </View>
          </View>

          <View style={[s.workspace, !isDesktop && { flexDirection: 'column' }]}>
            {/* Curriculum */}
            {(isDesktop || mobileCurriculumOpen || !activeTopic) && (
              <View style={[s.sidebar, !isDesktop && { width: '100%', maxHeight: mobileCurriculumOpen ? 360 : '100%' }]}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 14, gap: 12 }}>
                  {subjectDetails.modules.map((mod, mi) => {
                    const a = ACCENTS[mi % ACCENTS.length];
                    const isOpen = !collapsed[mod.id];
                    const doneCount = mod.topics.filter(isTopicDone).length;
                    const modComplete = isModuleDone(mod);
                    const modPct = mod.topics.length ? (doneCount / mod.topics.length) * 100 : 0;
                    return (
                      <View key={mod.id} style={s.modBlock}>
                        <Pressable
                          onPress={() => setCollapsed((c) => ({ ...c, [mod.id]: isOpen }))}
                          style={[s.modHead, { backgroundColor: a.face }]}
                        >
                          <View style={[s.modNum, modComplete && { backgroundColor: C.green }]}>
                            {modComplete ? (
                              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                            ) : (
                              <Text style={s.modNumText}>{mi + 1}</Text>
                            )}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[s.modTitle, { color: a.fg }]} numberOfLines={2}>
                              {mod.title}
                            </Text>
                            <Text style={[s.modCount, { color: a.fg }]}>
                              {modComplete ? 'Module complete' : `${doneCount} of ${mod.topics.length} done`}
                            </Text>
                            <View style={s.modBar}>
                              <View style={[s.modBarFill, { width: `${modPct}%` }]} />
                            </View>
                          </View>
                          <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={a.fg} />
                        </Pressable>

                        {isOpen &&
                          mod.topics.map((top, ti) => {
                            const isActive = activeTopic?.id === top.id;
                            const isLocked = !top.unlocked;
                            const isDone = isTopicDone(top);
                            const first = ti === 0;
                            const last = ti === mod.topics.length - 1;
                            return (
                              <Pressable
                                key={top.id}
                                disabled={isLocked}
                                onPress={() => {
                                  setActiveModuleId(mod.id);
                                  setActiveTopicId(top.id);
                                  setWorkspaceTab('text');
                                  if (!isDesktop) setMobileCurriculumOpen(false);
                                }}
                                style={[
                                  s.topicRow,
                                  isActive && s.topicRowActive,
                                  isLocked && { opacity: 0.55 },
                                ]}
                              >
                                <View
                                  pointerEvents="none"
                                  style={[
                                    s.topicLine,
                                    first && { top: '50%' },
                                    last && { bottom: '50%' },
                                    first && last && { opacity: 0 },
                                  ]}
                                />
                                <View
                                  style={[
                                    s.topicBadge,
                                    isDone && { backgroundColor: C.green },
                                    isLocked && { backgroundColor: C.pink },
                                    isActive && !isDone && !isLocked && { backgroundColor: C.coral },
                                  ]}
                                >
                                  <Ionicons
                                    name={isDone ? 'checkmark' : isLocked ? 'lock-closed' : 'play'}
                                    size={12}
                                    color={isDone || (isActive && !isLocked) ? '#FFFFFF' : C.ink}
                                  />
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={[s.topicTitle, isActive && { fontFamily: F.bold }]} numberOfLines={2}>
                                    {top.title}
                                  </Text>
                                  <Text style={s.topicMeta}>
                                    {isDone
                                      ? top.quizPassed
                                        ? `Passed with ${top.bestScorePercent}%`
                                        : 'Completed'
                                      : isLocked
                                      ? 'Finish the previous topic first'
                                      : top.contentReviewed
                                      ? 'Quiz is ready'
                                      : 'Not started'}
                                  </Text>
                                </View>
                              </Pressable>
                            );
                          })}
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Main */}
            <View style={{ flex: 1 }}>
              {activeTopic ? (
                <>
                  <ReadBar anim={readAnim} pct={readPct} label={readingLabel} />

                  <ScrollView
                    ref={scrollRef}
                    contentContainerStyle={s.mainBody}
                    showsVerticalScrollIndicator={false}
                    scrollEventThrottle={16}
                    onScroll={onMainScroll}
                    onLayout={(e) => {
                      viewport.current = { ...viewport.current, h: e.nativeEvent.layout.height };
                      recalcRead();
                    }}
                  >
                    {subjectDetails?.streak ? (
                      <StreakBadge
                        current={subjectDetails.streak.current}
                        target={subjectDetails.streak.target}
                        unlocked={subjectDetails.streak.unlocked}
                      />
                    ) : null}

                    {/* Document */}
                    <View
                      style={s.contentCard}
                      onLayout={(e) => {
                        docBox.current = { y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height };
                        recalcRead();
                      }}
                    >
                      {workspaceTab === 'text' &&
                        (activeTopic.content?.richText ? (
                          <Text style={s.prose}>{activeTopic.content.richText.replace(/<[^>]+>/g, '')}</Text>
                        ) : (
                          <Empty icon="document-text-outline" text="No reading for this topic yet." />
                        ))}

                      {workspaceTab === 'presentation' &&
                        (activeTopic.content?.presentationUrl ? (
                          <PresentationViewer
                            url={activeTopic.content.presentationUrl}
                            fileName={activeTopic.content.presentationFileName || `${activeTopic.title}.pptx`}
                            fileSize={activeTopic.content.presentationFileSize}
                            s3Key={activeTopic.content.presentationS3Key}
                            minHeight={680}
                          />
                        ) : (
                          <Empty icon="easel-outline" text="No slide deck attached to this topic." />
                        ))}

                      {workspaceTab === 'summary' && (
                        <>
                          {activeTopic.content?.summaryText ? (
                            <View style={{ marginBottom: 18 }}>
                              <Text style={s.blockTitle}>The short version</Text>
                              <Text style={s.prose}>{activeTopic.content.summaryText}</Text>
                            </View>
                          ) : null}
                          {activeTopic.content?.summaryBullets?.length ? (
                            <View>
                              <Text style={s.blockTitle}>Remember these</Text>
                              {activeTopic.content.summaryBullets.map((b, i) => (
                                <View key={i} style={[s.bulletRow, { transform: [{ rotate: i % 2 ? '0.4deg' : '-0.4deg' }] }]}>
                                  <View style={[s.bulletBadge, { backgroundColor: ACCENTS[i % ACCENTS.length].face }]}>
                                    <Text style={s.bulletNum}>{i + 1}</Text>
                                  </View>
                                  <Text style={s.bulletText}>{b}</Text>
                                </View>
                              ))}
                            </View>
                          ) : null}
                          {!activeTopic.content?.summaryText && !activeTopic.content?.summaryBullets?.length && (
                            <Empty icon="sparkles-outline" text="No recap for this topic yet." />
                          )}
                        </>
                      )}
                    </View>

                    {/* Where am I + switch view (now sits under the document) */}
                    <View style={s.dock}>
                      <View style={s.dockInfo}>
                        <View style={s.dockPin}>
                          <Ionicons name="bookmark" size={16} color={C.ink} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.crumb} numberOfLines={1}>
                            {activeModule?.title}
                          </Text>
                          <Text style={s.dockTitle} numberOfLines={2}>
                            {activeTopic.title}
                          </Text>
                        </View>
                      </View>
                      <View style={s.tabRow}>
                        {tabs.map((t) => (
                          <Chunky
                            key={t.key}
                            held={workspaceTab === t.key}
                            face={workspaceTab === t.key ? C.blue : C.paper}
                            shadow={workspaceTab === t.key ? C.blueDeep : C.pinkDeep}
                            radius={14}
                            depth={5}
                            onPress={() => setWorkspaceTab(t.key)}
                            faceStyle={{ paddingHorizontal: 14, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                          >
                            <Ionicons name={t.icon} size={16} color={workspaceTab === t.key ? '#FFFFFF' : C.ink} />
                            <Text style={[s.tabText, workspaceTab === t.key && { color: '#FFFFFF' }]}>{t.label}</Text>
                          </Chunky>
                        ))}
                      </View>
                    </View>

                    {/* Mastery gate: short, centered */}
                    <View style={s.gate}>
                      <Burst trigger={burst} disabled={reduce} />
                      <Bubble
                        center
                        text={bubbleText}
                        anim={bubbleAnim}
                        style={{ position: 'absolute', top: -30, alignSelf: 'center', zIndex: 5 }}
                      />
                      <Pressable onPress={pokeGate} accessibilityLabel="Mascot">
                        <Animated.View style={{ transform: [{ translateY: jump }] }}>
                          <Image source={require('@/assets/images/mascot.png')} style={s.gateMascot} resizeMode="contain" />
                        </Animated.View>
                      </Pressable>
                      <Text style={s.gateTitle}>
                        {activeTopic.quizPassed ? 'Topic cleared' : activeTopic.contentReviewed ? 'Quiz unlocked' : 'Quiz locked'}
                      </Text>
                      <Text style={s.gateDesc}>{masteryLine}</Text>
                      <View style={s.gateBtns}>
                        {!activeTopic.contentReviewed && (
                          <Btn
                            label="I’ve reviewed this"
                            tone="paper"
                            icon="checkmark-done"
                            loading={markingReviewed}
                            onPress={handleMarkReviewed}
                          />
                        )}
                        {hasQuiz && activeTopic.contentReviewed && (
                          <Btn
                            label={activeTopic.quizPassed ? 'Quiz passed' : 'Take the quiz'}
                            tone={activeTopic.quizPassed ? 'green' : 'blue'}
                            icon={activeTopic.quizPassed ? 'trophy' : 'flash'}
                            disabled={activeTopic.quizPassed}
                            onPress={() => setShowQuizModal(true)}
                          />
                        )}
                      </View>
                    </View>
                  </ScrollView>
                </>
              ) : (
                <View style={s.centered}>
                  <Text style={s.centeredTitle}>Pick a topic</Text>
                  <Text style={s.centeredSub}>Choose an unlocked topic from the list to start.</Text>
                </View>
              )}
            </View>
          </View>

          {activeTopic?.quiz && (
            <WaygroundStudentQuizModal
              visible={showQuizModal}
              quiz={activeTopic.quiz}
              topicTitle={activeTopic.title}
              onClose={() => setShowQuizModal(false)}
              onSubmit={handleQuizSubmit}
              onReviewContent={() => setWorkspaceTab('text')}
              onProceedToNextTopic={handleProceedToNextTopic}
            />
          )}
        </SafeAreaView>

        {celebration ? (
          <CelebrationPopup
            key={`${queue.length}-${celebration.type}`}
            item={celebration}
            reduce={reduce}
            onClose={() => setQueue((q) => q.slice(1))}
            onHome={leaveCourse}
          />
        ) : null}
      </View>
    );
  }

  /* ================================================================ */
  /*  DASHBOARD HOME                                                   */
  /* ================================================================ */
  const initials = (profile?.firstName?.[0] ?? '') + (profile?.lastName?.[0] ?? '');
  const avatarUri: string | undefined = (user as any)?.avatar || (profile as any)?.avatar || undefined;
  const pokeLines = ['Boop!', 'Tap a course to dive in.', 'Snacks first, then study.', 'I believe in you.'];
  const pokeMascot = () => {
    hop();
    say(pokeLines[pokeIdx.current++ % pokeLines.length]);
  };

  // in-progress courses first, finished ones after
  const orderedSubjects = [...subjects].sort(
    (a, b) => Number(!!courseStats[keyOf(a)]?.completed) - Number(!!courseStats[keyOf(b)]?.completed)
  );

  const meta = [
    { icon: 'id-card-outline' as const, label: 'TUPT ID', text: (user as any)?.tuptId || profile?.studentId, c: C.cream },
    { icon: 'school-outline' as const, label: 'Year level', text: user?.yearLevel, c: C.pink },
    { icon: 'calendar-outline' as const, label: 'Semester', text: academics?.semester, c: C.cream },
    { icon: 'time-outline' as const, label: 'School year', text: academics?.academicYear ? `SY ${academics.academicYear}` : null, c: C.pink },
  ].filter((m) => m.text);

  const showTicks = totalSubjects > 1 && totalSubjects <= 12;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View pointerEvents="none" style={s.blobCoral} />
        <View pointerEvents="none" style={s.blobBlue} />

        <View style={s.container}>
          {/* ROW 1: hello card (left) + progress trail (right) */}
          <View style={[s.heroRow, isDesktop && { flexDirection: 'row' }]}>
            <View style={[{ flexGrow: 1 }, isDesktop && { flex: 1.6 }]}>
              <Pressable onPress={pokeMascot} style={s.mascotWrap} accessibilityLabel="Mascot">
                <Animated.Image
                  source={require('@/assets/images/mascot.png')}
                  resizeMode="contain"
                  style={{
                    width: 170,
                    height: 150,
                    transform: [
                      { translateY: Animated.add(jump, bob.interpolate({ inputRange: [0, 1], outputRange: [0, -6] })) },
                      { rotate: bob.interpolate({ inputRange: [0, 1], outputRange: ['-2deg', '2deg'] }) },
                    ],
                  }}
                />
              </Pressable>
              <Bubble text={bubbleText} anim={bubbleAnim} style={{ position: 'absolute', top: -60, right: 170, zIndex: 5 }} />

              <View style={[s.helloWrap, { flexGrow: 1 }]}>
                <View style={s.helloShadow} />
                <View style={[s.hello, { flexGrow: 1, justifyContent: 'space-between', gap: 26 }]}>
                  <View style={s.helloTop}>
                    <View style={s.avatarBig}>
                      {avatarUri && !avatarFailed ? (
                        <Image source={{ uri: avatarUri }} style={s.avatarBigImg} onError={() => setAvatarFailed(true)} />
                      ) : (
                        <Text style={s.avatarBigText}>{initials}</Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={s.greetRow}>
                        <Text style={s.helloSmall}>{greeting()},</Text>
                        <StreakFlame
                          current={bestStreak.current}
                          target={bestStreak.target}
                          active={streakActive}
                          reduce={reduce}
                          onPress={() =>
                            say(
                              streakActive
                                ? `${bestStreak.current} day streak. Keep it going!`
                                : 'Study today to light up your streak.'
                            )
                          }
                        />
                      </View>
                      <Text style={[s.helloName, isDesktop && { fontSize: 44, lineHeight: 48 }]} numberOfLines={2}>
                        {profile?.firstName} {profile?.lastName}
                      </Text>
                    </View>
                  </View>

                  <View style={s.infoGrid}>
                    {meta.map((m, i) => (
                      <View
                        key={m.label}
                        style={[s.infoTile, { backgroundColor: m.c, transform: [{ rotate: i % 2 ? '1.2deg' : '-1.2deg' }] }]}
                      >
                        <View style={s.infoIcon}>
                          <Ionicons name={m.icon} size={15} color={C.ink} />
                        </View>
                        <Text style={s.infoLabel}>{m.label}</Text>
                        <Text style={s.infoValue} numberOfLines={1}>
                          {m.text}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            <View style={[s.window, isDesktop && { flex: 1 }]}>
              <View style={s.windowBar}>
                <View style={s.dot} />
                <View style={s.dot} />
                <View style={s.dot} />
                <Text style={s.windowTitle}>Progress trail</Text>
              </View>
              <View style={{ padding: 20, flexGrow: 1 }}>
                <Text style={s.trailBig}>
                  {completedCount}
                  <Text style={s.trailBigSub}> of {totalSubjects} subjects done</Text>
                </Text>

                <View style={s.trailTrackWrap}>
                  <View style={s.trailTrack}>
                    <Animated.View
                      style={[s.trailFill, { width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]}
                    />
                  </View>
                  {showTicks &&
                    Array.from({ length: totalSubjects - 1 }, (_, i) => (
                      <View
                        key={i}
                        pointerEvents="none"
                        style={[
                          s.trailTick,
                          { left: `${((i + 1) / totalSubjects) * 100}%` },
                          completedCount >= i + 1 && { backgroundColor: C.green },
                        ]}
                      />
                    ))}
                  {/* outer view moves with progress, inner view does the walking bob */}
                  <Animated.View
                    pointerEvents="none"
                    style={[s.trailMarker, { left: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]}
                  >
                    <Animated.View
                      style={{
                        transform: [
                          { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) },
                          { rotate: bob.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '4deg'] }) },
                        ],
                      }}
                    >
                      <Image source={require('@/assets/images/mascot.png')} style={{ width: 52, height: 46 }} resizeMode="contain" />
                    </Animated.View>
                  </Animated.View>
                </View>

                <View style={s.trailEnds}>
                  <Text style={s.trailEndText}>Start</Text>
                  <Text style={s.trailEndText}>{pct}%</Text>
                  <Text style={s.trailEndText}>Finish</Text>
                </View>

                <View style={s.notice}>
                  <Ionicons name="bulb-outline" size={20} color={C.ink} />
                  <Text style={s.noticeText}>
                    {totalSubjects > 0 && completedCount >= totalSubjects
                      ? 'Every subject is done. Time to celebrate.'
                      : subjects.length
                      ? 'Open a course and clear one topic today.'
                      : 'Your progress will build up here.'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* ROW 2: four stat stickers, each a different shape */}
          <View style={s.statRow}>
            <StatSticker
              label="Accuracy"
              icon="analytics"
              accent={ACCENTS[2]}
              rot={-2}
              radius={32}
              delay={0}
              onTap={() =>
                say(
                  accuracy != null
                    ? `Your passed quizzes average ${accuracy}%.`
                    : 'Pass a quiz to see your accuracy.'
                )
              }
            >
              {accuracy != null ? (
                <CountUp to={accuracy} suffix="%" style={[s.statValue, { color: C.ink }]} />
              ) : (
                <Text style={[s.statValue, { color: C.ink }]}>—</Text>
              )}
            </StatSticker>
            <StatSticker
              label="Enrolled"
              icon="library"
              accent={ACCENTS[0]}
              rot={1.5}
              radius={10}
              delay={90}
              onTap={() => say(`${totalSubjects} subjects this term.`)}
            >
              <CountUp to={totalSubjects} style={[s.statValue, { color: '#FFFFFF' }]} />
            </StatSticker>
            <StatSticker
              label="Completed"
              icon="checkmark-done"
              accent={ACCENTS[3]}
              rot={-1.5}
              radius={26}
              delay={180}
              onTap={() => say(pct === 100 ? 'All done. Wow!' : `${pct}% of the way there.`)}
            >
              <CountUp to={completedCount} style={[s.statValue, { color: C.ink }]} />
            </StatSticker>
            <StatSticker
              label="Standing"
              icon="shield-checkmark"
              accent={ACCENTS[1]}
              rot={2}
              radius={14}
              delay={270}
              onTap={() => say('Keep it up!')}
            >
              <Text style={[s.statValue, { color: C.cream, fontSize: 22, lineHeight: 30 }]} numberOfLines={1}>
                {academics?.standing || '—'}
              </Text>
            </StatSticker>
          </View>

          {/* ROW 3: courses (first one is the big one) */}
          <View style={s.sectionHead}>
            <Text style={s.h2}>Your courses</Text>
            <View style={s.countPill}>
              <Text style={s.countPillText}>{subjects.length}</Text>
            </View>
            {completedCount > 0 ? (
              <View style={[s.countPill, { backgroundColor: C.green }]}>
                <Text style={s.countPillText}>{completedCount} completed</Text>
              </View>
            ) : null}
          </View>

          {loadingSubject && (
            <View style={s.loadingRow}>
              <ActivityIndicator color={C.coral} />
              <Text style={s.loadingRowText}>Opening your course…</Text>
            </View>
          )}

          {orderedSubjects.length > 0 ? (
            <View style={s.grid}>
              {orderedSubjects.map((subject, i) => {
                const stat = courseStats[keyOf(subject)];
                return (
                  <FolderCard
                    key={subject.code || subject.id || `subject-${i}`}
                    code={subject.code}
                    title={subject.title}
                    instructor={subject.instructor}
                    schedule={subject.schedule}
                    accent={ACCENTS[i % ACCENTS.length]}
                    tilt={i % 2 ? 0.4 : -0.4}
                    featured={i === 0 && orderedSubjects.length > 1 && !stat?.completed}
                    stat={stat}
                    width={isDesktop && i !== 0 ? '48.5%' : '100%'}
                    onPress={() => handleOpenCourse(subject.id || subject.code)}
                  />
                );
              })}
            </View>
          ) : (
            <View style={s.emptyBox}>
              <Image source={require('@/assets/images/mascot.png')} style={{ width: 120, height: 100 }} resizeMode="contain" />
              <Text style={s.emptyTitle}>No courses yet</Text>
              <Text style={s.emptyText}>Ask your program chair to enroll you and your subjects will appear here.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Empty({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={{ alignItems: 'center', padding: 30 }}>
      <View style={s.emptyIcon}>
        <Ionicons name={icon} size={26} color={C.ink} />
      </View>
      <Text style={s.emptyText}>{text}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 60 },
  container: { width: '100%', maxWidth: 1100, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 12 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg, padding: 32 },
  centeredTitle: { fontFamily: F.display, fontSize: 26, color: C.ink, textAlign: 'center' },
  centeredSub: { fontFamily: F.medium, fontSize: 15, color: C.muted, marginTop: 6, textAlign: 'center' },

  blobCoral: { position: 'absolute', width: 300, height: 300, borderRadius: 999, top: -120, right: -110, backgroundColor: C.coral },
  blobBlue: { position: 'absolute', width: 200, height: 200, borderRadius: 999, top: 420, left: -110, backgroundColor: C.blue, opacity: 0.9 },

  // bubble
  bubble: {
    maxWidth: 240,
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: C.ink,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  bubbleText: { fontFamily: F.medium, fontSize: 14, color: C.ink },
  bubbleTail: {
    position: 'absolute',
    bottom: -8,
    left: 20,
    width: 12,
    height: 12,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 2.5,
    borderBottomWidth: 2.5,
    borderColor: C.ink,
    transform: [{ rotate: '45deg' }],
  },

  // buttons
  btnFace: { paddingHorizontal: 20, height: 48, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: F.display, fontSize: 16, letterSpacing: 0.3 },
  smallBtnText: { fontFamily: F.bold, fontSize: 13, color: C.ink },

  // hello card
  heroRow: { marginTop: 84, gap: 28 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 24 },
  infoLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mascotWrap: { position: 'absolute', top: -92, right: 26, zIndex: 1 },
  helloWrap: { zIndex: 2 },
  helloShadow: { position: 'absolute', top: 9, left: 9, right: -9, bottom: -9, borderRadius: 28, backgroundColor: C.coral },
  hello: { backgroundColor: C.paper, borderRadius: 28, borderWidth: 3, borderColor: C.ink, padding: 22 },
  helloTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  greetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  helloSmall: { fontFamily: F.medium, fontSize: 15, color: C.muted },
  helloName: { fontFamily: F.display, fontSize: 30, lineHeight: 34, color: C.ink },

  avatarBig: { width: 100, height: 100, borderRadius: 50, backgroundColor: C.coral, borderWidth: 3, borderColor: C.ink, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarBigImg: { width: '100%', height: '100%' },
  avatarBigText: { fontFamily: F.display, fontSize: 40, color: C.cream },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  infoTile: { flexGrow: 1, flexBasis: 120, borderWidth: 2.5, borderColor: C.ink, borderRadius: 18, padding: 12 },
  infoIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.paper, borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  infoLabel: { fontFamily: F.medium, fontSize: 12, color: C.muted },
  infoValue: { fontFamily: F.bold, fontSize: 16, color: C.ink, marginTop: 1 },

  // streak flame
  streakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 11,
    borderRadius: 999,
    borderWidth: 2.5,
    borderColor: C.ink,
    overflow: 'hidden',
  },
  streakOff: { backgroundColor: '#E6DDDE' },
  streakOn: { backgroundColor: C.yellow },
  streakGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: C.coral,
  },
  flameBox: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  streakText: { fontFamily: F.bold, fontSize: 13, color: C.ink },

  // folders
  folderShadow: { position: 'absolute', left: 0, right: 0, borderRadius: 20, borderWidth: 2.5, borderColor: C.ink },
  folderTab: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, minWidth: 120, maxWidth: '70%', height: 38, paddingHorizontal: 14, borderWidth: 2.5, borderBottomWidth: 0, borderColor: C.ink, borderTopLeftRadius: 16, borderTopRightRadius: 16, marginBottom: -2.5, zIndex: 3 },
  folderTabText: { fontFamily: F.display, fontSize: 14, flexShrink: 1 },
  folderBody: { borderWidth: 2.5, borderColor: C.ink, borderTopLeftRadius: 0, borderTopRightRadius: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, padding: 14, zIndex: 2 },
  folderSheet: { position: 'absolute', top: 6, left: 140, right: 22, height: 40, backgroundColor: '#FFFFFF', borderWidth: 2.5, borderColor: C.ink, borderTopLeftRadius: 10, borderTopRightRadius: 10, paddingHorizontal: 12, paddingTop: 7, gap: 4, zIndex: 1 },
  sheetLine: { height: 3, width: '85%', borderRadius: 2, backgroundColor: C.pink },
  folderLabel: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.paper, borderWidth: 2.5, borderColor: C.ink, borderRadius: 14, padding: 14 },
  featBadge: { position: 'absolute', top: -2, right: 24, zIndex: 4, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.yellow, borderWidth: 2.5, borderColor: C.ink, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, transform: [{ rotate: '5deg' }] },
  featBadgeText: { fontFamily: F.bold, fontSize: 12, color: C.ink },
  cardProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTrack: { flex: 1, height: 12, borderRadius: 7, borderWidth: 2.5, borderColor: C.ink, backgroundColor: C.pink, overflow: 'hidden' },
  cardFill: { height: '100%', backgroundColor: C.blue },
  cardPct: { fontFamily: F.display, fontSize: 14, color: C.ink, width: 46, textAlign: 'right' },
  cardSub: { fontFamily: F.medium, fontSize: 12, color: C.muted, marginTop: 4 },

  // stats
  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 36, marginBottom: 40 },
  statIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.paper, borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontFamily: F.display, fontSize: 36, lineHeight: 40 },
  statLabel: { fontFamily: F.bold, fontSize: 14, marginTop: 2 },

  // sections
  sectionHead: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  h2: { fontFamily: F.display, fontSize: 28, lineHeight: 32, color: C.ink },
  countPill: { backgroundColor: C.blue, borderWidth: 2.5, borderColor: C.ink, borderRadius: 999, minWidth: 34, height: 30, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  countPillText: { fontFamily: F.bold, fontSize: 14, color: '#FFFFFF' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  loadingRowText: { fontFamily: F.medium, fontSize: 14, color: C.muted },

  // course cards
  courseTitle: { fontFamily: F.bold, fontSize: 18, lineHeight: 24, color: C.ink },
  courseMeta: { fontFamily: F.medium, fontSize: 13, color: C.muted, marginTop: 3 },
  courseGo: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.yellow, borderWidth: 2.5, borderColor: C.ink, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  emptyBox: { alignItems: 'center', backgroundColor: C.paper, borderWidth: 3, borderColor: C.ink, borderStyle: 'dashed', borderRadius: 22, padding: 24 },
  emptyTitle: { fontFamily: F.display, fontSize: 22, color: C.ink, marginTop: 4 },
  emptyText: { fontFamily: F.medium, fontSize: 15, lineHeight: 22, color: C.muted, marginTop: 4, textAlign: 'center' },
  emptyIcon: { width: 54, height: 54, borderRadius: 27, backgroundColor: C.pink, borderWidth: 2.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },

  // trail window
  window: { backgroundColor: C.paper, borderWidth: 3, borderColor: C.ink, borderRadius: 24, overflow: 'hidden' },
  windowBar: { height: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 7, borderBottomWidth: 3, borderBottomColor: C.ink, backgroundColor: C.blue },
  dot: { width: 11, height: 11, borderRadius: 6, backgroundColor: C.paper, borderWidth: 2, borderColor: C.ink },
  windowTitle: { fontFamily: F.bold, fontSize: 15, color: '#FFFFFF', marginLeft: 8 },
  trailBig: { fontFamily: F.display, fontSize: 40, color: C.ink },
  trailBigSub: { fontFamily: F.medium, fontSize: 15, color: C.muted },
  trailTrackWrap: { marginTop: 44, marginBottom: 6, marginHorizontal: 24, justifyContent: 'center' },
  trailTrack: { height: 16, borderRadius: 9, borderWidth: 2.5, borderColor: C.ink, backgroundColor: C.pink, overflow: 'hidden' },
  trailFill: { height: '100%', backgroundColor: C.coral },
  trailTick: { position: 'absolute', top: 1, width: 14, height: 14, marginLeft: -7, borderRadius: 7, borderWidth: 2.5, borderColor: C.ink, backgroundColor: C.paper },
  trailMarker: { position: 'absolute', top: -38, marginLeft: -26 },
  trailEnds: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 24, marginTop: 6 },
  trailEndText: { fontFamily: F.bold, fontSize: 12, color: C.muted },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.cream, borderRadius: 14, padding: 14, marginTop: 20 },
  noticeText: { flex: 1, fontFamily: F.medium, fontSize: 14, lineHeight: 20, color: C.ink },

  // course viewer
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.paper, borderBottomWidth: 3, borderBottomColor: C.ink, paddingHorizontal: 16, paddingVertical: 10 },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, flexWrap: 'wrap' },
  codeChip: { backgroundColor: C.coral, borderWidth: 2, borderColor: C.ink, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 },
  codeChipText: { fontFamily: F.bold, fontSize: 12, color: C.cream },
  topTitle: { fontFamily: F.bold, fontSize: 16, color: C.ink, flex: 1, minWidth: 120 },
  topProgress: { width: 290, marginLeft: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  trackOuter: { height: 14, borderRadius: 8, borderWidth: 2.5, borderColor: C.ink, backgroundColor: C.pink, overflow: 'hidden' },
  trackInner: { height: '100%', backgroundColor: C.blue },
  topSub: { fontFamily: F.medium, fontSize: 11, color: C.muted, marginTop: 3 },
  topPct: { fontFamily: F.display, fontSize: 16, color: C.ink, width: 52, textAlign: 'right' },

  workspace: { flex: 1, flexDirection: 'row' },
  sidebar: { width: 300, backgroundColor: C.bg, borderRightWidth: 3, borderRightColor: C.ink },
  modBlock: { backgroundColor: C.paper, borderWidth: 2.5, borderColor: C.ink, borderRadius: 18, overflow: 'hidden' },
  modHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  modNum: { width: 28, height: 28, borderRadius: 8, backgroundColor: C.paper, borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  modNumText: { fontFamily: F.display, fontSize: 14, color: C.ink },
  modTitle: { fontFamily: F.display, fontSize: 15, lineHeight: 19 },
  modCount: { fontFamily: F.medium, fontSize: 12, marginTop: 2, opacity: 0.85 },
  modBar: { height: 8, borderRadius: 4, borderWidth: 2, borderColor: C.ink, backgroundColor: C.paper, overflow: 'hidden', marginTop: 6 },
  modBarFill: { height: '100%', backgroundColor: C.green },
  topicRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11, borderLeftWidth: 5, borderLeftColor: 'transparent', overflow: 'hidden' },
  topicRowActive: { backgroundColor: C.cream, borderLeftColor: C.coral },
  topicLine: { position: 'absolute', left: 29.5, top: 0, bottom: 0, width: 3, backgroundColor: C.pinkDeep },
  topicBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.cream, borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  topicTitle: { fontFamily: F.medium, fontSize: 14, lineHeight: 19, color: C.ink },
  topicMeta: { fontFamily: F.body, fontSize: 12, color: C.muted, marginTop: 1 },

  // reading progress
  readWrap: { width: '100%', maxWidth: 1360, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 14 },
  readBar: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.paper, borderWidth: 2.5, borderColor: C.ink, borderRadius: 18, paddingLeft: 10, paddingRight: 14, paddingTop: 20, paddingBottom: 9 },
  readIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.cream, borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  readLabelBox: { minWidth: 96 },
  readLabel: { fontFamily: F.bold, fontSize: 13, color: C.ink },
  readTrackWrap: { flex: 1, justifyContent: 'center', marginHorizontal: 12 },
  readTrack: { height: 12, borderRadius: 7, borderWidth: 2.5, borderColor: C.ink, backgroundColor: C.pink, overflow: 'hidden' },
  readFill: { height: '100%', backgroundColor: C.coral },
  readMarker: { position: 'absolute', top: -27, marginLeft: -17 },
  readPct: { fontFamily: F.display, fontSize: 15, color: C.ink, width: 50, textAlign: 'right' },

  // document + dock + gate
  mainBody: { padding: 24, maxWidth: 1360, width: '100%', alignSelf: 'center', paddingBottom: 60 },
  contentCard: { backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: C.ink, borderRadius: 24, padding: 28, minHeight: 320, marginBottom: 20 },
  prose: { fontFamily: F.body, fontSize: 17, lineHeight: 29, color: C.ink, maxWidth: 880 },
  blockTitle: { fontFamily: F.display, fontSize: 20, color: C.ink, marginBottom: 10 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.paper, borderWidth: 2, borderColor: C.ink, borderRadius: 16, padding: 12, marginBottom: 10 },
  bulletBadge: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  bulletNum: { fontFamily: F.display, fontSize: 14, color: C.ink },
  bulletText: { flex: 1, fontFamily: F.medium, fontSize: 15, lineHeight: 21, color: C.ink },

  dock: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14, backgroundColor: C.paper, borderWidth: 3, borderColor: C.ink, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 14 },
  dockInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 220 },
  dockPin: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.yellow, borderWidth: 2.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  crumb: { fontFamily: F.bold, fontSize: 12, color: C.muted },
  dockTitle: { fontFamily: F.display, fontSize: 20, lineHeight: 24, color: C.ink, marginTop: 1 },
  tabRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tabText: { fontFamily: F.bold, fontSize: 14, color: C.ink },

  gate: { alignSelf: 'center', alignItems: 'center', width: '100%', maxWidth: 520, marginTop: 44, backgroundColor: C.cream, borderWidth: 3, borderColor: C.ink, borderRadius: 22, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 16 },
  gateMascot: { width: 84, height: 74 },
  gateTitle: { fontFamily: F.display, fontSize: 20, color: C.ink, textAlign: 'center' },
  gateDesc: { fontFamily: F.medium, fontSize: 14, lineHeight: 20, color: C.muted, marginTop: 2, textAlign: 'center', maxWidth: 400 },
  gateBtns: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 12 },

  // celebration popup
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 200,
    elevation: 200,
    backgroundColor: 'rgba(74,26,36,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  celebWrap: { width: '100%', maxWidth: 460, marginTop: 40 },
  celebShadow: { position: 'absolute', top: 9, left: 9, right: -9, bottom: -9, borderRadius: 28, backgroundColor: C.coral },
  celebCard: { backgroundColor: C.paper, borderRadius: 28, borderWidth: 3, borderColor: C.ink, paddingHorizontal: 20, paddingBottom: 20, alignItems: 'center' },
  trophy: { width: 56, height: 56, borderRadius: 28, borderWidth: 3, borderColor: C.ink, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  celebTitle: { fontFamily: F.display, fontSize: 28, lineHeight: 32, color: C.ink, textAlign: 'center', marginTop: 10 },
  celebSub: { fontFamily: F.medium, fontSize: 15, lineHeight: 21, color: C.muted, textAlign: 'center', marginTop: 4 },
  courseChipRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  celebCourse: { fontFamily: F.bold, fontSize: 15, color: C.ink, flexShrink: 1 },
  bigScore: { width: 148, height: 148, borderRadius: 74, backgroundColor: C.coral, borderWidth: 3, borderColor: C.ink, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  bigScoreValue: { fontFamily: F.display, fontSize: 44, lineHeight: 48, color: C.cream },
  bigScoreLabel: { fontFamily: F.bold, fontSize: 13, color: C.cream, marginTop: 2 },
  miniRow: { flexDirection: 'row', gap: 10, marginTop: 16, width: '100%' },
  miniStat: { flexGrow: 1, flexBasis: '30%', minWidth: 90, borderWidth: 2.5, borderColor: C.ink, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center' },
  miniStatValue: { fontFamily: F.display, fontSize: 22, lineHeight: 26 },
  miniStatLabel: { fontFamily: F.bold, fontSize: 11, marginTop: 2, opacity: 0.9 },
  celebBarBox: { width: '100%', backgroundColor: C.cream, borderWidth: 2.5, borderColor: C.ink, borderRadius: 16, padding: 12, marginTop: 14 },
  celebBarHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  celebBarLabel: { fontFamily: F.bold, fontSize: 13, color: C.ink },
  celebBarPct: { fontFamily: F.display, fontSize: 15, color: C.coralDeep },
  celebTrack: { height: 14, borderRadius: 8, borderWidth: 2.5, borderColor: C.ink, backgroundColor: C.paper, overflow: 'hidden' },
  celebFill: { height: '100%', backgroundColor: C.green },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, width: '100%' },
  nextText: { flex: 1, fontFamily: F.medium, fontSize: 14, lineHeight: 20, color: C.ink },
  celebBtns: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 18 },
});