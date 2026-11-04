import React, { useState, useEffect, useRef } from 'react';
import { Animated, Image, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Btn, C, ChoiceChip, F, Field, IconBtn, useReduceMotion } from '@/components/faculty/brand';
import { CreateSubjectPayload, SemesterType, YearLevelType, Subject } from '@/types/faculty';

interface SubjectInitModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateSubjectPayload) => Promise<boolean>;
  initialData?: Subject | null;
  mode?: 'create' | 'edit';
}

const SEMESTERS: SemesterType[] = ['1st Semester', '2nd Semester', '3rd Semester'];
const YEAR_LEVELS: YearLevelType[] = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const ACADEMIC_YEARS = ['2024-2025', '2025-2026', '2026-2027', '2027-2028', '2028-2029'];

export function SubjectInitModal({
  visible,
  onClose,
  onSubmit,
  initialData,
  mode = 'create',
}: SubjectInitModalProps) {
  const reduce = useReduceMotion();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [semester, setSemester] = useState<SemesterType>('1st Semester');
  const [yearLevel, setYearLevel] = useState<YearLevelType>('1st Year');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const enter = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const codePop = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (initialData && mode === 'edit') {
      setName(initialData.name || '');
      setCode(initialData.code || '');
      setAcademicYear(initialData.academicYear || '2026-2027');
      setSemester(initialData.semester || '1st Semester');
      setYearLevel(initialData.yearLevel || '1st Year');
    } else {
      setName('');
      setCode('');
      setAcademicYear('2026-2027');
      setSemester('1st Semester');
      setYearLevel('1st Year');
    }
    setError('');
  }, [initialData, mode, visible]);

  // Pop the card in each time the modal opens
  useEffect(() => {
    if (!visible) return;
    if (reduce) {
      enter.setValue(1);
      return;
    }
    enter.setValue(0);
    Animated.spring(enter, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }).start();
  }, [visible, reduce, enter]);

  const fail = (msg: string) => {
    setError(msg);
    if (reduce) return;
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 90, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0.6, duration: 80, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -0.3, duration: 70, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const onCodeChange = (v: string) => {
    setCode(v);
    if (reduce) return;
    codePop.setValue(0.9);
    Animated.spring(codePop, { toValue: 1, friction: 4, tension: 220, useNativeDriver: true }).start();
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      fail('Add a subject title first.');
      return;
    }
    if (!code.trim()) {
      fail('Add a course code, like CS101 or SEC201.');
      return;
    }
    setError('');
    setLoading(true);
    const success = await onSubmit({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      academicYear,
      semester,
      yearLevel,
    });
    setLoading(false);
    if (success) {
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[st.overlay, { opacity: enter }]}>
        <Animated.View
          style={[
            st.wrap,
            {
              transform: [
                { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) },
                { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
                { rotate: enter.interpolate({ inputRange: [0, 1], outputRange: ['-2deg', '0deg'] }) },
              ],
            },
          ]}
        >
          <View style={st.cardShadow} />
          <View style={st.card}>
            {/* Header */}
            <View style={st.header}>
              <Image source={require('@/assets/images/mascot.png')} style={{ width: 58, height: 52 }} resizeMode="contain" />
              <View style={{ flex: 1 }}>
                <Text style={st.title}>{mode === 'edit' ? 'Edit subject' : 'Set up a new subject'}</Text>
                <Text style={st.subtitle}>Name it, give it a code, and say who it is for.</Text>
              </View>
              <IconBtn icon="close" label="Close" onPress={onClose} />
            </View>

            <ScrollView style={st.body} showsVerticalScrollIndicator={false}>
              {error ? (
                <Animated.View
                  style={[
                    st.errorBox,
                    { transform: [{ translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-9, 9] }) }] },
                  ]}
                >
                  <Ionicons name="alert-circle" size={18} color={C.red} />
                  <Text style={st.errorText}>{error}</Text>
                </Animated.View>
              ) : null}

              {/* Live preview */}
              <View style={st.preview}>
                <Animated.View style={[st.previewCode, { transform: [{ scale: codePop }] }]}>
                  <Ionicons name="library" size={14} color="#FFFFFF" />
                  <Text style={st.previewCodeText}>{code.trim().toUpperCase() || 'CODE'}</Text>
                </Animated.View>
                <Text style={[st.previewName, !name.trim() && { color: C.muted }]} numberOfLines={2}>
                  {name.trim() || 'Your subject title'}
                </Text>
                <View style={st.previewTags}>
                  {[yearLevel, semester, academicYear].map(tag => (
                    <View key={tag} style={st.previewTag}>
                      <Text style={st.previewTagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <Text style={st.label}>Subject title</Text>
              <Field
                placeholder="e.g., Introduction to Computer Science"
                value={name}
                onChangeText={setName}
                error={!!error && !name.trim()}
              />

              <Text style={[st.label, { marginTop: 14 }]}>Course code</Text>
              <Field
                placeholder="e.g., CS101, SEC201"
                value={code}
                onChangeText={onCodeChange}
                autoCapitalize="characters"
                error={!!error && !code.trim()}
              />

              <Text style={[st.label, { marginTop: 18 }]}>Academic year</Text>
              <View style={st.chipRow}>
                {ACADEMIC_YEARS.map(yr => (
                  <ChoiceChip key={yr} label={yr} selected={academicYear === yr} onPress={() => setAcademicYear(yr)} />
                ))}
              </View>

              <Text style={[st.label, { marginTop: 16 }]}>Semester</Text>
              <View style={st.chipRow}>
                {SEMESTERS.map(sem => (
                  <ChoiceChip key={sem} label={sem} selected={semester === sem} onPress={() => setSemester(sem)} />
                ))}
              </View>

              <Text style={[st.label, { marginTop: 16 }]}>Year level</Text>
              <View style={st.chipRow}>
                {YEAR_LEVELS.map(lvl => (
                  <ChoiceChip key={lvl} label={lvl} selected={yearLevel === lvl} onPress={() => setYearLevel(lvl)} />
                ))}
              </View>

              <View style={{ height: 24 }} />
            </ScrollView>

            {/* Footer */}
            <View style={st.footer}>
              <Btn title="Cancel" tone="paper" onPress={onClose} />
              <Btn
                title={mode === 'edit' ? 'Save changes' : 'Create subject'}
                tone="coral"
                icon={mode === 'edit' ? 'checkmark' : 'rocket'}
                loading={loading}
                onPress={handleSubmit}
              />
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(74, 26, 36, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  wrap: { width: '100%', maxWidth: 580, maxHeight: '92%' },
  cardShadow: { position: 'absolute', top: 8, left: 8, right: -8, bottom: -8, borderRadius: 28, backgroundColor: C.coral },
  card: {
    flexShrink: 1,
    backgroundColor: C.paper,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: C.ink,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: C.yellow,
    borderBottomWidth: 3,
    borderBottomColor: C.ink,
  },
  title: { fontFamily: F.display, fontSize: 20, color: C.ink },
  subtitle: { fontFamily: F.medium, fontSize: 12.5, color: C.ink, opacity: 0.75, marginTop: 2 },
  body: { padding: 18, flexShrink: 1 },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFE3DE',
    borderWidth: 2.5,
    borderColor: C.red,
    borderRadius: 14,
    padding: 10,
    marginBottom: 14,
  },
  errorText: { flex: 1, fontFamily: F.bold, fontSize: 13, color: C.red },

  preview: {
    backgroundColor: C.cream,
    borderWidth: 2.5,
    borderColor: C.ink,
    borderStyle: 'dashed',
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
    gap: 8,
    transform: [{ rotate: '-0.6deg' }],
  },
  previewCode: {
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
  previewCodeText: { fontFamily: F.bold, fontSize: 13, color: '#FFFFFF' },
  previewName: { fontFamily: F.display, fontSize: 20, lineHeight: 24, color: C.ink },
  previewTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  previewTag: { backgroundColor: C.pink, borderWidth: 2, borderColor: C.ink, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2 },
  previewTagText: { fontFamily: F.bold, fontSize: 11.5, color: C.ink },

  label: { fontFamily: F.bold, fontSize: 13, color: C.ink, marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: C.cream,
    borderTopWidth: 3,
    borderTopColor: C.ink,
  },
});