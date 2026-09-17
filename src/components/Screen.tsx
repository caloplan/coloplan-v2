/**
 * 页面滚动容器：web 端居中限宽，移动端全宽。
 */
import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import type { ViewStyle } from "react-native";
import { layout, spacing } from "@/theme";
import { useTheme } from "@/theme/ThemeProvider";

interface ScreenProps {
  children: ReactNode;
  style?: ViewStyle;
}

export function Screen({ children, style }: ScreenProps) {
  const { colors } = useTheme();
  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.inner, style]}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1 },
  inner: {
    width: "100%",
    maxWidth: layout.maxWidth,
    alignSelf: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
});
