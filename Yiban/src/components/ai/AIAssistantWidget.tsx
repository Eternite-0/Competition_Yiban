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
import ChatInputBar from './ChatInputBar';
import ChatMessageList, { type AssistantChatMessage } from './ChatMessageList';
import QuickPromptChips from './QuickPromptChips';
import type { AssistantTone, AvatarMotion, AvatarStyle, ChatImageAttachment } from './types';

type RequestStatus = 'idle' | 'loading' | 'streaming' | 'error';

interface FailedTurn {
  raw: string;
  attachments: ChatImageAttachment[];
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

const toneLabels: Record<AssistantTone, string> = {
  precise: '严谨',
  warm: '陪伴',
  fast: '极速',
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

const tonePrompt: Record<AssistantTone, string> = {
  precise: '请用严谨、可核查的方式回答，先给结论，再列关键依据。',
  warm: '请用自然友好的方式回答，兼顾行动建议和必要提醒。',
  fast: '请优先给出短答案和下一步操作，避免展开过长解释。',
};

export default function AIAssistantWidget() {
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
  const [assistantName, setAssistantName] = useState(() => (
    typeof localStorage === 'undefined' ? '易小助' : localStorage.getItem('yiban.ai.name') || '易小助'
  ));
  const [tone, setTone] = useState<AssistantTone>(() => readStoredOption('yiban.ai.tone', 'precise', toneLabels));
  const [avatarMotion, setAvatarMotion] = useState<AvatarMotion>(() => (
    readStoredOption('yiban.ai.motion', 'calm', motionLabels)
  ));
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>(() => (
    readStoredOption('yiban.ai.avatar-style', 'classic', avatarStyleLabels)
  ));
  const abortRef = useRef<AbortController | null>(null);
  const isBusy = status === 'loading' || status === 'streaming';
  const hasMessages = messages.length > 0;

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
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    localStorage.setItem('yiban.ai.tone', tone);
  }, [tone]);

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
    const message = `${displayText}\n\n${tonePrompt[tone]}`;
    const imageDataUrls = selectedAttachments.map((attachment) => attachment.dataUrl);

