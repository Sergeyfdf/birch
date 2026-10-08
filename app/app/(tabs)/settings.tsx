import { View, Text, StyleSheet, TextInput, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

import { useSettings } from '@/store/settings';
import { colors, fonts, radius, TAB_BAR_HEIGHT } from '@/theme';
import { GlassView, GlassButton } from '@/components/UI';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { serverUrl, setServerUrl, clearCache } = useSettings();
  const [url, setUrl] = useState(serverUrl);

  const saveUrl = () => {
    setServerUrl(url.trim());
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.title}>Настройки</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Сервер</Text>
          <Text style={styles.sectionDesc}>Укажи адрес своего Ubuntu сервера, на котором запущен бекенд Birch.</Text>
          
          <View style={styles.inputBox}>
            <Ionicons name="globe-outline" size={20} color={colors.textFaint} />
            <TextInput
              style={styles.input}
              value={url}
              onChangeText={setUrl}
              placeholder="http://..."
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              onBlur={saveUrl}
              onSubmitEditing={saveUrl}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Данные</Text>
          <GlassButton variant="danger" onPress={clearCache} style={{ marginTop: 12 }}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} style={{ marginRight: 8 }} />
            <Text style={{ fontFamily: fonts.medium, color: colors.danger }}>Очистить кэш поиска и обложек</Text>
          </GlassButton>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontFamily: fonts.pixelBold,
    fontSize: 28,
    color: colors.text,
  },
  content: {
    padding: 20,
    gap: 32,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    color: colors.text,
  },
  sectionDesc: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textDim,
    lineHeight: 20,
    marginBottom: 4,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glassStrong,
    height: 48,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  input: {
    flex: 1,
    height: '100%',
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 16,
    marginLeft: 8,
  }
});
