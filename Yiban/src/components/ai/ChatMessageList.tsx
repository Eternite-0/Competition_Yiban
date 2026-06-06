import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { listContainer, listItem } from '../../lib/motion';
import type { ChatImageAttachment } from './types';

export interface AssistantChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status?: 'sending' | 'streaming' | 'done' | 'error';
  createTime?: string;
  error?: string;
  toolContext?: unknown;
  attachments?: ChatImageAttachment[];
}

interface ChatMessageListProps {
  messages: AssistantChatMessage[];
  onRetry?: () => void;
}

export default function ChatMessageList({ messages, onRetry }: ChatMessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return <div className="min-h-0 flex-1" />;
  }

  return (
    <motion.div
      variants={listContainer}
      initial="hidden"
      animate="visible"
      className="min-h-0 flex-1 overflow-y-auto px-4 py-4"
    >
      <AnimatePresence initial={false}>
        {messages.map((message) => (
          <motion.div
            key={message.id}
            variants={listItem}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: 6 }}
            className={`mb-3 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[88%] rounded-[16px] px-3.5 py-2.5 text-[13px] leading-6 shadow-sm ${
                message.role === 'user'
            ? 'bg-primary text-white'
                  : message.status === 'error'
              ? 'border border-red-200 bg-red-50 text-red-700'
              : 'border border-slate-200 bg-white text-slate-800'
              }`}
            >
              {message.attachments && message.attachments.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {message.attachments.map((attachment) => (
                    <a
                      key={attachment.id}
                      href={attachment.dataUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block h-20 w-20 overflow-hidden rounded-[12px] border border-white/20 bg-black/5"
                      title={attachment.name}
                    >
                      <img
                        src={attachment.dataUrl}
                        alt={attachment.name}
                        className="h-full w-full object-cover"
                      />
                    </a>
                  ))}
                </div>
              )}

              {message.status === 'sending' && !message.content ? (
                    <span className="inline-flex items-center gap-2 text-slate-500">
                  <span className="material-symbols-outlined animate-spin text-[16px] text-[#ff7a45]">progress_activity</span>
                  正在思考
                </span>
              ) : message.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none break-words prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-pre:my-2 prose-pre:rounded-sm prose-pre:bg-slate-100 prose-code:before:content-none prose-code:after:content-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
              )}

              {message.role === 'assistant' && message.status === 'streaming' && (
                <span className="mt-1 inline-flex h-4 items-center gap-1 text-[#ff9b66]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff9b66]" />
                  <span className="text-[11px]">生成中</span>
                </span>
              )}

              {message.role === 'assistant' && message.toolContext !== undefined && message.status !== 'error' && (
                      <span className="mt-2 inline-flex items-center gap-1 rounded-[9px] bg-slate-100 px-2 py-1 text-[11px] text-slate-500">
                  <span className="material-symbols-outlined text-[14px]">data_object</span>
                  已附加上下文
                </span>
              )}

              {message.status === 'error' && (
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-[12px] text-[#ffb4b4]">{message.error || '回复失败'}</span>
                  {onRetry && (
                    <button
                      type="button"
                      onClick={onRetry}
                    className="inline-flex h-7 shrink-0 items-center gap-1 rounded-[9px] border border-red-200 bg-white px-2 text-[12px] text-red-600 transition hover:bg-red-50"
                    >
                      <span className="material-symbols-outlined text-[14px]">refresh</span>
                      重试
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      <div ref={endRef} />
    </motion.div>
  );
}
