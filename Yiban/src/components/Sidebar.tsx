import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { softSpring } from '../lib/motion';

interface NavItem {
  type?: 'item';
  icon: string;
  label: string;
  path: string;
}

interface NavGroup {
  type: 'group';
  label: string;
}

type NavEntry = NavItem | NavGroup;

const studentNav: NavEntry[] = [
  { icon: 'space_dashboard', label: '工作台', path: '/student' },
  { icon: 'emoji_events', label: '活动大厅', path: '/student/competitions' },
  { icon: 'timeline', label: '我的进度', path: '/student/progress' },
  { icon: 'group_add', label: '招募大厅', path: '/student/teams' },
  { icon: 'assignment_ind', label: '我的参赛', path: '/student/registrations' },
  { icon: 'trending_up', label: '能力雷达', path: '/student/growth' },
  { icon: 'workspace_premium', label: '光荣榜', path: '/student/works' },
  { icon: 'calendar_month', label: '赛事日历', path: '/student/calendar' },
  { icon: 'upload_file', label: '上传成果', path: '/student/achievements/upload' },
];

const teacherNav: NavEntry[] = [
  { icon: 'space_dashboard', label: '工作台', path: '/teacher' },
  { icon: 'analytics', label: '学院总览', path: '/teacher/college-overview' },
  { icon: 'emoji_events', label: '活动大厅', path: '/teacher/competitions' },
  { icon: 'fact_check', label: '学院审核中心', path: '/teacher/audit' },
  { icon: 'school', label: '学生看板', path: '/teacher/student-competitions' },
  { icon: 'trending_up', label: '学情分析', path: '/teacher/student-growth' },
];

const adminNav: NavEntry[] = [
  { type: 'group', label: '工作台' },
  { icon: 'space_dashboard', label: '工作台', path: '/admin' },
  { type: 'group', label: '活动运营' },
  { icon: 'emoji_events', label: '活动管理', path: '/admin/competitions' },
  { icon: 'add_circle', label: '活动发布', path: '/admin/publish' },
  { icon: 'draft', label: '草稿箱', path: '/admin/drafts' },
  { icon: 'travel_explore', label: '赛事来源', path: '/admin/competition-sources' },
  { icon: 'campaign', label: '公告管理', path: '/admin/announcements' },
  { type: 'group', label: '审核与成果' },
  { icon: 'fact_check', label: '统一审核中心', path: '/admin/audit' },
  { icon: 'how_to_reg', label: '教师注册审核', path: '/admin/registration-audit' },
  { icon: 'auto_awesome', label: '优秀作品库', path: '/admin/works' },
  { type: 'group', label: '用户与基础数据' },
  { icon: 'manage_accounts', label: '用户管理', path: '/admin/users' },
  { icon: 'school', label: '专业管理', path: '/admin/majors' },
  { icon: 'class', label: '班级管理', path: '/admin/classes' },
  { icon: 'group', label: '花名册管理', path: '/admin/roster' },
];

const navMap: Record<string, NavEntry[]> = { student: studentNav, teacher: teacherNav, admin: adminNav };

const roleLabel: Record<string, string> = {
  student: '学生',
  teacher: '教师',
  admin: '管理员',
};

function isGroup(item: NavEntry): item is NavGroup {
  return item.type === 'group';
}

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
      className={`fixed inset-y-0 left-0 z-50 flex w-[200px] flex-col overflow-hidden border-r border-hairline bg-canvas transition-transform duration-300 ease-out md:translate-x-0 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-[calc(100%+16px)]'
      }`}
    >
      <div className="flex h-[58px] items-center gap-3 border-b border-hairline px-4">
        <div className="grid h-8 w-8 place-items-center rounded-sm bg-primary text-on-primary">
          <span className="material-symbols-outlined icon-fill text-[18px]">workspace_premium</span>
        </div>
        <div className="min-w-0 flex flex-col leading-tight">
          <h1 className="truncate text-[15px] font-medium text-ink">易赛通</h1>
          <span className="text-[11px] text-placeholder">Yiban suite</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto icon-button md:hidden"
          aria-label="关闭导航"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <p className="px-3 pb-2 text-[12px] font-normal text-placeholder">
          主导航
        </p>
        <ul className="flex flex-col gap-1">
          {items.map((item, index) => {
            if (isGroup(item)) {
              return (
                <li key={`${item.label}-${index}`} className="px-3 pb-1 pt-3 first:pt-0 text-[11px] font-semibold tracking-wide text-placeholder">
                  {item.label}
                </li>
              );
            }
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={onClose}
                  end={item.path.split('/').length <= 2}
                  className={({ isActive }) =>
                    `group relative flex h-10 items-center gap-3 overflow-hidden rounded-sm border-l-2 px-3 text-[14px] font-normal transition-colors ${
                      isActive ? 'border-primary bg-primary-soft text-primary' : 'border-transparent text-body-muted hover:bg-canvas-parchment hover:text-ink'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive ? (
                        <motion.span
                          layoutId="dock-active-item"
                          className="absolute inset-0 rounded-sm bg-primary-soft"
                          transition={softSpring}
                        />
                      ) : (
                        <span className="absolute inset-0 rounded-sm opacity-0 transition group-hover:bg-canvas-parchment group-hover:opacity-100" />
                      )}
                      {isActive && (
                        <motion.span
                          layoutId="dock-active-mark"
                          className="absolute left-0 top-0 bottom-0 w-[2px] bg-primary"
                          transition={softSpring}
                        />
                      )}
                      <span
                        className={`material-symbols-outlined relative z-10 text-[19px] transition ${
                          isActive ? 'icon-fill text-primary' : 'text-placeholder group-hover:text-body-muted'
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span className="relative z-10 truncate">
                        {item.label}
                      </span>
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-hairline p-2.5">
        <div className="flex items-center gap-2.5 rounded-sm px-2 py-2 transition hover:bg-canvas-parchment">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-[12px] font-medium text-on-primary">
            {user?.name?.[0] ?? 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-ink">
              {user?.name ?? '未登录用户'}
            </span>
            <span className="block text-[12px] text-placeholder">{roleLabel[role]}</span>
          </div>
          <button
            onClick={handleLogout}
            title="退出登录"
            className="icon-button !h-8 !w-8"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
