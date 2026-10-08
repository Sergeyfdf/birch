import { Platform } from 'react-native';

export const colors = {
  bg: '#0B1410',
  bgDeep: '#060B08',
  bark: '#EDE6D3',
  barkShade: '#D2C8AE',
  barkDark: '#A89E85',
  knot: '#1C1A17',
  leaf: '#9BE15D',
  leafBright: '#C4F27F',
  leafDeep: '#4E8A2E',
  moss: '#2F5B2A',
  text: '#F4F1E6',
  textDim: 'rgba(244, 241, 230, 0.62)',
  textFaint: 'rgba(244, 241, 230, 0.38)',
  glass: 'rgba(22, 36, 28, 0.42)',
  glassStrong: 'rgba(14, 24, 18, 0.68)',
  glassLight: 'rgba(237, 230, 211, 0.10)',
  glassBorder: 'rgba(237, 230, 211, 0.16)',
  glassBorderStrong: 'rgba(237, 230, 211, 0.28)',
  danger: '#FF7A6B',
  youtube: '#FF5A4E',
  soundcloud: '#FF8A3D',
};

export const fonts = {
  pixel: 'PixelifySans_600SemiBold',
  pixelBold: 'PixelifySans_700Bold',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
};

export const blur = Platform.select({ ios: 40, default: 30 });

export const TAB_BAR_HEIGHT = 64;
export const MINI_PLAYER_HEIGHT = 64;
