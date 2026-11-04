import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  Text,
  TextInput,
  TextInputProps,
  View,
  ActivityIndicator,
  AccessibilityInfo,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/* ------------------------------------------------------------------ */
/*  Tokens (same values as the dashboard)                              */
/* ------------------------------------------------------------------ */
export const C = {
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

export const F = {
  body: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  bold: 'Outfit_700Bold',
  display: 'TitanOne_400Regular',
};

export type IconName = keyof typeof Ionicons.glyphMap;

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */
export function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => {});
  }, []);
  return reduce;
}

/* ------------------------------------------------------------------ */
/*  Motion helpers                                                     */
/* ------------------------------------------------------------------ */

/** Springs its children in when mounted. Re-key it to replay. */
export function Pop({
  children,
  delay = 0,
  from = 16,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  from?: number;
  style?: any;
}) {
  const reduce = useReduceMotion();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) {
      v.setValue(1);
      return;
    }
    Animated.spring(v, { toValue: 1, delay, friction: 7, tension: 90, useNativeDriver: true }).start();
  }, [reduce, delay, v]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v,
          transform: [
            { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) },
            { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Gentle up-and-down float for icons and mascots. */
export function Bob({ children, lift = 7, active }: { children: React.ReactNode; lift?: number; active?: boolean }) {
  const reduce = useReduceMotion();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 750, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [reduce, v]);
  return (
    <Animated.View
      style={{
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -lift] }) },
          { scale: active ? 1.15 : 1 },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

/** Number that rolls to its value whenever it changes. */
export function CountUp({ to, style, suffix = '' }: { to: number; style?: any; suffix?: string }) {
  const v = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState('0');
  useEffect(() => {
    const id = v.addListener(({ value }) => setShown(String(Math.round(value))));
    Animated.timing(v, { toValue: to, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => v.removeListener(id);
  }, [to, v]);
  return (
    <Text style={style}>
      {shown}
      {suffix}
    </Text>
  );
}

/** Progress bar that fills to `pct`. */
export function Bar({
  pct,
  color = C.green,
  track = C.pink,
  height = 12,
}: {
  pct: number;
  color?: string;
  track?: string;
  height?: number;
}) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, {
      toValue: Math.max(0, Math.min(100, pct || 0)),
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [pct, v]);
  return (
    <View style={{ height, borderRadius: height / 2 + 2, borderWidth: 2.5, borderColor: C.ink, backgroundColor: track, overflow: 'hidden' }}>
      <Animated.View
        style={{
          height: '100%',
          backgroundColor: color,
          width: v.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'], extrapolate: 'clamp' }),
        }}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Buttons                                                            */
/* ------------------------------------------------------------------ */

/** Key-style surface. Lifts on hover, sinks on press. */
export function Chunky({
  children,
  onPress,
  face,
  shadow,
  radius = 14,
  depth = 4,
  style,
  faceStyle,
  disabled,
  accessibilityLabel,
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
  accessibilityLabel?: string;
}) {
  const p = useRef(new Animated.Value(0)).current; // 0 rest, 1 hover, 2 pressed
  const to = (v: number) =>
    Animated.spring(p, { toValue: v, friction: 6, tension: 240, useNativeDriver: true }).start();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => to(2)}
      onPressOut={() => to(0)}
      {...({ onHoverIn: () => to(1), onHoverOut: () => to(0) } as any)}
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
            transform: [{ translateY: p.interpolate({ inputRange: [0, 1, 2], outputRange: [0, -2, depth] }) }],
          },
          faceStyle,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

const TONES = {
  coral: { face: C.coral, shadow: C.coralDeep, fg: C.cream },
  blue: { face: C.blue, shadow: C.blueDeep, fg: '#FFFFFF' },
  paper: { face: C.paper, shadow: C.pinkDeep, fg: C.ink },
  green: { face: C.green, shadow: C.greenDeep, fg: '#FFFFFF' },
  yellow: { face: C.yellow, shadow: C.creamDeep, fg: C.ink },
};
export type Tone = keyof typeof TONES;

export function Btn({
  title,
  onPress,
  tone = 'coral',
  size = 'md',
  icon,
  loading,
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  tone?: Tone;
  size?: 'sm' | 'md';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: any;
}) {
  const t = TONES[tone];
  const sm = size === 'sm';
  return (
    <Chunky
      face={t.face}
      shadow={t.shadow}
      radius={sm ? 12 : 16}
      depth={sm ? 4 : 5}
      onPress={onPress}
      disabled={disabled || loading}
      style={[{ alignSelf: 'flex-start' }, style]}
      faceStyle={{
        height: sm ? 36 : 46,
        paddingHorizontal: sm ? 14 : 20,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {loading ? (
        <ActivityIndicator color={t.fg} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon ? <Ionicons name={icon} size={sm ? 15 : 18} color={t.fg} /> : null}
          <Text style={{ color: t.fg, fontFamily: sm ? F.bold : F.display, fontSize: sm ? 13 : 15, letterSpacing: sm ? 0 : 0.3 }}>
            {title}
          </Text>
        </View>
      )}
    </Chunky>
  );
}

/** Small round button for close / delete / stepper. */
export function IconBtn({
  icon,
  onPress,
  tone = 'paper',
  size = 30,
  label,
}: {
  icon: IconName;
  onPress: () => void;
  tone?: Tone;
  size?: number;
  label: string;
}) {
  const t = TONES[tone];
  return (
    <Chunky
      face={t.face}
      shadow={t.shadow}
      radius={size / 2 + 2}
      depth={3}
      onPress={onPress}
      accessibilityLabel={label}
      style={{ alignSelf: 'flex-start' }}
      faceStyle={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      <Ionicons name={icon} size={size * 0.55} color={t.fg} />
    </Chunky>
  );
}

/* ------------------------------------------------------------------ */
/*  Inputs                                                             */
/* ------------------------------------------------------------------ */

/** Text input that lifts and turns blue on focus. */
export function Field({
  style,
  containerStyle,
  error,
  ...rest
}: TextInputProps & { containerStyle?: any; error?: boolean }) {
  const [focused, setFocused] = useState(false);
  const f = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(f, { toValue: focused ? 1 : 0, friction: 7, tension: 170, useNativeDriver: true }).start();
  }, [focused, f]);
  return (
    <Animated.View
      style={[containerStyle, { transform: [{ translateY: f.interpolate({ inputRange: [0, 1], outputRange: [0, -1.5] }) }] }]}
    >
      <TextInput
        placeholderTextColor="#8F5F6899"
        {...rest}
        onFocus={e => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={e => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        style={[bs.field, focused && bs.fieldFocus, error && bs.fieldError, { outlineWidth: 0 } as any, style]}
      />
    </Animated.View>
  );
}

/** Pill option that pops when it becomes selected. */
export function ChoiceChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const pop = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (selected) {
      pop.setValue(0.88);
      Animated.spring(pop, { toValue: 1, friction: 3, tension: 200, useNativeDriver: true }).start();
    }
  }, [selected, pop]);
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress}>
      <Animated.View style={[bs.chip, selected && bs.chipOn, { transform: [{ scale: pop }] }]}>
        {selected ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
        <Text style={[bs.chipText, selected && { color: '#FFFFFF' }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

/** Sliding-thumb segmented control. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  width = 260,
}: {
  options: { key: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (k: T) => void;
  width?: number;
}) {
  const idx = Math.max(0, options.findIndex(o => o.key === value));
  const x = useRef(new Animated.Value(idx)).current;
  useEffect(() => {
    Animated.spring(x, { toValue: idx, friction: 7, tension: 140, useNativeDriver: true }).start();
  }, [idx, x]);
  const seg = (width - 13) / options.length;
  return (
    <View style={[bs.segWrap, { width }]}>
      <Animated.View
        style={[
          bs.segThumb,
          {
            width: seg,
            transform: [
              {
                translateX: x.interpolate({
                  inputRange: [0, Math.max(1, options.length - 1)],
                  outputRange: [0, seg * Math.max(1, options.length - 1)],
                }),
              },
            ],
          },
        ]}
      />
      {options.map(o => {
        const on = o.key === value;
        return (
          <Pressable key={o.key} accessibilityRole="tab" accessibilityState={{ selected: on }} style={bs.segItem} onPress={() => onChange(o.key)}>
            {o.icon ? <Ionicons name={o.icon} size={14} color={on ? C.ink : C.muted} /> : null}
            <Text style={[bs.segText, on && { color: C.ink }]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Switch with a springy knob and optional text label. */
export function Toggle({
  value,
  onChange,
  onLabel,
  offLabel,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  onLabel?: string;
  offLabel?: string;
}) {
  const x = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(x, { toValue: value ? 1 : 0, friction: 6, tension: 170, useNativeDriver: true }).start();
  }, [value, x]);
  const label = value ? onLabel : offLabel;
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
    >
      {label ? <Text style={bs.toggleLabel}>{label}</Text> : null}
      <View style={bs.togTrack}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: C.green, opacity: x }]} />
        <Animated.View
          style={[
            bs.togKnob,
            {
              transform: [
                { translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 27] }) },
                { rotate: x.interpolate({ inputRange: [0, 1], outputRange: ['-90deg', '0deg'] }) },
              ],
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

