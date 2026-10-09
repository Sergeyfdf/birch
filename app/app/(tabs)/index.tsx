import { View, Text, StyleSheet, FlatList, Pressable, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';

import { useLibrary } from '@/store/library';
import { playTracks } from '@/store/player';
import { importFiles } from '@/lib/import';
import { colors, fonts, radius, TAB_BAR_HEIGHT, MINI_PLAYER_HEIGHT } from '@/theme';
import { GlassView, GlassButton } from '@/components/UI';
import { formatTime } from '@/lib/files';
import { currentTrack, usePlayer } from '@/store/player';

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const { order, tracks, removeTrack } = useLibrary();
  const track = usePlayer(currentTrack);
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets) {
        setImporting(true);
        const count = await importFiles(res.assets.map((a) => ({ uri: a.uri, name: a.name })));
        setImporting(false);
        if (count > 0 && Platform.OS !== 'web') {
          Alert.alert('Готово', `Импортировано треков: ${count}`);
        }
      }
    } catch (e) {
      setImporting(false);
      console.warn('import error', e);
    }
  };

  const handlePlay = (id: string, index: number) => {
    playTracks(order, index, { context: 'library' });
  };

  const handleDelete = (id: string) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Удалить трек?')) removeTrack(id);
    } else {
      Alert.alert('Удалить', 'Точно удалить этот трек?', [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Удалить', style: 'destructive', onPress: () => removeTrack(id) }
      ]);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.title}>Медиатека</Text>
        <Pressable onPress={handleImport} style={styles.importBtn} disabled={importing}>
          <Ionicons name="folder-open" size={20} color={colors.leafBright} />
          <Text style={styles.importText}>{importing ? '...' : 'Импорт'}</Text>
        </Pressable>
      </View>

      <FlatList
        data={order}
        keyExtractor={(id) => id}
        contentContainerStyle={{
          paddingTop: 16,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + TAB_BAR_HEIGHT + (track ? MINI_PLAYER_HEIGHT + 16 : 0) + 20,
        }}
        renderItem={({ item: id, index }) => {
          const t = tracks[id];
          if (!t) return null;
          return (
            <Pressable onPress={() => handlePlay(id, index)} style={styles.row}>
              <Image 
                source={t.artwork || require('../../assets/images/icon.png')} 
                style={styles.art} 
                contentFit="cover" 
              />
              <View style={styles.info}>
                <Text style={styles.trackTitle} numberOfLines={1}>{t.title}</Text>
                <Text style={styles.trackArtist} numberOfLines={1}>{t.artist}</Text>
              </View>
              <Text style={styles.duration}>{formatTime(t.duration)}</Text>
              <Pressable onPress={() => handleDelete(id)} style={styles.delBtn} hitSlop={10}>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </Pressable>
            </Pressable>
          );
        }}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Ionicons name="musical-notes-outline" size={48} color={colors.textFaint} />
            <Text style={styles.emptyText}>Здесь пока пусто</Text>
            <Text style={styles.emptySub}>Найди музыку в поиске или импортируй файлы</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontFamily: fonts.pixelBold,
    fontSize: 28,
    color: colors.text,
  },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.glassStrong,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  importText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.leafBright,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
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
  trackTitle: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.text,
    marginBottom: 4,
  },
  trackArtist: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textDim,
  },
  duration: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textFaint,
    width: 40,
    textAlign: 'right',
  },
  delBtn: {
    padding: 4,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    color: colors.textDim,
  },
  emptySub: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textFaint,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
