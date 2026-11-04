import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { palette, radius, tones, ToneKey } from '@/constants/welcomeTheme';

interface ActionCardProps {
  tone: ToneKey;
  /** Strong fill with white text. Otherwise the soft tint is used. */
  solid?: boolean;
  /** Full-width card with room for an illustration. */
  wide?: boolean;
  label: string;
  hint: string;
  /** Small caption in the card footer, next to the arrow. */
  category: string;
  onPress: () => void;
  /** Illustration for wide cards, anchored bottom-right. */
  art?: React.ReactNode;
}

export function ActionCard({
  tone,
  solid,
  wide,
  label,
  hint,
  category,
  onPress,
  art,
}: ActionCardProps) {
  const t = tones[tone];
  const bg = solid ? t.solid : t.soft;
  const text = solid ? palette.paper : t.ink;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${hint}`}
      style={({ pressed }: { pressed: boolean }) => [
        styles.card,
        wide ? styles.wide : styles.half,
        { backgroundColor: bg },
        pressed && styles.pressed,
      ]}
    >
      {wide && art ? <View style={styles.art}>{art}</View> : null}

      <View style={wide && styles.wideText}>
        <Text style={[wide ? styles.labelWide : styles.label, { color: text }]}>{label}</Text>
        <Text style={[styles.hint, { color: text }]}>{hint}</Text>
      </View>

      <View style={[styles.footer, wide && styles.wideText]}>
        <Text style={[styles.category, { color: text }]}>{category}</Text>
        <View style={[styles.arrow, { backgroundColor: solid ? palette.paper : palette.ink }]}>
          <Text style={[styles.arrowText, { color: solid ? t.solid : palette.paper }]}>→</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: 18,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  half: { flexBasis: '47%', flexGrow: 1, minHeight: 148, borderBottomRightRadius: 8 },
  wide: { width: '100%', minHeight: 190, borderTopRightRadius: radius.xl },
  wideText: { maxWidth: '55%' },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },

  label: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3, marginBottom: 4 },
  labelWide: { fontSize: 24, fontWeight: '800', letterSpacing: -0.6, lineHeight: 28, marginBottom: 6 },
  hint: { fontSize: 12, lineHeight: 17, opacity: 0.8 },

  art: { position: 'absolute', right: 18, bottom: 22 },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  category: { fontSize: 12, fontWeight: '600', opacity: 0.7 },
  arrow: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontSize: 16, fontWeight: '800' },
});