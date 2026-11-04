import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Outfit_400Regular, Outfit_500Medium, Outfit_700Bold } from '@expo-google-fonts/outfit';
import { TitanOne_400Regular } from '@expo-google-fonts/titan-one';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/AuthContext';
import { SECTIONS } from '@/constants/sections';
import PageLoading from '@/components/PageLoading';

/* ------------------------------------------------------------------ */
/*  Brand                                                              */
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
};
const F = {
  body: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  bold: 'Outfit_700Bold',
  display: 'TitanOne_400Regular',
};

const roleLabels: Record<string, string> = {
  student: 'Student',
  faculty: 'Faculty',
  'program chair': 'Program Chair',
  program_chair: 'Program Chair',
  admin: 'Administrator',
};

type FormKey = 'firstName' | 'lastName' | 'username' | 'email' | 'avatar' | 'yearLevel' | 'activeSemester' | 'section' | 'tuptId';
const YEAR_LEVEL_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const SEMESTER_OPTIONS = ['1st Semester', '2nd Semester', '3rd Semester'];

type Cue = { n: number; mood: 'idle' | 'happy' | 'oops'; text: string };

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */
function useWide() {
  const { width } = useWindowDimensions();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated && width >= 860;
}

function useLoop(duration = 1700) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let cancelled = false;
    let loop: Animated.CompositeAnimation | null = null;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduce) => {
        if (cancelled || reduce) return;
        loop = Animated.loop(
          Animated.sequence([
            Animated.timing(v, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(v, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ])
        );
        loop.start();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      loop?.stop();
    };
  }, [duration, v]);
  return v;
}

const shake = (v: Animated.Value, amp = 10) =>
  Animated.sequence(
    [amp, -amp, amp * 0.7, -amp * 0.7, 0].map((to) =>
      Animated.timing(v, { toValue: to, duration: 55, useNativeDriver: true })
    )
  ).start();

/* ------------------------------------------------------------------ */
/*  Building blocks                                                    */
/* ------------------------------------------------------------------ */
function Chunky({
  children,
  onPress,
  face,
  shadow,
  radius = 16,
  depth = 6,
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
  const rest = () => Animated.spring(p, { toValue: 0, friction: 5, useNativeDriver: true }).start();
  const hover = {
    onHoverIn: () => Animated.timing(p, { toValue: -0.35, duration: 120, useNativeDriver: true }).start(),
    onHoverOut: rest,
  } as any;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => Animated.timing(p, { toValue: 1, duration: 70, useNativeDriver: true }).start()}
      onPressOut={rest}
      style={[{ paddingBottom: depth }, style]}
      {...hover}
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
            transform: [{ translateY: p.interpolate({ inputRange: [-1, 1], outputRange: [-depth, depth] }) }],
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
  tone?: 'coral' | 'paper' | 'blue';
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const t = {
    coral: { face: C.coral, shadow: C.coralDeep, text: C.cream },
    paper: { face: C.paper, shadow: C.pinkDeep, text: C.ink },
    blue: { face: C.blue, shadow: C.blueDeep, text: '#FFFFFF' },
  }[tone];
  return (
    <Chunky face={t.face} shadow={t.shadow} onPress={onPress} disabled={disabled || loading} faceStyle={s.btnFace}>
      {loading ? (
        <ActivityIndicator color={t.text} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon ? <Ionicons name={icon} size={19} color={t.text} /> : null}
          <Text style={[s.btnText, { color: t.text }]}>{label}</Text>
        </View>
      )}
    </Chunky>
  );
}

function Pair({ wide, children }: { wide: boolean; children: React.ReactNode }) {
  const kids = React.Children.toArray(children);
  return (
    <View style={wide ? { flexDirection: 'row', gap: 14 } : undefined}>
      {kids.map((k, i) => (
        <View key={i} style={wide ? { flex: 1 } : undefined}>
          {k}
        </View>
      ))}
    </View>
  );
}

/* ---- Field: locked until editing; tapping a locked field starts editing ---- */
type FieldProps = TextInputProps & {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  editable: boolean;
  error?: string;
  shakeSignal?: number;
  onLockedPress: () => void;
};

