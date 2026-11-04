import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Subject, Topic } from '@/types/faculty';

interface ContextInspectorProps {
  subject: Subject | null;
  topic: Topic | null;
  onPublishTopic: () => void;
  onOpenSubjectModal: () => void;
}

const C = {
  bg: '#FDE680',
  yellow: '#FFE97F',
  coral: '#FF6B81',
  coralDeep: '#D94D63',
  pink: '#FFD1D4',
  pinkDeep: '#E8A9AE',
  cream: '#FFF5BA',
  blue: '#00A3EB',
  ink: '#4A1A24',
  muted: '#8F5F68',
  paper: '#FFFBF0',
  green: '#2FB57A',
  greenDeep: '#1E8A5B',
};
const F = {
  body: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  bold: 'Outfit_700Bold',
  display: 'TitanOne_400Regular',
};

/** Key-style button that sinks when pressed. */
function Chunky({
  children,
  onPress,
  face,
  shadow,
  disabled,
}: {
  children: React.ReactNode;
  onPress: () => void;
  face: string;
  shadow: string;
  disabled?: boolean;
}) {
  const p = useRef(new Animated.Value(0)).current;
  const depth = 5;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => Animated.timing(p, { toValue: 1, duration: 70, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(p, { toValue: 0, friction: 5, useNativeDriver: true }).start()}
      style={{ paddingBottom: depth, opacity: disabled ? 0.5 : 1 }}
    >
      <View style={[styles.btnShadow, { top: depth, backgroundColor: shadow }]} />
      <Animated.View
        style={[
          styles.btnFace,
          { backgroundColor: face, transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, depth] }) }] },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

