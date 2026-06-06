import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { AssistantTone, ChatImageAttachment } from './types';

interface ChatInputBarProps {
  value: string;
  disabled?: boolean;
  tone: AssistantTone;
  toneOptions: Record<AssistantTone, string>;
  attachments: ChatImageAttachment[];
  onChange: (value: string) => void;
  onToneChange: (value: AssistantTone) => void;
  onAddImages: (files: File[]) => void;
  onRemoveAttachment: (id: string) => void;
  onSubmit: () => void;
}

export default function ChatInputBar({
  value,
  disabled = false,
  tone,
  toneOptions,
  attachments,
  onChange,
  onToneChange,
  onAddImages,
  onRemoveAttachment,
  onSubmit,
}: ChatInputBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modeOpen, setModeOpen] = useState(false);
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
      className="shrink-0 border-t border-slate-200/70 bg-white px-3 pb-3 pt-2.5"
    >
      <div className="rounded-[18px] border border-slate-200 bg-white p-2.5 shadow-sm transition focus-within:border-primary/45 focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]">
        {attachments.length > 0 && (
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[12px] border border-slate-200 bg-white shadow-sm"
              >
                <img
                  src={attachment.dataUrl}
                  alt={attachment.name}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => onRemoveAttachment(attachment.id)}
                  className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/55 text-white transition hover:bg-black/75"
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
          className="max-h-24 min-h-9 w-full resize-none bg-transparent px-1 py-1 text-[14px] leading-relaxed text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
          placeholder={disabled ? '正在回复...' : '问问赛事、报名、审核'}
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
              className="grid h-8 w-8 place-items-center rounded-[10px] text-slate-500 transition hover:bg-slate-200/80 hover:text-slate-900"
              aria-label="添加图片附件"
              title="添加图片"
            >
              <span className="material-symbols-outlined text-[21px]">add</span>
            </button>
          </div>

          <div className="relative flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setModeOpen((value) => !value)}
              className="inline-flex h-8 items-center gap-1 rounded-[10px] border border-slate-200 bg-white px-2 text-[12px] text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
              aria-label="切换回答模式"
              title="切换模式"
            >
              <span className="ai-model-mark" />
              {toneOptions[tone]}
            </button>
            <AnimatePresence>
              {modeOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.97 }}
                  transition={{ duration: 0.12 }}
                  className="absolute bottom-10 right-0 z-20 w-28 overflow-hidden rounded-[12px] border border-slate-200 bg-white py-1 shadow-[0_10px_30px_rgba(15,23,42,0.14)]"
                >
                  {(Object.keys(toneOptions) as AssistantTone[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        onToneChange(key);
                        setModeOpen(false);
                      }}
                      className={`flex h-8 w-full items-center justify-between px-3 text-left text-[12px] transition ${
                        tone === key
                          ? 'bg-primary-soft text-primary'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      {toneOptions[key]}
                      {tone === key && <span className="material-symbols-outlined text-[14px]">check</span>}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              whileTap={{ scale: 0.9 }}
              disabled={!canSubmit}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-white transition hover:bg-primary-focus disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
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
