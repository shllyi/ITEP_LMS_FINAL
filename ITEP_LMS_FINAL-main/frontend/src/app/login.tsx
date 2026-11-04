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
  PressableStateCallbackType,
  GestureResponderEvent,
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

/* ------------------------------------------------------------------ */
/*  Brand tokens (from the brand sheet)                                */
/* ------------------------------------------------------------------ */
const C = {
  yellow: '#FFE97F',
  coral: '#FF6B81',
  pink: '#FFD1D4',
  cream: '#FFF5BA',
  red: '#D4381C',
  blue: '#00A3EB',
  ink: '#4A1A24', // deep berry, used for text instead of black
  muted: '#8F5F68',
  paper: '#FFFBF0',
};
const F = {
  body: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  bold: 'Outfit_700Bold',
  display: 'TitanOne_400Regular',
};

// Tune these if your mascot.png has different padding around the face.
// On web the mascot is slightly smaller and the stage has extra headroom,
// so the head never slides under the site's top nav bar.
const MASCOT_SIZE = Platform.OS === 'web' ? 480 : 250;
const MASCOT_LIFT = Platform.OS === 'web' ? 90 : 0; // extra headroom above the mascot
const MASCOT_TOP = Platform.OS === 'web' ? -100 : -60;
const STAGE_HEIGHT = 140 + MASCOT_LIFT;
const CARD_OVERLAP = 48; // how far the card climbs over the mascot's chin

