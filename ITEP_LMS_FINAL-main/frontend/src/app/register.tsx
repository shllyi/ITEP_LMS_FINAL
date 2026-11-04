import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Animated,
  Easing,
  Keyboard,
  ActivityIndicator,
  AccessibilityInfo,
  TextInput,
  TextInputProps,
  TextInputInstance,
  useWindowDimensions,
  PressableStateCallbackType,
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
import { SECTIONS } from '@/constants/sections';

/* ------------------------------------------------------------------ */
/*  Brand tokens (same as login)                                       */
/* ------------------------------------------------------------------ */
const C = {
  yellow: '#FFE97F',
  coral: '#FF6B81',
  pink: '#FFD1D4',
  cream: '#FFF5BA',
  red: '#D4381C',
  blue: '#00A3EB',
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

// Keep these identical to login so the mascot sits in the same spot.
const MASCOT_SIZE = Platform.OS === 'web' ? 600 : 250;
const MASCOT_TOP = Platform.OS === 'web' ? -260 : -60;
const STAGE_HEIGHT = 140;
const CARD_OVERLAP = 48;

/* ------------------------------------------------------------------ */
/*  Registration copy (terms aligned with the welcome screen)          */
/* ------------------------------------------------------------------ */
const COPY = {
  roleLabel: 'Student portal',
  title: 'Create an Account',
  subtitle: 'Create a new profile in less than a minute and start your learning space.',
  submit: 'Create an Account',
  loadingTitle: 'Getting registration ready…',
  signInPrompt: 'Already have an account?',
  signInCta: 'Sign in',
  successTitle: 'Check your inbox!',
  successDefault: 'Registration successful! Please check your Gmail to verify your account before logging in.',
  successHint: 'Open your email inbox and click the verification link to activate your account.',
  successCta: 'Sign In to Access Portal',
  footerRoles: ['Faculty', 'Students', 'Program chairs'],
};

/* ------------------------------------------------------------------ */
/*  Terms and Conditions (from the original registration screen)       */
/* ------------------------------------------------------------------ */
const TERMS_MAX_HEIGHT = 170;
const TERMS_INTRO =
  'By creating an account and using this Learning Management System (LMS), you agree to the following:';
const TERMS = [
  'Provide accurate and complete personal and academic information.',
  'Use your account only for legitimate academic and educational purposes.',
  'Keep your password and account credentials confidential. You are responsible for activity under your account.',
  'Do not impersonate another person, share your account, or attempt to access another user’s account.',
  'Do not upload, share, or distribute content that is unlawful, abusive, misleading, or infringes another person’s rights.',
  'Do not interfere with the LMS, bypass security controls, or use the system to distribute malicious software.',
  'Understand that academic content, submissions, grades, and account activity may be recorded and processed to provide LMS services.',
  'Report suspected unauthorized access, security issues, or inaccurate account information to the school or system administrator.',
  'The school or system administrator may suspend or remove accounts that violate these terms or applicable school policies.',
  'These terms may be updated when necessary. Continued use of the LMS after an update means you accept the revised terms.',
];

const TAP_LINES = [
  'Hehe, that tickles!',
  'Boop!',
  'Almost there. Keep going!',
  'Pick a password you will remember.',
  'I like your style.',
];

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  tuptId: string;
  section: string;
  password: string;
  confirmPassword: string;
};
type FormErrors = Partial<Record<keyof FormData | 'terms', string>>;
const FIELD_KEYS: (keyof FormData)[] = ['firstName', 'lastName', 'email', 'username', 'tuptId', 'section', 'password', 'confirmPassword'];

const STRENGTH_LABELS = ['', 'Weak', 'Okay', 'Good', 'Strong'];
const strengthOf = (p: string) => {
  if (!p) return 0;
  let n = 0;
  if (p.length >= 6) n++;
  if (p.length >= 10) n++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) n++;
  if (/\d/.test(p) || /[^A-Za-z0-9]/.test(p)) n++;
  return Math.max(n, 1);
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const shake = (v: Animated.Value, amp = 10) =>
  Animated.sequence(
    [amp, -amp, amp * 0.7, -amp * 0.7, 0].map((to) =>
      Animated.timing(v, { toValue: to, duration: 55, useNativeDriver: true })
    )
  ).start();

