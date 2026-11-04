import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Animated,
  Easing,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Subject, Module } from '@/types/faculty';

interface CourseNavigatorProps {
  subjects: Subject[];
  activeSubject: Subject | null;
  onSelectSubject: (subject: Subject) => void;
  activeTopicId: string | null;
  onSelectTopic: (moduleId: string, topicId: string) => void;
  onAddModule: (subjectId: string, title: string) => Promise<void>;
  onUpdateModule: (subjectId: string, moduleId: string, title: string) => Promise<void>;
  onDeleteModule: (subjectId: string, moduleId: string) => Promise<void>;
  onAddTopic: (subjectId: string, moduleId: string, title: string) => Promise<void>;
  onDeleteTopic: (subjectId: string, moduleId: string, topicId: string) => Promise<void>;
  onOpenSubjectModal: () => void;
  onOpenEditSubjectModal: () => void;
  onDeleteSubject: (subjectId: string) => Promise<void>;
}

const C = {
  bg: '#FDE680',
  yellow: '#FFE97F',
  coral: '#FF6B81',
  coralDeep: '#D94D63',
  pink: '#FFD1D4',
  pinkDeep: '#E8A9AE',
  cream: '#FFF5BA',
  red: '#D4381C',
  blue: '#00A3EB',
  blueDeep: '#0079AD',
  ink: '#4A1A24',
  muted: '#8F5F68',
  paper: '#FFFBF0',
  green: '#2FB57A',
};
const F = {
  body: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  bold: 'Outfit_700Bold',
  display: 'TitanOne_400Regular',
};
const MODULE_ACCENTS = [C.blue, C.coral, C.cream, C.pink];
const MODULE_FG = ['#FFFFFF', C.cream, C.ink, C.ink];

/* ------------------------------------------------------------------ */
/*  Small animated pieces                                              */
/* ------------------------------------------------------------------ */
function Pop({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: any }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(v, { toValue: 1, delay, friction: 7, tension: 110, useNativeDriver: true }).start();
  }, [delay, v]);
  return (
    <Animated.View
      style={[
        style,
        { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] },
      ]}
    >
      {children}
    </Animated.View>
  );
}

function Chev({ open, color }: { open: boolean; color: string }) {
  const v = useRef(new Animated.Value(open ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(v, { toValue: open ? 1 : 0, friction: 6, tension: 140, useNativeDriver: true }).start();
  }, [open, v]);
  return (
    <Animated.View style={{ transform: [{ rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}>
      <Ionicons name="chevron-down" size={18} color={color} />
    </Animated.View>
  );
}

/** Key-style button that sinks when pressed. */
function Chunky({
  children,
  onPress,
  face,
  shadow,
  radius = 14,
  depth = 4,
  faceStyle,
  disabled,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  face: string;
  shadow: string;
  radius?: number;
  depth?: number;
  faceStyle?: any;
  disabled?: boolean;
  style?: any;
}) {
  const p = useRef(new Animated.Value(0)).current;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => Animated.timing(p, { toValue: 1, duration: 70, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(p, { toValue: 0, friction: 5, useNativeDriver: true }).start()}
      style={[{ paddingBottom: depth, opacity: disabled ? 0.5 : 1 }, style]}
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
            transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, depth] }) }],
          },
          faceStyle,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

function DialogBtn({
  label,
  onPress,
  tone,
  loading,
}: {
  label: string;
  onPress: () => void;
  tone: 'paper' | 'coral' | 'red';
  loading?: boolean;
}) {
  const t = {
    paper: { face: C.paper, shadow: C.pinkDeep, text: C.ink },
    coral: { face: C.coral, shadow: C.coralDeep, text: C.cream },
    red: { face: C.red, shadow: '#8E2410', text: '#FFFFFF' },
  }[tone];
  return (
    <Chunky face={t.face} shadow={t.shadow} onPress={onPress} disabled={loading} faceStyle={s.dialogBtnFace}>
      {loading ? <ActivityIndicator color={t.text} /> : <Text style={[s.dialogBtnText, { color: t.text }]}>{label}</Text>}
    </Chunky>
  );
}

