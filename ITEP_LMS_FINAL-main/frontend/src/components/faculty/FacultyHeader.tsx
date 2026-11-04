import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  Easing,
  AccessibilityInfo,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Subject, Topic, Module } from '@/types/faculty';

/* ------------------------------------------------------------------ */
/*  Brand tokens (same values as the dashboard)                        */
/*  Tip: move these to '@/constants/brand' and import in both files.   */
/* ------------------------------------------------------------------ */
const C = {
  yellow: '#FFE97F',
  coral: '#FF6B81',
  coralDeep: '#D94D63',
  pink: '#FFD1D4',
  pinkDeep: '#E8A9AE',
  cream: '#FFF5BA',
  creamDeep: '#E8D77A',
  blue: '#00A3EB',
  blueDeep: '#0079AD',
  ink: '#4A1A24',
  muted: '#8F5F68',
  paper: '#FFFBF0',
  green: '#2FB57A',
  greenDeep: '#1E8A5B',
};
const F = {
  medium: 'Outfit_500Medium',
  bold: 'Outfit_700Bold',
  display: 'TitanOne_400Regular',
};

type IconName = keyof typeof Ionicons.glyphMap;

interface FacultyHeaderProps {
  subject: Subject | null;
  module: Module | null;
  topic: Topic | null;
  onOpenSubjectModal: () => void;
}

/* ------------------------------------------------------------------ */
/*  Pieces                                                             */
/* ------------------------------------------------------------------ */

/** Small dot. Published topics get a pulsing ring, drafts stay still. */
function StatusDot({ live, reduce }: { live: boolean; reduce: boolean }) {
  const ring = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!live || reduce) return;
    const loop = Animated.loop(
      Animated.timing(ring, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [live, reduce, ring]);

  return (
    <View style={s.dotWrap}>
      {live && !reduce ? (
        <Animated.View
          style={[
            s.dotRing,
            {
              opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
              transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }) }],
            },
          ]}
        />
      ) : null}
      <View style={[s.dot, { backgroundColor: live ? C.green : C.yellow }]} />
    </View>
  );
}

/** Dashed link between two crumbs. */
function Link() {
  return (
    <View style={s.link}>
      <View style={s.linkLine} />
      <View style={s.linkDot} />
    </View>
  );
}

/**
 * One breadcrumb chip. Springs in on mount, lifts on hover,
 * sinks on press. Non-pressable chips just sit there.
 */
function Crumb({
  label,
  icon,
  face,
  shadow,
  fg,
  rot = 0,
  radius = 12,
  maxWidth,
  delay = 0,
  reduce,
  onPress,
  dashed,
  display,
  trailing,
  accessibilityLabel,
}: {
  label: string;
  icon?: IconName;
  face: string;
  shadow: string;
  fg: string;
  rot?: number;
  radius?: number;
  maxWidth?: number;
  delay?: number;
  reduce: boolean;
  onPress?: () => void;
  dashed?: boolean;
  display?: boolean;
  trailing?: React.ReactNode;
  accessibilityLabel?: string;
}) {
  const DEPTH = 3;
  const enter = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  const lift = useRef(new Animated.Value(0)).current; // 0 rest, 1 hover, 2 pressed

  useEffect(() => {
    if (reduce) return;
    Animated.spring(enter, { toValue: 1, delay, friction: 5, tension: 110, useNativeDriver: true }).start();
  }, [delay, enter, reduce]);

  const to = (v: number) => {
    if (reduce) return;
    Animated.spring(lift, { toValue: v, friction: 6, tension: 220, useNativeDriver: true }).start();
  };

  const body = (
    <View style={{ paddingBottom: DEPTH }}>
      <View
        style={[
          s.crumbShadow,
          { top: DEPTH, backgroundColor: shadow, borderRadius: radius },
          dashed && { backgroundColor: 'transparent', borderStyle: 'dashed' },
        ]}
      />
      <Animated.View
        style={[
          s.crumbFace,
          {
            backgroundColor: face,
            borderRadius: radius,
            borderStyle: dashed ? 'dashed' : 'solid',
            transform: [{ translateY: lift.interpolate({ inputRange: [0, 1, 2], outputRange: [0, -2, DEPTH] }) }],
          },
        ]}
      >
        {icon ? <Ionicons name={icon} size={14} color={fg} /> : null}
        <Text
          numberOfLines={1}
          style={[s.crumbText, display && s.crumbDisplay, { color: fg }, maxWidth ? { maxWidth } : null]}
        >
          {label}
        </Text>
        {trailing}
      </Animated.View>
    </View>
  );

  return (
    <Animated.View
      style={{
        opacity: enter,
        transform: [
          { translateX: enter.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) },
          { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
          { rotate: enter.interpolate({ inputRange: [0, 1], outputRange: [`${rot * 5}deg`, `${rot}deg`] }) },
        ],
      }}
    >
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel || label}
          onPress={onPress}
          onPressIn={() => to(2)}
          onPressOut={() => to(0)}
          {...({ onHoverIn: () => to(1), onHoverOut: () => to(0) } as any)}
        >
          {body}
        </Pressable>
      ) : (
        body
      )}
    </Animated.View>
  );
}

