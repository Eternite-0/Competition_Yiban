import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  deleteAiConversation,
  getAiConversation,
  listAiConversations,
  sendAiChatMessage,
  streamAiChatMessage,
  type AiChatConversationMessage,
  type AiChatConversationSummary,
} from '../../api/aiChat';
import { panelTransition, smoothEase } from '../../lib/motion';
import { useStore } from '../../store/useStore';
import avatarBlue from '../../assets/ai/avatar-blue.svg';
import avatarClassic from '../../assets/ai/avatar-classic.svg';
import avatarMint from '../../assets/ai/avatar-mint.svg';
import avatarSunset from '../../assets/ai/avatar-sunset.svg';
import avatarWarm from '../../assets/ai/avatar-warm.svg';
import ChatInputBar from './ChatInputBar';
import ChatMessageList, { type AssistantChatMessage } from './ChatMessageList';
import QuickPromptChips from './QuickPromptChips';
import type { AvatarMotion, AvatarStyle, ChatImageAttachment } from './types';

type RequestStatus = 'idle' | 'loading' | 'streaming' | 'error';
export type AssistantPanelMode = 'floating' | 'sidebar';

interface FailedTurn {
  raw: string;
  attachments: ChatImageAttachment[];
}

interface AIAssistantWidgetProps {
  onWorkspaceChange?: (state: { open: boolean; mode: AssistantPanelMode }) => void;
}

const MAX_IMAGE_COUNT = 4;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

const statusText: Record<RequestStatus, string> = {
  idle: '在线',
  loading: '思考中',
  streaming: '生成中',
  error: '异常',
};

const motionLabels: Record<AvatarMotion, string> = {
  calm: '轻柔',
  active: '活泼',
  still: '静止',
};

const avatarStyleLabels: Record<AvatarStyle, string> = {
  classic: '小星',
  blue: '学士帽',
  warm: '灵感花',
  mint: '薄荷叶',
  sunset: '晚霞',
};

const avatarStyles = Object.keys(avatarStyleLabels) as AvatarStyle[];
const avatarAssets: Record<AvatarStyle, string> = {
  classic: avatarClassic,
  blue: avatarBlue,
  warm: avatarWarm,
  mint: avatarMint,
  sunset: avatarSunset,
};

const panelModeLabels: Record<AssistantPanelMode, string> = {
  floating: '浮层',
  sidebar: '侧栏',
};