/** Modal whose card springs in. */
function Dialog({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      v.setValue(0);
      Animated.spring(v, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }).start();
    }
  }, [visible, v]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <Animated.View
          style={[
            s.dialogWrap,
            {
              opacity: v,
              transform: [
                { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
                { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['-2deg', '0deg'] }) },
              ],
            },
          ]}
        >
          <View style={s.dialogShadow} />
          <View style={s.dialogCard}>{children}</View>
        </Animated.View>
      </View>
    </Modal>
  );
}

/** Topic row: slides on hover, sinks on press. */
function TopicRow({
  title,
  active,
  published,
  onSelect,
  onDelete,
}: {
  title: string;
  active: boolean;
  published: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const h = useRef(new Animated.Value(0)).current;
  const to = (x: number) => Animated.spring(h, { toValue: x, friction: 6, tension: 140, useNativeDriver: true }).start();
  return (
    <Animated.View
      style={{
        transform: [
          { translateX: h.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 4, 1] }) },
          { scale: h.interpolate({ inputRange: [0, 1, 2], outputRange: [1, 1.01, 0.98] }) },
        ],
      }}
    >
      <View style={[s.topicRow, active && s.topicRowActive]}>
        <Pressable
          style={s.topicSelect}
          onPress={onSelect}
          onPressIn={() => to(2)}
          onPressOut={() => to(0)}
          {...({ onHoverIn: () => to(1), onHoverOut: () => to(0) } as any)}
        >
          <View style={[s.topicDot, published && { backgroundColor: C.green }, active && !published && { backgroundColor: C.coral }]}>
            <Ionicons name={published ? 'checkmark' : active ? 'create' : 'ellipse-outline'} size={11} color={published || active ? '#FFFFFF' : C.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.topicTitle, active && { fontFamily: F.bold }]} numberOfLines={2}>
              {title}
            </Text>
            <Text style={s.topicMeta}>{published ? 'Published' : 'Draft'}</Text>
          </View>
        </Pressable>
        <Pressable onPress={onDelete} style={s.topicDelete} accessibilityLabel="Delete topic">
          <Ionicons name="close" size={15} color={C.muted} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/*  Navigator                                                          */
