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
    { label: '我的报名', icon: 'how_to_reg', prompt: '查看我当前的报名状态和审核进度。' },
    { label: '成长档案', icon: 'radar', prompt: '分析我的成长雷达数据，指出能力短板和提升建议。' },
    { label: '活动参与', icon: 'event', prompt: '我参加了哪些活动？审核状态如何？' },
    { label: '赛事推荐', icon: 'travel_explore', prompt: '根据我的能力水平，推荐适合我参加的赛事。' },
    { label: '消息通知', icon: 'mail', prompt: '我有哪些未读消息和最新通知？' },
    { label: '获奖证明', icon: 'emoji_events', prompt: '我的获奖证明审核情况如何？' },
  ],
  teacher: [
    { label: '待审核', icon: 'fact_check', prompt: '当前有哪些待审核的任务？帮我按优先级排序。' },
    { label: '学院总览', icon: 'account_balance', prompt: '学院整体参赛率和获奖率怎么样？有什么异常？' },
    { label: '查学生', icon: 'person_search', prompt: '查一下张三同学的参赛和个人情况。' },
    { label: '查专业', icon: 'school', prompt: '计算机科学与技术专业有多少人？参赛情况如何？' },
    { label: '获奖审核', icon: 'verified', prompt: '有待审核的获奖证明吗？AI 识别置信度如何？' },
    { label: '未参赛', icon: 'person_off', prompt: '哪些学生报名了但还没提交成果？' },
  ],
  admin: [
    { label: '待办任务', icon: 'task_alt', prompt: '当前有哪些待处理的审核任务？' },
    { label: '赛事草稿', icon: 'edit_note', prompt: '有哪些赛事草稿待审核？来源是什么？' },
    { label: 'AI 任务', icon: 'smart_toy', prompt: '最近 AI 任务的执行情况如何？有失败的吗？' },
    { label: '用户统计', icon: 'group', prompt: '平台用户的角色分布和注册情况怎么样？' },
    { label: '赛事统计', icon: 'query_stats', prompt: '汇总本周赛事发布和报名统计亮点。' },
    { label: '公告管理', icon: 'campaign', prompt: '最近发了哪些公告？有需要更新的吗？' },
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
