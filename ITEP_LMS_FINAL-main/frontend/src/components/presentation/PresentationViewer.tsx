import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Linking,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '@/constants/colors';

interface PresentationViewerProps {
  url: string;
  fileName?: string;
  fileSize?: number;
  s3Key?: string;
  minHeight?: number;
}

export function PresentationViewer({
  url,
  fileName = 'Presentation Slides',
  fileSize,
  s3Key,
  minHeight = 560,
}: PresentationViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewerEngine, setViewerEngine] = useState<'office' | 'google'>('office');
  const [iframeLoading, setIframeLoading] = useState(true);

  const cleanFileName = fileName || 'presentation.pptx';
  const isPdf = cleanFileName.toLowerCase().endsWith('.pdf');
  const isPpt = cleanFileName.toLowerCase().endsWith('.pptx') || cleanFileName.toLowerCase().endsWith('.ppt');

  // Compute embedded URL
  let embedUrl = url;
  if (!isPdf && isPpt) {
    if (viewerEngine === 'office') {
      embedUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
    } else {
      embedUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
    }
  }

  const handleOpenExternal = () => {
    if (url) {
      if (Platform.OS === 'web') {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        Linking.openURL(url);
      }
    }
  };

  const handleDownload = () => {
    if (url) {
      if (Platform.OS === 'web') {
        const a = document.createElement('a');
        a.href = url;
        a.download = cleanFileName;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        Linking.openURL(url);
      }
    }
  };

  const renderViewerFrame = (height: number | string = minHeight) => {
    if (Platform.OS === 'web') {
      return (
        <View style={[styles.iframeWrapper, { height: height as any }]}>
          {iframeLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingOverlayText}>Initializing slide presentation view...</Text>
            </View>
          )}
          {/* @ts-ignore web iframe */}
          <iframe
            src={embedUrl}
            title={cleanFileName}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              backgroundColor: '#1E293B',
            }}
            onLoad={() => setIframeLoading(false)}
            allowFullScreen
          />
        </View>
      );
    }

    // Native fallback
    return (
      <View style={[styles.nativeFallbackCard, { height: height as any }]}>
        <View style={styles.nativeIconCircle}>
          <Text style={styles.nativeIconText}>{isPdf ? 'PDF' : 'PPT'}</Text>
        </View>
        <Text style={styles.nativeFileName}>{cleanFileName}</Text>
        <Text style={styles.nativePrompt}>Tap below to launch full slide presentation in external viewer</Text>
        <Pressable style={styles.presentBtn} onPress={handleOpenExternal}>
          <Text style={styles.presentBtnText}>Launch Slide Deck</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Presentation Top Control Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.fileMetaLeft}>
          <View style={[styles.badgeFormat, isPdf ? styles.badgePdf : styles.badgePpt]}>
            <Text style={styles.badgeFormatText}>{isPdf ? 'PDF SLIDES' : 'POWERPOINT'}</Text>
          </View>
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.toolbarTitle} numberOfLines={1}>{cleanFileName}</Text>
            <Text style={styles.toolbarSub}>
              {isPdf ? 'Interactive PDF Reader' : `Live Presentation Viewer (${viewerEngine === 'office' ? 'Office 365 Engine' : 'Google Docs Engine'})`}
            </Text>
          </View>
        </View>

        {/* Toolbar Action Controls */}
        <View style={styles.actionRow}>
          {/* Engine switcher for PPT */}
          {!isPdf && (
            <Pressable
              style={styles.engineToggleBtn}
              onPress={() => {
                setIframeLoading(true);
                setViewerEngine(prev => (prev === 'office' ? 'google' : 'office'));
              }}
            >
              <Text style={styles.engineToggleText}>
                {viewerEngine === 'office' ? 'Switch to Google' : 'Switch to Office'}
              </Text>
            </Pressable>
          )}

          {/* Fullscreen Present Button */}
          <Pressable
            style={styles.presentBtn}
            onPress={() => setIsFullscreen(true)}
          >
            <Text style={styles.presentBtnText}>⛶ Present Fullscreen</Text>
          </Pressable>

          {/* Open in New Tab */}
          <Pressable
            style={styles.toolIconBtn}
            onPress={handleOpenExternal}
          >
            <Text style={styles.toolIconText}>↗ New Tab</Text>
          </Pressable>

          {/* Direct Download */}
          <Pressable
            style={styles.toolIconBtn}
            onPress={handleDownload}
          >
            <Text style={styles.toolIconText}>↓ Download</Text>
          </Pressable>
        </View>
      </View>

      {/* Embedded Presentation Viewport */}
      {renderViewerFrame(minHeight)}

      {/* Fullscreen Presentation Modal */}
      <Modal
        visible={isFullscreen}
        animationType="fade"
        onRequestClose={() => setIsFullscreen(false)}
      >
        <View style={styles.fullscreenModal}>
          <View style={styles.fullscreenHeader}>
            <View style={styles.fullscreenHeaderLeft}>
              <View style={[styles.badgeFormat, isPdf ? styles.badgePdf : styles.badgePpt]}>
                <Text style={styles.badgeFormatText}>{isPdf ? 'PDF' : 'PPTX'}</Text>
              </View>
              <Text style={styles.fullscreenTitle} numberOfLines={1}>{cleanFileName}</Text>
            </View>

            <View style={styles.fullscreenControls}>
              {!isPdf && (
                <Pressable
                  style={styles.engineToggleBtn}
                  onPress={() => {
                    setIframeLoading(true);
                    setViewerEngine(prev => (prev === 'office' ? 'google' : 'office'));
                  }}
                >
                  <Text style={styles.engineToggleText}>
                    {viewerEngine === 'office' ? 'Engine: Google' : 'Engine: Office'}
                  </Text>
                </Pressable>
              )}
              <Pressable
                style={styles.closeFullscreenBtn}
                onPress={() => setIsFullscreen(false)}
              >
                <Text style={styles.closeFullscreenBtnText}>✕ Exit Presenter</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.fullscreenBody}>
            {renderViewerFrame('100%')}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
    marginVertical: 12,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    flexWrap: 'wrap',
    gap: 10,
  },
  fileMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 200,
  },
  badgeFormat: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgePdf: {
    backgroundColor: '#DC2626',
  },
  badgePpt: {
    backgroundColor: '#EA580C',
  },
  badgeFormatText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  toolbarTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  toolbarSub: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  engineToggleBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 5,
  },
  engineToggleText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
  },
  presentBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
  },
  presentBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  toolIconBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 5,
  },
  toolIconText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
  },
  iframeWrapper: {
    width: '100%',
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    gap: 10,
  },
  loadingOverlayText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  nativeFallbackCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    padding: 24,
    gap: 12,
  },
  nativeIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nativeIconText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  nativeFileName: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  nativePrompt: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
  },
  fullscreenModal: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  fullscreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  fullscreenHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  fullscreenTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  fullscreenControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  closeFullscreenBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
  },
  closeFullscreenBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  fullscreenBody: {
    flex: 1,
  },
});

