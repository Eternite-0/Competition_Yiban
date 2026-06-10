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
  onSelect: (prompt: string) => void;
}

const promptsByRole: Record<UserRole, QuickPrompt[]> = {
  student: [
    { label: '导出报名表', icon: 'table_view', prompt: '请查询我的报名记录，并生成一个 Excel 文件让我下载。' },
    { label: '材料清单', icon: 'inventory_2', prompt: '根据我的参赛和成果情况，整理一份需要提交的材料清单。' },
    { label: '成长报告', icon: 'description', prompt: '分析我的成长档案，生成一份简洁的 DOCX 成长建议报告。' },
    { label: '截止提醒', icon: 'event', prompt: '帮我找出近期快截止的赛事和任务，并按紧急程度整理。' },
  ],
  teacher: [
    { label: '审核清单', icon: 'fact_check', prompt: '列出我当前需要处理的待审核任务，并生成 Excel 清单。' },
    { label: '学生档案', icon: 'person_search', prompt: '查一下张三同学的参赛和成果情况，并整理成简短报告。' },
    { label: '学院汇总', icon: 'account_balance', prompt: '概览学院近期参赛、获奖和待审核情况，生成 DOCX 汇总。' },
    { label: '审核意见', icon: 'edit_note', prompt: '根据当前待审核任务，帮我草拟一段简洁、规范的审核意见。' },
  ],
  admin: [
    { label: '待办导出', icon: 'table_view', prompt: '汇总当前需要管理员处理的待办事项，并生成 Excel 文件。' },
    { label: 'AI任务报告', icon: 'smart_toy', prompt: '查看最近 AI 任务执行情况和失败项，生成一份 DOCX 诊断报告。' },
    { label: '赛事草稿', icon: 'edit_note', prompt: '列出待审核的赛事草稿、主要风险，并生成 Excel 清单。' },
    { label: '通知草稿', icon: 'campaign', prompt: '帮我草拟一条简洁的赛事通知公告，并生成 DOCX 文件。' },
  ],
};

export default function QuickPromptChips({
  role = 'student',
  disabled = false,
  onSelect,
}: QuickPromptChipsProps) {
  const prompts = promptsByRole[role] ?? promptsByRole.student;

  return (
    <div className="shrink-0 px-5 py-3" aria-label="任务建议">
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
            <span className="material-symbols-outlined text-[18px] text-slate-400 transition group-hover:text-slate-700">
              {item.icon}
            </span>
            <span className="truncate">{item.prompt}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
