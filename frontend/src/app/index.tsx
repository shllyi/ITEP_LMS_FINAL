import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  PanResponder,
  useWindowDimensions,
  AccessibilityInfo,
  type ScrollViewInstance,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import { TitanOne_400Regular } from '@expo-google-fonts/titan-one';
import { useAuth } from '@/context/AuthContext';
import ModelViewer from '../components/ModelViewer';

/* ------------------------------------------------------------------ */
/*  Brand tokens                                                       */
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

// Mascot layer assets share this canvas size so their parts stay aligned.
const IMG_W = 1672;
const IMG_H = 941;

const heroHeight = (W: number, isDesktop: boolean) =>
  isDesktop ? Math.round(Math.min(Math.max(W * 0.4, 560), 720)) : 300;

// Everything the first screen needs, so the curtain can wait for it.
const PRELOAD = [
  require('@/assets/images/bg.jpg'),
  require('@/assets/images/tailbg-layer.png'),
  require('@/assets/images/facebg-layer.png'),
  require('@/assets/images/bodybg-layer.png'),
  require('@/assets/images/mascot.png'),
  require('@/assets/images/mascot_gif.gif'),
];

/* ------------------------------------------------------------------ */
/*  Small hooks                                                        */
/* ------------------------------------------------------------------ */
function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => {});
  }, []);
  return reduce;
}

function useLoop(reduce: boolean, duration = 1800) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [reduce, duration, v]);
  return v;
}

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

const shake = (v: Animated.Value, amp = 10) =>
  Animated.sequence(
    [amp, -amp, amp * 0.7, -amp * 0.7, 0].map((to) =>
      Animated.timing(v, { toValue: to, duration: 55, useNativeDriver: true })
    )
  ).start();

/* ------------------------------------------------------------------ */
/*  Entrance helpers (wait for the curtain via `go`)                   */
/* ------------------------------------------------------------------ */
/** Fades and lifts its children in once `go` flips to true. */
function Enter({
  go,
  delay = 0,
  y = 22,
  style,
  children,
}: {
  go: boolean;
  delay?: number;
  y?: number;
  style?: any;
  children: React.ReactNode;
}) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!go) return;
    Animated.sequence([
      Animated.delay(delay),
      Animated.spring(v, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }),
    ]).start();
  }, [go, delay, v]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v.interpolate({ inputRange: [0, 0.6], outputRange: [0, 1], extrapolate: 'clamp' }),
          transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [y, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** One line of a headline that slides up from behind a mask. */
function Rise({
  go,
  delay,
  lh,
  style,
  children,
}: {
  go: boolean;
  delay: number;
  lh: number;
  style: any;
  children: string;
}) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!go) return;
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(v, { toValue: 1, duration: 620, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }),
    ]).start();
  }, [go, delay, v]);
  return (
    <View style={{ overflow: 'hidden', height: lh + 6 }}>
      <Animated.Text
        style={[style, { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [lh * 1.2, 0] }) }] }]}
      >
        {children}
      </Animated.Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Page-load curtain                                                  */
/* ------------------------------------------------------------------ */
const CURTAIN = [C.coral, C.yellow, C.blue, C.pink, C.cream];
const CAPTIONS = ['Sharpening pencils', 'Stacking slide decks', 'Waking the mascot', 'Almost there'];

function Hop({ ch, i, font }: { ch: string; i: number; font?: string }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(i * 90),
        Animated.timing(v, { toValue: 1, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(v, { toValue: 0, friction: 3, tension: 150, useNativeDriver: true }),
        Animated.delay((9 - i) * 90 + 350),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [i, v]);
  return (
    <Animated.Text
      style={[
        s.curtainWord,
        font ? { fontFamily: font } : { fontWeight: '900' },
        { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -16] }) }] },
      ]}
    >
      {ch}
    </Animated.Text>
  );
}

/**
 * Covers the page until fonts + images are ready (and a short minimum time
 * has passed), then lifts away in five staggered strips.
 *
 * The mascot sits on top of the card from the very first frame (the PNG is
 * preloaded). If the 3D model loads, it fades in over the image; if it fails,
 * the mascot image simply stays.
 */
