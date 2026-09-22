/**
 * AI 页数据 Hook：统一暴露 caloplan-chat（真实）与 Demo 适配器（未登录）的会话/消息/流式/审批能力。
 *
 * 真实路径：RN → caloplan-chat（ChatClient）→ fastapi-chat-service
 * Demo 路径：RN → DemoChat（src/demo，仅原型）
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ChatClient,
  ChatSession,
  ChatContentBlock,
  PendingAction,
} from "caloplan-chat";
import { isChatError } from "caloplan-chat";
import { useIsDemo } from "./useAuth";
import { appServices } from "@/services/bootstrap";
import { DemoChat } from "@/demo/demoChat";

/** 真实 ChatClient 与 DemoChat 共有的最小接口 */
type ChatProviderLike = Pick<ChatClient, "init" | "sendMessage" | "confirm" | "cancel"> & {
  sessions: Pick<ChatClient["sessions"], "list" | "create" | "delete">;
};

let demoChat: DemoChat | null = null;
function getDemoChat(): DemoChat {
  if (demoChat == null) demoChat = new DemoChat();
  return demoChat;
}

/** 快照会话（React 渲染用：新数组引用触发重渲染） */
function snapshotSessions(list: ChatSession[]): ChatSession[] {
  return list.map((s) => ({
    ...s,
    messages: s.messages.map((m) => ({
      ...m,
      pendingAction: m.pendingAction
        ? { ...m.pendingAction, tools: m.pendingAction.tools.map((t) => ({ ...t })) }
        : undefined,
      toolCalls: m.toolCalls ? m.toolCalls.map((t) => ({ ...t })) : undefined,
      usage: m.usage ? { ...m.usage } : undefined,
    })),
  }));
}

function errMessage(err: unknown): string {
  if (isChatError(err)) return err.message;
  return err instanceof Error ? err.message : String(err);
}

/** 额度用尽是否应作为友好气泡展示（而非顶部错误条） */
function isQuotaError(err: unknown): boolean {
  return isChatError(err) && err.kind === "quota";
}

export interface ChatViewModel {
  initLoading: boolean;
  isDemo: boolean;
  error: string | null;
  sessions: ChatSession[];
  activeSessionId: string | null;
  activeSession: ChatSession | null;
  sending: boolean;
  streaming: boolean;
  pendingAction: PendingAction | null;
  createSession: () => Promise<void>;
  selectSession: (id: string) => void;
  deleteSession: (id: string) => Promise<void>;
  send: (text: string | ChatContentBlock[]) => Promise<void>;
  confirm: () => Promise<void>;
  cancel: () => Promise<void>;
  clearError: () => void;
}

