/**
 * Demo 模式聊天适配器（仅原型演示，非生产路径）。
 *
 * 模拟 caloplan-chat ChatClient 的最小接口（sessions / sendMessage /
 * confirm / cancel），使 AI 页在未登录时也能完整展示会话、流式、加载态、
 * 审批确认等 UI 状态。登录后 useChat 自动切换到真实 caloplan-chat。
 *
 * ⚠️ 本文件不参与任何真实数据链路：不访问 fastapi-chat-service、
 * 不写 localStorage、不进入 caloplan-* 模块。
 */
import type {
  ChatSession,
  ChatMessage,
  ChatStreamEvent,
  ChatSendResult,
  ChatConfirmResult,
  PendingAction,
  ChatToolCallRecord,
} from "caloplan-chat";
import { mockChatSeeds } from "./demoData";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let seedCounter = 0;
function nextId(prefix: string): string {
  seedCounter += 1;
  return `${prefix}-demo-${Date.now()}-${seedCounter}`;
}

/** 关键词 → mock 回复 */
function mockReply(content: string): string {
  const t = content;
  if (/蛋白质|蛋白/.test(t)) {
    return "你今天的蛋白质摄入约占目标的 72%。建议在晚餐补充 1 份鸡胸肉（约 150g，+33g 蛋白质）或一杯希腊酸奶。需要我把它加入你的晚餐记录吗？";
  }
  if (/碳水/.test(t)) {
    return "减脂期碳水建议按每公斤体重 2-3g 安排（你 70kg 约 140-210g/天），优先燕麦、糙米、薯类等低 GI 主食，训练日可适当上调。";
  }
  if (/晚餐|晚饭/.test(t)) {
    return "推荐高蛋白晚餐：香煎鸡胸肉 150g + 藜麦饭 100g + 烫西兰花 100g，约 380 kcal、蛋白质 45g，30 分钟可完成。需要我把这餐写入今晚记录吗？";
  }
  if (/体重|减脂|减肥/.test(t)) {
    return "你的 BMI 约 22.9，处于健康区间。建议每周减重 0.5-1kg 为宜：保持 300-500 kcal 的温和热量缺口，蛋白质按 1.6-2g/kg 摄入，配合每周 3-4 次力量训练。";
  }
  return "收到。我已根据你的记录生成营养建议：今天热量摄入约 1290 kcal，距离目标还有约 700 kcal 空间；建议优先补充蛋白质与蔬菜，晚餐后 1 小时可适度活动。需要我展开某个方面吗？";
}

/** 构造一次 mock 审批动作（演示用） */
function mockPendingAction(taskid: string): PendingAction {
  return {
    taskid,
    tools: [
      {
        toolCallId: nextId("tool"),
        name: "record_meal",
        arguments: { type: "dinner", note: "由 AI 助手生成" },
        description: "把推荐餐食写入今日记录",
      },
    ],
    createdAt: Date.now(),
    resolved: false,
  };
}

export class DemoChat {
  readonly sessions: {
    list(): ChatSession[];
    create(params?: { title?: string }): Promise<ChatSession>;
    delete(sessionId: string): Promise<void>;
  };

  private store: ChatSession[] = [];

  constructor() {
    this.store = mockChatSeeds.map((seed) => ({
      id: seed.id,
      title: seed.title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: seed.messages.map((m, i) => ({
        id: `${seed.id}-m${i}`,
        role: m.role,
        content: m.content,
        status: "completed",
        createdAt: Date.now() - (seed.messages.length - i) * 60_000,
      })),
    }));
    this.sessions = {
      list: () => this.store,
      create: async (params) => {
        const now = Date.now();
        const session: ChatSession = {
          id: nextId("s"),
          title: params?.title ?? "",
          messages: [],
          createdAt: now,
          updatedAt: now,
        };
        this.store.unshift(session);
        return session;
      },
      delete: async (sessionId) => {
        this.store = this.store.filter((s) => s.id !== sessionId);
      },
    };
  }

  async init(): Promise<void> {
    // demo：内存态即权威，无需恢复
  }

  private requireSession(sessionId: string): ChatSession {
    const s = this.store.find((x) => x.id === sessionId);
    if (!s) throw new Error(`会话不存在：${sessionId}`);
    return s;
  }

  async *sendMessage(
    sessionId: string,
    content: string,
  ): AsyncGenerator<ChatStreamEvent, void, unknown> {
    const session = this.requireSession(sessionId);
    const trimmed = content.trim();
    if (!trimmed) throw new Error("消息内容不能为空");

    const userMessage: ChatMessage = {
      id: nextId("m"),
      role: "user",
      content: trimmed,
      status: "completed",
      createdAt: Date.now(),
    };
    session.messages.push(userMessage);
    if (session.title === "") {
      session.title = trimmed.length > 24 ? `${trimmed.slice(0, 24)}…` : trimmed;
    }
    session.updatedAt = Date.now();

    const assistantMessage: ChatMessage = {
      id: nextId("m"),
      role: "assistant",
      content: "",
      status: "streaming",
      createdAt: Date.now(),
    };
    session.messages.push(assistantMessage);

    // 触发审批的演示词：消息含「记录/加入」时走审批流（确定性触发，便于演示）
    const needsApproval = /记录|加入/.test(trimmed);

    const full = mockReply(trimmed);
    const step = Math.max(6, Math.ceil(full.length / 14));
    let accumulated = "";

    for (let i = 0; i < full.length; i += step) {
      await sleep(28);
      accumulated += full.slice(i, i + step);
      assistantMessage.content = accumulated;
      yield {
        type: "text_delta",
        content: full.slice(i, i + step),
        assistantMessage,
      };
    }

    if (needsApproval) {
      const taskid = nextId("task");
      const pendingAction = mockPendingAction(taskid);
      assistantMessage.pendingAction = pendingAction;
      assistantMessage.status = "completed";
      yield { type: "approval", pendingAction };
    } else {
      assistantMessage.content = full;
      assistantMessage.status = "completed";
    }

    const result: ChatSendResult = {
      sessionId,
      userMessage,
      assistantMessage,
      conversationId: sessionId,
      needApproval: needsApproval,
      toolCalls: [],
    };
    yield { type: "done", result };
  }

  async confirm(taskid: string): Promise<ChatConfirmResult> {
    return this.resolveApproval(taskid, true);
  }

  async cancel(taskid: string): Promise<ChatConfirmResult> {
    return this.resolveApproval(taskid, false);
  }

  private async resolveApproval(
    taskid: string,
    approved: boolean,
  ): Promise<ChatConfirmResult> {
    await sleep(120);
    const toolCalls: ChatToolCallRecord[] = [
      {
        id: nextId("tool"),
        name: "record_meal",
        arguments: { type: "dinner" },
        result: approved ? { ok: true, id: nextId("meal") } : undefined,
      },
    ];
    const reply = approved
      ? "已把推荐餐食写入今晚记录，记得按量食用哦。"
      : "好的，已取消写入。还有其他需要调整的吗？";
    for (const s of this.store) {
      for (const m of s.messages) {
        if (m.pendingAction?.taskid === taskid) {
          m.pendingAction = { ...m.pendingAction, resolved: true, outcome: approved ? "approved" : "cancelled" };
          const replyMessage: ChatMessage = {
            id: nextId("m"),
            role: "assistant",
            content: reply,
            status: "completed",
            createdAt: Date.now(),
          };
          s.messages.push(replyMessage);
          s.updatedAt = Date.now();
        }
      }
    }
    return { taskid, approved, reply, toolResults: toolCalls };
  }
}