function Curtain({
  ready,
  fontsLoaded,
  reduce,
  onStart,
  onDone,
}: {
  ready: boolean;
  fontsLoaded: boolean;
  reduce: boolean;
  onStart: () => void;
  onDone: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const bob = useLoop(reduce, 650);
  // big mascot, centered on screen while loading
  const modelSize = Math.round(Math.min(Math.max(width * 0.8, 260), 380, height * 0.5));
  const strips = useRef(CURTAIN.map(() => new Animated.Value(0))).current;
  const card = useRef(new Animated.Value(0)).current;
  const out = useRef(new Animated.Value(0)).current;
  const bar = useRef(new Animated.Value(0)).current;
  const [minDone, setMinDone] = useState(false);
  const [cap, setCap] = useState(0);
  // 'loading' until the 3D model is ready; 'failed' keeps the mascot image
  const [model, setModel] = useState<'loading' | 'ready' | 'failed'>('loading');

  useEffect(() => {
    Animated.spring(card, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }).start();
    Animated.timing(bar, { toValue: 0.82, duration: 1500, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    const t = setTimeout(() => setMinDone(true), reduce ? 300 : 1700);
    const mt = setTimeout(() => setModel((m) => (m === 'loading' ? 'failed' : m)), 3500);
    const c = setInterval(() => setCap((n) => (n + 1) % CAPTIONS.length), 520);
    return () => {
      clearTimeout(t);
      clearTimeout(mt);
      clearInterval(c);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready || !minDone || model === 'loading') return;
    Animated.timing(bar, { toValue: 1, duration: 240, useNativeDriver: false }).start(() => {
      onStart();
      Animated.timing(out, { toValue: 1, duration: 260, easing: Easing.in(Easing.back(1.5)), useNativeDriver: true }).start();
      Animated.stagger(
        reduce ? 0 : 90,
        strips.map((v) =>
          Animated.timing(v, {
            toValue: 1,
            duration: reduce ? 200 : 760,
            easing: Easing.bezier(0.76, 0, 0.24, 1),
            useNativeDriver: true,
          })
        )
      ).start(() => onDone());
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, minDone, model]);

  const cardScale = Animated.multiply(
    card.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }),
    out.interpolate({ inputRange: [0, 1], outputRange: [1, 0.5] })
  );
  const cardOpacity = Animated.multiply(
    card.interpolate({ inputRange: [0, 0.5], outputRange: [0, 1], extrapolate: 'clamp' }),
    out.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })
  );
  const font = fontsLoaded ? F.display : undefined;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 999, elevation: 999 }]}>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {strips.map((v, i) => (
          <Animated.View
            key={i}
            style={{
              flex: 1,
              backgroundColor: CURTAIN[i],
              transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -(height + 90)] }) }],
            }}
          >
            <View style={[s.lip, { backgroundColor: CURTAIN[i] }]} />
          </Animated.View>
        ))}
      </View>

      <View pointerEvents="none" style={s.curtainCenter}>
        <Animated.View
          style={[
            s.curtainCard,
            {
              minWidth: modelSize + 60,
              opacity: cardOpacity,
              // shifted down so the mascot (not the whole card) sits near screen center
              transform: [{ translateY: 48 }, { scale: cardScale }, { rotate: '-2deg' }],
            },
          ]}
        >
          <View style={{ width: modelSize, height: modelSize }}>
            {/* 3D model: invisible until ready, then it takes over */}
            {model !== 'failed' && (
              <View style={[StyleSheet.absoluteFill, { opacity: model === 'ready' ? 1 : 0 }]}>
                <ModelViewer onReady={() => setModel('ready')} onError={() => setModel('failed')} />
              </View>
            )}

            {/* Mascot image: shows immediately, and stays if the model fails */}
            {model !== 'ready' && (
              <Animated.Image
                source={require('@/assets/images/mascot.png')}
                resizeMode="contain"
                style={[
                  StyleSheet.absoluteFill,
                  {
                    width: '100%',
                    height: '100%',
                    transform: [
                      { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) },
                      { rotate: bob.interpolate({ inputRange: [0, 1], outputRange: ['-3deg', '3deg'] }) },
                    ],
                  },
                ]}
              />
            )}
          </View>
          <View style={{ flexDirection: 'row', marginTop: 4 }}>
            {'EduPortal'.split('').map((ch, i) => (
              <Hop key={i} ch={ch} i={i} font={font} />
            ))}
          </View>
          <View style={s.curtainTrack}>
            <Animated.View
              style={[s.curtainFill, { width: bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}
            />
          </View>
          <Text style={[s.curtainCap, fontsLoaded && { fontFamily: F.medium }]}>{CAPTIONS[cap]}</Text>
        </Animated.View>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Decorations                                                        */
/* ------------------------------------------------------------------ */
function Doodle({
  kind,
  color,
  size = 40,
  rot = 0,
  style,
}: {
  kind: 'ring' | 'plus' | 'star' | 'dot';
  color: string;
  size?: number;
  rot?: number;
  style?: any;
}) {
  const base = { position: 'absolute' as const, transform: [{ rotate: `${rot}deg` }] };
  if (kind === 'ring') {
    return (
      <View
        pointerEvents="none"
        style={[base, { width: size, height: size, borderRadius: size / 2, borderWidth: Math.max(5, size / 7), borderColor: color }, style]}
      />
    );
  }
  if (kind === 'dot') {
    return (
      <View
        pointerEvents="none"
        style={[base, { width: size, height: size, borderRadius: size / 2, backgroundColor: color, borderWidth: 2.5, borderColor: C.ink }, style]}
      />
    );
  }
  if (kind === 'plus') {
    const t = Math.max(6, size / 4);
    return (
      <View pointerEvents="none" style={[base, { width: size, height: size }, style]}>
        <View style={{ position: 'absolute', left: 0, right: 0, top: (size - t) / 2, height: t, borderRadius: t / 2, backgroundColor: color }} />
        <View style={{ position: 'absolute', top: 0, bottom: 0, left: (size - t) / 2, width: t, borderRadius: t / 2, backgroundColor: color }} />
      </View>
    );
  }
  return (
    <View pointerEvents="none" style={[base, style]}>
      <Ionicons name="star" size={size} color={color} />
    </View>
  );
}

/** One scrolling ribbon of words. Two of them cross under the hero. */
function Ribbon({
  items,
  bg,
  fg,
  starColor,
  rot,
  dir,
  top,
  reduce,
}: {
  items: string[];
  bg: string;
  fg: string;
  starColor: string;
  rot: number;
  dir: 1 | -1;
  top: number;
  reduce: boolean;
}) {
  const [w, setW] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!w || reduce) return;
    const from = dir === 1 ? 0 : -w;
    const to = dir === 1 ? -w : 0;
    x.setValue(from);
    const loop = Animated.loop(
      Animated.timing(x, { toValue: to, duration: w * 20, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [w, reduce, dir, x]);

  const row = (
    <View style={s.ribbonRow}>
      {items.map((t, i) => (
        <View key={i} style={s.ribbonItem}>
          <Text style={[s.ribbonText, { color: fg }]}>{t}</Text>
          <Ionicons name="star" size={18} color={starColor} />
        </View>
      ))}
    </View>
  );

  return (
    <View style={[s.ribbon, { top, backgroundColor: bg, transform: [{ rotate: `${rot}deg` }] }]}>
      <Animated.View style={{ flexDirection: 'row', alignSelf: 'flex-start', transform: [{ translateX: x }] }}>
        <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ flexShrink: 0 }}>
          {row}
        </View>
        <View style={{ flexShrink: 0 }}>{row}</View>
        <View style={{ flexShrink: 0 }}>{row}</View>
      </Animated.View>
    </View>
  );
}

function RibbonCross({ reduce }: { reduce: boolean }) {
  return (
    <View style={s.ribbonWrap}>
      <Ribbon
        items={['Modules', 'Quizzes', 'Slide decks', 'Progress', 'Cloud storage', 'Retakes', 'Enrollments']}
        bg={C.ink}
        fg={C.cream}
        starColor={C.coral}
        rot={-2}
        dir={1}
        top={26}
        reduce={reduce}
      />
      <Ribbon
        items={['Study', 'Build', 'Publish', 'Practice', 'Review', 'Repeat']}
        bg={C.coral}
        fg={C.ink}
        starColor={C.cream}
        rot={1.6}
        dir={-1}
        top={74}
        reduce={reduce}
      />
    </View>
  );
}

/** Confetti pop. Bump `shot` to fire it. */
function Burst({ shot }: { shot: number }) {
  const N = 18;
  const colors = [C.coral, C.blue, C.yellow, C.pink, C.cream];
  const ps = useRef(
    Array.from({ length: N }, (_, i) => ({
      v: new Animated.Value(0),
      a: (i / N) * Math.PI * 2 + Math.random() * 0.4,
      d: 90 + Math.random() * 90,
      r: Math.round(Math.random() * 540 - 270),
      c: colors[i % colors.length],
    }))
  ).current;
  useEffect(() => {
    if (!shot) return;
    ps.forEach((p) => p.v.setValue(0));
    Animated.parallel(
      ps.map((p) => Animated.timing(p.v, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }))
    ).start();
  }, [shot, ps]);
  return (
    <View pointerEvents="none" style={s.burst}>
      {ps.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            width: i % 2 ? 11 : 16,
            height: 11,
            borderRadius: i % 3 ? 3 : 6,
            backgroundColor: p.c,
            borderWidth: 1.5,
            borderColor: C.ink,
            opacity: p.v.interpolate({ inputRange: [0, 0.01, 0.7, 1], outputRange: [0, 1, 1, 0] }), // hidden until fired
            transform: [
              { translateX: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(p.a) * p.d] }) },
              { translateY: p.v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, Math.sin(p.a) * p.d - 24, Math.sin(p.a) * p.d + 60] }) },
              { rotate: p.v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.r}deg`] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared building blocks                                             */
/* ------------------------------------------------------------------ */
function SpeechBubble({
  text,
  anim,
  style,
  tail = 'left',
}: {
  text: string;
  anim: Animated.Value;
  style?: any;
  tail?: 'left' | 'right';
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
      <View style={[s.bubbleTail, tail === 'left' ? { left: 18 } : { right: 18 }]} />
    </Animated.View>
  );
}

/** A tactile "key" that sinks when pressed. Wraps anything. */
function Chunky({
  children,
  onPress,
  face,
  shadow,
  radius = 16,
  depth = 6,
  style,
  faceStyle,
  held,
  inert,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  inert?: boolean; // render a plain View so buttons inside are not nested in a button
  face: string;
  shadow: string;
  radius?: number;
  depth?: number;
  style?: any;
  faceStyle?: any;
  held?: boolean; // keep pressed down (e.g. selected tab)
}) {
  const p = useRef(new Animated.Value(held ? 1 : 0)).current;
  const heldRef = useRef(!!held);
  useEffect(() => {
    heldRef.current = !!held;
    Animated.spring(p, { toValue: held ? 1 : 0, friction: 6, tension: 120, useNativeDriver: true }).start();
  }, [held, p]);
  const rest = () => Animated.spring(p, { toValue: heldRef.current ? 1 : 0, friction: 5, useNativeDriver: true }).start();
  const hover = {
    onHoverIn: () => !heldRef.current && Animated.timing(p, { toValue: -0.35, duration: 120, useNativeDriver: true }).start(),
    onHoverOut: rest,
  } as any;

  const Root: any = inert ? View : Pressable;

  return (
    <Root
      style={[{ paddingBottom: depth }, style]}
      {...(inert
        ? {}
        : {
            accessibilityRole: 'button',
            onPress,
            onPressIn: () => Animated.timing(p, { toValue: 1, duration: 70, useNativeDriver: true }).start(),
            onPressOut: rest,
            ...hover,
          })}
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
    </Root>
  );
}

function Btn({
  label,
  onPress,
  tone = 'coral',
}: {
  label: string;
  onPress: () => void;
  tone?: 'coral' | 'paper' | 'blue';
}) {
  const t = {
    coral: { face: C.coral, shadow: C.coralDeep, text: C.cream },
    paper: { face: C.paper, shadow: C.pinkDeep, text: C.ink },
    blue: { face: C.blue, shadow: C.blueDeep, text: '#FFFFFF' },
  }[tone];
  return (
    <Chunky face={t.face} shadow={t.shadow} onPress={onPress} faceStyle={s.btnFace}>
      <Text style={[s.btnText, { color: t.text }]}>{label}</Text>
    </Chunky>
  );
}

type Edge = 'round' | 'scallop' | 'slant' | 'slantR';

/** A full-width section. Each one gets a different top edge so the page does not read as a stack of identical cards. */
function Band({
  color,
  isDesktop,
  children,
  bottom = 72,
  marginTop = 100,
  edge = 'round',
  decor,
}: {
  color: string;
  isDesktop: boolean;
  children: React.ReactNode;
  bottom?: number;
  marginTop?: number;
  edge?: Edge;
  decor?: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  const radius = edge === 'round' ? 44 : 0;
  return (
    <View
      style={{
        backgroundColor: color,
        marginTop,
        borderTopLeftRadius: radius,
        borderTopRightRadius: radius,
        paddingTop: 70,
        paddingBottom: bottom,
        paddingHorizontal: isDesktop ? 48 : 20,
      }}
    >
      {edge === 'scallop' && (
        <View pointerEvents="none" style={{ position: 'absolute', top: -22, left: 0, right: 0, height: 22, flexDirection: 'row', overflow: 'hidden' }}>
          {Array.from({ length: Math.ceil(width / 44) + 1 }, (_, i) => (
            <View key={i} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: color }} />
          ))}
        </View>
      )}
      {(edge === 'slant' || edge === 'slantR') && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -30,
            left: -40,
            right: -40,
            height: 70,
            backgroundColor: color,
            transform: [{ rotate: edge === 'slant' ? '-2deg' : '2deg' }],
          }}
        />
      )}
      {decor}
      <View style={{ width: '100%', maxWidth: 1180, alignSelf: 'center' }}>{children}</View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Draggable sticker                                                  */
/* ------------------------------------------------------------------ */
function Sticker({
  icon,
  bg,
  fg,
  rot,
  left,
  top,
  stageWidth,
  stageHeight,
  floatMs,
  reduce,
  go,
  index,
  onTap,
  onFirstDrag,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  bg: string;
  fg: string;
  rot: number;
  left: number;
  top: number;
  stageWidth: number;
  stageHeight: number;
  floatMs: number;
  reduce: boolean;
  go: boolean;
  index: number;
  onTap: () => void;
  onFirstDrag: () => void;
}) {
  const [position, setPosition] = useState({ x: left, y: top });
  const positionRef = useRef(position);
  const pan = useRef(new Animated.ValueXY()).current;
  const lift = useRef(new Animated.Value(0)).current;
  const appear = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const float = useLoop(reduce, floatMs);
  const moved = useRef(false);
  const tapRef = useRef(onTap);
  const dragRef = useRef(onFirstDrag);
  tapRef.current = onTap;
  dragRef.current = onFirstDrag;
  positionRef.current = position;

  // pop in once the curtain lifts, one after another
  useEffect(() => {
    if (!go) return;
    Animated.sequence([
      Animated.delay(500 + index * 90),
      Animated.spring(appear, { toValue: 1, friction: 4, tension: 90, useNativeDriver: true }),
    ]).start();
  }, [go, index, appear]);

  const finishDrag = (dx = 0, dy = 0) => {
    const next = {
      x: Math.max(0, Math.min(stageWidth - 76, positionRef.current.x + dx)),
      y: Math.max(0, Math.min(stageHeight - 76, positionRef.current.y + dy)),
    };
    positionRef.current = next;
    setPosition(next);
    Animated.spring(lift, { toValue: 0, friction: 6, useNativeDriver: false }).start();
    pan.setValue({ x: 0, y: 0 });
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        moved.current = false;
        Animated.spring(lift, { toValue: 1, friction: 6, useNativeDriver: false }).start();
      },
      onPanResponderMove: (_, g) => {
        if (!moved.current && Math.abs(g.dx) + Math.abs(g.dy) > 6) {
          moved.current = true;
          dragRef.current();
        }
        pan.setValue({ x: g.dx, y: g.dy });
      },
      onPanResponderRelease: (_, g) => {
        finishDrag(g.dx, g.dy);
        if (!moved.current) {
          // a tap does a full flip and says its line
          spin.setValue(0);
          Animated.timing(spin, { toValue: 1, duration: 520, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }).start();
          tapRef.current();
        }
      },
      onPanResponderTerminate: () => finishDrag(),
    })
  ).current;

  return (
    <Animated.View
      {...responder.panHandlers}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        zIndex: 3,
        transform: [
          { translateX: pan.x },
          { translateY: pan.y },
          { scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) },
          { rotate: lift.interpolate({ inputRange: [0, 1], outputRange: [`${rot}deg`, `${rot * 0.3}deg`] }) },
        ],
      }}
    >
      <Animated.View
        style={{
          transform: [
            { translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) },
            { scale: appear },
            { rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
          ],
        }}
      >
        <View style={s.stickerShadow} />
        <View style={[s.stickerFace, { backgroundColor: bg }]}>
          <Ionicons name={icon} size={34} color={fg} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero stage: photo + hotspot + stickers + bubble                    */
/*  Used by guests AND signed-in users so both get the same backdrop.  */
/* ------------------------------------------------------------------ */
const HERO_LINES = [
  'Psst. Try dragging a sticker.',
  'Peekaboo!',
  'Sign in and I will stop hiding.',
  "I'm studying too, promise.",
];

const SIGNED_IN_LINES = [
  'Welcome back!',
  'Ready to study?',
  'Boop!',
  'Pick up where you left off.',
];

function Stage({
  W,
  H,
  isDesktop,
  reduce,
  go,
  scrollY,
  heroFadeOpacity: externalHeroFadeOpacity,
  lines = HERO_LINES,
  intro = 'Drag my stickers around!',
  children,
}: {
  W: number;
  H: number;
  isDesktop: boolean;
  reduce: boolean;
  go: boolean;
  scrollY?: Animated.Value;
  heroFadeOpacity?: Animated.AnimatedInterpolation<number>;
  lines?: string[];
  intro?: string;
  children?: React.ReactNode;
}) {
  const scale = Math.max(W / IMG_W, H / IMG_H);
  const dispW = IMG_W * scale;
  const dispH = IMG_H * scale;
  const cropY = (dispH - H) / 2;
  const py = (y: number) => y * scale - cropY;

  const slide = useRef(new Animated.Value(-36)).current;
  const mascotIn = useRef(new Animated.Value(0)).current;
  const faceTilt = useRef(new Animated.Value(0)).current;
  const tailWiggle = useRef(new Animated.Value(0)).current;
  const { anim, text, say } = useBubble();
  const lineIdx = useRef(0);
  const dragged = useRef(false);

  // nothing happens until the curtain lifts
  useEffect(() => {
    if (!go) return;
    Animated.timing(mascotIn, { toValue: 1, duration: 380, useNativeDriver: true }).start();
    const t1 = setTimeout(
      () => Animated.spring(slide, { toValue: 0, friction: 8, tension: 45, useNativeDriver: true }).start(),
      120
    );
    const t2 = setTimeout(() => say(intro, 3200), 1500);
    const t3 = setTimeout(() => animateMascot(), 650);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [go]);

  const animateMascot = () => {
    faceTilt.setValue(0);
    tailWiggle.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(faceTilt, { toValue: -1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(faceTilt, { toValue: 1, duration: 380, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.spring(faceTilt, { toValue: 0, friction: 7, tension: 75, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(tailWiggle, { toValue: 1, duration: 320, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(tailWiggle, { toValue: -1, duration: 480, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.spring(tailWiggle, { toValue: 0, friction: 8, tension: 70, useNativeDriver: true }),
      ]),
    ]).start();
  };

  const duck = () => {
    animateMascot();
    Animated.sequence([
      Animated.timing(slide, { toValue: -20, duration: 180, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, friction: 8, tension: 65, useNativeDriver: true }),
    ]).start();
    say(lines[lineIdx.current++ % lines.length]);
  };

  const stickers: Array<{
    icon: keyof typeof Ionicons.glyphMap;
    bg: string;
    fg: string;
    rot: number;
    fx: number;
    fy: number;
    line: string;
  }> = isDesktop
    ? [
        { icon: 'code-slash', bg: C.coral, fg: C.cream, rot: -8, fx: 0.42, fy: 0.13, line: 'Write, test and ship your ideas.' },
        { icon: 'git-branch', bg: C.cream, fg: C.ink, rot: 5, fx: 0.56, fy: 0.08, line: 'Collaborate and track every change.' },
        { icon: 'bug', bg: C.cream, fg: C.ink, rot: 7, fx: 0.75, fy: 0.08, line: 'Find the bug, then make it better.' },
        { icon: 'wifi', bg: C.coral, fg: C.cream, rot: 8, fx: 0.8, fy: 0.48, line: 'Connect ideas, people and systems.' },
        { icon: 'server', bg: C.blue, fg: '#FFFFFF', rot: -4, fx: 0.4, fy: 0.76, line: 'Understand what powers the web.' },
        { icon: 'terminal', bg: C.blue, fg: '#FFFFFF', rot: 6, fx: 0.55, fy: 0.84, line: 'Build practical software skills.' },
        { icon: 'logo-javascript', bg: C.cream, fg: C.ink, rot: -6, fx: 0.67, fy: 0.76, line: 'Practice one concept at a time.' },
        { icon: 'hardware-chip', bg: C.pink, fg: C.ink, rot: -5, fx: 0.86, fy: 0.76, line: 'Explore systems, networks and technology.' },
      ]
    : [
        { icon: 'code-slash', bg: C.coral, fg: C.cream, rot: -8, fx: 0.54, fy: 0.08, line: 'Write, test and ship your ideas.' },
        { icon: 'terminal', bg: C.blue, fg: '#FFFFFF', rot: 6, fx: 0.76, fy: 0.08, line: 'Build practical software skills.' },
        { icon: 'git-branch', bg: C.cream, fg: C.ink, rot: 4, fx: 0.56, fy: 0.28, line: 'Collaborate and track every change.' },
        { icon: 'hardware-chip', bg: C.pink, fg: C.ink, rot: -5, fx: 0.76, fy: 0.3, line: 'Explore systems, networks and technology.' },
        { icon: 'bug', bg: C.yellow, fg: C.ink, rot: 7, fx: 0.54, fy: 0.5, line: 'Find the bug, then make it better.' },
        { icon: 'logo-javascript', bg: C.cream, fg: C.ink, rot: -6, fx: 0.76, fy: 0.52, line: 'Practice one concept at a time.' },
        { icon: 'server', bg: C.blue, fg: '#FFFFFF', rot: -4, fx: 0.56, fy: 0.72, line: 'Understand what powers the web.' },
        { icon: 'wifi', bg: C.coral, fg: C.cream, rot: 8, fx: 0.76, fy: 0.78, line: 'Connect ideas, people and systems.' },
      ];

  const heroFadeOpacity = externalHeroFadeOpacity ?? (scrollY
    ? scrollY.interpolate({
        inputRange: [0, H * 0.95, H * 1.5, H * 2.1],
        outputRange: [1, 1, 0.55, 0],
        extrapolate: 'clamp',
      })
    : 1);

  const parallax = scrollY
    ? [{ translateY: scrollY.interpolate({ inputRange: [0, H], outputRange: [0, -H * 0.18], extrapolate: 'clamp' }) }]
    : [];

  return (
    <View style={{ width: W, height: H, overflow: 'hidden', backgroundColor: C.bg }}>
      <Image
        source={require('@/assets/images/bg.jpg')}
        resizeMode="stretch"
        style={{
          position: 'absolute',
          left: 0,
          top: -cropY,
          width: dispW,
          height: dispH,
        }}
      />

      <Animated.Image
        source={require('@/assets/images/tailbg-layer.png')}
        resizeMode="stretch"
        pointerEvents="none"
        style={[
          s.mascotLayer,
          {
            top: -cropY,
            width: dispW,
            height: dispH,
            zIndex: 1,
            opacity: mascotIn,
            transform: [
              { translateX: slide },
              { translateX: tailWiggle.interpolate({ inputRange: [-1, 1], outputRange: [-3, 3] }) },
              { rotate: tailWiggle.interpolate({ inputRange: [-1, 1], outputRange: ['1deg', '-1deg'] }) },
              ...parallax,
            ],
          },
        ]}
      />
      <Animated.Image
        source={require('@/assets/images/facebg-layer.png')}
        resizeMode="stretch"
        pointerEvents="none"
        style={[
          s.mascotLayer,
          {
            top: -cropY,
            width: dispW,
            height: dispH,
            zIndex: 3,
            opacity: mascotIn,
            transform: [
              { translateX: slide },
              { rotate: faceTilt.interpolate({ inputRange: [-1, 1], outputRange: ['-1.5deg', '1.5deg'] }) },
              ...parallax,
            ],
          },
        ]}
      />
      <Animated.Image
        source={require('@/assets/images/bodybg-layer.png')}
        resizeMode="stretch"
        pointerEvents="none"
        style={[
          s.mascotLayer,
          {
            top: -cropY,
            width: dispW,
            height: dispH,
            zIndex: 2,
            opacity: mascotIn,
            transform: [{ translateX: slide }, ...parallax],
          },
        ]}
      />

      <Animated.View pointerEvents="none" style={[s.heroFade, { opacity: heroFadeOpacity }]}>
        {Array.from({ length: 17 }, (_, i) => (
          <View key={i} style={[s.heroFadeBand, { backgroundColor: C.yellow, opacity: 0.04 + i * 0.06 > 1 ? 1 : 0.04 + i * 0.06 }]} />
        ))}
      </Animated.View>

      {/* invisible hotspot over the mascot's head */}
      <Pressable
        accessibilityLabel="Mascot"
        onPress={duck}
        style={{ position: 'absolute', left: 20 * scale, top: py(160), width: 490 * scale, height: 370 * scale, zIndex: 2 }}
      />

      <SpeechBubble
        text={text}
        anim={anim}
        style={{ left: 560 * scale, top: Math.max(10, py(120)), zIndex: 4 }}
      />

      {stickers.map((st, i) => (
        <Sticker
          key={st.icon}
          icon={st.icon}
          bg={st.bg}
          fg={st.fg}
          rot={st.rot}
          left={st.fx * W}
          top={st.fy * H}
          stageWidth={W}
          stageHeight={H}
          floatMs={1500 + i * 260}
          reduce={reduce}
          go={go}
          index={i}
          onTap={() => say(st.line)}
          onFirstDrag={() => {
            if (!dragged.current) {
              dragged.current = true;
              say('Wheee!', 1600);
            }
          }}
        />
      ))}

      {children}
    </View>
  );
}

function HeroCopy({ isDesktop, go }: { isDesktop: boolean; go: boolean }) {
  const lh = isDesktop ? 60 : 42;
  const hs = [s.headline, isDesktop && s.headlineDesktop];
  return (
    <View>
      <Rise go={go} delay={80} lh={lh} style={hs}>Join EduPortal for a</Rise>
      <Rise go={go} delay={200} lh={lh} style={hs}>Practical Learning</Rise>
      <Rise go={go} delay={320} lh={lh} style={hs}>Workspace</Rise>

      <Enter go={go} delay={520} y={14}>
        <Text style={[s.lead, isDesktop && s.leadDesktop]}>
          Faculty build modules, quizzes and slide decks. Students pick up right where they left off.
        </Text>
      </Enter>
      <Enter go={go} delay={680} y={18}>
        <View style={s.ctaRow}>
          <Btn label="Sign in" onPress={() => router.push('/login')} />
          <Btn label="Create an account" tone="paper" onPress={() => router.push('/register')} />
        </View>
      </Enter>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Bento: poke-able tiles of different sizes                          */
/* ------------------------------------------------------------------ */
/**
 * Course modules tile. On wide screens the text sits on the left and the
 * module cards fill the rest of the tile (and spread across it when opened),
 * so no space is wasted. On phones it stacks: text on top, cards below.
 */
function ModulesTile({ fill }: { fill: boolean }) {
  const fan = useRef(new Animated.Value(0)).current;
  const [open, setOpen] = useState(false);
  const [boxW, setBoxW] = useState(0);
  const toggle = () => {
    const n = !open;
    setOpen(n);
    Animated.spring(fan, { toValue: n ? 1 : 0, friction: 5, tension: 90, useNativeDriver: true }).start();
  };
  const cards = [
    { t: 'Addressing', m: '4 lessons', c: C.blue, fg: '#FFFFFF' },
    { t: 'Routing', m: '6 lessons', c: C.cream, fg: C.ink },
    { t: 'Security', m: 'Draft', c: C.pink, fg: C.ink },
    { t: 'Web Systems', m: '5 lessons', c: C.yellow, fg: C.ink },
    { t: 'Databases', m: '3 lessons', c: C.paper, fg: C.ink },
  ];
  const cw = fill ? 150 : 124;
  const ch = fill ? 150 : 112;
  // horizontal distance between cards once opened, sized to fill the available width
  const step = boxW > cw ? Math.min(170, (boxW - cw - 12) / (cards.length - 1)) : 40;
  return (
    <Chunky
      face={C.coral}
      shadow={C.coralDeep}
      radius={28}
      depth={9}
      onPress={toggle}
      style={fill ? s.fill : undefined}
      faceStyle={[
        { padding: 24, minHeight: 300, overflow: 'hidden' },
        fill && s.fill,
        fill && { flexDirection: 'row', alignItems: 'center', gap: 24 },
      ]}
    >
      <View style={fill ? { width: '32%' } : undefined}>
        <Text style={s.bentoTitle}>Organize course modules.</Text>
        <Text style={s.bentoBody}>{open ? 'Select again to collapse the modules.' : 'Select the stack to view the modules.'}</Text>
      </View>
      <View
        onLayout={(e) => setBoxW(e.nativeEvent.layout.width)}
        style={fill ? { flex: 1, height: 200 } : { height: 170, marginTop: 20 }}
      >
        {cards.map((c, i) => (
          <Animated.View
            key={c.t}
            style={[
              s.miniCard,
              {
                width: cw,
                height: ch,
                top: fill ? 25 : 10,
                backgroundColor: c.c,
                zIndex: i,
                transform: [
                  { translateX: fan.interpolate({ inputRange: [0, 1], outputRange: [i * step * 0.35, i * step] }) },
                  { translateY: fan.interpolate({ inputRange: [0, 1], outputRange: [i * -3, i % 2 ? 12 : -6] }) },
                  { rotate: fan.interpolate({ inputRange: [0, 1], outputRange: [`${(i - 2) * 2}deg`, `${(i - 2) * 6}deg`] }) },
                ],
              },
            ]}
          >
            <Text style={[s.miniCardTitle, { color: c.fg }]}>{c.t}</Text>
            <Text style={[s.miniCardMeta, { color: c.fg }]}>{c.m}</Text>
          </Animated.View>
        ))}
      </View>
    </Chunky>
  );
}

function StreakTile({ fill, reduce }: { fill: boolean; reduce: boolean }) {
  const [n, setN] = useState(3);
  const pop = useRef(new Animated.Value(0)).current;
  const sway = useLoop(reduce, 700);
  const hit = () => {
    setN((v) => v + 1);
    pop.setValue(0);
    Animated.sequence([
      Animated.timing(pop, { toValue: 1, duration: 90, useNativeDriver: true }),
      Animated.spring(pop, { toValue: 0, friction: 3, tension: 140, useNativeDriver: true }),
    ]).start();
  };
  const line = n < 5 ? 'Select to add a day.' : n < 10 ? 'Keep up the good work.' : 'Excellent consistency.';
  return (
    <Chunky
      face={C.blue}
      shadow={C.blueDeep}
      radius={28}
      depth={9}
      onPress={hit}
      style={fill ? s.fill : undefined}
      faceStyle={[{ padding: 24, minHeight: 300, justifyContent: 'space-between' }, fill && s.fill]}
    >
      <Animated.View
        style={{
          alignSelf: 'flex-start',
          transform: [
            { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] }) },
            { rotate: sway.interpolate({ inputRange: [0, 1], outputRange: ['-6deg', '6deg'] }) },
          ],
        }}
      >
        <Ionicons name="flame" size={76} color={C.yellow} />
      </Animated.View>
      <View>
        <Animated.Text style={[s.streakNum, { transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }] }]}>
          {n}
        </Animated.Text>
        <Text style={s.bentoBodyW}>Study streak</Text>
        <Text style={s.bentoHint}>{line}</Text>
      </View>
    </Chunky>
  );
}

function SlidesTile({ fill }: { fill: boolean }) {
  const fly = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  const bump = useRef(new Animated.Value(0)).current;
  const xs = [-48, 0, 48];
  const launch = () => {
    fly.forEach((v) => v.setValue(0));
    Animated.stagger(
      130,
      fly.map((v) => Animated.timing(v, { toValue: 1, duration: 850, easing: Easing.in(Easing.quad), useNativeDriver: true }))
    ).start();
    Animated.sequence([
      Animated.delay(780),
      Animated.timing(bump, { toValue: 1, duration: 90, useNativeDriver: true }),
      Animated.spring(bump, { toValue: 0, friction: 3, tension: 140, useNativeDriver: true }),
    ]).start();
  };
  return (
    <Chunky
      face={C.pink}
      shadow={C.pinkDeep}
      radius={28}
      depth={9}
      onPress={launch}
      style={fill ? s.fill : undefined}
      faceStyle={[{ padding: 24, minHeight: 300, justifyContent: 'space-between' }, fill && s.fill]}
    >
      <View style={{ height: 150, alignItems: 'center', justifyContent: 'flex-end' }}>
        {fly.map((v, i) => (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={{
              position: 'absolute',
              bottom: 26,
              opacity: v.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 1, 1, 0] }),
              transform: [
                { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [xs[i], xs[i] * 0.15] }) },
                { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-110, 0] }) },
                { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.5] }) },
                { rotate: `${(i - 1) * 14}deg` },
              ],
            }}
          >
            <Ionicons name="document-text" size={32} color={C.ink} />
          </Animated.View>
        ))}
        <Animated.View style={{ transform: [{ scale: bump.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }] }}>
          <Ionicons name="cloud" size={104} color={C.blue} />
        </Animated.View>
      </View>
      <View>
        <Text style={s.bentoTitle}>Store slide decks online.</Text>
        <Text style={s.bentoBody}>Select to upload a deck.</Text>
      </View>
    </Chunky>
  );
}

const PEOPLE: { icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string; line: string }[] = [
  { icon: 'school', bg: C.blue, fg: '#FFFFFF', line: 'A student completed Quiz 3.' },
  { icon: 'easel', bg: C.coral, fg: C.cream, line: 'Faculty published Module 2.' },
  { icon: 'shield-checkmark', bg: C.pink, fg: C.ink, line: 'The chair approved enrollments.' },
];

function HopAvatar({ p, i, onPress }: { p: (typeof PEOPLE)[number]; i: number; onPress: () => void }) {
  const h = useRef(new Animated.Value(0)).current;
  const press = () => {
    Animated.sequence([
      Animated.timing(h, { toValue: -24, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(h, { toValue: 0, friction: 3, tension: 130, useNativeDriver: true }),
    ]).start();
    onPress();
  };
  return (
    <Animated.View style={{ transform: [{ translateY: h }, { rotate: `${(i - 1) * 6}deg` }] }}>
      <Pressable onPress={press} accessibilityRole="button" style={[s.syncAvatar, { backgroundColor: p.bg }]}>
        <Ionicons name={p.icon} size={30} color={p.fg} />
      </Pressable>
    </Animated.View>
  );
}

function SyncTile({ fill }: { fill: boolean }) {
  const { anim, text, say } = useBubble();
  const [bump, setBump] = useState(0);
  return (
    <Chunky
      inert
      face={C.yellow}
      shadow="#E8C84A"
      radius={28}
      depth={9}
      style={fill ? s.fill : undefined}
      faceStyle={[{ padding: 24, minHeight: 300, justifyContent: 'space-between', overflow: 'hidden' }, fill && s.fill]}
    >
      <View>
        <Text style={s.bentoTitle}>One workspace for every role.</Text>
        <Text style={s.bentoBody}>Select a role to see recent activity.</Text>
      </View>

      {/* wide screens: model sits on the right; phones: model sits above the roles */}
      {fill ? (
        <View pointerEvents="none" style={s.syncModel}>
          <ModelViewer bump={bump} />
        </View>
      ) : (
        <View pointerEvents="none" style={{ height: 170, marginTop: 8 }}>
          <ModelViewer bump={bump} />
        </View>
      )}

      <View style={{ height: 130, justifyContent: 'flex-end' }}>
        <SpeechBubble text={text} anim={anim} style={{ left: 0, top: 0, maxWidth: 260 }} />
        <View style={{ flexDirection: 'row', gap: 14 }}>
          {PEOPLE.map((p, i) => (
            <HopAvatar
              key={p.icon}
              p={p}
              i={i}
              onPress={() => {
                say(p.line);
                setBump((n) => n + 1);
              }}
            />
          ))}
        </View>
      </View>
    </Chunky>
  );
}

function BentoSection({ isDesktop, reduce }: { isDesktop: boolean; reduce: boolean }) {
  const row = isDesktop ? { flexDirection: 'row' as const, gap: 24 } : { gap: 20 };
  return (
    <Band
      color={C.paper}
      isDesktop={isDesktop}
      marginTop={30}
      bottom={96}
      decor={
        <>
          <Doodle kind="star" color={C.coral} size={46} rot={14} style={{ top: 36, right: isDesktop ? 90 : 20 }} />
          <Doodle kind="ring" color={C.blue} size={34} style={{ top: 96, right: isDesktop ? 160 : 70 }} />
        </>
      }
    >
      <Text style={[s.h2, isDesktop && s.h2Desktop]}>Explore the platform.</Text>
      <Text style={s.sectionLead}>Select any tile to see how EduPortal supports faculty, students and program chairs.</Text>
      <View style={{ gap: isDesktop ? 24 : 20 }}>
        <View style={row}>
          <View style={isDesktop ? { flex: 2 } : undefined}>
            <ModulesTile fill={isDesktop} />
          </View>
          <View style={isDesktop ? { flex: 1 } : undefined}>
            <StreakTile fill={isDesktop} reduce={reduce} />
          </View>
        </View>
        <View style={row}>
          <View style={isDesktop ? { flex: 1 } : undefined}>
            <SlidesTile fill={isDesktop} />
          </View>
          <View style={isDesktop ? { flex: 2 } : undefined}>
            <SyncTile fill={isDesktop} />
          </View>
        </View>
      </View>
    </Band>
  );
}

/* ------------------------------------------------------------------ */
/*  Role previews                                                      */
/* ------------------------------------------------------------------ */
type RoleKey = 'student' | 'faculty' | 'chair';

const ROLES: {
  key: RoleKey;
  label: string;
  blurb: string;
  details: string;
  color: string;
  deep: string;
  window: string;
}[] = [
  {
    key: 'student',
    label: 'Student',
    blurb: 'See your courses, open materials and take quizzes.',
    details: 'Pick up lessons where you left off, track progress and complete quizzes.',
    color: C.blue,
    deep: C.blueDeep,
    window: 'My courses',
  },
  {
    key: 'faculty',
    label: 'Faculty',
    blurb: 'Build modules, quizzes and slide decks.',
    details: 'Create course content, publish lessons and monitor how students are learning.',
    color: C.coral,
    deep: C.coralDeep,
    window: 'Faculty studio',
  },
  {
    key: 'chair',
    label: 'Program chair',
    blurb: 'Manage accounts, statuses and enrollments.',
    details: 'Oversee the program, manage people and keep student and faculty records up to date.',
    color: C.yellow,
    deep: '#E8C84A',
    window: 'Chair dashboard',
  },
];

function ProgressRow({ code, title, pct, color, delay }: { code: string; title: string; pct: number; color: string; delay: number }) {
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(w, { toValue: pct, duration: 800, delay, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [pct, delay, w]);
  return (
    <View style={s.pRow}>
      <View style={[s.codeChip, { backgroundColor: color }]}>
        <Text style={s.codeChipText}>{code}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.pTitle}>{title}</Text>
        <View style={s.track}>
          <Animated.View
            style={[s.fill2, { backgroundColor: color, width: w.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]}
          />
        </View>
      </View>
      <Text style={s.pPct}>{pct}%</Text>
    </View>
  );
}

function StudentPreview() {
  return (
    <View>
      <ProgressRow code="NET 201" title="Computer Networks" pct={72} color={C.blue} delay={0} />
      <ProgressRow code="CS 214" title="Data Structures" pct={45} color={C.coral} delay={120} />
      <ProgressRow code="WEB 120" title="Web Systems" pct={90} color={C.yellow} delay={240} />
      <View style={s.notice}>
        <Ionicons name="alarm-outline" size={20} color={C.ink} />
        <Text style={s.noticeText}>Quiz 3 opens Friday. 10 questions, 20 minutes.</Text>
      </View>
    </View>
  );
}

function UploadTile() {
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const prog = useRef(new Animated.Value(0)).current;
  const onPress = () => {
    if (state === 'busy') return;
    if (state === 'done') {
      prog.setValue(0);
      setState('idle');
      return;
    }
    setState('busy');
    Animated.timing(prog, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: false }).start(() =>
      setState('done')
    );
  };
  return (
    <Pressable onPress={onPress} style={s.upload}>
      <Animated.View
        style={[s.uploadFill, { width: prog.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}
      />
      <Ionicons
        name={state === 'done' ? 'checkmark-circle' : 'cloud-upload-outline'}
        size={24}
        color={C.ink}
        style={{ marginRight: 10 }}
      />
      <Text style={s.uploadText}>
        {state === 'idle' && 'Tap to upload a slide deck'}
        {state === 'busy' && 'Uploading week1-routing.pptx…'}
        {state === 'done' && 'week1-routing.pptx is in cloud storage'}
      </Text>
    </Pressable>
  );
}

function ModuleRow({ title, lessons, initial }: { title: string; lessons: string; initial: boolean }) {
  const [live, setLive] = useState(initial);
  return (
    <View style={s.modRow}>
      <View style={{ flex: 1 }}>
        <Text style={s.pTitle}>{title}</Text>
        <Text style={s.modMeta}>{lessons}</Text>
      </View>
      <Pressable
        onPress={() => setLive((v) => !v)}
        style={[s.pill, { backgroundColor: live ? C.blue : C.pink }]}
        accessibilityRole="switch"
        accessibilityState={{ checked: live }}
      >
        <Text style={[s.pillText, { color: live ? '#FFFFFF' : C.ink }]}>{live ? 'Published' : 'Draft'}</Text>
      </Pressable>
    </View>
  );
}

function FacultyPreview() {
  return (
    <View>
      <ModuleRow title="Module 1: Addressing" lessons="4 lessons, 1 quiz" initial />
      <ModuleRow title="Module 2: Routing" lessons="6 lessons, 2 quizzes" initial />
      <ModuleRow title="Module 3: Security" lessons="3 lessons" initial={false} />
      <UploadTile />
    </View>
  );
}

const STATUSES = [
  { label: 'Active', bg: C.blue, fg: '#FFFFFF' },
  { label: 'Pending', bg: C.yellow, fg: C.ink },
  { label: 'Graduated', bg: C.pink, fg: C.ink },
];

function AccountRow({ name, role, start }: { name: string; role: string; start: number }) {
  const [i, setI] = useState(start);
  const st = STATUSES[i];
  return (
    <View style={s.modRow}>
      <View style={s.avatarSm}>
        <Text style={s.avatarSmText}>{name.split(' ').map((p) => p[0]).join('')}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.pTitle}>{name}</Text>
        <Text style={s.modMeta}>{role}</Text>
      </View>
      <Pressable onPress={() => setI((n) => (n + 1) % STATUSES.length)} style={[s.pill, { backgroundColor: st.bg }]}>
        <Text style={[s.pillText, { color: st.fg }]}>{st.label}</Text>
      </Pressable>
    </View>
  );
}

function ChairPreview() {
  return (
    <View>
      <AccountRow name="Maria Santos" role="Student, Year 2" start={0} />
      <AccountRow name="Dr. Reyes" role="Faculty" start={0} />
      <AccountRow name="Paolo Cruz" role="Student, Year 4" start={2} />
      <Text style={s.hintText}>Tap a status to change it.</Text>
    </View>
  );
}

function RolesSection({ isDesktop }: { isDesktop: boolean }) {
  const [role, setRole] = useState<RoleKey>('student');
  const fade = useRef(new Animated.Value(1)).current;
  const colorIdx = useRef(new Animated.Value(0)).current;

  const pick = (k: RoleKey) => {
    if (k === role) return;
    setRole(k);
    fade.setValue(0);
    Animated.spring(fade, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }).start();
    Animated.timing(colorIdx, {
      toValue: ROLES.findIndex((r) => r.key === k),
      duration: 260,
      useNativeDriver: false,
    }).start();
  };

  const barColor = colorIdx.interpolate({ inputRange: [0, 1, 2], outputRange: [C.blue, C.coral, C.yellow] });
  const current = ROLES.find((r) => r.key === role)!;

  return (
    <Band
      color={C.pink}
      isDesktop={isDesktop}
      marginTop={0}
      edge="scallop"
      decor={
        <>
          <Doodle kind="plus" color={C.coral} size={34} rot={12} style={{ top: 44, right: isDesktop ? 120 : 24 }} />
          <Doodle kind="dot" color={C.yellow} size={22} style={{ top: 100, right: isDesktop ? 70 : 60 }} />
        </>
      }
    >
      <Text style={[s.h2, isDesktop && s.h2Desktop]}>Pick your seat.</Text>
      <Text style={s.sectionLead}>Everyone signs in to the same place and sees a different one.</Text>

      <View style={[s.rolesRow, isDesktop && { flexDirection: 'row', gap: 44, alignItems: 'flex-start' }]}>
        <View style={[s.tabs, isDesktop && { width: 380 }]}>
          {ROLES.map((r) => {
            const on = r.key === role;
            return (
              <Chunky
                key={r.key}
                held={on}
                face={on ? r.color : C.paper}
                shadow={on ? r.deep : C.pinkDeep}
                radius={20}
                depth={7}
                onPress={() => pick(r.key)}
                faceStyle={{ padding: 18 }}
              >
                <Text style={s.tabLabel}>{r.label}</Text>
                <Text style={s.tabBlurb}>{r.blurb}</Text>
              </Chunky>
            );
          })}
        </View>

        <View style={[s.window, isDesktop && { flex: 1 }]}>
          <Animated.View style={[s.windowBar, { backgroundColor: barColor }]}>
            <View style={s.dot} />
            <View style={s.dot} />
            <View style={s.dot} />
            <Text style={s.windowTitle}>{current.window}</Text>
          </Animated.View>
          <Animated.View
            key={role}
            style={{
              padding: 20,
              minHeight: 290,
              transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
            }}
          >
            <Text style={s.previewLead}>{current.details}</Text>
            {role === 'student' && <StudentPreview />}
            {role === 'faculty' && <FacultyPreview />}
            {role === 'chair' && <ChairPreview />}
          </Animated.View>
        </View>
      </View>
    </Band>
  );
}

/* ------------------------------------------------------------------ */
/*  Try-a-question demo                                                */
/* ------------------------------------------------------------------ */
const QUESTIONS = [
  {
    q: 'Which OSI layer is responsible for routing packets between networks?',
    options: ['Data link', 'Network', 'Transport', 'Session'],
    answer: 1,
    why: 'The network layer decides which path packets take between networks.',
  },
  {
    q: 'What does a primary key do in a database table?',
    options: ['Encrypts rows', 'Sorts columns', 'Uniquely identifies each row', 'Links two databases'],
    answer: 2,
    why: 'Every row gets one unique, non-null identifier.',
  },
  {
    q: 'Which HTTP status code means the page was not found?',
    options: ['200', '301', '404', '500'],
    answer: 2,
    why: '404 is the standard "not found" response.',
  },
];
const PRAISE = ['Nice one!', 'Correct!', 'You got it!'];
const QUIZ_SECONDS = 20;

function QuizDemo({ isDesktop }: { isDesktop: boolean }) {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [timeUp, setTimeUp] = useState(false);
  const [score, setScore] = useState(0);
  const [shot, setShot] = useState(0);
  const pickedRef = useRef<number | null>(null);

  const timer = useRef(new Animated.Value(1)).current;
  const jump = useRef(new Animated.Value(0)).current;
  const sink = useRef(new Animated.Value(0)).current;
  const shakeX = useRef(new Animated.Value(0)).current;
  const { anim, text, say } = useBubble();

  const done = idx >= QUESTIONS.length;
  const q = QUESTIONS[Math.min(idx, QUESTIONS.length - 1)];

  useEffect(() => {
    if (done) return;
    timer.setValue(1);
    Animated.timing(timer, {
      toValue: 0,
      duration: QUIZ_SECONDS * 1000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && pickedRef.current === null) {
        setTimeUp(true);
        Animated.spring(sink, { toValue: 26, friction: 6, useNativeDriver: true }).start();
        say("Time's up!");
      }
    });
    return () => timer.stopAnimation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  const choose = (i: number) => {
    if (picked !== null || timeUp) return;
    setPicked(i);
    pickedRef.current = i;
    timer.stopAnimation();
    if (i === q.answer) {
      setScore((n) => n + 1);
      setShot((n) => n + 1);
      Animated.sequence([
        Animated.timing(jump, { toValue: -34, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(jump, { toValue: 0, friction: 3, tension: 110, useNativeDriver: true }),
      ]).start();
      say(PRAISE[Math.floor(Math.random() * PRAISE.length)]);
    } else {
      shake(shakeX, 12);
      say('Not quite. Check below.');
    }
  };

  const next = () => {
    setPicked(null);
    pickedRef.current = null;
    setTimeUp(false);
    Animated.spring(sink, { toValue: 0, friction: 6, useNativeDriver: true }).start();
    const n = idx + 1;
    setIdx(n);
    if (n >= QUESTIONS.length && score === QUESTIONS.length) setShot((v) => v + 1);
  };

  const restart = () => {
    setScore(0);
    setPicked(null);
    pickedRef.current = null;
    setTimeUp(false);
    setIdx(0);
  };

  const answered = picked !== null || timeUp;
  const fillColor = timer.interpolate({ inputRange: [0, 0.3, 1], outputRange: [C.red, C.coral, C.blue] });

  return (
    <View style={{ marginTop: 100, flex: isDesktop ? 1 : undefined }}>
      {/* mascot peeking over the card */}
      <Animated.View
        pointerEvents="none"
        style={[
          s.quizMascot,
          { transform: [{ translateX: shakeX }, { translateY: Animated.add(jump, sink) }] },
        ]}
      >
        <Image source={require('@/assets/images/mascot.png')} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
      </Animated.View>
      <SpeechBubble text={text} anim={anim} tail="right" style={{ position: 'absolute', top: -74, right: 190, zIndex: 3 }} />

      <View style={[s.quizCard, { zIndex: 1 }]}>
        {done ? (
          <View style={{ alignItems: 'flex-start' }}>
            <Text style={s.quizDoneTitle}>
              You got {score} of {QUESTIONS.length}.
            </Text>
            <Text style={s.quizWhy}>
              {score === QUESTIONS.length ? 'A clean sweep.' : 'Faculty can let students retake quizzes, too.'}
            </Text>
            <View style={{ height: 18 }} />
            <Btn label="Play again" tone="blue" onPress={restart} />
          </View>
        ) : (
          <>
            <View style={s.quizTop}>
              <Text style={s.quizCount}>
                Question {idx + 1} of {QUESTIONS.length}
              </Text>
              <Text style={s.quizCount}>{QUIZ_SECONDS}s limit</Text>
            </View>
            <View style={s.timerTrack}>
              <Animated.View
                style={[
                  s.timerFill,
                  { backgroundColor: fillColor, width: timer.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
                ]}
              />
            </View>

            <Text style={s.quizQ}>{q.q}</Text>

            {q.options.map((opt, i) => {
              const isAnswer = i === q.answer;
              const isPicked = picked === i;
              const showRight = answered && isAnswer;
              const showWrong = isPicked && !isAnswer;
              return (
                <Pressable
                  key={opt}
                  onPress={() => choose(i)}
                  disabled={answered}
                  style={[
                    s.opt,
                    showRight && { backgroundColor: C.blue, borderColor: C.ink },
                    showWrong && { backgroundColor: C.pink, borderColor: C.red },
                  ]}
                >
                  <View style={[s.optBadge, showRight && { backgroundColor: '#FFFFFF' }]}>
                    <Text style={s.optBadgeText}>{String.fromCharCode(65 + i)}</Text>
                  </View>
                  <Text style={[s.optText, showRight && { color: '#FFFFFF' }, showWrong && { color: C.red }]}>{opt}</Text>
                </Pressable>
              );
            })}

            {answered && (
              <View style={{ marginTop: 6 }}>
                <Text style={s.quizWhy}>{timeUp && picked === null ? `Out of time. ${q.why}` : q.why}</Text>
                <View style={{ height: 14 }} />
                <Btn label={idx === QUESTIONS.length - 1 ? 'See my score' : 'Next question'} tone="coral" onPress={next} />
              </View>
            )}
          </>
        )}
      </View>
      <Burst shot={shot} />
    </View>
  );
}

function QuizSection({ isDesktop }: { isDesktop: boolean }) {
  return (
    <Band
      color={C.blue}
      isDesktop={isDesktop}
      bottom={90}
      marginTop={0}
      edge="slant"
    >
      <View style={isDesktop ? { flexDirection: 'row', gap: 60, alignItems: 'center' } : undefined}>
        <View style={isDesktop ? { width: 380 } : undefined}>
          <Text style={[s.h2, isDesktop && s.h2Desktop]}>Try one question.</Text>
          <Text style={[s.sectionLead, { color: C.ink }]}>
            This is what faculty build and students take. They set the timer, the options and the passing score.
          </Text>
        </View>
        <QuizDemo isDesktop={isDesktop} />
      </View>
    </Band>
  );
}

/* ------------------------------------------------------------------ */
/*  Closing call to action                                             */
/* ------------------------------------------------------------------ */
function CtaBand({ isDesktop, reduce }: { isDesktop: boolean; reduce: boolean }) {
  const wave = useLoop(reduce, 1400);
  return (
    <Band
      color={C.yellow}
      isDesktop={isDesktop}
      bottom={72}
      marginTop={0}
      edge="slantR"
      decor={
        <>
          <Doodle kind="star" color={C.coral} size={36} rot={10} style={{ top: 50, left: isDesktop ? '48%' : undefined, right: isDesktop ? undefined : 30 }} />
          <Doodle kind="plus" color={C.blue} size={28} rot={-8} style={{ bottom: 40, left: 24 }} />
        </>
      }
    >
      <View
        style={[
          s.ctaLayout,
          isDesktop && { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 48 },
        ]}
      >
        <View style={{ flex: isDesktop ? 1 : undefined }}>
          <Text style={[s.ctaTitle, isDesktop && { fontSize: 54, lineHeight: 58 }, { color: C.ink }]}>
            Ready when you are.
          </Text>
          <Text style={[s.ctaLead, { color: C.ink }]}>Sign in with your school account, or make a new one in under a minute.</Text>
          <View style={s.ctaRow}>
            <Btn label="Sign in" tone="paper" onPress={() => router.push('/login')} />
            <Btn label="Create an account" tone="blue" onPress={() => router.push('/register')} />
          </View>
        </View>
        <Animated.Image
          source={require('@/assets/images/mascot_gif.gif')}
          resizeMode="contain"
          style={{
            width: isDesktop ? 300 : 210,
            height: isDesktop ? 300 : 210,
            alignSelf: isDesktop ? 'auto' : 'center',
            marginTop: isDesktop ? 0 : 20,
            transform: [{ rotate: wave.interpolate({ inputRange: [0, 1], outputRange: ['-3deg', '3deg'] }) }],
          }}
        />
      </View>
    </Band>
  );
}

/* ------------------------------------------------------------------ */
/*  Signed out                                                         */
/* ------------------------------------------------------------------ */
function SignedOutView({
  W,
  viewportHeight,
  isDesktop,
  reduce,
  go,
}: {
  W: number;
  viewportHeight: number;
  isDesktop: boolean;
  reduce: boolean;
  go: boolean;
}) {
  const H = heroHeight(W, isDesktop);
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [nextLayout, setNextLayout] = useState({ y: H, height: 0 });
  const lowerContentY = scrollY.interpolate({
    inputRange: [0, H * 0.75, H * 1.8],
    outputRange: [56, 56, 0],
    extrapolate: 'clamp',
  });
  const nextOpacity = scrollY.interpolate({
    inputRange: [0, H * 0.12, H * 0.55],
    outputRange: [0, 0.65, 1],
    extrapolate: 'clamp',
  });
  const heroFadeOpacity = scrollY.interpolate({
    inputRange: [0, H * 0.8, H * 1.25, H * 1.8],
    outputRange: [1, 1, 0.7, 0],
    extrapolate: 'clamp',
  });
  const cueBounce = useLoop(reduce, 900);
  const showNext = () => {
    const centeredY = nextLayout.y - Math.max(0, (viewportHeight - nextLayout.height) / 2);
    scrollRef.current?.scrollTo({ y: Math.max(0, centeredY), animated: true });
  };

  return (
    <View style={{ flex: 1 }}>
      <Animated.ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ backgroundColor: C.bg }}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
      >
        <View>
          <Stage W={W} H={H} isDesktop={isDesktop} reduce={reduce} go={go} scrollY={scrollY} heroFadeOpacity={heroFadeOpacity}>
            {isDesktop && (
              <View
                pointerEvents="box-none"
                style={{ position: 'absolute', left: W * 0.46, right: 56, top: 0, bottom: 0, justifyContent: 'center', zIndex: 2 }}
              >
                <HeroCopy isDesktop go={go} />
              </View>
            )}
          </Stage>
        </View>
        <Animated.View
          style={{
            backgroundColor: C.bg,
            transform: [{ translateY: lowerContentY }],
          }}
        >
          {!isDesktop && (
            <View style={{ paddingHorizontal: 22, paddingTop: 22, paddingBottom: 40 }}>
              <HeroCopy isDesktop={false} go={go} />
            </View>
          )}
          <Animated.View
            style={{ opacity: nextOpacity }}
            onLayout={(event) => {
              const { y, height } = event.nativeEvent.layout;
              setNextLayout({ y: H + y, height });
            }}
          >
            <RibbonCross reduce={reduce} />
            <BentoSection isDesktop={isDesktop} reduce={reduce} />
          </Animated.View>
          <RolesSection isDesktop={isDesktop} />
          <QuizSection isDesktop={isDesktop} />
          <CtaBand isDesktop={isDesktop} reduce={reduce} />
        </Animated.View>
      </Animated.ScrollView>
      <Animated.View
        style={[
          s.scrollCue,
          {
            opacity: scrollY.interpolate({
              inputRange: [0, H * 0.18, H * 0.42],
              outputRange: [1, 0.72, 0],
              extrapolate: 'clamp',
            }),
            transform: [
              { translateX: -50 },
              {
                translateY: cueBounce.interpolate({ inputRange: [0, 1], outputRange: [0, 8] }),
              },
            ],
          },
        ]}
      >
        <Pressable onPress={showNext} style={s.scrollCuePressable} accessibilityRole="button">
          <Text style={s.scrollCueText}>Scroll to explore</Text>
          <Animated.View
            style={{
              transform: [
                {
                  translateY: scrollY.interpolate({
                    inputRange: [0, H * 0.2],
                    outputRange: [0, -5],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            }}
          >
            <Ionicons name="chevron-down" size={22} color={C.ink} />
          </Animated.View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Signed in                                                          */
/*  Same hero backdrop as guests, with the info on the right.          */
/* ------------------------------------------------------------------ */
type ToneKey = 'lavender' | 'golden' | 'sky' | 'orange';
const TONE: Record<ToneKey, { bg: string; deep: string; fg: string }> = {
  lavender: { bg: C.blue, deep: C.blueDeep, fg: '#FFFFFF' },
  golden: { bg: C.cream, deep: '#E8D77A', fg: C.ink },
  sky: { bg: C.pink, deep: C.pinkDeep, fg: C.ink },
  orange: { bg: C.coral, deep: C.coralDeep, fg: C.cream },
};

type ActionDef = {
  tone: ToneKey;
  label: string;
  hint: string;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
};
type ActionSet = { primary: ActionDef; others: ActionDef[] };

const CHAIR_ACTIONS: ActionSet = {
  primary: { tone: 'lavender', label: 'Chair Dashboard', hint: 'Accounts and lifecycle portal', route: '/chair/dashboard', icon: 'shield-checkmark' },
  others: [{ tone: 'golden', label: 'Faculty Studio', hint: 'Course manager and topics', route: '/faculty/dashboard', icon: 'easel' }],
};

const FACULTY_ACTIONS: ActionSet = {
  primary: { tone: 'lavender', label: 'Faculty Dashboard', hint: 'Course manager and studio', route: '/faculty/dashboard', icon: 'easel' },
  others: [
    { tone: 'orange', label: 'Course Modules', hint: 'Organize topic hierarchy', route: '/faculty/dashboard', icon: 'albums' },
    { tone: 'sky', label: 'Quiz Studio', hint: 'Multiple choice builder', route: '/faculty/dashboard', icon: 'help-circle' },
    { tone: 'golden', label: 'Presentations', hint: 'Cloud slide storage', route: '/faculty/dashboard', icon: 'cloud-upload' },
  ],
};

const STUDENT_ACTIONS: ActionSet = {
  primary: { tone: 'lavender', label: 'Student Dashboard', hint: 'Open your learning center', route: '/student/dashboard', icon: 'school' },
  others: [{ tone: 'sky', label: 'Enrolled Courses', hint: 'View your curriculum', route: '/student/dashboard', icon: 'book' }],
};

const COURSE_TONES: ToneKey[] = ['sky', 'golden', 'orange'];

/** Squishy fact chip shown in the hero */
function InfoChip({ label, value, bg, fg, rot }: { label: string; value: string; bg: string; fg: string; rot: number }) {
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
      <Pressable onPress={press} style={[s.infoChip, { backgroundColor: bg }]}>
        <Text style={[s.infoChipLabel, { color: fg }]}>{label}</Text>
        <Text style={[s.infoChipValue, { color: fg }]} numberOfLines={1}>
          {value}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function WelcomeCopy({
  user,
  isDesktop,
  roleLabel,
  subtitle,
  isStudent,
  courseCount,
  go,
}: {
  user: any;
  isDesktop: boolean;
  roleLabel: string;
  subtitle: string;
  isStudent: boolean;
  courseCount: number;
  go: boolean;
}) {
  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || 'U';
  const chips = isStudent
    ? [
        { k: 'year', label: 'Year level', value: user.yearLevel || 'Not set', bg: C.coral, fg: C.cream, rot: -3 },
        { k: 'sem', label: 'Semester', value: user.activeSemester || 'Not set', bg: C.blue, fg: '#FFFFFF', rot: 2 },
        { k: 'subj', label: 'Courses', value: `${courseCount}`, bg: C.cream, fg: C.ink, rot: -1.5 },
      ]
    : [
        { k: 'role', label: 'Role', value: roleLabel, bg: C.blue, fg: '#FFFFFF', rot: -2 },
        ...(user.username
          ? [{ k: 'user', label: 'Signed in as', value: `@${user.username}`, bg: C.cream, fg: C.ink, rot: 2 }]
          : []),
      ];

  return (
    <View>
      <Enter go={go} delay={80}>
        <View style={s.greetRow}>
          <View style={s.avatar}>
            {user.avatar ? (
              <Image source={{ uri: user.avatar }} style={s.avatarImg} />
            ) : (
              <Text style={s.avatarText}>{initials}</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.greetSmall}>Welcome back,</Text>
            <Text style={[s.greetName, isDesktop && { fontSize: 46, lineHeight: 50 }]} numberOfLines={2}>
              {user.firstName} {user.lastName}
            </Text>
          </View>
        </View>
      </Enter>
      <Enter go={go} delay={220} style={{ alignSelf: 'flex-start' }}>
        <View style={s.rolePill}>
          <Text style={s.rolePillText}>{roleLabel}</Text>
        </View>
      </Enter>
      <Enter go={go} delay={340} y={14}>
        <Text style={[s.lead, isDesktop && s.leadDesktop, { maxWidth: 520 }]}>{subtitle}</Text>
      </Enter>
      <Enter go={go} delay={460} y={18}>
        <View style={s.chipsRow}>
          {chips.map((c) => (
            <InfoChip key={c.k} label={c.label} value={c.value} bg={c.bg} fg={c.fg} rot={c.rot} />
          ))}
        </View>
      </Enter>
    </View>
  );
}

function PrimaryTile({ a, onPress, reduce }: { a: ActionDef; onPress: () => void; reduce: boolean }) {
  const t = TONE[a.tone];
  const nudge = useLoop(reduce, 650);
  return (
    <Chunky
      face={t.bg}
      shadow={t.deep}
      radius={26}
      depth={9}
      onPress={onPress}
      faceStyle={{ padding: 26, minHeight: 230, justifyContent: 'space-between' }}
    >
      <View style={s.bigIcon}>
        <Ionicons name={a.icon} size={34} color={C.ink} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={[s.primaryLabel, { color: t.fg }]}>{a.label}</Text>
          <Text style={[s.primaryHint, { color: t.fg }]}>{a.hint}</Text>
        </View>
        <Animated.View
          style={[
            s.arrowCircle,
            { transform: [{ translateX: nudge.interpolate({ inputRange: [0, 1], outputRange: [0, 6] }) }] },
          ]}
        >
          <Ionicons name="arrow-forward" size={24} color={C.ink} />
        </Animated.View>
      </View>
    </Chunky>
  );
}

function SmallTile({ a, onPress, rot, tall }: { a: ActionDef; onPress: () => void; rot: number; tall: boolean }) {
  const t = TONE[a.tone];
  return (
    <Chunky
      face={t.bg}
      shadow={t.deep}
      radius={20}
      onPress={onPress}
      style={{ flexBasis: tall ? '100%' : '47%', flexGrow: 1, transform: [{ rotate: `${rot}deg` }] }}
      faceStyle={{ padding: 18, minHeight: tall ? 230 : 112, justifyContent: 'space-between' }}
    >
      <View style={s.miniIcon}>
        <Ionicons name={a.icon} size={20} color={C.ink} />
      </View>
      <View>
        <Text style={[s.otherLabel, { color: t.fg }]}>{a.label}</Text>
        <Text style={[s.otherHint, { color: t.fg }]}>{a.hint}</Text>
      </View>
    </Chunky>
  );
}

/**
 * The 3D model for signed-in users (student, faculty, chair).
 * Tap it and it shakes side to side with a little tilt. No speech bubble.
 * The model itself never receives touches (pointerEvents none); the wrapping
 * Pressable owns the tap, and `bump` is also forwarded so the model can react
 * internally the same way it does in the platform tiles.
 */
function ModelBuddy({ size, reduce }: { size: number; reduce: boolean }) {
  const shakeX = useRef(new Animated.Value(0)).current;
  const [bump, setBump] = useState(0);

  const poke = () => {
    setBump((n) => n + 1);
    if (reduce) return;
    shakeX.stopAnimation();
    shakeX.setValue(0);
    Animated.sequence(
      [16, -16, 13, -13, 9, -9, 5, -5, 0].map((to) =>
        Animated.timing(shakeX, { toValue: to, duration: 50, easing: Easing.linear, useNativeDriver: true })
      )
    ).start();
  };

  return (
    <Pressable
      onPress={poke}
      accessibilityRole="button"
      accessibilityLabel="3D model. Tap to shake it."
      style={{ width: size, height: size, alignSelf: 'center' }}
    >
      <Animated.View
        pointerEvents="none"
        style={{
          flex: 1,
          transform: [
            { translateX: shakeX },
            { rotate: shakeX.interpolate({ inputRange: [-16, 16], outputRange: ['-5deg', '5deg'] }) },
          ],
        }}
      >
        <ModelViewer bump={bump} />
      </Animated.View>
    </Pressable>
  );
}

function ShortcutsBand({
  actions,
  isDesktop,
  reduce,
  showModel = false,
}: {
  actions: ActionSet;
  isDesktop: boolean;
  reduce: boolean;
  showModel?: boolean;
}) {
  const go = (route: string) => router.push(route as any);
  const tall = actions.others.length === 1;
  return (
    <Band
      color={C.pink}
      isDesktop={isDesktop}
      marginTop={0}
      edge="scallop"
      decor={<Doodle kind="star" color={C.coral} size={38} rot={12} style={{ top: 40, right: isDesktop ? 80 : 24 }} />}
    >
      {/* heading on the left, 3D model beside it (student, faculty and chair) */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <View style={{ flex: 1 }}>
          <Text style={[s.h2, isDesktop && s.h2Desktop]}>Jump back in.</Text>
          <Text style={s.sectionLead}>The places you use most, one tap away.</Text>
        </View>
        {showModel && <ModelBuddy size={isDesktop ? 200 : 120} reduce={reduce} />}
      </View>

      <View style={isDesktop ? { flexDirection: 'row', gap: 28, alignItems: 'flex-start' } : { gap: 20 }}>
        <View style={isDesktop ? { flex: 1.1 } : undefined}>
          <PrimaryTile a={actions.primary} onPress={() => go(actions.primary.route)} reduce={reduce} />
        </View>
        <View style={[s.otherGrid, isDesktop && { flex: 1 }]}>
          {actions.others.map((a, i) => (
            <SmallTile key={a.label} a={a} tall={tall} rot={i % 2 === 0 ? -0.8 : 0.8} onPress={() => go(a.route)} />
          ))}
        </View>
      </View>
    </Band>
  );
}

function CourseCard({
  code,
  title,
  tone,
  width,
  onPress,
}: {
  code: string;
  title: string;
  tone: ToneKey;
  width: any;
  onPress?: () => void;
}) {
  const t = TONE[tone];
  const open = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(0)).current;
  const to = (v: number) => Animated.spring(open, { toValue: v, friction: 6, tension: 120, useNativeDriver: true }).start();
  const hover = { onHoverIn: () => to(1), onHoverOut: () => to(0) } as any;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${code} ${title}`}
      onPress={onPress}
      onPressIn={() => {
        to(1);
        Animated.timing(press, { toValue: 1, duration: 70, useNativeDriver: true }).start();
      }}
      onPressOut={() => {
        to(0);
        Animated.spring(press, { toValue: 0, friction: 5, useNativeDriver: true }).start();
      }}
      style={{ width }}
      {...hover}
    >
      <Animated.View style={{ transform: [{ scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] }) }] }}>
        {/* tab sticking out of the top-left, like a real file folder */}
        <View style={[s.folderTab, { backgroundColor: t.deep }]}>
          <Text style={s.folderTabText}>{code}</Text>
        </View>

        <View style={s.folderBody}>
          <View style={s.folderDrop} />
          <View style={[s.folderBack, { backgroundColor: t.deep }]} />

          {/* loose sheets that slide up when the folder opens */}
          <Animated.View
            style={[
              s.paper,
              { left: 118, right: 40, transform: [{ translateY: open.interpolate({ inputRange: [0, 1], outputRange: [0, -22] }) }, { rotate: '-3deg' }] },
            ]}
          >
            <View style={s.paperLine} />
            <View style={[s.paperLine, { width: '45%' }]} />
          </Animated.View>
          <Animated.View
            style={[
              s.paper,
              { left: 138, right: 20, transform: [{ translateY: open.interpolate({ inputRange: [0, 1], outputRange: [0, -34] }) }, { rotate: '2.5deg' }] },
            ]}
          >
            <View style={s.paperLine} />
            <View style={[s.paperLine, { width: '60%' }]} />
          </Animated.View>

          {/* front flap */}
          <Animated.View
            style={[
              s.folderFront,
              {
                backgroundColor: t.bg,
                transform: [{ translateY: open.interpolate({ inputRange: [0, 1], outputRange: [0, 4] }) }],
              },
            ]}
          >
            <Text style={[s.folderTitle, { color: t.fg }]} numberOfLines={2}>
              {title}
            </Text>
            <View style={s.folderFoot}>
              <Ionicons name="folder-open-outline" size={18} color={t.fg} />
              <Animated.View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  opacity: open,
                  transform: [{ translateX: open.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }],
                }}
              >
                <Text style={[s.folderOpen, { color: t.fg }]}>Open</Text>
                <Ionicons name="arrow-forward" size={15} color={t.fg} />
              </Animated.View>
            </View>
          </Animated.View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

