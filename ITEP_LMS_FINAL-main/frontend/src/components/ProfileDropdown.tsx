
import React, { useRef, useState } from 'react';

import {
  Animated,
  Easing,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';

import { TitanOne_400Regular } from '@expo-google-fonts/titan-one';
import { useAuth } from '@/context/AuthContext';

// ------------------------------------------------------------------
// Brand
// ------------------------------------------------------------------

const C = {
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
};

const F = {
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  bold: 'Outfit_700Bold',
  display: 'TitanOne_400Regular',
};

const MENU_W = 288;
const nd = Platform.OS !== 'web';

type Item = {
  key: string;
  label: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
  bubble: string;
  onPress: () => void;
};

// ------------------------------------------------------------------
// Menu Row
// ------------------------------------------------------------------

function MenuRow({
  item,
  anim,
  danger,
}: {
  item: Item;
  anim: Animated.Value;
  danger?: boolean;
}) {
  const p = useRef(new Animated.Value(0)).current;
  const h = useRef(new Animated.Value(0)).current;

  const face = danger ? C.coral : C.paper;
  const shadow = danger ? C.coralDeep : C.pinkDeep;
  const fg = danger ? C.cream : C.ink;

  const hover = {
    onHoverIn: () =>
      Animated.timing(h, {
        toValue: 1,
        duration: 140,
        useNativeDriver: nd,
      }).start(),

    onHoverOut: () =>
      Animated.timing(h, {
        toValue: 0,
        duration: 140,
        useNativeDriver: nd,
      }).start(),
  } as any;

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [
          {
            translateX: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [16, 0],
            }),
          },
        ],
      }}
    >
      <Pressable
        accessibilityRole="button"
        onPress={item.onPress}
        onPressIn={() =>
          Animated.timing(p, {
            toValue: 1,
            duration: 70,
            useNativeDriver: nd,
          }).start()
        }
        onPressOut={() =>
          Animated.spring(p, {
            toValue: 0,
            friction: 5,
            useNativeDriver: nd,
          }).start()
        }
        style={{ paddingBottom: 4, marginBottom: 8 }}
        {...hover}
      >
        <View style={[s.rowShadow, { backgroundColor: shadow }]} />

        <Animated.View
          style={[
            s.rowFace,
            {
              backgroundColor: face,
              transform: [
                {
                  translateY: p.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 4],
                  }),
                },
                {
                  translateX: h.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 3],
                  }),
                },
              ],
            },
          ]}
        >
          <Animated.View
            style={[
              s.bubble,
              {
                backgroundColor: item.bubble,
                transform: [
                  {
                    rotate: h.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['-4deg', '-14deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            <Ionicons
              name={item.icon}
              size={18}
              color={danger ? C.coralDeep : C.ink}
            />
          </Animated.View>

          <View style={{ flex: 1 }}>
            <Text
              style={[
                danger ? s.rowDanger : s.rowLabel,
                { color: fg },
              ]}
            >
              {item.label}
            </Text>

            {item.sub ? (
              <Text style={s.rowSub}>{item.sub}</Text>
            ) : null}
          </View>

          <Animated.View
            style={{
              opacity: h,
              transform: [
                {
                  translateX: h.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-6, 0],
                  }),
                },
              ],
            }}
          >
            <Ionicons name="arrow-forward" size={17} color={fg} />
          </Animated.View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

// ------------------------------------------------------------------
// Profile Dropdown
// ------------------------------------------------------------------

export function ProfileDropdown() {
  const { user, logout } = useAuth();
  const { width: screenW } = useWindowDimensions();

  useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_700Bold,
    TitanOne_400Regular,
  });

  const [visible, setVisible] = useState(false);
  const [anchor, setAnchor] = useState({
    x: 0,
    y: 0,
    w: 0,
    h: 0,
  });

  const [avatarFailed, setAvatarFailed] = useState(false);

  const triggerRef = useRef<View>(null);
  const pop = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(0)).current;

  const rows = useRef(
    Array.from({ length: 5 }, () => new Animated.Value(0))
  ).current;

  const role = user?.role || 'student';

  const isChair =
    role === 'program chair' ||
    role === 'program_chair' ||
    role === 'admin';

  const isFaculty = role === 'faculty';

  const roleLabel = isFaculty
    ? 'Faculty'
    : isChair
      ? role === 'admin'
        ? 'Administrator'
        : 'Program Chair'
      : 'Student';

  const initials =
    `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`
      .toUpperCase() || (isFaculty ? 'FA' : 'ST');

  const showImg = !!user?.avatar && !avatarFailed;
  const verified = !!user?.isVerified;

  // Open / Close

  const runOpen = () => {
    setVisible(true);

    pop.setValue(0);
    rows.forEach((v) => v.setValue(0));

    Animated.spring(pop, {
      toValue: 1,
      friction: 6,
      tension: 150,
      useNativeDriver: nd,
    }).start();

    Animated.stagger(
      60,
      rows.map((v) =>
        Animated.spring(v, {
          toValue: 1,
          friction: 7,
          tension: 120,
          useNativeDriver: nd,
        })
      )
    ).start();
  };

  // Measure trigger position

  const open = () => {
    const node: any = triggerRef.current;

    if (node?.measureInWindow) {
      node.measureInWindow(
        (x: number, y: number, w: number, h: number) => {
          setAnchor({ x, y, w, h });
          runOpen();
        }
      );
    } else {
      runOpen();
    }
  };

  const close = (after?: () => void) => {
    Animated.timing(pop, {
      toValue: 0,
      duration: 140,
      easing: Easing.in(Easing.quad),
      useNativeDriver: nd,
    }).start(() => {
      setVisible(false);
      after?.();
    });
  };

  const go = (path: string) => () =>
    close(() => router.push(path as any));

  // Menu items

  const items: Item[] = [
    {
      key: 'profile',
      label: 'My profile',
      sub: 'Your ID and details',
      icon: 'id-card',
      bubble: C.cream,
      onPress: go('/profile'),
    },

    ...(isChair
      ? [
          {
            key: 'chair',
            label: 'Chair command center',
            sub: 'Programs and approvals',
            icon: 'shield-checkmark' as const,
            bubble: C.blue,
            onPress: go('/chair/dashboard'),
          },
          {
            key: 'studio',
            label: 'Faculty studio',
            sub: 'Build modules and quizzes',
            icon: 'color-palette' as const,
            bubble: C.pink,
            onPress: go('/faculty/dashboard'),
          },
        ]
      : isFaculty
        ? [
            {
              key: 'fac',
              label: 'Faculty dashboard',
              sub: 'Your classes and content',
              icon: 'easel' as const,
              bubble: C.blue,
              onPress: go('/faculty/dashboard'),
            },
          ]
        : [
            {
              key: 'stu',
              label: 'Student dashboard',
              sub: 'Subjects and quizzes',
              icon: 'school' as const,
              bubble: C.blue,
              onPress: go('/student/dashboard'),
            },
          ]),
  ];

  const signOut: Item = {
    key: 'out',
    label: 'Sign out',
    sub: '',
    icon: 'log-out',
    bubble: C.cream,
    onPress: () =>
      close(() => {
        logout();
        router.replace('/');
      }),
  };

  // Position menu

  const left = Math.min(
    Math.max(anchor.x + anchor.w - MENU_W, 10),
    Math.max(screenW - MENU_W - 10, 10)
  );

  const top = anchor.y + anchor.h + 14;

  const caretRight = Math.min(
    Math.max(
      left + MENU_W - (anchor.x + anchor.w / 2) - 10,
      20
    ),
    MENU_W - 40
  );

  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName?.[0] || ''}.`
    : roleLabel;

  return (
    <>
      {/* Profile trigger */}

      <Pressable
        ref={triggerRef as any}
        collapsable={false}
        accessibilityRole="button"
        accessibilityLabel="Open profile menu"
        onPress={open}
        onPressIn={() =>
          Animated.timing(press, {
            toValue: 1,
            duration: 70,
            useNativeDriver: nd,
          }).start()
        }
        onPressOut={() =>
          Animated.spring(press, {
            toValue: 0,
            friction: 4,
            useNativeDriver: nd,
          }).start()
        }
      >
        <Animated.View
          style={[
            s.trigger,
            {
              transform: [
                {
                  scale: press.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0.94],
                  }),
                },
              ],
            },
          ]}
        >
          {showImg ? (
            <Image
              source={{ uri: user!.avatar }}
              style={s.avatar}
              onError={() => setAvatarFailed(true)}
            />
          ) : (
            <View style={s.avatar}>
              <Text style={s.avatarText}>{initials}</Text>
            </View>
          )}

          <View>
            <Text style={s.name} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={s.role}>{roleLabel}</Text>
          </View>

          <Animated.View
            style={{
              transform: [
                {
                  rotate: pop.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '180deg'],
                  }),
                },
              ],
            }}
          >
            <Ionicons name="chevron-down" size={14} color={C.ink} />
          </Animated.View>
        </Animated.View>
      </Pressable>

      {/* Dropdown modal */}

      <Modal
        visible={visible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => close()}
      >
        <View style={{ flex: 1 }}>
          <Pressable
            style={s.backdrop}
            onPress={() => close()}
            accessibilityLabel="Close menu"
          />

          <Animated.View
            style={[
              s.menuWrap,
              {
                left,
                top,
                width: MENU_W,
                opacity: pop,
                transform: [
                  {
                    translateY: pop.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-12, 0],
                    }),
                  },
                  {
                    scale: pop.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.9, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* Axolotl gills */}

            <View style={[s.gill, { top: 26 }]} />
            <View style={[s.gill, { top: 54, left: -12 }]} />
            <View style={[s.gill, { top: 82 }]} />

            <View style={s.shadow} />

            <View style={s.card}>
              {/* ID-style header */}

              <View style={s.header}>
                <View>
                  <View style={s.ring}>
                    {showImg ? (
                      <Image
                        source={{ uri: user!.avatar }}
                        style={s.ringImg}
                        onError={() => setAvatarFailed(true)}
                      />
                    ) : (
                      <Text style={s.ringText}>{initials}</Text>
                    )}
                  </View>

                  {verified ? (
                    <View style={s.verifiedDot}>
                      <Ionicons
                        name="checkmark"
                        size={11}
                        color="#FFFFFF"
                      />
                    </View>
                  ) : null}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={s.menuName} numberOfLines={1}>
                    {user?.firstName} {user?.lastName}
                  </Text>

                  <Text style={s.menuEmail} numberOfLines={1}>
                    {user?.email}
                  </Text>

                  <View
                    style={[
                      s.roleSticker,
                      {
                        backgroundColor:
                          role === 'student' || !role
                            ? C.blue
                            : C.pink,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        s.roleText,
                        {
                          color:
                            role === 'student' || !role
                              ? '#FFFFFF'
                              : C.ink,
                        },
                      ]}
                    >
                      {roleLabel}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={s.divider} />

              {items.map((it, i) => (
                <MenuRow
                  key={it.key}
                  item={it}
                  anim={rows[i]}
                />
              ))}

              <View style={{ height: 2 }} />

              <MenuRow
                item={signOut}
                anim={rows[items.length]}
                danger
              />
            </View>

            {/* Caret */}

            <View style={[s.caret, { right: caretRight }]} />
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

// ------------------------------------------------------------------
// Styles
// ------------------------------------------------------------------

const s = StyleSheet.create({
  // Trigger

  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.coral,
    borderWidth: 2.5,
    borderColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  avatarText: {
    fontFamily: F.display,
    fontSize: 13,
    color: C.cream,
  },

  name: {
    fontFamily: F.bold,
    fontSize: 13,
    color: C.ink,
  },

  role: {
    fontFamily: F.medium,
    fontSize: 11,
    color: C.muted,
  },

  // Overlay

  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(74,26,36,0.14)',
  },

  menuWrap: {
    position: 'absolute',
  },

  // Card

  shadow: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: -8,
    bottom: -8,
    borderRadius: 24,
    backgroundColor: C.coral,
  },

  card: {
    backgroundColor: C.paper,
    borderWidth: 3,
    borderColor: C.ink,
    borderRadius: 22,
    borderTopRightRadius: 10,
    padding: 14,
    zIndex: 2,
  },

  gill: {
    position: 'absolute',
    left: -10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.coral,
    borderWidth: 2.5,
    borderColor: C.ink,
  },

  caret: {
    position: 'absolute',
    top: -9,
    width: 16,
    height: 16,
    backgroundColor: C.paper,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: C.ink,
    transform: [{ rotate: '45deg' }],
    zIndex: 3,
  },

  // Header

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  ring: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: C.coral,
    borderWidth: 3,
    borderColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  ringImg: {
    width: '100%',
    height: '100%',
  },

  ringText: {
    fontFamily: F.display,
    fontSize: 21,
    color: C.cream,
  },

  verifiedDot: {
    position: 'absolute',
    right: -3,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.blue,
    borderWidth: 2.5,
    borderColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },

  menuName: {
    fontFamily: F.display,
    fontSize: 18,
    lineHeight: 22,
    color: C.ink,
  },

  menuEmail: {
    fontFamily: F.medium,
    fontSize: 12,
    color: C.muted,
    marginTop: 1,
  },

  roleSticker: {
    alignSelf: 'flex-start',
    borderWidth: 2,
    borderColor: C.ink,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
    marginTop: 6,
    transform: [{ rotate: '-3deg' }],
  },

  roleText: {
    fontFamily: F.bold,
    fontSize: 11,
  },

  divider: {
    height: 2,
    backgroundColor: C.pink,
    borderRadius: 1,
    marginVertical: 12,
  },

  // Rows

  rowShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 4,
    bottom: 0,
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: C.ink,
  },

  rowFace: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: C.ink,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },

  bubble: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 2.5,
    borderColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rowLabel: {
    fontFamily: F.bold,
    fontSize: 14,
  },

  rowSub: {
    fontFamily: F.medium,
    fontSize: 11.5,
    color: C.muted,
    marginTop: 1,
  },

  rowDanger: {
    fontFamily: F.display,
    fontSize: 16,
    letterSpacing: 0.3,
  },
});
