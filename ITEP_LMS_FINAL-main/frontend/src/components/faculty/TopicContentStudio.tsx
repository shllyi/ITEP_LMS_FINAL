import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Topic, TopicContent } from '@/types/faculty';
import { RichTextEditor } from '@/components/faculty/RichTextEditor';
import { PresentationViewer } from '@/components/presentation/PresentationViewer';
import { Bob, Btn, C, F, Field, IconBtn, IconName, Pop, Toggle } from '@/components/faculty/brand';

interface TopicContentStudioProps {
  topic: Topic;
  subjectId: string;
  token: string | null;
  onSaveContent: (content: TopicContent, newTitle?: string, newStatus?: 'draft' | 'published') => Promise<boolean>;
  onUploadPresentation: (topicId: string, file: File) => Promise<{ s3Key: string; publicUrl: string; fileName: string; fileSize: number; extractedText?: string } | null>;
  onGenerateSummary?: (richText: string, presentationText: string) => Promise<string | null>;
}

type TabType = 'text' | 'presentation' | 'summary';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Tab pill that rises when selected. */
function TabPill({ label, icon, active, onPress }: { label: string; icon: IconName; active: boolean; onPress: () => void }) {
  const v = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(v, { toValue: active ? 1 : 0, friction: 6, tension: 160, useNativeDriver: true }).start();
  }, [active, v]);
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress}>
      <Animated.View
        style={[
          st.tab,
          active && st.tabActive,
          { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }, { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-1deg'] }) }] },
        ]}
      >
        <Ionicons name={icon} size={15} color={C.ink} />
        <Text style={[st.tabText, !active && { color: C.muted }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

function Banner({ icon, tint, title, sub }: { icon: IconName; tint: string; title: string; sub: string }) {
  return (
    <View style={st.banner}>
      <View style={[st.bannerIcon, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={18} color={C.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={st.bannerTitle}>{title}</Text>
        <Text style={st.bannerSub}>{sub}</Text>
      </View>
    </View>
  );
}

export function TopicContentStudio({
  topic,
  subjectId,
  token,
  onSaveContent,
  onUploadPresentation,
  onGenerateSummary,
}: TopicContentStudioProps) {
  const [activeTab, setActiveTab] = useState<TabType>('text');
  const [title, setTitle] = useState(topic.title);
  const [status, setStatus] = useState<'draft' | 'published'>(topic.status || 'draft');

  // Tab 1: Text Content
  const [richText, setRichText] = useState(topic.content?.richText || '');

  // Tab 2: Presentation (AWS S3)
  const [presentationFileName, setPresentationFileName] = useState(topic.content?.presentationFileName || '');
  const [presentationS3Key, setPresentationS3Key] = useState(topic.content?.presentationS3Key || '');
  const [presentationUrl, setPresentationUrl] = useState(topic.content?.presentationUrl || '');
  const [presentationFileSize, setPresentationFileSize] = useState(topic.content?.presentationFileSize || 0);
  const [presentationExtractedText, setPresentationExtractedText] = useState(topic.content?.presentationExtractedText || '');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Tab 3: Summary
  const [summaryText, setSummaryText] = useState(topic.content?.summaryText || '');
  const [summaryBullets, setSummaryBullets] = useState<string[]>(topic.content?.summaryBullets || []);
  const [newBulletText, setNewBulletText] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setTitle(topic.title);
    setStatus(topic.status || 'draft');
    setRichText(topic.content?.richText || '');
    setPresentationFileName(topic.content?.presentationFileName || '');
    setPresentationS3Key(topic.content?.presentationS3Key || '');
    setPresentationUrl(topic.content?.presentationUrl || '');
    setPresentationFileSize(topic.content?.presentationFileSize || 0);
    setPresentationExtractedText(topic.content?.presentationExtractedText || '');
    setSummaryText(topic.content?.summaryText || '');
    setSummaryBullets(topic.content?.summaryBullets || []);
    setUploadMsg('');
    setUploadError('');
  }, [topic.id, topic.status, topic.content?.presentationS3Key]);

  const handleToggleStatus = async () => {
    const nextStatus = status === 'published' ? 'draft' : 'published';
    setStatus(nextStatus);
    await onSaveContent({
      richText,
      presentationS3Key,
      presentationUrl,
      presentationFileName,
      presentationFileSize,
      presentationExtractedText,
      summaryText,
      summaryBullets,
    }, title, nextStatus);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);

    const updatedContent: TopicContent = {
      richText,
      presentationS3Key,
      presentationUrl,
      presentationFileName,
      presentationFileSize,
      presentationExtractedText,
      summaryText,
      summaryBullets,
    };

    const saved = await onSaveContent(updatedContent, title, status);
    setSaving(false);
    setSaveSuccess(saved);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // ─── PRESENTATION UPLOAD HANDLERS ────────────────────────────

  const processFile = async (file: File) => {
    const allowed = ['.pptx', '.ppt', '.pdf'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowed.includes(ext)) {
      setUploadError(`Unsupported file type "${ext}". Allowed: .pptx, .ppt, .pdf`);
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setUploadError('File exceeds the 50 MB size limit.');
      return;
    }

    setUploadError('');
    setIsUploading(true);
    setUploadMsg('Uploading to AWS S3...');

    const result = await onUploadPresentation(topic.id, file);
    if (result) {
      const nextPresentationText = result.extractedText || '';
      setPresentationFileName(result.fileName);
      setPresentationS3Key(result.s3Key);
      setPresentationUrl(result.publicUrl);
      setPresentationFileSize(result.fileSize);
      setPresentationExtractedText(nextPresentationText);

      // Persist the attachment immediately. The upload response only stores the
      // object in S3; this update links its metadata to the LMS topic document.
      const attached = await onSaveContent({
        richText,
        presentationS3Key: result.s3Key,
        presentationUrl: result.publicUrl,
        presentationFileName: result.fileName,
        presentationFileSize: result.fileSize,
        presentationExtractedText: nextPresentationText,
        summaryText,
        summaryBullets,
      }, title, status);
      setUploadMsg(attached
        ? 'Presentation uploaded and attached to this topic.'
        : 'Presentation uploaded, but could not be attached. Please try Save Topic again.');
    } else {
      setUploadError('Upload failed. Check your connection or AWS configuration.');
      setUploadMsg('');
    }
    setIsUploading(false);
  };

  const handleDrop = (e: any) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) processFile(file);
  };

  const handleFilePick = (e: any) => {
    const file = e.target?.files?.[0];
    if (file) processFile(file);
  };

  // ─── SUMMARY HANDLERS ────────────────────────────────────────

  const handleGenerateSummary = async () => {
    if (!richText.trim() && !presentationFileName) {
      setUploadError('Add text content or upload a presentation first before generating a summary.');
      return;
    }
    setIsGeneratingSummary(true);

    if (onGenerateSummary) {
      const generated = await onGenerateSummary(richText, presentationExtractedText);
      if (generated) {
        setSummaryText(generated);
        setIsGeneratingSummary(false);
        return;
      }
    }

    // Generate auto-summary summarizing both text content and presentation inserted
    setTimeout(() => {
      const summaryParts: string[] = [];

      if (presentationFileName) {
        summaryParts.push(
          `Curriculum Presentation: Review the supplementary slide deck "${presentationFileName}" for diagrammatic and visual walkthroughs of this topic.`
        );
      }

      if (richText.trim()) {
        const plainText = richText.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');
        const sentences = plainText
          .split(/[.!?\n]+/)
          .map(s => s.trim())
          .filter(s => s.length > 25);

        const extractedPoints = sentences.slice(0, 5).map(s => s.endsWith('.') ? s : s + '.');
        if (extractedPoints.length > 0) {
          summaryParts.push(...extractedPoints);
        }
      }

      if (presentationExtractedText.trim()) {
        const presentationPoints = presentationExtractedText
          .replace(/\s+/g, ' ')
          .split(/[.!?]+/)
          .map(s => s.trim())
          .filter(s => s.length > 25)
          .slice(0, 5)
          .map(s => `${s}.`);
        summaryParts.push(...presentationPoints);
      }

      const autoGenText = summaryParts.join('\n\n');

      if (autoGenText) {
        setSummaryText(prev => {
          const prefix = prev ? prev + '\n\n--- Auto-Generated Summary ---\n' : '';
          return prefix + autoGenText;
        });

        if (summaryBullets.length === 0) {
          const bullets = summaryParts
            .map(p => p.replace(/\n+/g, ' ').trim())
            .filter(Boolean)
            .slice(0, 4);
          setSummaryBullets(bullets);
        }
      }
      setIsGeneratingSummary(false);
    }, 700);
  };

  const addBullet = () => {
    if (!newBulletText.trim()) return;
    setSummaryBullets([...summaryBullets, newBulletText.trim()]);
    setNewBulletText('');
  };

  const removeBullet = (index: number) => {
    setSummaryBullets(summaryBullets.filter((_, i) => i !== index));
  };

  const TABS: { id: TabType; label: string; icon: IconName }[] = [
    { id: 'text', label: 'Lesson text', icon: 'create' },
    { id: 'presentation', label: 'Slides', icon: 'easel' },
    { id: 'summary', label: 'Summary', icon: 'sparkles' },
  ];

  const wordCount = richText.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  const isPdf = presentationFileName?.toLowerCase().endsWith('.pdf');

  return (
    <View style={st.card}>
      {/* Top Header */}
      <View style={st.header}>
        <View style={st.titleRow}>
          <Field
            containerStyle={{ flex: 1, minWidth: 200 }}
            style={{ fontFamily: F.bold, fontSize: 17 }}
            value={title}
            onChangeText={setTitle}
            placeholder="Topic title"
          />
          <View style={[st.statusBox, status === 'published' && { backgroundColor: '#D6F5E6' }]}>
            <Ionicons name={status === 'published' ? 'rocket' : 'pencil'} size={15} color={C.ink} />
            <Toggle value={status === 'published'} onChange={handleToggleStatus} onLabel="Live" offLabel="Draft" />
          </View>
        </View>

        <View style={st.tabRow}>
          {TABS.map(tab => (
            <TabPill key={tab.id} label={tab.label} icon={tab.icon} active={activeTab === tab.id} onPress={() => setActiveTab(tab.id)} />
          ))}
        </View>
      </View>

      {/* Main Tab Body */}
      <View style={st.body}>
        {/* ── TAB 1: TEXT CONTENT ────────────────────────────── */}
        {activeTab === 'text' && (
          <Pop key="text" from={10}>
            <Banner icon="create" tint={C.cream} title="Lesson text" sub="Write the explanation, steps and examples students will read." />
            <RichTextEditor value={richText} onChange={setRichText} placeholder="Start writing the lesson..." />
            <View style={st.countRow}>
              <View style={st.countChip}>
                <Ionicons name="text" size={12} color={C.ink} />
                <Text style={st.countText}>
                  {wordCount} {wordCount === 1 ? 'word' : 'words'}
                </Text>
              </View>
            </View>
          </Pop>
        )}

        {/* ── TAB 2: PRESENTATION (AWS S3) ───────────────────── */}
        {activeTab === 'presentation' && (
          <Pop key="presentation" from={10}>
            <Banner icon="easel" tint={C.pink} title="Slides" sub="Upload a .pptx, .ppt or .pdf, up to 50 MB. Files are stored on Amazon S3." />

            {uploadError ? (
              <View style={st.errorBanner}>
                <Ionicons name="alert-circle" size={18} color={C.red} />
                <Text style={st.errorText}>{uploadError}</Text>
              </View>
            ) : null}

            {presentationS3Key ? (
              <>
                {/* ─ Attached File Card ─ */}
                <View style={st.fileCard}>
                  <View style={[st.fileBadge, { backgroundColor: isPdf ? C.coral : C.blue }]}>
                    <Ionicons name="document-text" size={18} color="#FFFFFF" />
                    <Text style={st.fileBadgeText}>{isPdf ? 'PDF' : 'PPT'}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 180 }}>
                    <Text style={st.fileName} numberOfLines={2}>{presentationFileName}</Text>
                    <Text style={st.fileKey} numberOfLines={1}>S3 key: {presentationS3Key}</Text>
                    <Text style={st.fileUrl} numberOfLines={1}>{presentationUrl}</Text>
                    <View style={st.fileMeta}>
                      <View style={st.storedPill}>
                        <Ionicons name="lock-closed" size={11} color="#FFFFFF" />
                        <Text style={st.storedText}>Stored on S3, AES-256</Text>
                      </View>
                      {presentationFileSize > 0 && (
                        <View style={st.sizePill}>
                          <Text style={st.sizeText}>{formatFileSize(presentationFileSize)}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Btn
                    size="sm"
                    tone="paper"
                    icon="swap-horizontal"
                    title="Replace file"
                    onPress={() => {
                      setPresentationS3Key('');
                      setPresentationUrl('');
                      setPresentationFileName('');
                      setPresentationFileSize(0);
                      setPresentationExtractedText('');
                      setUploadMsg('');
                      onSaveContent({
                        richText,
                        presentationS3Key: '',
                        presentationUrl: '',
                        presentationFileName: '',
                        presentationFileSize: 0,
                        presentationExtractedText: '',
                        summaryText,
                        summaryBullets,
                      }, title, status);
                    }}
                  />
                </View>

                {/* Live Embedded Slide Presentation Viewer */}
                {presentationUrl ? (
                  <View style={{ marginTop: 18 }}>
                    <View style={st.previewHead}>
                      <Ionicons name="play-circle" size={20} color={C.coralDeep} />
                      <Text style={st.previewTitle}>Preview and presenter mode</Text>
                    </View>
                    <View style={st.viewerFrame}>
                      <PresentationViewer
                        url={presentationUrl}
                        fileName={presentationFileName || `${title}.pptx`}
                        fileSize={presentationFileSize}
                        s3Key={presentationS3Key}
                        minHeight={500}
                      />
                    </View>
                  </View>
                ) : null}
              </>
            ) : (
              /* ─ Drag & Drop Upload Zone ─ */
              Platform.OS === 'web' ? (
                <View
                  style={[st.dropzone, isDragOver && st.dropzoneActive]}
                  // @ts-ignore web-only props
                  onDragOver={(e: any) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                >
                  <Bob active={isDragOver}>
                    <View style={[st.dropIcon, isDragOver && { backgroundColor: C.yellow }]}>
                      <Ionicons name={isUploading ? 'sync' : 'cloud-upload'} size={30} color={C.ink} />
                    </View>
                  </Bob>
                  <Text style={st.dropTitle}>
                    {isUploading ? 'Sending to AWS S3...' : isDragOver ? 'Let go to upload' : 'Drop your slides here'}
                  </Text>
                  <Text style={st.dropSub}>.pptx, .ppt or .pdf, up to 50 MB</Text>

                  {!isUploading && (
                    <>
                      <View style={st.orRow}>
                        <View style={st.orLine} />
                        <Text style={st.orText}>or</Text>
                        <View style={st.orLine} />
                      </View>
                      <Btn size="sm" tone="blue" icon="folder-open" title="Browse files" onPress={() => fileInputRef.current?.click()} />
                      {/* @ts-ignore hidden input for web */}
                      <input
                        ref={fileInputRef as any}
                        type="file"
                        accept=".pptx,.ppt,.pdf"
                        style={{ display: 'none' }}
                        onChange={handleFilePick}
                      />
                    </>
                  )}

                  {uploadMsg ? <Text style={st.uploadMsg}>{uploadMsg}</Text> : null}
                </View>
              ) : (
                /* Native fallback */
                <View style={st.dropzone}>
                  <Ionicons name="desktop-outline" size={28} color={C.ink} />
                  <Text style={st.dropTitle}>Upload from a browser</Text>
                  <Text style={st.dropSub}>Open this dashboard in a web browser to upload slides.</Text>
                </View>
              )
            )}
          </Pop>
        )}

        {/* ── TAB 3: SUMMARY ──────────────────────────────────── */}
        {activeTab === 'summary' && (
          <Pop key="summary" from={10}>
            <Banner icon="sparkles" tint={C.yellow} title="Summary" sub="Write one yourself, or draft it from the lesson and slides." />

            <View style={st.panel}>
              <View style={st.panelHead}>
                <Text style={st.panelTitle}>Lesson summary</Text>
                <Btn
                  size="sm"
                  tone="blue"
                  icon="sparkles"
                  title={isGeneratingSummary ? 'Drafting...' : 'Draft from content'}
                  disabled={isGeneratingSummary}
                  onPress={handleGenerateSummary}
                />
              </View>
              <Text style={st.panelHint}>Edit the draft freely with the same formatting tools.</Text>
              <RichTextEditor value={summaryText} onChange={setSummaryText} placeholder="Write or draft a lesson summary..." minHeight={150} />
            </View>

            <View style={st.panel}>
              <Text style={st.panelTitle}>Key takeaways</Text>
              <Text style={st.panelHint}>Short points students should remember from this topic.</Text>

              <View style={{ marginBottom: 12, gap: 8 }}>
                {summaryBullets.length === 0 ? (
                  <Text style={st.emptyBullets}>No takeaways yet. Add the first one below.</Text>
                ) : (
                  summaryBullets.map((b, idx) => (
                    <Pop key={`${idx}-${b}`} from={8}>
                      <View style={st.bulletRow}>
                        <View style={st.bulletDot} />
                        <Text style={st.bulletText}>{b}</Text>
                        <IconBtn icon="close" size={26} label="Remove takeaway" onPress={() => removeBullet(idx)} />
                      </View>
                    </Pop>
                  ))
                )}
              </View>

              <View style={st.addRow}>
                <Field
                  containerStyle={{ flex: 1 }}
                  placeholder="Type a takeaway..."
                  value={newBulletText}
                  onChangeText={setNewBulletText}
                  onSubmitEditing={addBullet}
                  returnKeyType="done"
                />
                <Btn size="sm" tone="yellow" icon="add" title="Add" onPress={addBullet} />
              </View>
            </View>
          </Pop>
        )}
      </View>

      {/* Save Action Bar */}
      <View style={st.footer}>
        <View style={{ flex: 1 }}>
          {saveSuccess ? (
            <Pop from={6}>
              <View style={st.savedNote}>
                <Ionicons name="checkmark-circle" size={18} color={C.greenDeep} />
                <Text style={st.savedText}>All changes saved.</Text>
              </View>
            </Pop>
          ) : null}
        </View>
        <Btn
          title={saving ? 'Saving...' : saveSuccess ? 'Saved' : 'Save topic'}
          tone={saveSuccess ? 'green' : 'coral'}
          icon={saveSuccess ? 'checkmark' : 'save'}
          loading={saving}
          onPress={handleSave}
        />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: C.paper, borderRadius: 24, borderWidth: 3, borderColor: C.ink, overflow: 'hidden' },
  header: { backgroundColor: C.cream, borderBottomWidth: 3, borderBottomColor: C.ink, paddingTop: 26, paddingHorizontal: 16, paddingBottom: 14 },
  titleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 14 },
  statusBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.yellow, borderWidth: 2.5, borderColor: C.ink, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 },
  tabRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 38, borderRadius: 19, borderWidth: 2.5, borderColor: 'transparent' },
  tabActive: { backgroundColor: C.yellow, borderColor: C.ink },
  tabText: { fontFamily: F.bold, fontSize: 13.5, color: C.ink },

  body: { padding: 16, minHeight: 280 },

  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  bannerIcon: { width: 40, height: 40, borderRadius: 20, borderWidth: 2.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  bannerTitle: { fontFamily: F.display, fontSize: 17, color: C.ink },
  bannerSub: { fontFamily: F.medium, fontSize: 12.5, color: C.muted, marginTop: 1 },

  countRow: { alignItems: 'flex-end', marginTop: 10 },
  countChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.cream, borderWidth: 2, borderColor: C.ink, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  countText: { fontFamily: F.bold, fontSize: 11.5, color: C.ink },

  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFE3DE', borderWidth: 2.5, borderColor: C.red, borderRadius: 14, padding: 10, marginBottom: 12 },
  errorText: { flex: 1, fontFamily: F.bold, fontSize: 13, color: C.red },

  dropzone: { alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 230, padding: 28, borderRadius: 22, borderWidth: 3, borderColor: C.ink, borderStyle: 'dashed', backgroundColor: C.cream },
  dropzoneActive: { backgroundColor: C.pink, borderColor: C.coralDeep },
  dropIcon: { width: 64, height: 64, borderRadius: 32, borderWidth: 2.5, borderColor: C.ink, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center' },
  dropTitle: { fontFamily: F.display, fontSize: 18, color: C.ink, marginTop: 8, textAlign: 'center' },
  dropSub: { fontFamily: F.medium, fontSize: 12.5, color: C.muted, textAlign: 'center' },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 10, width: 180 },
  orLine: { flex: 1, height: 2.5, borderRadius: 2, backgroundColor: C.ink, opacity: 0.2 },
  orText: { fontFamily: F.bold, fontSize: 12, color: C.muted },
  uploadMsg: { fontFamily: F.bold, fontSize: 13, color: C.greenDeep, marginTop: 10, textAlign: 'center' },

  fileCard: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 14, backgroundColor: C.cream, borderWidth: 3, borderColor: C.ink, borderRadius: 20, padding: 14 },
  fileBadge: { width: 56, height: 56, borderRadius: 16, borderWidth: 2.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  fileBadgeText: { fontFamily: F.display, fontSize: 11, color: '#FFFFFF' },
  fileName: { fontFamily: F.bold, fontSize: 15, color: C.ink },
  fileKey: { fontFamily: F.medium, fontSize: 11, color: C.muted, marginTop: 3 },
  fileUrl: { fontFamily: F.medium, fontSize: 11, color: C.muted, marginTop: 1 },
  fileMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 8 },
  storedPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.green, borderWidth: 2, borderColor: C.ink, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2 },
  storedText: { fontFamily: F.bold, fontSize: 11, color: '#FFFFFF' },
  sizePill: { backgroundColor: C.paper, borderWidth: 2, borderColor: C.ink, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2 },
  sizeText: { fontFamily: F.bold, fontSize: 11, color: C.ink },
  previewHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  previewTitle: { fontFamily: F.bold, fontSize: 14, color: C.ink },
  viewerFrame: { borderWidth: 3, borderColor: C.ink, borderRadius: 20, overflow: 'hidden' },

  panel: { backgroundColor: C.cream, borderWidth: 2.5, borderColor: C.ink, borderRadius: 20, padding: 14, marginBottom: 18 },
  panelHead: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  panelTitle: { fontFamily: F.display, fontSize: 16, color: C.ink },
  panelHint: { fontFamily: F.medium, fontSize: 12.5, color: C.muted, marginTop: 2, marginBottom: 12 },
  emptyBullets: { fontFamily: F.medium, fontSize: 13, color: C.muted, paddingVertical: 4 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.paper, borderWidth: 2.5, borderColor: C.ink, borderRadius: 14, paddingVertical: 8, paddingLeft: 12, paddingRight: 8 },
  bulletDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: C.coral, borderWidth: 2, borderColor: C.ink },
  bulletText: { flex: 1, fontFamily: F.medium, fontSize: 13.5, color: C.ink, lineHeight: 19 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.cream, borderTopWidth: 3, borderTopColor: C.ink },
  savedNote: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  savedText: { fontFamily: F.bold, fontSize: 13, color: C.greenDeep },
});