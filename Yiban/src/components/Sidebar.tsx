import { NavLink, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';

interface NavItem {
  icon: string;
  label: string;
  path: string;
}

const studentNav: NavItem[] = [
  { icon: 'space_dashboard', label: '工作台', path: '/student' },
  { icon: 'emoji_events', label: '赛事大厅', path: '/student/competitions' },
  { icon: 'calendar_month', label: '赛事日历', path: '/student/calendar' },
  { icon: 'group_add', label: '招募大厅', path: '/student/teams' },
  { icon: 'auto_awesome', label: '光荣榜', path: '/student/works' },
  { icon: 'assignment_ind', label: '我的参赛', path: '/student/registrations' },
  { icon: 'trending_up', label: '能力雷达', path: '/student/growth' },
  { icon: 'upload_file', label: '上传成果', path: '/student/achievements/upload' },
];

const teacherNav: NavItem[] = [
  { icon: 'space_dashboard', label: '工作台', path: '/teacher' },
  { icon: 'emoji_events', label: '赛事大厅', path: '/teacher/competitions' },
  { icon: 'fact_check', label: '成果审批', path: '/teacher/audit' },
  { icon: 'school', label: '学生看板', path: '/teacher/student-competitions' },
  { icon: 'trending_up', label: '学情分析', path: '/teacher/student-growth' },
];

const adminNav: NavItem[] = [
  { icon: 'space_dashboard', label: '工作台', path: '/admin' },
  { icon: 'emoji_events', label: '赛事管理', path: '/admin/competitions' },
  { icon: 'add_circle', label: '赛事发布', path: '/admin/publish' },
  { icon: 'auto_awesome', label: '作品库', path: '/admin/works' },
  { icon: 'fact_check', label: '系统审核', path: '/admin/audit' },
];

const navMap = { student: studentNav, teacher: teacherNav, admin: adminNav };

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
      className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-hairline bg-canvas transition-transform duration-300 md:translate-x-0 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="h-[52px] px-lg flex items-center gap-3 border-b border-hairline bg-canvas text-ink">
        <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-on-primary">
          <span className="material-symbols-outlined text-[18px] icon-fill">workspace_premium</span>
        </div>
        <div className="flex flex-col leading-tight min-w-0">
          <h1 className="text-[17px] font-semibold tracking-tight truncate">易赛通</h1>
          <span className="text-[10px] text-ink-muted-48 tracking-wider uppercase">Yiban Suite</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto grid h-8 w-8 place-items-center rounded-full text-ink-muted-48 hover:bg-primary/6 md:hidden"
          aria-label="关闭导航"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-sm py-lg">
        <p className="px-sm pb-2 text-[10px] font-semibold tracking-[0.18em] uppercase text-ink-muted-48">
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
                  `group relative flex items-center gap-3 px-sm py-2.5 rounded-md text-[14px] transition-all ${
                    isActive
                      ? 'text-primary bg-primary/8'
                      : 'text-ink-muted-80 hover:text-ink hover:bg-primary/6'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-primary" />
                    )}
                    <span
                      className={`material-symbols-outlined text-[19px] transition-all ${
                        isActive ? 'icon-fill' : ''
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className={isActive ? 'font-semibold' : ''}>{item.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-sm border-t border-hairline">
        <div className="flex items-center gap-3 p-2 rounded-md hover:bg-primary/6 transition-colors">
          <div className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center text-[13px] font-semibold">
            {user?.name?.[0] ?? 'U'}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-[13px] font-semibold text-ink truncate">
              {user?.name ?? '未登录用户'}
            </span>
            <span className="text-[11px] text-ink-muted-48 tracking-wide">{roleLabel[role]}</span>
          </div>
          <button
            onClick={handleLogout}
            title="退出登录"
            className="p-1 rounded-md text-ink-muted-48 hover:text-primary hover:bg-primary/8 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
