import React from 'react';
import { View, StyleSheet } from 'react-native';
import { palette, tones } from '@/constants/welcomeTheme';

interface Spine {
  w: number;
  h: number;
  color: string;
  lean?: boolean;
}

const SPINES: Spine[] = [
  { w: 34, h: 96, color: tones.lavender.solid },
  { w: 26, h: 128, color: tones.golden.solid },
  { w: 38, h: 108, color: tones.sky.solid },
  { w: 30, h: 142, color: tones.orange.solid },
  { w: 34, h: 100, color: palette.ink },
  { w: 28, h: 118, color: tones.lavender.solid, lean: true },
];

interface BookShelfProps {
  /** 1 = full size. Use ~0.6 for compact placements. */
  scale?: number;
}

export function BookShelf({ scale = 1 }: BookShelfProps) {
  return (
    <View>
      <View style={[styles.row, { gap: 5 * scale }]}>
        {SPINES.map((s, i) => (
          <View
            key={i}
            style={[
              styles.spine,
              {
                width: s.w * scale,
                height: s.h * scale,
                backgroundColor: s.color,
                borderTopLeftRadius: 7 * scale,
                borderTopRightRadius: 7 * scale,
              },
              s.lean && {
                marginLeft: 10 * scale,
                transform: [{ rotate: '12deg' }],
              },
            ]}
          >
            <View style={[styles.band, { top: 14 * scale, height: 5 * scale }]} />
            <View
              style={[
                styles.label,
                { bottom: 16 * scale, height: 20 * scale, left: 5 * scale, right: 5 * scale },
              ]}
            />
          </View>
        ))}
      </View>
      <View style={[styles.shelf, { height: 6 * scale, borderRadius: 3 * scale }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  spine: { overflow: 'hidden' },
  band: { position: 'absolute', left: 0, right: 0, backgroundColor: 'rgba(255,255,255,0.5)' },
  label: { position: 'absolute', borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.32)' },
  shelf: { backgroundColor: palette.ink },
});