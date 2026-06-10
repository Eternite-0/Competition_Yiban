import { useEffect, useRef, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import type { ChatImageAttachment } from './types';

interface ChatInputBarProps {
  value: string;
  disabled?: boolean;
  attachments: ChatImageAttachment[];
  onChange: (value: string) => void;
  onAddImages: (files: File[]) => void;
  onRemoveAttachment: (id: string) => void;
  onSubmit: () => void;
}

export default function ChatInputBar({
  value,
  disabled = false,
  attachments,
  onChange,
  onAddImages,
  onRemoveAttachment,
  onSubmit,
}: ChatInputBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canSubmit = (value.trim().length > 0 || attachments.length > 0) && !disabled;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = '0px';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 96)}px`;
  }, [value]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (canSubmit) onSubmit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (canSubmit) onSubmit();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(event.clipboardData?.items ?? []);
    const files = items
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));
    if (!files.length) return;
    event.preventDefault();
    onAddImages(files);
  };

  const handlePickFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    onAddImages(files);
    event.currentTarget.value = '';
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="shrink-0 border-t border-slate-200/50 bg-white/80 px-3 pb-3 pt-2.5 backdrop-blur-md"
    >
      <div className="rounded-[16px] border border-slate-200/60 bg-white p-2.5 transition focus-within:border-indigo-300/60 focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.08)]">
        {attachments.length > 0 && (
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-[12px] border border-slate-200/60 bg-white"
              >
                <img
                  src={attachment.dataUrl}
                  alt={attachment.name}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => onRemoveAttachment(attachment.id)}
                  className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/50 text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/70"
                  aria-label={`移除 ${attachment.name}`}
                  title="移除图片"
                >
                  <span className="material-symbols-outlined text-[13px]">close</span>
                </button>
              </div>
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={value}
          rows={1}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          className="max-h-24 min-h-9 w-full resize-none bg-transparent px-1.5 py-1 text-[14px] leading-relaxed text-slate-800 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
          placeholder={disabled ? '正在处理...' : '说出你要完成的任务，查询、整理、导出都可以…'}
          aria-label="输入问题"
        />

        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handlePickFiles}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="grid h-8 w-8 place-items-center rounded-[10px] text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="添加图片附件"
              title="添加图片"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
            </button>
          </div>

          <div className="relative flex items-center gap-1.5">
            <motion.button
              type="submit"
              whileTap={{ scale: 0.88 }}
              disabled={!canSubmit}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-sm transition hover:from-indigo-600 hover:to-indigo-700 hover:shadow-md disabled:cursor-not-allowed disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:shadow-none"
              aria-label="发送"
            >
              <span className="material-symbols-outlined text-[17px]">arrow_upward</span>
            </motion.button>
          </div>
        </div>
      </div>
    </form>
  );
}