function Field({ label, icon, editable, error, shakeSignal = 0, onLockedPress, onFocus, onBlur, ...rest }: FieldProps) {
  const focus = useRef(new Animated.Value(0)).current;
  const x = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (shakeSignal > 0) shake(x, 8);
  }, [shakeSignal, x]);

  const to = (v: number) =>
    Animated.timing(focus, { toValue: v, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();

  const borderColor = error ? C.red : focus.interpolate({ inputRange: [0, 1], outputRange: [C.pink, C.blue] });
  const backgroundColor = focus.interpolate({ inputRange: [0, 1], outputRange: ['#FFF1F2', '#FFFFFF'] });

  return (
    <Animated.View style={{ transform: [{ translateX: x }], marginBottom: 14 }}>
      <Text style={s.label}>{label}</Text>
      <View>
        <Animated.View style={[s.field, editable ? { borderColor, backgroundColor } : s.fieldLocked]}>
          <Ionicons name={icon} size={20} color={error ? C.red : editable ? C.coral : C.muted} style={{ marginRight: 10 }} />
          <TextInput
            style={s.input}
            editable={editable}
            placeholderTextColor="#C79AA2"
            selectionColor={C.coral}
            onFocus={(e) => {
              to(1);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              to(0);
              onBlur?.(e);
            }}
            {...rest}
          />
          {!editable ? <Ionicons name="pencil" size={15} color={C.pinkDeep} /> : null}
        </Animated.View>
        {!editable ? (
          <Pressable style={StyleSheet.absoluteFill} onPress={onLockedPress} accessibilityLabel={`Edit ${label}`} />
        ) : null}
      </View>
      {error ? <Text style={s.fieldError}>{error}</Text> : null}
    </Animated.View>
  );
}

function OptionRow({
  options,
  value,
  onSelect,
}: {
  options: string[];
  value: string;
  onSelect: (value: string) => void;
}) {
  return (
    <View style={s.optionRow}>
      {options.map((option) => (
        <Pressable
          key={option}
          onPress={() => onSelect(option)}
          style={[s.option, option === value && s.optionSelected]}
          accessibilityRole="button"
          accessibilityState={{ selected: option === value }}
        >
          <Text style={[s.optionText, option === value && s.optionTextSelected]}>{option}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/* ---- folder tab above the card ---- */
function CardTab({
  label,
  icon,
  active,
  tone,
  first,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  tone: { bg: string; fg: string };
  first?: boolean;
  onPress: () => void;
}) {
  const act = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(act, { toValue: active ? 1 : 0, friction: 5, tension: 150, useNativeDriver: true }).start();
  }, [active, act]);
  return (
    <Pressable onPress={onPress} accessibilityRole="tab" style={{ marginLeft: first ? 0 : -8, zIndex: active ? 5 : 2 }}>
      <Animated.View
        style={[
          s.cardTab,
          {
            backgroundColor: active ? C.paper : tone.bg,
            paddingBottom: active ? 13 : 9,
            marginBottom: active ? -3 : 0,
            transform: [{ translateY: act.interpolate({ inputRange: [0, 1], outputRange: [5, 0] }) }],
          },
        ]}
      >
        <Ionicons name={icon} size={17} color={active ? C.ink : tone.fg} />
        <Text style={[s.cardTabText, { color: active ? C.ink : tone.fg }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

/* ---- tiles on the academics tab ---- */
function Tile({
  label,
  value,
  bg,
  deep,
  fg,
  rot,
  basis,
  onPress,
}: {
  label: string;
  value: string;
  bg: string;
  deep: string;
  fg: string;
  rot: number;
  basis: string;
  onPress?: () => void;
}) {
  return (
    <Chunky
      face={bg}
      shadow={deep}
      radius={20}
      onPress={onPress}
      style={{ flexBasis: basis as any, flexGrow: 1, transform: [{ rotate: `${rot}deg` }] }}
      faceStyle={{ padding: 16, minHeight: 112, justifyContent: 'space-between' }}
    >
      <Text style={[s.tileLabel, { color: fg }]}>{label}</Text>
      <Text style={[s.tileValue, { color: fg }, value.length > 12 && { fontSize: 19, lineHeight: 24 }]}>{value}</Text>
    </Chunky>
  );
}

/* ---- little tilted sticker; squishes when pressed ---- */
function StickerChip({ label, value, bg, fg, rot }: { label: string; value: string; bg: string; fg: string; rot: number }) {
  const sq = useRef(new Animated.Value(0)).current;
  const press = () => {
    sq.setValue(0);
    Animated.sequence([
      Animated.timing(sq, { toValue: 1, duration: 90, useNativeDriver: true }),
      Animated.spring(sq, { toValue: 0, friction: 3, tension: 130, useNativeDriver: true }),
    ]).start();
  };
  return (
    <Animated.View
      style={{
        transform: [
          { rotate: `${rot}deg` },
          { scaleX: sq.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) },
          { scaleY: sq.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] }) },
        ],
      }}
    >
      <Pressable onPress={press} style={[s.sticker, { backgroundColor: bg }]}>
        <Text style={[s.stickerLabel, { color: fg }]}>{label}</Text>
        <Text style={[s.stickerValue, { color: fg }]} numberOfLines={1}>
          {value}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

/* ---- axolotl mascot that peeks over the card (same character as the other pages) ---- */
const MASCOT_LINES = [
  'Hi! Need a hand?',
  'Nice ID, huh?',
  'Tap a field to edit it.',
  'Blub blub.',
  'Keep that profile fresh!',
];

function Mascot({ cue }: { cue: Cue }) {
  const blink = useRef(new Animated.Value(1)).current;
  const hop = useRef(new Animated.Value(0)).current;
  const tilt = useRef(new Animated.Value(0)).current;
  const bubble = useRef(new Animated.Value(0)).current;
  const [line, setLine] = useState(MASCOT_LINES[0]);
  const [mood, setMood] = useState<Cue['mood']>('idle');
  const idx = useRef(0);

  // idle blink
  useEffect(() => {
    const id = setInterval(() => {
      Animated.sequence([
        Animated.timing(blink, { toValue: 0.1, duration: 80, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]).start();
    }, 3200);
    return () => clearInterval(id);
  }, [blink]);

  const say = (text: string) => {
    setLine(text);
    bubble.stopAnimation();
    bubble.setValue(0);
    Animated.sequence([
      Animated.spring(bubble, { toValue: 1, friction: 6, tension: 140, useNativeDriver: true }),
      Animated.delay(1900),
      Animated.timing(bubble, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const wiggle = () => {
    tilt.setValue(0);
    Animated.sequence(
      [1, -1, 0.6, -0.6, 0].map((to) =>
        Animated.timing(tilt, { toValue: to, duration: 90, useNativeDriver: true })
      )
    ).start();
  };

  // react to what the screen tells it
  useEffect(() => {
    if (cue.n === 0) return;
    setMood(cue.mood);
    say(cue.text);
    if (cue.mood === 'happy') {
      Animated.sequence([
        Animated.timing(hop, { toValue: -18, duration: 130, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(hop, { toValue: 0, friction: 3, tension: 140, useNativeDriver: true }),
      ]).start();
    } else {
      wiggle();
    }
    const t = setTimeout(() => setMood('idle'), 2400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cue.n]);

  const poke = () => {
    idx.current = (idx.current + 1) % MASCOT_LINES.length;
    wiggle();
    say(MASCOT_LINES[idx.current]);
  };

  const mouth =
    mood === 'oops' ? s.mouthOops : mood === 'happy' ? s.mouthHappy : s.mouthIdle;

  return (
    <View style={s.mascotWrap} pointerEvents="box-none">
      <Animated.View
        pointerEvents="none"
        style={[
          s.bubble,
          {
            opacity: bubble,
            transform: [{ scale: bubble.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
          },
        ]}
      >
        <Text style={s.bubbleText} numberOfLines={1}>
          {line}
        </Text>
      </Animated.View>

      <Pressable onPress={poke} accessibilityLabel="Mascot">
        <Animated.View
          style={[
            s.mascotClip,
            {
              transform: [
                { translateY: hop },
                { rotate: tilt.interpolate({ inputRange: [-1, 1], outputRange: ['-6deg', '6deg'] }) },
              ],
            },
          ]}
        >
          {/* gills */}
          <View style={[s.gill, { left: 6, top: 14 }]} />
          <View style={[s.gill, { left: 0, top: 34 }]} />
          <View style={[s.gill, { right: 6, top: 14 }]} />
          <View style={[s.gill, { right: 0, top: 34 }]} />
          {/* head */}
          <View style={s.mascotHead}>
            <View style={[s.lens, { left: 16 }]}>
              <Text style={s.wink}>›</Text>
            </View>
            <View style={s.bridge} />
            <View style={[s.lens, { right: 16 }]}>
              <Animated.View style={[s.dot, { transform: [{ scaleY: blink }] }]} />
            </View>
            <View style={[s.cheek, { left: 8 }]} />
            <View style={[s.cheek, { right: 8 }]} />
            <View style={[s.mouthBase, mouth]} />
          </View>
          {/* paws gripping the card edge */}
          <View style={[s.paw, { left: 26 }]} />
          <View style={[s.paw, { right: 26 }]} />
        </Animated.View>
      </Pressable>
    </View>
  );
}

/* ---- confetti burst on a successful save ---- */
function Confetti({ burst }: { burst: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        a: (i / 18) * Math.PI * 2 + Math.random() * 0.4,
        d: 80 + Math.random() * 110,
        c: [C.coral, C.blue, C.cream, C.pink][i % 4],
        r: Math.round(Math.random() * 360),
        size: 8 + Math.round(Math.random() * 6),
        v: new Animated.Value(0),
      })),
    [burst]
  );
  useEffect(() => {
    if (!burst) return;
    Animated.parallel(
      pieces.map((p) => Animated.timing(p.v, { toValue: 1, duration: 950, easing: Easing.out(Easing.cubic), useNativeDriver: true }))
    ).start();
  }, [pieces, burst]);
  if (!burst) return null;
  return (
    <View pointerEvents="none" style={s.confetti}>
      {pieces.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            borderRadius: 3,
            backgroundColor: p.c,
            borderWidth: 2,
            borderColor: C.ink,
            opacity: p.v.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateX: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(p.a) * p.d] }) },
              { translateY: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(p.a) * p.d + 50] }) },
              { rotate: p.v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.r}deg`] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen                                                             */
/* ------------------------------------------------------------------ */
export default function ProfileScreen() {
  const { user, updateProfile } = useAuth();
  const wide = useWide();
  const [fontsLoaded] = useFonts({ Outfit_400Regular, Outfit_500Medium, Outfit_700Bold, TitanOne_400Regular });

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [tab, setTab] = useState<'info' | 'more'>('info');
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [cue, setCue] = useState<Cue>({ n: 0, mood: 'idle', text: '' });
  const [burst, setBurst] = useState(0);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [errors, setErrors] = useState<Partial<Record<FormKey, string>>>({});
  const [shakes, setShakes] = useState<Record<FormKey, number>>({
    firstName: 0,
    lastName: 0,
    username: 0,
    email: 0,
    avatar: 0,
    yearLevel: 0,
    activeSemester: 0,
    section: 0,
    tuptId: 0,
  });
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    avatar: '',
    yearLevel: '',
    activeSemester: '',
    section: '',
    tuptId: '',
  });

  const swing = useLoop(900);
  const drift = useLoop(7000);

  const asx = useRef(new Animated.Value(1)).current;
  const asy = useRef(new Animated.Value(1)).current;
  const stamp = useRef(new Animated.Value(0)).current;
  const editBadge = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const wobble = useRef(new Animated.Value(0)).current;
  const idDrop = useRef(new Animated.Value(0)).current;
  const meter = useRef(new Animated.Value(0)).current;

  const tellMascot = (mood: Cue['mood'], text: string) => setCue((c) => ({ n: c.n + 1, mood, text }));

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        username: user.username || '',
        email: user.email || '',
        avatar: user.avatar || '',
        yearLevel: user.yearLevel || '',
        activeSemester: user.activeSemester || '',
        section: user.section || '',
        tuptId: user.tuptId || '',
      });
    }
  }, [user]);

  // entrance: ID drops in on its lanyard, stamp slams down
  const hasUser = !!user;
  useEffect(() => {
    if (!hasUser) return;
    Animated.spring(idDrop, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }).start();
    const t2 = setTimeout(() => {
      Animated.spring(stamp, { toValue: 1, friction: 5, tension: 110, useNativeDriver: true }).start();
    }, 800);
    return () => clearTimeout(t2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUser]);

  // Fade the tab content in whenever the tab changes. The Animated.View stays mounted
  // (no `key`), otherwise unmounting it detaches `fade` and freezes the animation at 0.
  useEffect(() => {
    fade.setValue(0);
    Animated.spring(fade, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }).start();
  }, [tab, fade]);

  const initials = useMemo(
    () => `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || 'U',
    [user]
  );

  // barcode derived from the username so every ID looks a bit different
  const bars = useMemo(() => {
    const seed = `${user?.username || 'edik'}${user?.email || ''}`;
    return Array.from({ length: 30 }, (_, i) => {
      const code = seed.charCodeAt(i % seed.length) + i * 7;
      return { w: 2 + (code % 4), gap: 2 + ((code >> 2) % 3) };
    });
  }, [user?.username, user?.email]);

  // short ID number derived from the user's tuptId or fallback seed
  const idNo = useMemo(() => {
    if (user?.tuptId) return user.tuptId;
    const seed = `${user?.username || 'edik'}${user?.email || ''}`;
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 1000000;
    return `EP-${String(h).padStart(6, '0')}`;
  }, [user?.tuptId, user?.username, user?.email]);

  const role = user?.role || 'student';
  const isStudent = role === 'student';
  const verified = !!user?.isVerified;

  // profile completeness meter
  const completeness = useMemo(() => {
    const keys: FormKey[] = ['firstName', 'lastName', 'username', 'email', 'avatar'];
    if (isStudent) keys.push('yearLevel', 'activeSemester', 'section', 'tuptId');
    const done = keys.filter((k) => !!form[k]?.trim()).length;
    return { done, total: keys.length, pct: done / keys.length };
  }, [form, isStudent]);

  useEffect(() => {
    Animated.timing(meter, { toValue: completeness.pct, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [completeness.pct, meter]);

  /* ---- card actions ---- */
  const squish = (x: Animated.Value, y: Animated.Value) => {
    x.setValue(1.16);
    y.setValue(0.82);
    Animated.parallel([
      Animated.spring(x, { toValue: 1, friction: 3, tension: 120, useNativeDriver: true }),
      Animated.spring(y, { toValue: 1, friction: 3, tension: 120, useNativeDriver: true }),
    ]).start();
  };
  const swingCard = () => {
    wobble.setValue(0);
    Animated.sequence(
      [1, -0.8, 0.5, -0.25, 0].map((to) =>
        Animated.timing(wobble, { toValue: to, duration: 130, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
      )
    ).start();
  };

  /* ---- editing ---- */
  const setField = (field: FormKey, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    if (field === 'avatar') setAvatarFailed(false);
    setNotice(null);
  };

  const chooseProfilePhoto = async () => {
    setNotice(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setNotice({ type: 'error', text: 'Photo library permission is required to choose a profile photo.' });
      tellMascot('oops', 'Need permission for photos!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets[0]?.base64) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${asset.base64}`;
    if (dataUrl.length > 2.8 * 1024 * 1024) {
      setNotice({ type: 'error', text: 'Please choose a profile photo smaller than 2 MB.' });
      tellMascot('oops', 'Photo is too big.');
      return;
    }
    setField('avatar', dataUrl);
    tellMascot('happy', 'Looking fresh!');
  };

  const removeProfilePhoto = () => {
    setField('avatar', '');
    tellMascot('idle', 'Photo removed.');
  };

  const startEdit = () => {
    setNotice(null);
    setIsEditing(true);
    tellMascot('idle', 'Go on, make changes!');
    Animated.spring(editBadge, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }).start();
  };

  const resetForm = () => {
    if (user) {
      setForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        username: user.username || '',
        email: user.email || '',
        avatar: user.avatar || '',
        yearLevel: user.yearLevel || '',
        activeSemester: user.activeSemester || '',
        section: user.section || '',
        tuptId: user.tuptId || '',
      });
    }
    setAvatarFailed(false);
  };

  const cancelEdit = () => {
    resetForm();
    setNotice(null);
    setErrors({});
    setIsEditing(false);
    Animated.timing(editBadge, { toValue: 0, duration: 160, useNativeDriver: true }).start();
  };

  const saveProfile = async () => {
    const e: Partial<Record<FormKey, string>> = {};
    if (!form.firstName.trim()) e.firstName = 'Required';
    if (!form.lastName.trim()) e.lastName = 'Required';
    if (!form.username.trim()) e.username = 'Required';
    if (!form.email.trim()) e.email = 'Required';
    if (isStudent && !form.section) e.section = 'Required';
    if (isStudent && !form.tuptId.trim()) e.tuptId = 'Required';
    else if (isStudent && !/^TUPT-\d{2}-\d{3,5}$/i.test(form.tuptId.trim())) e.tuptId = 'Use format TUPT-22-0123';
    if (isStudent && !form.yearLevel.trim()) e.yearLevel = 'Required';
    if (isStudent && !form.activeSemester.trim()) e.activeSemester = 'Required';
    setErrors(e);

    if (Object.keys(e).length > 0) {
      setNotice({ type: 'error', text: 'Please complete all required profile and academic fields.' });
      tellMascot('oops', 'Oops, something is empty!');
      setShakes((prev) => {
        const next = { ...prev };
        (Object.keys(e) as FormKey[]).forEach((k) => (next[k] = (prev[k] || 0) + 1));
        return next;
      });
      return;
    }

    setIsSaving(true);
    const result = await updateProfile({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      username: form.username.trim(),
      email: form.email.trim(),
      avatar: form.avatar.trim(),
      ...(isStudent
        ? {
            yearLevel: form.yearLevel.trim(),
            activeSemester: form.activeSemester.trim(),
            section: form.section,
            tuptId: form.tuptId.trim().toUpperCase(),
          }
        : {}),
    });
    setIsSaving(false);
    setNotice({ type: result.success ? 'success' : 'error', text: result.message });

    if (result.success) {
      setIsEditing(false);
      Animated.timing(editBadge, { toValue: 0, duration: 160, useNativeDriver: true }).start();
      squish(asx, asy);
      swingCard();
      setBurst((b) => b + 1);
      tellMascot('happy', 'Saved! Looking sharp.');
    } else {
      tellMascot('oops', "That didn't save.");
    }
  };

  const switchTab = (k: 'info' | 'more') => {
    if (k === tab) return;
    setTab(k);
    tellMascot('idle', k === 'more' ? (isStudent ? 'Hitting the books?' : 'Your access, at a glance.') : 'Back to the basics.');
  };

  /* ---- loading ---- */
  if (!fontsLoaded || !user) {
    return <PageLoading title="Loading your profile…" subtitle="Getting your details ready" />;
  }

  /* ---- derived ---- */
  const showAvatarImg = !!form.avatar && !avatarFailed;
  const avatarIsUpload = form.avatar.startsWith('data:');
  const subjects: { code: string; title?: string }[] = user.enrolledSubjects ?? [];

  const lock = { editable: isEditing, onLockedPress: startEdit };
  const tileBasis = wide ? '47%' : '47%';

  const blob1 = {
    transform: [
      { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [0, -22] }) },
      { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [0, 16] }) },
    ],
  };
  const blob2 = {
    transform: [
      { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [0, 18] }) },
      { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [0, -20] }) },
    ],
  };

  /* ---------------------------------------------------------------- */
  /*  ID card (left)                                                   */
  /* ---------------------------------------------------------------- */
  const avatarEl = (
    <Pressable
      onPress={() => (isEditing ? chooseProfilePhoto() : squish(asx, asy))}
      accessibilityLabel={isEditing ? 'Change profile photo' : 'Profile picture'}
    >
      <View>
        <Animated.View style={[s.avatar, { transform: [{ scaleX: asx }, { scaleY: asy }] }]}>
          {showAvatarImg ? (
            <Image source={{ uri: form.avatar }} style={s.avatarImg} onError={() => setAvatarFailed(true)} />
          ) : (
            <Text style={s.avatarText}>{initials}</Text>
          )}
        </Animated.View>
        {isEditing ? (
          <View style={s.camBadge} pointerEvents="none">
            <Ionicons name="camera" size={15} color={C.ink} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );

  const barcodeEl = (
    <View style={{ alignItems: 'center' }}>
      <View style={s.barcode}>
        {bars.map((b, i) => (
          <View key={i} style={{ width: b.w, height: 34, backgroundColor: C.ink, marginRight: b.gap }} />
        ))}
      </View>
      <Text style={s.barcodeCaption}>{idNo}</Text>
    </View>
  );

  const roleSticker = (
    <View style={[s.roleSticker, { backgroundColor: isStudent ? C.blue : C.pink }]}>
      <Text style={[s.roleText, { color: isStudent ? '#FFFFFF' : C.ink }]}>{roleLabels[role] || role}</Text>
    </View>
  );

  const idCard = (
    <Animated.View
      style={[
        s.idWrap,
        {
          opacity: idDrop,
          transform: [
            { translateY: idDrop.interpolate({ inputRange: [0, 1], outputRange: [-60, 0] }) },
            { rotate: wobble.interpolate({ inputRange: [-1, 1], outputRange: ['-1.6deg', '1.6deg'] }) },
          ],
        },
      ]}
    >
      <View style={s.strap} />
      <View style={s.idShadow} />
      <Pressable onPress={swingCard} accessibilityLabel="ID card" style={s.idCard}>
        <View style={s.slot} />

        <Animated.View
          style={[
            s.editBadge,
            { opacity: editBadge, transform: [{ scale: editBadge }, { rotate: swing.interpolate({ inputRange: [0, 1], outputRange: ['-8deg', '8deg'] }) }] },
          ]}
        >
          <Ionicons name="pencil" size={13} color={C.ink} />
          <Text style={s.editBadgeText}>Editing</Text>
        </Animated.View>

        <View style={{ alignItems: 'center' }}>
          {avatarEl}
          <Text style={s.name} numberOfLines={2}>
            {form.firstName || user.firstName} {form.lastName || user.lastName}
          </Text>
          <Text style={s.handle}>@{form.username || user.username}</Text>
          {roleSticker}
        </View>

        <View style={s.idMeta}>
          <View style={s.idMetaCol}>
            <Text style={s.idMetaLabel}>{isStudent ? 'Year level' : 'Account'}</Text>
            <Text style={s.idMetaValue} numberOfLines={1}>
              {isStudent ? user.yearLevel || '—' : roleLabels[role] || role}
            </Text>
          </View>
          <View style={s.idMetaDivider} />
          <View style={s.idMetaCol}>
            <Text style={s.idMetaLabel}>School year</Text>
            <Text style={s.idMetaValue} numberOfLines={1}>
              {user.schoolYear || '—'}
            </Text>
          </View>
        </View>

        {barcodeEl}

        <Animated.View
          pointerEvents="none"
          style={[
            s.stamp,
            { right: 10, bottom: 74 },
            { borderColor: verified ? C.blue : C.red },
            {
              opacity: stamp,
              transform: [
                { rotate: stamp.interpolate({ inputRange: [0, 1], outputRange: ['-35deg', '-12deg'] }) },
                { scale: stamp.interpolate({ inputRange: [0, 1], outputRange: [2.4, 1] }) },
              ],
            },
          ]}
        >
          <Text style={[s.stampText, { color: verified ? C.blue : C.red }]}>{verified ? 'VERIFIED' : 'PENDING'}</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );

  /* ---------------------------------------------------------------- */
  /*  Tabs content (right)                                             */
  /* ---------------------------------------------------------------- */
  const actionRow = (editLabel: string) => (
    <View style={s.actions}>
      {isEditing ? (
        <>
          <Btn label="Cancel" tone="paper" onPress={cancelEdit} disabled={isSaving} />
          <Btn label="Save changes" onPress={saveProfile} loading={isSaving} icon="checkmark" />
        </>
      ) : (
        <Btn label={editLabel} onPress={startEdit} icon="pencil" />
      )}
    </View>
  );

  const stickerData = isStudent
    ? [
        { k: 'id', label: 'TUPT-ID', value: user.tuptId || 'Not set', bg: C.pink, fg: C.ink, rot: 1.5 },
        { k: 'sec', label: 'Section', value: user.section || 'Not set', bg: '#DDE2EA', fg: C.ink, rot: -2 },
        { k: 'year', label: 'Year level', value: user.yearLevel || 'Not set', bg: C.coral, fg: C.cream, rot: -3 },
        { k: 'sem', label: 'Semester', value: user.activeSemester || 'Not set', bg: C.blue, fg: '#FFFFFF', rot: 2 },
        { k: 'subj', label: 'Subjects', value: `${subjects.length}`, bg: C.cream, fg: C.ink, rot: -1.5 },
      ]
    : [{ k: 'role', label: 'Role', value: roleLabels[role] || role, bg: C.blue, fg: '#FFFFFF', rot: -2 }];

  const meterEl = (
    <View style={s.meterBox}>
      <View style={s.meterHead}>
        <Text style={s.meterTitle}>Profile completeness</Text>
        <Text style={s.meterCount}>
          {completeness.done}/{completeness.total}
        </Text>
      </View>
      <View style={s.meterTrack}>
        <Animated.View
          style={[
            s.meterFill,
            { width: meter.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
          ]}
        />
      </View>
      <Text style={s.meterHint}>
        {completeness.pct >= 1 ? 'All filled in. Nice work!' : 'Add the missing details to finish your ID.'}
      </Text>
    </View>
  );

  const infoTab = (
    <View style={wide ? { flex: 1, justifyContent: 'space-between' } : undefined}>
      <View>
        {notice ? (
          <View style={[s.notice, notice.type === 'error' ? s.noticeError : s.noticeOk]}>
            <Ionicons
              name={notice.type === 'error' ? 'alert-circle' : 'checkmark-circle'}
              size={19}
              color={notice.type === 'error' ? C.red : C.blueDeep}
              style={{ marginRight: 8 }}
            />
            <Text style={[s.noticeText, { color: notice.type === 'error' ? C.red : C.ink }]}>{notice.text}</Text>
          </View>
        ) : null}

        <Pair wide={wide}>
          <Field label="First name" icon="person-outline" value={form.firstName} onChangeText={(v) => setField('firstName', v)} error={errors.firstName} shakeSignal={shakes.firstName} {...lock} />
          <Field label="Last name" icon="person-outline" value={form.lastName} onChangeText={(v) => setField('lastName', v)} error={errors.lastName} shakeSignal={shakes.lastName} {...lock} />
        </Pair>
        <Pair wide={wide}>
          <Field label="Username" icon="at" value={form.username} autoCapitalize="none" autoCorrect={false} onChangeText={(v) => setField('username', v)} error={errors.username} shakeSignal={shakes.username} {...lock} />
          <Field label="Email" icon="mail-outline" value={form.email} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} onChangeText={(v) => setField('email', v)} error={errors.email} shakeSignal={shakes.email} {...lock} />
        </Pair>

        {isEditing ? (
          <View style={{ marginBottom: 14 }}>
            <Field
              label="Avatar link (optional)"
              icon="image-outline"
              value={avatarIsUpload ? '' : form.avatar}
              placeholder={avatarIsUpload ? 'Photo chosen from device' : 'https://…'}
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={(v) => setField('avatar', v)}
              {...lock}
            />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <Chunky
                face={C.paper}
                shadow={C.pinkDeep}
                radius={12}
                depth={4}
                onPress={chooseProfilePhoto}
                faceStyle={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 16 }}
              >
                <Ionicons name="camera-outline" size={18} color={C.ink} />
                <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.ink }}>Choose photo from device</Text>
              </Chunky>
              {form.avatar ? (
                <Chunky
                  face={C.pink}
                  shadow={C.pinkDeep}
                  radius={12}
                  depth={4}
                  onPress={removeProfilePhoto}
                  faceStyle={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 16 }}
                >
                  <Ionicons name="trash-outline" size={18} color={C.red} />
                  <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.ink }}>Remove photo</Text>
                </Chunky>
              ) : null}
            </View>
          </View>
        ) : null}
      </View>

      <View>
        {meterEl}
        <View style={s.stickerRow}>
          {stickerData.map((st) => (
            <StickerChip key={st.k} {...st} />
          ))}
        </View>
        {actionRow('Edit profile')}
      </View>
    </View>
  );

  const moreTab = isStudent ? (
    <View style={wide ? { flex: 1, justifyContent: 'space-between' } : undefined}>
      <View>
        {isEditing ? (
          <>
            <Pair wide={wide}>
              <View>
                <Field
                  label="TUPT-ID"
                  icon="card-outline"
                  value={form.tuptId}
                  placeholder="TUPT-22-0123"
                  autoCapitalize="characters"
                  onChangeText={(v) => setField('tuptId', v)}
                  error={errors.tuptId}
                  shakeSignal={shakes.tuptId}
                  {...lock}
                />
              </View>
              <View>
                <Field
                  label="Section"
                  icon="people-outline"
                  value={form.section}
                  placeholder="e.g. BSIT 1A"
                  onChangeText={(v) => setField('section', v)}
                  error={errors.section}
                  shakeSignal={shakes.section}
                  {...lock}
                />
                <OptionRow options={SECTIONS as any} value={form.section} onSelect={(value) => setField('section', value)} />
              </View>
            </Pair>
            <Pair wide={wide}>
              <View>
                <Field
                  label="Year level"
                  icon="school-outline"
                  value={form.yearLevel}
                  placeholder="e.g. 1st Year"
                  onChangeText={(v) => setField('yearLevel', v)}
                  error={errors.yearLevel}
                  shakeSignal={shakes.yearLevel}
                  {...lock}
                />
                <OptionRow options={YEAR_LEVEL_OPTIONS} value={form.yearLevel} onSelect={(value) => setField('yearLevel', value)} />
              </View>
              <View>
                <Field
                  label="Academic semester"
                  icon="calendar-outline"
                  value={form.activeSemester}
                  placeholder="e.g. 1st Semester"
                  onChangeText={(v) => setField('activeSemester', v)}
                  error={errors.activeSemester}
                  shakeSignal={shakes.activeSemester}
                  {...lock}
                />
                <OptionRow options={SEMESTER_OPTIONS} value={form.activeSemester} onSelect={(value) => setField('activeSemester', value)} />
              </View>
            </Pair>
          </>
        ) : null}
        <View style={s.tiles}>
          <Tile label="TUPT-ID" value={user.tuptId || 'Not set'} bg={C.pink} deep={C.pinkDeep} fg={C.ink} rot={-0.5} basis={tileBasis} />
          <Tile label="Section" value={user.section || 'Not set'} bg={C.cream} deep="#E8D77A" fg={C.ink} rot={0.5} basis={tileBasis} />
          <Tile label="Year level" value={user.yearLevel || 'Not available'} bg={C.coral} deep={C.coralDeep} fg={C.cream} rot={-1} basis={tileBasis} />
          <Tile label="Active semester" value={user.activeSemester || 'Not available'} bg={C.blue} deep={C.blueDeep} fg="#FFFFFF" rot={1} basis={tileBasis} />
          <Tile label="School year" value={user.schoolYear || 'Not available'} bg={C.cream} deep="#E8D77A" fg={C.ink} rot={0.8} basis={tileBasis} />
          <Tile label="Enrolled subjects" value={`${subjects.length} subject${subjects.length === 1 ? '' : 's'}`} bg={C.pink} deep={C.pinkDeep} fg={C.ink} rot={-0.8} basis={tileBasis} />
        </View>
      </View>

      <View>
        {subjects.length > 0 ? (
          <View style={s.chips}>
            {subjects.map((sub, i) => (
              <View key={`${sub.code}-${i}`} style={s.chip}>
                <Text style={s.chipText}>{sub.code}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {actionRow('Edit academics')}
      </View>
    </View>
  ) : (
    <View style={s.tiles}>
      <Tile label="Account role" value={roleLabels[role] || role} bg={C.blue} deep={C.blueDeep} fg="#FFFFFF" rot={-1} basis="47%" />
      <View style={[s.noteBox, { flexBasis: '47%', flexGrow: 1 }]}>
        <Text style={s.noteText}>What you can see and manage depends on this role.</Text>
      </View>
    </View>
  );

  const detailsSection = (
    <View style={[s.detailsSection, wide && { flex: 1, minWidth: 0 }]}>
      <View style={s.tabsRow}>
        <CardTab first label="My info" icon="id-card" active={tab === 'info'} tone={{ bg: C.coral, fg: C.cream }} onPress={() => switchTab('info')} />
        <CardTab label={isStudent ? 'Academics' : 'Role'} icon={isStudent ? 'school' : 'shield-checkmark'} active={tab === 'more'} tone={{ bg: C.blue, fg: '#FFFFFF' }} onPress={() => switchTab('more')} />
      </View>

      <View style={[s.cardWrap, wide && { flex: 1 }]}>
        <Mascot cue={cue} />
        <View style={s.cardShadow} />
        <View style={[s.formCard, wide && { flex: 1 }]}>
          <Animated.View
            style={[
              wide && { flex: 1 },
              { opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] },
            ]}
          >
            {tab === 'info' ? infoTab : moreTab}
          </Animated.View>
        </View>
        <Confetti burst={burst} />
      </View>
    </View>
  );

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */
  return (
    <View style={s.page}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Animated.View style={[s.blob, s.blobCoral, blob1]} />
        <Animated.View style={[s.blob, s.blobBlue, blob2]} />
      </View>

      <ScrollView contentContainerStyle={[s.scroll, { paddingHorizontal: wide ? 40 : 16 }]} showsVerticalScrollIndicator={false}>
        <View style={s.inner}>
          <View style={s.header}>
            <View style={s.backWrap}>
              <Chunky face={C.paper} shadow={C.pinkDeep} radius={14} depth={4} onPress={() => router.back()} faceStyle={s.backFace}>
                <Ionicons name="chevron-back" size={18} color={C.ink} />
                <Text style={s.backText}>Back</Text>
              </Chunky>
            </View>
            <Text style={[s.title, wide && { fontSize: 46, lineHeight: 50 }]}>My profile</Text>
            <Text style={s.subtitle}>Your ID, your details. Tap anything to change it.</Text>
          </View>

          <View style={wide ? s.bodyWide : s.bodyNarrow}>
            <View style={wide ? s.leftCol : s.leftColNarrow}>{idCard}</View>
            {detailsSection}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  centered: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontFamily: F.medium, fontSize: 15, color: C.ink },
  scroll: { paddingTop: 16, paddingBottom: 40 },
  inner: { width: '100%', maxWidth: 940, alignSelf: 'center' },

  blob: { position: 'absolute', borderRadius: 999 },
  blobCoral: { width: 300, height: 300, top: -110, right: -120, backgroundColor: C.coral, opacity: 0.9 },
  blobBlue: { width: 230, height: 230, bottom: -90, left: -90, backgroundColor: C.blue, opacity: 0.9 },

  // header (left aligned like the other pages)
  header: { width: '100%', alignItems: 'flex-start', marginBottom: 18 },
  backWrap: { marginBottom: 18 },
  backFace: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 7, paddingLeft: 8, paddingRight: 14 },
  backText: { fontFamily: F.bold, fontSize: 14, color: C.ink },
  title: { fontFamily: F.display, fontSize: 36, lineHeight: 40, color: C.ink },
  subtitle: { fontFamily: F.medium, fontSize: 15, color: C.muted, marginTop: 4 },

  // layout: ID left, details right
  bodyWide: { flexDirection: 'row', alignItems: 'stretch', gap: 32 },
  bodyNarrow: { flexDirection: 'column', gap: 26 },
  leftCol: { width: 280, paddingTop: 36, alignItems: 'center' },
  leftColNarrow: { paddingTop: 36, alignItems: 'center' },

  // ID card
  idWrap: { width: '100%', maxWidth: 280, alignSelf: 'center', position: 'relative' },
  strap: {
    position: 'absolute',
    top: -32,
    left: '50%',
    marginLeft: -15,
    width: 30,
    height: 56,
    backgroundColor: C.blue,
    borderWidth: 2.5,
    borderColor: C.ink,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  idShadow: { position: 'absolute', top: 9, left: 9, right: -9, bottom: -9, borderRadius: 28, backgroundColor: C.coral },
  idCard: {
    backgroundColor: C.paper,
    borderWidth: 3,
    borderColor: C.ink,
    borderRadius: 28,
    width: '100%',
    aspectRatio: 2.13 / 3.38,
    paddingTop: 44,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  slot: {
    position: 'absolute',
    top: 14,
    left: '50%',
    marginLeft: -32,
    width: 64,
    height: 14,
    borderRadius: 7,
    backgroundColor: C.ink,
    borderWidth: 2.5,
    borderColor: C.ink,
  },
  editBadge: {
    position: 'absolute',
    top: 12,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.cream,
    borderWidth: 2.5,
    borderColor: C.ink,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  editBadgeText: { fontFamily: F.bold, fontSize: 11, color: C.ink },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: C.coral,
    borderWidth: 3,
    borderColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { fontFamily: F.display, fontSize: 40, color: C.cream },
  camBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.yellow,
    borderWidth: 2.5,
    borderColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontFamily: F.display, fontSize: 24, lineHeight: 28, color: C.ink, textAlign: 'center', marginTop: 12 },
  handle: { fontFamily: F.medium, fontSize: 15, color: C.muted, marginTop: 2, marginBottom: 8 },
  roleSticker: {
    borderWidth: 2.5,
    borderColor: C.ink,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 5,
    transform: [{ rotate: '-3deg' }],
  },
  roleText: { fontFamily: F.bold, fontSize: 14 },
  idMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderStyle: 'dashed',
    borderColor: C.pinkDeep,
    paddingVertical: 8,
  },
  idMetaCol: { flex: 1, alignItems: 'center' },
  idMetaDivider: { width: 2, alignSelf: 'stretch', backgroundColor: C.pink },
  idMetaLabel: { fontFamily: F.medium, fontSize: 11, color: C.muted },
  idMetaValue: { fontFamily: F.bold, fontSize: 13, color: C.ink, marginTop: 1 },
  barcode: { flexDirection: 'row', alignItems: 'flex-end', maxWidth: '100%', overflow: 'hidden' },
  barcodeCaption: { fontFamily: F.bold, fontSize: 11, color: C.muted, marginTop: 5, letterSpacing: 0.6 },
  stamp: {
    position: 'absolute',
    borderWidth: 3.5,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: 'rgba(255,251,240,0.75)',
  },
  stampText: { fontFamily: F.display, fontSize: 17, letterSpacing: 1 },

  // details section
  detailsSection: { position: 'relative', zIndex: 2 },
  tabsRow: { flexDirection: 'row', alignItems: 'flex-end', paddingLeft: 6, zIndex: 5, position: 'relative', minHeight: 40 },
  cardTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingTop: 9,
    paddingHorizontal: 18,
    borderWidth: 2.5,
    borderBottomWidth: 0,
    borderColor: C.ink,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  cardTabText: { fontFamily: F.bold, fontSize: 14 },
  cardWrap: { width: '100%', position: 'relative', zIndex: 1 },
  cardShadow: { position: 'absolute', top: 9, left: 9, right: -9, bottom: -9, borderRadius: 26, backgroundColor: C.coral },
  formCard: {
    backgroundColor: C.paper,
    borderWidth: 3,
    borderColor: C.ink,
    borderRadius: 26,
    borderTopLeftRadius: 10,
    padding: 24,
    minHeight: 200,
    zIndex: 2,
  },
  confetti: { position: 'absolute', top: '40%', left: '50%', width: 0, height: 0, zIndex: 20 },

  // mascot
  mascotWrap: { position: 'absolute', right: 30, top: -62, width: 150, height: 66, zIndex: 1 },
  mascotClip: { width: 150, height: 66, overflow: 'hidden' },
  mascotHead: {
    position: 'absolute',
    left: 19,
    top: 6,
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: C.pink,
    borderWidth: 3,
    borderColor: C.ink,
  },
  gill: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.coral,
    borderWidth: 3,
    borderColor: C.ink,
  },
  lens: {
    position: 'absolute',
    top: 18,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: C.ink,
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bridge: { position: 'absolute', top: 34, left: 50, width: 10, height: 3, backgroundColor: C.ink },
  wink: { fontFamily: F.bold, fontSize: 24, lineHeight: 26, color: C.ink, marginTop: -3 },
  dot: { width: 11, height: 11, borderRadius: 6, backgroundColor: C.ink },
  cheek: { position: 'absolute', top: 58, width: 12, height: 7, borderRadius: 4, backgroundColor: C.coral, opacity: 0.55 },
  mouthBase: { position: 'absolute', top: 62, left: 48, backgroundColor: 'transparent' },
  mouthIdle: { width: 16, height: 8, borderBottomWidth: 3, borderColor: C.ink, borderRadius: 8 },
  mouthHappy: { width: 20, height: 10, backgroundColor: C.ink, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, left: 46 },
  mouthOops: { width: 11, height: 11, borderRadius: 6, borderWidth: 3, borderColor: C.ink, left: 50 },
  paw: {
    position: 'absolute',
    bottom: -8,
    width: 26,
    height: 22,
    borderRadius: 12,
    backgroundColor: C.pink,
    borderWidth: 3,
    borderColor: C.ink,
  },
  bubble: {
    position: 'absolute',
    top: -40,
    right: 10,
    backgroundColor: C.paper,
    borderWidth: 2.5,
    borderColor: C.ink,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    zIndex: 30,
  },
  bubbleText: { fontFamily: F.bold, fontSize: 12, color: C.ink },

  // fields
  label: { fontFamily: F.bold, fontSize: 14, color: C.ink, marginBottom: 6, marginLeft: 4 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2.5,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 54,
  },
  fieldLocked: { backgroundColor: C.paper, borderColor: C.pink, borderStyle: 'dashed' },
  input: { flex: 1, fontFamily: F.medium, fontSize: 16, color: C.ink, height: '100%', minWidth: 0 },
  fieldError: { fontFamily: F.medium, fontSize: 13, color: C.red, marginTop: 5, marginLeft: 4 },

  notice: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 12, marginBottom: 16 },
  noticeError: { backgroundColor: C.pink },
  noticeOk: { backgroundColor: C.cream, borderWidth: 2.5, borderColor: C.ink },
  noticeText: { flex: 1, fontFamily: F.medium, fontSize: 14 },

  // completeness meter
  meterBox: {
    backgroundColor: C.cream,
    borderWidth: 2.5,
    borderColor: C.ink,
    borderRadius: 18,
    padding: 14,
    marginTop: 6,
  },
  meterHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  meterTitle: { fontFamily: F.bold, fontSize: 14, color: C.ink },
  meterCount: { fontFamily: F.display, fontSize: 16, color: C.coralDeep },
  meterTrack: {
    height: 16,
    borderRadius: 999,
    backgroundColor: C.paper,
    borderWidth: 2.5,
    borderColor: C.ink,
    overflow: 'hidden',
  },
  meterFill: { height: '100%', backgroundColor: C.coral, borderRightWidth: 2.5, borderColor: C.ink },
  meterHint: { fontFamily: F.medium, fontSize: 13, color: C.muted, marginTop: 8 },

  // stickers
  stickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
    marginBottom: 14,
  },
  sticker: { borderWidth: 2.5, borderColor: C.ink, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, minWidth: 104 },
  stickerLabel: { fontFamily: F.bold, fontSize: 12, opacity: 0.9 },
  stickerValue: { fontFamily: F.display, fontSize: 18, lineHeight: 24 },

  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 14, marginTop: 4 },
  btnFace: { paddingHorizontal: 26, height: 52, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: F.display, fontSize: 18, letterSpacing: 0.3 },

  // tiles
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  tileLabel: { fontFamily: F.bold, fontSize: 13, opacity: 0.9 },
  tileValue: { fontFamily: F.display, fontSize: 24, lineHeight: 28 },
  noteBox: {
    borderWidth: 2.5,
    borderStyle: 'dashed',
    borderColor: C.ink,
    borderRadius: 20,
    padding: 16,
    justifyContent: 'center',
    minHeight: 100,
  },
  noteText: { fontFamily: F.medium, fontSize: 15, lineHeight: 22, color: C.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20, marginBottom: 10 },
  chip: { backgroundColor: C.cream, borderWidth: 2, borderColor: C.ink, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  chipText: { fontFamily: F.bold, fontSize: 13, color: C.ink },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: -6, marginBottom: 16 },
  option: { backgroundColor: C.paper, borderWidth: 1.5, borderColor: C.pinkDeep, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  optionSelected: { backgroundColor: C.blue, borderColor: C.ink },
  optionText: { fontFamily: F.medium, fontSize: 12, color: C.ink },
  optionTextSelected: { color: '#FFFFFF', fontFamily: F.bold },
});