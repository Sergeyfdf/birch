import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, Pressable, ActivityIndicator, Keyboard, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

import { search, extractLink, isLink, type SearchResult } from '@/lib/api';
import { useDownloads } from '@/store/downloads';
import { useSettings } from '@/store/settings';
import { useLibrary } from '@/store/library';
import { colors, fonts, radius, TAB_BAR_HEIGHT, MINI_PLAYER_HEIGHT, blur } from '@/theme';
import { formatTime } from '@/lib/files';
import { GlassView, GlassButton } from '@/components/UI';
import { currentTrack, usePlayer } from '@/store/player';
import type { RemoteTrack } from '@/lib/types';

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState('');
  const { defaultSource, setDefaultSource, serverUrl } = useSettings();
  const { enqueue, tasks } = useDownloads();
  const { tracks } = useLibrary();
  const track = usePlayer(currentTrack);

  const doSearch = async (query = q, source = defaultSource) => {
    const text = query.trim();
    if (!text) return;
    Keyboard.dismiss();
    setLoading(true);
    setError('');
    try {
      const link = extractLink(text);
      const reqQuery = link || text;
      const res = await search(reqQuery, source);
      setResult(res);
    } catch (e: any) {
      setError(e.message || 'Ошибка поиска');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (t: RemoteTrack) => {
    if (tracks[t.id] || tasks[t.id]) return;
    enqueue([t]);
  };

  const handleDownloadAll = () => {
    if (!result?.tracks.length) return;
    enqueue(result.tracks);
  };

  if (!serverUrl) {
    return (
      <View style={styles.center}>
        <Ionicons name="server-outline" size={48} color={colors.danger} />
        <Text style={styles.centerText}>Не настроен сервер</Text>
        <Text style={styles.centerSub}>Зайди в Настройки и укажи адрес сервера Birch</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={colors.textFaint} />
          <TextInput
            style={styles.input}
            value={q}
            onChangeText={setQ}
            placeholder="Трек, артист или ссылка на плейлист..."
            placeholderTextColor={colors.textFaint}
            returnKeyType="search"
            onSubmitEditing={() => doSearch()}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {q.length > 0 && (
            <Pressable onPress={() => { setQ(''); setResult(null); setError(''); }} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color={colors.textDim} />
            </Pressable>
          )}
        </View>

        <View style={styles.sources}>
          <Pressable 
            style={[styles.sourceBtn, defaultSource === 'youtube' && styles.sourceBtnActive]} 
            onPress={() => { setDefaultSource('youtube'); if(q) doSearch(q, 'youtube'); }}
          >
            <Ionicons name="logo-youtube" size={16} color={defaultSource === 'youtube' ? colors.youtube : colors.textDim} />
            <Text style={[styles.sourceText, defaultSource === 'youtube' && styles.sourceTextActive]}>YouTube</Text>
          </Pressable>
          <Pressable 
            style={[styles.sourceBtn, defaultSource === 'soundcloud' && styles.sourceBtnActive]} 
            onPress={() => { setDefaultSource('soundcloud'); if(q) doSearch(q, 'soundcloud'); }}
          >
            <Ionicons name="logo-soundcloud" size={16} color={defaultSource === 'soundcloud' ? colors.soundcloud : colors.textDim} />
            <Text style={[styles.sourceText, defaultSource === 'soundcloud' && styles.sourceTextActive]}>SoundCloud</Text>
          </Pressable>
        </View>
      </View>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.leafBright} />
        </View>
      )}

      {error ? (
        <View style={styles.center}>
          <Ionicons name="warning-outline" size={48} color={colors.danger} />
          <Text style={styles.centerText}>{error}</Text>
        </View>
      ) : null}

      {!loading && !error && result && (
        <FlatList
          data={result.tracks}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{
            paddingTop: 16,
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + TAB_BAR_HEIGHT + (track ? MINI_PLAYER_HEIGHT + 16 : 0) + 20,
          }}
          ListHeaderComponent={result.title ? (
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>{result.title}</Text>
              <GlassButton variant="primary" onPress={handleDownloadAll} style={{ height: 36 }}>
                <Ionicons name="download-outline" size={16} color={colors.bgDeep} style={{ marginRight: 6 }} />
                <Text style={styles.dlAllText}>Скачать всё ({result.tracks.length})</Text>
              </GlassButton>
            </View>
          ) : null}
          renderItem={({ item: t }) => {
            const has = !!tracks[t.id];
            const task = tasks[t.id];
            const status = task?.status;
            
            return (
              <View style={styles.row}>
                <Image 
                  source={t.artwork || require('@/../assets/images/icon.png')} 
                  style={styles.art} 
                  contentFit="cover" 
                />
                <View style={styles.info}>
                  <Text style={styles.trackTitle} numberOfLines={1}>{t.title}</Text>
                  <Text style={styles.trackArtist} numberOfLines={1}>{t.artist}</Text>
                </View>
                
                {has ? (
                  <View style={styles.statusBox}>
                    <Ionicons name="checkmark-circle" size={24} color={colors.leafBright} />
                  </View>
                ) : status === 'queued' || status === 'preparing' ? (
                  <View style={styles.statusBox}>
                    <ActivityIndicator size="small" color={colors.textDim} />
                  </View>
                ) : status === 'downloading' ? (
                  <View style={styles.statusBox}>
                    <Text style={styles.progressText}>{Math.round(task.progress * 100)}%</Text>
                  </View>
                ) : (
                  <Pressable onPress={() => handleDownload(t)} style={styles.dlBtn} hitSlop={10}>
                    <Ionicons name="download-outline" size={24} color={colors.leafBright} />
                  </Pressable>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : colors.bgDeep,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glassStrong,
    height: 48,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 16,
    marginLeft: 8,
  },
  clearBtn: {
    padding: 4,
  },
  sources: {
    flexDirection: 'row',
    gap: 8,
  },
  sourceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    backgroundColor: colors.glass,
    borderRadius: radius.sm,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  sourceBtnActive: {
    backgroundColor: colors.glassStrong,
    borderColor: colors.glassBorderStrong,
  },
  sourceText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textDim,
  },
  sourceTextActive: {
    color: colors.text,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  centerText: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
  },
  centerSub: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textFaint,
    textAlign: 'center',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  resultTitle: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 18,
    color: colors.text,
    marginRight: 12,
  },
  dlAllText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.bgDeep,
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
  statusBox: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.leafBright,
  },
  dlBtn: {
    padding: 8,
  }
});
