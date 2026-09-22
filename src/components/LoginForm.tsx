/**
 * 登录 / 注册表单（Account 页）。
 * 注册模式需要邮箱验证码：先「获取验证码」（60s 冷却），再填写验证码。
 * 服务地址默认取 env，可展开修改（连接远程服务 / 本地服务）。
 */
import { createElement, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { radius, spacing, typography } from "@/theme";
import { useTheme } from "@/theme/ThemeProvider";
import { env } from "@/services/env";

export interface LoginFields {
  username: string;
  password: string;
  email: string;
  code: string;
  /** 姓名/昵称（注册可选，为空后端存 null，渲染时回退 username） */
  fullName: string;
  userUrl: string;
  metaUrl: string;
  chatUrl: string;
}

interface LoginFormProps {
  busy?: boolean;
  error?: string | null;
  onSubmit: (mode: "login" | "register", fields: LoginFields) => void;
  /** 发送邮箱验证码（注册模式使用）；由上层注入真实调用 */
  onSendCode?: (email: string) => Promise<void>;
}

/** 验证码重发冷却（秒） */
const CODE_COOLDOWN_SECONDS = 60;

function errMessage(err: unknown): string {
  const e = err as { statusCode?: number; message?: string };
  if (e?.statusCode === 429) return "发送过于频繁，请稍后再试";
  return e?.message ?? String(err);
}

export function LoginForm({ busy, error, onSubmit, onSendCode }: LoginFormProps) {
  const { colors } = useTheme();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [userUrl, setUserUrl] = useState(env.userUrl);
  const [metaUrl, setMetaUrl] = useState(env.metaUrl);
  const [chatUrl, setChatUrl] = useState(env.chatUrl);
  const [showUrls, setShowUrls] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // 密码强度（客户端与后端对齐：8-30 位 + 字母 + 数字 + 特殊字符）
  const pwChecks = useMemo(
    () => ({
      len: password.length >= 8 && password.length <= 30,
      letter: /[A-Za-z]/.test(password),
      digit: /\d/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    }),
    [password],
  );
  const pwOk = pwChecks.len && pwChecks.letter && pwChecks.digit && pwChecks.special;
  const pwScore = (pwChecks.len ? 1 : 0) + (pwChecks.letter ? 1 : 0) + (pwChecks.digit ? 1 : 0) + (pwChecks.special ? 1 : 0);

  const canSubmit =
    username.trim().length > 0 &&
    password.length > 0 &&
    (mode === "login" ||
      (pwOk && email.trim().length > 0 && code.trim().length > 0));

  const sendCode = async () => {
    if (codeBusy || cooldown > 0 || !email.trim()) return;
    setCodeBusy(true);
    setCodeError(null);
    try {
      await onSendCode?.(email.trim());
      setCodeSent(true);
      setCooldown(CODE_COOLDOWN_SECONDS);
    } catch (err) {
      setCodeSent(false);
      setCodeError(errMessage(err));
    } finally {
      setCodeBusy(false);
    }
  };

  const submit = () => {
    if (!canSubmit || busy) return;
    onSubmit(mode, {
      username: username.trim(),
      password,
      email: email.trim(),
      code: code.trim(),
      fullName: fullName.trim(),
      userUrl,
      metaUrl,
      chatUrl,
    });
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={[styles.modeRow, { backgroundColor: colors.surfaceMuted }]}>
          {(["login", "register"] as const).map((m) => {
            const active = mode === m;
            return (
              <TouchableOpacity
                key={m}
                style={[styles.modeTab, active && { backgroundColor: colors.surface }]}
                onPress={() => setMode(m)}
                activeOpacity={0.7}
              >
                <Text style={[styles.modeText, { color: active ? colors.text : colors.textSecondary }]}>
                  {m === "login" ? "登录" : "注册"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Field label="用户名" value={username} onChangeText={setUsername} placeholder="demo" autoCapitalize="none" />
        {mode === "register" ? (
          <>
            <Field label="姓名/昵称（可选）" value={fullName} onChangeText={setFullName} placeholder="怎么称呼你" maxLength={100} />
            <Field label="邮箱" value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" />
            <View style={styles.codeRow}>
              <View style={styles.codeInputWrap}>
                <Field
                  label="邮箱验证码"
                  value={code}
                  onChangeText={setCode}
                  placeholder="6 位数字"
                  autoCapitalize="none"
                  keyboardType="default"
                />
              </View>
              <TouchableOpacity
                style={[
                  styles.codeBtn,
                  { backgroundColor: codeBusy || cooldown > 0 ? colors.surfaceMuted : colors.accentSoft },
                ]}
                onPress={() => void sendCode()}
                disabled={codeBusy || cooldown > 0 || !email.trim()}
                activeOpacity={0.75}
              >
                <Text style={[styles.codeBtnText, { color: codeBusy || cooldown > 0 ? colors.textTertiary : colors.accent }]}>
                  {codeBusy ? "发送中…" : cooldown > 0 ? `${cooldown}s` : codeSent ? "重新获取" : "获取验证码"}
                </Text>
              </TouchableOpacity>
            </View>
            {codeError ? <Text style={[styles.codeError, { color: colors.danger }]}>{codeError}</Text> : null}
          </>
        ) : null}
        {/* 密码：可切换明文/密文；注册时实时校验强度 */}
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>密码</Text>
          <View style={[styles.pwWrap, { backgroundColor: colors.surfaceMuted }]}>
            <TextInput
              style={[styles.pwInput, { color: colors.text }]}
              value={password}
              onChangeText={setPassword}
              placeholder="8-30 位，含字母/数字/特殊字符"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((v) => !v)}
              activeOpacity={0.7}
              hitSlop={8}
              accessibilityLabel={showPassword ? "隐藏密码" : "显示密码"}
            >
              <Text style={[styles.pwEye, { color: colors.textSecondary }]}>
                {showPassword ? "🙈" : "👁"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {mode === "register" && password.length > 0 ? (
          <View style={styles.strengthBox}>
            <View style={styles.strengthBar}>
              {[0, 1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.strengthSeg,
                    {
                      backgroundColor:
                        i < pwScore
                          ? pwScore <= 1
                            ? colors.danger
                            : pwScore <= 2
                              ? colors.warning
                              : pwScore <= 3
                                ? colors.accent
                                : colors.accent
                          : colors.divider,
                    },
                  ]}
                />
              ))}
            </View>
            <CheckItem ok={pwChecks.len} label="8-30 位" colors={colors} />
            <CheckItem ok={pwChecks.letter} label="包含字母" colors={colors} />
            <CheckItem ok={pwChecks.digit} label="包含数字" colors={colors} />
            <CheckItem ok={pwChecks.special} label="包含特殊字符（如 @$!%*#?&）" colors={colors} />
          </View>
        ) : null}

        <TouchableOpacity style={styles.urlsToggle} onPress={() => setShowUrls((v) => !v)} activeOpacity={0.7}>
          <Text style={[styles.urlsToggleText, { color: colors.accent }]}>{showUrls ? "收起服务地址" : "服务地址（可选）"}</Text>
        </TouchableOpacity>
        {showUrls ? (
          <View style={styles.urlsBox}>
            <Field label="User 服务" value={userUrl} onChangeText={setUserUrl} placeholder="http://localhost:8000" autoCapitalize="none" />
            <Field label="Meta 服务" value={metaUrl} onChangeText={setMetaUrl} placeholder="http://localhost:9093" autoCapitalize="none" />
            <Field label="Chat 服务" value={chatUrl} onChangeText={setChatUrl} placeholder="http://localhost:9095" autoCapitalize="none" />
          </View>
        ) : null}

        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.submit, { backgroundColor: canSubmit && !busy ? colors.accent : colors.surfaceMuted }]}
          onPress={submit}
          disabled={!canSubmit || busy}
          activeOpacity={0.75}
        >
          <Text style={[styles.submitText, { color: canSubmit && !busy ? colors.textOnAccent : colors.textTertiary }]}>
            {busy ? "连接中…" : mode === "login" ? "登录" : "注册并登录"}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.hint, { color: colors.textTertiary }]}>
          注册需先获取邮箱验证码；登录后数据经由 caloplan-user / caloplan-core / caloplan-chat 模块读写；未登录时展示 Demo 数据。
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

function CheckItem({ ok, label, colors }: { ok: boolean; label: string; colors: ReturnType<typeof useTheme>["colors"] }) {
  return (
    <View style={styles.checkRow}>
      <Text style={[styles.checkDot, { color: ok ? colors.accent : colors.textTertiary }]}>
        {ok ? "✓" : "○"}
      </Text>
      <Text style={[styles.checkLabel, { color: ok ? colors.textSecondary : colors.textTertiary }]}>{label}</Text>
    </View>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences";
  keyboardType?: "email-address" | "default";
  maxLength?: number;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{props.label}</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surfaceMuted, color: colors.text }]}
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor={colors.textTertiary}
        secureTextEntry={props.secureTextEntry}
        autoCapitalize={props.autoCapitalize}
        keyboardType={props.keyboardType}
        maxLength={props.maxLength}
        autoCorrect={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modeRow: {
    flexDirection: "row",
    borderRadius: radius.full,
    padding: 3,
    gap: 3,
  },
  modeTab: {
    flex: 1,
    height: 34,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  modeText: {
    ...typography.label,
  },
  field: { gap: spacing.xs },
  fieldLabel: {
    ...typography.caption,
  },
  input: {
    height: 42,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    ...typography.body,
  },
  pwWrap: {
    flexDirection: "row",
    alignItems: "center",
    height: 42,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  pwInput: {
    flex: 1,
    height: 42,
    ...typography.body,
  },
  pwEye: {
    fontSize: 16,
    paddingLeft: spacing.sm,
  },
  strengthBox: {
    gap: 4,
  },
  strengthBar: {
    flexDirection: "row",
    gap: 4,
    marginBottom: spacing.xs,
  },
  strengthSeg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  checkDot: {
    ...typography.caption,
    width: 14,
  },
  checkLabel: {
    ...typography.caption,
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  codeInputWrap: {
    flex: 1,
  },
  codeBtn: {
    height: 42,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 0,
  },
  codeBtnText: {
    ...typography.caption,
    fontWeight: "600",
  },
  codeError: {
    ...typography.bodySmall,
  },
  passwordHint: {
    ...typography.caption,
    lineHeight: 18,
  },
  urlsToggle: {
    alignSelf: "flex-start",
    paddingVertical: spacing.xs,
  },
  urlsToggleText: {
    ...typography.caption,
  },
  urlsBox: { gap: spacing.md },
  error: {
    ...typography.bodySmall,
  },
  submit: {
    height: 44,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    ...typography.label,
  },
  hint: {
    ...typography.caption,
    lineHeight: 18,
  },
});
