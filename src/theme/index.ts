/**
 * CaloPlan v2 设计令牌 — 干净、克制、现代、移动优先。
 * 避免渐变 / 玻璃拟态 / 重阴影 / 装饰性视觉。
 */

export const colors = {
  // 背景与表面
  bg: "#F6F6F4",
  surface: "#FFFFFF",
  surfaceMuted: "#F0F0ED",
  divider: "#E7E7E2",
  border: "#E2E2DD",

  // 文本
  text: "#191919",
  textSecondary: "#6E6E6A",
  textTertiary: "#A1A19C",
  textOnAccent: "#FFFFFF",

  // 主强调色（营养绿）
  accent: "#2E7D5B",
  accentPressed: "#256B4D",
  accentSoft: "#E4F0EA",

  // 语义色
  success: "#2E7D5B",
  warning: "#C98A1B",
  danger: "#C94F42",
  info: "#3B6EA8",

  // 宏量营养标签色
  macroCarbon: "#C98A1B",
  macroProtein: "#3B6EA8",
  macroFat: "#C94F42",
  macroSalt: "#8A8A85",

  // 聊天
  chatUserBubble: "#2E7D5B",
  chatUserText: "#FFFFFF",
  chatAssistantBubble: "#EFEFEC",
  chatAssistantText: "#191919",

  // 触摸反馈
  pressOverlay: "rgba(0,0,0,0.05)",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
} as const;

export const typography = {
  // 大数字（热量）
  display: { fontSize: 40, fontWeight: "700" as const, letterSpacing: -1 },
  // 标题
  title: { fontSize: 22, fontWeight: "700" as const, letterSpacing: -0.3 },
  // 小节标题
  section: { fontSize: 16, fontWeight: "600" as const },
  // 正文
  body: { fontSize: 15, fontWeight: "400" as const },
  // 强调正文
  bodyStrong: { fontSize: 15, fontWeight: "600" as const },
  // 次要正文
  bodySmall: { fontSize: 13, fontWeight: "400" as const },
  // 辅助说明
  caption: { fontSize: 12, fontWeight: "400" as const },
  // 标签 / 按钮
  label: { fontSize: 14, fontWeight: "600" as const },
} as const;

/** 页面内容最大宽度（web 端居中，移动端全宽） */
export const layout = {
  maxWidth: 520,
  headerHeight: 56,
} as const;
