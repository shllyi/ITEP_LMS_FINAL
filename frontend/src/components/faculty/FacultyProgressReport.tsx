
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SubjectProgressReport } from '@/services/facultyApi';
import {
  Bar,
  Btn,
  C,
  Chunky,
  CountUp,
  F,
  Pop,
  Segmented,
} from '@/components/faculty/brand';

interface Props {
  report: SubjectProgressReport;
  onClose: () => void;
}

type Student = SubjectProgressReport['students'][number];

const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch] as string));

const STICKERS = [
  { face: C.blue, deep: C.blueDeep, fg: '#FFFFFF', icon: 'people' as const, rot: -1.2, radius: 22 },
  { face: C.cream, deep: C.creamDeep, fg: C.ink, icon: 'albums' as const, rot: 1.2, radius: 12 },
  { face: C.pink, deep: C.pinkDeep, fg: C.ink, icon: 'layers' as const, rot: -0.8, radius: 28 },
  { face: C.coral, deep: C.coralDeep, fg: C.cream, icon: 'flash' as const, rot: 1.8, radius: 14 },
];

const AVATARS = [
  { bg: C.coral, fg: C.cream },
  { bg: C.blue, fg: '#FFFFFF' },
  { bg: C.yellow, fg: C.ink },
  { bg: C.green, fg: '#FFFFFF' },
  { bg: C.pink, fg: C.ink },
];

function scoreColor(pct: number) {
  if (pct >= 75) return C.green;
  if (pct >= 50) return C.blue;
  return C.coral;
}

/** One student. Tap to open the per-topic attempt history. */
function StudentCard({
  student,
  index,
}: {
  student: Student;
  index: number;
}) {
  const [open, setOpen] = useState(false);
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(spin, {
      toValue: open ? 1 : 0,
      friction: 6,
      tension: 140,
      useNativeDriver: true,
    }).start();
  }, [open, spin]);

  const av = AVATARS[index % AVATARS.length];
  const pct = student.overallScorePercent;
  const initials = `${(student.firstName || '?').charAt(0)}${(student.lastName || '').charAt(0)}`.toUpperCase();

  return (
    <Pop delay={Math.min(index, 8) * 45} from={14}>
      <View style={st.cardWrap}>
        <View
          style={[
            st.cardShadow,
            open && { backgroundColor: scoreColor(pct) },
          ]}
        />

        <View style={st.card}>
          <Pressable
            onPress={() => setOpen(o => !o)}
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            style={st.cardTop}
          >
            <View style={[st.avatar, { backgroundColor: av.bg }]}>
              <Text style={[st.avatarText, { color: av.fg }]}>
                {initials}
              </Text>
            </View>

            <View style={{ flex: 1, minWidth: 140 }}>
              <Text style={st.name} numberOfLines={1}>
                {student.lastName}, {student.firstName}
              </Text>

              <Text style={st.email} numberOfLines={1}>
                {student.email}
              </Text>
            </View>

            <View style={st.scoreBox}>
              <Text
                style={[
                  st.scoreNum,
                  { color: pct >= 50 ? C.ink : C.coralDeep },
                ]}
              >
                {pct}%
              </Text>

              <View style={{ width: 96 }}>
                <Bar pct={pct} color={scoreColor(pct)} height={10} />
              </View>
            </View>

            <Animated.View
              style={{
                transform: [
                  {
                    rotate: spin.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '180deg'],
                    }),
                  },
                ],
              }}
            >
              <Ionicons
                name="chevron-down-circle"
                size={26}
                color={C.ink}
              />
            </Animated.View>
          </Pressable>

          <View style={st.pills}>
            <View style={[st.pill, { backgroundColor: C.cream }]}>
              <Ionicons name="checkmark-done" size={13} color={C.ink} />
              <Text style={st.pillText}>
                Passed {student.passedTopics} of {student.totalTopics}
              </Text>
            </View>

            <View style={[st.pill, { backgroundColor: C.pink }]}>
              <Ionicons name="repeat" size={13} color={C.ink} />
              <Text style={st.pillText}>
                {student.attemptsTotal}{' '}
                {student.attemptsTotal === 1 ? 'attempt' : 'attempts'}
              </Text>
            </View>
          </View>

          {open ? (
            <Pop from={8} style={st.detail}>
              {student.topicScores.length === 0 ? (
                <Text style={st.muted}>No quiz topics yet.</Text>
              ) : (
                student.topicScores.map(topic => (
                  <View key={topic.topicId} style={st.topicRow}>
                    <Ionicons
                      name={
                        topic.passed
                          ? 'checkmark-circle'
                          : topic.attempts.length
                            ? 'close-circle'
                            : 'ellipse-outline'
                      }
                      size={20}
                      color={
                        topic.passed
                          ? C.green
                          : topic.attempts.length
                            ? C.coralDeep
                            : C.muted
                      }
                    />

                    <Text style={st.topicName} numberOfLines={2}>
                      {topic.topicTitle}
                    </Text>

                    <View style={st.attemptWrap}>
                      {topic.attempts.length === 0 ? (
                        <Text style={st.muted}>Not attempted</Text>
                      ) : (
                        topic.attempts.map((attempt, i) => (
                          <View
                            key={i}
                            style={[
                              st.attempt,
                              i === topic.attempts.length - 1 && {
                                backgroundColor: C.yellow,
                              },
                            ]}
                          >
                            <Text style={st.attemptText}>
                              {attempt.scorePercent}%
                            </Text>
                          </View>
                        ))
                      )}
                    </View>
                  </View>
                ))
              )}
            </Pop>
          ) : null}
        </View>
      </View>
    </Pop>
  );
}

