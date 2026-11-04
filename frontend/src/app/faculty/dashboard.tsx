import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Pressable,
  Alert,
  Animated,
  Easing,
  AccessibilityInfo,
  useWindowDimensions,
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
import PageLoading from '@/components/PageLoading';
import { facultyApi, SubjectProgressReport } from '@/services/facultyApi';
import {
  Subject,
  CreateSubjectPayload,
  TopicContent,
  WaygroundQuiz,
  EnrolledStudent,
} from '@/types/faculty';
import { FacultyHeader } from '@/components/faculty/FacultyHeader';
import { CourseNavigator } from '@/components/faculty/CourseNavigator';
import { TopicContentStudio } from '@/components/faculty/TopicContentStudio';
import { WaygroundQuizStudio } from '@/components/faculty/WaygroundQuizStudio';
import { ContextInspector } from '@/components/faculty/ContextInspector';
import { SubjectInitModal } from '@/components/faculty/SubjectInitModal';
import { FacultyProgressReport } from '@/components/faculty/FacultyProgressReport';
import { StudentsPanel } from '@/components/faculty/StudentsPanel';

/* ------------------------------------------------------------------ */
/*  Brand tokens (shared with the student dashboard)                   */
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

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

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
}) {
  const p = useRef(new Animated.Value(0)).current;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => Animated.timing(p, { toValue: 1, duration: 70, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(p, { toValue: 0, friction: 5, useNativeDriver: true }).start()}
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
  compact,
}: {
  label: string;
  onPress: () => void;
  tone?: 'coral' | 'blue' | 'paper' | 'green';
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  compact?: boolean;
}) {
  const t = {
    coral: { face: C.coral, shadow: C.coralDeep, text: C.cream },
    blue: { face: C.blue, shadow: C.blueDeep, text: '#FFFFFF' },
    paper: { face: C.paper, shadow: C.pinkDeep, text: C.ink },
    green: { face: C.green, shadow: C.greenDeep, text: '#FFFFFF' },
  }[tone];
  return (
    <Chunky
      face={t.face}
      shadow={t.shadow}
      radius={compact ? 12 : 16}
      depth={compact ? 4 : 5}
      onPress={onPress}
      disabled={disabled || loading}
      faceStyle={compact ? s.btnFaceCompact : s.btnFace}
    >
      {loading ? (
        <ActivityIndicator color={t.text} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon ? <Ionicons name={icon} size={compact ? 15 : 18} color={t.text} /> : null}
          <Text style={[compact ? s.btnTextCompact : s.btnText, { color: t.text }]}>{label}</Text>
        </View>
      )}
    </Chunky>
  );
}

