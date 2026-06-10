import { motion } from 'framer-motion';
import type { UserRole } from '../../types';

interface QuickPrompt {
  label: string;
  prompt: string;
  icon: string;
}

interface QuickPromptChipsProps {
  role?: UserRole;
  disabled?: boolean;
  variant?: 'chips' | 'commands';
  onSelect: (prompt: string) => void;
}

const promptsByRole: Record<UserRole, QuickPrompt[]> = {
  student: [
    { label: '查报名', icon: 'how_to_reg', prompt: '查看我当前的报名状态和下一步要做的事。' },
    { label: '看截止', icon: 'event', prompt: '帮我看看最近有哪些赛事或任务快截止。' },
    { label: '成果材料', icon: 'upload_file', prompt: '根据我的参赛情况，整理需要提交的成果材料清单。' },
    { label: '成长建议', icon: 'radar', prompt: '分析我的成长档案，给出简短提升建议。' },
  ],
  teacher: [
    { label: '待审核', icon: 'fact_check', prompt: '列出我当前需要处理的待审核任务。' },
    { label: '查学生', icon: 'person_search', prompt: '查一下张三同学的参赛和成果情况。' },
    { label: '学院概览', icon: 'account_balance', prompt: '概览学院近期参赛、获奖和待审核情况。' },
    { label: '审核意见', icon: 'edit_note', prompt: '帮我草拟一段简洁、规范的审核意见。' },
  ],
  admin: [
    { label: '待办', icon: 'task_alt', prompt: '汇总当前需要管理员处理的待办事项。' },
    { label: 'AI任务', icon: 'smart_toy', prompt: '查看最近 AI 任务执行情况和失败项。' },
    { label: '赛事草稿', icon: 'edit_note', prompt: '列出待审核的赛事草稿和主要风险。' },
    { label: '公告草稿', icon: 'campaign', prompt: '帮我草拟一条简洁的赛事通知公告。' },
  ],
};

export default function QuickPromptChips({
  role = 'student',
  disabled = false,
  variant = 'chips',
  onSelect,
}: QuickPromptChipsProps) {
  const prompts = promptsByRole[role] ?? promptsByRole.student;

  if (variant === 'commands') {
    return (
      <div className="shrink-0 px-5 py-3" aria-label="快捷问题">
        <div className="space-y-0.5">
          {prompts.map((item, index) => (
            <motion.button
              key={item.label}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.04 }}
              disabled={disabled}
              onClick={() => onSelect(item.prompt)}
              className="group flex h-10 w-full items-center gap-2.5 rounded-[10px] px-3 text-left text-[13px] text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={item.prompt}
              title={item.prompt}
            >
                <span className="material-symbols-outlined text-[18px] text-slate-400 transition group-hover:text-indigo-500">
                {item.icon}
              </span>
              <span className="truncate">{item.prompt}</span>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-slate-200/40 px-4 py-2.5 no-scrollbar" aria-label="快捷问题">
      {prompts.map((item) => (
        <motion.button
          key={item.label}
          type="button"
          whileTap={{ scale: 0.97 }}
          disabled={disabled}
          onClick={() => onSelect(item.prompt)}
          className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-full border border-slate-200/60 bg-slate-50/50 px-2.5 text-[11px] text-slate-500 transition hover:border-slate-300/80 hover:bg-white hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={item.prompt}
          title={item.prompt}
        >
          <span className="material-symbols-outlined text-[14px]">{item.icon}</span>
          <span>{item.label}</span>
        </motion.button>
      ))}
    </div>
  );
}
