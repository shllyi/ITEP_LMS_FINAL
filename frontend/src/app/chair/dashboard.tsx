import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert,
  Animated,
  Easing,
  Platform,
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
import {
  chairApi,
  ChairAccount,
  ChairStats,
  ChairSubject,
  ChairReportsData,
  SmartEnrollmentPreview,
} from '@/services/chairApi';
import { SECTIONS } from '@/constants/sections';

type ChairTab = 'dashboard' | 'reports' | 'accounts' | 'enrollment';

const YEAR_LEVELS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const SEMESTERS = ['1st Semester', '2nd Semester', '3rd Semester'];
const SCHOOL_YEARS = ['2025-2026', '2026-2027', '2027-2028', '2028-2029'];
const ROLES = [
  { value: 'student', label: 'Student' },
  { value: 'faculty', label: 'Faculty' },
  { value: 'program_chair', label: 'Program chair' },
  { value: 'admin', label: 'Admin' },
];

/* ------------------------------------------------------------------ */
/*  Brand tokens (shared with the student side)                        */
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
  { face: C.cream, deep: C.creamDeep, fg: C.ink },
  { face: C.pink, deep: C.pinkDeep, fg: C.ink },
];

const isChairRole = (r?: string) => r === 'program chair' || r === 'program_chair';
const roleLabel = (r?: string) =>
  isChairRole(r) ? 'Program chair' : r === 'admin' ? 'Administrator' : r === 'faculty' ? 'Faculty' : 'Student';
const roleTone = (r?: string) =>
  r === 'student' ? ACCENTS[0] : r === 'faculty' ? ACCENTS[3] : r === 'admin' ? ACCENTS[2] : ACCENTS[1];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function confirmAction(message: string, onYes: () => void) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (window.confirm(message)) onYes();
  } else {
    Alert.alert('Please confirm', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes, continue', style: 'destructive', onPress: onYes },
    ]);
  }
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

function useBob(reduce: boolean, ms = 1800) {
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
    <View pointerEvents="none" style={{ position: 'absolute', left: '50%', top: 90, width: 0, height: 0, zIndex: 50 }}>
      {Array.from({ length: 16 }).map((_, i) => {
        const a = (i / 16) * Math.PI * 2;
        const d = 80 + (i % 3) * 28;
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
  children, onPress, face, shadow, radius = 16, depth = 5, style, faceStyle, disabled, held,
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
  const rest = () => Animated.spring(p, { toValue: heldRef.current ? 1 : 0, friction: 5, useNativeDriver: true }).start();
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
          position: 'absolute', left: 0, right: 0, top: depth, bottom: 0,
          borderRadius: radius, backgroundColor: shadow, borderWidth: 2.5, borderColor: C.ink,
        }}
      />
      <Animated.View
        style={[
          {
            backgroundColor: face, borderRadius: radius, borderWidth: 2.5, borderColor: C.ink,
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

type Tone = 'coral' | 'blue' | 'paper' | 'green' | 'red';
function Btn({
  label, onPress, tone = 'coral', loading, disabled, icon, small,
}: {
  label: string;
  onPress: () => void;
  tone?: Tone;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  small?: boolean;
}) {
  const t = {
    coral: { face: C.coral, shadow: C.coralDeep, text: C.cream },
    blue: { face: C.blue, shadow: C.blueDeep, text: '#FFFFFF' },
    paper: { face: C.paper, shadow: C.pinkDeep, text: C.ink },
    green: { face: C.green, shadow: C.greenDeep, text: '#FFFFFF' },
    red: { face: C.red, shadow: '#8E2410', text: '#FFFFFF' },
  }[tone];
  return (
    <Chunky
      face={t.face}
      shadow={t.shadow}
      radius={small ? 12 : 16}
      depth={small ? 4 : 5}
      onPress={onPress}
      disabled={disabled || loading}
      faceStyle={small ? s.btnFaceSm : s.btnFace}
    >
      {loading ? (
        <ActivityIndicator color={t.text} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          {icon ? <Ionicons name={icon} size={small ? 14 : 18} color={t.text} /> : null}
          <Text style={[small ? s.btnTextSm : s.btnText, { color: t.text }]}>{label}</Text>
        </View>
      )}
    </Chunky>
  );
}

function CountUp({ to, style }: { to: number; style?: any }) {
  const v = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState('0');
  useEffect(() => {
    v.setValue(0);
    const id = v.addListener(({ value }) => setShown(Math.round(value).toString()));
    Animated.timing(v, { toValue: to, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => v.removeListener(id);
  }, [to, v]);
  return <Text style={style}>{shown}</Text>;
}

/** Pill chip used for every filter / option group. */
function Chip({
  label, active, onPress, tone = 'blue',
}: { label: string; active: boolean; onPress: () => void; tone?: 'blue' | 'coral' }) {
  const sc = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!active) return;
    sc.setValue(0.9);
    Animated.spring(sc, { toValue: 1, friction: 3, tension: 160, useNativeDriver: true }).start();
  }, [active, sc]);
  const on = tone === 'blue' ? C.blue : C.coral;
  return (
    <Animated.View style={{ transform: [{ scale: sc }] }}>
      <Pressable onPress={onPress} accessibilityRole="button" style={[s.chip, active && { backgroundColor: on }]}>
        {active ? <Ionicons name="checkmark" size={12} color="#FFFFFF" /> : null}
        <Text style={[s.chipText, active && { color: '#FFFFFF' }]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

function Avatar({ first, last, size = 44, tone }: { first?: string; last?: string; size?: number; tone: typeof ACCENTS[number] }) {
  return (
    <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: tone.face }]}>
      <Text style={[s.avatarText, { fontSize: size * 0.38, color: tone.fg }]}>
        {(first?.[0] ?? '') + (last?.[0] ?? '')}
      </Text>
    </View>
  );
}

/** Animated bar that fills from 0 when it mounts. */
function GrowBar({ pct, color = C.coral }: { pct: number; color?: string }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    v.setValue(0);
    Animated.timing(v, { toValue: Math.max(0, Math.min(100, pct)), duration: 900, delay: 150, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [pct, v]);
  return (
    <View style={s.barTrack}>
      <Animated.View
        style={{ height: '100%', backgroundColor: color, width: v.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }}
      />
    </View>
  );
}

/** Sticker stat: pops in, squishes and makes the mascot talk when tapped. */
function StatSticker({
  label, icon, accent, rot, radius = 20, delay = 0, value, onTap,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: typeof ACCENTS[number];
  rot: number;
  radius?: number;
  delay?: number;
  value: number;
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
        flexGrow: 1, flexBasis: 150, opacity: enter,
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
          <CountUp to={value} style={[s.statValue, { color: accent.fg }]} />
          <Text style={[s.statLabel, { color: accent.fg }]}>{label}</Text>
        </Chunky>
      </Animated.View>
    </Animated.View>
  );
}

/** Folder card for each subject: tab, peeking sheet that lifts on hover/press. */
function FolderCard({
  subject, accent, tilt, width, onManage,
}: {
  subject: ChairSubject;
  accent: typeof ACCENTS[number];
  tilt: number;
  width: any;
  onManage: () => void;
}) {
  const press = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(0)).current;
  const sheetTo = (v: number) => Animated.spring(lift, { toValue: v, friction: 6, tension: 120, useNativeDriver: true }).start();
  const DEPTH = 7;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onManage}
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
          style={[s.folderSheet, { transform: [{ translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }] }]}
        >
          <View style={s.sheetLine} />
          <View style={[s.sheetLine, { width: '60%' }]} />
        </Animated.View>

        <View style={[s.folderTab, { backgroundColor: accent.face }]}>
          <Ionicons name="folder-open" size={15} color={accent.fg} />
          <Text style={[s.folderTabText, { color: accent.fg }]} numberOfLines={1}>{subject.code}</Text>
        </View>

        <View style={[s.folderBody, { backgroundColor: accent.face }]}>
          <View style={s.folderLabel}>
            <View style={{ flex: 1 }}>
              <Text style={s.courseTitle} numberOfLines={2}>{subject.name}</Text>
              <View style={{ gap: 5, marginTop: 8 }}>
                <View style={s.infoLine}>
                  <Ionicons name="person-outline" size={14} color={C.muted} />
                  <Text style={s.courseMeta} numberOfLines={1}>{subject.facultyName || 'No instructor yet'}</Text>
                </View>
                <View style={s.infoLine}>
                  <Ionicons name="calendar-outline" size={14} color={C.muted} />
                  <Text style={s.courseMeta} numberOfLines={1}>
                    {subject.yearLevel}, {subject.semester}, {subject.academicYear}
                  </Text>
                </View>
              </View>
              <View style={s.enrollTag}>
                <Ionicons name="people" size={13} color="#FFFFFF" />
                <Text style={s.enrollTagText}>{subject.enrolledCount} enrolled</Text>
              </View>
            </View>
            <View style={s.courseGo}>
              <Ionicons name="arrow-forward" size={20} color={C.ink} />
            </View>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

function ModalShell({
  visible, title, icon, onClose, children, footer,
}: {
  visible: boolean;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      pop.setValue(0);
      Animated.spring(pop, { toValue: 1, friction: 6, tension: 110, useNativeDriver: true }).start();
    }
  }, [visible, pop]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <Animated.View
          style={[
            s.modalWrap,
            { opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }, { rotate: '-0.4deg' }] },
          ]}
        >
          <View style={s.modalShadow} />
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <View style={s.modalIcon}>
                <Ionicons name={icon} size={18} color={C.ink} />
              </View>
              <Text style={s.modalTitle} numberOfLines={1}>{title}</Text>
              <Pressable onPress={onClose} style={s.modalClose} accessibilityLabel="Close">
                <Ionicons name="close" size={18} color={C.ink} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
            {footer ? <View style={s.modalFooter}>{footer}</View> : null}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function Field({
  label, value, onChangeText, placeholder, secure, email, flex,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secure?: boolean;
  email?: boolean;
  flex?: boolean;
}) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={[s.formField, flex && { flex: 1 }]}>
      <Text style={s.formLabel}>{label}</Text>
      <TextInput
        style={[s.formInput, focus && s.formInputFocus]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        secureTextEntry={secure}
        autoCapitalize={email || secure ? 'none' : 'words'}
        keyboardType={email ? 'email-address' : 'default'}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
      />
    </View>
  );
}

function Empty({ icon, title, text }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }) {
  return (
    <View style={s.emptyBox}>
      <View style={s.emptyIcon}>
        <Ionicons name={icon} size={26} color={C.ink} />
      </View>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptyText}>{text}</Text>
    </View>
  );
}