function CoursesBand({
  courses,
  isDesktop,
  canOpen,
}: {
  courses: { code: string; title: string }[];
  isDesktop: boolean;
  canOpen: boolean;
}) {
  return (
    <Band
      color={C.blue}
      isDesktop={isDesktop}
      marginTop={0}
      bottom={90}
      edge="slant"
      decor={<Doodle kind="ring" color={C.cream} size={32} style={{ top: 46, right: isDesktop ? 90 : 24 }} />}
    >
      <Text style={[s.h2, isDesktop && s.h2Desktop]}>Your courses.</Text>
      <Text style={[s.sectionLead, { color: C.ink }]}>
        {courses.length > 0 ? 'Tap a folder to open it in your dashboard.' : 'Nothing here yet.'}
      </Text>
      {courses.length > 0 ? (
        <View style={s.courseGrid}>
          {courses.map((c, i) => (
            <CourseCard
              key={`${c.code}-${i}`}
              code={c.code}
              title={c.title}
              tone={COURSE_TONES[i % COURSE_TONES.length]}
              width={isDesktop ? '31.5%' : '100%'}
              onPress={
                canOpen
                  ? () =>
                      router.push({
                        pathname: '/student/dashboard',
                        params: { course: c.code },
                      } as any)
                  : undefined
              }
            />
          ))}
        </View>
      ) : (
        <View style={s.emptyBox}>
          <Text style={s.emptyTitle}>No courses yet.</Text>
          <Text style={s.emptyText}>Ask your faculty advisor to enroll you and they will show up here.</Text>
        </View>
      )}
    </Band>
  );
}

