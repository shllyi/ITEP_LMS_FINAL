import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/colors';

interface Props {
  current: number;
  target: number;
  unlocked: boolean;
}

export function StreakBadge({ current, target, unlocked }: Props) {
  const shown = Math.min(current, target);
  return (
    <View style={[styles.card, unlocked && styles.cardOpen]}>
      <View style={styles.top}>
        <Text style={styles.title}>{unlocked ? '🔥 Streak Open!' : '🔥 Streak'}</Text>
        <Text style={[styles.count, unlocked && styles.countOpen]}>
          {unlocked ? `${current} topics` : `${shown}/${target}`}
        </Text>
      </View>

      <View style={styles.dots}>
        {Array.from({ length: target }).map((_, i) => (
          <View key={i} style={[styles.dot, i < current && styles.dotDone]} />
        ))}
      </View>

      <Text style={styles.hint}>
        {unlocked
          ? 'Great work! Keep finishing topics to grow your streak.'
          : `Finish ${target - shown} more topic${target - shown === 1 ? '' : 's'} (read the lesson and pass the quiz) to open your streak.`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 16, marginBottom: 16 },
  cardOpen: { backgroundColor: '#FFF7ED', borderColor: '#FB923C' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  count: { fontSize: 13, fontWeight: '800', color: COLORS.textSecondary },
  countOpen: { color: '#C2410C' },
  dots: { flexDirection: 'row', gap: 8, marginTop: 12 },
  dot: { flex: 1, height: 8, borderRadius: 4, backgroundColor: '#E2E8F0' },
  dotDone: { backgroundColor: '#F97316' },
  hint: { fontSize: 12, color: COLORS.textMuted, marginTop: 10 },
});
