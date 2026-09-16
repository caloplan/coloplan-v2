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
    })),
  }));
}

function errMessage(err: unknown): string {
  if (isChatError(err)) return err.message;
  return err instanceof Error ? err.message : String(err);
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
        for await (const _ev of provider.sendMessage(activeSessionId, trimmed)) {
          refreshSessions(provider);
        }
        refreshSessions(provider);
      } catch (err) {
        setError(errMessage(err));
        refreshSessions(currentProvider());
      } finally {
        setSending(false);
      }
    },
    [activeSessionId, sending, currentProvider, refreshSessions],
  );

  const confirm = useCallback(async () => {
    if (!pendingAction) return;
    try {
      const provider = currentProvider();
      await provider.confirm(pendingAction.taskid);
      refreshSessions(provider);
    } catch (err) {
      setError(errMessage(err));
    }
  }, [pendingAction, currentProvider, refreshSessions]);

  const cancel = useCallback(async () => {
    if (!pendingAction) return;
    try {
      const provider = currentProvider();
      await provider.cancel(pendingAction.taskid);
      refreshSessions(provider);
    } catch (err) {
      setError(errMessage(err));
    }
  }, [pendingAction, currentProvider, refreshSessions]);

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