/** Collapsible filter drawer so the lists get the room. */
function FilterDrawer({
  activeCount, onClear, children,
}: { activeCount: number; onClear: () => void; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const rot = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(rot, { toValue: open ? 1 : 0, friction: 6, useNativeDriver: true }).start();
  }, [open, rot]);
  return (
    <View style={s.drawer}>
      <Pressable style={s.drawerHead} onPress={() => setOpen((o) => !o)}>
        <View style={s.drawerIcon}>
          <Ionicons name="options" size={16} color={C.ink} />
        </View>
        <Text style={s.drawerTitle}>Filters</Text>
        {activeCount > 0 && (
          <View style={s.drawerCount}>
            <Text style={s.drawerCountText}>{activeCount} on</Text>
          </View>
        )}
        <View style={{ flex: 1 }} />
        {activeCount > 0 && (
          <Pressable onPress={onClear} hitSlop={8}>
            <Text style={s.clearText}>Clear all</Text>
          </Pressable>
        )}
        <Animated.View style={{ transform: [{ rotate: rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}>
          <Ionicons name="chevron-down" size={18} color={C.ink} />
        </Animated.View>
      </Pressable>
      {open && <View style={s.drawerBody}>{children}</View>}
    </View>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.filterTitle}>{title}</Text>
      <View style={s.chipRow}>{children}</View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen                                                             */
/* ------------------------------------------------------------------ */
export default function ChairDashboardScreen() {
  const { token, user, isLoading: authLoading } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 992;
  const [fontsLoaded] = useFonts({ Outfit_400Regular, Outfit_500Medium, Outfit_700Bold, TitanOne_400Regular });

  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => {});
  }, []);

  // Role gate: strictly Program Chair or Admin
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login' as any);
        return;
      }
      const r = user.role;
      if (!isChairRole(r) && r !== 'admin') {
        if (r === 'faculty') router.replace('/faculty/dashboard' as any);
        else router.replace('/student/dashboard' as any);
      }
    }
  }, [authLoading, user]);

  const [activeTab, setActiveTab] = useState<ChairTab>('dashboard');

  // Data
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [accounts, setAccounts] = useState<ChairAccount[]>([]);
  const [subjects, setSubjects] = useState<ChairSubject[]>([]);
  const [reportsData, setReportsData] = useState<ChairReportsData | null>(null);
  const [stats, setStats] = useState<ChairStats>({ totalUsers: 0, studentCount: 0, facultyCount: 0, chairCount: 0 });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterSubjectId, setFilterSubjectId] = useState('all');
  const [filterYearLevel, setFilterYearLevel] = useState('all');
  const [filterSemester, setFilterSemester] = useState('all');
  const [filterSchoolYear, setFilterSchoolYear] = useState('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDirectEnrollModal, setShowDirectEnrollModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);

  // Create account
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'student' | 'faculty' | 'program_chair'>('student');
  const [newYearLevel, setNewYearLevel] = useState('1st Year');
  const [newSemester, setNewSemester] = useState('1st Semester');
  const [newSchoolYear, setNewSchoolYear] = useState('2026-2027');

  // Edit account
  const [editingAccount, setEditingAccount] = useState<ChairAccount | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editRole, setEditRole] = useState<string>('student');
  const [editYearLevel, setEditYearLevel] = useState('1st Year');
  const [editSemester, setEditSemester] = useState('1st Semester');
  const [editSchoolYear, setEditSchoolYear] = useState('2026-2027');
  const [editSection, setEditSection] = useState('');
  const [editTuptId, setEditTuptId] = useState('');

  // Direct enrollment
  const [enrollTargetStudent, setEnrollTargetStudent] = useState<ChairAccount | null>(null);
  const [selectedSubjectToEnroll, setSelectedSubjectToEnroll] = useState<string>('');

  // Batch
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [batchYearLevel, setBatchYearLevel] = useState('1st Year');
  const [batchSemester, setBatchSemester] = useState('1st Semester');
  const [batchSchoolYear, setBatchSchoolYear] = useState('2026-2027');

  // Smart enrollment
  const [enrollCriteriaYear, setEnrollCriteriaYear] = useState('1st Year');
  const [enrollCriteriaSem, setEnrollCriteriaSem] = useState('1st Semester');
  const [enrollCriteriaSY, setEnrollCriteriaSY] = useState('2026-2027');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<SmartEnrollmentPreview | null>(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Mascot
  const bob = useBob(reduce);
  const jump = useRef(new Animated.Value(0)).current;
  const { anim: bubbleAnim, text: bubbleText, say } = useBubble();
  const pokeIdx = useRef(0);
  const [burst, setBurst] = useState(0);
  const hop = () =>
    Animated.sequence([
      Animated.timing(jump, { toValue: -22, duration: 170, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(jump, { toValue: 0, friction: 3, tension: 110, useNativeDriver: true }),
    ]).start();
  const celebrate = (msg: string) => {
    hop();
    setBurst((b) => b + 1);
    say(msg, 3000);
  };
  const pokeMascot = () => {
    hop();
    const lines = ['Boop!', 'Everything looks in order.', 'Need a hand with enrollment?', 'Tap a folder to manage it.'];
    say(lines[pokeIdx.current++ % lines.length]);
  };

  // Tab switch pop
  const tabAnim = useRef(new Animated.Value(1)).current;
  const switchTab = (t: ChairTab) => {
    setActiveTab(t);
    setFeedbackMsg('');
    tabAnim.setValue(0);
    Animated.spring(tabAnim, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }).start();
  };

  /* ---------------- data ---------------- */
  useEffect(() => {
    if (authLoading || !token) return;
    loadSubjects();
  }, [authLoading, token]);

  useEffect(() => {
    if (authLoading || !token) return;
    loadAccounts();
    loadReports();
  }, [authLoading, token, filterRole, filterSubjectId, filterYearLevel, filterSemester, filterSchoolYear]);

  useEffect(() => {
    if (!loading && fontsLoaded) {
      const t = setTimeout(() => say(`${greeting()}, ${user?.firstName || 'chair'}!`), 600);
      return () => clearTimeout(t);
    }
  }, [loading, fontsLoaded]);

  const loadSubjects = async () => {
    const res = await chairApi.getAllSubjects(token);
    if (res.success && res.data) setSubjects(res.data);
  };

  const loadAccounts = async () => {
    setLoading(true);
    const res = await chairApi.getAccounts(token, {
      search: searchTerm,
      role: filterRole,
      subjectId: filterSubjectId === 'all' ? undefined : filterSubjectId,
      yearLevel: filterYearLevel === 'all' ? undefined : filterYearLevel,
      semester: filterSemester === 'all' ? undefined : filterSemester,
      schoolYear: filterSchoolYear === 'all' ? undefined : filterSchoolYear,
    });
    if (res.success && res.data) {
      setAccounts(res.data.accounts);
      if (res.data.stats) setStats(res.data.stats);
    }
    setLoading(false);
    setInitialLoadComplete(true);
  };

  const loadReports = async () => {
    const res = await chairApi.getChairReports(token, {
      subjectId: filterSubjectId === 'all' ? undefined : filterSubjectId,
      yearLevel: filterYearLevel === 'all' ? undefined : filterYearLevel,
      semester: filterSemester === 'all' ? undefined : filterSemester,
      schoolYear: filterSchoolYear === 'all' ? undefined : filterSchoolYear,
    });
    if (res.success && res.data) setReportsData(res.data);
  };

  const activeFilterCount = [filterRole, filterSubjectId, filterYearLevel, filterSemester, filterSchoolYear].filter(
    (f) => f !== 'all'
  ).length;
  const clearFilters = () => {
    setFilterRole('all');
    setFilterSubjectId('all');
    setFilterYearLevel('all');
    setFilterSemester('all');
    setFilterSchoolYear('all');
  };

  /* ---------------- account actions ---------------- */
  const handleOpenEditModal = (acc: ChairAccount) => {
    setEditingAccount(acc);
    setEditFirstName(acc.firstName);
    setEditLastName(acc.lastName);
    setEditEmail(acc.email);
    setEditUsername(acc.username);
    setEditRole(isChairRole(acc.role) ? 'program_chair' : acc.role);
    setEditYearLevel(acc.yearLevel || '1st Year');
    setEditSemester(acc.activeSemester || '1st Semester');
    setEditSchoolYear(acc.schoolYear || '2026-2027');
    setEditSection(acc.section || '');
    setEditTuptId(acc.tuptId || '');
    setErrorMsg('');
    setShowEditModal(true);
  };

  const handleSaveEditAccount = async () => {
    if (!editingAccount) return;
    setActionLoading(true);
    setErrorMsg('');

    if (editRole === 'student' && editTuptId.trim() && !/^TUPT-\d{2}-\d{3,5}$/i.test(editTuptId.trim())) {
      setActionLoading(false);
      setErrorMsg('Use the TUPT-ID format TUPT-22-0123.');
      return;
    }

    const res = await chairApi.updateAccount(token, editingAccount._id, {
      firstName: editFirstName,
      lastName: editLastName,
      email: editEmail,
      username: editUsername,
      role: editRole as any,
      yearLevel: editRole === 'student' ? editYearLevel : undefined,
      activeSemester: editRole === 'student' ? editSemester : undefined,
      schoolYear: editRole === 'student' ? editSchoolYear : undefined,
      section: editRole === 'student' ? editSection : undefined,
      tuptId: editRole === 'student' ? editTuptId.trim().toUpperCase() : undefined,
    });
    setActionLoading(false);
    if (res.success) {
      setShowEditModal(false);
      setEditingAccount(null);
      loadAccounts();
      celebrate('Account updated.');
    } else {
      setErrorMsg(res.message || 'Could not update this account. Check the details and try again.');
    }
  };

  const resetCreateForm = () => {
    setNewFirstName('');
    setNewLastName('');
    setNewEmail('');
    setNewUsername('');
    setNewPassword('');
    setNewRole('student');
    setNewYearLevel('1st Year');
    setNewSemester('1st Semester');
    setNewSchoolYear('2026-2027');
    setErrorMsg('');
  };

  const handleCreateAccount = async () => {
    if (!newFirstName || !newLastName || !newEmail || !newUsername || !newPassword) {
      setErrorMsg('Fill in every field marked with a star.');
      return;
    }
    setActionLoading(true);
    setErrorMsg('');
    const res = await chairApi.createAccount(token, {
      firstName: newFirstName,
      lastName: newLastName,
      email: newEmail,
      username: newUsername,
      password: newPassword,
      role: newRole,
      yearLevel: newRole === 'student' ? newYearLevel : undefined,
      activeSemester: newRole === 'student' ? newSemester : undefined,
      schoolYear: newRole === 'student' ? newSchoolYear : undefined,
    });
    setActionLoading(false);
    if (res.success) {
      setShowCreateModal(false);
      resetCreateForm();
      loadAccounts();
      celebrate('New account created!');
    } else {
      setErrorMsg(res.message || 'Could not create this account. Check the details and try again.');
    }
  };

  const handleDeleteAccount = (acc: ChairAccount) => {
    confirmAction(
      `Delete ${acc.firstName} ${acc.lastName}? This permanently removes their academic records and enrollments.`,
      async () => {
        const res = await chairApi.deleteAccount(token, acc._id);
        if (res.success) {
          setSelectedStudentIds((ids) => ids.filter((i) => i !== acc._id));
          loadAccounts();
          say('Account deleted.');
        } else {
          Alert.alert('Could not delete', res.message || 'Deletion failed.');
        }
      }
    );
  };

  /* ---------------- direct enrollment ---------------- */
  const handleOpenDirectEnroll = (stu: ChairAccount) => {
    setEnrollTargetStudent(stu);
    setSelectedSubjectToEnroll(subjects[0]?.id || '');
    setFeedbackMsg('');
    setShowDirectEnrollModal(true);
  };

  const handleExecuteDirectEnroll = async () => {
    if (!enrollTargetStudent || !selectedSubjectToEnroll) return;
    setActionLoading(true);
    const res = await chairApi.enrollStudentDirect(token, enrollTargetStudent._id, selectedSubjectToEnroll);
    setActionLoading(false);
    if (res.success) {
      setFeedbackMsg(res.message || 'Student enrolled.');
      loadAccounts();
      loadSubjects();
      celebrate('Enrolled!');
      setTimeout(() => {
        setShowDirectEnrollModal(false);
        setFeedbackMsg('');
      }, 1300);
    } else {
      Alert.alert('Enrollment error', res.message || 'Could not enroll the student in this subject.');
    }
  };

  const handleUnenrollDirect = (studentId: string, subjectId: string, code: string) => {
    confirmAction(`Unenroll this student from ${code}? Their coursework will be locked.`, async () => {
      const res = await chairApi.unenrollStudentDirect(token, studentId, subjectId);
      if (res.success) {
        loadAccounts();
        loadSubjects();
        say(`Removed from ${code}.`);
      } else {
        Alert.alert('Could not unenroll', res.message || 'Failed to unenroll.');
      }
    });
  };

  /* ---------------- batch + smart enrollment ---------------- */
  const handleToggleSelectStudent = (id: string) => {
    setSelectedStudentIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  };

  const visibleStudents = useMemo(() => accounts.filter((a) => a.role === 'student'), [accounts]);
  const allVisibleSelected =
    visibleStudents.length > 0 && visibleStudents.every((a) => selectedStudentIds.includes(a._id));
  const toggleSelectAll = () => {
    if (allVisibleSelected) setSelectedStudentIds((ids) => ids.filter((id) => !visibleStudents.some((a) => a._id === id)));
    else setSelectedStudentIds((ids) => Array.from(new Set([...ids, ...visibleStudents.map((a) => a._id)])));
  };

  const handleBatchUpdateStatus = async () => {
    if (selectedStudentIds.length === 0) return;
    setActionLoading(true);
    const res = await chairApi.batchUpdateStudentStatus(token, {
      studentIds: selectedStudentIds,
      yearLevel: batchYearLevel,
      activeSemester: batchSemester,
      schoolYear: batchSchoolYear,
    });
    setActionLoading(false);
    if (res.success) {
      setShowBatchModal(false);
      setSelectedStudentIds([]);
      loadAccounts();
      celebrate('Cohort moved up!');
    } else {
      Alert.alert('Batch update failed', res.message || 'Could not update the cohort.');
    }
  };

  const handlePreviewEnrollment = async () => {
    setPreviewLoading(true);
    setFeedbackMsg('');
    const res = await chairApi.previewEnrollmentRules(token, {
      yearLevel: enrollCriteriaYear,
      activeSemester: enrollCriteriaSem,
      schoolYear: enrollCriteriaSY,
    });
    setPreviewLoading(false);
    if (res.success && res.data) {
      setPreviewData(res.data);
      say(`Found ${res.data.matchedStudentsCount} students.`);
    } else {
      setFeedbackMsg(res.message || 'Failed to simulate matching.');
    }
  };

  const handleExecuteSmartEnrollment = async () => {
    if (!previewData) return;
    setActionLoading(true);
    setFeedbackMsg('');
    const res = await chairApi.executeEnrollmentRules(token, {
      yearLevel: enrollCriteriaYear,
      activeSemester: enrollCriteriaSem,
      schoolYear: enrollCriteriaSY,
    });
    setActionLoading(false);
    if (res.success) {
      setFeedbackMsg(`Enrollment completed! ${res.data?.enrolledRecordsCount || 0} student-subject records committed.`);
      setPreviewData(null);
      loadAccounts();
      loadSubjects();
      celebrate('Enrollment done!');
    } else {
      setFeedbackMsg(res.message || 'Enrollment execution failed.');
    }
  };

  /* ---------------- derived ---------------- */
  const reportList = reportsData?.subjectReports ?? [];
  const reportSummary = useMemo(() => {
    const n = reportList.length;
    return {
      avg: n ? Math.round(reportList.reduce((a, r) => a + (r.averageProgressPercent || 0), 0) / n) : 0,
      enrolled: reportList.reduce((a, r) => a + (r.enrolledCount || 0), 0),
      completed: reportList.reduce((a, r) => a + (r.completedStudentsCount || 0), 0),
    };
  }, [reportList]);

  const NAV: { id: ChairTab; label: string; icon: keyof typeof Ionicons.glyphMap; badge?: number }[] = [
    { id: 'dashboard', label: 'Overview', icon: 'grid' },
    { id: 'reports', label: 'Reports', icon: 'stats-chart' },
    { id: 'accounts', label: 'Accounts', icon: 'people', badge: stats.totalUsers },
    { id: 'enrollment', label: 'Enrollment', icon: 'git-merge' },
  ];

  /* ---------------- early returns (after all hooks) ---------------- */
  if (!fontsLoaded || authLoading || !initialLoadComplete) {
    return (
      <PageLoading
        title={authLoading ? 'Checking your session…' : 'Getting your workspace ready…'}
        subtitle={authLoading ? undefined : 'Loading accounts and course data'}
      />
    );
  }

  const initials = (user?.firstName?.[0] ?? '') + (user?.lastName?.[0] ?? '');

  /* ---------------- sections ---------------- */
  const renderNav = () => {
    if (isDesktop) {
      return (
        <View style={s.sidebar}>
          <View style={s.profileCard}>
            <View style={s.profileShadow} />
            <View style={s.profileFace}>
              <View style={s.bigAvatar}>
                <Text style={s.bigAvatarText}>{initials}</Text>
              </View>
              <Text style={s.profileName} numberOfLines={1}>{user?.firstName} {user?.lastName}</Text>
              <Text style={s.profileEmail} numberOfLines={1}>{user?.email}</Text>
              <View style={s.rolePill}>
                <Text style={s.rolePillText}>{roleLabel(user?.role)}</Text>
              </View>
            </View>
          </View>

          <View style={{ gap: 4, marginTop: 20 }}>
            {NAV.map((n) => {
              const on = activeTab === n.id;
              return (
                <Chunky
                  key={n.id}
                  held={on}
                  face={on ? C.coral : C.paper}
                  shadow={on ? C.coralDeep : C.pinkDeep}
                  radius={14}
                  depth={5}
                  onPress={() => switchTab(n.id)}
                  faceStyle={s.navFace}
                >
                  <Ionicons name={n.icon} size={18} color={on ? C.cream : C.ink} />
                  <Text style={[s.navText, on && { color: C.cream }]}>{n.label}</Text>
                  {n.badge !== undefined && (
                    <View style={[s.navBadge, on && { backgroundColor: C.paper }]}>
                      <Text style={s.navBadgeText}>{n.badge}</Text>
                    </View>
                  )}
                </Chunky>
              );
            })}
          </View>

          <View style={{ flex: 1 }} />
          <Btn label="Faculty studio" tone="paper" icon="swap-horizontal" onPress={() => router.push('/faculty/dashboard' as any)} />
        </View>
      );
    }
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.mobileNav}>
        {NAV.map((n) => {
          const on = activeTab === n.id;
          return (
            <Chunky
              key={n.id}
              held={on}
              face={on ? C.coral : C.paper}
              shadow={on ? C.coralDeep : C.pinkDeep}
              radius={14}
              depth={4}
              onPress={() => switchTab(n.id)}
              faceStyle={s.navFaceSm}
            >
              <Ionicons name={n.icon} size={16} color={on ? C.cream : C.ink} />
              <Text style={[s.navText, on && { color: C.cream }]}>{n.label}</Text>
            </Chunky>
          );
        })}
      </ScrollView>
    );
  };

  const renderOverview = () => (
    <View>
      <View style={s.statRow}>
        <StatSticker label="Accounts" icon="people" accent={ACCENTS[2]} rot={-2} radius={30} delay={0} value={stats.totalUsers}
          onTap={() => say(`${stats.totalUsers} people are registered.`)} />
        <StatSticker label="Students" icon="school" accent={ACCENTS[0]} rot={1.5} radius={10} delay={90} value={stats.studentCount}
          onTap={() => { switchTab('accounts'); setFilterRole('student'); say('Showing students.'); }} />
        <StatSticker label="Faculty" icon="easel" accent={ACCENTS[3]} rot={-1.5} radius={26} delay={180} value={stats.facultyCount}
          onTap={() => { switchTab('accounts'); setFilterRole('faculty'); say('Showing faculty.'); }} />
        <StatSticker label="Chairs" icon="shield-checkmark" accent={ACCENTS[1]} rot={2} radius={14} delay={270} value={stats.chairCount}
          onTap={() => say('That’s us!')} />
      </View>

      <View style={s.sectionHead}>
        <Text style={s.h2}>Subject folders</Text>
        <View style={s.countPill}>
          <Text style={s.countPillText}>{subjects.length}</Text>
        </View>
      </View>

      {subjects.length === 0 ? (
        <Empty icon="folder-open-outline" title="No subjects yet" text="Subjects added by faculty will show up here as folders." />
      ) : (
        <View style={s.grid}>
          {subjects.map((sub, i) => (
            <FolderCard
              key={sub.id}
              subject={sub}
              accent={ACCENTS[i % ACCENTS.length]}
              tilt={i % 2 ? 0.4 : -0.4}
              width={isDesktop ? '48.5%' : '100%'}
              onManage={() => {
                setFilterSubjectId(sub.id);
                switchTab('accounts');
                say(`Filtered to ${sub.code}.`);
              }}
            />
          ))}
        </View>
      )}
    </View>
  );

  const renderReports = () => (
    <View>
      <View style={s.sectionHead}>
        <Text style={s.h2}>Reports</Text>
      </View>
      <Text style={s.lead}>See how far each cohort has gotten through its subjects.</Text>

      <FilterDrawer activeCount={activeFilterCount} onClear={clearFilters}>
        <FilterGroup title="Subject">
          <Chip label="All subjects" active={filterSubjectId === 'all'} onPress={() => setFilterSubjectId('all')} />
          {subjects.map((sub) => (
            <Chip key={sub.id} label={sub.code} active={filterSubjectId === sub.id} onPress={() => setFilterSubjectId(sub.id)} />
          ))}
        </FilterGroup>
        <FilterGroup title="Year level">
          {['all', ...YEAR_LEVELS].map((y) => (
            <Chip key={y} label={y === 'all' ? 'All years' : y} active={filterYearLevel === y} onPress={() => setFilterYearLevel(y)} />
          ))}
        </FilterGroup>
        <FilterGroup title="Semester">
          {['all', ...SEMESTERS].map((x) => (
            <Chip key={x} label={x === 'all' ? 'All terms' : x} active={filterSemester === x} onPress={() => setFilterSemester(x)} />
          ))}
        </FilterGroup>
        <FilterGroup title="School year">
          {['all', ...SCHOOL_YEARS].map((x) => (
            <Chip key={x} label={x === 'all' ? 'All years' : x} active={filterSchoolYear === x} onPress={() => setFilterSchoolYear(x)} />
          ))}
        </FilterGroup>
      </FilterDrawer>

      {/* summary window */}
      <View style={s.window}>
        <View style={s.windowBar}>
          <View style={s.dot} /><View style={s.dot} /><View style={s.dot} />
          <Text style={s.windowTitle}>Across {reportList.length} subject{reportList.length === 1 ? '' : 's'}</Text>
        </View>
        <View style={s.summaryBody}>
          <View style={{ flex: 1.4, minWidth: 220 }}>
            <Text style={s.trailBig}>
              {reportSummary.avg}%<Text style={s.trailBigSub}> average progress</Text>
            </Text>
            <ProgressTrail pct={reportSummary.avg} reduce={reduce} />
          </View>
          <View style={s.miniStats}>
            <View style={[s.miniStat, { backgroundColor: C.cream }]}>
              <Text style={s.miniVal}>{reportSummary.enrolled}</Text>
              <Text style={s.miniLabel}>enrollments</Text>
            </View>
            <View style={[s.miniStat, { backgroundColor: C.pink }]}>
              <Text style={s.miniVal}>{reportSummary.completed}</Text>
              <Text style={s.miniLabel}>completed</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={{ height: 20 }} />

      {reportList.length === 0 ? (
        <Empty icon="stats-chart-outline" title="Nothing to report" text="No subjects match these filters. Clear a filter to see more." />
      ) : (
        <View style={s.reportGrid}>
          {reportList.map((rep, i) => {
            const a = ACCENTS[i % ACCENTS.length];
            return (
              <View key={rep.subjectId} style={[s.reportCard, { width: isDesktop ? '48.5%' : '100%' }]}>
                <View style={[s.reportTop, { backgroundColor: a.face }]}>
                  <Text style={[s.reportCode, { color: a.fg }]}>{rep.code}</Text>
                  <View style={s.reportEnroll}>
                    <Ionicons name="people" size={12} color={C.ink} />
                    <Text style={s.reportEnrollText}>{rep.enrolledCount}</Text>
                  </View>
                </View>
                <View style={{ padding: 14, gap: 8 }}>
                  <Text style={s.courseTitle} numberOfLines={2}>{rep.name}</Text>
                  <Text style={s.courseMeta}>{rep.faculty} · {rep.yearLevel}, {rep.semester}</Text>
                  <View style={s.progressRow}>
                    <GrowBar pct={rep.averageProgressPercent} color={a.face === C.cream || a.face === C.pink ? C.coral : a.face} />
                    <Text style={s.progressText}>{rep.averageProgressPercent}%</Text>
                  </View>
                  <View style={s.reportFoot}>
                    <View style={s.footItem}>
                      <Ionicons name="trophy" size={14} color={C.greenDeep} />
                      <Text style={s.footText}>{rep.completedStudentsCount} finished</Text>
                    </View>
                    <View style={s.footItem}>
                      <Ionicons name="document-text" size={14} color={C.muted} />
                      <Text style={s.footText}>{rep.publishedTopicsCount} topics live</Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );

  const renderAccounts = () => (
    <View>
      <View style={s.sectionHead}>
        <Text style={s.h2}>Accounts</Text>
        <View style={s.countPill}>
          <Text style={s.countPillText}>{accounts.length}</Text>
        </View>
      </View>
      <Text style={s.lead}>Edit roles, enroll students in subjects, or move whole groups to a new term.</Text>

      <View style={s.searchRow}>
        <Ionicons name="search" size={18} color={C.muted} />
        <TextInput
          style={s.searchInput}
          placeholder="Search by name, email or username"
          placeholderTextColor={C.muted}
          value={searchTerm}
          onChangeText={setSearchTerm}
          onSubmitEditing={loadAccounts}
          returnKeyType="search"
        />
        {searchTerm ? (
          <Pressable
            hitSlop={8}
            onPress={() => {
              setSearchTerm('');
              setTimeout(loadAccounts, 0);
            }}
          >
            <Ionicons name="close-circle" size={18} color={C.muted} />
          </Pressable>
        ) : null}
        <Btn label="Search" small tone="blue" onPress={loadAccounts} />
      </View>

      <FilterDrawer activeCount={activeFilterCount} onClear={clearFilters}>
        <FilterGroup title="Subject">
          <Chip label="All subjects" active={filterSubjectId === 'all'} onPress={() => setFilterSubjectId('all')} />
          {subjects.map((sub) => (
            <Chip key={sub.id} label={sub.code} active={filterSubjectId === sub.id} onPress={() => setFilterSubjectId(sub.id)} />
          ))}
        </FilterGroup>
        <FilterGroup title="Role">
          {['all', 'student', 'faculty', 'program_chair', 'admin'].map((r) => (
            <Chip
              key={r}
              tone="coral"
              label={r === 'all' ? 'Everyone' : r === 'program_chair' ? 'Chairs' : r === 'admin' ? 'Admins' : r === 'faculty' ? 'Faculty' : 'Students'}
              active={filterRole === r}
              onPress={() => setFilterRole(r)}
            />
          ))}
        </FilterGroup>
        <FilterGroup title="Year level">
          {['all', ...YEAR_LEVELS].map((y) => (
            <Chip key={y} label={y === 'all' ? 'All years' : y} active={filterYearLevel === y} onPress={() => setFilterYearLevel(y)} />
          ))}
        </FilterGroup>
        <FilterGroup title="Semester">
          {['all', ...SEMESTERS].map((x) => (
            <Chip key={x} label={x === 'all' ? 'All terms' : x} active={filterSemester === x} onPress={() => setFilterSemester(x)} />
          ))}
        </FilterGroup>
        <FilterGroup title="School year">
          {['all', ...SCHOOL_YEARS].map((x) => (
            <Chip key={x} label={x === 'all' ? 'All years' : x} active={filterSchoolYear === x} onPress={() => setFilterSchoolYear(x)} />
          ))}
        </FilterGroup>
      </FilterDrawer>

      {visibleStudents.length > 0 && (
        <View style={s.selectBar}>
          <Pressable style={s.selectAll} onPress={toggleSelectAll}>
            <View style={[s.check, allVisibleSelected && s.checkOn]}>
              {allVisibleSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </View>
            <Text style={s.selectAllText}>
              {allVisibleSelected ? 'Deselect all students' : `Select all ${visibleStudents.length} students`}
            </Text>
          </Pressable>
          {selectedStudentIds.length > 0 && (
            <Btn
              label={`Update ${selectedStudentIds.length} selected`}
              icon="swap-vertical"
              small
              tone="coral"
              onPress={() => setShowBatchModal(true)}
            />
          )}
        </View>
      )}

      {loading ? (
        <View style={s.loadingPad}>
          <Image source={require('@/assets/images/mascot_gif.gif')} style={{ width: 120, height: 120 }} resizeMode="contain" />
          <Text style={s.loadingText}>Fetching accounts…</Text>
        </View>
      ) : accounts.length === 0 ? (
        <Empty icon="search-outline" title="No one found" text="Try a different search or clear your filters." />
      ) : (
        <View style={{ gap: 14 }}>
          {accounts.map((acc, i) => {
            const tone = roleTone(acc.role);
            const isStudent = acc.role === 'student';
            const picked = selectedStudentIds.includes(acc._id);
            return (
              <View key={acc._id} style={[s.accCard, picked && s.accCardPicked, { transform: [{ rotate: i % 2 ? '0.25deg' : '-0.25deg' }] }]}>
                <View style={s.accTop}>
                  {isStudent ? (
                    <Pressable onPress={() => handleToggleSelectStudent(acc._id)} hitSlop={6} accessibilityLabel="Select student">
                      <View style={[s.check, picked && s.checkOn]}>
                        {picked && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                      </View>
                    </Pressable>
                  ) : null}
                  <Avatar first={acc.firstName} last={acc.lastName} tone={tone} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.accName} numberOfLines={1}>{acc.firstName} {acc.lastName}</Text>
                    <Text style={s.accSub} numberOfLines={1}>{acc.email} · @{acc.username}{acc.tuptId ? ` · ${acc.tuptId}` : ''}</Text>
                  </View>
                  <View style={[s.roleBadge, { backgroundColor: tone.face }]}>
                    <Text style={[s.roleBadgeText, { color: tone.fg }]}>{isChairRole(acc.role) ? 'Chair' : roleLabel(acc.role)}</Text>
                  </View>
                </View>

                {isStudent ? (
                  <View style={s.accMid}>
                    <View style={s.cohortTag}>
                      <Ionicons name="school-outline" size={13} color={C.ink} />
                      <Text style={s.cohortText}>
                        {acc.section ? `${acc.section} · ` : ''}{acc.yearLevel || '1st Year'}, {acc.activeSemester || '1st Semester'}
                      </Text>
                    </View>
                    <View style={s.enrolledRow}>
                      {acc.enrolledSubjects && acc.enrolledSubjects.length > 0 ? (
                        acc.enrolledSubjects.map((sub, k) => (
                          <Pressable
                            key={k}
                            style={s.enrolledChip}
                            onPress={() => sub.id && handleUnenrollDirect(acc._id, sub.id, sub.code)}
                            accessibilityLabel={`Unenroll from ${sub.code}`}
                          >
                            <Text style={s.enrolledChipText}>{sub.code}</Text>
                            <Ionicons name="close-circle" size={14} color={C.coralDeep} />
                          </Pressable>
                        ))
                      ) : (
                        <Text style={s.unassignedText}>Not enrolled in any subject</Text>
                      )}
                      <Pressable style={s.addEnrollBtn} onPress={() => handleOpenDirectEnroll(acc)}>
                        <Ionicons name="add" size={14} color={C.blueDeep} />
                        <Text style={s.addEnrollText}>Enroll</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Text style={s.staffNote}>Academic staff don’t take subjects.</Text>
                )}

                <View style={s.accActions}>
                  <Btn label="Edit" icon="create-outline" small tone="paper" onPress={() => handleOpenEditModal(acc)} />
                  <Btn label="Delete" icon="trash-outline" small tone="red" onPress={() => handleDeleteAccount(acc)} />
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );

  const renderEnrollment = () => (
    <View>
      <View style={s.sectionHead}>
        <Text style={s.h2}>Enrollment engine</Text>
      </View>
      <Text style={s.lead}>
        Students can’t open a subject until they’re enrolled. Pick a cohort, preview who matches, then confirm.
      </Text>

      {feedbackMsg ? (
        <View style={[s.notice, feedbackMsg.toLowerCase().includes('fail') ? { backgroundColor: C.pink } : { backgroundColor: '#C9F0DD' }]}>
          <Ionicons
            name={feedbackMsg.toLowerCase().includes('fail') ? 'alert-circle' : 'checkmark-circle'}
            size={20}
            color={C.ink}
          />
          <Text style={s.noticeText}>{feedbackMsg}</Text>
        </View>
      ) : null}

      <View style={s.stepCard}>
        <View style={s.stepHead}>
          <View style={[s.stepNum, { backgroundColor: C.blue }]}>
            <Text style={[s.stepNumText, { color: '#FFFFFF' }]}>1</Text>
          </View>
          <Text style={s.stepTitle}>Choose a cohort</Text>
        </View>
        <View style={{ gap: 14 }}>
          <FilterGroup title="Year level">
            {YEAR_LEVELS.map((y) => (
              <Chip key={y} label={y} active={enrollCriteriaYear === y} onPress={() => setEnrollCriteriaYear(y)} />
            ))}
          </FilterGroup>
          <FilterGroup title="Semester">
            {SEMESTERS.map((x) => (
              <Chip key={x} label={x} active={enrollCriteriaSem === x} onPress={() => setEnrollCriteriaSem(x)} />
            ))}
          </FilterGroup>
          <FilterGroup title="School year">
            {SCHOOL_YEARS.map((x) => (
              <Chip key={x} label={x} active={enrollCriteriaSY === x} onPress={() => setEnrollCriteriaSY(x)} />
            ))}
          </FilterGroup>
        </View>
        <View style={{ marginTop: 18, alignSelf: 'flex-start' }}>
          <Btn
            label={previewLoading ? 'Matching…' : 'Preview matches'}
            icon="search"
            tone="blue"
            loading={previewLoading}
            onPress={handlePreviewEnrollment}
          />
        </View>
      </View>

      {previewData ? (
        <View style={[s.stepCard, { backgroundColor: C.cream }]}>
          <View style={s.stepHead}>
            <View style={[s.stepNum, { backgroundColor: C.coral }]}>
              <Text style={[s.stepNumText, { color: C.cream }]}>2</Text>
            </View>
            <Text style={s.stepTitle}>Review and confirm</Text>
          </View>

          <View style={s.matrixMetrics}>
            <View style={[s.matrixPill, { backgroundColor: C.paper }]}>
              <CountUp to={previewData.matchedStudentsCount} style={s.matrixVal} />
              <Text style={s.matrixLabel}>students match</Text>
            </View>
            <View style={[s.matrixPill, { backgroundColor: C.paper }]}>
              <CountUp to={previewData.matchedSubjectsCount} style={s.matrixVal} />
              <Text style={s.matrixLabel}>subjects match</Text>
            </View>
            <View style={[s.matrixPill, { backgroundColor: '#C9F0DD' }]}>
              <CountUp to={previewData.potentialEnrollmentCount} style={[s.matrixVal, { color: C.greenDeep }]} />
              <Text style={s.matrixLabel}>new enrollments</Text>
            </View>
          </View>

          <Text style={s.filterTitle}>Subjects in this cohort</Text>
          <View style={[s.chipRow, { marginTop: 8 }]}>
            {previewData.matchingSubjects.map((sub, i) => (
              <View key={sub.id} style={[s.subjectTag, { backgroundColor: ACCENTS[i % ACCENTS.length].face }]}>
                <Text style={[s.subjectTagCode, { color: ACCENTS[i % ACCENTS.length].fg }]}>{sub.code}</Text>
                <Text style={[s.subjectTagName, { color: ACCENTS[i % ACCENTS.length].fg }]} numberOfLines={1}>{sub.name}</Text>
              </View>
            ))}
          </View>

          <Text style={s.executeNotice}>
            Confirming gives all {previewData.matchedStudentsCount} students access to these subjects.
          </Text>
          <View style={{ alignSelf: 'flex-start' }}>
            <Btn
              label={actionLoading ? 'Enrolling…' : 'Enroll cohort'}
              icon="rocket"
              tone="coral"
              loading={actionLoading}
              disabled={previewData.potentialEnrollmentCount === 0}
              onPress={handleExecuteSmartEnrollment}
            />
          </View>
          {previewData.potentialEnrollmentCount === 0 && (
            <Text style={[s.executeNotice, { marginTop: 8 }]}>Everyone here is already enrolled, so there’s nothing to do.</Text>
          )}
        </View>
      ) : (
        <View style={s.stepGhost}>
          <View style={[s.stepNum, { backgroundColor: C.pink }]}>
            <Text style={[s.stepNumText, { color: C.ink }]}>2</Text>
          </View>
          <Text style={s.ghostText}>Your preview will show up here after you pick a cohort.</Text>
        </View>
      )}
    </View>
  );

  /* ================================================================ */
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <Burst trigger={burst} disabled={reduce} />

      {/* top bar */}
      <View style={s.topBar}>
        <Pressable onPress={pokeMascot} accessibilityLabel="Mascot" style={s.mascotBtn}>
          <Animated.Image
            source={require('@/assets/images/mascot.png')}
            resizeMode="contain"
            style={{
              width: 64,
              height: 56,
              transform: [
                { translateY: Animated.add(jump, bob.interpolate({ inputRange: [0, 1], outputRange: [0, -3] })) },
                { rotate: bob.interpolate({ inputRange: [0, 1], outputRange: ['-3deg', '3deg'] }) },
              ],
            }}
          />
        </Pressable>
        <Bubble text={bubbleText} anim={bubbleAnim} style={{ position: 'absolute', top: 64, left: 14, zIndex: 30 }} />

        <View style={{ flex: 1, minWidth: 160 }}>
          <Text style={s.appTitle} numberOfLines={1}>Chair studio</Text>
          <Text style={s.appSub} numberOfLines={1}>Accounts, enrollment and progress in one place</Text>
        </View>

        {!isDesktop && (
          <View style={s.topIdentity}>
            <Text style={s.topIdentityText}>{roleLabel(user?.role)}</Text>
          </View>
        )}
        <Btn
          label="New account"
          icon="person-add"
          small
          tone="coral"
          onPress={() => {
            resetCreateForm();
            setShowCreateModal(true);
          }}
        />
      </View>

      <View style={s.shell}>
        {isDesktop && renderNav()}
        <View style={{ flex: 1 }}>
          {!isDesktop && renderNav()}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={s.workspaceBody} showsVerticalScrollIndicator={false}>
            <View pointerEvents="none" style={s.blobCoral} />
            <View pointerEvents="none" style={s.blobBlue} />
            <Animated.View
              style={{
                opacity: tabAnim,
                transform: [{ translateY: tabAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
              }}
            >
              {activeTab === 'dashboard' && renderOverview()}
              {activeTab === 'reports' && renderReports()}
              {activeTab === 'accounts' && renderAccounts()}
              {activeTab === 'enrollment' && renderEnrollment()}
            </Animated.View>
            {!isDesktop && (
              <View style={{ marginTop: 28, alignSelf: 'flex-start' }}>
                <Btn label="Faculty studio" tone="paper" icon="swap-horizontal" onPress={() => router.push('/faculty/dashboard' as any)} />
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* ───────── edit account ───────── */}
      <ModalShell
        visible={showEditModal}
        title="Edit account"
        icon="create"
        onClose={() => setShowEditModal(false)}
        footer={
          <>
            <Btn label="Cancel" tone="paper" onPress={() => setShowEditModal(false)} />
            <Btn label={actionLoading ? 'Saving…' : 'Save changes'} tone="coral" loading={actionLoading} onPress={handleSaveEditAccount} />
          </>
        }
      >
        {errorMsg ? (
          <View style={s.errorNotice}>
            <Ionicons name="alert-circle" size={18} color={C.red} />
            <Text style={s.errorNoticeText}>{errorMsg}</Text>
          </View>
        ) : null}
        <View style={s.formRow}>
          <Field flex label="First name" value={editFirstName} onChangeText={setEditFirstName} />
          <Field flex label="Last name" value={editLastName} onChangeText={setEditLastName} />
        </View>
        <Field label="Email" email value={editEmail} onChangeText={setEditEmail} />
        <Field label="Username" value={editUsername} onChangeText={setEditUsername} />
        <View style={s.formField}>
          <Text style={s.formLabel}>Role</Text>
          <View style={s.chipRow}>
            {ROLES.map((r) => (
              <Chip key={r.value} tone="coral" label={r.label} active={editRole === r.value} onPress={() => setEditRole(r.value)} />
            ))}
          </View>
        </View>
        {editRole === 'student' && (
          <>
            <Field
              label="TUPT-ID"
              placeholder="TUPT-22-0123"
              value={editTuptId}
              onChangeText={setEditTuptId}
              autoCapitalize="characters"
            />
            <View style={s.formField}>
              <Text style={s.formLabel}>Section</Text>
              <View style={s.chipRow}>
                {SECTIONS.map((sec) => (
                  <Chip
                    key={sec}
                    label={sec}
                    active={editSection === sec}
                    onPress={() => setEditSection(sec)}
                  />
                ))}
              </View>
            </View>
            <View style={s.formField}>
              <Text style={s.formLabel}>Year level</Text>
              <View style={s.chipRow}>
                {YEAR_LEVELS.map((y) => (
                  <Chip key={y} label={y} active={editYearLevel === y} onPress={() => setEditYearLevel(y)} />
                ))}
              </View>
            </View>
            <View style={s.formField}>
              <Text style={s.formLabel}>Semester</Text>
              <View style={s.chipRow}>
                {SEMESTERS.map((x) => (
                  <Chip key={x} label={x} active={editSemester === x} onPress={() => setEditSemester(x)} />
                ))}
              </View>
            </View>
            <View style={s.formField}>
              <Text style={s.formLabel}>School year</Text>
              <View style={s.chipRow}>
                {SCHOOL_YEARS.map((x) => (
                  <Chip key={x} label={x} active={editSchoolYear === x} onPress={() => setEditSchoolYear(x)} />
                ))}
              </View>
            </View>
          </>
        )}
      </ModalShell>

      {/* ───────── direct enroll ───────── */}
      <ModalShell
        visible={showDirectEnrollModal}
        title="Enroll in a subject"
        icon="enter"
        onClose={() => setShowDirectEnrollModal(false)}
        footer={
          <>
            <Btn label="Cancel" tone="paper" onPress={() => setShowDirectEnrollModal(false)} />
            <Btn
              label={actionLoading ? 'Enrolling…' : 'Enroll student'}
              tone="blue"
              loading={actionLoading}
              disabled={!selectedSubjectToEnroll}
              onPress={handleExecuteDirectEnroll}
            />
          </>
        }
      >
        <View style={s.whoRow}>
          <Avatar first={enrollTargetStudent?.firstName} last={enrollTargetStudent?.lastName} tone={ACCENTS[0]} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={s.accName}>{enrollTargetStudent?.firstName} {enrollTargetStudent?.lastName}</Text>
            <Text style={s.accSub} numberOfLines={1}>{enrollTargetStudent?.email}</Text>
          </View>
        </View>
        {feedbackMsg ? (
          <View style={[s.notice, { backgroundColor: '#C9F0DD' }]}>
            <Ionicons name="checkmark-circle" size={20} color={C.ink} />
            <Text style={s.noticeText}>{feedbackMsg}</Text>
          </View>
        ) : null}
        <Text style={s.formLabel}>Pick a subject</Text>
        {subjects.map((sub, i) => {
          const on = selectedSubjectToEnroll === sub.id;
          return (
            <Pressable key={sub.id} style={[s.subjectOption, on && s.subjectOptionOn]} onPress={() => setSelectedSubjectToEnroll(sub.id)}>
              <View style={[s.subjectOptionCode, { backgroundColor: ACCENTS[i % ACCENTS.length].face }]}>
                <Text style={[s.subjectTagCode, { color: ACCENTS[i % ACCENTS.length].fg }]}>{sub.code}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.accName} numberOfLines={1}>{sub.name}</Text>
                <Text style={s.accSub} numberOfLines={1}>{sub.facultyName} · {sub.yearLevel}, {sub.semester}</Text>
              </View>
              <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? C.blue : C.pinkDeep} />
            </Pressable>
          );
        })}
      </ModalShell>

      {/* ───────── create account ───────── */}
      <ModalShell
        visible={showCreateModal}
        title="New account"
        icon="person-add"
        onClose={() => setShowCreateModal(false)}
        footer={
          <>
            <Btn label="Cancel" tone="paper" onPress={() => setShowCreateModal(false)} />
            <Btn label={actionLoading ? 'Creating…' : 'Create account'} tone="coral" loading={actionLoading} onPress={handleCreateAccount} />
          </>
        }
      >
        {errorMsg ? (
          <View style={s.errorNotice}>
            <Ionicons name="alert-circle" size={18} color={C.red} />
            <Text style={s.errorNoticeText}>{errorMsg}</Text>
          </View>
        ) : null}
        <View style={s.formRow}>
          <Field flex label="First name *" placeholder="Jane" value={newFirstName} onChangeText={setNewFirstName} />
          <Field flex label="Last name *" placeholder="Doe" value={newLastName} onChangeText={setNewLastName} />
        </View>
        <Field label="Email *" email placeholder="jdoe@institution.edu" value={newEmail} onChangeText={setNewEmail} />
        <View style={s.formRow}>
          <Field flex label="Username *" placeholder="jdoe" value={newUsername} onChangeText={setNewUsername} />
          <Field flex label="Password *" secure placeholder="At least 6 characters" value={newPassword} onChangeText={setNewPassword} />
        </View>
        <View style={s.formField}>
          <Text style={s.formLabel}>Role</Text>
          <View style={s.chipRow}>
            {ROLES.slice(0, 3).map((r) => (
              <Chip key={r.value} tone="coral" label={r.label} active={newRole === r.value} onPress={() => setNewRole(r.value as any)} />
            ))}
          </View>
        </View>
        {newRole === 'student' && (
          <>
            <View style={s.formField}>
              <Text style={s.formLabel}>Year level</Text>
              <View style={s.chipRow}>
                {YEAR_LEVELS.map((y) => (
                  <Chip key={y} label={y} active={newYearLevel === y} onPress={() => setNewYearLevel(y)} />
                ))}
              </View>
            </View>
            <View style={s.formField}>
              <Text style={s.formLabel}>Semester</Text>
              <View style={s.chipRow}>
                {SEMESTERS.map((x) => (
                  <Chip key={x} label={x} active={newSemester === x} onPress={() => setNewSemester(x)} />
                ))}
              </View>
            </View>
            <View style={s.formField}>
              <Text style={s.formLabel}>School year</Text>
              <View style={s.chipRow}>
                {SCHOOL_YEARS.map((x) => (
                  <Chip key={x} label={x} active={newSchoolYear === x} onPress={() => setNewSchoolYear(x)} />
                ))}
              </View>
            </View>
          </>
        )}
      </ModalShell>

      {/* ───────── batch update ───────── */}
      <ModalShell
        visible={showBatchModal}
        title="Move a cohort"
        icon="swap-vertical"
        onClose={() => setShowBatchModal(false)}
        footer={
          <>
            <Btn label="Cancel" tone="paper" onPress={() => setShowBatchModal(false)} />
            <Btn
              label={actionLoading ? 'Updating…' : `Update ${selectedStudentIds.length} students`}
              tone="coral"
              loading={actionLoading}
              onPress={handleBatchUpdateStatus}
            />
          </>
        }
      >
        <View style={[s.notice, { backgroundColor: C.cream }]}>
          <Ionicons name="people" size={20} color={C.ink} />
          <Text style={s.noticeText}>
            {selectedStudentIds.length} student{selectedStudentIds.length === 1 ? '' : 's'} will move to the term below.
          </Text>
        </View>
        <View style={s.formField}>
          <Text style={s.formLabel}>Year level</Text>
          <View style={s.chipRow}>
            {YEAR_LEVELS.map((y) => (
              <Chip key={y} label={y} active={batchYearLevel === y} onPress={() => setBatchYearLevel(y)} />
            ))}
          </View>
        </View>
        <View style={s.formField}>
          <Text style={s.formLabel}>Semester</Text>
          <View style={s.chipRow}>
            {SEMESTERS.map((x) => (
              <Chip key={x} label={x} active={batchSemester === x} onPress={() => setBatchSemester(x)} />
            ))}
          </View>
        </View>
        <View style={s.formField}>
          <Text style={s.formLabel}>School year</Text>
          <View style={s.chipRow}>
            {SCHOOL_YEARS.map((x) => (
              <Chip key={x} label={x} active={batchSchoolYear === x} onPress={() => setBatchSchoolYear(x)} />
            ))}
          </View>
        </View>
      </ModalShell>
    </SafeAreaView>
  );
}

/** Progress track with the mascot riding the fill, like the student trail. */
function ProgressTrail({ pct, reduce }: { pct: number; reduce: boolean }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, {
      toValue: pct,
      duration: reduce ? 0 : 1100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [pct, reduce, v]);
  const w = v.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'], extrapolate: 'clamp' });
  return (
    <View style={s.trailTrackWrap}>
      <View style={s.trailTrack}>
        <Animated.View style={{ height: '100%', backgroundColor: C.coral, width: w }} />
      </View>
      <Animated.View pointerEvents="none" style={[s.trailMarker, { left: w }]}>
        <Image source={require('@/assets/images/mascot.png')} style={{ width: 44, height: 38 }} resizeMode="contain" />
      </Animated.View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg, padding: 32 },
  centeredTitle: { fontFamily: F.display, fontSize: 24, color: C.ink, textAlign: 'center' },

  // top bar
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap',
    backgroundColor: C.paper, borderBottomWidth: 3, borderBottomColor: C.ink,
    paddingHorizontal: 16, paddingVertical: 8, zIndex: 20,
  },
  mascotBtn: { marginRight: 2 },
  appTitle: { fontFamily: F.display, fontSize: 22, color: C.ink },
  appSub: { fontFamily: F.medium, fontSize: 12, color: C.muted },
  topIdentity: { backgroundColor: C.cream, borderWidth: 2, borderColor: C.ink, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  topIdentityText: { fontFamily: F.bold, fontSize: 12, color: C.ink },

  shell: { flex: 1, flexDirection: 'row' },
  workspaceBody: { padding: 22, paddingBottom: 80, maxWidth: 1180, width: '100%', alignSelf: 'center' },
  blobCoral: { position: 'absolute', width: 260, height: 260, borderRadius: 999, top: -120, right: -100, backgroundColor: C.coral, opacity: 0.85 },
  blobBlue: { position: 'absolute', width: 180, height: 180, borderRadius: 999, top: 520, left: -110, backgroundColor: C.blue, opacity: 0.8 },

  // sidebar
  sidebar: { width: 262, padding: 18, backgroundColor: C.bg, borderRightWidth: 3, borderRightColor: C.ink },
  profileCard: { marginBottom: 4 },
  profileShadow: { position: 'absolute', top: 7, left: 7, right: -7, bottom: -7, borderRadius: 22, backgroundColor: C.coral },
  profileFace: { backgroundColor: C.paper, borderRadius: 22, borderWidth: 3, borderColor: C.ink, padding: 16, alignItems: 'center' },
  bigAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.blue, borderWidth: 3, borderColor: C.ink, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  bigAvatarText: { fontFamily: F.display, fontSize: 24, color: '#FFFFFF' },
  profileName: { fontFamily: F.bold, fontSize: 16, color: C.ink },
  profileEmail: { fontFamily: F.medium, fontSize: 12, color: C.muted, marginTop: 1 },
  rolePill: { backgroundColor: C.yellow, borderWidth: 2, borderColor: C.ink, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 3, marginTop: 8, transform: [{ rotate: '-2deg' }] },
  rolePillText: { fontFamily: F.bold, fontSize: 12, color: C.ink },
  navFace: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  navFaceSm: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 8 },
  navText: { fontFamily: F.bold, fontSize: 14, color: C.ink, flex: 0 },
  navBadge: { marginLeft: 'auto', backgroundColor: C.cream, borderWidth: 2, borderColor: C.ink, borderRadius: 999, paddingHorizontal: 8, minWidth: 28, alignItems: 'center' },
  navBadgeText: { fontFamily: F.bold, fontSize: 11, color: C.ink },
  mobileNav: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6, gap: 10 },

  // buttons
  btnFace: { paddingHorizontal: 20, height: 48, alignItems: 'center', justifyContent: 'center' },
  btnFaceSm: { paddingHorizontal: 12, height: 36, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: F.display, fontSize: 15, letterSpacing: 0.3 },
  btnTextSm: { fontFamily: F.bold, fontSize: 13 },

  // bubble
  bubble: { maxWidth: 240, backgroundColor: '#FFFFFF', borderWidth: 2.5, borderColor: C.ink, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 },
  bubbleText: { fontFamily: F.medium, fontSize: 14, color: C.ink },
  bubbleTail: { position: 'absolute', top: -8, left: 22, width: 12, height: 12, backgroundColor: '#FFFFFF', borderLeftWidth: 2.5, borderTopWidth: 2.5, borderColor: C.ink, transform: [{ rotate: '45deg' }] },

  // sections
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  h2: { fontFamily: F.display, fontSize: 30, lineHeight: 34, color: C.ink },
  lead: { fontFamily: F.medium, fontSize: 15, lineHeight: 22, color: C.muted, marginBottom: 18, maxWidth: 620 },
  countPill: { backgroundColor: C.blue, borderWidth: 2.5, borderColor: C.ink, borderRadius: 999, minWidth: 34, height: 30, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  countPillText: { fontFamily: F.bold, fontSize: 14, color: '#FFFFFF' },

  // stats
  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 6, marginBottom: 36 },
  statIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.paper, borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontFamily: F.display, fontSize: 36, lineHeight: 40 },
  statLabel: { fontFamily: F.bold, fontSize: 14, marginTop: 2 },

  // folders
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 24 },
  folderShadow: { position: 'absolute', left: 0, right: 0, borderRadius: 20, borderWidth: 2.5, borderColor: C.ink },
  folderTab: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, minWidth: 120, maxWidth: '70%', height: 38, paddingHorizontal: 14, borderWidth: 2.5, borderBottomWidth: 0, borderColor: C.ink, borderTopLeftRadius: 16, borderTopRightRadius: 16, marginBottom: -2.5, zIndex: 3 },
  folderTabText: { fontFamily: F.display, fontSize: 14, flexShrink: 1 },
  folderBody: { borderWidth: 2.5, borderColor: C.ink, borderTopLeftRadius: 0, borderTopRightRadius: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, padding: 14, zIndex: 2 },
  folderSheet: { position: 'absolute', top: 6, left: 140, right: 22, height: 40, backgroundColor: '#FFFFFF', borderWidth: 2.5, borderColor: C.ink, borderTopLeftRadius: 10, borderTopRightRadius: 10, paddingHorizontal: 12, paddingTop: 7, gap: 4, zIndex: 1 },
  sheetLine: { height: 3, width: '85%', borderRadius: 2, backgroundColor: C.pink },
  folderLabel: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.paper, borderWidth: 2.5, borderColor: C.ink, borderRadius: 14, padding: 14 },
  courseTitle: { fontFamily: F.bold, fontSize: 18, lineHeight: 24, color: C.ink },
  courseMeta: { fontFamily: F.medium, fontSize: 13, color: C.muted },
  infoLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  enrollTag: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: C.green, borderWidth: 2, borderColor: C.ink, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, marginTop: 10 },
  enrollTagText: { fontFamily: F.bold, fontSize: 12, color: '#FFFFFF' },
  courseGo: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.yellow, borderWidth: 2.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },

  // filter drawer + chips
  drawer: { backgroundColor: C.paper, borderWidth: 3, borderColor: C.ink, borderRadius: 18, marginBottom: 18, overflow: 'hidden' },
  drawerHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  drawerIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.yellow, borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  drawerTitle: { fontFamily: F.bold, fontSize: 15, color: C.ink },
  drawerCount: { backgroundColor: C.coral, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2, borderWidth: 2, borderColor: C.ink },
  drawerCountText: { fontFamily: F.bold, fontSize: 11, color: C.cream },
  clearText: { fontFamily: F.bold, fontSize: 13, color: C.coralDeep, marginRight: 8 },
  drawerBody: { padding: 14, paddingTop: 4, gap: 14, borderTopWidth: 2, borderTopColor: C.pink },
  filterTitle: { fontFamily: F.bold, fontSize: 13, color: C.muted },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 2, borderColor: C.ink, backgroundColor: '#FFFFFF' },
  chipText: { fontFamily: F.bold, fontSize: 12, color: C.ink },

  // search
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: C.ink, borderRadius: 18, paddingLeft: 14, paddingRight: 8, paddingVertical: 8, marginBottom: 14 },
  searchInput: { flex: 1, fontFamily: F.medium, fontSize: 15, color: C.ink, paddingVertical: 6, outlineStyle: 'none' as any },

  // select bar
  selectBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  selectAll: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectAllText: { fontFamily: F.bold, fontSize: 13, color: C.ink },
  check: { width: 24, height: 24, borderRadius: 8, borderWidth: 2.5, borderColor: C.ink, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: C.blue },

  // account cards
  avatar: { borderWidth: 2.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: F.display },
  accCard: { backgroundColor: C.paper, borderWidth: 3, borderColor: C.ink, borderRadius: 20, padding: 14, gap: 12 },
  accCardPicked: { backgroundColor: C.cream, borderColor: C.blueDeep },
  accTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  accName: { fontFamily: F.bold, fontSize: 16, color: C.ink },
  accSub: { fontFamily: F.medium, fontSize: 12, color: C.muted, marginTop: 1 },
  roleBadge: { borderWidth: 2, borderColor: C.ink, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 3 },
  roleBadgeText: { fontFamily: F.bold, fontSize: 12 },
  accMid: { gap: 10, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: C.pink, borderRadius: 14, padding: 10 },
  cohortTag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cohortText: { fontFamily: F.bold, fontSize: 12, color: C.ink },
  enrolledRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  enrolledChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.pink, borderWidth: 2, borderColor: C.ink, borderRadius: 999, paddingLeft: 10, paddingRight: 6, paddingVertical: 3 },
  enrolledChipText: { fontFamily: F.bold, fontSize: 12, color: C.ink },
  unassignedText: { fontFamily: F.medium, fontSize: 13, color: C.muted, fontStyle: 'italic' },
  addEnrollBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, borderWidth: 2, borderStyle: 'dashed', borderColor: C.blueDeep },
  addEnrollText: { fontFamily: F.bold, fontSize: 12, color: C.blueDeep },
  staffNote: { fontFamily: F.medium, fontSize: 13, color: C.muted },
  accActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },

  // reports
  window: { backgroundColor: C.paper, borderWidth: 3, borderColor: C.ink, borderRadius: 24, overflow: 'hidden' },
  windowBar: { height: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 7, borderBottomWidth: 3, borderBottomColor: C.ink, backgroundColor: C.blue },
  dot: { width: 11, height: 11, borderRadius: 6, backgroundColor: C.paper, borderWidth: 2, borderColor: C.ink },
  windowTitle: { fontFamily: F.bold, fontSize: 15, color: '#FFFFFF', marginLeft: 8 },
  summaryBody: { padding: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 20, alignItems: 'center' },
  trailBig: { fontFamily: F.display, fontSize: 38, color: C.ink },
  trailBigSub: { fontFamily: F.medium, fontSize: 15, color: C.muted },
  trailTrackWrap: { marginTop: 40, marginBottom: 4, marginHorizontal: 20, justifyContent: 'center' },
  trailTrack: { height: 16, borderRadius: 9, borderWidth: 2.5, borderColor: C.ink, backgroundColor: C.pink, overflow: 'hidden' },
  trailMarker: { position: 'absolute', top: -34, marginLeft: -22 },
  miniStats: { flexDirection: 'row', gap: 12, flexGrow: 1, flexBasis: 220 },
  miniStat: { flex: 1, borderWidth: 2.5, borderColor: C.ink, borderRadius: 18, padding: 14, alignItems: 'center' },
  miniVal: { fontFamily: F.display, fontSize: 28, color: C.ink },
  miniLabel: { fontFamily: F.bold, fontSize: 12, color: C.muted },
  reportGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 18 },
  reportCard: { backgroundColor: C.paper, borderWidth: 3, borderColor: C.ink, borderRadius: 20, overflow: 'hidden' },
  reportTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 3, borderBottomColor: C.ink },
  reportCode: { fontFamily: F.display, fontSize: 15 },
  reportEnroll: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.paper, borderWidth: 2, borderColor: C.ink, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2 },
  reportEnrollText: { fontFamily: F.bold, fontSize: 12, color: C.ink },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  barTrack: { flex: 1, height: 14, borderRadius: 8, borderWidth: 2.5, borderColor: C.ink, backgroundColor: C.pink, overflow: 'hidden' },
  progressText: { fontFamily: F.display, fontSize: 14, color: C.ink, width: 46, textAlign: 'right' },
  reportFoot: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 4 },
  footItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footText: { fontFamily: F.bold, fontSize: 12, color: C.muted },

  // enrollment
  stepCard: { backgroundColor: C.paper, borderWidth: 3, borderColor: C.ink, borderRadius: 22, padding: 20, marginBottom: 20 },
  stepGhost: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 3, borderStyle: 'dashed', borderColor: C.ink, borderRadius: 22, padding: 18, opacity: 0.8 },
  ghostText: { flex: 1, fontFamily: F.medium, fontSize: 14, color: C.muted },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  stepNum: { width: 34, height: 34, borderRadius: 12, borderWidth: 2.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  stepNumText: { fontFamily: F.display, fontSize: 16 },
  stepTitle: { fontFamily: F.display, fontSize: 20, color: C.ink },
  matrixMetrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 18 },
  matrixPill: { flexGrow: 1, flexBasis: 130, borderWidth: 2.5, borderColor: C.ink, borderRadius: 16, paddingVertical: 12, alignItems: 'center' },
  matrixVal: { fontFamily: F.display, fontSize: 28, color: C.ink },
  matrixLabel: { fontFamily: F.bold, fontSize: 12, color: C.muted, marginTop: 2 },
  subjectTag: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 2, borderColor: C.ink, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, maxWidth: '100%' },
  subjectTagCode: { fontFamily: F.display, fontSize: 12 },
  subjectTagName: { fontFamily: F.medium, fontSize: 12, flexShrink: 1 },
  executeNotice: { fontFamily: F.medium, fontSize: 14, lineHeight: 20, color: C.muted, marginTop: 16, marginBottom: 14 },

  // notices / empty / loading
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2.5, borderColor: C.ink, borderRadius: 14, padding: 12, marginBottom: 16 },
  noticeText: { flex: 1, fontFamily: F.medium, fontSize: 14, lineHeight: 20, color: C.ink },
  emptyBox: { alignItems: 'center', backgroundColor: C.paper, borderWidth: 3, borderColor: C.ink, borderStyle: 'dashed', borderRadius: 22, padding: 28 },
  emptyIcon: { width: 54, height: 54, borderRadius: 27, backgroundColor: C.pink, borderWidth: 2.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  emptyTitle: { fontFamily: F.display, fontSize: 20, color: C.ink },
  emptyText: { fontFamily: F.medium, fontSize: 14, lineHeight: 21, color: C.muted, marginTop: 4, textAlign: 'center' },
  loadingPad: { padding: 30, alignItems: 'center' },
  loadingText: { fontFamily: F.bold, fontSize: 14, color: C.muted, marginTop: 4 },

  // modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(74,26,36,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalWrap: { width: '100%', maxWidth: 580 },
  modalShadow: { position: 'absolute', top: 9, left: 9, right: -9, bottom: -9, borderRadius: 26, backgroundColor: C.coral },
  modalCard: { backgroundColor: C.paper, borderRadius: 26, borderWidth: 3, borderColor: C.ink, padding: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  modalIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: C.yellow, borderWidth: 2.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  modalTitle: { flex: 1, fontFamily: F.display, fontSize: 21, color: C.ink },
  modalClose: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.pink, borderWidth: 2.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 12, paddingTop: 16, marginTop: 8 },
  formRow: { flexDirection: 'row', gap: 12 },
  formField: { marginBottom: 14 },
  formLabel: { fontFamily: F.bold, fontSize: 13, color: C.ink, marginBottom: 6 },
  formInput: { backgroundColor: '#FFFFFF', borderWidth: 2.5, borderColor: C.ink, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, fontFamily: F.medium, fontSize: 15, color: C.ink, outlineStyle: 'none' as any },
  formInputFocus: { borderColor: C.blue, backgroundColor: '#F2FBFF' },
  errorNotice: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.pink, borderWidth: 2.5, borderColor: C.ink, borderRadius: 14, padding: 10, marginBottom: 14 },
  errorNoticeText: { flex: 1, fontFamily: F.bold, fontSize: 13, color: C.ink },
  whoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14, backgroundColor: C.cream, borderRadius: 14, borderWidth: 2.5, borderColor: C.ink, padding: 10 },
  subjectOption: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderWidth: 2.5, borderColor: C.ink, borderRadius: 16, padding: 10, marginBottom: 10 },
  subjectOptionOn: { backgroundColor: '#E6F6FD', borderColor: C.blueDeep },
  subjectOptionCode: { borderWidth: 2, borderColor: C.ink, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5 },
});