const TAP_LINES = [
  'Hehe, that tickles!',
  'Boop!',
  'Need a hint? Try your TUPT-ID or username.',
  'Study snacks first, login second.',
  'I like your style.',
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const shake = (v: Animated.Value, amp = 10) =>
  Animated.sequence(
    [amp, -amp, amp * 0.7, -amp * 0.7, 0].map((to) =>
      Animated.timing(v, { toValue: to, duration: 55, useNativeDriver: true })
    )
  ).start();

/* ------------------------------------------------------------------ */
/*  Field: chunky input that reacts to focus and errors                */
/* ------------------------------------------------------------------ */
type FieldProps = TextInputProps & {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  error?: string;
  shakeSignal: number;
  right?: React.ReactNode;
  inputRef?: React.RefObject<TextInputInstance | null>;
};

function Field({
  label,
  icon,
  error,
  shakeSignal,
  right,
  inputRef,
  onFocus,
  onBlur,
  ...rest
}: FieldProps) {
  const focus = useRef(new Animated.Value(0)).current;
  const x = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (shakeSignal > 0) shake(x, 8);
  }, [shakeSignal, x]);

  const animateFocus = (to: number) =>
    Animated.timing(focus, {
      toValue: to,
      duration: 160,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();

  const borderColor = error
    ? C.red
    : focus.interpolate({ inputRange: [0, 1], outputRange: [C.pink, C.blue] });
  const backgroundColor = focus.interpolate({
    inputRange: [0, 1],
    outputRange: ['#FFF1F2', '#FFFFFF'],
  });

  return (
    <Animated.View style={{ transform: [{ translateX: x }], marginBottom: 16 }}>
      <Text style={s.label}>{label}</Text>
      <Animated.View style={[s.field, { borderColor, backgroundColor }]}>
        <Ionicons name={icon} size={20} color={error ? C.red : C.coral} style={{ marginRight: 10 }} />
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
      {error ? <Text style={s.fieldError}>{error}</Text> : null}
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen                                                             */
/* ------------------------------------------------------------------ */
export default function LoginScreen() {
  const { login, isLoading } = useAuth();
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_700Bold,
    TitanOne_400Regular,
  });

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});
  const [shakeId, setShakeId] = useState(0);
  const [shakePw, setShakePw] = useState(0);
  const [busy, setBusy] = useState(false);
  const [bubbleText, setBubbleText] = useState('');
  const [bubblePoint, setBubblePoint] = useState({
    x: MASCOT_SIZE / 2,
    y: MASCOT_TOP + 80,
  });
  const [pwFocused, setPwFocused] = useState(false);

  const passRef = useRef<TextInputInstance>(null);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // mascot animation values
  const bob = useRef(new Animated.Value(0)).current;
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
  const tailBob = useRef(new Animated.Value(0)).current;
  const tailWiggle = useRef(new Animated.Value(0)).current;
  const bubble = useRef(new Animated.Value(0)).current;
  // background + button
  const drift = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(0)).current;
  const tapIndex = useRef(0);

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

  /* ---- idle loops + one entrance moment ---- */
  useEffect(() => {
    let cancelled = false;
    const loops: Animated.CompositeAnimation[] = [];

    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled || reduce) return;
      const bobLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(bob, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(bob, { toValue: 0, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
      const driftLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(drift, { toValue: 1, duration: 7000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(drift, { toValue: 0, duration: 7000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
      const tailLoop = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(tailBob, { toValue: 7, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(tailWiggle, { toValue: 4, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(tailBob, { toValue: -9, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(tailWiggle, { toValue: -4, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]),
        ])
      );
      tailBob.setValue(-9);
      tailWiggle.setValue(-4);
      loops.push(bobLoop, driftLoop, tailLoop);
      bobLoop.start();
      driftLoop.start();
      tailLoop.start();
    });

    // the mascot pops up from behind the card
    const t = setTimeout(() => {
      Animated.spring(poseY, { toValue: 0, friction: 4, tension: 70, useNativeDriver: true }).start();
      setTimeout(() => say('Hey, hi!'), 500);
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(t);
      if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
      loops.forEach((l) => l.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- mascot poses ---- */
  const pose = (to: number) =>
    Animated.spring(poseY, { toValue: to, friction: 6, tension: 90, useNativeDriver: true }).start();

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

  const onMascotPress = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    setBubblePoint({
      x: locationX,
      y: MASCOT_TOP + locationY,
    });
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

  const poseTail = (y: number, rotate: number) =>
    Animated.parallel([
      Animated.spring(tailY, { toValue: y, friction: 6, tension: 90, useNativeDriver: true }),
      Animated.spring(tailRotate, { toValue: rotate, friction: 6, tension: 90, useNativeDriver: true }),
    ]).start();

  /* ---- field handlers ---- */
  const onIdentifierChange = (v: string) => {
    setIdentifier(v);
    if (fieldErrors.identifier) setFieldErrors((e) => ({ ...e, identifier: undefined }));
    // the mascot leans in further as the name gets longer, like it's reading along
    Animated.spring(lean, {
      toValue: (Math.min(v.length, 24) / 24) * 9,
      friction: 7,
      useNativeDriver: true,
    }).start();
    Animated.spring(tailRotate, {
      toValue: (Math.min(v.length, 24) / 24) * 8,
      friction: 7,
      useNativeDriver: true,
    }).start();
    doNod();
  };

  const onPasswordChange = (v: string) => {
    setPassword(v);
    if (fieldErrors.password) setFieldErrors((e) => ({ ...e, password: undefined }));
    doNod();
    Animated.sequence([
      Animated.timing(tailRotate, { toValue: -6, duration: 90, useNativeDriver: true }),
      Animated.spring(tailRotate, { toValue: 0, friction: 5, useNativeDriver: true }),
    ]).start();
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
  const validate = () => {
    const e: { identifier?: string; password?: string } = {};
    if (!identifier.trim()) e.identifier = 'TUPT-ID, username or email is required';
    if (!password) e.password = 'Type your password';
    setFieldErrors(e);
    if (e.identifier) setShakeId((n) => n + 1);
    if (e.password) setShakePw((n) => n + 1);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    Keyboard.dismiss();
    setError('');
    if (!validate()) {
      mascotError();
      say('Something is missing up there.');
      return;
    }

    setBusy(true);
    const result = await login({ identifier: identifier.trim(), password });
    setBusy(false);

    if (!result.success) {
      setError(result.message);
      mascotError();
      say("That didn't work. Check and try again.", 3200);
      return;
    }

    mascotSuccess();
    say("You're in! Let's go.", 1200);
    const role = result.user?.role;
    setTimeout(() => {
      if (role === 'program chair' || role === 'program_chair' || role === 'admin') {
        router.replace('/chair/dashboard' as any);
      } else if (role === 'faculty') {
        router.replace('/faculty/dashboard' as any);
      } else {
        router.replace('/student/dashboard' as any);
      }
    }, 750);
  };

  if (!fontsLoaded) return <PageLoading title="Getting sign in ready…" subtitle="Just a moment" />;

  const loading = busy || isLoading;

  /* ---- derived animated styles ---- */
  const bobY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -7] });
  const bobTilt = bob.interpolate({ inputRange: [0, 1], outputRange: [-2, 2] });
  const translateY = Animated.add(Animated.add(bobY, poseY), jump);
  const rotate = Animated.add(Animated.add(bobTilt, lean), nod).interpolate({
    inputRange: [-45, 45],
    outputRange: ['-45deg', '45deg'],
  });
  const btnY = press.interpolate({ inputRange: [0, 1], outputRange: [0, 6] });

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
  const blob3 = {
    transform: [{ translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [0, 24] }) }],
  };

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Background shapes: the palette strip from the brand sheet, blown up */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Animated.View style={[s.blob, s.blobCoral, blob1]} />
        <Animated.View style={[s.blob, s.blobBlue, blob2]} />
        <Animated.View style={[s.blob, s.blobPink, blob3]} />
        <View style={[s.blob, s.blobCream]} />
      </View>

      <SafeAreaView style={s.flex}>
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.container}>
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
                    source={
                      loading
                        ? require('@/assets/images/mascot_gif.gif')
                        : require('@/assets/images/mascot.png')
                    }
                    style={s.mascotImg}
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
                </>
              ) : null}
              {Platform.OS === 'web' ? (
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
                  <Image
                    source={require('@/assets/images/tail.png')}
                    style={s.cardTailImage}
                    resizeMode="contain"
                  />
                </Animated.View>
              ) : null}
              <View style={s.card}>
                <Text style={s.title}>Welcome back!</Text>
                <Text style={s.subtitle}>Sign in and pick up where you left off.</Text>

                {error ? (
                  <View style={s.errorBanner}>
                    <Ionicons name="alert-circle" size={18} color={C.red} style={{ marginRight: 8 }} />
                    <Text style={s.errorText}>{error}</Text>
                  </View>
                ) : null}

                <Field
                  label="TUPT-ID, Username or Email"
                  icon="person-outline"
                  placeholder="TUPT-22-0123, username or email"
                  value={identifier}
                  onChangeText={onIdentifierChange}
                  error={fieldErrors.identifier}
                  shakeSignal={shakeId}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passRef.current?.focus()}
                  onFocus={() => {
                    pose(-14);
                    poseTail(-18, -12);
                    say('Who goes there?');
                  }}
                  onBlur={() => {
                    pose(0);
                    poseTail(0, 0);
                    Animated.spring(lean, { toValue: 0, useNativeDriver: true }).start();
                  }}
                />

                <Field
                  label="Password"
                  icon="lock-closed-outline"
                  placeholder="Your secret word"
                  value={password}
                  onChangeText={onPasswordChange}
                  error={fieldErrors.password}
                  shakeSignal={shakePw}
                  secureTextEntry={!showPw}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  inputRef={passRef}
                  onSubmitEditing={handleLogin}
                  onFocus={() => {
                    setPwFocused(true);
                    pose(showPw ? 36 : 82);
                    poseTail(showPw ? 24 : 42, showPw ? 12 : 20);
                    say(showPw ? 'Okay, I can see it.' : "I'm not looking. Promise.");
                  }}
                  onBlur={() => {
                    setPwFocused(false);
                    pose(0);
                    poseTail(0, 0);
                  }}
                  right={
                    <Pressable onPress={togglePw} hitSlop={12} accessibilityLabel="Show or hide password">
                      <Ionicons
                        name={showPw ? 'eye' : 'eye-off'}
                        size={22}
                        color={showPw ? C.blue : C.muted}
                      />
                    </Pressable>
                  }
                />

                {/* Chunky press-down button */}
                <Pressable
                  disabled={loading}
                  onPressIn={() =>
                    Animated.timing(press, { toValue: 1, duration: 70, useNativeDriver: true }).start()
                  }
                  onPressOut={() =>
                    Animated.spring(press, { toValue: 0, friction: 5, useNativeDriver: true }).start()
                  }
                  onPress={handleLogin}
                  style={s.btnWrap}
                  accessibilityRole="button"
                >
                  <View style={s.btnShadow} />
                  <Animated.View style={[s.btnFace, { transform: [{ translateY: btnY }] }]}>
                    {loading ? (
                      <ActivityIndicator color={C.cream} />
                    ) : (
                      <Text style={s.btnText}>Let me in</Text>
                    )}
                  </Animated.View>
                </Pressable>
              </View>
            </View>

            <Animated.View
              pointerEvents="none"
              style={[
                s.bubble,
                {
                  zIndex: 10,
                  opacity: bubble,
                  left: 300,
                  top: 100,
                  transform: [
                    { scale: bubble.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) },
                  ],
                },
              ]}
            >
              <Text style={s.bubbleText}>{bubbleText}</Text>
              <View style={s.bubbleTail} />
            </Animated.View>

            {/* Footer */}
            <View style={s.footer}>
              <Text style={s.footerText}>New here?</Text>
              <Pressable
                onPress={() => router.push('/register')}
                style={({ pressed }: PressableStateCallbackType) => [
                  s.footerChip,
                  pressed && { transform: [{ scale: 0.95 }] },
                ]}
              >
                <Text style={s.footerChipText}>Create an account</Text>
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
const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.yellow },
  scroll: { flexGrow: 1, justifyContent: 'center' },
  container: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: Platform.OS === 'web' ? 12 : 24,
  },

  // background
  blob: { position: 'absolute', borderRadius: 999 },
  blobCoral: { width: 320, height: 320, top: -120, right: -130, backgroundColor: C.coral },
  blobBlue: { width: 250, height: 250, bottom: -90, left: -100, backgroundColor: C.blue },
  blobPink: { width: 170, height: 170, top: '46%', left: -80, backgroundColor: C.pink },
  blobCream: { width: 110, height: 110, bottom: 90, right: -30, backgroundColor: C.cream },

  // mascot
  stage: { width: '100%', height: STAGE_HEIGHT, alignItems: 'center', zIndex: 1 },
  mascotPress: {
    position: 'absolute',
    top: MASCOT_TOP,
    width: MASCOT_SIZE,
    height: MASCOT_SIZE,
    alignSelf: 'center',
  },
  mascotBox: {
    position: 'absolute',
    top: 0,
    width: MASCOT_SIZE,
    height: MASCOT_SIZE,
    alignSelf: 'center',
  },
  mascotImg: { width: '100%', height: '100%' },
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
  mascotHandLeft: { left: 76 },
  mascotHandRight: { right: 76 },
  cardShadow: {
    position: 'absolute',
    top: 9,
    left: 9,
    right: -9,
    bottom: -9,
    borderRadius: 28,
    backgroundColor: C.coral,
  },
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
  cardTail: {
    position: 'absolute',
    width: 500,
    height: 350,
    right: -380,
    top: 58,
    zIndex: 1,
  },
  cardTailImage: { width: '100%', height: '100%' },
  title: { fontFamily: F.display, fontSize: 31, color: C.ink, letterSpacing: 0.3 },
  subtitle: { fontFamily: F.body, fontSize: 15, color: C.muted, marginTop: 2, marginBottom: 20 },

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
  input: { flex: 1, fontFamily: F.medium, fontSize: 16, color: C.ink, height: '100%' },
  fieldError: { fontFamily: F.medium, fontSize: 13, color: C.red, marginTop: 5, marginLeft: 4 },

  // button
  btnWrap: { height: 62, marginTop: 6 },
  btnShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 6,
    height: 56,
    borderRadius: 18,
    backgroundColor: C.red,
  },
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