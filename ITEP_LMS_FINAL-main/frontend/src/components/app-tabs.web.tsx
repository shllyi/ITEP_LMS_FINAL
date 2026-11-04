import React, { useEffect, useRef, useState } from 'react';
import { Tabs, TabList, TabTrigger, TabSlot, TabListProps } from 'expo-router/ui';
import {
  Pressable,
  View,
  StyleSheet,
  Text,
  Image,
  Animated,
  Easing,
  AccessibilityInfo,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Outfit_500Medium, Outfit_700Bold } from '@expo-google-fonts/outfit';
import { TitanOne_400Regular } from '@expo-google-fonts/titan-one';
import { useAuth } from '@/context/AuthContext';
import { COLORS } from '@/constants/colors';
import { ProfileDropdown } from './ProfileDropdown';

/* ------------------------------------------------------------------ */
/*  Brand                                                              */
/* ------------------------------------------------------------------ */
const C = {
  bg: '#FDE680',
  coral: '#FF6B81',
  pink: '#FFD1D4',
  cream: '#FFF5BA',
  blue: '#00A3EB',
  ink: '#4A1A24',
  paper: '#FFFBF0',
};
const F = { medium: 'Outfit_500Medium', bold: 'Outfit_700Bold', display: 'TitanOne_400Regular' };

const TONES = {
  coral: { bg: C.coral, fg: C.cream },
  blue: { bg: C.blue, fg: '#FFFFFF' },
  pink: { bg: C.pink, fg: C.ink },
  cream: { bg: C.cream, fg: C.ink },
} as const;
type Tone = keyof typeof TONES;

const LOGO_ASPECT = 1.8145; // width / height of the trimmed logo.png

function useReduceMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setR).catch(() => {});
  }, []);
  return r;
}

// The server has no real window size, so the first client render must match it.
// Only switch to the compact layout after hydration has finished.
function useCompact() {
  const { width } = useWindowDimensions();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated && width < 720;
}

/* ------------------------------------------------------------------ */
/*  One divider tab                                                    */
/* ------------------------------------------------------------------ */
export function TabButton({
  children,
  isFocused,
  icon = 'ellipse',
  tone = 'coral',
  num = '01',
  ...props
}: any) {
  const { ref, ...rest } = props;
  const compact = useCompact();
  const t = TONES[tone as Tone];
  const n = parseInt(num, 10) || 1;

  const act = useRef(new Animated.Value(isFocused ? 1 : 0)).current;
  const hover = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(0)).current;
  const enter = useRef(new Animated.Value(0)).current;

  // tabs slide up out of the folder when the page loads
  useEffect(() => {
    Animated.spring(enter, { toValue: 1, delay: 120 + n * 90, friction: 6, tension: 80, useNativeDriver: false }).start();
  }, [enter, n]);

  // the selected tab pops up and covers the folder's edge line
  useEffect(() => {
    Animated.spring(act, { toValue: isFocused ? 1 : 0, friction: 5, tension: 150, useNativeDriver: false }).start();
  }, [isFocused, act]);

  const to = (v: Animated.Value, value: number, ms = 110) =>
    Animated.timing(v, { toValue: value, duration: ms, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();

  const hoverProps = { onHoverIn: () => to(hover, 1), onHoverOut: () => to(hover, 0) } as any;

  const translateY = Animated.add(
    Animated.add(hover.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }), press.interpolate({ inputRange: [0, 1], outputRange: [0, 3] })),
    enter.interpolate({ inputRange: [0, 1], outputRange: [34, 0] })
  );

  const showLabel = !compact || isFocused;

  return (
    <Pressable
      ref={ref}
      {...rest}
      {...hoverProps}
      onPressIn={() => to(press, 1, 70)}
      onPressOut={() => Animated.spring(press, { toValue: 0, friction: 4, useNativeDriver: false }).start()}
      style={{ zIndex: isFocused ? 60 : 30 - n, marginLeft: n === 1 ? 0 : -8 }}
    >
      <Animated.View
        style={[
          s.tab,
          {
            backgroundColor: t.bg,
            marginBottom: act.interpolate({ inputRange: [0, 1], outputRange: [3, 0] }),
            paddingTop: act.interpolate({ inputRange: [0, 1], outputRange: [9, 15] }),
            paddingBottom: act.interpolate({ inputRange: [0, 1], outputRange: [9, 15] }),
            paddingHorizontal: compact && !isFocused ? 14 : 18,
            transform: [{ translateY }],
          },
        ]}
      >
        {!compact && (
          <Text style={[s.tabNum, { color: t.fg }]} pointerEvents="none">
            {num}
          </Text>
        )}
        <Ionicons name={icon} size={17} color={t.fg} />
        {showLabel && <Text style={[s.tabText, { color: t.fg }]}>{children}</Text>}
      </Animated.View>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/*  Logo                                                               */
/* ------------------------------------------------------------------ */
function Brand({ compact }: { compact: boolean }) {
  const drop = useRef(new Animated.Value(0)).current;
  const wob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(drop, { toValue: 1, friction: 4, tension: 70, useNativeDriver: true }).start();
  }, [drop]);

  const wiggle = () =>
    Animated.sequence([
      Animated.timing(wob, { toValue: 1, duration: 90, useNativeDriver: true }),
      Animated.timing(wob, { toValue: -1, duration: 130, useNativeDriver: true }),
      Animated.timing(wob, { toValue: 0.5, duration: 100, useNativeDriver: true }),
      Animated.spring(wob, { toValue: 0, friction: 4, useNativeDriver: true }),
    ]).start();

  const h = compact ? 36 : 48;

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel="Home"
      onPress={() => {
        wiggle();
        router.push('/' as any);
      }}
      {...({ onHoverIn: wiggle } as any)}
      style={{ alignSelf: 'center', marginRight: compact ? 10 : 28, marginBottom: 6 }}
    >
      <Animated.View
        style={{
          transform: [
            { translateY: drop.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) },
            { scale: drop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
          ],
          opacity: drop,
        }}
      >
        <Animated.Image
          source={require('@/assets/images/logo.png')}
          resizeMode="contain"
          style={{
            height: h,
            width: h * LOGO_ASPECT,
            transform: [{ rotate: wob.interpolate({ inputRange: [-1, 1], outputRange: ['-7deg', '7deg'] }) }],
          }}
        />
      </Animated.View>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/*  Guest luggage tag                                                  */