/* ------------------------------------------------------------------ */
export function CourseNavigator({
  subjects,
  activeSubject,
  onSelectSubject,
  activeTopicId,
  onSelectTopic,
  onAddModule,
  onUpdateModule,
  onDeleteModule,
  onAddTopic,
  onDeleteTopic,
  onOpenSubjectModal,
  onOpenEditSubjectModal,
  onDeleteSubject,
}: CourseNavigatorProps) {
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  // Module Modal state
  const [moduleModalVisible, setModuleModalVisible] = useState(false);
  const [moduleModalMode, setModuleModalMode] = useState<'create' | 'edit'>('create');
  const [targetModuleId, setTargetModuleId] = useState<string | null>(null);
  const [moduleTitleInput, setModuleTitleInput] = useState('');

  // Topic Modal state
  const [topicModalVisible, setTopicModalVisible] = useState(false);
  const [targetParentModuleId, setTargetParentModuleId] = useState<string | null>(null);
  const [topicTitleInput, setTopicTitleInput] = useState('');

  // Delete Confirm Modal
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'subject' | 'module' | 'topic';
    id: string;
    secondaryId?: string;
    title: string;
  } | null>(null);

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !(prev[moduleId] ?? true),
    }));
  };

  const handleOpenAddModule = () => {
    setModuleModalMode('create');
    setTargetModuleId(null);
    setModuleTitleInput(`Module ${(activeSubject?.modules?.length || 0) + 1}: `);
    setModuleModalVisible(true);
  };

  const handleOpenEditModule = (mod: Module) => {
    setModuleModalMode('edit');
    setTargetModuleId(mod.id);
    setModuleTitleInput(mod.title);
    setModuleModalVisible(true);
  };

  const handleSaveModule = async () => {
    if (!activeSubject || !moduleTitleInput.trim()) return;
    if (moduleModalMode === 'create') {
      await onAddModule(activeSubject._id, moduleTitleInput.trim());
    } else if (targetModuleId) {
      await onUpdateModule(activeSubject._id, targetModuleId, moduleTitleInput.trim());
    }
    setModuleModalVisible(false);
  };

  const handleOpenAddTopic = (moduleId: string) => {
    setTargetParentModuleId(moduleId);
    setTopicTitleInput('Topic: ');
    setTopicModalVisible(true);
  };

  const handleSaveTopic = async () => {
    if (!activeSubject || !targetParentModuleId || !topicTitleInput.trim()) return;
    await onAddTopic(activeSubject._id, targetParentModuleId, topicTitleInput.trim());
    setTopicModalVisible(false);
  };

  const executeDelete = async () => {
    if (!deleteTarget || !activeSubject) return;
    if (deleteTarget.type === 'subject') {
      await onDeleteSubject(deleteTarget.id);
    } else if (deleteTarget.type === 'module') {
      await onDeleteModule(activeSubject._id, deleteTarget.id);
    } else if (deleteTarget.type === 'topic' && deleteTarget.secondaryId) {
      await onDeleteTopic(activeSubject._id, deleteTarget.secondaryId, deleteTarget.id);
    }
    setDeleteConfirmVisible(false);
    setDeleteTarget(null);
  };

  const askDelete = (target: NonNullable<typeof deleteTarget>) => {
    setDeleteTarget(target);
    setDeleteConfirmVisible(true);
  };

  const filteredModules = (activeSubject?.modules || []).map(mod => {
    if (!searchQuery.trim()) return mod;
    const query = searchQuery.toLowerCase();
    const matchesModule = mod.title.toLowerCase().includes(query);
    const matchedTopics = mod.topics.filter(t => t.title.toLowerCase().includes(query));
    if (matchesModule || matchedTopics.length > 0) {
      return {
        ...mod,
        topics: matchesModule ? mod.topics : matchedTopics,
      };
    }
    return null;
  }).filter(Boolean) as Module[];

  const totalTopics = (activeSubject?.modules || []).reduce((n, m) => n + m.topics.length, 0);

  return (
    <View style={s.container}>
      {/* Subject card */}
      <View style={s.subjectCard}>
        <View style={s.subjectTopRow}>
          <Text style={s.navLabel}>Course hierarchy</Text>
          <View style={s.subjActions}>
            <Pressable onPress={onOpenSubjectModal} style={s.chip} accessibilityRole="button">
              <Ionicons name="add" size={12} color={C.ink} />
              <Text style={s.chipText}>New</Text>
            </Pressable>
            {activeSubject && (
              <>
                <Pressable onPress={onOpenEditSubjectModal} style={s.chip} accessibilityRole="button">
                  <Ionicons name="pencil" size={11} color={C.ink} />
                  <Text style={s.chipText}>Edit</Text>
                </Pressable>
                <Pressable
                  onPress={() => askDelete({ type: 'subject', id: activeSubject._id, title: activeSubject.name })}
                  style={[s.chip, { backgroundColor: C.pink }]}
                  accessibilityRole="button"
                  accessibilityLabel="Delete subject"
                >
                  <Ionicons name="trash" size={11} color={C.red} />
                </Pressable>
              </>
            )}
          </View>
        </View>

        <Chunky
          face={C.paper}
          shadow={C.pinkDeep}
          radius={16}
          depth={4}
          onPress={() => setShowSubjectPicker(!showSubjectPicker)}
          faceStyle={s.subjectSelector}
        >
          <View style={s.subjectBadge}>
            <Text style={s.subjectBadgeText}>{activeSubject?.code || 'N/A'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.subjectTitle} numberOfLines={1}>
              {activeSubject?.name || 'No subject created'}
            </Text>
            <Text style={s.subjectMeta} numberOfLines={1}>
              {activeSubject
                ? `${activeSubject.academicYear} · ${activeSubject.semester} · ${activeSubject.yearLevel}`
                : 'Tap New to create one'}
            </Text>
          </View>
          <Chev open={showSubjectPicker} color={C.ink} />
        </Chunky>

        {showSubjectPicker && (
          <Pop style={s.pickerDropdown}>
            {subjects.length === 0 ? (
              <View style={{ padding: 12, alignItems: 'center' }}>
                <Text style={s.pickerEmptyText}>No subjects available.</Text>
              </View>
            ) : (
              subjects.map((sub, i) => {
                const on = sub._id === activeSubject?._id;
                return (
                  <Pressable
                    key={sub._id}
                    style={[s.pickerItem, on && { backgroundColor: C.cream }, i === subjects.length - 1 && { borderBottomWidth: 0 }]}
                    onPress={() => {
                      onSelectSubject(sub);
                      setShowSubjectPicker(false);
                    }}
                  >
                    <View style={[s.pickerCode, on && { backgroundColor: C.coral }]}>
                      <Text style={[s.pickerCodeText, on && { color: C.cream }]}>{sub.code}</Text>
                    </View>
                    <Text style={s.pickerName} numberOfLines={1}>{sub.name}</Text>
                    {on ? <Ionicons name="checkmark-circle" size={16} color={C.green} /> : null}
                  </Pressable>
                );
              })
            )}
          </Pop>
        )}
      </View>

      {/* Search */}
      <View style={[s.searchBox, searchFocused && { borderColor: C.blue }]}>
        <Ionicons name="search" size={15} color={C.muted} />
        <TextInput
          style={s.searchInput}
          placeholder="Filter modules & topics"
          placeholderTextColor={C.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
        {searchQuery ? (
          <Pressable onPress={() => setSearchQuery('')} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={17} color={C.muted} />
          </Pressable>
        ) : null}
      </View>

      {/* Tree */}
      <ScrollView style={s.treeScroll} contentContainerStyle={{ padding: 12, paddingTop: 6, gap: 12 }} showsVerticalScrollIndicator={false}>
        <View style={s.treeHeader}>
          <Text style={s.treeHeaderTitle}>Curriculum</Text>
          <View style={s.countPill}>
            <Text style={s.countPillText}>
              {activeSubject?.modules.length || 0} modules · {totalTopics} topics
            </Text>
          </View>
        </View>

        {activeSubject && activeSubject.modules.length === 0 ? (
          <Pop style={s.emptyNavigator}>
            <View style={s.emptyIcon}>
              <Ionicons name="albums-outline" size={24} color={C.ink} />
            </View>
            <Text style={s.emptyNavTitle}>No modules yet</Text>
            <Text style={s.emptyNavSub}>Add your first module to start structuring course topics.</Text>
            <View style={{ marginTop: 14 }}>
              <Chunky
                face={C.blue}
                shadow={C.blueDeep}
                onPress={handleOpenAddModule}
                faceStyle={s.primaryFace}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={[s.primaryText, { color: '#FFFFFF' }]}>Add module</Text>
              </Chunky>
            </View>
          </Pop>
        ) : filteredModules.length === 0 && searchQuery ? (
          <View style={s.emptyNavigator}>
            <Text style={s.emptyNavTitle}>Nothing matches</Text>
            <Text style={s.emptyNavSub}>Try a different word.</Text>
          </View>
        ) : (
          filteredModules.map((moduleItem, modIdx) => {
            const isExpanded = expandedModules[moduleItem.id] ?? true;
            const face = MODULE_ACCENTS[modIdx % MODULE_ACCENTS.length];
            const fg = MODULE_FG[modIdx % MODULE_FG.length];
            const published = moduleItem.topics.filter(t => t.status === 'published').length;

            return (
              <Pop key={moduleItem.id} delay={modIdx * 60} style={s.moduleBlock}>
                <View style={[s.moduleHeader, { backgroundColor: face }]}>
                  <Pressable style={s.moduleHeaderClick} onPress={() => toggleModule(moduleItem.id)}>
                    <View style={s.modNum}>
                      <Text style={s.modNumText}>{modIdx + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.moduleTitle, { color: fg }]} numberOfLines={2}>
                        {moduleItem.title}
                      </Text>
                      <Text style={[s.moduleCount, { color: fg }]}>
                        {published} of {moduleItem.topics.length} published
                      </Text>
                    </View>
                    <Chev open={isExpanded} color={fg} />
                  </Pressable>
                  <View style={s.moduleTools}>
                    <Pressable style={s.toolBtn} onPress={() => handleOpenEditModule(moduleItem)} accessibilityLabel="Rename module">
                      <Ionicons name="pencil" size={12} color={C.ink} />
                    </Pressable>
                    <Pressable
                      style={s.toolBtn}
                      onPress={() => askDelete({ type: 'module', id: moduleItem.id, title: moduleItem.title })}
                      accessibilityLabel="Delete module"
                    >
                      <Ionicons name="trash" size={12} color={C.red} />
                    </Pressable>
                  </View>
                </View>

                {isExpanded && (
                  <View style={s.topicsList}>
                    {moduleItem.topics.length === 0 ? (
                      <Text style={s.emptyTopicText}>No topics in this module.</Text>
                    ) : (
                      moduleItem.topics.map(topic => (
                        <TopicRow
                          key={topic.id}
                          title={topic.title}
                          active={topic.id === activeTopicId}
                          published={topic.status === 'published'}
                          onSelect={() => onSelectTopic(moduleItem.id, topic.id)}
                          onDelete={() =>
                            askDelete({ type: 'topic', id: topic.id, secondaryId: moduleItem.id, title: topic.title })
                          }
                        />
                      ))
                    )}
                    <Pressable style={s.addTopicInline} onPress={() => handleOpenAddTopic(moduleItem.id)}>
                      <View style={s.addTopicPlus}>
                        <Ionicons name="add" size={13} color={C.ink} />
                      </View>
                      <Text style={s.addTopicText}>Add topic</Text>
                    </Pressable>
                  </View>
                )}
              </Pop>
            );
          })
        )}

        {activeSubject && activeSubject.modules.length > 0 && (
          <Chunky face={C.paper} shadow={C.pinkDeep} onPress={handleOpenAddModule} faceStyle={s.primaryFace} style={{ marginBottom: 20 }}>
            <Ionicons name="add-circle" size={17} color={C.ink} />
            <Text style={[s.primaryText, { color: C.ink }]}>Add module</Text>
          </Chunky>
        )}
      </ScrollView>

      {/* MODULE NAME MODAL */}
      <Dialog visible={moduleModalVisible} onClose={() => setModuleModalVisible(false)}>
        <Text style={s.dialogTitle}>{moduleModalMode === 'create' ? 'Name new module' : 'Rename module'}</Text>
        <Text style={s.dialogSub}>Use the formal module title from your syllabus sequence.</Text>
        <TextInput
          style={s.dialogInput}
          value={moduleTitleInput}
          onChangeText={setModuleTitleInput}
          placeholder="e.g., Module 01: Systems & Networks"
          placeholderTextColor={C.muted}
          autoFocus
        />
        <View style={s.dialogActions}>
          <DialogBtn label="Cancel" tone="paper" onPress={() => setModuleModalVisible(false)} />
          <DialogBtn label={moduleModalMode === 'create' ? 'Create module' : 'Save title'} tone="coral" onPress={handleSaveModule} />
        </View>
      </Dialog>

      {/* TOPIC NAME MODAL */}
      <Dialog visible={topicModalVisible} onClose={() => setTopicModalVisible(false)}>
        <Text style={s.dialogTitle}>Name new topic</Text>
        <Text style={s.dialogSub}>Give this instructional unit a clear title.</Text>
        <TextInput
          style={s.dialogInput}
          value={topicTitleInput}
          onChangeText={setTopicTitleInput}
          placeholder="e.g., Topic 1.1: Foundations of Cybersecurity"
          placeholderTextColor={C.muted}
          autoFocus
        />
        <View style={s.dialogActions}>
          <DialogBtn label="Cancel" tone="paper" onPress={() => setTopicModalVisible(false)} />
          <DialogBtn label="Create topic" tone="coral" onPress={handleSaveTopic} />
        </View>
      </Dialog>

      {/* DELETE CONFIRMATION MODAL */}
      <Dialog visible={deleteConfirmVisible} onClose={() => setDeleteConfirmVisible(false)}>
        <View style={s.warnIcon}>
          <Ionicons name="warning" size={22} color="#FFFFFF" />
        </View>
        <Text style={[s.dialogTitle, { color: C.red }]}>Delete this {deleteTarget?.type}?</Text>
        <Text style={s.dialogSub}>
          “{deleteTarget?.title}” and everything nested inside it will be permanently removed.
        </Text>
        <View style={s.dialogActions}>
          <DialogBtn label="Keep it" tone="paper" onPress={() => setDeleteConfirmVisible(false)} />
          <DialogBtn label="Delete" tone="red" onPress={executeDelete} />
        </View>
      </Dialog>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    width: 320,
    backgroundColor: C.bg,
    borderRightWidth: 3,
    borderRightColor: C.ink,
    flexDirection: 'column',
    height: '100%',
  },

  // subject card
  subjectCard: { padding: 14, paddingBottom: 10, borderBottomWidth: 3, borderBottomColor: C.ink, backgroundColor: C.cream },
  subjectTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  navLabel: { fontFamily: F.display, fontSize: 14, color: C.ink },
  subjActions: { flexDirection: 'row', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: C.yellow, borderWidth: 2, borderColor: C.ink, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  chipText: { fontFamily: F.bold, fontSize: 11, color: C.ink },
  subjectSelector: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 },
  subjectBadge: { backgroundColor: C.coral, borderWidth: 2, borderColor: C.ink, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, transform: [{ rotate: '-3deg' }] },
  subjectBadgeText: { fontFamily: F.display, fontSize: 12, color: C.cream, letterSpacing: 0.5 },
  subjectTitle: { fontFamily: F.bold, fontSize: 14, color: C.ink },
  subjectMeta: { fontFamily: F.medium, fontSize: 11, color: C.muted, marginTop: 1 },
  pickerDropdown: { backgroundColor: C.paper, borderWidth: 2.5, borderColor: C.ink, borderRadius: 16, marginTop: 6, overflow: 'hidden' },
  pickerEmptyText: { fontFamily: F.medium, fontSize: 12, color: C.muted },
  pickerItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderBottomWidth: 2, borderBottomColor: C.pink },
  pickerCode: { backgroundColor: C.pink, borderWidth: 2, borderColor: C.ink, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  pickerCodeText: { fontFamily: F.bold, fontSize: 11, color: C.ink },
  pickerName: { fontFamily: F.medium, fontSize: 13, color: C.ink, flex: 1 },

  // search
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.paper, marginHorizontal: 12, marginTop: 12, marginBottom: 4, paddingHorizontal: 12, borderRadius: 14, borderWidth: 2.5, borderColor: C.ink, height: 40 },
  searchInput: { flex: 1, fontFamily: F.medium, fontSize: 13, color: C.ink, outlineStyle: 'none' as any },

  // tree
  treeScroll: { flex: 1 },
  treeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  treeHeaderTitle: { fontFamily: F.display, fontSize: 18, color: C.ink },
  countPill: { backgroundColor: C.blue, borderWidth: 2, borderColor: C.ink, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  countPillText: { fontFamily: F.bold, fontSize: 11, color: '#FFFFFF' },
  emptyNavigator: { alignItems: 'center', backgroundColor: C.paper, borderWidth: 3, borderColor: C.ink, borderStyle: 'dashed', borderRadius: 20, padding: 22 },
  emptyIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: C.pink, borderWidth: 2.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyNavTitle: { fontFamily: F.display, fontSize: 16, color: C.ink },
  emptyNavSub: { fontFamily: F.medium, fontSize: 12, lineHeight: 17, color: C.muted, textAlign: 'center', marginTop: 4 },
  primaryFace: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 42, paddingHorizontal: 18 },
  primaryText: { fontFamily: F.display, fontSize: 14, letterSpacing: 0.3 },

  // modules
  moduleBlock: { backgroundColor: C.paper, borderWidth: 2.5, borderColor: C.ink, borderRadius: 18, overflow: 'hidden' },
  moduleHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingLeft: 12, paddingRight: 8, gap: 6 },
  moduleHeaderClick: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  modNum: { width: 28, height: 28, borderRadius: 8, backgroundColor: C.paper, borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  modNumText: { fontFamily: F.display, fontSize: 14, color: C.ink },
  moduleTitle: { fontFamily: F.display, fontSize: 13, lineHeight: 17 },
  moduleCount: { fontFamily: F.medium, fontSize: 11, marginTop: 2, opacity: 0.85 },
  moduleTools: { gap: 4 },
  toolBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.paper, borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },

  // topics
  topicsList: { paddingVertical: 4 },
  emptyTopicText: { fontFamily: F.medium, fontSize: 12, color: C.muted, textAlign: 'center', padding: 10 },
  topicRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingLeft: 10, paddingRight: 6, borderLeftWidth: 5, borderLeftColor: 'transparent' },
  topicRowActive: { backgroundColor: C.cream, borderLeftColor: C.coral },
  topicSelect: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  topicDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.cream, borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  topicTitle: { fontFamily: F.medium, fontSize: 13, lineHeight: 17, color: C.ink },
  topicMeta: { fontFamily: F.body, fontSize: 11, color: C.muted, marginTop: 1 },
  topicDelete: { padding: 6 },
  addTopicInline: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12 },
  addTopicPlus: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.yellow, borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  addTopicText: { fontFamily: F.bold, fontSize: 12, color: C.ink },

  // dialogs
  modalOverlay: { flex: 1, backgroundColor: 'rgba(74,26,36,0.55)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  dialogWrap: { width: '100%', maxWidth: 440 },
  dialogShadow: { position: 'absolute', top: 8, left: 8, right: -8, bottom: -8, borderRadius: 24, backgroundColor: C.coral },
  dialogCard: { backgroundColor: C.paper, borderRadius: 24, borderWidth: 3, borderColor: C.ink, padding: 22 },
  dialogTitle: { fontFamily: F.display, fontSize: 20, color: C.ink },
  dialogSub: { fontFamily: F.medium, fontSize: 13, lineHeight: 19, color: C.muted, marginTop: 4, marginBottom: 16 },
  dialogInput: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2.5, borderColor: C.ink, paddingHorizontal: 14, paddingVertical: 10, fontFamily: F.medium, fontSize: 14, color: C.ink, marginBottom: 18, outlineStyle: 'none' as any },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  dialogBtnFace: { height: 42, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  dialogBtnText: { fontFamily: F.bold, fontSize: 14 },
  warnIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.red, borderWidth: 2.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
});