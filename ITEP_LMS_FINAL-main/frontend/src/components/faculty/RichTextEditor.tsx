import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, Text, View, StyleSheet } from 'react-native';
import { C, F, Field, IconName } from '@/components/faculty/brand';
import { Ionicons } from '@expo/vector-icons';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
}

/** Toolbar key. Keeps the text selection when clicked and shows when its format is on. */
function ToolBtn({
  label,
  icon,
  onPress,
  active,
  title,
  bold,
  italic,
}: {
  label?: string;
  icon?: IconName;
  onPress: () => void;
  active?: boolean;
  title: string;
  bold?: boolean;
  italic?: boolean;
}) {
  const p = useRef(new Animated.Value(0)).current;
  const to = (v: number) => Animated.spring(p, { toValue: v, friction: 6, tension: 240, useNativeDriver: true }).start();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      onPressIn={() => to(1)}
      onPressOut={() => to(0)}
      {...({ onMouseDown: (e: any) => e.preventDefault() } as any)}
    >
      <Animated.View
        style={[
          st.tool,
          active && st.toolActive,
          { transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [1, 0.88] }) }, { rotate: p.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-4deg'] }) }] },
        ]}
      >
        {icon ? (
          <Ionicons name={icon} size={16} color={active ? '#FFFFFF' : C.ink} />
        ) : (
          <Text
            style={[
              st.toolText,
              active && { color: '#FFFFFF' },
              bold && { fontFamily: F.display, fontSize: 15 },
              italic && { fontStyle: 'italic', fontFamily: F.bold, fontSize: 15 },
            ]}
          >
            {label}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

const selectCss: React.CSSProperties = {
  height: 34,
  borderRadius: 10,
  border: `2.5px solid ${C.ink}`,
  backgroundColor: C.paper,
  color: C.ink,
  fontFamily: 'Outfit_700Bold, Arial, sans-serif',
  fontSize: 12,
  paddingLeft: 8,
  paddingRight: 8,
  cursor: 'pointer',
  outline: 'none',
};

const colorCss: React.CSSProperties = {
  width: 38,
  height: 34,
  padding: 0,
  borderRadius: 10,
  border: `2.5px solid ${C.ink}`,
  backgroundColor: C.paper,
  cursor: 'pointer',
};

export function RichTextEditor({ value, onChange, placeholder, minHeight = 220 }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const initialized = useRef(false);
  const selectionRef = useRef<Range | null>(null);
  const [focused, setFocused] = useState(false);
  const [fmt, setFmt] = useState({ bold: false, italic: false });

  useEffect(() => {
    if (Platform.OS === 'web' && editorRef.current && !initialized.current) {
      editorRef.current.innerHTML = value || '';
      initialized.current = true;
    }
  }, [value]);

  if (Platform.OS !== 'web') {
    return (
      <Field
        multiline
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        textAlignVertical="top"
        style={{ minHeight, lineHeight: 21, borderRadius: 16, padding: 14 }}
      />
    );
  }

  const readFormats = () => {
    try {
      setFmt({ bold: document.queryCommandState('bold'), italic: document.queryCommandState('italic') });
    } catch {
      /* some browsers throw when nothing is selected */
    }
  };

  const runCommand = (command: string, commandValue?: string) => {
    editorRef.current?.focus();
    const selection = window.getSelection();
    if (selectionRef.current && selection) {
      selection.removeAllRanges();
      selection.addRange(selectionRef.current);
    }
    document.execCommand(command, false, commandValue);
    onChange(editorRef.current?.innerHTML || '');
    readFormats();
  };

  const saveSelection = () => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || !editorRef.current?.contains(selection.anchorNode)) return;
    selectionRef.current = selection.getRangeAt(0).cloneRange();
    readFormats();
  };

  const editorCss: React.CSSProperties = {
    border: `2.5px solid ${focused ? C.blue : C.ink}`,
    borderRadius: 16,
    padding: 14,
    color: C.ink,
    backgroundColor: focused ? '#FFFFFF' : C.paper,
    outline: 'none',
    lineHeight: 1.6,
    fontFamily: 'Arial, sans-serif',
    fontSize: 14,
    whiteSpace: 'pre-wrap',
    overflowY: 'auto',
    minHeight,
    boxShadow: focused ? `0 4px 0 ${C.blueDeep}` : `0 0 0 ${C.pinkDeep}`,
    transform: focused ? 'translateY(-2px)' : 'translateY(0)',
    transition: 'box-shadow .18s ease, border-color .18s ease, transform .18s ease, background-color .18s ease',
  };

  return (
    <View style={st.wrapper}>
      <View style={st.toolbar}>
        <ToolBtn label="B" bold title="Bold selected text" active={fmt.bold} onPress={() => runCommand('bold')} />
        <ToolBtn label="I" italic title="Italic selected text" active={fmt.italic} onPress={() => runCommand('italic')} />
        <View style={st.sep} />
        <select
          title="Text style"
          defaultValue="p"
          style={selectCss}
          onChange={(event: any) => runCommand('formatBlock', event.target.value)}
        >
          <option value="p">Body</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>
        <select
          title="Font family"
          defaultValue="Arial"
          style={selectCss}
          onChange={(event: any) => runCommand('fontName', event.target.value)}
        >
          <option value="Arial">Arial</option>
          <option value="Georgia">Georgia</option>
          <option value="Verdana">Verdana</option>
          <option value="Courier New">Courier New</option>
        </select>
        <select
          title="Font size"
          defaultValue="3"
          style={selectCss}
          onChange={(event: any) => runCommand('fontSize', event.target.value)}
        >
          <option value="2">Small</option>
          <option value="3">Normal</option>
          <option value="4">Large</option>
          <option value="5">Extra large</option>
        </select>
        <View style={st.sep} />
        <ToolBtn icon="list" title="Bulleted list" onPress={() => runCommand('insertUnorderedList')} />
        <ToolBtn label="1." title="Numbered list" onPress={() => runCommand('insertOrderedList')} />
        <input
          type="color"
          title="Text color"
          style={colorCss}
          onChange={(event: any) => runCommand('foreColor', event.target.value)}
        />
      </View>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={(event: any) => onChange(event.currentTarget.innerHTML)}
        onMouseUp={saveSelection}
        onKeyUp={saveSelection}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={editorCss}
      />
    </View>
  );
}

const st = StyleSheet.create({
  wrapper: { width: '100%' },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: C.cream,
    padding: 8,
    borderWidth: 2.5,
    borderColor: C.ink,
    borderRadius: 16,
    marginBottom: 12,
  },
  sep: { width: 2.5, height: 22, borderRadius: 2, backgroundColor: C.ink, opacity: 0.25, marginHorizontal: 2 },
  tool: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 2.5,
    borderColor: C.ink,
    backgroundColor: C.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolActive: { backgroundColor: C.blue },
  toolText: { fontFamily: F.bold, fontSize: 13, color: C.ink },
});