/** "Faculty" role tag. Tap it and it wiggles. */
function RoleTag({ reduce }: { reduce: boolean }) {
  const w = useRef(new Animated.Value(0)).current;
  const wiggle = () => {
    if (reduce) return;
    w.setValue(0);
    Animated.sequence([
      Animated.timing(w, { toValue: 1, duration: 90, useNativeDriver: true }),
      Animated.timing(w, { toValue: -1, duration: 130, useNativeDriver: true }),
      Animated.timing(w, { toValue: 0.6, duration: 110, useNativeDriver: true }),
      Animated.spring(w, { toValue: 0, friction: 3, tension: 140, useNativeDriver: true }),
    ]).start();
  };
  return (
    <Pressable onPress={wiggle} accessibilityLabel="Signed in as faculty">
      <Animated.View
        style={[
          s.roleTag,
          { transform: [{ rotate: w.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-9deg', '-3deg', '5deg'] }) }] },
        ]}
      >
        <Ionicons name="school" size={13} color={C.ink} />
        <Text style={s.roleText}>Faculty</Text>
      </Animated.View>
    </Pressable>
  );
}

/** Primary action. The plus spins a quarter turn on hover/press. */
function NewSubjectButton({
  onPress,
  compact,
  reduce,
}: {
  onPress: () => void;
  compact: boolean;
  reduce: boolean;
}) {
  const DEPTH = 4;
  const p = useRef(new Animated.Value(0)).current; // 0 rest, 1 hover, 2 pressed
  const spin = useRef(new Animated.Value(0)).current;
  const to = (v: number) => {
    if (reduce) return;
    Animated.spring(p, { toValue: v, friction: 6, tension: 220, useNativeDriver: true }).start();
    Animated.spring(spin, { toValue: v > 0 ? 1 : 0, friction: 5, tension: 120, useNativeDriver: true }).start();
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Create a new subject"
      onPress={onPress}
      onPressIn={() => to(2)}
      onPressOut={() => to(0)}
      {...({ onHoverIn: () => to(1), onHoverOut: () => to(0) } as any)}
      style={{ paddingBottom: DEPTH }}
    >
      <View style={[s.ctaShadow, { top: DEPTH }]} />
      <Animated.View
        style={[
          s.ctaFace,
          compact && { paddingHorizontal: 9 },
          { transform: [{ translateY: p.interpolate({ inputRange: [0, 1, 2], outputRange: [0, -2, DEPTH] }) }] },
        ]}
      >
        <Animated.View
          style={[
            s.ctaPlus,
            { transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) }] },
          ]}
        >
          <Ionicons name="add" size={16} color={C.ink} />
        </Animated.View>
        {!compact ? <Text style={s.ctaText}>New subject</Text> : null}
      </Animated.View>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/*  Header                                                             */
/* ------------------------------------------------------------------ */
export function FacultyHeader({ subject, module, topic, onOpenSubjectModal }: FacultyHeaderProps) {
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const showRole = width >= 900;

  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => {});
  }, []);

