import { View, Text, StyleSheet, Pressable, Platform, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';
import { BlurView } from 'expo-blur';

import { usePlayer, usePlayback, currentTrack, togglePlay, next, previous, seekTo } from '@/store/player';
import { colors, fonts, radius } from '@/theme';
import { formatTime } from '@/lib/files';
import { useEffect, useState } from 'react';

const { width } = Dimensions.get('window');
const ART_SIZE = width - 48;

export default function PlayerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const track = usePlayer(currentTrack);
  const { playing, position, duration, mode } = usePlayback();
  
  const [seeking, setSeeking] = useState(false);
  const [seekPos, setSeekPos] = useState(0);

  useEffect(() => {
    if (!seeking) {
      setSeekPos(position);
    }
  }, [position, seeking]);

  if (!track) {
    return (
      <View style={styles.container}>
        <Text style={{ color: 'white' }}>Нет активного трека</Text>
      </View>
    );
  }

  const handleSeek = (val: number) => {
    setSeeking(false);
    seekTo(val);
  };

  const currentPos = seeking ? seekPos : position;

  return (
    <View style={styles.container}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={100} style={StyleSheet.absoluteFill} tint="dark" />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bgDeep }]} />
      )}

      <View style={[styles.header, { paddingTop: insets.top || 16 }]}>
        <Pressable onPress={() => router.back()} hitSlop={20} style={styles.headerBtn}>
          <Ionicons name="chevron-down" size={32} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Сейчас играет</Text>
        <View style={styles.headerBtn} />
      </View>

      <View style={styles.artContainer}>
        <Image 
          source={track.artwork || require('../assets/images/icon.png')} 
          style={styles.art} 
          contentFit="cover"
          transition={200}
        />
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.title} numberOfLines={2}>{track.title}</Text>
        <Text style={styles.artist} numberOfLines={1}>{track.artist}</Text>
      </View>

      <View style={styles.progressContainer}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={duration > 0 ? duration : 1}
          value={currentPos}
          onSlidingStart={() => setSeeking(true)}
          onValueChange={setSeekPos}
          onSlidingComplete={handleSeek}
          minimumTrackTintColor={colors.leafBright}
          maximumTrackTintColor="rgba(255,255,255,0.2)"
          thumbTintColor={colors.text}
        />
        <View style={styles.timeRow}>
          <Text style={styles.time}>{formatTime(currentPos)}</Text>
          <Text style={styles.time}>-{formatTime(Math.max(0, duration - currentPos))}</Text>
        </View>
      </View>

      <View style={[styles.controls, { paddingBottom: insets.bottom + 20 }]}>
        <Pressable hitSlop={10} style={styles.secondaryBtn}>
          <Ionicons name="shuffle" size={24} color={mode === 'shuffle' ? colors.leafBright : colors.textFaint} />
        </Pressable>

        <View style={styles.mainControls}>
          <Pressable onPress={() => previous()} hitSlop={10}>
            <Ionicons name="play-back" size={40} color={colors.text} />
          </Pressable>
          <Pressable onPress={() => togglePlay()} style={styles.playBtn} hitSlop={10}>
            <Ionicons name={playing ? 'pause' : 'play'} size={40} color={colors.bgDeep} style={{ marginLeft: playing ? 0 : 4 }} />
          </Pressable>
          <Pressable onPress={() => next()} hitSlop={10}>
            <Ionicons name="play-forward" size={40} color={colors.text} />
          </Pressable>
        </View>

        <Pressable hitSlop={10} style={styles.secondaryBtn}>
          <Ionicons name="repeat" size={24} color={mode === 'repeat' ? colors.leafBright : colors.textFaint} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  headerBtn: {
    width: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textDim,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  artContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  art: {
    width: ART_SIZE,
    height: ART_SIZE,
    borderRadius: radius.lg,
    backgroundColor: colors.glass,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  infoContainer: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.text,
    marginBottom: 6,
  },
  artist: {
    fontFamily: fonts.medium,
    fontSize: 18,
    color: colors.leafBright,
  },
  progressContainer: {
    paddingHorizontal: 16,
    marginBottom: 30,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginTop: -8,
  },
  time: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textDim,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
  },
  mainControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtn: {
    padding: 8,
  }
});
