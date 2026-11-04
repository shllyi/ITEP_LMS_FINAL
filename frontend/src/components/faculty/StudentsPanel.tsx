import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Platform,
  LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EnrolledStudent } from '@/types/faculty';
import { SECTIONS } from '@/constants/sections';
import { exportCsv, exportWord, exportPdf, ExportData } from '@/utils/exportStudents';

interface Props {
  subjectName?: string;
  students: EnrolledStudent[];
  loading: boolean;
  error?: string;
}

/* Brand tokens: same values as the faculty dashboard */
const C = {
  coral: '#FF6B81',
  coralDeep: '#D94D63',
  pink: '#FFD1D4',
  pinkDeep: '#E8A9AE',
  cream: '#FFF5BA',
  blue: '#00A3EB',
  blueDeep: '#0079AD',
  ink: '#4A1A24',
  muted: '#8F5F68',
  paper: '#FFFBF0',
  green: '#2FB57A',
  greenDeep: '#1E8A5B',
  white: '#FFFFFF',
};
const F = {
  medium: 'Outfit_500Medium',
  bold: 'Outfit_700Bold',
  display: 'TitanOne_400Regular',
};

const NO_SECTION = 'No Section';
const sectionList: readonly string[] = SECTIONS;

const sortBySurname = (list: EnrolledStudent[]) =>
  [...list].sort(
    (a, b) =>
      (a.lastName || '').localeCompare(b.lastName || '', undefined, { sensitivity: 'base' }) ||
      (a.firstName || '').localeCompare(b.firstName || '', undefined, { sensitivity: 'base' })
  );

const AVATARS = [
  { bg: C.coral, fg: C.cream },
  { bg: C.blue, fg: C.white },
  { bg: C.pink, fg: C.ink },
  { bg: C.green, fg: C.white },
  { bg: C.cream, fg: C.ink },
];
const avatarFor = (key: string) => {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return AVATARS[h % AVATARS.length];
};
const initialsOf = (s: EnrolledStudent) =>
  `${(s.firstName || '?')[0] || '?'}${(s.lastName || '')[0] || ''}`.toUpperCase();

/* Passed pill: green when the student passed every quiz */
function PassedPill({ s }: { s: EnrolledStudent }) {
  const total = s.totalQuizzes || 0;
  if (total <= 0) return <Text style={st.dash}>-</Text>;
  const passed = s.passedQuizzes ?? 0;
  const all = passed >= total;
  return (
    <View style={[st.pill, { backgroundColor: all ? C.green : passed > 0 ? C.cream : C.pink }]}>
      <Text style={[st.pillText, { color: all ? C.white : C.ink }]}>
        {passed}/{total}
      </Text>
    </View>
  );
}

function ScoreBadge({ value }: { value: string }) {
  if (!value) return null;
  const empty = value === '-';
  return (
    <View style={[st.scoreBadge, empty && { backgroundColor: C.paper, borderStyle: 'dashed' }]}>
      <Text style={[st.scoreText, empty && { color: C.muted }]}>{value}</Text>
    </View>
  );
}

function ExportBtn({ label, icon, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [st.exportBtnWrap, pressed && { transform: [{ translateY: 3 }] }]}>
      <View style={st.exportBtnShadow} />
      <View style={st.exportBtn}>
        <Ionicons name={icon} size={14} color={C.ink} />
        <Text style={st.exportBtnText}>{label}</Text>
      </View>
    </Pressable>
  );
}

