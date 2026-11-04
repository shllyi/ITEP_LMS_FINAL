import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { palette, radius, tones, ToneKey } from '@/constants/welcomeTheme';

const TAB_HEIGHT = 28;
/** How far each folder slides under the one above it. */
const OVERLAP = TAB_HEIGHT + 6;

export interface FolderItem {
  /** Text on the folder tab: a category or a course code. */
  tab: string;
  title: string;
  body?: string;
  tone: ToneKey;
}

interface FolderStackProps {
  items: FolderItem[];
}

/**
 * Cards stacked like file folders. Each tab carries the item's label,
 * and each folder tucks under the next one.
 */
export function FolderStack({ items }: FolderStackProps) {
  return (
    <View>
      {items.map((item, i) => {
        const t = tones[item.tone];
        const isFirst = i === 0;
        const isLast = i === items.length - 1;
        const tabOnRight = i % 2 === 1;

        return (
          <View key={`${item.tab}-${i}`} style={!isFirst && { marginTop: -OVERLAP }}>
            <View
              style={[
                styles.tab,
                { backgroundColor: t.soft },
                tabOnRight ? { alignSelf: 'flex-end', marginRight: 28 } : { marginLeft: 28 },
              ]}
            >
              <Text style={[styles.tabText, { color: t.ink }]}>{item.tab}</Text>
            </View>
            <View
              style={[
                styles.card,
                { backgroundColor: t.soft, paddingBottom: isLast ? 20 : 20 + OVERLAP },
              ]}
            >
              <Text style={[styles.title, { color: t.ink }]}>{item.title}</Text>
              {item.body ? <Text style={[styles.body, { color: t.ink }]}>{item.body}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tab: {
    height: TAB_HEIGHT + 4,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    marginBottom: -4,
    alignSelf: 'flex-start',
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: palette.page,
  },
  tabText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
  card: {
    borderRadius: radius.lg,
    borderTopLeftRadius: 8,
    paddingHorizontal: 20,
    paddingTop: 18,
    borderWidth: 2,
    borderColor: palette.page,
  },
  title: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4, marginBottom: 8 },
  body: { fontSize: 13, lineHeight: 19, opacity: 0.8 },
});