/** Idle loops shared by the form and the success screen. */
function useAmbient() {
  const bob = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;
  const tailBob = useRef(new Animated.Value(-9)).current;
  const tailWiggle = useRef(new Animated.Value(-4)).current;

  useEffect(() => {
    let cancelled = false;
    const loops: Animated.CompositeAnimation[] = [];
    const sine = Easing.inOut(Easing.sin);

    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled || reduce) return;
      loops.push(
        Animated.loop(
          Animated.sequence([
            Animated.timing(bob, { toValue: 1, duration: 1700, easing: sine, useNativeDriver: true }),
            Animated.timing(bob, { toValue: 0, duration: 1700, easing: sine, useNativeDriver: true }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(drift, { toValue: 1, duration: 7000, easing: sine, useNativeDriver: true }),
            Animated.timing(drift, { toValue: 0, duration: 7000, easing: sine, useNativeDriver: true }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.parallel([
              Animated.timing(tailBob, { toValue: 7, duration: 1700, easing: sine, useNativeDriver: true }),
              Animated.timing(tailWiggle, { toValue: 4, duration: 1700, easing: sine, useNativeDriver: true }),
            ]),
            Animated.parallel([
              Animated.timing(tailBob, { toValue: -9, duration: 1700, easing: sine, useNativeDriver: true }),
              Animated.timing(tailWiggle, { toValue: -4, duration: 1700, easing: sine, useNativeDriver: true }),
            ]),
          ])
        )
      );
      loops.forEach((l) => l.start());
    });

    return () => {
      cancelled = true;
      loops.forEach((l) => l.stop());
    };
  }, [bob, drift, tailBob, tailWiggle]);

  return { bob, drift, tailBob, tailWiggle };
}

function Backdrop({ drift }: { drift: Animated.Value }) {
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
  const blob3 = { transform: [{ translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [0, 24] }) }] };
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[s.blob, s.blobCoral, blob1]} />
      <Animated.View style={[s.blob, s.blobBlue, blob2]} />
      <Animated.View style={[s.blob, s.blobPink, blob3]} />
      <View style={[s.blob, s.blobCream]} />
    </View>
  );
}

