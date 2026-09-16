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
import { colors, radius, spacing, typography } from "@/theme";
import { useAuth } from "@/hooks/useAuth";
import { appServices } from "@/services/bootstrap";

interface AccountScreenProps {
  onBack: () => void;
}

export function AccountScreen({ onBack }: AccountScreenProps) {
  const auth = useAuth();
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
        <Text style={styles.backText}>‹ 返回</Text>
      </TouchableOpacity>

      {auth.status === "authenticated" && auth.profile ? (
        <>
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{auth.profile.username.slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.username}>{auth.profile.username}</Text>
              <Text style={styles.email}>{auth.profile.email}</Text>
              {auth.profile.full_name ? (
                <Text style={styles.email}>{auth.profile.full_name}</Text>
              ) : null}
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>已登录</Text>
            </View>
          </View>

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
              style={[styles.rowBtn, styles.logoutBtn]}
              onPress={() => setConfirmLogout(true)}
              disabled={busy}
              activeOpacity={0.7}
            >
              <Text style={styles.logoutText}>退出登录</Text>
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
              <Text style={styles.dangerText}>注销账号</Text>
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
          <Text style={styles.welcome}>连接你的 CaloPlan</Text>
          <Text style={styles.welcomeSub}>
            登录后通过 caloplan-user / caloplan-core / caloplan-chat 读写真实数据；
            未登录时页面展示 Demo 数据。
          </Text>
          <LoginForm busy={busy} error={error} onSubmit={submit} />
        </>
      )}
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function SettingRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.settingRow, !last && styles.settingBorder]}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Text style={styles.settingValue}>{value}</Text>
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
  return (
    <View style={styles.confirmBox}>
      <Text style={styles.confirmText}>{text}</Text>
      <View style={styles.confirmActions}>
        <TouchableOpacity style={[styles.confirmBtn, styles.cancelBtn]} onPress={onCancel} activeOpacity={0.7}>
          <Text style={styles.cancelText}>取消</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.confirmBtn, styles.okBtn]} onPress={onConfirm} activeOpacity={0.7}>
          <Text style={styles.okText}>确认</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function errMessage(err: unknown): string {
  const e = err as { statusCode?: number; message?: string };
  if (e?.statusCode === 401) return "登录失败（401）：账号或密码错误";
  if (e?.statusCode === 404) return "服务地址不可达（404）：请检查服务地址";
  return e?.message ?? String(err);
}

const styles = StyleSheet.create({
  back: {
    alignSelf: "flex-start",
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  backText: {
    ...typography.label,
    color: colors.accent,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    ...typography.title,
    fontSize: 20,
    color: colors.textOnAccent,
  },
  profileInfo: { flex: 1, gap: 1 },
  username: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  email: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statusPill: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  statusPillText: {
    ...typography.caption,
    color: colors.accent,
  },
  welcome: {
    ...typography.title,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  welcomeSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 21,
    marginBottom: spacing.lg,
  },
  section: { marginBottom: spacing.xl },
  sectionTitle: {
    ...typography.section,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  settingBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  settingLabel: {
    ...typography.body,
    color: colors.text,
  },
  settingValue: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  rowBtn: {
    paddingVertical: spacing.md,
  },
  logoutBtn: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  logoutText: {
    ...typography.body,
    color: colors.text,
  },
  dangerBtn: {},
  dangerText: {
    ...typography.body,
    color: colors.danger,
  },
  confirmBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  confirmText: {
    ...typography.bodySmall,
    color: colors.text,
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
  cancelBtn: {
    backgroundColor: colors.surface,
  },
  okBtn: {
    backgroundColor: colors.danger,
  },
  cancelText: {
    ...typography.label,
    color: colors.textSecondary,
  },
  okText: {
    ...typography.label,
    color: "#FFFFFF",
  },
});
