import apiClient from './client';

export interface AiChatPayload {
  conversationId?: string;
  message: string;
  imageDataUrls?: string[];
}

export interface AiArtifact {
  id: string;
  name: string;
  type: 'docx' | 'xlsx';
  url: string;
  description?: string;
  createTime?: string;
}

export interface AiChatResponse {
  conversationId: string;
  answer: string;
  toolContext?: unknown;
  artifacts?: AiArtifact[];
  createTime?: string;
}

export interface AiChatConversationMessage {
  id?: string | number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createTime?: string;
  toolContext?: unknown;
  artifacts?: AiArtifact[];
}

export interface AiChatConversationSummary {
  id: string;
  title?: string;
  lastMessage?: string;
  createTime?: string;
  updateTime?: string;
}

export interface AiChatConversationDetail extends AiChatConversationSummary {
  messages?: AiChatConversationMessage[];
}

interface StreamHandlers {
  signal?: AbortSignal;
  onToken?: (token: string, answer: string) => void;
  onProgress?: (message: string) => void;
  onConversationId?: (conversationId: string) => void;
  onToolContext?: (toolContext: unknown) => void;
  onArtifacts?: (artifacts: AiArtifact[]) => void;
  onCreateTime?: (createTime: string) => void;
}

interface ParsedStreamEvent {
  eventName: string;
  data: string;
}

export function sendAiChatMessage(payload: AiChatPayload): Promise<AiChatResponse> {
  return apiClient
    .post('/ai/chat', payload, { timeout: 60000 })
    .then((data) => normalizeAiChatResponse(data));
}

export async function streamAiChatMessage(
  payload: AiChatPayload,
  handlers: StreamHandlers = {},
): Promise<AiChatResponse> {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/ai/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
    signal: handlers.signal,
  });

  if (!response.ok) {
    throw new Error(`AI stream failed: ${response.status}`);
  }
  if (!response.body) {
    throw new Error('AI stream is empty');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let answer = '';
  let conversationId = payload.conversationId ?? '';
  let toolContext: unknown;
  let artifacts: AiArtifact[] = [];
  let createTime = '';
  let received = false;

  const applyEvent = (event: ParsedStreamEvent) => {
    if (!event.data || event.data === '[DONE]') return;
    received = true;

    const parsed = parseEventData(event.data);
    const data = unwrapResult(parsed);
    if (event.eventName === 'progress') {
      const message = isRecord(data)
        ? valueToString(data.message ?? data.text ?? data.status)
        : valueToString(data);
      if (message) handlers.onProgress?.(message);
      return;
    }

    if (event.eventName === 'error') {
      const message = typeof data === 'object' && data && 'message' in data
        ? String((data as { message?: unknown }).message ?? 'AI stream failed')
        : 'AI stream failed';
      throw new Error(message);
    }

    if (isRecord(data)) {
      const nextConversationId = valueToString(data.conversationId ?? data.id);
      if (nextConversationId) {
        conversationId = nextConversationId;
        handlers.onConversationId?.(nextConversationId);
      }

      if (data.toolContext !== undefined) {
        toolContext = data.toolContext;
        handlers.onToolContext?.(toolContext);
      }

      if (data.artifacts !== undefined) {
        artifacts = normalizeArtifacts(data.artifacts);
        handlers.onArtifacts?.(artifacts);
      }

      const nextCreateTime = valueToString(data.createTime);
      if (nextCreateTime) {
        createTime = nextCreateTime;
        handlers.onCreateTime?.(nextCreateTime);
      }

      const fullAnswer = valueToString(data.answer);
      const delta = valueToString(data.delta ?? data.token ?? data.content ?? data.text);
      const tokenText = getTokenText(answer, fullAnswer, delta);
      if (tokenText) {
        answer += tokenText;
        handlers.onToken?.(tokenText, answer);
      }
      return;
    }

    const tokenText = valueToString(data);
    if (tokenText) {
      answer += tokenText;
      handlers.onToken?.(tokenText, answer);
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split(/\r?\n\r?\n/);
    buffer = parts.pop() ?? '';
    for (const part of parts) {
      applyEvent(parseSseEvent(part));
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) {
    applyEvent(parseSseEvent(buffer));
  }

  if (!received && !answer) {
    throw new Error('AI stream has no response');
  }

  return normalizeAiChatResponse({
    conversationId,
    answer,
    toolContext,
    artifacts,
    createTime,
  });
}

export function listAiConversations(): Promise<AiChatConversationSummary[]> {
  return apiClient.get('/ai/chat/conversations');
}

export function getAiConversation(id: string): Promise<AiChatConversationDetail> {
  return apiClient.get(`/ai/chat/conversations/${encodeURIComponent(id)}`);
}

export function deleteAiConversation(id: string): Promise<void> {
  return apiClient.delete(`/ai/chat/conversations/${encodeURIComponent(id)}`);
}

function normalizeAiChatResponse(value: unknown): AiChatResponse {
  const data = unwrapResult(value);
  if (!isRecord(data)) {
    return {
      conversationId: '',
      answer: valueToString(data),
      artifacts: [],
      createTime: new Date().toISOString(),
    };
  }

  return {
    conversationId: valueToString(data.conversationId ?? data.id),
    answer: valueToString(data.answer ?? data.content ?? data.text),
    toolContext: data.toolContext,
    artifacts: normalizeArtifacts(data.artifacts),
    createTime: valueToString(data.createTime) || new Date().toISOString(),
  };
}

function normalizeArtifacts(value: unknown): AiArtifact[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!isRecord(item)) return null;
      const type = valueToString(item.type).toLowerCase();
      const url = valueToString(item.url);
      if (!url || (type !== 'docx' && type !== 'xlsx')) return null;
      const artifact: AiArtifact = {
        id: valueToString(item.id) || url,
        name: valueToString(item.name) || (type === 'xlsx' ? 'AI 生成表格.xlsx' : 'AI 生成文档.docx'),
        type,
        url,
        description: valueToString(item.description),
        createTime: valueToString(item.createTime),
      };
      return artifact;
    })
    .filter((item): item is AiArtifact => Boolean(item));
}

function parseSseEvent(raw: string): ParsedStreamEvent {
  const lines = raw.split(/\r?\n/);
  let eventName = 'message';
  const dataLines: string[] = [];

  for (const line of lines) {
    if (!line || line.startsWith(':')) continue;
    if (line.startsWith('event:')) {
      eventName = line.slice(6).trim() || 'message';
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  return {
    eventName,
    data: dataLines.length > 0 ? dataLines.join('\n') : raw.trim(),
  };
}

function parseEventData(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function unwrapResult(value: unknown): unknown {
  if (!isRecord(value)) return value;
  if ('data' in value && ('code' in value || 'message' in value || 'msg' in value)) {
    return value.data;
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function valueToString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function getTokenText(currentAnswer: string, fullAnswer: string, delta: string): string {
  if (fullAnswer) {
    return fullAnswer.startsWith(currentAnswer)
      ? fullAnswer.slice(currentAnswer.length)
      : fullAnswer;
  }
  return delta;
}