export function FacultyProgressReport({ report, onClose }: Props) {
  const [sortBy, setSortBy] = useState<'surname' | 'score'>('surname');

  const students = useMemo(
    () =>
      [...report.students].sort((a, b) =>
        sortBy === 'surname'
          ? `${a.lastName} ${a.firstName}`.localeCompare(
              `${b.lastName} ${b.firstName}`
            )
          : b.overallScorePercent - a.overallScorePercent
      ),
    [report.students, sortBy]
  );

  const classAvg = report.students.length
    ? Math.round(
        report.students.reduce(
          (sum, s) => sum + (s.overallScorePercent || 0),
          0
        ) / report.students.length
      )
    : 0;

  const stats = [
    {
      title: 'Whole class',
      value: classAvg,
      meta: `${report.students.length} ${
        report.students.length === 1 ? 'student' : 'students'
      }`,
    },
    ...report.modules.map(m => ({
      title: m.moduleTitle,
      value: m.averageScorePercent,
      meta: `${m.topicCount} quiz ${
        m.topicCount === 1 ? 'topic' : 'topics'
      }`,
    })),
  ];

  /* ------------------------------------------------------------- */
  /* EXPORT CSV                                                     */
  /* ------------------------------------------------------------- */

  const exportCsv = () => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }

    const header = [
      'Surname',
      'First Name',
      'Email',
      'Overall Score %',
      'Passed Topics',
      'Total Topics',
      'Attempts',
      ...report.topics.map(
        topic => `${topic.moduleTitle} - ${topic.topicTitle}`
      ),
    ];

    const rows = students.map(student => [
      student.lastName,
      student.firstName,
      student.email,
      student.overallScorePercent,
      student.passedTopics,
      student.totalTopics,
      student.attemptsTotal,
      ...report.topics.map(topic => {
        const score = student.topicScores.find(
          item => item.topicId === topic.topicId
        );

        return score
          ? `${score.bestScorePercent}% (${score.attemptsCount} attempts${
              score.passed ? ', passed' : ''
            })`
          : 'Not attempted';
      }),
    ]);

    const escapeCsv = (value: unknown) =>
      `"${String(value ?? '').replace(/"/g, '""')}"`;

    const csv = [header, ...rows]
      .map(row => row.map(escapeCsv).join(','))
      .join('\r\n');

    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `${report.subject.code || 'subject'}-quiz-report.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  /* ------------------------------------------------------------- */
  /* PRINT / SAVE PDF                                               */
  /* ------------------------------------------------------------- */

  const printReport = () => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    const rows = students
      .map(
        student => `
          <tr>
            <td>${esc(student.lastName)}, ${esc(student.firstName)}</td>
            <td>${esc(student.email)}</td>
            <td>${student.overallScorePercent}%</td>
            <td>${student.passedTopics}/${student.totalTopics}</td>
            <td>${student.attemptsTotal}</td>
            <td>
              ${student.topicScores
                .map(
                  topic =>
                    `${esc(topic.topicTitle)}: ${
                      topic.attempts
                        .map(attempt => `${attempt.scorePercent}%`)
                        .join(' → ') || 'Not attempted'
                    }`
                )
                .join('<br>')}
            </td>
          </tr>
        `
      )
      .join('');

    // Open directly from the button click so the browser allows the popup.
    const reportWindow = window.open('', '_blank');

    if (!reportWindow) {
      window.alert(
        'Unable to open the print window. Please allow pop-ups for this website and try again.'
      );
      return;
    }

    reportWindow.document.open();

    reportWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>${esc(report.subject.code)} Quiz Report</title>

          <style>
            @page {
              size: A4 landscape;
              margin: 15mm;
            }

            body {
              font-family: Arial, Helvetica, sans-serif;
              color: #4A1A24;
              margin: 20px;
            }

            h1 {
              margin-bottom: 4px;
            }

            .meta {
              color: #8F5F68;
              margin-bottom: 24px;
              line-height: 1.6;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
            }

            th {
              background: #4A1A24;
              color: #FFF5BA;
              text-align: left;
            }

            th, td {
              border: 1px solid #E8A9AE;
              padding: 8px;
              vertical-align: top;
            }

            tr {
              page-break-inside: avoid;
            }

            .footer {
              margin-top: 24px;
              color: #8F5F68;
              font-size: 10px;
            }

            @media print {
              body {
                margin: 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>

        <body>
          <h1>${esc(report.subject.name)}</h1>

          <div class="meta">
            <b>${esc(report.subject.code)}</b> ·
            ${esc(report.subject.academicYear || '')} ·
            ${esc(report.subject.semester || '')} ·
            ${esc(report.subject.yearLevel || '')}
            <br />

            Professor:
            ${esc(report.subject.professorName || 'Faculty Instructor')}
            ${
              report.subject.professorEmail
                ? ` · ${esc(report.subject.professorEmail)}`
                : ''
            }
            <br />

            Generated: ${new Date(report.generatedAt).toLocaleString()}
          </div>

          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Email</th>
                <th>Overall</th>
                <th>Passed Topics</th>
                <th>Attempts</th>
                <th>Topic Scores by Attempt</th>
              </tr>
            </thead>

            <tbody>
              ${rows}
            </tbody>
          </table>

          <div class="footer">
            Official assessment summary · Best score shown in the overall
            score; attempt history is listed per topic.
          </div>
        </body>
      </html>
    `);

    reportWindow.document.close();

    // Give the newly written document time to render before printing.
    reportWindow.setTimeout(() => {
      reportWindow.focus();
      reportWindow.print();
    }, 500);
  };

  return (
    <View style={st.screen}>
      <View pointerEvents="none" style={st.blobCoral} />
      <View pointerEvents="none" style={st.blobBlue} />

      <ScrollView
        contentContainerStyle={st.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header card */}
        <Pop from={-10}>
          <View style={st.heroWrap}>
            <View style={st.heroShadow} />

            <View style={st.hero}>
              <View style={{ flex: 1, minWidth: 240 }}>
                <View style={st.codePill}>
                  <Ionicons name="ribbon" size={13} color="#FFFFFF" />
                  <Text style={st.codeText}>
                    {report.subject.code}
                  </Text>
                </View>

                <Text style={st.title}>
                  {report.subject.name}
                </Text>

                <Text style={st.subtitle}>
                  {[
                    report.subject.academicYear,
                    report.subject.semester,
                    report.subject.yearLevel,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </Text>

                <Text style={st.subtitle}>
                  Professor {report.subject.professorName || 'Faculty Instructor'}
                </Text>
              </View>

              <View style={st.actions}>
                <Btn
                  size="sm"
                  tone="yellow"
                  icon="download"
                  title="Export CSV"
                  onPress={exportCsv}
                />

                <Btn
                  size="sm"
                  tone="paper"
                  icon="print"
                  title="Print or save PDF"
                  onPress={printReport}
                />

                <Btn
                  size="sm"
                  tone="coral"
                  icon="close"
                  title="Close"
                  onPress={onClose}
                />
              </View>
            </View>
          </View>
        </Pop>

        {/* Stat stickers */}
        <View style={st.stickerWrap}>
          {stats.map((stat, i) => {
            const t = STICKERS[i % STICKERS.length];

            return (
              <View
                key={`${stat.title}-${i}`}
                style={{
                  flexGrow: 1,
                  flexBasis: 190,
                  transform: [{ rotate: `${t.rot}deg` }],
                }}
              >
                <Pop delay={i * 80} from={20}>
                  <Chunky
                    face={t.face}
                    shadow={t.deep}
                    radius={t.radius}
                    depth={5}
                    faceStyle={{ padding: 14 }}
                  >
                    <View style={st.stickerTop}>
                      <View style={st.stickerIcon}>
                        <Ionicons
                          name={t.icon}
                          size={14}
                          color={C.ink}
                        />
                      </View>

                      <CountUp
                        to={stat.value}
                        suffix="%"
                        style={[
                          st.stickerValue,
                          { color: t.fg },
                        ]}
                      />
                    </View>

                    <Text
                      style={[st.stickerTitle, { color: t.fg }]}
                      numberOfLines={2}
                    >
                      {stat.title}
                    </Text>

                    <Text
                      style={[st.stickerMeta, { color: t.fg }]}
                    >
                      {stat.meta}
                    </Text>
                  </Chunky>
                </Pop>
              </View>
            );
          })}
        </View>

        {/* Sort */}
        <View style={st.sortRow}>
          <Text style={st.sortLabel}>
            Order students by
          </Text>

          <Segmented
            width={230}
            value={sortBy}
            onChange={setSortBy}
            options={[
              { key: 'surname', label: 'Surname', icon: 'text' },
              { key: 'score', label: 'Score', icon: 'trending-up' },
            ]}
          />
        </View>

        {/* Students */}
        {students.length === 0 ? (
          <View style={st.empty}>
            <Ionicons
              name="people-outline"
              size={30}
              color={C.ink}
            />

            <Text style={st.emptyTitle}>
              No students yet
            </Text>

            <Text style={st.emptyText}>
              Results show up here once students take a quiz.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            {students.map((student, i) => (
              <StudentCard
                key={student.studentId}
                student={student}
                index={i}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* STYLES                                                             */
/* ------------------------------------------------------------------ */

const st = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },

  content: {
    padding: 20,
    paddingTop: 28,
    paddingBottom: 60,
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
  },

  blobCoral: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 999,
    top: -120,
    right: -90,
    backgroundColor: C.coral,
    opacity: 0.8,
  },

  blobBlue: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 999,
    top: 480,
    left: -90,
    backgroundColor: C.blue,
    opacity: 0.5,
  },

  heroWrap: {
    marginBottom: 24,
  },

  heroShadow: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: -8,
    bottom: -8,
    borderRadius: 26,
    backgroundColor: C.coral,
  },

  hero: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 16,
    backgroundColor: C.paper,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: C.ink,
    padding: 20,
  },

  codePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.blue,
    borderWidth: 2.5,
    borderColor: C.ink,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },

  codeText: {
    fontFamily: F.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },

  title: {
    fontFamily: F.display,
    fontSize: 28,
    lineHeight: 32,
    color: C.ink,
    marginTop: 8,
  },

  subtitle: {
    fontFamily: F.medium,
    fontSize: 13,
    color: C.muted,
    marginTop: 3,
  },

  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  stickerWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 26,
  },

  stickerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  stickerIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.paper,
    borderWidth: 2,
    borderColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },

  stickerValue: {
    fontFamily: F.display,
    fontSize: 32,
    lineHeight: 36,
  },

  stickerTitle: {
    fontFamily: F.bold,
    fontSize: 14,
    marginTop: 6,
  },

  stickerMeta: {
    fontFamily: F.medium,
    fontSize: 12,
    marginTop: 1,
    opacity: 0.85,
  },

  sortRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },

  sortLabel: {
    fontFamily: F.bold,
    fontSize: 14,
    color: C.ink,
  },

  cardWrap: {},

  cardShadow: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: -6,
    bottom: -6,
    borderRadius: 22,
    backgroundColor: C.pinkDeep,
  },

  card: {
    backgroundColor: C.paper,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: C.ink,
    padding: 14,
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2.5,
    borderColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    fontFamily: F.display,
    fontSize: 16,
  },

  name: {
    fontFamily: F.bold,
    fontSize: 16,
    color: C.ink,
  },

  email: {
    fontFamily: F.medium,
    fontSize: 12,
    color: C.muted,
    marginTop: 1,
  },

  scoreBox: {
    alignItems: 'flex-end',
    gap: 4,
  },

  scoreNum: {
    fontFamily: F.display,
    fontSize: 22,
    lineHeight: 24,
  },

  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 2,
    borderColor: C.ink,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },

  pillText: {
    fontFamily: F.bold,
    fontSize: 11.5,
    color: C.ink,
  },

  detail: {
    marginTop: 14,
    borderTopWidth: 2.5,
    borderTopColor: C.ink,
    borderStyle: 'dashed',
    paddingTop: 10,
    gap: 4,
  },

  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    paddingVertical: 7,
  },

  topicName: {
    flex: 1,
    minWidth: 150,
    fontFamily: F.bold,
    fontSize: 13,
    color: C.ink,
  },

  attemptWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },

  attempt: {
    backgroundColor: C.cream,
    borderWidth: 2,
    borderColor: C.ink,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 2,
  },

  attemptText: {
    fontFamily: F.bold,
    fontSize: 12,
    color: C.ink,
  },

  muted: {
    fontFamily: F.medium,
    fontSize: 12,
    color: C.muted,
  },

  empty: {
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.paper,
    borderWidth: 3,
    borderColor: C.ink,
    borderStyle: 'dashed',
    borderRadius: 22,
    padding: 28,
  },

  emptyTitle: {
    fontFamily: F.display,
    fontSize: 20,
    color: C.ink,
    marginTop: 4,
  },

  emptyText: {
    fontFamily: F.medium,
    fontSize: 13,
    color: C.muted,
    textAlign: 'center',
  },
});
