import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, usePathname } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { blur, colors, fonts, MINI_PLAYER_HEIGHT, radius, TAB_BAR_HEIGHT } from '@/theme';
import { currentTrack, next, togglePlay, usePlayback, usePlayer } from '@/store/player';
import { formatTime } from '@/lib/files';

export function MiniPlayer() {
  const track = usePlayer(currentTrack);
  const { playing } = usePlayback();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { position, duration } = usePlayback();

  if (!track || pathname === '/player') return null;

  const bottom = TAB_BAR_HEIGHT + insets.bottom + 8;
  const progress = duration > 0 ? Math.min(1, Math.max(0, position / duration)) : 0;

  return (
    <Link href="/player" asChild>
      <Pressable style={[styles.container, { bottom }]}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={blur} style={StyleSheet.absoluteFill} tint="dark" />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bgDeep }]} />
        )}
        <LinearGradient
          colors={[colors.glassBorderStrong, 'transparent']}
          style={styles.border}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        
        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
        </View>

        <View style={styles.content}>
          <Image
            source={track.artwork || require('../../assets/images/icon.png')}
            style={styles.art}
            contentFit="cover"
            transition={200}
          />
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>{track.title}</Text>
            <Text style={styles.artist} numberOfLines={1}>{track.artist}</Text>
          </View>

          <View style={styles.controls}>
            <Pressable onPress={() => togglePlay()} style={styles.btn} hitSlop={10}>
              <Ionicons name={playing ? 'pause' : 'play'} size={24} color={colors.text} />
            </Pressable>
            <Pressable onPress={() => next()} style={styles.btn} hitSlop={10}>
              <Ionicons name="play-forward" size={20} color={colors.text} />
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: MINI_PLAYER_HEIGHT,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: Platform.OS === 'ios' ? colors.glassStrong : colors.bgDeep,
  },
  border: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderWidth: 1,
    borderColor: 'transparent',
    borderTopColor: colors.glassBorderStrong,
    borderRadius: radius.md,
  },
  progressTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.leafBright,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 12,
  },
  art: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.glass,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.text,
    marginBottom: 2,
  },
  artist: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textDim,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingRight: 8,
  },
  btn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