    setOpen(true);
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
          onToken: (_token, answer) => {
            setStatus('streaming');
            updateAssistantMessage(assistantMessage.id, {
              content: answer,
              status: 'streaming',
            });
          },
        },
      );

      setConversationId(streamResponse.conversationId || currentConversationId);
      updateAssistantMessage(assistantMessage.id, {
        content: streamResponse.answer || '暂无回复',
        status: 'done',
        toolContext: streamResponse.toolContext,
        createTime: streamResponse.createTime,
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

  return (
    <>
      <motion.button
        type="button"
        whileHover={{ y: -2, scale: 1.05 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen((value) => !value)}
        className="ai-assistant-launcher fixed bottom-5 right-4 z-50 grid h-12 w-12 place-items-center rounded-full border border-slate-200/80 bg-white text-slate-700 shadow-[0_8px_30px_rgba(15,23,42,0.12),0_0_0_1px_rgba(15,23,42,0.05)] transition hover:shadow-[0_12px_40px_rgba(15,23,42,0.18)] md:bottom-6 md:right-6"
        aria-label={open ? '关闭 AI 助手' : '打开 AI 助手'}
        title="AI 助手"
      >
        <span className="material-symbols-outlined text-[22px]">
          {open ? 'close' : 'auto_awesome'}
        </span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={panelTransition}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/25 backdrop-blur-[2px] md:hidden dark:bg-black/35"
            aria-label="关闭 AI 助手"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="ai-assistant-panel fixed inset-x-2 bottom-0 z-50 flex h-[72svh] max-h-[590px] flex-col overflow-hidden rounded-b-none rounded-t-[22px] border border-slate-200/60 bg-white text-slate-900 shadow-[0_-4px_40px_rgba(15,23,42,0.08),0_0_0_1px_rgba(15,23,42,0.03)] md:inset-auto md:bottom-20 md:right-6 md:h-[min(600px,calc(100vh-140px))] md:w-[400px] md:rounded-[20px] md:shadow-[0_24px_80px_rgba(15,23,42,0.14),0_0_0_1px_rgba(15,23,42,0.04)]"
            role="dialog"
            aria-modal="false"
            aria-label="AI 助手"
          >
            <header className="relative flex h-12 shrink-0 items-center border-b border-slate-200/50 bg-white/80 px-3 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setConversationMenuOpen((value) => !value)}
                className="inline-flex min-w-0 max-w-[250px] items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-[13px] font-medium text-slate-700 transition hover:bg-slate-100/80"
                aria-expanded={conversationMenuOpen}
                aria-label="切换 AI 对话"
              >
                <span className="material-symbols-outlined text-[18px] text-slate-400">chat_bubble</span>
                <span className="truncate">{activeTitle}</span>
                <span className={`material-symbols-outlined text-[16px] text-slate-400 transition-transform ${conversationMenuOpen ? 'rotate-180' : ''}`}>
                  keyboard_arrow_down
                </span>
              </button>

              <AnimatePresence>
                {conversationMenuOpen && (
                  <>
                    <motion.button
                      type="button"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.12 }}
                      className="fixed inset-0 z-10 cursor-default bg-transparent"
                      onClick={() => setConversationMenuOpen(false)}
                      aria-label="关闭对话菜单"
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.98 }}
                      transition={{ duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
                      className="absolute left-3 top-10 z-20 w-[260px] overflow-hidden rounded-[14px] border border-slate-200/70 bg-white py-1.5 shadow-[0_16px_48px_rgba(15,23,42,0.14)]"
                    >
                    <button
                      type="button"
                      onClick={handleReset}
                      className="flex h-9 w-full items-center gap-2 px-3 text-left text-[13px] font-medium text-slate-800 transition hover:bg-slate-50"
                    >
                      <span className="material-symbols-outlined text-[17px]">add_comment</span>
                      新建对话
                    </button>
                    <div className="mx-3 my-1 border-t border-slate-100" />
                    <div className="max-h-60 overflow-y-auto">
                      {conversationLoading ? (
                        <div className="px-3 py-3 text-[12px] text-slate-400">正在加载对话...</div>
                      ) : conversations.length === 0 ? (
                        <div className="px-3 py-3 text-[12px] text-slate-400">暂无历史对话</div>
                      ) : (
                        conversations.map((conversation) => {
                          const selected = String(conversation.id) === String(conversationId);
                          return (
                            <div
                              key={conversation.id}
                              className={`group flex items-center ${
                                selected ? 'bg-primary-soft' : 'hover:bg-slate-50'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => void handleSelectConversation(String(conversation.id))}
                                className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-[12px] text-slate-600"
                              >
                                <span className="truncate">{conversation.title || conversation.lastMessage || '未命名对话'}</span>
                                {selected && <span className="material-symbols-outlined ml-auto text-[14px] text-primary">check</span>}
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteConversation(String(conversation.id))}
                                className="mr-2 grid h-7 w-7 shrink-0 place-items-center rounded-[8px] text-slate-300 transition hover:bg-red-50 hover:text-red-500"
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
                  </>
                )}
              </AnimatePresence>
            </header>

            <div className="relative min-h-0 flex-1 overflow-hidden">
              {customizing && typeof document !== 'undefined' && createPortal(
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
                    onMouseDown={(event) => {
                      if (event.target === event.currentTarget) setCustomizing(false);
                    }}
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 12, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.97 }}
                      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                      className="relative w-full max-w-[440px] overflow-hidden rounded-[20px] border border-slate-200/70 bg-white text-slate-900 shadow-[0_32px_100px_rgba(15,23,42,0.25)]"
                      role="dialog"
                      aria-modal="true"
                      aria-label="个性化 AI 助手"
                    >
                      {/* Header gradient bar */}
                      <div className="h-1.5 w-full bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400" />

                      <div className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-[17px] font-semibold text-slate-900">个性化你的 AI 助手</h3>
                            <p className="mt-0.5 text-[12px] text-slate-400">选择头像风格和装饰</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setCustomizing(false)}
                            className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
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
                            className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 text-slate-400 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                            aria-label="上一个头像"
                          >
                            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                          </button>
                          <div className="relative">
                            <AvatarFace motion={avatarMotion} style={avatarStyle} preview />
                            <div className="mt-2 text-center text-[12px] font-medium text-slate-600">
                              {avatarStyleLabels[avatarStyle]}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAvatarStyle(cycleAvatarStyle(avatarStyle, 1))}
                            className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 text-slate-400 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                            aria-label="下一个头像"
                          >
                            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                          </button>
                        </div>

                        {/* Name input */}
                        <div className="mt-5">
                          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-slate-400">助手名称</label>
                          <input
                            value={assistantName}
                            onChange={(event) => setAssistantName(event.target.value.slice(0, 12))}
                            placeholder="给助手起个名字"
                            className="block h-10 w-full rounded-[11px] border border-slate-200 bg-slate-50/50 px-3 text-[14px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                          />
                        </div>

                        {/* Avatar style grid */}
                        <div className="mt-5">
                          <label className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-slate-400">头像装饰</label>
                          <div className="grid grid-cols-5 gap-1.5">
                            {avatarStyles.map((style) => (
                              <button
                                key={style}
                                type="button"
                                onClick={() => setAvatarStyle(style)}
                                className={`flex h-12 flex-col items-center justify-center gap-0.5 rounded-[11px] border text-[11px] font-medium transition ${
                                  avatarStyle === style
                                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700 shadow-sm'
                                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                              >
                                <span className="material-symbols-outlined text-[17px]">
                                  {style === 'classic' ? 'auto_awesome' : style === 'blue' ? 'school' : style === 'warm' ? 'local_florist' : style === 'mint' ? 'spa' : 'wb_twilight'}
                                </span>
                                <span className="text-[10px]">{avatarStyleLabels[style]}</span>
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
                            className="inline-flex h-9 items-center gap-1.5 rounded-[10px] px-3 text-[13px] text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                          >
                            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                            重置
                          </button>
                          <button
                            type="button"
                            onClick={() => setCustomizing(false)}
                            className="h-9 rounded-[10px] bg-gradient-to-r from-indigo-500 to-purple-500 px-5 text-[13px] font-medium text-white shadow-sm transition hover:from-indigo-600 hover:to-purple-600 hover:shadow-md"
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
                  <AssistantWelcome
                    displayName={user?.name || user?.studentId || '同学'}
                    status={status}
                    avatarMotion={avatarMotion}
                    avatarStyle={avatarStyle}
                    assistantName={assistantName}
                    onCustomize={() => setCustomizing((value) => !value)}
                  />
                )}

                <QuickPromptChips
                  role={user?.role}
                  disabled={isBusy}
                  variant={hasMessages ? 'chips' : 'commands'}
                  onSelect={(prompt) => void handleSend(prompt)}
                />
                <ChatMessageList messages={messages} onRetry={failedTurn ? handleRetry : undefined} />
              </div>
            </div>

            <ChatInputBar
              value={input}
              disabled={isBusy}
              tone={tone}
              toneOptions={toneLabels}
              attachments={attachments}
              onChange={setInput}
              onToneChange={setTone}
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
          <span className="pointer-events-none absolute -bottom-1 left-1/2 inline-flex h-6 -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full border border-slate-200/80 bg-white/90 px-2 text-[10px] text-slate-500 opacity-0 shadow-sm backdrop-blur-sm transition group-hover:opacity-100 group-focus-visible:opacity-100">
            <span className="material-symbols-outlined text-[12px]">palette</span>
            装扮
          </span>
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className={`h-1.5 w-1.5 rounded-full ${status === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`} />
            <span>{assistantName}</span>
            <span className="text-slate-300">·</span>
            <span>{statusText[status]}</span>
          </div>
          <h2 className="mt-0.5 text-[18px] font-semibold leading-snug tracking-tight text-slate-900">
            你好，{displayName}
          </h2>
          <p className="mt-0.5 text-[13px] text-slate-500">
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
      <div className="ai-avatar-particles">
        <span className="ai-avatar-particle" />
        <span className="ai-avatar-particle" />
        <span className="ai-avatar-particle" />
        <span className="ai-avatar-particle" />
        <span className="ai-avatar-particle" />
        <span className="ai-avatar-particle" />
      </div>
      <div className="ai-avatar-shadow" />
      <div className="ai-avatar-core">
        <span className="ai-avatar-cheek ai-avatar-cheek-left" />
        <span className="ai-avatar-cheek ai-avatar-cheek-right" />
        <span className="ai-avatar-eye ai-avatar-eye-left" />
        <span className="ai-avatar-eye ai-avatar-eye-right" />
        <span className="ai-avatar-nose" />
        <span className="ai-avatar-mouth" />
      </div>
      <span className="ai-avatar-charm material-symbols-outlined">
        {avatarStyle === 'classic' ? 'auto_awesome' : avatarStyle === 'blue' ? 'school' : avatarStyle === 'warm' ? 'local_florist' : avatarStyle === 'mint' ? 'spa' : 'wb_twilight'}
      </span>
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
      <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</div>
      <div className="grid grid-cols-3 gap-1 rounded-[11px] bg-slate-100/80 p-1">
        {(Object.keys(options) as T[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`h-8 rounded-[9px] text-[12px] font-medium transition ${
              value === key
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:bg-white/60 hover:text-slate-800'
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
    toolContext: message.toolContext,
  };
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
