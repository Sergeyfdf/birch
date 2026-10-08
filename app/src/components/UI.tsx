import { forwardRef } from 'react';
import { View, StyleSheet, Text, Pressable, type ViewProps, type PressableProps } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform } from 'react-native';
import { blur, colors, radius, fonts } from '@/theme';

export const GlassView = forwardRef<View, ViewProps & { intensity?: number; color?: string; radius?: number }>(
  ({ style, intensity = blur, color = colors.glassStrong, radius: r = radius.lg, children, ...props }, ref) => (
    <View ref={ref} style={[{ borderRadius: r, overflow: 'hidden', backgroundColor: Platform.OS === 'ios' ? color : colors.bgDeep }, style]} {...props}>
      {Platform.OS === 'ios' && <BlurView intensity={intensity} style={StyleSheet.absoluteFill} tint="dark" />}
      <LinearGradient
        colors={[colors.glassBorderStrong, 'transparent']}
        style={[StyleSheet.absoluteFill, { borderWidth: 1, borderColor: 'transparent', borderTopColor: colors.glassBorderStrong, borderRadius: r }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        pointerEvents="none"
      />
      {children}
    </View>
  )
);

export const GlassButton = forwardRef<View, PressableProps & { variant?: 'primary' | 'secondary' | 'danger', title?: string }>(
  ({ style, variant = 'primary', title, children, ...props }, ref) => {
    const isPri = variant === 'primary';
    const isDanger = variant === 'danger';
    return (
      <Pressable ref={ref} style={({ pressed }) => [styles.btn, isPri && styles.btnPri, isDanger && styles.btnDanger, pressed && styles.btnPressed, style as any]} {...props}>
        {title ? (
          <Text style={[styles.btnText, (isPri || isDanger) && styles.btnTextPri]}>{title}</Text>
        ) : children}
      </Pressable>
    );
  }
);

const styles = StyleSheet.create({
  btn: {
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  btnPri: {
    backgroundColor: colors.leafDeep,
    borderColor: colors.leafBright,
  },
  btnDanger: {
    backgroundColor: 'rgba(255, 90, 78, 0.2)',
    borderColor: colors.danger,
  },
  btnPressed: {
    opacity: 0.7,
  },
  btnText: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.text,
  },
  btnTextPri: {
    color: colors.bgDeep,
  }
});