/** Chunky press-down button. */
function PressBtn({ label, onPress, loading }: { label: string; onPress: () => void; loading?: boolean }) {
  const press = useRef(new Animated.Value(0)).current;
  return (
    <Pressable
      disabled={loading}
      onPressIn={() => Animated.timing(press, { toValue: 1, duration: 70, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(press, { toValue: 0, friction: 5, useNativeDriver: true }).start()}
      onPress={onPress}
      style={s.btnWrap}
      accessibilityRole="button"
    >
      <View style={s.btnShadow} />
      <Animated.View
        style={[s.btnFace, { transform: [{ translateY: press.interpolate({ inputRange: [0, 1], outputRange: [0, 6] }) }] }]}
      >
        {loading ? <ActivityIndicator color={C.cream} /> : <Text style={s.btnText}>{label}</Text>}
      </Animated.View>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/*  Field                                                              */
/* ------------------------------------------------------------------ */
type FieldProps = TextInputProps & {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string;
  shakeSignal: number;
  right?: React.ReactNode;
  below?: React.ReactNode;
  inputRef?: React.RefObject<TextInputInstance | null>;
};

function Field({ label, icon, error, shakeSignal, right, below, inputRef, onFocus, onBlur, ...rest }: FieldProps) {
  const focus = useRef(new Animated.Value(0)).current;
  const x = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (shakeSignal > 0) shake(x, 8);
  }, [shakeSignal, x]);

  const animateFocus = (to: number) =>
    Animated.timing(focus, { toValue: to, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();

  const borderColor = error ? C.red : focus.interpolate({ inputRange: [0, 1], outputRange: [C.pink, C.blue] });
  const backgroundColor = focus.interpolate({ inputRange: [0, 1], outputRange: ['#FFF1F2', '#FFFFFF'] });

  return (
    <Animated.View style={{ transform: [{ translateX: x }], marginBottom: 16 }}>
      <Text style={s.label}>{label}</Text>
      <Animated.View style={[s.field, { borderColor, backgroundColor }]}>
        {icon ? <Ionicons name={icon} size={20} color={error ? C.red : C.coral} style={{ marginRight: 10 }} /> : null}
        <TextInput
          ref={inputRef as any}
          style={s.input}
          placeholderTextColor="#C79AA2"
          selectionColor={C.coral}
          onFocus={(e) => {
            animateFocus(1);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            animateFocus(0);
            onBlur?.(e);
          }}
          {...rest}
        />
        {right}
      </Animated.View>
      {below}
      {error ? <Text style={s.fieldError}>{error}</Text> : null}
    </Animated.View>
  );
}

// Wide two-column layout. Gated on hydration so server and first client render match.
function useWide() {
  const { width } = useWindowDimensions();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated && width >= 720;
}

/* ------------------------------------------------------------------ */
/*  Screen                                                             */
/* ------------------------------------------------------------------ */
export default function RegisterScreen() {
  const { register, isLoading } = useAuth();
  const wide = useWide();
  const [fontsLoaded] = useFonts({ Outfit_400Regular, Outfit_500Medium, Outfit_700Bold, TitanOne_400Regular });

  const [form, setForm] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    tuptId: '',
    section: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [shakes, setShakes] = useState<Record<keyof FormData, number>>({
    firstName: 0,
    lastName: 0,
    email: 0,
    username: 0,
    tuptId: 0,
    section: 0,
    password: 0,
    confirmPassword: 0,
  });
  const [showPw, setShowPw] = useState(false);
  const [pwFocused, setPwFocused] = useState(false);
  const [apiError, setApiError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [bubbleText, setBubbleText] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsAtBottom, setTermsAtBottom] = useState(false);

  const lastRef = useRef<TextInputInstance>(null);
  const emailRef = useRef<TextInputInstance>(null);
  const userRef = useRef<TextInputInstance>(null);
  const passRef = useRef<TextInputInstance>(null);
  const confirmRef = useRef<TextInputInstance>(null);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapIndex = useRef(0);
  const lastTier = useRef(0);

  const { bob, drift, tailBob, tailWiggle } = useAmbient();

  // mascot values
  const poseY = useRef(new Animated.Value(100)).current; // starts hidden behind the card
  const jump = useRef(new Animated.Value(0)).current;
  const lean = useRef(new Animated.Value(0)).current;
  const nod = useRef(new Animated.Value(0)).current;
  const mascotX = useRef(new Animated.Value(0)).current;
  const sx = useRef(new Animated.Value(1)).current;
  const sy = useRef(new Animated.Value(1)).current;
  const tailX = useRef(new Animated.Value(0)).current;
  const tailY = useRef(new Animated.Value(0)).current;
  const tailRotate = useRef(new Animated.Value(0)).current;
  const tailScale = useRef(new Animated.Value(1)).current;
  const bubble = useRef(new Animated.Value(0)).current;
  const meter = useRef(new Animated.Value(0)).current;
  const enter = useRef(new Animated.Value(0)).current;
  const envelope = useRef(new Animated.Value(0)).current;

  /* ---- bubble ---- */
  const say = (text: string, ms = 2400) => {
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    setBubbleText(text);
    bubble.setValue(0);
    Animated.spring(bubble, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }).start();
    bubbleTimer.current = setTimeout(() => {
      Animated.timing(bubble, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }, ms);
  };

  /* ---- entrance ---- */
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.spring(poseY, { toValue: 0, friction: 4, tension: 70, useNativeDriver: true }).start();
      setTimeout(() => say("Let's get you set up!"), 500);
    }, 300);
    return () => {
      clearTimeout(t);
      if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- mascot poses ---- */
  const pose = (to: number) => Animated.spring(poseY, { toValue: to, friction: 6, tension: 90, useNativeDriver: true }).start();
  const poseTail = (y: number, rotate: number) =>
    Animated.parallel([
      Animated.spring(tailY, { toValue: y, friction: 6, tension: 90, useNativeDriver: true }),
      Animated.spring(tailRotate, { toValue: rotate, friction: 6, tension: 90, useNativeDriver: true }),
    ]).start();

  const doNod = () =>
    Animated.sequence([
      Animated.timing(nod, { toValue: 4, duration: 70, useNativeDriver: true }),
      Animated.timing(nod, { toValue: 0, duration: 110, useNativeDriver: true }),
    ]).start();

  const squish = () => {
    sx.setValue(1.18);
    sy.setValue(0.8);
    Animated.parallel([
      Animated.spring(sx, { toValue: 1, friction: 3, tension: 120, useNativeDriver: true }),
      Animated.spring(sy, { toValue: 1, friction: 3, tension: 120, useNativeDriver: true }),
    ]).start();
  };

  const onMascotPress = () => {
    squish();
    Animated.sequence([
      Animated.timing(tailScale, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.spring(tailScale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
    say(TAP_LINES[tapIndex.current++ % TAP_LINES.length]);
  };

  const mascotError = () => {
    shake(mascotX, 12);
    shake(tailX, 14);
    squish();
    Animated.sequence([
      Animated.timing(tailRotate, { toValue: -10, duration: 70, useNativeDriver: true }),
      Animated.timing(tailRotate, { toValue: 10, duration: 90, useNativeDriver: true }),
      Animated.spring(tailRotate, { toValue: 0, friction: 4, useNativeDriver: true }),
    ]).start();
  };

  const mascotSuccess = () => {
    Animated.sequence([
      Animated.timing(jump, { toValue: -46, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(jump, { toValue: 0, friction: 3, tension: 110, useNativeDriver: true }),
    ]).start();
    Animated.sequence([
      Animated.timing(lean, { toValue: 12, duration: 120, useNativeDriver: true }),
      Animated.timing(lean, { toValue: -12, duration: 160, useNativeDriver: true }),
      Animated.timing(lean, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start();
    Animated.sequence([
      Animated.parallel([
        Animated.timing(tailY, { toValue: -28, duration: 180, useNativeDriver: true }),
        Animated.timing(tailRotate, { toValue: -18, duration: 180, useNativeDriver: true }),
        Animated.timing(tailScale, { toValue: 1.08, duration: 180, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(tailY, { toValue: 0, friction: 4, useNativeDriver: true }),
        Animated.spring(tailRotate, { toValue: 0, friction: 4, useNativeDriver: true }),
        Animated.spring(tailScale, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]),
    ]).start();
  };

  /* ---- focus behaviours ---- */
  const curious = (line: string) => () => {
    setPwFocused(false);
    pose(-14);
    poseTail(-18, -12);
    say(line);
  };
  const shy = (line: string) => () => {
    setPwFocused(true);
    pose(showPw ? 36 : 82);
    poseTail(showPw ? 24 : 42, showPw ? 12 : 20);
    say(showPw ? 'Okay, I can see it.' : line);
  };
  const relax = () => {
    setPwFocused(false);
    pose(0);
    poseTail(0, 0);
    Animated.spring(lean, { toValue: 0, useNativeDriver: true }).start();
  };

  /* ---- field updates ---- */
  const update = (field: keyof FormData) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    doNod();

    if (field === 'password') {
      const tier = strengthOf(value);
      Animated.spring(meter, { toValue: tier, friction: 7, tension: 90, useNativeDriver: false }).start();
      if (tier !== lastTier.current && value.length > 0) {
        say(
          tier >= 4 ? 'Wow, a strong one!' : tier === 3 ? 'Getting good.' : tier === 2 ? 'Okay. Add some more.' : 'Too easy to guess.',
          1800
        );
      }
      lastTier.current = tier;
    } else if (field !== 'confirmPassword') {
      Animated.spring(lean, { toValue: (Math.min(value.length, 24) / 24) * 9, friction: 7, useNativeDriver: true }).start();
      Animated.spring(tailRotate, { toValue: (Math.min(value.length, 24) / 24) * 8, friction: 7, useNativeDriver: true }).start();
    }
  };

  const togglePw = () => {
    const next = !showPw;
    setShowPw(next);
    if (pwFocused) {
      pose(next ? 36 : 82);
      poseTail(next ? 24 : 42, next ? 12 : 20);
    }
    say(next ? 'Oh! I can see it now.' : 'Eyes closed again.');
  };

  /* ---- submit ---- */
  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email address';
    if (!form.username.trim()) e.username = 'Username is required';
    else if (form.username.length < 3) e.username = 'Username must be at least 3 characters';
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim()) e.lastName = 'Last name is required';
    if (!form.tuptId.trim()) e.tuptId = 'TUPT-ID is required';
    else if (!/^TUPT-\d{2}-\d{3,5}$/i.test(form.tuptId.trim())) e.tuptId = 'Use format TUPT-22-0123';
    if (!form.section) e.section = 'Please choose your section';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (!form.confirmPassword) e.confirmPassword = 'Please confirm your password';
    else if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!termsAccepted) e.terms = 'You must accept the Terms and Conditions to create an account';

    setErrors(e);
    setShakes((prev) => {
      const next = { ...prev };
      FIELD_KEYS.forEach((k) => {
        if (e[k]) next[k] = prev[k] + 1;
      });
      return next;
    });
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    Keyboard.dismiss();
    setApiError('');
    setSuccessMessage('');
    if (!validate()) {
      mascotError();
      say('A few things need fixing.');
      return;
    }

    setBusy(true);
    const result = await register({
      ...form,
      tuptId: form.tuptId.trim().toUpperCase(),
    });
    setBusy(false);

    if (result.success) {
      mascotSuccess();
      say('Account made! Yay!', 1200);
      const msg = result.message || COPY.successDefault;
      setTimeout(() => {
        setSuccessMessage(msg);
        Animated.spring(enter, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }).start();
        Animated.sequence([
          Animated.timing(envelope, { toValue: 1, duration: 140, delay: 400, useNativeDriver: true }),
          Animated.timing(envelope, { toValue: -1, duration: 180, useNativeDriver: true }),
          Animated.spring(envelope, { toValue: 0, friction: 3, useNativeDriver: true }),
        ]).start();
      }, 800);
    } else {
      setApiError(result.message);
      mascotError();
      say("That didn't work. Check and try again.", 3200);
    }
  };

  if (!fontsLoaded) return <PageLoading title={COPY.loadingTitle} subtitle="Just a moment" />;

  const loading = busy || isLoading;

  /* ---- derived animated styles ---- */
  const bobY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -7] });
  const bobTilt = bob.interpolate({ inputRange: [0, 1], outputRange: [-2, 2] });
  const translateY = Animated.add(Animated.add(bobY, poseY), jump);
  const rotate = Animated.add(Animated.add(bobTilt, lean), nod).interpolate({
    inputRange: [-45, 45],
    outputRange: ['-45deg', '45deg'],
  });

  const tier = strengthOf(form.password);
  const meterColor = meter.interpolate({
    inputRange: [0, 1, 2, 3, 4],
    outputRange: [C.pink, C.red, C.coral, C.yellow, C.blue],
  });
  const matches = form.confirmPassword.length > 0 && form.confirmPassword === form.password;
  const mismatch = form.confirmPassword.length > 0 && !matches;

  const eye = (
    <Pressable onPress={togglePw} hitSlop={12} accessibilityLabel="Show or hide password">
      <Ionicons name={showPw ? 'eye' : 'eye-off'} size={22} color={showPw ? C.blue : C.muted} />
    </Pressable>
  );

  const bubbleStyle = Platform.OS === 'web' ? { left: '50%' as const, marginLeft: 80, top: 100 } : { right: 14, top: 4 };

  /* ---------------------------------------------------------------- */
  /*  Success                                                          */
  /* ---------------------------------------------------------------- */
  if (successMessage) {
    return (
      <KeyboardAvoidingView style={s.flex}>
        <Backdrop drift={drift} />
        <SafeAreaView style={s.flex}>
          <ScrollView contentContainerStyle={s.scroll}>
            <View style={s.container}>
              <Animated.Image
                source={require('@/assets/images/mascot_gif.gif')}
                resizeMode="contain"
                style={{
                  width: 220,
                  height: 190,
                  marginBottom: -34,
                  zIndex: 1,
                  transform: [
                    { translateY: Animated.add(bobY, enter.interpolate({ inputRange: [0, 1], outputRange: [60, 0] })) },
                  ],
                }}
              />
              <Animated.View
                style={[
                  s.cardWrap,
                  {
                    marginTop: 0,
                    opacity: enter,
                    transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
                  },
                ]}
              >
                <View style={s.cardShadow} />
                <View style={[s.card, { alignItems: 'center' }]}>
                  <Animated.View
                    style={[
                      s.envelope,
                      {
                        transform: [
                          { rotate: envelope.interpolate({ inputRange: [-1, 1], outputRange: ['-12deg', '12deg'] }) },
                          { scale: envelope.interpolate({ inputRange: [-1, 0, 1], outputRange: [1.1, 1, 1.1] }) },
                        ],
                      },
                    ]}
                  >
                    <Ionicons name="mail-open" size={38} color={C.cream} />
                  </Animated.View>
                  <Text style={[s.title, { textAlign: 'center' }]}>{COPY.successTitle}</Text>
                  <Text style={[s.subtitle, { textAlign: 'center', marginBottom: 18 }]}>{successMessage}</Text>
                  <View style={s.hintBox}>
                    <Ionicons name="information-circle" size={20} color={C.ink} style={{ marginRight: 10 }} />
                    <Text style={s.hintText}>{COPY.successHint}</Text>
                  </View>
                  <View style={{ width: '100%', marginTop: 20 }}>
                    <PressBtn label={COPY.successCta} onPress={() => router.push('/login')} />
                  </View>
                </View>
              </Animated.View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Form                                                             */
  /* ---------------------------------------------------------------- */
  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Backdrop drift={drift} />

      <SafeAreaView style={s.flex}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={[s.container, s.formTop, wide && s.containerWide]}>
            {/* Mascot peeks over the card */}
            <View style={s.stage}>
              <Pressable onPress={onMascotPress} style={s.mascotPress} accessibilityLabel="Mascot">
                <Animated.View
                  style={[
                    s.mascotBox,
                    {
                      transform: [
                        { translateX: mascotX },
                        { translateY },
                        { rotate },
                        { scaleX: sx },
                        { scaleY: sy },
                      ],
                    },
                  ]}
                >
                  <Image
                    source={loading ? require('@/assets/images/mascot_gif.gif') : require('@/assets/images/mascot.png')}
                    style={img.mascotImg}
                    resizeMode="contain"
                  />
                </Animated.View>
              </Pressable>
            </View>

            {/* Form card with a hard offset shadow */}
            <View style={s.cardWrap}>
              <View style={s.cardShadow} />
              {Platform.OS === 'web' ? (
                <>
                  <View style={[s.mascotHand, s.mascotHandLeft]} />
                  <View style={[s.mascotHand, s.mascotHandRight]} />
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      s.cardTail,
                      {
                        transform: [
                          { translateX: tailX },
                          { translateY: tailBob },
                          { translateY: tailY },
                          {
                            rotate: tailWiggle.interpolate({
                              inputRange: [-360, 360],
                              outputRange: ['-360deg', '360deg'],
                            }),
                          },
                          {
                            rotate: tailRotate.interpolate({
                              inputRange: [-360, 360],
                              outputRange: ['-360deg', '360deg'],
                            }),
                          },
                          { scale: tailScale },
                        ],
                      },
                    ]}
                  >
                    <Image source={require('@/assets/images/tail.png')} style={img.cardTailImage} resizeMode="contain" />
                  </Animated.View>
                </>
              ) : null}

              <View style={[s.card, wide && s.cardWide]}>
                {/* Role pill (from welcome screen) */}
                <View style={s.roleRow}>
                  <View style={s.roleDot} />
                  <Text style={s.roleText}>{COPY.roleLabel}</Text>
                </View>

                <Text style={s.title}>{COPY.title}</Text>
                <Text style={s.subtitle}>{COPY.subtitle}</Text>

                {apiError ? (
                  <View style={s.errorBanner}>
                    <Ionicons name="alert-circle" size={18} color={C.red} style={{ marginRight: 8 }} />
                    <Text style={s.errorText}>{apiError}</Text>
                  </View>
                ) : null}

                <View style={s.row}>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="First name"
                      placeholder="Juan"
                      value={form.firstName}
                      onChangeText={update('firstName')}
                      error={errors.firstName}
                      shakeSignal={shakes.firstName}
                      returnKeyType="next"
                      onSubmitEditing={() => lastRef.current?.focus()}
                      onFocus={curious('Hi! What is your name?')}
                      onBlur={relax}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="Last name"
                      placeholder="Dela Cruz"
                      value={form.lastName}
                      onChangeText={update('lastName')}
                      error={errors.lastName}
                      shakeSignal={shakes.lastName}
                      inputRef={lastRef}
                      returnKeyType="next"
                      onSubmitEditing={() => emailRef.current?.focus()}
                      onFocus={curious('Nice to meet you!')}
                      onBlur={relax}
                    />
                  </View>
                </View>

                <View style={wide ? s.row : undefined}>
                  <View style={wide ? s.col : undefined}>
                    <Field
                      label="Email address"
                      icon="mail-outline"
                      placeholder="juan@gmail.com"
                      value={form.email}
                      onChangeText={update('email')}
                      error={errors.email}
                      shakeSignal={shakes.email}
                      inputRef={emailRef}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="next"
                      onSubmitEditing={() => userRef.current?.focus()}
                      onFocus={curious('Where do I send your verification letter?')}
                      onBlur={relax}
                    />
                  </View>

                  <View style={wide ? s.col : undefined}>
                    <Field
                      label="Username"
                      icon="at"
                      placeholder="juan.delacruz"
                      value={form.username}
                      onChangeText={update('username')}
                      error={errors.username}
                      shakeSignal={shakes.username}
                      inputRef={userRef}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="next"
                      onFocus={curious('Pick something fun.')}
                      onBlur={relax}
                    />
                  </View>
                </View>

                <View style={{ marginBottom: 16 }}>
                  <Text style={s.label}>Section</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                    {SECTIONS.map((sec) => {
                      const active = form.section === sec;
                      return (
                        <Pressable
                          key={sec}
                          onPress={() => update('section')(sec)}
                          style={[s.sectionChip, active && s.sectionChipActive]}
                        >
                          <Text style={[s.sectionChipText, active && s.sectionChipTextActive]}>{sec}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {errors.section ? <Text style={s.fieldError}>{errors.section}</Text> : null}
                </View>

                <Field
                  label="TUPT-ID"
                  icon="card-outline"
                  placeholder="TUPT-22-0123"
                  value={form.tuptId}
                  onChangeText={update('tuptId')}
                  error={errors.tuptId}
                  shakeSignal={shakes.tuptId}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passRef.current?.focus()}
                  onFocus={curious('Enter your student TUPT-ID.')}
                  onBlur={relax}
                />

                <View style={wide ? s.row : undefined}>
                  <View style={wide ? s.col : undefined}>
                    <Field
                      label="Password"
                      icon="lock-closed-outline"
                      placeholder="At least 6 characters"
                      value={form.password}
                      onChangeText={update('password')}
                      error={errors.password}
                      shakeSignal={shakes.password}
                      inputRef={passRef}
                      secureTextEntry={!showPw}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="next"
                      onSubmitEditing={() => confirmRef.current?.focus()}
                      onFocus={shy("I'm not looking. Promise.")}
                      onBlur={relax}
                      right={eye}
                      below={
                        form.password ? (
                          <View style={s.meterRow}>
                            <View style={s.meterTrack}>
                              <Animated.View
                                style={[
                                  s.meterFill,
                                  {
                                    backgroundColor: meterColor,
                                    width: meter.interpolate({ inputRange: [0, 4], outputRange: ['0%', '100%'] }),
                                  },
                                ]}
                              />
                            </View>
                            <Text style={s.meterLabel}>{STRENGTH_LABELS[tier]}</Text>
                          </View>
                        ) : null
                      }
                    />
                  </View>

                  <View style={wide ? s.col : undefined}>
                    <Field
                      label="Confirm password"
                      icon="shield-checkmark-outline"
                      placeholder="Type it once more"
                      value={form.confirmPassword}
                      onChangeText={update('confirmPassword')}
                      error={errors.confirmPassword}
                      shakeSignal={shakes.confirmPassword}
                      inputRef={confirmRef}
                      secureTextEntry={!showPw}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="done"
                      onSubmitEditing={handleRegister}
                      onFocus={shy('Once more, just to be sure.')}
                      onBlur={relax}
                      right={
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          {matches ? <Ionicons name="checkmark-circle" size={22} color={C.blue} /> : null}
                          {mismatch ? <Ionicons name="close-circle" size={22} color={C.red} /> : null}
                          {eye}
                        </View>
                      }
                    />
                  </View>
                </View>

                {/* Terms and Conditions */}
                <View style={s.termsCard}>
                  <Text style={s.termsTitle}>Terms and Conditions</Text>
                  <ScrollView
                    style={s.termsScroll}
                    nestedScrollEnabled
                    scrollEventThrottle={16}
                    onScroll={({ nativeEvent }) => {
                      const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
                      if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 8) {
                        setTermsAtBottom(true);
                      }
                    }}
                    onContentSizeChange={(_, h) => {
                      if (h <= TERMS_MAX_HEIGHT) setTermsAtBottom(true);
                    }}
                  >
                    <Text style={s.termsText}>{TERMS_INTRO}</Text>
                    {TERMS.map((t, i) => (
                      <Text key={i} style={s.termsItem}>
                        {i + 1}. {t}
                      </Text>
                    ))}
                  </ScrollView>

                  {termsAtBottom ? (
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: termsAccepted }}
                      onPress={() => {
                        const next = !termsAccepted;
                        setTermsAccepted(next);
                        if (errors.terms) setErrors((prev) => ({ ...prev, terms: undefined }));
                        say(next ? 'Thanks for reading!' : 'Changed your mind?', 1600);
                      }}
                      style={s.termsCheckRow}
                    >
                      <View style={[s.checkbox, termsAccepted && s.checkboxChecked]}>
                        {termsAccepted ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
                      </View>
                      <Text style={s.termsAgree}>I have read and agree to the Terms and Conditions.</Text>
                    </Pressable>
                  ) : (
                    <Text style={s.termsHint}>Scroll to the bottom to accept the Terms and Conditions.</Text>
                  )}
                  {errors.terms ? <Text style={s.fieldError}>{errors.terms}</Text> : null}
                </View>

                <PressBtn label={COPY.submit} onPress={handleRegister} loading={loading} />

                {/* Audience strip (from welcome screen) */}
                <View style={s.cardFooter}>
                  {COPY.footerRoles.map((role, i) => (
                    <React.Fragment key={role}>
                      {i > 0 ? <View style={s.footerDivider} /> : null}
                      <Text style={s.cardFooterText}>{role}</Text>
                    </React.Fragment>
                  ))}
                </View>
              </View>
            </View>

            {/* Speech bubble */}
            <Animated.View
              pointerEvents="none"
              style={[
                s.bubble,
                bubbleStyle,
                {
                  zIndex: 10,
                  opacity: bubble,
                  transform: [{ scale: bubble.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
                },
              ]}
            >
              <Text style={s.bubbleText}>{bubbleText}</Text>
              <View style={s.bubbleTail} />
            </Animated.View>

            {/* Footer */}
            <View style={s.footer}>
              <Text style={s.footerText}>{COPY.signInPrompt}</Text>
              <Pressable
                onPress={() => router.push('/login')}
                style={({ pressed }: PressableStateCallbackType) => [s.footerChip, pressed && { transform: [{ scale: 0.95 }] }]}
              >
                <Text style={s.footerChipText}>{COPY.signInCta}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

// Image styles live in their own sheet so <Image> only ever receives ImageStyle.
const img = StyleSheet.create({
  mascotImg: { width: '100%', height: '100%' },
  cardTailImage: { width: '100%', height: '100%' },
});

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.yellow },
  scroll: { flexGrow: 1, justifyContent: 'center' },
  container: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 24,
  },

  // the big web mascot sticks out ~78px above its layout box, so add that back to centre the whole group.
  formTop: { paddingTop: Platform.OS === 'web' ? 102 : undefined },
  containerWide: { maxWidth: 820 },
  cardWide: { paddingHorizontal: 32 },
  col: { flex: 1 },

  // background
  blob: { position: 'absolute', borderRadius: 999 },
  blobCoral: { width: 320, height: 320, top: -120, right: -130, backgroundColor: C.coral },
  blobBlue: { width: 250, height: 250, bottom: -90, left: -100, backgroundColor: C.blue },
  blobPink: { width: 170, height: 170, top: '46%', left: -80, backgroundColor: C.pink },
  blobCream: { width: 110, height: 110, bottom: 90, right: -30, backgroundColor: C.cream },

  // mascot
  stage: { width: '100%', height: STAGE_HEIGHT, alignItems: 'center', zIndex: 1 },
  mascotPress: { position: 'absolute', top: MASCOT_TOP, width: MASCOT_SIZE, height: MASCOT_SIZE, alignSelf: 'center' },
  mascotBox: { position: 'absolute', top: 0, width: MASCOT_SIZE, height: MASCOT_SIZE, alignSelf: 'center' },
  bubble: {
    position: 'absolute',
    width: 170,
    elevation: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: C.ink,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleText: { fontFamily: F.medium, fontSize: 13, color: C.ink },
  bubbleTail: {
    position: 'absolute',
    left: -8,
    top: '50%',
    marginTop: -7,
    width: 14,
    height: 14,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 2.5,
    borderBottomWidth: 2.5,
    borderColor: C.ink,
    transform: [{ rotate: '45deg' }],
  },

  // card
  cardWrap: { width: '100%', marginTop: -CARD_OVERLAP, zIndex: 2, position: 'relative' },
  mascotHand: {
    position: 'absolute',
    top: -24,
    width: 52,
    height: 52,
    borderRadius: 999,
    backgroundColor: C.coral,
    borderWidth: 3,
    borderColor: C.ink,
    zIndex: 1,
  },
  mascotHandLeft: { left: '50%', marginLeft: -122 },
  mascotHandRight: { left: '50%', marginLeft: 70 },
  cardShadow: { position: 'absolute', top: 9, left: 9, right: -9, bottom: -9, borderRadius: 28, backgroundColor: C.coral },
  card: {
    position: 'relative',
    zIndex: 2,
    backgroundColor: C.paper,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: C.ink,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 24,
  },
  cardTail: { position: 'absolute', width: 500, height: 350, right: -380, top: 58, zIndex: 1 },
  title: { fontFamily: F.display, fontSize: 31, color: C.ink, letterSpacing: 0.3 },
  subtitle: { fontFamily: F.body, fontSize: 15, color: C.muted, marginTop: 2, marginBottom: 20 },
  row: { flexDirection: 'row', gap: 12 },

  // role pill (from welcome screen)
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  roleDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.coral },
  roleText: { fontFamily: F.bold, fontSize: 13, color: C.coral },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.pink,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { flex: 1, fontFamily: F.medium, fontSize: 14, color: C.red },

  label: { fontFamily: F.bold, fontSize: 14, color: C.ink, marginBottom: 6, marginLeft: 4 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2.5,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 54,
  },
  input: { flex: 1, fontFamily: F.medium, fontSize: 16, color: C.ink, height: '100%', minWidth: 0 },
  fieldError: { fontFamily: F.medium, fontSize: 13, color: C.red, marginTop: 5, marginLeft: 4 },
  sectionChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#F0D5D8',
    backgroundColor: '#FFF1F2',
  },
  sectionChipActive: {
    borderColor: C.coral,
    backgroundColor: C.coral,
  },
  sectionChipText: {
    fontFamily: F.bold,
    fontSize: 12,
    color: C.ink,
  },
  sectionChipTextActive: {
    color: '#FFFFFF',
  },

  // password strength
  meterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, marginLeft: 4 },
  meterTrack: {
    flex: 1,
    height: 12,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: C.ink,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  meterFill: { height: '100%' },
  meterLabel: { fontFamily: F.bold, fontSize: 13, color: C.ink, width: 52 },

  // terms
  termsCard: {
    backgroundColor: '#FFF1F2',
    borderWidth: 2.5,
    borderColor: C.pink,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  termsTitle: { fontFamily: F.bold, fontSize: 14, color: C.ink, marginBottom: 6 },
  termsScroll: { maxHeight: TERMS_MAX_HEIGHT, marginBottom: 10 },
  termsText: { fontFamily: F.body, fontSize: 12, lineHeight: 18, color: C.muted, marginBottom: 8 },
  termsItem: { fontFamily: F.body, fontSize: 12, lineHeight: 18, color: C.muted, marginBottom: 7 },
  termsHint: { fontFamily: F.medium, fontSize: 12, color: C.muted, fontStyle: 'italic' },
  termsCheckRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: C.ink,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxChecked: { backgroundColor: C.coral },
  termsAgree: { flex: 1, fontFamily: F.medium, fontSize: 13, lineHeight: 19, color: C.ink },

  // button
  btnWrap: { height: 62, marginTop: 6, width: '100%' },
  btnShadow: { position: 'absolute', left: 0, right: 0, top: 6, height: 56, borderRadius: 18, backgroundColor: C.red },
  btnFace: {
    height: 56,
    borderRadius: 18,
    backgroundColor: C.coral,
    borderWidth: 2.5,
    borderColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontFamily: F.display, fontSize: 21, color: C.cream, letterSpacing: 0.4 },

  // card footer (audience strip)
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1.5,
    borderTopColor: C.pink,
  },
  cardFooterText: { fontFamily: F.bold, fontSize: 11, color: C.muted },
  footerDivider: { width: 3, height: 3, borderRadius: 2, backgroundColor: C.muted },

  // success
  envelope: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: C.coral,
    borderWidth: 3,
    borderColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: C.cream,
    borderWidth: 2.5,
    borderColor: C.ink,
    borderRadius: 16,
    padding: 14,
  },
  hintText: { flex: 1, fontFamily: F.medium, fontSize: 14, lineHeight: 20, color: C.ink },

  // footer
  footer: { flexDirection: 'row', alignItems: 'center', marginTop: 30, gap: 10 },
  footerText: { fontFamily: F.medium, fontSize: 15, color: C.ink },
  footerChip: {
    backgroundColor: C.blue,
    borderWidth: 2.5,
    borderColor: C.ink,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  footerChipText: { fontFamily: F.bold, fontSize: 15, color: '#FFFFFF' },
});