export function useChat(): ChatViewModel {
  const isDemo = useIsDemo();
  const [initLoading, setInitLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const currentProvider = useCallback((): ChatProviderLike => {
    if (isDemo) return getDemoChat();
    return appServices.requireCPChat();
  }, [isDemo]);

  /* 登录态 / demo 切换时初始化会话 */
  useEffect(() => {
    let cancelled = false;
    async function setup() {
      setInitLoading(true);
      setError(null);
      try {
        const provider = currentProvider();
        await provider.init();
        if (cancelled) return;
        const list = snapshotSessions(provider.sessions.list());
        setSessions(list);
        setActiveSessionId((prev) =>
          prev && list.some((s) => s.id === prev) ? prev : list[0]?.id ?? null,
        );
      } catch (err) {
        if (!cancelled) setError(errMessage(err));
      } finally {
        if (!cancelled) setInitLoading(false);
      }
    }
    void setup();
    return () => {
      cancelled = true;
    };
  }, [currentProvider]);

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) ?? null,
    [sessions, activeSessionId],
  );

  const streaming = useMemo(
    () => activeSession?.messages.some((m) => m.status === "streaming") ?? false,
    [activeSession],
  );

  const pendingAction = useMemo(() => {
    const target = activeSession?.messages.find(
      (m) => m.pendingAction != null && !m.pendingAction.resolved,
    );
    return target?.pendingAction ?? null;
  }, [activeSession]);

  const refreshSessions = useCallback(
    (provider: ChatProviderLike) => {
      setSessions(snapshotSessions(provider.sessions.list()));
    },
    [],
  );

  /**
   * 额度用尽兜底：把后端友好文案作为一条 assistant 气泡展示（乐观追加到当前会话 state）。
   * 仅用于 SDK 抛 kind=quota 的路径（confirm / cancel，或旧版 SDK 的 send 防御）；
   * 新版 SDK 的 sendMessage 已在内部把友好回复写回 cache 并产出 quota_exceeded 事件，
   * 正常结束路径的 refreshSessions 会自动取到，无需走到这里。
   */
  const appendQuotaBubble = useCallback(
    (text: string) => {
      if (!activeSessionId) return;
      const bubble: ChatSession["messages"][number] = {
        id: `quota_${Date.now()}`,
        role: "assistant",
        content: text,
        status: "completed",
        createdAt: Date.now(),
      };
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? { ...s, messages: [...s.messages, bubble], updatedAt: Date.now() }
            : s,
        ),
      );
    },
    [activeSessionId],
  );

  const createSession = useCallback(async () => {
    try {
      const provider = currentProvider();
      const session = await provider.sessions.create();
      refreshSessions(provider);
      setActiveSessionId(session.id);
    } catch (err) {
      setError(errMessage(err));
    }
  }, [currentProvider, refreshSessions]);

  const selectSession = useCallback((id: string) => {
    setActiveSessionId(id);
    setError(null);
  }, []);

  const deleteSession = useCallback(
    async (id: string) => {
      try {
        const provider = currentProvider();
        await provider.sessions.delete(id);
        refreshSessions(provider);
        setActiveSessionId((prev) => (prev === id ? null : prev));
      } catch (err) {
        setError(errMessage(err));
      }
    },
    [currentProvider, refreshSessions],
  );

  const send = useCallback(
    async (text: string | ChatContentBlock[]) => {
      const trimmed =
        typeof text === "string"
          ? text.trim()
          : text.length > 0 && text.some((b) => (b.type === "text" ? (b.text ?? "").trim() : Boolean(b.imageUrl)))
            ? text
            : "";
      if (!trimmed || !activeSessionId || sending) return;
      setSending(true);
      setError(null);
      try {
        const provider = currentProvider();

        // 乐观显示：真实模式发送后立即把用户消息渲染出来
        // （provider 内部会在流开始时落盘同一条用户消息，刷新后自然替换，无需去重）
        if (!isDemo) {
          const optimistic: ChatSession["messages"][number] = {
            id: `local_${Date.now()}`,
            role: "user",
            content: trimmed,
            status: "completed",
            createdAt: Date.now(),
          };
          setSessions((prev) =>
            prev.map((s) =>
              s.id === activeSessionId
                ? {
                    ...s,
                    messages: [...s.messages, optimistic],
                    updatedAt: Date.now(),
                  }
                : s,
            ),
          );
        }

        // 流式渲染节流：传输保持逐增量，UI 每 RENDER_INTERVAL_MS 合并刷新一次，
        // 避免 token 级 setState 造成"刷屏式"渲染
        const RENDER_INTERVAL_MS = 80;
        let renderTimer: ReturnType<typeof setTimeout> | null = null;
        const scheduleRender = () => {
          if (renderTimer != null) return;
          renderTimer = setTimeout(() => {
            renderTimer = null;
            refreshSessions(provider);
          }, RENDER_INTERVAL_MS);
        };

        for await (const _ev of provider.sendMessage(activeSessionId, trimmed)) {
          scheduleRender();
        }
        if (renderTimer != null) {
          clearTimeout(renderTimer);
          renderTimer = null;
        }
        refreshSessions(provider);
      } catch (err) {
        // 额度用尽：以友好气泡呈现（新版 SDK 已写回 cache 并正常结束，此处仅兜底），
        // 不再刷新（乐观气泡在当前 state，刷新会被 cache 覆盖）
        if (isQuotaError(err)) {
          appendQuotaBubble(errMessage(err));
          return;
        }
        setError(errMessage(err));
        refreshSessions(currentProvider());
      } finally {
        setSending(false);
      }
    },
    [activeSessionId, sending, isDemo, currentProvider, refreshSessions],
  );

  const confirm = useCallback(async () => {
    if (!pendingAction) return;
    try {
      const provider = currentProvider();
      await provider.confirm(pendingAction.taskid);
      refreshSessions(provider);
    } catch (err) {
      // 审批确认时额度用尽：友好气泡展示（taskid 未被消费，卡片保留可重试）
      if (isQuotaError(err)) {
        appendQuotaBubble(errMessage(err));
        return;
      }
      setError(errMessage(err));
    }
  }, [pendingAction, currentProvider, refreshSessions, appendQuotaBubble]);

  const cancel = useCallback(async () => {
    if (!pendingAction) return;
    try {
      const provider = currentProvider();
      await provider.cancel(pendingAction.taskid);
      refreshSessions(provider);
    } catch (err) {
      if (isQuotaError(err)) {
        appendQuotaBubble(errMessage(err));
        return;
      }
      setError(errMessage(err));
    }
  }, [pendingAction, currentProvider, refreshSessions, appendQuotaBubble]);

  const clearError = useCallback(() => setError(null), []);

  return {
    initLoading,
    isDemo,
    error,
    sessions,
    activeSessionId,
    activeSession,
    sending,
    streaming,
    pendingAction,
    createSession,
    selectSession,
    deleteSession,
    send,
    confirm,
    cancel,
    clearError,
  };
}