export default function AIAssistantWidget({ onWorkspaceChange }: AIAssistantWidgetProps) {
  const user = useStore((state) => state.currentUser);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<AssistantChatMessage[]>([]);
  const [attachments, setAttachments] = useState<ChatImageAttachment[]>([]);
  const [conversationId, setConversationId] = useState<string>();
  const [conversations, setConversations] = useState<AiChatConversationSummary[]>([]);
  const [conversationMenuOpen, setConversationMenuOpen] = useState(false);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [status, setStatus] = useState<RequestStatus>('idle');
  const [failedTurn, setFailedTurn] = useState<FailedTurn | null>(null);
  const [customizing, setCustomizing] = useState(false);
  const [panelMode, setPanelMode] = useState<AssistantPanelMode>(() => (
    readStoredOption('yiban.ai.panel-mode', 'floating', panelModeLabels)
  ));
  const [assistantName, setAssistantName] = useState(() => (
    typeof localStorage === 'undefined' ? '易小助' : localStorage.getItem('yiban.ai.name') || '易小助'
  ));
  const [avatarMotion, setAvatarMotion] = useState<AvatarMotion>(() => (
    readStoredOption('yiban.ai.motion', 'calm', motionLabels)
  ));
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>(() => (
    readStoredOption('yiban.ai.avatar-style', 'classic', avatarStyleLabels)
  ));
  const abortRef = useRef<AbortController | null>(null);
  const isBusy = status === 'loading' || status === 'streaming';
  const hasMessages = messages.length > 0;

  const openAssistant = useCallback(() => {
    setOpen(true);
    onWorkspaceChange?.({ open: true, mode: panelMode });
  }, [onWorkspaceChange, panelMode]);

  const closeAssistant = useCallback(() => {
    setOpen(false);
    onWorkspaceChange?.({ open: false, mode: panelMode });
  }, [onWorkspaceChange, panelMode]);

  const toggleAssistant = useCallback(() => {
    const nextOpen = !open;
    setOpen(nextOpen);
    onWorkspaceChange?.({ open: nextOpen, mode: panelMode });
  }, [onWorkspaceChange, open, panelMode]);

  const togglePanelMode = useCallback(() => {
    const nextMode = panelMode === 'sidebar' ? 'floating' : 'sidebar';
    setPanelMode(nextMode);
    onWorkspaceChange?.({ open: true, mode: nextMode });
  }, [onWorkspaceChange, panelMode]);

  const refreshConversations = useCallback(async () => {
    try {
      const records = await listAiConversations();
      setConversations(Array.isArray(records) ? records : []);
    } catch (error) {
      console.warn('Unable to load AI conversations.', error);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setConversationMenuOpen(false);
        setCustomizing(false);
        closeAssistant();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeAssistant]);

  useEffect(() => {
    if (!open) return;
    void refreshConversations();
    if (!window.matchMedia('(max-width: 767px)').matches) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open, refreshConversations]);

  useEffect(() => {
    localStorage.setItem('yiban.ai.panel-mode', panelMode);
  }, [panelMode]);

  useEffect(() => {
    onWorkspaceChange?.({ open, mode: panelMode });
  }, [onWorkspaceChange, open, panelMode]);

  useEffect(() => {
    localStorage.setItem('yiban.ai.motion', avatarMotion);
  }, [avatarMotion]);

  useEffect(() => {
    localStorage.setItem('yiban.ai.avatar-style', avatarStyle);
  }, [avatarStyle]);

  useEffect(() => {
    localStorage.setItem('yiban.ai.name', assistantName);
  }, [assistantName]);

  const updateAssistantMessage = (id: string, patch: Partial<AssistantChatMessage>) => {
    setMessages((prev) => prev.map((message) => (
      message.id === id ? { ...message, ...patch } : message
    )));
  };

  const handleSend = async (
    rawMessage?: string,
    attachmentOverride?: ChatImageAttachment[],
  ) => {
    const raw = (rawMessage ?? input).trim();
    const selectedAttachments = attachmentOverride ?? attachments;
    if ((!raw && selectedAttachments.length === 0) || isBusy) return;

    const displayText = raw || '请分析图片附件';
    const message = displayText;
    const imageDataUrls = selectedAttachments.map((attachment) => attachment.dataUrl);

    openAssistant();
    setInput('');
    setAttachments([]);
    setCustomizing(false);
    setConversationMenuOpen(false);
    setStatus('loading');
    setFailedTurn(null);

    const userMessage: AssistantChatMessage = {
      id: createMessageId(),
      role: 'user',
      content: displayText,
      attachments: selectedAttachments,
      status: 'done',
      createTime: new Date().toISOString(),
    };
    const assistantMessage: AssistantChatMessage = {
      id: createMessageId(),
      role: 'assistant',
      content: '',
      status: 'sending',
    };
    setMessages((prev) => [...prev, userMessage, assistantMessage]);

    const currentConversationId = conversationId;
    const payload = {
      conversationId: currentConversationId,
      message,
      imageDataUrls: imageDataUrls.length ? imageDataUrls : undefined,
    };
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const streamResponse = await streamAiChatMessage(
        payload,
        {
          signal: controller.signal,
          onConversationId: (id) => setConversationId(id),
          onProgress: (message) => {
            updateAssistantMessage(assistantMessage.id, {
              progress: { message, createTime: new Date().toISOString() },
              status: 'sending',
            });
          },
          onToken: (_token, answer) => {
            setStatus('streaming');
            updateAssistantMessage(assistantMessage.id, {
              content: answer,
              status: 'streaming',
            });
          },
          onArtifacts: (artifacts) => {
            updateAssistantMessage(assistantMessage.id, {
              artifacts,
            });
          },
        },
      );

      setConversationId(streamResponse.conversationId || currentConversationId);
      updateAssistantMessage(assistantMessage.id, {
        content: streamResponse.answer || '暂无回复',
        status: 'done',
        toolContext: streamResponse.toolContext,
        artifacts: streamResponse.artifacts,
        createTime: streamResponse.createTime,
        progress: undefined,
      });
      setStatus('idle');
      void refreshConversations();
      return;
    } catch (streamError) {
      if (controller.signal.aborted) return;
      console.warn('AI stream failed, falling back to normal chat.', streamError);
    }

    try {
      setStatus('loading');
      updateAssistantMessage(assistantMessage.id, {
        content: '',
        status: 'sending',
      });
      const response = await sendAiChatMessage(payload);
      setConversationId(response.conversationId || currentConversationId);
      updateAssistantMessage(assistantMessage.id, {
        content: response.answer || '暂无回复',
        status: 'done',
        toolContext: response.toolContext,
        artifacts: response.artifacts,
        createTime: response.createTime,
      });
      setStatus('idle');
      void refreshConversations();
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      updateAssistantMessage(assistantMessage.id, {
        content: '回复失败',
        status: 'error',
        error: errorMessage,
      });
      setFailedTurn({ raw: displayText, attachments: selectedAttachments });
      setStatus('error');
      toast.error(errorMessage);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  const handleRetry = () => {
    if (!failedTurn || isBusy) return;
    const retryTurn = failedTurn;
    setMessages((prev) => removeLastFailedTurn(prev));
    setFailedTurn(null);
    void handleSend(retryTurn.raw, retryTurn.attachments);
  };

  const handleReset = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setInput('');
    setAttachments([]);
    setConversationId(undefined);
    setFailedTurn(null);
    setStatus('idle');
    setConversationMenuOpen(false);
    setCustomizing(false);
  };

  const handleSelectConversation = async (id: string) => {
    if (isBusy) {
      toast.info('请等待当前回复完成后再切换对话');
      return;
    }
    setConversationLoading(true);
    try {
      const detail = await getAiConversation(id);
      const history = (detail.messages ?? [])
        .filter((message) => message.role !== 'system')
        .map(toAssistantChatMessage);
      setConversationId(String(detail.id ?? id));
      setMessages(history);
      setInput('');
      setAttachments([]);
      setFailedTurn(null);
      setStatus('idle');
      setConversationMenuOpen(false);
      setCustomizing(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setConversationLoading(false);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await deleteAiConversation(id);
      if (String(conversationId) === String(id)) {
        handleReset();
      }
      await refreshConversations();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleAddImages = useCallback((files: File[]) => {
    if (!files.length) return;
    const validFiles: File[] = [];
    let rejectedNonImage = false;
    let rejectedUnsupported = false;
    let rejectedOversized = false;

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        rejectedNonImage = true;
        continue;
      }
      if (!SUPPORTED_IMAGE_TYPES.has(file.type.toLowerCase())) {
        rejectedUnsupported = true;
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        rejectedOversized = true;
        continue;
      }
      validFiles.push(file);
    }

    if (rejectedNonImage) toast.warning('附件仅支持图片，请重新选择');
    if (rejectedUnsupported) toast.warning('仅支持 PNG、JPG、WebP 或 GIF 图片');
    if (rejectedOversized) toast.warning('单张图片不能超过 5MB');

    const remaining = Math.max(MAX_IMAGE_COUNT - attachments.length, 0);
    if (remaining === 0) {
      toast.warning(`单次最多添加 ${MAX_IMAGE_COUNT} 张图片`);
      return;
    }
    if (validFiles.length > remaining) {
      toast.warning(`单次最多添加 ${MAX_IMAGE_COUNT} 张图片`);
    }

    Promise.all(validFiles.slice(0, remaining).map(readImageFile))
      .then((created) => setAttachments((prev) => [...prev, ...created].slice(0, MAX_IMAGE_COUNT)))
      .catch(() => toast.error('图片读取失败，请重新选择'));
  }, [attachments.length]);

  const activeConversation = conversations.find((item) => String(item.id) === String(conversationId));
  const activeTitle = activeConversation?.title?.trim() || '新建 AI 对话';
  const panelClassName = panelMode === 'sidebar'
    ? 'ai-assistant-panel ai-assistant-dock fixed inset-x-2 bottom-0 z-50 flex h-[72svh] max-h-[590px] flex-col overflow-hidden rounded-b-none rounded-t-[22px] border border-border/60 bg-canvas text-ink shadow-[0_-4px_40px_rgba(15,23,42,0.08),0_0_0_1px_rgba(15,23,42,0.03)] md:inset-y-0 md:left-auto md:right-0 md:h-screen md:max-h-none md:rounded-none md:border-y-0 md:border-r-0 md:shadow-none'
    : 'ai-assistant-panel ai-assistant-float fixed inset-x-2 bottom-0 z-50 flex h-[72svh] max-h-[590px] flex-col overflow-hidden rounded-b-none rounded-t-[22px] border border-border/60 bg-canvas text-ink shadow-[0_-4px_40px_rgba(15,23,42,0.08),0_0_0_1px_rgba(15,23,42,0.03)] md:inset-auto md:bottom-20 md:right-6 md:h-[min(600px,calc(100vh-140px))] md:w-[400px] md:rounded-[20px] md:shadow-[0_24px_80px_rgba(15,23,42,0.14),0_0_0_1px_rgba(15,23,42,0.04)]';
  const panelMotion = panelMode === 'sidebar'
    ? {
        initial: { opacity: 0, x: 36 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 36 },
        transition: { duration: 0.34, ease: smoothEase },
      }
    : {
        initial: { opacity: 0, y: 24, scale: 0.97 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 16, scale: 0.97 },
        transition: { duration: 0.25, ease: smoothEase },
      };

  return (
    <>
      <motion.button
        type="button"
        whileTap={{ scale: 0.92 }}
        onClick={toggleAssistant}
        className="ai-assistant-launcher fixed bottom-5 right-4 z-50 grid h-12 w-12 place-items-center rounded-full border border-border/80 bg-canvas text-body shadow-[0_8px_30px_rgba(15,23,42,0.12),0_0_0_1px_rgba(15,23,42,0.05)] transition hover:shadow-[0_12px_40px_rgba(15,23,42,0.18)] md:bottom-6 md:right-6"
        aria-label={open ? '关闭 AI 助手' : '打开 AI 助手'}
        title="AI 助手"
      >
        <img
          className="ai-launcher-avatar"
          src={avatarAssets[avatarStyle]}
          alt=""
          draggable={false}
        />
        {open && (
          <span className="ai-launcher-close material-symbols-outlined" aria-hidden="true">
            close
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={panelTransition}
            onClick={closeAssistant}
            className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-[2px] md:hidden"
            aria-label="关闭 AI 助手"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.aside
            layout
            initial={panelMotion.initial}
            animate={panelMotion.animate}
            exit={panelMotion.exit}
            transition={{
              ...panelMotion.transition,
              layout: { duration: 0.34, ease: smoothEase },
            }}
            className={panelClassName}
            role="dialog"
            aria-modal="false"
            aria-label="AI 助手"
          >
            <header className="relative z-10 flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border/50 bg-canvas/80 px-3 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setConversationMenuOpen((value) => !value)}
                className="inline-flex min-w-0 max-w-[250px] items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-footnote font-medium text-body transition hover:bg-surface-tile-2/80"
                aria-expanded={conversationMenuOpen}
                aria-label="切换 AI 对话"
              >
                <span className="material-symbols-outlined text-[18px] text-placeholder">chat_bubble</span>
                <span className="truncate">{activeTitle}</span>
                <span className={`material-symbols-outlined text-[16px] text-placeholder transition-transform ${conversationMenuOpen ? 'rotate-180' : ''}`}>
                  keyboard_arrow_down
                </span>
              </button>
              <div className="ml-auto hidden items-center gap-1 md:flex">
                <button
                  type="button"
                  onClick={togglePanelMode}
                  className="grid h-8 w-8 place-items-center rounded-[9px] text-placeholder transition hover:bg-surface-tile-2 hover:text-body"
                  aria-label={panelMode === 'sidebar' ? '收回浮层' : '扩展工作区'}
                  title={panelMode === 'sidebar' ? '收回浮层' : '扩展工作区'}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {panelMode === 'sidebar' ? 'close_fullscreen' : 'open_in_full'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={closeAssistant}
                  className="grid h-8 w-8 place-items-center rounded-[9px] text-placeholder transition hover:bg-surface-tile-2 hover:text-body"
                  aria-label="关闭 AI 助手"
                  title="关闭"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            </header>

            {/* Conversation dropdown - positioned outside header to escape overflow-hidden */}
            <AnimatePresence>
              {conversationMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
                  className="absolute left-3 top-12 z-30 w-[260px] overflow-hidden rounded-[14px] border border-border/70 bg-canvas py-1.5 shadow-[0_16px_48px_rgba(15,23,42,0.14)]"
                >
                  {/* Invisible backdrop to close menu on outside click */}
                  <button
                    type="button"
                    className="fixed inset-0 z-[-1] cursor-default"
                    onClick={() => setConversationMenuOpen(false)}
                    aria-label="关闭对话菜单"
                  />
                    <button
                      type="button"
                      onClick={handleReset}
                      className="flex h-9 w-full items-center gap-2 px-3 text-left text-footnote font-medium text-ink transition hover:bg-surface-tile-1"
                    >
                      <span className="material-symbols-outlined text-[17px]">add_comment</span>
                      新建对话
                    </button>
                    <div className="mx-3 my-1 border-t border-hairline" />
                    <div className="max-h-60 overflow-y-auto">
                      {conversationLoading ? (
                        <div className="px-3 py-3 text-caption text-placeholder">正在加载对话...</div>
                      ) : conversations.length === 0 ? (
                        <div className="px-3 py-3 text-caption text-placeholder">暂无历史对话</div>
                      ) : (
                        conversations.map((conversation) => {
                          const selected = String(conversation.id) === String(conversationId);
                          return (
                            <div
                              key={conversation.id}
                              className={`group flex items-center ${
                                selected ? 'bg-primary-soft' : 'hover:bg-surface-tile-1'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => void handleSelectConversation(String(conversation.id))}
                                className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-caption text-body-muted"
                              >
                                <span className="truncate">{conversation.title || conversation.lastMessage || '未命名对话'}</span>
                                {selected && <span className="material-symbols-outlined ml-auto text-[14px] text-primary">check</span>}
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteConversation(String(conversation.id))}
                                className="mr-2 grid h-7 w-7 shrink-0 place-items-center rounded-[8px] text-placeholder transition hover:bg-danger-bg hover:text-error"
                                aria-label="删除对话"
                                title="删除对话"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative min-h-0 flex-1 overflow-hidden">
              {customizing && typeof document !== 'undefined' && createPortal(
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm"
                    onMouseDown={(event) => {
                      if (event.target === event.currentTarget) setCustomizing(false);
                    }}
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 12, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.97 }}
                      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                      className="relative w-full max-w-[440px] overflow-hidden rounded-[18px] border border-border bg-canvas text-ink shadow-[0_32px_100px_rgba(15,23,42,0.25)]"
                      role="dialog"
                      aria-modal="true"
                      aria-label="个性化 AI 助手"
                    >
                      <div className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-callout font-semibold text-ink">个性化你的 AI 助手</h3>
                            <p className="mt-0.5 text-caption text-placeholder">选择头像风格和装饰</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setCustomizing(false)}
                            className="grid h-8 w-8 place-items-center rounded-full bg-surface-tile-2 text-placeholder transition hover:bg-surface-tile-3 hover:text-body"
                            aria-label="关闭个性化"
                          >
                            <span className="material-symbols-outlined text-[18px]">close</span>
                          </button>
                        </div>

                        {/* Avatar preview with carousel */}
                        <div className="mt-6 flex items-center justify-center gap-4">
                          <button
                            type="button"
                            onClick={() => setAvatarStyle(cycleAvatarStyle(avatarStyle, -1))}
                            className="grid h-8 w-8 place-items-center rounded-full border border-border text-placeholder transition hover:border-border-emphasis hover:bg-surface-tile-1 hover:text-body"
                            aria-label="上一个头像"
                          >
                            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                          </button>
                          <div className="relative">
                            <AvatarFace motion={avatarMotion} style={avatarStyle} preview />
                            <div className="mt-2 text-center text-caption font-medium text-body-muted">
                              {avatarStyleLabels[avatarStyle]}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAvatarStyle(cycleAvatarStyle(avatarStyle, 1))}
                            className="grid h-8 w-8 place-items-center rounded-full border border-border text-placeholder transition hover:border-border-emphasis hover:bg-surface-tile-1 hover:text-body"
                            aria-label="下一个头像"
                          >
                            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                          </button>
                        </div>

                        {/* Name input */}
                        <div className="mt-5">
                          <label className="mb-1.5 block text-caption-2 font-medium uppercase tracking-wider text-placeholder">助手名称</label>
                          <input
                            value={assistantName}
                            onChange={(event) => setAssistantName(event.target.value.slice(0, 12))}
                            placeholder="给助手起个名字"
                            className="block h-10 w-full rounded-[11px] border border-border bg-surface-tile-1/50 px-3 text-subhead text-ink outline-none transition placeholder:text-placeholder focus:border-border-emphasis focus:bg-canvas focus:ring-2 focus:ring-primary/15"
                          />
                        </div>

                        {/* Avatar style grid */}
                        <div className="mt-5">
                          <label className="mb-2 block text-caption-2 font-medium uppercase tracking-wider text-placeholder">头像装饰</label>
                          <div className="grid grid-cols-5 gap-1.5">
                            {avatarStyles.map((style) => (
                              <button
                                key={style}
                                type="button"
                                onClick={() => setAvatarStyle(style)}
                                className={`flex h-12 flex-col items-center justify-center gap-0.5 rounded-[11px] border text-caption-2 font-medium transition ${
                                  avatarStyle === style
                                    ? 'border-ink bg-surface-tile-1 text-ink shadow-none'
                                    : 'border-border bg-canvas text-body-subtle hover:border-border-emphasis hover:bg-surface-tile-1'
                                }`}
                              >
                                <span className="material-symbols-outlined text-[17px]">
                                  {style === 'classic' ? 'auto_awesome' : style === 'blue' ? 'school' : style === 'warm' ? 'local_florist' : style === 'mint' ? 'spa' : 'wb_twilight'}
                                </span>
                                <span className="text-caption-2">{avatarStyleLabels[style]}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Motion control */}
                        <div className="mt-5">
                          <SegmentedControl
                            label="动态效果"
                            value={avatarMotion}
                            options={motionLabels}
                            onChange={setAvatarMotion}
                          />
                        </div>

                        {/* Action buttons */}
                        <div className="mt-6 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => {
                              setAssistantName('易小助');
                              setAvatarStyle('classic');
                              setAvatarMotion('calm');
                            }}
                            className="inline-flex h-9 items-center gap-1.5 rounded-[10px] px-3 text-footnote text-body-subtle transition hover:bg-surface-tile-2 hover:text-body"
                          >
                            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                            重置
                          </button>
                          <button
                            type="button"
                            onClick={() => setCustomizing(false)}
                            className="h-9 rounded-[10px] bg-ink px-5 text-footnote font-medium text-on-dark shadow-none transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                          >
                            完成
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>,
                  document.body,
                )}

              <div className="flex h-full min-h-0 flex-col overflow-hidden">
                {!hasMessages && (
                  <>
                    <AssistantWelcome
                      displayName={user?.name || user?.studentId || '同学'}
                      status={status}
                      avatarMotion={avatarMotion}
                      avatarStyle={avatarStyle}
                      assistantName={assistantName}
                      onCustomize={() => setCustomizing((value) => !value)}
                    />
                    <QuickPromptChips
                      role={user?.role}
                      disabled={isBusy}
                      onSelect={(prompt) => void handleSend(prompt)}
                    />
                  </>
                )}
                <ChatMessageList messages={messages} onRetry={failedTurn ? handleRetry : undefined} />
              </div>
            </div>

            <ChatInputBar
              value={input}
              disabled={isBusy}
              attachments={attachments}
              onChange={setInput}
              onAddImages={handleAddImages}
              onRemoveAttachment={(id) => setAttachments((prev) => prev.filter((item) => item.id !== id))}
              onSubmit={() => void handleSend()}
            />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

interface AssistantWelcomeProps {
  displayName: string;
  status: RequestStatus;
  avatarMotion: AvatarMotion;
  avatarStyle: AvatarStyle;
  assistantName: string;
  onCustomize: () => void;
}

function AssistantWelcome({
  displayName,
  status,
  avatarMotion,
  avatarStyle,
  assistantName,
  onCustomize,
}: AssistantWelcomeProps) {
  return (
    <section className="shrink-0 px-5 pb-3 pt-4">
      <div className="relative flex items-center gap-4">
        <button
          type="button"
          onClick={onCustomize}
          className="group relative block shrink-0 rounded-full text-left"
          aria-label="个性化 AI 头像"
        >
          <AvatarFace motion={avatarMotion} style={avatarStyle} />
          <span className="pointer-events-none absolute -bottom-1 left-1/2 inline-flex h-6 -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full border border-border/80 bg-canvas/90 px-2 text-caption-2 text-body-subtle opacity-0 shadow-none backdrop-blur-sm transition group-hover:opacity-100 group-focus-visible:opacity-100">
            <span className="material-symbols-outlined text-[12px]">palette</span>
            装扮
          </span>
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-caption-2 text-placeholder">
            <span className={`h-1.5 w-1.5 rounded-full ${status === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`} />
            <span>{assistantName}</span>
            <span className="text-placeholder">·</span>
            <span>{statusText[status]}</span>
          </div>
          <h2 className="mt-0.5 text-title-3 font-semibold leading-snug tracking-tight text-ink">
            你好，{displayName}
          </h2>
          <p className="mt-0.5 text-footnote text-body-subtle">
            有什么我可以帮你的？
          </p>
        </div>
      </div>
    </section>
  );
}

interface AvatarFaceProps {
  motion: AvatarMotion;
  style: AvatarStyle;
  preview?: boolean;
}

function AvatarFace({ motion: avatarMotion, style: avatarStyle, preview = false }: AvatarFaceProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.28, ease: smoothEase }}
      className={`ai-avatar-stage ${preview ? 'ai-avatar-preview' : ''}`}
      data-motion={avatarMotion}
      data-style={avatarStyle}
      aria-hidden="true"
    >
      <div className="ai-avatar-glow" />
      <div className="ai-avatar-shadow" />
      <img className="ai-avatar-image" src={avatarAssets[avatarStyle]} alt="" draggable={false} />
    </motion.div>
  );
}

interface SegmentedControlProps<T extends string> {
  label: string;
  value: T;
  options: Record<T, string>;
  onChange: (value: T) => void;
}

function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1.5 text-caption-2 font-medium uppercase tracking-wider text-placeholder">{label}</div>
      <div className="grid grid-cols-3 gap-1 rounded-[11px] bg-surface-tile-2/80 p-1">
        {(Object.keys(options) as T[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`h-8 rounded-[9px] text-caption font-medium transition ${
              value === key
                ? 'bg-canvas text-ink shadow-none'
                : 'text-body-subtle hover:bg-canvas/60 hover:text-ink'
            }`}
          >
            {options[key]}
          </button>
        ))}
      </div>
    </div>
  );
}

function cycleAvatarStyle(current: AvatarStyle, direction: -1 | 1): AvatarStyle {
  const currentIndex = avatarStyles.indexOf(current);
  return avatarStyles[(currentIndex + direction + avatarStyles.length) % avatarStyles.length];
}

function toAssistantChatMessage(message: AiChatConversationMessage): AssistantChatMessage {
  return {
    id: String(message.id ?? createMessageId()),
    role: message.role === 'user' ? 'user' : 'assistant',
    content: message.content || '',
    status: 'done',
    createTime: message.createTime,
    toolContext: message.toolContext ?? parseToolContext(message.toolResultJson),
    artifacts: message.artifacts,
  };
}

function parseToolContext(raw?: string): unknown {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function readImageFile(file: File): Promise<ChatImageAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({
      id: createMessageId(),
      name: file.name || '粘贴图片.png',
      dataUrl: String(reader.result ?? ''),
      size: file.size,
      type: file.type,
    });
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function createMessageId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'AI 助手暂时不可用，请稍后重试';
}

function removeLastFailedTurn(messages: AssistantChatMessage[]): AssistantChatMessage[] {
  const next = [...messages];
  const failedIndex = next.findLastIndex((message) => (
    message.role === 'assistant' && message.status === 'error'
  ));
  if (failedIndex < 0) return next;
  next.splice(failedIndex, 1);
  if (next[failedIndex - 1]?.role === 'user') {
    next.splice(failedIndex - 1, 1);
  }
  return next;
}

function readStoredOption<T extends string>(
  key: string,
  fallback: T,
  options: Record<T, string>,
): T {
  if (typeof localStorage === 'undefined') return fallback;
  const value = localStorage.getItem(key) as T | null;
  return value && Object.prototype.hasOwnProperty.call(options, value) ? value : fallback;
}