/** Number that rolls to its value whenever it changes. */
function CountUp({ to, style, suffix = '' }: { to: number; style?: any; suffix?: string }) {
  const v = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState('0');
  useEffect(() => {
    const id = v.addListener(({ value }) => setShown(String(Math.round(value))));
    Animated.timing(v, { toValue: to, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => v.removeListener(id);
  }, [to, v]);
  return <Text style={style}>{shown}{suffix}</Text>;
}

/** Stat sticker: pops in, squishes and talks when tapped. */
function Sticker({
  label,
  icon,
  face,
  deep,
  fg,
  rot,
  radius,
  delay,
  value,
  suffix,
  onTap,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  face: string;
  deep: string;
  fg: string;
  rot: number;
  radius: number;
  delay: number;
  value: number;
  suffix?: string;
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
        flexBasis: 120,
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
        <Chunky face={face} shadow={deep} radius={radius} depth={5} onPress={tap} faceStyle={{ padding: 12 }}>
          <View style={s.stickerRow}>
            <View style={s.stickerIcon}>
              <Ionicons name={icon} size={14} color={C.ink} />
            </View>
            <CountUp to={value} suffix={suffix} style={[s.stickerValue, { color: fg }]} />
          </View>
          <Text style={[s.stickerLabel, { color: fg }]}>{label}</Text>
        </Chunky>
      </Animated.View>
    </Animated.View>
  );
}

/** Dark rail entry that slides a little on hover and sinks on press. */
function RailItem({
  icon,
  label,
  active,
  disabled,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}) {
  const h = useRef(new Animated.Value(0)).current;
  const to = (v: number) => Animated.spring(h, { toValue: v, friction: 6, tension: 140, useNativeDriver: true }).start();
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => to(2)}
      onPressOut={() => to(0)}
      {...({ onHoverIn: () => to(1), onHoverOut: () => to(0) } as any)}
      style={{ opacity: disabled ? 0.45 : 1 }}
    >
      <Animated.View
        style={[
          s.railItem,
          active && s.railItemActive,
          {
            transform: [
              { translateX: h.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 6, 2] }) },
              { scale: h.interpolate({ inputRange: [0, 1, 2], outputRange: [1, 1.03, 0.96] }) },
            ],
          },
        ]}
      >
        <Ionicons name={icon} size={17} color={active ? C.ink : C.cream} />
        <Text style={[s.railItemText, active && { color: C.ink }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen                                                             */
/* ------------------------------------------------------------------ */
export default function FacultyDashboardScreen() {
  const { token, user, isLoading: authLoading } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const [fontsLoaded] = useFonts({ Outfit_400Regular, Outfit_500Medium, Outfit_700Bold, TitanOne_400Regular });

  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => {});
  }, []);

  // Role Gate: Redirect students to student dashboard
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login' as any);
      return;
    }
    const role = String(user.role || '').trim().toLowerCase();
    if (role !== 'faculty' && role !== 'program chair' && role !== 'program_chair' && role !== 'admin') {
      router.replace('/student/dashboard');
    }
  }, [authLoading, user]);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activeSubject, setActiveSubject] = useState<Subject | null>(null);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [subjectModalVisible, setSubjectModalVisible] = useState(false);
  const [subjectModalMode, setSubjectModalMode] = useState<'create' | 'edit'>('create');
  const [progressReport, setProgressReport] = useState<SubjectProgressReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Students view
  const [activeView, setActiveView] = useState<'workspace' | 'students'>('workspace');
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentsError, setStudentsError] = useState('');

  const loadStudents = async (silent = false) => {
    if (!activeSubject) return;
    if (!silent) setLoadingStudents(true);
    const res = await facultyApi.getSubjectStudents(token, activeSubject._id);
    if (res.success && res.data) {
      setStudents(res.data);
      setStudentsError('');
    } else {
      if (!silent) setStudentsError(res.message || 'Unable to load students');
    }
    if (!silent) setLoadingStudents(false);
  };

  useEffect(() => {
    if (activeView !== 'students' || !activeSubject) return;
    setStudents([]);
    loadStudents();
    const timer = setInterval(() => loadStudents(true), 15000);
    return () => clearInterval(timer);
  }, [activeView, activeSubject?._id]);

  // Mascot + feedback
  const bob = useBob(reduce);
  const jump = useRef(new Animated.Value(0)).current;
  const { anim: bubbleAnim, text: bubbleText, say } = useBubble();
  const pokeIdx = useRef(0);
  const [burst, setBurst] = useState(0);
  const panelIn = useRef(new Animated.Value(1)).current;
  const publishAnim = useRef(new Animated.Value(0)).current;

  const hop = () =>
    Animated.sequence([
      Animated.timing(jump, { toValue: -22, duration: 170, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(jump, { toValue: 0, friction: 3, tension: 110, useNativeDriver: true }),
    ]).start();
  const celebrate = (msg: string) => {
    hop();
    setBurst((b) => b + 1);
    say(msg, 2600);
  };

  // Load faculty subjects on mount
  useEffect(() => {
    if (!authLoading && token && user?.role?.trim().toLowerCase() === 'faculty') loadSubjects();
  }, [authLoading, token, user]);

  const loadSubjects = async () => {
    setLoading(true);
    setLoadError('');
    const res = await facultyApi.getFacultySubjects(token);
    if (res.success && res.data) {
      setSubjects(res.data);
      if (res.data.length > 0) {
        const initialSubj = res.data[0];
        setActiveSubject(initialSubj);
        if (initialSubj.modules.length > 0) {
          const firstMod = initialSubj.modules[0];
          setActiveModuleId(firstMod.id);
          if (firstMod.topics.length > 0) {
            setActiveTopicId(firstMod.topics[0].id);
          }
        }
      } else {
        setActiveSubject(null);
        setActiveModuleId(null);
        setActiveTopicId(null);
      }
    } else {
      setLoadError(res.message || 'Unable to load faculty subjects.');
    }
    setLoading(false);
  };

  const activeModule = activeSubject?.modules.find(m => m.id === activeModuleId) || activeSubject?.modules[0] || null;
  const activeTopic = activeModule?.topics.find(t => t.id === activeTopicId) || activeModule?.topics[0] || null;

  // Subject-level numbers for the stat stickers + publish trail
  const allTopics = (activeSubject?.modules || []).flatMap(m => m.topics || []);
  const totalModules = activeSubject?.modules.length || 0;
  const totalTopics = allTopics.length;
  const publishedTopics = allTopics.filter(t => t.status === 'published').length;
  const quizCount = allTopics.filter(t => (t.quiz?.questions?.length || 0) > 0).length;
  const publishedPct = totalTopics ? Math.round((publishedTopics / totalTopics) * 100) : 0;

  // Greet + animate the publish trail
  useEffect(() => {
    Animated.timing(publishAnim, {
      toValue: publishedPct,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publishedPct, activeSubject?._id]);

  useEffect(() => {
    if (loading || authLoading) return;
    const t = setTimeout(() => say(`${greeting()}! Let's build something.`), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, authLoading]);

  // Slide the studio panel in when the selected topic changes
  useEffect(() => {
    if (reduce) return;
    panelIn.setValue(0);
    Animated.timing(panelIn, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTopic?.id, activeSubject?._id]);

  // ─── SUBJECT CRUD HANDLERS ───────────────────────────────────
  const handleSelectSubject = (subj: Subject) => {
    setActiveSubject(subj);
    if (subj.modules.length > 0) {
      setActiveModuleId(subj.modules[0].id);
      if (subj.modules[0].topics.length > 0) {
        setActiveTopicId(subj.modules[0].topics[0].id);
      } else {
        setActiveTopicId(null);
      }
    } else {
      setActiveModuleId(null);
      setActiveTopicId(null);
    }
  };

  const handleCreateOrEditSubject = async (payload: CreateSubjectPayload): Promise<boolean> => {
    if (subjectModalMode === 'create') {
      const res = await facultyApi.createSubject(token, payload);
      if (res.success && res.data) {
        const updated = [res.data, ...subjects];
        setSubjects(updated);
        handleSelectSubject(res.data);
        celebrate('New subject ready!');
        return true;
      }
      Alert.alert('Subject could not be created', res.message || 'The server rejected the request.');
    } else if (activeSubject) {
      const res = await facultyApi.updateSubject(token, activeSubject._id, payload);
      if (res.success && res.data) {
        updateLocalSubject(res.data);
        say('Subject updated.');
        return true;
      }
      Alert.alert('Subject could not be updated', res.message || 'The server rejected the request.');
    }
    return false;
  };

  const handleDeleteSubject = async (subjectId: string) => {
    const res = await facultyApi.deleteSubject(token, subjectId);
    if (res.success) {
      const remaining = subjects.filter(s => s._id !== subjectId);
      setSubjects(remaining);
      if (remaining.length > 0) {
        handleSelectSubject(remaining[0]);
      } else {
        setActiveSubject(null);
        setActiveModuleId(null);
        setActiveTopicId(null);
      }
    }
  };

  // ─── MODULE CRUD HANDLERS ────────────────────────────────────
  const handleAddModule = async (subjectId: string, title: string) => {
    const res = await facultyApi.addModule(token, subjectId, title);
    if (res.success && res.data) {
      updateLocalSubject(res.data);
      hop();
      say('Module added.');
    }
  };

  const handleUpdateModule = async (subjectId: string, moduleId: string, title: string) => {
    const res = await facultyApi.updateModule(token, subjectId, moduleId, title);
    if (res.success && res.data) {
      updateLocalSubject(res.data);
    }
  };

  const handleDeleteModule = async (subjectId: string, moduleId: string) => {
    const res = await facultyApi.deleteModule(token, subjectId, moduleId);
    if (res.success && res.data) {
      updateLocalSubject(res.data);
      if (activeModuleId === moduleId) {
        setActiveModuleId(res.data.modules[0]?.id || null);
        setActiveTopicId(res.data.modules[0]?.topics[0]?.id || null);
      }
    }
  };

  // ─── TOPIC CRUD HANDLERS ─────────────────────────────────────
  const handleAddTopic = async (subjectId: string, moduleId: string, title: string) => {
    const res = await facultyApi.addTopic(token, subjectId, moduleId, title);
    if (res.success && res.data) {
      updateLocalSubject(res.data);
      const targetMod = res.data.modules.find(m => m.id === moduleId);
      if (targetMod && targetMod.topics.length > 0) {
        const latest = targetMod.topics[targetMod.topics.length - 1];
        setActiveModuleId(moduleId);
        setActiveTopicId(latest.id);
        hop();
        say('Topic added. Time to write!');
      }
    }
  };

  const handleSaveTopicContent = async (
    content: TopicContent,
    newTitle?: string,
    newStatus?: 'draft' | 'published'
  ): Promise<boolean> => {
    if (!activeSubject || !activeTopic) return false;
    const res = await facultyApi.updateTopic(token, activeSubject._id, activeTopic.id, {
      content,
      title: newTitle,
      status: newStatus,
    });
    if (res.success && res.data) {
      updateLocalSubject(res.data);
      if (newStatus === 'published') celebrate('Published! Students can see it.');
      else if (newStatus === 'draft') say('Moved back to draft.');
      else say('Saved.', 1800);
      return true;
    }
    return false;
  };

  const handleDeleteTopic = async (subjectId: string, moduleId: string, topicId: string) => {
    const res = await facultyApi.deleteTopic(token, subjectId, moduleId, topicId);
    if (res.success && res.data) {
      updateLocalSubject(res.data);
      if (activeTopicId === topicId) {
        const targetMod = res.data.modules.find(m => m.id === moduleId);
        setActiveTopicId(targetMod?.topics[0]?.id || null);
      }
    }
  };

  // ─── WAYGROUND QUIZ HANDLER ──────────────────────────────────
  const handleSaveQuiz = async (quiz: WaygroundQuiz) => {
    if (!activeSubject || !activeTopic) return;
    const res = await facultyApi.saveTopicQuiz(token, activeSubject._id, activeTopic.id, quiz);
    if (res.success && res.data) {
      updateLocalSubject(res.data);
      celebrate('Quiz saved!');
    }
  };

  // ─── FILE UPLOAD HANDLERS (AWS S3) ──────────────────────────
  const handleUploadPresentation = async (topicId: string, file: File) => {
    const res = await facultyApi.uploadPresentation(token, topicId, file, activeSubject?._id);
    if (res.success && res.data) {
      if (res.subject) {
        updateLocalSubject(res.subject);
      }
      hop();
      say('Slides uploaded.');
      return res.data;
    }
    return null;
  };

  const handleUploadQuizDocument = async (file: File) => {
    const res = await facultyApi.uploadQuizDocument(token, file);
    if (res.success && res.data) {
      return {
        extractedText: res.data.extractedText,
        fileName: res.data.fileName,
      };
    }
    return null;
  };

  const handleGenerateSummary = async (richText: string, presentationText: string) => {
    const res = await facultyApi.generateTopicSummary(token, richText, presentationText);
    return res.success && res.data?.summary ? res.data.summary : null;
  };

  const handlePublishToggle = () => {
    if (!activeTopic) return;
    const nextStatus = activeTopic.status === 'published' ? 'draft' : 'published';
    handleSaveTopicContent(activeTopic.content || {}, activeTopic.title, nextStatus);
  };

  const handleOpenReport = async () => {
    if (!activeSubject) return;
    setLoadingReport(true);
    const res = await facultyApi.getSubjectProgressReport(token, activeSubject._id);
    setLoadingReport(false);
    if (res.success && res.data) {
      setProgressReport(res.data);
    }
  };

  const updateLocalSubject = (updated: Subject) => {
    setSubjects(prev => prev.map(s => (s._id === updated._id ? updated : s)));
    setActiveSubject(updated);
  };

  const openCreateModal = () => {
    setSubjectModalMode('create');
    setSubjectModalVisible(true);
  };
  const openEditModal = () => {
    setSubjectModalMode('edit');
    setSubjectModalVisible(true);
  };

  const pokeLines = ['Boop!', 'Draft first, polish later.', 'Quizzes keep students sharp.', 'You are doing great.'];
  const pokeMascot = () => {
    hop();
    say(pokeLines[pokeIdx.current++ % pokeLines.length]);
  };

  /* ---------------- loading / report ---------------- */
  if (!fontsLoaded || authLoading || loading) {
    return <PageLoading title="Setting up your studio…" subtitle="Loading Course Studio" />;
  }

  if (progressReport) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <FacultyProgressReport report={progressReport} onClose={() => setProgressReport(null)} />
      </SafeAreaView>
    );
  }

  const facultyName =
    (user as any)?.firstName || (user as any)?.name || (user as any)?.username || 'Professor';

  const stickers = [
    { label: 'Modules', icon: 'albums' as const, face: C.blue, deep: C.blueDeep, fg: '#FFFFFF', rot: -1.5, radius: 22, value: totalModules, suffix: '', tip: `${totalModules} modules in this subject.` },
    { label: 'Topics', icon: 'document-text' as const, face: C.cream, deep: '#E8D77A', fg: C.ink, rot: 1.5, radius: 10, value: totalTopics, suffix: '', tip: `${totalTopics} topics to teach.` },
    { label: 'Published', icon: 'rocket' as const, face: C.pink, deep: C.pinkDeep, fg: C.ink, rot: -1, radius: 30, value: publishedTopics, suffix: '', tip: `${publishedTopics} live for students.` },
    { label: 'Quizzes', icon: 'flash' as const, face: C.coral, deep: C.coralDeep, fg: C.cream, rot: 2, radius: 14, value: quizCount, suffix: '', tip: `${quizCount} topics have a quiz.` },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Top Breadcrumb & Actions Bar */}
      <FacultyHeader
        subject={activeSubject}
        module={activeModule}
        topic={activeTopic}
        onOpenSubjectModal={openCreateModal}
      />

      <View style={s.workspaceContainer}>
        {/* Dark rail (desktop) */}
        {isDesktop && (
          <View style={s.rail}>
            <Text style={s.railBrand}>LMS</Text>
            <View style={s.railRolePill}>
              <Text style={s.railRole}>FACULTY</Text>
            </View>
            <View style={s.railDivider} />
            <RailItem
              icon="grid"
              label="Workspace"
              active={activeView === 'workspace'}
              onPress={() => setActiveView('workspace')}
            />
            <RailItem
              icon="people"
              label="Students"
              disabled={!activeSubject}
              active={activeView === 'students'}
              onPress={() => setActiveView('students')}
            />
            <RailItem
              icon="stats-chart"
              label={loadingReport ? 'Loading…' : 'Reports'}
              disabled={!activeSubject || loadingReport}
              onPress={handleOpenReport}
            />
            <RailItem icon="add-circle" label="New subject" onPress={openCreateModal} />
            <View style={{ flex: 1 }} />
            <Pressable onPress={pokeMascot} accessibilityLabel="Mascot" style={s.railMascot}>
              <Animated.Image
                source={require('@/assets/images/mascot.png')}
                resizeMode="contain"
                style={{
                  width: 96,
                  height: 84,
                  transform: [
                    { translateY: Animated.add(jump, bob.interpolate({ inputRange: [0, 1], outputRange: [0, -5] })) },
                    { rotate: bob.interpolate({ inputRange: [0, 1], outputRange: ['-3deg', '3deg'] }) },
                  ],
                }}
              />
            </Pressable>
          </View>
        )}

        {/* Left Column: Course Hierarchy Navigator */}
        <CourseNavigator
          subjects={subjects}
          activeSubject={activeSubject}
          onSelectSubject={handleSelectSubject}
          activeTopicId={activeTopic?.id || null}
          onSelectTopic={(modId, topId) => {
            setActiveView('workspace');
            setActiveModuleId(modId);
            setActiveTopicId(topId);
          }}
          onAddModule={handleAddModule}
          onUpdateModule={handleUpdateModule}
          onDeleteModule={handleDeleteModule}
          onAddTopic={handleAddTopic}
          onDeleteTopic={handleDeleteTopic}
          onOpenSubjectModal={openCreateModal}
          onOpenEditSubjectModal={openEditModal}
          onDeleteSubject={handleDeleteSubject}
        />

        {/* Center Column */}
        <ScrollView style={s.centerWorkspace} contentContainerStyle={s.centerContent} showsVerticalScrollIndicator={false}>
          <View pointerEvents="none" style={s.blobCoral} />
          <View pointerEvents="none" style={s.blobBlue} />

          {activeView === 'students' && activeSubject ? (
            <StudentsPanel
              subjectName={activeSubject.name}
              students={students}
              loading={loadingStudents}
              error={studentsError}
            />
          ) : (
            <>
              {/* Top Context Inspector */}
              {activeSubject && (
                <ContextInspector
                  subject={activeSubject}
                  topic={activeTopic}
                  onPublishTopic={handlePublishToggle}
                  onOpenSubjectModal={openEditModal}
                />
              )}

              {/* Hero card */}
              <View style={s.heroWrap}>
                <View style={s.heroShadow} />
                <View style={s.hero}>
                  <Burst trigger={burst} disabled={reduce} />
                  <Bubble text={bubbleText} anim={bubbleAnim} style={{ position: 'absolute', top: -46, right: 120, zIndex: 6 }} />
                  {!isDesktop && (
                    <Pressable onPress={pokeMascot} accessibilityLabel="Mascot" style={s.heroMascot}>
                      <Animated.Image
                        source={require('@/assets/images/mascot.png')}
                        resizeMode="contain"
                        style={{
                          width: 80,
                          height: 70,
                          transform: [
                            { translateY: Animated.add(jump, bob.interpolate({ inputRange: [0, 1], outputRange: [0, -5] })) },
                          ],
                        }}
                      />
                    </Pressable>
                  )}
                  <View style={{ flex: 1, minWidth: 220 }}>
                    <Text style={s.heroSmall}>{greeting()},</Text>
                    <Text style={s.heroName} numberOfLines={1}>{facultyName}</Text>
                    <Text style={s.heroSub} numberOfLines={2}>
                      {activeSubject
                        ? `${activeSubject.name || 'Your subject'}${activeTopic ? ` · ${activeTopic.title}` : ''}`
                        : 'Create a subject to start authoring content.'}
                    </Text>
                  </View>
                  <View style={s.heroActions}>
                    <Btn
                      compact
                      tone="blue"
                      icon="stats-chart"
                      label={loadingReport ? 'Loading…' : 'Student reports'}
                      loading={loadingReport}
                      disabled={!activeSubject}
                      onPress={handleOpenReport}
                    />
                    <Btn compact tone="paper" icon="add" label="New subject" onPress={openCreateModal} />
                  </View>
                </View>
              </View>

              {activeSubject ? (
                <>
                  {/* Stat stickers */}
                  <View style={s.stickerRowWrap}>
                    {stickers.map((st, i) => (
                      <Sticker
                        key={st.label}
                        label={st.label}
                        icon={st.icon}
                        face={st.face}
                        deep={st.deep}
                        fg={st.fg}
                        rot={st.rot}
                        radius={st.radius}
                        delay={i * 90}
                        value={st.value}
                        suffix={st.suffix}
                        onTap={() => {
                          hop();
                          say(st.tip, 2200);
                        }}
                      />
                    ))}
                  </View>

                  {/* Publish trail */}
                  <View style={s.trail}>
                    <View style={s.trailHead}>
                      <Text style={s.trailTitle}>Publish trail</Text>
                      <Text style={s.trailPct}>{publishedPct}%</Text>
                    </View>
                    <View style={s.trailTrackWrap}>
                      <View style={s.trailTrack}>
                        <Animated.View
                          style={[s.trailFill, { width: publishAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'], extrapolate: 'clamp' }) }]}
                        />
                      </View>
                      <Animated.View
                        pointerEvents="none"
                        style={[s.trailMarker, { left: publishAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'], extrapolate: 'clamp' }) }]}
                      >
                        <Image source={require('@/assets/images/mascot.png')} style={{ width: 40, height: 35 }} resizeMode="contain" />
                      </Animated.View>
                    </View>
                    <Text style={s.trailHint}>
                      {totalTopics === 0
                        ? 'Add a module and a topic to get moving.'
                        : publishedPct === 100
                        ? 'Everything is live. Nice work.'
                        : `${publishedTopics} of ${totalTopics} topics are live. Publish more to bring students in.`}
                    </Text>
                  </View>
                </>
              ) : null}

              {/* Studios */}
              {!activeSubject ? (
                <View style={s.emptyBox}>
                  <Image source={require('@/assets/images/mascot.png')} style={{ width: 120, height: 100 }} resizeMode="contain" />
                  <Text style={s.emptyTitle}>{loadError ? 'Subjects could not be loaded' : 'No subjects yet'}</Text>
                  <Text style={s.emptyText}>{loadError || 'Your existing subjects will appear here.'}</Text>
                  <View style={{ marginTop: 16 }}>
                    <Btn
                      tone={loadError ? 'coral' : 'blue'}
                      icon={loadError ? 'refresh' : 'add'}
                      label={loadError ? 'Retry loading' : 'Initialize subject'}
                      onPress={loadError ? loadSubjects : openCreateModal}
                    />
                  </View>
                </View>
              ) : !activeTopic ? (
                <View style={s.emptyBox}>
                  <View style={s.emptyIcon}>
                    <Ionicons name="git-branch-outline" size={26} color={C.ink} />
                  </View>
                  <Text style={s.emptyTitle}>No topic selected</Text>
                  <Text style={s.emptyText}>Add a module and topic from the navigator to start authoring content.</Text>
                </View>
              ) : (
                <Animated.View
                  style={{
                    opacity: panelIn,
                    transform: [{ translateY: panelIn.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
                    gap: 20,
                  }}
                >
                  <View style={s.studioFrame}>
                    <View style={[s.studioTab, { backgroundColor: C.cream }]}>
                      <Ionicons name="create" size={14} color={C.ink} />
                      <Text style={s.studioTabText}>Content studio</Text>
                    </View>
                    <TopicContentStudio
                      topic={activeTopic}
                      subjectId={activeSubject._id}
                      token={token}
                      onSaveContent={handleSaveTopicContent}
                      onUploadPresentation={handleUploadPresentation}
                      onGenerateSummary={handleGenerateSummary}
                    />
                  </View>

                  <View style={s.studioFrame}>
                    <View style={[s.studioTab, { backgroundColor: C.pink }]}>
                      <Ionicons name="flash" size={14} color={C.ink} />
                      <Text style={s.studioTabText}>Quiz studio</Text>
                    </View>
                    <WaygroundQuizStudio
                      quiz={activeTopic.quiz}
                      token={token}
                      onSaveQuiz={handleSaveQuiz}
                      onUploadQuizDocument={handleUploadQuizDocument}
                    />
                  </View>
                </Animated.View>
              )}
            </>
          )}
        </ScrollView>
      </View>

      {/* Mobile quick actions */}
      {!isDesktop && (
        <View style={s.dockBar}>
          <Btn
            compact
            tone={activeView === 'students' ? 'coral' : 'paper'}
            icon="people"
            label={activeView === 'students' ? 'Workspace' : 'Students'}
            disabled={!activeSubject}
            onPress={() => setActiveView(v => (v === 'students' ? 'workspace' : 'students'))}
          />
          <Btn compact tone="paper" icon="stats-chart" label="Reports" disabled={!activeSubject || loadingReport} onPress={handleOpenReport} />
          {activeTopic && activeView === 'workspace' ? (
            <Btn
              compact
              tone={activeTopic.status === 'published' ? 'green' : 'coral'}
              icon={activeTopic.status === 'published' ? 'checkmark-circle' : 'rocket'}
              label={activeTopic.status === 'published' ? 'Published' : 'Publish topic'}
              onPress={handlePublishToggle}
            />
          ) : null}
          <Btn compact tone="blue" icon="add" label="Subject" onPress={openCreateModal} />
        </View>
      )}

      {/* Subject Create / Edit Modal */}
      <SubjectInitModal
        visible={subjectModalVisible}
        mode={subjectModalMode}
        initialData={subjectModalMode === 'edit' ? activeSubject : null}
        onClose={() => setSubjectModalVisible(false)}
        onSubmit={handleCreateOrEditSubject}
      />
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg, padding: 32 },
  centeredTitle: { fontFamily: F.display, fontSize: 24, color: C.ink, textAlign: 'center' },
  centeredSub: { fontFamily: F.medium, fontSize: 15, color: C.muted, marginTop: 6, textAlign: 'center' },

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
    right: 28,
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
  btnFaceCompact: { paddingHorizontal: 14, height: 38, alignItems: 'center', justifyContent: 'center' },
  btnTextCompact: { fontFamily: F.bold, fontSize: 13 },

  // layout
  workspaceContainer: { flex: 1, flexDirection: 'row' },
  centerWorkspace: { flex: 1, backgroundColor: C.bg },
  centerContent: { padding: 20, paddingTop: 26, maxWidth: 1100, alignSelf: 'center', width: '100%', paddingBottom: 60 },

  blobCoral: { position: 'absolute', width: 260, height: 260, borderRadius: 999, top: -130, right: -100, backgroundColor: C.coral, opacity: 0.85 },
  blobBlue: { position: 'absolute', width: 170, height: 170, borderRadius: 999, top: 520, left: -100, backgroundColor: C.blue, opacity: 0.6 },

  // rail
  rail: { width: 164, backgroundColor: C.ink, paddingVertical: 18, paddingHorizontal: 14, gap: 6, borderRightWidth: 3, borderRightColor: '#2E0F16' },
  railBrand: { color: C.yellow, fontFamily: F.display, fontSize: 28, letterSpacing: 1 },
  railRolePill: { alignSelf: 'flex-start', backgroundColor: C.coral, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, marginTop: 2 },
  railRole: { color: C.cream, fontFamily: F.bold, fontSize: 10, letterSpacing: 1.2 },
  railDivider: { height: 2, backgroundColor: '#6B3340', marginVertical: 14, borderRadius: 1 },
  railItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 12, borderWidth: 2, borderColor: 'transparent' },
  railItemActive: { backgroundColor: C.yellow, borderColor: C.ink },
  railItemText: { color: C.cream, fontFamily: F.bold, fontSize: 13 },
  railMascot: { alignSelf: 'center' },

  // hero
  heroWrap: { zIndex: 2, marginBottom: 22, marginTop: 10 },
  heroShadow: { position: 'absolute', top: 8, left: 8, right: -8, bottom: -8, borderRadius: 26, backgroundColor: C.coral },
  hero: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16, backgroundColor: C.paper, borderRadius: 26, borderWidth: 3, borderColor: C.ink, padding: 20 },
  heroMascot: { marginRight: 4 },
  heroSmall: { fontFamily: F.medium, fontSize: 14, color: C.muted },
  heroName: { fontFamily: F.display, fontSize: 30, lineHeight: 34, color: C.ink },
  heroSub: { fontFamily: F.medium, fontSize: 13, color: C.muted, marginTop: 4 },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

  // stickers
  stickerRowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 22 },
  stickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  stickerIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.paper, borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  stickerValue: { fontFamily: F.display, fontSize: 30, lineHeight: 34 },
  stickerLabel: { fontFamily: F.bold, fontSize: 13, marginTop: 4 },

  // publish trail
  trail: { backgroundColor: C.paper, borderWidth: 3, borderColor: C.ink, borderRadius: 22, padding: 18, marginBottom: 24 },
  trailHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  trailTitle: { fontFamily: F.display, fontSize: 18, color: C.ink },
  trailPct: { fontFamily: F.display, fontSize: 18, color: C.coralDeep },
  trailTrackWrap: { marginTop: 34, marginHorizontal: 16, justifyContent: 'center' },
  trailTrack: { height: 16, borderRadius: 9, borderWidth: 2.5, borderColor: C.ink, backgroundColor: C.pink, overflow: 'hidden' },
  trailFill: { height: '100%', backgroundColor: C.green },
  trailMarker: { position: 'absolute', top: -32, marginLeft: -20 },
  trailHint: { fontFamily: F.medium, fontSize: 13, color: C.muted, marginTop: 14 },

  // studios
  studioFrame: { paddingTop: 16 },
  studioTab: { position: 'absolute', top: 0, left: 18, zIndex: 3, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 2.5, borderColor: C.ink, borderRadius: 999 },
  studioTabText: { fontFamily: F.bold, fontSize: 12, color: C.ink },

  // empty states
  emptyBox: { alignItems: 'center', backgroundColor: C.paper, borderWidth: 3, borderColor: C.ink, borderStyle: 'dashed', borderRadius: 22, padding: 28, marginTop: 10 },
  emptyTitle: { fontFamily: F.display, fontSize: 22, color: C.ink, marginTop: 4, textAlign: 'center' },
  emptyText: { fontFamily: F.medium, fontSize: 14, lineHeight: 21, color: C.muted, marginTop: 4, textAlign: 'center', maxWidth: 420 },
  emptyIcon: { width: 54, height: 54, borderRadius: 27, backgroundColor: C.pink, borderWidth: 2.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },

  // mobile dock
  dockBar: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: C.paper, borderTopWidth: 3, borderTopColor: C.ink },
});