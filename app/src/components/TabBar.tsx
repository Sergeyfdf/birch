import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { blur, colors, fonts, radius, TAB_BAR_HEIGHT } from '@/theme';

export function TabBar() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const height = TAB_BAR_HEIGHT + insets.bottom;

  const isHide = pathname === '/player';
  if (isHide) return null;

  const tabs = [
    { name: 'index', title: 'Медиатека', icon: 'musical-notes', href: '/' },
    { name: 'search', title: 'Поиск', icon: 'search', href: '/search' },
    { name: 'settings', title: 'Настройки', icon: 'settings', href: '/settings' },
  ] as const;

  return (
    <View style={[styles.container, { height }]}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={blur} style={StyleSheet.absoluteFill} tint="dark" />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]} />
      )}
      <LinearGradient
        colors={[colors.glassBorderStrong, 'transparent']}
        style={styles.topBorder}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <View style={[styles.content, { paddingBottom: insets.bottom }]}>
        {tabs.map((tab) => {
          const active =
            tab.href === '/'
              ? pathname === '/' || pathname.startsWith('/playlist')
              : pathname.startsWith(tab.href);

          return (
            <Link key={tab.name} href={tab.href as any} asChild>
              <Pressable style={styles.tab}>
                <Ionicons
                  name={active ? tab.icon : (`${tab.icon}-outline` as any)}
                  size={24}
                  color={active ? colors.leafBright : colors.textFaint}
                />
                <Text style={[styles.label, { color: active ? colors.leafBright : colors.textFaint }]}>
                  {tab.title}
                </Text>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Platform.OS === 'ios' ? colors.glassStrong : colors.bg,
  },
  topBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 10,
  },
});