const bs = StyleSheet.create({
  field: {
    backgroundColor: C.paper,
    borderWidth: 2.5,
    borderColor: C.ink,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontFamily: F.medium,
    fontSize: 14,
    color: C.ink,
  },
  fieldFocus: { borderColor: C.blue, backgroundColor: '#FFFFFF' },
  fieldError: { borderColor: C.red, backgroundColor: '#FFE3DE' },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: C.ink,
    backgroundColor: C.paper,
  },
  chipOn: { backgroundColor: C.blue },
  chipText: { fontFamily: F.bold, fontSize: 13, color: C.ink },

  segWrap: {
    flexDirection: 'row',
    backgroundColor: C.cream,
    borderWidth: 2.5,
    borderColor: C.ink,
    borderRadius: 16,
    padding: 4,
    alignSelf: 'flex-start',
  },
  segThumb: {
    position: 'absolute',
    left: 4,
    top: 4,
    bottom: 4,
    backgroundColor: C.yellow,
    borderWidth: 2.5,
    borderColor: C.ink,
    borderRadius: 11,
  },
  segItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 6 },
  segText: { fontFamily: F.bold, fontSize: 13, color: C.muted },

  togTrack: {
    width: 56,
    height: 30,
    borderRadius: 15,
    borderWidth: 2.5,
    borderColor: C.ink,
    backgroundColor: C.pink,
    overflow: 'hidden',
  },
  togKnob: {
    position: 'absolute',
    left: 2,
    top: 2.5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.paper,
    borderWidth: 2.5,
    borderColor: C.ink,
  },
  toggleLabel: { fontFamily: F.bold, fontSize: 12.5, color: C.ink },
});