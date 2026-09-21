/**
 * Account — 仅承载账号级功能：账号信息、登录态、登录/登出、偏好、关于、注销。
 * 身体数据与营养目标不进入本页（归属 Today）。
 */
import { useState } from "react";
import type { ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Screen } from "@/components/Screen";
import { LoadingState } from "@/components/State";
import { LoginForm } from "@/components/LoginForm";
import type { LoginFields } from "@/components/LoginForm";
import { colors as lightColors, radius, spacing, typography } from "@/theme";
import { useTheme } from "@/theme/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { appServices } from "@/services/bootstrap";

interface AccountScreenProps {
  onBack: () => void;
}

export function AccountScreen({ onBack }: AccountScreenProps) {
  const auth = useAuth();
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const submit = async (mode: "login" | "register", fields: LoginFields) => {
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") {
        await appServices.login({
          username: fields.username,
          password: fields.password,
          userUrl: fields.userUrl,
          metaUrl: fields.metaUrl,
          chatUrl: fields.chatUrl,
        });
      } else {
        await appServices.register({
          username: fields.username,
          email: fields.email,
          password: fields.password,
          code: fields.code,
          fullName: fields.fullName,
          userUrl: fields.userUrl,
          metaUrl: fields.metaUrl,
          chatUrl: fields.chatUrl,
        });
      }
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    setBusy(true);
    setError(null);
    try {
      await appServices.logout();
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setBusy(false);
      setConfirmLogout(false);
    }
  };

  const deleteAccount = async () => {
    setBusy(true);
    setError(null);
    try {
      await appServices.deleteAccount();
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setBusy(false);
      setConfirmDelete(false);
    }
  };

  if (auth.status === "unknown") {
    return (
      <Screen>
        <LoadingState label="正在检查登录态…" />
      </Screen>
    );
  }

  return (
    <Screen>
      <TouchableOpacity style={styles.back} onPress={onBack} activeOpacity={0.7}>
        <Text style={[styles.backText, { color: colors.accent }]}>‹ 返回</Text>
      </TouchableOpacity>

      {auth.status === "authenticated" && auth.profile ? (
        <>
          {(() => {
            // 渲染优先用 full_name，为空则回退 username
            const displayName = auth.profile.full_name?.trim() || auth.profile.username;
            return (
            <View style={[styles.profileCard, { backgroundColor: colors.surface }]}>
              <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
                <Text style={[styles.avatarText, { color: colors.textOnAccent }]}>{displayName.slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={[styles.username, { color: colors.text }]}>{displayName}</Text>
                <Text style={[styles.email, { color: colors.textSecondary }]}>{auth.profile.email}</Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: colors.accentSoft }]}>
                <Text style={[styles.statusPillText, { color: colors.accent }]}>已登录</Text>
              </View>
            </View>
            );
          })()}

          <Section title="偏好">
            <SettingRow label="热量单位" value="kcal" />
            <SettingRow label="语言" value="简体中文" last />
          </Section>

          <Section title="关于">
            <SettingRow label="版本" value="CaloPlan v2 · 原型" />
            <SettingRow
              label="模块"
              value="caloplan-core / user / cache / chat"
              last
            />
          </Section>

          <Section title="账号操作">
            <TouchableOpacity
              style={[styles.rowBtn, styles.logoutBtn, { borderBottomColor: colors.divider }]}
              onPress={() => setConfirmLogout(true)}
              disabled={busy}
              activeOpacity={0.7}
            >
              <Text style={[styles.logoutText, { color: colors.text }]}>退出登录</Text>
            </TouchableOpacity>
            {confirmLogout ? (
              <InlineConfirm
                text="确认退出当前账号？"
                onConfirm={() => void logout()}
                onCancel={() => setConfirmLogout(false)}
              />
            ) : null}

            <TouchableOpacity
              style={[styles.rowBtn, styles.dangerBtn]}
              onPress={() => setConfirmDelete(true)}
              disabled={busy}
              activeOpacity={0.7}
            >
              <Text style={[styles.dangerText, { color: colors.danger }]}>注销账号</Text>
            </TouchableOpacity>
            {confirmDelete ? (
              <InlineConfirm
                text="注销将软删除账号与数据，且不可恢复。确认继续？"
                onConfirm={() => void deleteAccount()}
                onCancel={() => setConfirmDelete(false)}
              />
            ) : null}
          </Section>
        </>
      ) : (
        <>
          <Text style={[styles.welcome, { color: colors.text }]}>连接你的 CaloPlan</Text>
          <Text style={[styles.welcomeSub, { color: colors.textSecondary }]}>
            登录后通过 caloplan-user / caloplan-core / caloplan-chat 读写真实数据；
            未登录时页面展示 Demo 数据。
          </Text>
          <LoginForm
            busy={busy}
            error={error}
            onSubmit={submit}
            onSendCode={(email) => appServices.sendEmailCode(email, "register")}
          />
        </>
      )}
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>{children}</View>
    </View>
  );
}

function SettingRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.settingRow, !last && { borderBottomColor: colors.divider, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.settingValue, { color: colors.textSecondary }]}>{value}</Text>
    </View>
  );
}

function InlineConfirm({
  text,
  onConfirm,
  onCancel,
}: {
  text: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.confirmBox, { backgroundColor: colors.surfaceMuted }]}>
      <Text style={[styles.confirmText, { color: colors.text }]}>{text}</Text>
      <View style={styles.confirmActions}>
        <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: colors.surface }]} onPress={onCancel} activeOpacity={0.7}>
          <Text style={[styles.cancelText, { color: colors.textSecondary }]}>取消</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: colors.danger }]} onPress={onConfirm} activeOpacity={0.7}>
          <Text style={styles.okText}>确认</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function errMessage(err: unknown): string {
  const e = err as { statusCode?: number; message?: string };
  if (e?.statusCode === 404) return "服务地址不可达：请检查服务地址";
  // SDK 已把后端 detail（如"用户名或密码错误""密码必须包含字母…""验证码错误"）映射进 message
  return e?.message || String(err);
}

const styles = StyleSheet.create({
  back: {
    alignSelf: "flex-start",
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  backText: {
    ...typography.label,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    ...typography.title,
    fontSize: 20,
  },
  profileInfo: { flex: 1, gap: 1 },
  username: {
    ...typography.bodyStrong,
  },
  email: {
    ...typography.caption,
  },
  statusPill: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  statusPillText: {
    ...typography.caption,
  },
  welcome: {
    ...typography.title,
    marginBottom: spacing.sm,
  },
  welcomeSub: {
    ...typography.bodySmall,
    lineHeight: 21,
    marginBottom: spacing.lg,
  },
  section: { marginBottom: spacing.xl },
  sectionTitle: {
    ...typography.section,
    marginBottom: spacing.sm,
  },
  sectionCard: {
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  settingLabel: {
    ...typography.body,
  },
  settingValue: {
    ...typography.bodySmall,
  },
  rowBtn: {
    paddingVertical: spacing.md,
  },
  logoutBtn: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  logoutText: {
    ...typography.body,
  },
  dangerBtn: {},
  dangerText: {
    ...typography.body,
  },
  confirmBox: {
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  confirmText: {
    ...typography.bodySmall,
    lineHeight: 20,
  },
  confirmActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
  },
  confirmBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  cancelText: {
    ...typography.label,
  },
  okText: {
    ...typography.label,
    color: "#FFFFFF",
  },
});