function Chip({
  label,
  active,
  tone,
  onPress,
}: {
  label: string;
  active: boolean;
  tone: 'coral' | 'blue';
  onPress: () => void;
}) {
  const on = tone === 'coral' ? C.coral : C.blue;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[st.chip, active && { backgroundColor: on }]}
    >
      {active ? <Ionicons name="checkmark" size={13} color={C.white} /> : null}
      <Text style={[st.chipText, active && { color: C.white }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function StudentsPanel({ subjectName, students, loading, error }: Props) {
  const [sectionFilter, setSectionFilter] = useState<string>('All');
  const [quizId, setQuizId] = useState<string>('');
  const [boxW, setBoxW] = useState(900);
  const wide = boxW >= 720;
  const onLayout = (e: LayoutChangeEvent) => setBoxW(e.nativeEvent.layout.width);

  // Quiz list (1 topic = 1 quiz), taken from the students' score data
  const quizzes = (students[0]?.quizScores || []).map(q => ({
    topicId: q.topicId,
    title: q.topicTitle,
    total: q.totalQuestions,
  }));
  const activeQuiz = quizzes.find(q => q.topicId === quizId) || quizzes[0];

  const scoreText = (s: EnrolledStudent) => {
    const sc = s.quizScores?.find(q => q.topicId === activeQuiz?.topicId);
    return sc && sc.correctCount !== null && sc.correctCount !== undefined ? String(sc.correctCount) : '-';
  };

  // One separate roster per section
  const groups = [...sectionList, NO_SECTION]
    .map(name => ({
      name,
      list: sortBySurname(
        students.filter(s =>
          name === NO_SECTION ? !s.section || !sectionList.includes(s.section) : s.section === name
        )
      ),
    }))
    .filter(g => g.list.length > 0);

  const visibleGroups = sectionFilter === 'All' ? groups : groups.filter(g => g.name === sectionFilter);

  const buildExportData = (): ExportData => ({
    title: `Class List${subjectName ? ' - ' + subjectName : ''}`,
    subtitle: [
      sectionFilter === 'All' ? 'All sections' : sectionFilter,
      activeQuiz ? `Score out of ${activeQuiz.total} - ${activeQuiz.title}` : '',
      `Generated ${new Date().toLocaleDateString()}`,
    ]
      .filter(Boolean)
      .join(' · '),
    scoreLabel: activeQuiz ? `Score (/${activeQuiz.total})` : 'Score',
    groups: visibleGroups.map(g => ({
      name: g.name,
      rows: g.list.map((s, i) => {
        const score = scoreText(s);
        return {
          no: i + 1,
          tuptId: s.tuptId || '',
          name: `${s.lastName}, ${s.firstName}`,
          email: s.email,
          score: score === '-' ? '' : score,
          passed: (s.totalQuizzes || 0) > 0 ? `${s.passedQuizzes ?? 0}/${s.totalQuizzes}` : '',
        };
      }),
    })),
  });

  const sectionNames = ['All', ...groups.map(g => g.name)];

  return (
    <View onLayout={onLayout} style={{ gap: 20 }}>
      {/* Header + controls */}
      <View style={st.headWrap}>
        <View style={st.headShadow} />
        <View style={st.head}>
          <View style={st.titleRow}>
            <View style={st.titleIcon}>
              <Ionicons name="people" size={22} color={C.ink} />
            </View>
            <View style={{ flex: 1, minWidth: 160 }}>
              <Text style={st.title}>Enrolled students</Text>
              {!!subjectName && (
                <Text style={st.sub} numberOfLines={2}>
                  {subjectName}
                </Text>
              )}
            </View>
            <View style={st.totalPill}>
              <Text style={st.totalNum}>{students.length}</Text>
              <Text style={st.totalLabel}>total</Text>
            </View>
          </View>

          {Platform.OS === 'web' && students.length > 0 && (
            <View style={st.block}>
              <Text style={st.blockLabel}>Download class list</Text>
              <View style={st.wrapRow}>
                <ExportBtn label="PDF" icon="document-text" onPress={() => exportPdf(buildExportData())} />
                <ExportBtn label="Word" icon="document" onPress={() => exportWord(buildExportData())} />
                <ExportBtn label="Spreadsheet" icon="grid" onPress={() => exportCsv(buildExportData())} />
              </View>
            </View>
          )}

          {students.length > 0 && (
            <View style={st.block}>
              <Text style={st.blockLabel}>Section</Text>
              <View style={st.wrapRow}>
                {sectionNames.map(name => {
                  const count = name === 'All' ? students.length : groups.find(g => g.name === name)?.list.length || 0;
                  return (
                    <Chip
                      key={name}
                      label={`${name} (${count})`}
                      tone="coral"
                      active={sectionFilter === name}
                      onPress={() => setSectionFilter(name)}
                    />
                  );
                })}
              </View>
            </View>
          )}

          {quizzes.length > 0 && (
            <View style={st.block}>
              <Text style={st.blockLabel}>Quiz score for</Text>
              <View style={st.wrapRow}>
                {quizzes.map(q => (
                  <Chip
                    key={q.topicId}
                    label={q.title}
                    tone="blue"
                    active={activeQuiz?.topicId === q.topicId}
                    onPress={() => setQuizId(q.topicId)}
                  />
                ))}
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Body */}
      {loading && students.length === 0 ? (
        <View style={st.stateBox}>
          <Image
            source={require('@/assets/images/mascot_gif.gif')}
            style={{ width: 88, height: 88 }}
            resizeMode="contain"
            accessible={false}
          />
          <Text style={st.stateText}>Loading students…</Text>
        </View>
      ) : error ? (
        <View style={st.errorBox}>
          <Ionicons name="alert-circle" size={20} color={C.coralDeep} />
          <View style={{ flex: 1 }}>
            <Text style={st.errorTitle}>Students could not be loaded</Text>
            <Text style={st.errorText}>{error}. This list retries automatically.</Text>
          </View>
        </View>
      ) : visibleGroups.length === 0 ? (
        <View style={st.emptyBox}>
          <View style={st.emptyIcon}>
            <Ionicons name="person-add" size={24} color={C.ink} />
          </View>
          <Text style={st.emptyTitle}>No students yet</Text>
          <Text style={st.emptyText}>Students who enroll in this class will appear here, grouped by section.</Text>
        </View>
      ) : (
        visibleGroups.map(group => (
          <View key={group.name} style={st.groupWrap}>
            <View style={st.groupShadow} />
            <View style={st.group}>
              <View style={st.groupHead}>
                <View style={st.sectionTag}>
                  <Text style={st.sectionTagText}>{group.name}</Text>
                </View>
                <Text style={st.count}>
                  {group.list.length} student{group.list.length === 1 ? '' : 's'}
                </Text>
              </View>
              {activeQuiz && (
                <Text style={st.groupSub} numberOfLines={2}>
                  Score out of {activeQuiz.total} - {activeQuiz.title}
                </Text>
              )}

              {wide ? (
                <View style={st.table}>
                  <View style={[st.row, st.headRow]}>
                    <Text style={[st.cell, st.headText, st.center, { flex: 0.8 }]}>{' '}</Text>
                    <Text style={[st.cell, st.headText, st.center, { flex: 0.8 }]}>{' '}</Text>
                    <Text style={[st.cell, st.headText, { flex: 1 }]}>Student No.</Text>
                    <Text style={[st.cell, st.headText, { flex: 1.3 }]}>TUPT-ID</Text>
                    <Text style={[st.cell, st.headText, { flex: 2 }]}>Name</Text>
                    <Text style={[st.cell, st.headText, { flex: 2 }]}>Email</Text>
                    <Text style={[st.cell, st.headText, { flex: 0.8 }]}>Passed</Text>
                  </View>
                  {group.list.map((s, i) => {
                    const number = i + 1;
                    const isEven = number % 2 === 0;
                    const score = scoreText(s);
                    return (
                      <View key={s._id} style={[st.row, i % 2 === 1 && st.rowAlt, i === group.list.length - 1 && { borderBottomWidth: 0 }]}>
                        <View style={[st.cell, st.centerBox, { flex: 0.8 }]}>
                          {isEven ? <ScoreBadge value={score} /> : null}
                        </View>
                        <View style={[st.cell, st.centerBox, { flex: 0.8 }]}>
                          {!isEven ? <ScoreBadge value={score} /> : null}
                        </View>
                        <Text style={[st.cell, st.cellText, { flex: 1 }]}>{number}</Text>
                        <Text style={[st.cell, st.cellText, { flex: 1.3 }]} numberOfLines={1}>
                          {s.tuptId || '-'}
                        </Text>
                        <Text style={[st.cell, st.cellText, st.name, { flex: 2 }]} numberOfLines={1}>
                          {s.lastName}, {s.firstName}
                        </Text>
                        <Text style={[st.cell, st.cellText, { flex: 2 }]} numberOfLines={1}>
                          {s.email}
                        </Text>
                        <View style={[st.cell, { flex: 0.8, alignItems: 'flex-start' }]}>
                          <PassedPill s={s} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={{ marginTop: 12 }}>
                  {group.list.map((s, i) => {
                    const av = avatarFor(s._id || s.email || String(i));
                    return (
                      <View key={s._id} style={[st.card, i === group.list.length - 1 && { marginBottom: 0 }]}>
                        <View style={[st.avatar, { backgroundColor: av.bg }]}>
                          <Text style={[st.avatarText, { color: av.fg }]}>{initialsOf(s)}</Text>
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={st.cardName} numberOfLines={1}>
                            {i + 1}. {s.lastName}, {s.firstName}
                          </Text>
                          <Text style={st.cardMeta} numberOfLines={1}>
                            {s.tuptId || 'No TUPT-ID'}
                          </Text>
                          <Text style={st.cardMeta} numberOfLines={1}>
                            {s.email}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 6 }}>
                          <ScoreBadge value={scoreText(s)} />
                          <PassedPill s={s} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        ))
      )}
    </View>
  );
}

export default StudentsPanel;

const st = StyleSheet.create({
  // header card
  headWrap: { zIndex: 2 },
  headShadow: { position: 'absolute', top: 8, left: 8, right: -8, bottom: -8, borderRadius: 26, backgroundColor: C.blue },
  head: { backgroundColor: C.paper, borderRadius: 26, borderWidth: 3, borderColor: C.ink, padding: 20 },
  titleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 14 },
  titleIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.cream, borderWidth: 2.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: F.display, fontSize: 26, lineHeight: 30, color: C.ink },
  sub: { fontFamily: F.medium, fontSize: 13, color: C.muted, marginTop: 2 },
  totalPill: { flexDirection: 'row', alignItems: 'baseline', gap: 6, backgroundColor: C.cream, borderWidth: 2.5, borderColor: C.ink, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  totalNum: { fontFamily: F.display, fontSize: 20, color: C.ink },
  totalLabel: { fontFamily: F.bold, fontSize: 12, color: C.muted },

  block: { marginTop: 18 },
  blockLabel: { fontFamily: F.bold, fontSize: 13, color: C.muted, marginBottom: 8 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  // export buttons
  exportBtnWrap: { paddingBottom: 4 },
  exportBtnShadow: { position: 'absolute', left: 0, right: 0, top: 4, bottom: 0, borderRadius: 12, backgroundColor: C.pinkDeep, borderWidth: 2.5, borderColor: C.ink },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.cream, borderRadius: 12, borderWidth: 2.5, borderColor: C.ink, paddingHorizontal: 14, height: 36 },
  exportBtnText: { fontFamily: F.bold, fontSize: 13, color: C.ink },

  // chips
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: 320, backgroundColor: C.paper, borderWidth: 2.5, borderColor: C.ink, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  chipText: { fontFamily: F.bold, fontSize: 13, color: C.ink, flexShrink: 1 },

  // group
  groupWrap: { zIndex: 1 },
  groupShadow: { position: 'absolute', top: 8, left: 8, right: -8, bottom: -8, borderRadius: 24, backgroundColor: C.coral },
  group: { backgroundColor: C.paper, borderRadius: 24, borderWidth: 3, borderColor: C.ink, padding: 18, overflow: 'hidden' },
  groupHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sectionTag: { backgroundColor: C.coral, borderWidth: 2.5, borderColor: C.ink, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 4 },
  sectionTagText: { fontFamily: F.display, fontSize: 16, color: C.cream },
  count: { fontFamily: F.bold, fontSize: 13, color: C.muted },
  groupSub: { fontFamily: F.medium, fontSize: 13, color: C.muted, marginTop: 8 },

  // wide table
  table: { marginTop: 14, borderWidth: 2.5, borderColor: C.ink, borderRadius: 14, overflow: 'hidden', backgroundColor: C.white },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1.5, borderBottomColor: C.pink },
  rowAlt: { backgroundColor: C.paper },
  headRow: { backgroundColor: C.cream, borderBottomWidth: 2.5, borderBottomColor: C.ink, paddingVertical: 11 },
  cell: { paddingHorizontal: 8 },
  cellText: { fontFamily: F.medium, fontSize: 13, color: C.ink },
  headText: { fontFamily: F.bold, fontSize: 12, color: C.ink },
  name: { fontFamily: F.bold },
  center: { textAlign: 'center' },
  centerBox: { alignItems: 'center', justifyContent: 'center' },
  dash: { fontFamily: F.medium, fontSize: 13, color: C.muted },

  // badges
  scoreBadge: { minWidth: 34, height: 28, paddingHorizontal: 8, borderRadius: 14, backgroundColor: C.cream, borderWidth: 2.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  scoreText: { fontFamily: F.display, fontSize: 14, color: C.ink },
  pill: { borderWidth: 2, borderColor: C.ink, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 },
  pillText: { fontFamily: F.bold, fontSize: 12 },

  // narrow cards
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, borderWidth: 2.5, borderColor: C.ink, borderRadius: 16, padding: 12, marginBottom: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 2.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: F.display, fontSize: 15 },
  cardName: { fontFamily: F.bold, fontSize: 15, color: C.ink },
  cardMeta: { fontFamily: F.medium, fontSize: 12, color: C.muted, marginTop: 1 },

  // states
  stateBox: { alignItems: 'center', gap: 10, padding: 28 },
  stateText: { fontFamily: F.medium, fontSize: 14, color: C.muted },
  errorBox: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: C.paper, borderWidth: 3, borderColor: C.coralDeep, borderRadius: 18, padding: 14 },
  errorTitle: { fontFamily: F.bold, fontSize: 14, color: C.ink },
  errorText: { fontFamily: F.medium, fontSize: 13, color: C.muted, marginTop: 2 },
  emptyBox: { alignItems: 'center', backgroundColor: C.paper, borderWidth: 3, borderColor: C.ink, borderStyle: 'dashed', borderRadius: 22, padding: 28 },
  emptyIcon: { width: 54, height: 54, borderRadius: 27, backgroundColor: C.pink, borderWidth: 2.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  emptyTitle: { fontFamily: F.display, fontSize: 22, color: C.ink, textAlign: 'center' },
  emptyText: { fontFamily: F.medium, fontSize: 14, lineHeight: 21, color: C.muted, marginTop: 4, textAlign: 'center', maxWidth: 420 },
});