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
    { label: '报名', icon: 'how_to_reg', prompt: '我该如何报名当前适合我的赛事？' },
    { label: '成果', icon: 'upload_file', prompt: '成果提交需要准备哪些材料？' },
    { label: '推荐', icon: 'travel_explore', prompt: '根据我的能力推荐近期赛事。' },
  ],
  teacher: [
    { label: '审核', icon: 'fact_check', prompt: '帮我梳理待审核成果的优先级。' },
    { label: '学院', icon: 'account_balance', prompt: '学院参赛情况有哪些异常？' },
    { label: '学生成长', icon: 'monitoring', prompt: '分析学生成长雷达的薄弱项。' },
  ],
  admin: [
    { label: '草稿', icon: 'edit_note', prompt: '有哪些赛事草稿需要补齐信息？' },
    { label: '任务', icon: 'task_alt', prompt: '近期审核任务和发布任务怎么排？' },
    { label: '赛事统计', icon: 'query_stats', prompt: '汇总本周赛事统计亮点。' },
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
              className="group flex h-11 w-full items-center gap-3 rounded-[12px] px-3 text-left text-[14px] text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={item.prompt}
              title={item.prompt}
            >
                <span className="material-symbols-outlined text-[19px] text-slate-400 transition group-hover:text-indigo-500">
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