export function ContextInspector({
  subject,
  topic,
  onPublishTopic,
  onOpenSubjectModal,
}: ContextInspectorProps) {
  const [collapsed, setCollapsed] = useState(false);
  const isPublished = topic?.status === 'published';
  const wordCount = (topic?.content?.richText || '').trim().split(/\s+/).filter(Boolean).length;
  const questionsCount = topic?.quiz?.questions?.length || 0;
  const hasTimer = topic?.quiz?.hasTimer ?? true;
  const duration = topic?.quiz?.durationMinutes || 15;
  const passingScore = topic?.quiz?.passingScorePercent || 75;
  const hasSlides = !!topic?.content?.presentationS3Key;
  const bulletCount = topic?.content?.summaryBullets?.length || 0;
  const summaryChars = topic?.content?.summaryText?.length || 0;
  const hasSummary = summaryChars > 0 || bulletCount > 0;

  const audit = [
    {
      key: 'text',
      icon: 'document-text' as const,
      name: 'Reading',
      detail: wordCount > 0 ? `${wordCount} words` : 'Nothing written yet',
      done: wordCount > 0,
    },
    {
      key: 'slides',
      icon: 'easel' as const,
      name: 'Slides',
      detail: hasSlides ? 'Stored on S3' : 'Not attached',
      done: hasSlides,
    },
    {
      key: 'summary',
      icon: 'sparkles' as const,
      name: 'Recap',
      detail: summaryChars > 0 ? `${summaryChars} chars` : bulletCount > 0 ? `${bulletCount} key takeaways` : 'Pending',
      done: hasSummary,
    },
    {
      key: 'quiz',
      icon: 'flash' as const,
      name: 'Quiz',
      detail: `${questionsCount} questions · ${hasTimer ? `${duration}m` : 'untimed'} · ${passingScore}% pass`,
      done: questionsCount > 0,
    },
  ];
  const doneCount = audit.filter((a) => a.done).length;
  const readiness = Math.round((doneCount / audit.length) * 100);

  // Animated readiness bar + staggered rows
  const bar = useRef(new Animated.Value(0)).current;
  const rows = useRef(audit.map(() => new Animated.Value(0))).current;
  const pill = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(bar, { toValue: readiness, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [readiness, bar]);

  useEffect(() => {
    rows.forEach((r) => r.setValue(0));
    Animated.stagger(
      70,
      rows.map((r) => Animated.spring(r, { toValue: 1, friction: 7, tension: 110, useNativeDriver: true }))
    ).start();
  }, [topic?.id, rows]);

  useEffect(() => {
    pill.setValue(0.7);
    Animated.spring(pill, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true }).start();
  }, [isPublished, pill]);

  const meta = [
    { icon: 'calendar-outline' as const, label: 'Academic year', value: subject?.academicYear || '2026-2027', c: C.cream },
    { icon: 'book-outline' as const, label: 'Semester', value: subject?.semester || '1st Semester', c: C.pink },
    { icon: 'school-outline' as const, label: 'Year level', value: subject?.yearLevel || '1st Year', c: C.cream },
  ];

  if (!subject) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Top Inspector Header Strip */}
      <View style={styles.topHeader}>
        <View style={styles.topHeaderLeft}>
          <View style={styles.inspectorBadge}>
            <Ionicons name="sparkles" size={13} color={C.yellow} />
            <Text style={styles.inspectorBadgeText}>CONTEXT INSPECTOR</Text>
          </View>
          <View style={styles.topicIndicator}>
            <Ionicons
              name={isPublished ? 'checkmark-circle' : 'radio-button-on'}
              size={13}
              color={isPublished ? C.green : C.muted}
            />
            <Text style={styles.topicIndicatorText} numberOfLines={1}>
              {topic ? topic.title : 'No topic selected'}
            </Text>
          </View>
        </View>

        <View style={styles.topHeaderRight}>
          <View style={[styles.readyPill, { backgroundColor: readiness === 100 ? '#EAFBF2' : C.yellow }]}>
            <Ionicons
              name={readiness === 100 ? 'checkmark-circle' : 'time-outline'}
              size={12}
              color={readiness === 100 ? C.greenDeep : C.ink}
            />
            <Text style={[styles.readyPillText, readiness === 100 && { color: C.greenDeep }]}>
              {doneCount}/{audit.length} ready ({readiness}%)
            </Text>
          </View>

          <Pressable
            onPress={() => setCollapsed((prev) => !prev)}
            style={styles.toggleBtn}
            accessibilityRole="button"
            accessibilityLabel={collapsed ? 'Show inspector details' : 'Hide inspector details'}
          >
            <Text style={styles.toggleBtnText}>{collapsed ? 'Show' : 'Hide'}</Text>
            <Ionicons name={collapsed ? 'chevron-down' : 'chevron-up'} size={12} color={C.ink} />
          </Pressable>
        </View>
      </View>

      {/* Main Deck of 3 Organized Cards */}
      {!collapsed && (
        <View style={styles.deck}>
          {/* 1. Course Context Card */}
          <View style={[styles.card, styles.courseCard]}>
            <View>
              <View style={styles.cardHead}>
                <View style={styles.cardTitleWrap}>
                  <Ionicons name="school" size={15} color={C.ink} />
                  <Text style={styles.eyebrow}>Course Context</Text>
                </View>
                <Pressable onPress={onOpenSubjectModal} style={styles.editChip} accessibilityRole="button">
                  <Ionicons name="pencil" size={11} color={C.ink} />
                  <Text style={styles.editText}>Edit</Text>
                </Pressable>
              </View>

              <View style={styles.codeRow}>
                <View style={styles.codeChip}>
                  <Text style={styles.codeChipText}>{subject?.code || 'N/A'}</Text>
                </View>
                {subject?.name ? (
                  <Text style={styles.subjectNameText} numberOfLines={1}>
                    {subject.name}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={styles.metaList}>
              {meta.map((m, i) => (
                <View
                  key={m.label}
                  style={[styles.metaTile, { backgroundColor: m.c, transform: [{ rotate: i % 2 ? '0.8deg' : '-0.8deg' }] }]}
                >
                  <View style={styles.metaIcon}>
                    <Ionicons name={m.icon} size={13} color={C.ink} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.metaLabel}>{m.label}</Text>
                    <Text style={styles.metaValue} numberOfLines={1}>{m.value}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* 2. Lesson Readiness Card */}
          <View style={[styles.card, styles.readinessCard]}>
            <View>
              <View style={styles.cardHead}>
                <View style={styles.cardTitleWrap}>
                  <Ionicons name="checkbox" size={15} color={C.ink} />
                  <Text style={styles.eyebrow}>Lesson Readiness</Text>
                </View>
                <View style={styles.readyBadgePill}>
                  <Text style={styles.readyCount}>{doneCount}/{audit.length}</Text>
                </View>
              </View>

              <View style={styles.track}>
                <Animated.View
                  style={[
                    styles.fill,
                    {
                      width: bar.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'], extrapolate: 'clamp' }),
                      backgroundColor: readiness === 100 ? C.green : C.coral,
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.auditGrid}>
              {audit.map((a, i) => (
                <Animated.View
                  key={a.key}
                  style={[
                    styles.auditRow,
                    a.done && styles.auditRowDone,
                    {
                      opacity: rows[i],
                      transform: [{ translateX: rows[i].interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
                    },
                  ]}
                >
                  <View style={[styles.auditBadge, a.done && { backgroundColor: C.green }]}>
                    <Ionicons name={a.done ? 'checkmark' : a.icon} size={12} color={a.done ? '#FFFFFF' : C.ink} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.auditName} numberOfLines={1}>{a.name}</Text>
                    <Text style={styles.auditDetail} numberOfLines={1}>{a.detail}</Text>
                  </View>
                </Animated.View>
              ))}
            </View>
          </View>

          {/* 3. Visibility & Publish Card */}
          <View style={[styles.card, styles.visibilityCard, { backgroundColor: isPublished ? '#EAFBF2' : C.cream }]}>
            <View>
              <View style={styles.cardHead}>
                <View style={styles.cardTitleWrap}>
                  <Ionicons name="eye" size={15} color={C.ink} />
                  <Text style={styles.eyebrow}>Visibility & Status</Text>
                </View>
                <Animated.View
                  style={[styles.statusPill, isPublished ? styles.pillLive : styles.pillDraft, { transform: [{ scale: pill }] }]}
                >
                  <Ionicons name={isPublished ? 'rocket' : 'create'} size={12} color={isPublished ? '#FFFFFF' : C.ink} />
                  <Text style={[styles.statusText, isPublished && { color: '#FFFFFF' }]}>
                    {isPublished ? 'Live' : 'Draft'}
                  </Text>
                </Animated.View>
              </View>

              <Text style={styles.publishHint} numberOfLines={3}>
                {!topic
                  ? 'Select a topic from the navigator to inspect and publish it.'
                  : isPublished
                  ? 'Students can open and learn from this topic right now.'
                  : readiness === 100
                  ? 'All 4 checklist items are complete. Ready when you are!'
                  : 'You can publish anytime, but completing all items first is recommended.'}
              </Text>
            </View>

            <View style={styles.actionBtnWrap}>
              <Chunky
                face={isPublished ? C.paper : C.coral}
                shadow={isPublished ? C.pinkDeep : C.coralDeep}
                onPress={onPublishTopic}
                disabled={!topic}
              >
                <Ionicons name={isPublished ? 'arrow-undo' : 'send'} size={14} color={isPublished ? C.ink : C.cream} />
                <Text style={[styles.btnText, { color: isPublished ? C.ink : C.cream }]}>
                  {isPublished ? 'Revert to draft' : 'Publish to students'}
                </Text>
              </Chunky>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 24,
    zIndex: 3,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
    flexWrap: 'wrap',
    gap: 8,
  },
  topHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  inspectorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.ink,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  inspectorBadgeText: {
    fontFamily: F.bold,
    fontSize: 11,
    color: C.yellow,
    letterSpacing: 0.8,
  },
  topicIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.paper,
    borderWidth: 2,
    borderColor: C.ink,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  topicIndicatorText: {
    fontFamily: F.bold,
    fontSize: 12,
    color: C.ink,
    maxWidth: 260,
  },
  topHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  readyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 2,
    borderColor: C.ink,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  readyPillText: {
    fontFamily: F.bold,
    fontSize: 11,
    color: C.ink,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.paper,
    borderWidth: 2,
    borderColor: C.ink,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  toggleBtnText: {
    fontFamily: F.bold,
    fontSize: 11,
    color: C.ink,
  },

  // Deck layout
  deck: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    alignItems: 'stretch',
  },
  card: {
    backgroundColor: C.paper,
    borderWidth: 2.5,
    borderColor: C.ink,
    borderRadius: 20,
    padding: 16,
    justifyContent: 'space-between',
    shadowColor: C.ink,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  courseCard: {
    flex: 1,
    minWidth: 260,
  },
  readinessCard: {
    flex: 1.35,
    minWidth: 320,
  },
  visibilityCard: {
    flex: 1,
    minWidth: 260,
  },

  // Card headers
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eyebrow: {
    fontFamily: F.display,
    fontSize: 14,
    color: C.ink,
  },
  editChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.yellow,
    borderWidth: 2,
    borderColor: C.ink,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  editText: {
    fontFamily: F.bold,
    fontSize: 11,
    color: C.ink,
  },

  // Course card details
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  codeChip: {
    alignSelf: 'flex-start',
    backgroundColor: C.coral,
    borderWidth: 2,
    borderColor: C.ink,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 3,
    transform: [{ rotate: '-2deg' }],
  },
  codeChipText: {
    fontFamily: F.display,
    fontSize: 13,
    color: C.cream,
    letterSpacing: 0.5,
  },
  subjectNameText: {
    flex: 1,
    fontFamily: F.bold,
    fontSize: 12,
    color: C.ink,
  },
  metaList: {
    gap: 6,
    marginTop: 6,
  },
  metaTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: C.ink,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  metaIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.paper,
    borderWidth: 1.5,
    borderColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaLabel: {
    fontFamily: F.medium,
    fontSize: 10.5,
    color: C.muted,
  },
  metaValue: {
    fontFamily: F.bold,
    fontSize: 12,
    color: C.ink,
  },

  // Readiness card details
  readyBadgePill: {
    backgroundColor: C.yellow,
    borderWidth: 2,
    borderColor: C.ink,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  readyCount: {
    fontFamily: F.display,
    fontSize: 12,
    color: C.ink,
  },
  track: {
    height: 12,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: C.ink,
    backgroundColor: C.pink,
    overflow: 'hidden',
    marginBottom: 12,
  },
  fill: {
    height: '100%',
  },
  auditGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  auditRow: {
    flex: 1,
    minWidth: 135,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: C.ink,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  auditRowDone: {
    backgroundColor: '#EAFBF2',
  },
  auditBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.cream,
    borderWidth: 1.5,
    borderColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  auditName: {
    fontFamily: F.bold,
    fontSize: 11.5,
    color: C.ink,
  },
  auditDetail: {
    fontFamily: F.medium,
    fontSize: 10,
    color: C.muted,
    marginTop: 1,
  },

  // Visibility card details
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 2,
    borderColor: C.ink,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  pillLive: {
    backgroundColor: C.green,
  },
  pillDraft: {
    backgroundColor: C.yellow,
  },
  statusText: {
    fontFamily: F.bold,
    fontSize: 11.5,
    color: C.ink,
  },
  publishHint: {
    fontFamily: F.medium,
    fontSize: 11.5,
    lineHeight: 16,
    color: C.muted,
    marginTop: 4,
    marginBottom: 8,
  },
  actionBtnWrap: {
    marginTop: 'auto',
    paddingTop: 8,
  },

  // Chunky button
  btnShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: C.ink,
  },
  btnFace: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 40,
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: C.ink,
  },
  btnText: {
    fontFamily: F.bold,
    fontSize: 13,
  },
});