function SignedInView({
  user,
  W,
  isDesktop,
  reduce,
  go,
}: {
  user: any;
  W: number;
  isDesktop: boolean;
  reduce: boolean;
  go: boolean;
}) {
  const isChair = user.role === 'program chair' || user.role === 'program_chair' || user.role === 'admin';
  const isFaculty = user.role === 'faculty';
  const isStudent = !isChair && !isFaculty;
  const actions = isChair ? CHAIR_ACTIONS : isFaculty ? FACULTY_ACTIONS : STUDENT_ACTIONS;
  const roleLabel = isChair ? 'Program chair' : isFaculty ? 'Faculty' : 'Student';
  const subtitle = isChair
    ? 'Manage institutional accounts, academic status cohorts and smart enrollments.'
    : isFaculty
      ? 'Manage your subjects, modules, presentations and assessments.'
      : 'Track your enrolled subjects, learning materials and quizzes.';

  // Show every enrolled course (no cap), matching the course display update.
  const allCourses: { code: string; title: string }[] = user.enrolledSubjects ?? [];
  const courses = allCourses;

  const H = heroHeight(W, isDesktop);
  const scrollY = useRef(new Animated.Value(0)).current;

  const copy = (
    <WelcomeCopy
      user={user}
      isDesktop={isDesktop}
      roleLabel={roleLabel}
      subtitle={subtitle}
      isStudent={isStudent}
      courseCount={allCourses.length}
      go={go}
    />
  );

  return (
    <Animated.ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ backgroundColor: C.bg }}
      scrollEventThrottle={16}
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
      })}
    >
      <Stage
        W={W}
        H={H}
        isDesktop={isDesktop}
        reduce={reduce}
        go={go}
        scrollY={scrollY}
        lines={SIGNED_IN_LINES}
        intro={`Welcome back, ${user.firstName || 'friend'}!`}
      >
        {isDesktop && (
          <View
            pointerEvents="box-none"
            style={{ position: 'absolute', left: W * 0.46, right: 56, top: 0, bottom: 0, justifyContent: 'center', zIndex: 2 }}
          >
            {copy}
          </View>
        )}
      </Stage>

      <View style={{ backgroundColor: C.bg }}>
        {!isDesktop && <View style={{ paddingHorizontal: 22, paddingTop: 22, paddingBottom: 70 }}>{copy}</View>}
        <ShortcutsBand actions={actions} isDesktop={isDesktop} reduce={reduce} showModel />
        {isStudent && <CoursesBand courses={courses} isDesktop={isDesktop} canOpen />}
      </View>
    </Animated.ScrollView>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen                                                             */