const scrollRef = useRef<any>(null);
  const live = topic?.status === 'published';

  return (
    <View style={s.header}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.crumbScroll}
        contentContainerStyle={s.crumbs}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: !reduce })}
      >
        <Crumb
          key="root"
          label="LMS"
          icon="home"
          face={C.yellow}
          shadow={C.creamDeep}
          fg={C.ink}
          rot={-2}
          radius={14}
          display
          reduce={reduce}
          onPress={() => router.push('/')}
          accessibilityLabel="Back to home"
        />

        <Link />
        <Crumb
          key="section"
          label="Course Studio"
          icon="color-palette"
          face={C.pink}
          shadow={C.pinkDeep}
          fg={C.ink}
          rot={1}
          radius={8}
          delay={50}
          reduce={reduce}
        />

        <Link />
        {subject ? (
          <Crumb
            key={`subject-${subject._id}`}
            label={subject.code || 'Untitled'}
            icon="library"
            face={C.blue}
            shadow={C.blueDeep}
            fg="#FFFFFF"
            rot={-1}
            radius={18}
            maxWidth={110}
            delay={100}
            reduce={reduce}
          />
        ) : (
          <Crumb
            key="subject-none"
            label="Pick a subject"
            icon="add-circle-outline"
            face="transparent"
            shadow="transparent"
            fg={C.muted}
            radius={18}
            dashed
            delay={100}
            reduce={reduce}
            onPress={onOpenSubjectModal}
            accessibilityLabel="Create your first subject"
          />
        )}

        {module ? (
          <>
            <Link />
            <Crumb
              key={`module-${module.id}`}
              label={module.title}
              icon="albums"
              face={C.cream}
              shadow={C.creamDeep}
              fg={C.ink}
              rot={1.5}
              radius={10}
              maxWidth={150}
              delay={150}
              reduce={reduce}
            />
          </>
        ) : null}

        {topic ? (
          <>
            <Link />
            <Crumb
              key={`topic-${topic.id}`}
              label={topic.title}
              face={C.coral}
              shadow={C.coralDeep}
              fg={C.cream}
              rot={-1.5}
              radius={22}
              maxWidth={200}
              delay={200}
              reduce={reduce}
              trailing={<StatusDot live={live} reduce={reduce} />}
              accessibilityLabel={`${topic.title}, ${live ? 'published' : 'draft'}`}
            />
          </>
        ) : null}
      </ScrollView>

      <View style={s.actions}>
        {showRole ? <RoleTag reduce={reduce} /> : null}
        <NewSubjectButton onPress={onOpenSubjectModal} compact={compact} reduce={reduce} />
      </View>

      {/* colour strip under the bar */}
      <View pointerEvents="none" style={s.strip}>
        <View style={{ flex: 5, backgroundColor: C.coral }} />
        <View style={{ flex: 2, backgroundColor: C.blue }} />
        <View style={{ flex: 3, backgroundColor: C.yellow }} />
        <View style={{ flex: 1, backgroundColor: C.green }} />
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */
const s = StyleSheet.create({
  header: {
    minHeight: 64,
    backgroundColor: C.paper,
    borderBottomWidth: 3,
    borderBottomColor: C.ink,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 14,
    zIndex: 5,
  },
  strip: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 5, flexDirection: 'row' },

  crumbScroll: { flex: 1, marginRight: 12 },
  crumbs: { alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4 },

  // chip
  crumbShadow: { position: 'absolute', left: 0, right: 0, bottom: 0, borderWidth: 2.5, borderColor: C.ink },
  crumbFace: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    height: 32,
    borderWidth: 2.5,
    borderColor: C.ink,
  },
  crumbText: { fontFamily: F.bold, fontSize: 12.5 },
  crumbDisplay: { fontFamily: F.display, fontSize: 14, letterSpacing: 0.5 },

  // link between chips
  link: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 4, marginBottom: 3 },
  linkLine: { width: 12, height: 0, borderTopWidth: 2.5, borderColor: C.ink, borderStyle: 'dashed', opacity: 0.55 },
  linkDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.ink, opacity: 0.55, marginLeft: 1 },

  // status dot
  dotWrap: { width: 10, height: 10, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: C.ink },
  dotRing: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: C.green },

  // right side
  actions: { flexDirection: 'row', alignItems: 'center', gap: 14 },

  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: C.ink,
    backgroundColor: C.cream,
  },
  roleText: { fontFamily: F.bold, fontSize: 12, color: C.ink },

  ctaShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 14,
    backgroundColor: C.blueDeep,
    borderWidth: 2.5,
    borderColor: C.ink,
  },
  ctaFace: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 36,
    paddingLeft: 7,
    paddingRight: 14,
    borderRadius: 14,
    backgroundColor: C.blue,
    borderWidth: 2.5,
    borderColor: C.ink,
  },
  ctaPlus: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.paper,
    borderWidth: 2,
    borderColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { fontFamily: F.bold, fontSize: 13, color: '#FFFFFF' },
});