/* ------------------------------------------------------------------ */
function GuestTag({ reduce }: { reduce: boolean }) {
  const sway = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(sway, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [reduce, sway]);

  return (
    <Animated.View
      style={{
        alignSelf: 'center',
        marginBottom: 6,
        transform: [{ rotate: sway.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '4deg'] }) }],
      }}
    >
      <View style={s.tag}>
        <View style={s.tagHole} />
        <Text style={s.tagText}>Guest access</Text>
      </View>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/*  Folder header                                                      */
/* ------------------------------------------------------------------ */
function CustomTabList({ isAuthenticated, children }: TabListProps & { isAuthenticated: boolean }) {
  const compact = useCompact();
  const reduce = useReduceMotion();

  return (
    <View style={s.header}>
      <View style={s.inner}>
        {/* the folder's front edge; the selected tab covers it */}
        <View style={s.edge} pointerEvents="none" />

        <Brand compact={compact} />

        <View style={s.tabsRow}>{children}</View>

        <View style={s.right}>
          {isAuthenticated ? <ProfileDropdown /> : !compact ? <GuestTag reduce={reduce} /> : null}
        </View>
      </View>
    </View>
  );
}

export default function AppTabs() {
  const { isAuthenticated, user } = useAuth();
  useFonts({ Outfit_500Medium, Outfit_700Bold, TitanOne_400Regular });

  const isChair = user?.role === 'program chair' || user?.role === 'program_chair' || user?.role === 'admin';

  return (
    <View style={s.container}>
      <Tabs>
        <TabList asChild>
          <CustomTabList isAuthenticated={isAuthenticated}>
            <TabTrigger name="index" href="/" asChild>
              <TabButton num="01" icon="home" tone="coral">
                Home
              </TabButton>
            </TabTrigger>

            {isAuthenticated ? (
              <>
                <TabTrigger name="profile" href="/profile" asChild>
                  <TabButton num="02" icon="person" tone="blue">
                    Profile
                  </TabButton>
                </TabTrigger>
                {isChair ? (
                  <TabTrigger name="chair" href={'/chair/dashboard' as any} asChild>
                    <TabButton num="03" icon="briefcase" tone="pink">
                      Chair Portal
                    </TabButton>
                  </TabTrigger>
                ) : user?.role === 'faculty' ? (
                  <TabTrigger name="faculty" href={'/faculty/dashboard' as any} asChild>
                    <TabButton num="03" icon="easel" tone="pink">
                      Faculty Dashboard
                    </TabButton>
                  </TabTrigger>
                ) : (
                  <TabTrigger name="student" href="/student/dashboard" asChild>
                    <TabButton num="03" icon="school" tone="pink">
                      Student Dashboard
                    </TabButton>
                  </TabTrigger>
                )}
              </>
            ) : (
              <>
                <TabTrigger name="login" href="/login" asChild>
                  <TabButton num="02" icon="log-in" tone="blue">
                    Sign In
                  </TabButton>
                </TabTrigger>
                <TabTrigger name="register" href="/register" asChild>
                  <TabButton num="03" icon="sparkles" tone="pink">
                    Get Started
                  </TabButton>
                </TabTrigger>
              </>
            )}
          </CustomTabList>
        </TabList>

        <View style={s.slotContainer}>
          <TabSlot style={s.slot} />
        </View>
      </Tabs>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: { position: 'relative', zIndex: 100, backgroundColor: C.bg, paddingTop: 10 },
  inner: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    paddingHorizontal: 20,
  },
  edge: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, backgroundColor: C.ink },
  tabsRow: { flexDirection: 'row', alignItems: 'flex-end', flex: 1, paddingLeft: 4 },
  right: { marginLeft: 'auto', paddingLeft: 12, paddingBottom: 4, alignSelf: 'center' },

  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 2.5,
    borderBottomWidth: 0,
    borderColor: C.ink,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  tabNum: { position: 'absolute', top: 3, left: 10, fontFamily: F.medium, fontSize: 9, opacity: 0.7 },
  tabText: { fontFamily: F.bold, fontSize: 14 },

  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.paper,
    borderWidth: 2.5,
    borderStyle: 'dashed',
    borderColor: C.ink,
    borderRadius: 12,
    paddingVertical: 6,
    paddingLeft: 10,
    paddingRight: 14,
  },
  tagHole: { width: 11, height: 11, borderRadius: 6, backgroundColor: C.bg, borderWidth: 2.5, borderColor: C.ink },
  tagText: { fontFamily: F.bold, fontSize: 13, color: C.ink },

  slotContainer: { flex: 1, width: '100%' },
  slot: { flex: 1, height: '100%' },
});