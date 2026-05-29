import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { softSpring } from '../lib/motion';

interface NavItem {
  icon: string;
  label: string;
  path: string;
}

const studentNav: NavItem[] = [
  { icon: 'space_dashboard', label: '工作台', path: '/student' },
  { icon: 'emoji_events', label: '赛事大厅', path: '/student/competitions' },
  { icon: 'timeline', label: '我的进度', path: '/student/progress' },
  { icon: 'group_add', label: '招募大厅', path: '/student/teams' },
  { icon: 'assignment_ind', label: '我的参赛', path: '/student/registrations' },
  { icon: 'trending_up', label: '能力雷达', path: '/student/growth' },
  { icon: 'workspace_premium', label: '光荣榜', path: '/student/works' },
  { icon: 'calendar_month', label: '赛事日历', path: '/student/calendar' },
  { icon: 'upload_file', label: '上传成果', path: '/student/achievements/upload' },
];

const teacherNav: NavItem[] = [
  { icon: 'space_dashboard', label: '工作台', path: '/teacher' },
  { icon: 'analytics', label: '学院总览', path: '/teacher/college-overview' },
  { icon: 'emoji_events', label: '赛事大厅', path: '/teacher/competitions' },
  { icon: 'fact_check', label: '成果审批', path: '/teacher/audit' },
  { icon: 'school', label: '学生看板', path: '/teacher/student-competitions' },
  { icon: 'trending_up', label: '学情分析', path: '/teacher/student-growth' },
];

const adminNav: NavItem[] = [
  { icon: 'space_dashboard', label: '工作台', path: '/admin' },
  { icon: 'emoji_events', label: '赛事管理', path: '/admin/competitions' },
  { icon: 'add_circle', label: '赛事发布', path: '/admin/publish' },
  { icon: 'campaign', label: '公告管理', path: '/admin/announcements' },
  { icon: 'auto_awesome', label: '作品库', path: '/admin/works' },
  { icon: 'fact_check', label: '系统审核', path: '/admin/audit' },
  { icon: 'manage_accounts', label: '用户管理', path: '/admin/users' },
];

const navMap: Record<string, NavItem[]> = { student: studentNav, teacher: teacherNav, admin: adminNav };

const roleLabel: Record<string, string> = {
  student: '学生',
  teacher: '教师',
  admin: '管理员',
};

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const user = useStore((s) => s.currentUser);
  const logout = useStore((s) => s.logout);
  const navigate = useNavigate();
  const role = user?.role ?? 'student';
  const items = navMap[role];

  const handleLogout = () => {
    logout();
    onClose();
    navigate('/');
  };

  return (
    <aside
      className={`fixed inset-y-2 left-2 z-50 flex w-[236px] flex-col overflow-hidden rounded-lg border border-white/70 bg-[#eef2f7]/80 shadow-[0_18px_48px_-34px_rgba(15,23,42,0.45)] backdrop-blur-2xl backdrop-saturate-150 transition-transform duration-300 ease-out md:translate-x-0 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-[110%]'
      }`}
    >
      <div className="flex h-[58px] items-center gap-3 border-b border-white/60 px-3.5">
        <div className="grid h-8 w-8 place-items-center rounded-sm bg-primary text-on-primary shadow-[0_10px_28px_-18px_rgba(0,102,204,0.7)]">
          <span className="material-symbols-outlined icon-fill text-[18px]">workspace_premium</span>
        </div>
        <div className="min-w-0 flex flex-col leading-tight">
          <h1 className="truncate text-[15px] font-semibold text-ink">易赛通</h1>
          <span className="text-[10px] uppercase text-ink-muted-48">Yiban Suite</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto grid h-8 w-8 place-items-center rounded-full text-ink-muted-48 transition hover:bg-white/70 hover:text-ink md:hidden"
          aria-label="关闭导航"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-3.5">
        <p className="px-2.5 pb-2 text-[10px] font-semibold uppercase text-ink-muted-48">
          主导航
        </p>
        <ul className="flex flex-col gap-1">
          {items.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                onClick={onClose}
                end={item.path.split('/').length <= 2}
                className={({ isActive }) =>
                  `group relative flex h-10 items-center gap-3 overflow-hidden rounded-sm px-3 text-[13px] transition-colors ${
                    isActive ? 'text-ink' : 'text-ink-muted-80 hover:text-ink'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive ? (
                      <motion.span
                        layoutId="dock-active-item"
                        className="absolute inset-0 rounded-sm border border-white/70 bg-white/[0.86] shadow-[0_12px_32px_-24px_rgba(15,23,42,0.5)]"
                        transition={softSpring}
                      />
                    ) : (
                      <span className="absolute inset-0 rounded-sm opacity-0 transition group-hover:bg-white/[0.45] group-hover:opacity-100" />
                    )}
                    {isActive && (
                      <motion.span
                        layoutId="dock-active-mark"
                        className="absolute left-1.5 top-2 bottom-2 w-[3px] rounded-full bg-primary"
                        transition={softSpring}
                      />
                    )}
                    <span
                      className={`material-symbols-outlined relative z-10 text-[19px] transition ${
                        isActive ? 'icon-fill text-primary' : 'text-ink-muted-48 group-hover:text-ink-muted-80'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className={`relative z-10 truncate ${isActive ? 'font-semibold' : 'font-medium'}`}>
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-white/[0.65] p-2.5">
        <div className="flex items-center gap-2.5 rounded-sm px-2 py-2 transition hover:bg-white/[0.55]">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-[12px] font-semibold text-on-primary">
            {user?.name?.[0] ?? 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-ink">
              {user?.name ?? '未登录用户'}
            </span>
            <span className="block text-[11px] text-ink-muted-48">{roleLabel[role]}</span>
          </div>
          <button
            onClick={handleLogout}
            title="退出登录"
            className="grid h-8 w-8 place-items-center rounded-full text-ink-muted-48 transition hover:bg-white/80 hover:text-primary"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