/* ------------------------------------------------------------------ */
export default function WelcomeScreen() {
  const { isAuthenticated, user } = useAuth();
  const { width, height } = useWindowDimensions();
  const reduce = useReduceMotion();
  const [fontsLoaded] = useFonts({ Outfit_400Regular, Outfit_500Medium, Outfit_700Bold, TitanOne_400Regular });
  const [assetsReady, setAssetsReady] = useState(false);
  const [go, setGo] = useState(false); // curtain has started lifting
  const [curtainGone, setCurtainGone] = useState(false);
  const isDesktop = width >= 900;

  // Preload images; never block longer than 6s if something is slow.
  useEffect(() => {
    let alive = true;
    Asset.loadAsync(PRELOAD)
      .catch(() => {})
      .finally(() => alive && setAssetsReady(true));
    const t = setTimeout(() => alive && setAssetsReady(true), 6000);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        {fontsLoaded &&
          (isAuthenticated && user ? (
            <SignedInView user={user} W={width} isDesktop={isDesktop} reduce={reduce} go={go} />
          ) : (
            <SignedOutView W={width} viewportHeight={height} isDesktop={isDesktop} reduce={reduce} go={go} />
          ))}
      </SafeAreaView>
      {!curtainGone && (
        <Curtain
          ready={fontsLoaded && assetsReady}
          fontsLoaded={fontsLoaded}
          reduce={reduce}
          onStart={() => setGo(true)}
          onDone={() => setCurtainGone(true)}
        />
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */
const s = StyleSheet.create({
  fill: { flex: 1 },

  // type
  headline: { fontFamily: F.display, fontSize: 38, lineHeight: 42, color: C.ink, letterSpacing: 0.2 },
  headlineDesktop: { fontSize: 56, lineHeight: 60 },
  lead: { fontFamily: F.body, fontSize: 16, lineHeight: 24, color: C.ink, marginTop: 14, maxWidth: 540 },
  leadDesktop: { fontSize: 19, lineHeight: 28 },
  h2: { fontFamily: F.display, fontSize: 36, lineHeight: 40, color: C.ink },
  h2Desktop: { fontSize: 48, lineHeight: 52 },
  sectionLead: { fontFamily: F.medium, fontSize: 17, lineHeight: 25, color: C.muted, marginTop: 8, maxWidth: 440, marginBottom: 32 },
  ctaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 26 },
  heroFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 150,
    zIndex: 1,
  },
  mascotLayer: { position: 'absolute', left: 0 },
  heroFadeBand: { flex: 1 },
  scrollCue: {
    position: 'absolute',
    bottom: 24,
    left: '50%',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 251, 240, 0.72)',
    borderWidth: 2,
    borderColor: C.ink,
    zIndex: 100,
    elevation: 20,
  },
  scrollCuePressable: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  scrollCueText: { fontFamily: F.bold, fontSize: 13, color: C.ink },

  // curtain
  lip: { position: 'absolute', left: 0, right: 0, top: '100%', height: 46, borderBottomLeftRadius: 60, borderBottomRightRadius: 60 },
  curtainCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  curtainCard: {
    alignItems: 'center',
    backgroundColor: C.paper,
    borderWidth: 3,
    borderColor: C.ink,
    borderRadius: 28,
    paddingHorizontal: 30,
    paddingTop: 20,
    paddingBottom: 22,
    minWidth: 280,
    shadowColor: C.ink,
    shadowOffset: { width: 8, height: 9 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 12,
  },
  curtainModel: { width: 190, height: 190 },
  curtainIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: C.yellow,
    borderWidth: 2.5,
    borderColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  curtainWord: { fontSize: 38, lineHeight: 44, color: C.ink },
  curtainTrack: {
    width: 220,
    height: 14,
    borderRadius: 8,
    borderWidth: 2.5,
    borderColor: C.ink,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    marginTop: 16,
  },
  curtainFill: { height: '100%', backgroundColor: C.coral },
  curtainCap: { fontSize: 14, color: C.muted, marginTop: 12, height: 20 },

  // ribbons
  ribbonWrap: { height: 150, marginTop: 28, overflow: 'hidden' },
  ribbon: { position: 'absolute', left: -30, right: -30, height: 54, justifyContent: 'center', overflow: 'hidden', borderTopWidth: 3, borderBottomWidth: 3, borderColor: C.ink },
  ribbonRow: { flexDirection: 'row', alignItems: 'center' },
  ribbonItem: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingRight: 18 },
  ribbonText: { fontFamily: F.display, fontSize: 24, letterSpacing: 0.4 },

  // confetti
  burst: { position: 'absolute', left: '50%', top: '42%', width: 1, height: 1, zIndex: 6 },

  // buttons
  btnFace: { paddingHorizontal: 26, height: 54, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: F.display, fontSize: 19, letterSpacing: 0.3 },

  // bubble
  bubble: {
    position: 'absolute',
    maxWidth: 200,
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
    width: 12,
    height: 12,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 2.5,
    borderBottomWidth: 2.5,
    borderColor: C.ink,
    transform: [{ rotate: '45deg' }],
  },

  // stickers
  stickerShadow: { position: 'absolute', left: 4, top: 5, right: -4, bottom: -5, borderRadius: 16, backgroundColor: C.ink },
  stickerFace: {
    width: 76,
    height: 76,
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // bento
  bentoTitle: { fontFamily: F.display, fontSize: 26, lineHeight: 30, color: C.ink },
  bentoBody: { fontFamily: F.medium, fontSize: 15, lineHeight: 21, color: C.ink, marginTop: 6, opacity: 0.85 },
  bentoBodyW: { fontFamily: F.bold, fontSize: 17, color: '#FFFFFF' },
  bentoHint: { fontFamily: F.medium, fontSize: 14, color: '#FFFFFF', marginTop: 4, opacity: 0.9 },
  streakNum: { fontFamily: F.display, fontSize: 80, lineHeight: 84, color: '#FFFFFF' },
  miniCard: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 124,
    height: 112,
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: C.ink,
    padding: 12,
    justifyContent: 'space-between',
  },
  miniCardTitle: { fontFamily: F.bold, fontSize: 15 },
  miniCardMeta: { fontFamily: F.medium, fontSize: 12, opacity: 0.85 },
  syncModel: { position: 'absolute', right: 24, bottom: 8, width: 270, height: 270 },
  syncAvatar: {
    width: 66,
    height: 66,
    borderRadius: 22,
    borderWidth: 2.5,
    borderColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // roles
  rolesRow: { gap: 28 },
  tabs: { gap: 14 },
  tabLabel: { fontFamily: F.display, fontSize: 24, color: C.ink },
  tabBlurb: { fontFamily: F.medium, fontSize: 15, lineHeight: 21, color: C.ink, marginTop: 4, opacity: 0.8 },
  window: {
    backgroundColor: C.paper,
    borderWidth: 3,
    borderColor: C.ink,
    borderRadius: 24,
    overflow: 'hidden',
  },
  windowBar: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 7,
    borderBottomWidth: 3,
    borderBottomColor: C.ink,
  },
  dot: { width: 11, height: 11, borderRadius: 6, backgroundColor: C.paper, borderWidth: 2, borderColor: C.ink },
  windowTitle: { fontFamily: F.bold, fontSize: 15, color: C.ink, marginLeft: 8 },

  // preview rows
  pRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  codeChip: { borderRadius: 10, borderWidth: 2, borderColor: C.ink, paddingHorizontal: 8, paddingVertical: 6, minWidth: 74, alignItems: 'center' },
  codeChipText: { fontFamily: F.bold, fontSize: 12, color: C.ink },
  pTitle: { fontFamily: F.bold, fontSize: 15, color: C.ink },
  pPct: { fontFamily: F.bold, fontSize: 14, color: C.muted, width: 40, textAlign: 'right' },
  previewLead: { fontFamily: F.medium, fontSize: 14, lineHeight: 20, color: C.muted, marginBottom: 18 },
  track: { height: 10, borderRadius: 6, backgroundColor: C.pink, marginTop: 6, overflow: 'hidden' },
  fill2: { height: '100%', borderRadius: 6 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.cream, borderRadius: 14, padding: 14, marginTop: 6 },
  noticeText: { flex: 1, fontFamily: F.medium, fontSize: 14, color: C.ink },
  modRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: C.pink,
  },
  modMeta: { fontFamily: F.body, fontSize: 13, color: C.muted, marginTop: 2 },
  pill: { borderRadius: 999, borderWidth: 2, borderColor: C.ink, paddingHorizontal: 12, paddingVertical: 6 },
  pillText: { fontFamily: F.bold, fontSize: 13 },
  hintText: { fontFamily: F.medium, fontSize: 13, color: C.muted, marginTop: 14 },
  avatarSm: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.coral, borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  avatarSmText: { fontFamily: F.display, fontSize: 14, color: C.cream },
  upload: {
    marginTop: 16,
    height: 62,
    borderRadius: 16,
    borderWidth: 2.5,
    borderStyle: 'dashed',
    borderColor: C.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 12,
  },
  uploadFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: C.pink },
  uploadText: { fontFamily: F.bold, fontSize: 14, color: C.ink, flexShrink: 1 },

  // quiz
  quizMascot: { position: 'absolute', top: -160, right: 10, width: 260, height: 260, zIndex: 0 },
  quizCard: {
    zIndex: 1,
    backgroundColor: C.paper,
    borderWidth: 3,
    borderColor: C.ink,
    borderRadius: 26,
    padding: 24,
  },
  quizTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  quizCount: { fontFamily: F.bold, fontSize: 13, color: C.muted },
  timerTrack: { height: 12, borderRadius: 7, borderWidth: 2, borderColor: C.ink, backgroundColor: '#FFFFFF', overflow: 'hidden', marginBottom: 20 },
  timerFill: { height: '100%' },
  quizQ: { fontFamily: F.bold, fontSize: 20, lineHeight: 27, color: C.ink, marginBottom: 16 },
  opt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: C.pink,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  optBadge: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.cream, borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  optBadgeText: { fontFamily: F.display, fontSize: 14, color: C.ink },
  optText: { flex: 1, fontFamily: F.medium, fontSize: 16, color: C.ink },
  quizWhy: { fontFamily: F.medium, fontSize: 15, lineHeight: 22, color: C.muted },
  quizDoneTitle: { fontFamily: F.display, fontSize: 34, color: C.ink, marginBottom: 6 },

  // closing band
  ctaLayout: { gap: 18 },
  ctaTitle: { fontFamily: F.display, fontSize: 40, lineHeight: 44, color: C.ink },
  ctaLead: { fontFamily: F.medium, fontSize: 17, lineHeight: 25, color: C.ink, marginTop: 10, maxWidth: 460 },

  // signed in: hero info
  greetRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 14 },
  avatar: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: C.coral,
    borderWidth: 3,
    borderColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { fontFamily: F.display, fontSize: 28, color: C.cream },
  greetSmall: { fontFamily: F.medium, fontSize: 16, color: C.muted },
  greetName: { fontFamily: F.display, fontSize: 34, lineHeight: 38, color: C.ink },
  rolePill: { alignSelf: 'flex-start', backgroundColor: C.blue, borderWidth: 2.5, borderColor: C.ink, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, transform: [{ rotate: '-2deg' }] },
  rolePillText: { fontFamily: F.bold, fontSize: 14, color: '#FFFFFF' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 22 },
  infoChip: { borderWidth: 2.5, borderColor: C.ink, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, minWidth: 104, maxWidth: 220 },
  infoChipLabel: { fontFamily: F.bold, fontSize: 12, opacity: 0.9 },
  infoChipValue: { fontFamily: F.display, fontSize: 18, lineHeight: 24 },

  // signed in: shortcuts
  bigIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: C.cream,
    borderWidth: 2.5,
    borderColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-6deg' }],
  },
  miniIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: C.paper,
    borderWidth: 2.5,
    borderColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-5deg' }],
  },
  primaryLabel: { fontFamily: F.display, fontSize: 30, lineHeight: 34 },
  primaryHint: { fontFamily: F.medium, fontSize: 16, marginTop: 4, opacity: 0.9 },
  arrowCircle: { width: 54, height: 54, borderRadius: 27, backgroundColor: C.yellow, borderWidth: 2.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  otherGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, alignContent: 'flex-start' },
  otherLabel: { fontFamily: F.display, fontSize: 22 },
  otherHint: { fontFamily: F.medium, fontSize: 15, marginTop: 2, opacity: 0.9 },

  // signed in: courses
  courseGrid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 22, rowGap: 34 },
  folderTab: {
    alignSelf: 'flex-start',
    marginLeft: 0,
    minWidth: 96,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
    borderWidth: 2.5,
    borderBottomWidth: 0,
    borderColor: C.ink,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 22,
    marginBottom: -2.5,
    zIndex: 2,
  },
  folderTabText: { fontFamily: F.bold, fontSize: 13, color: C.ink },
  folderBody: { height: 132, marginBottom: 8 },
  folderDrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 8,
    bottom: -8,
    borderRadius: 16,
    borderTopLeftRadius: 0,
    backgroundColor: C.ink,
  },
  folderBack: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderWidth: 2.5,
    borderColor: C.ink,
    borderRadius: 16,
    borderTopLeftRadius: 0,
  },
  paper: {
    position: 'absolute',
    top: 14,
    height: 70,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: C.ink,
    borderRadius: 6,
    padding: 8,
    gap: 6,
  },
  paperLine: { height: 3, width: '80%', borderRadius: 2, backgroundColor: C.pink },
  folderFront: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 38,
    borderWidth: 2.5,
    borderColor: C.ink,
    borderRadius: 16,
    padding: 14,
    justifyContent: 'space-between',
  },
  folderTitle: { fontFamily: F.bold, fontSize: 18, lineHeight: 23 },
  folderFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  folderOpen: { fontFamily: F.bold, fontSize: 13 },
  emptyBox: { backgroundColor: C.paper, borderWidth: 3, borderColor: C.ink, borderStyle: 'dashed', borderRadius: 20, padding: 22 },
  emptyTitle: { fontFamily: F.display, fontSize: 22, color: C.ink },
  emptyText: { fontFamily: F.medium, fontSize: 15, lineHeight: 22, color: C.muted, marginTop: 4 },
});