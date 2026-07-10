import { NavLink, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import {
  isNavGroup,
  navByRole,
  type AppRole,
} from '../config/navigation';
import BrandLogo from './BrandLogo';
import { NavIcon } from './icons/NavIcons';

const roleLabel: Record<string, string> = {
  student: '学生',
  teacher: '教师',
  admin: '管理员',
};

interface SidebarProps {
  mobileOpen: boolean;
  desktopOpen: boolean;
  onClose: () => void;
  /** 桌面端折叠/展开侧栏 */
  onToggleDesktop?: () => void;
}

export default function Sidebar({
  mobileOpen,
  desktopOpen,
  onClose,
  onToggleDesktop,
}: SidebarProps) {
  const user = useStore((s) => s.currentUser);
  const logout = useStore((s) => s.logout);
  const navigate = useNavigate();
  const role = (user?.role ?? 'student') as AppRole;
  const items = navByRole[role] ?? navByRole.student;

  const handleLogout = () => {
    logout();
    onClose();
    navigate('/');
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-[var(--sidebar-width)] flex-col overflow-hidden border-r border-hairline bg-canvas transition-transform duration-200 ease-out ${
        mobileOpen ? 'translate-x-0' : '-translate-x-[calc(100%+16px)]'
      } ${desktopOpen ? 'md:translate-x-0' : 'md:-translate-x-full'}`}
    >
      {/* Brand + collapse */}
      <div className="relative flex h-[var(--header-height)] items-center gap-2.5 border-b border-hairline pl-3.5 pr-2">
        <BrandLogo size={36} withWordmark subtitle={`${roleLabel[role]}端`} />

        {/* 移动端关闭 */}
        <button
          type="button"
          onClick={onClose}
          className="ml-auto grid h-9 w-9 place-items-center rounded-lg text-body-muted hover:bg-hover-overlay hover:text-ink md:hidden"
          aria-label="关闭导航"
        >
          <NavIcon name="close" size={20} />
        </button>

        {/* 桌面端：收起按钮贴在侧栏顶栏右侧 */}
        {onToggleDesktop ? (
          <button
            type="button"
            onClick={onToggleDesktop}
            className="ml-auto hidden h-9 w-9 shrink-0 place-items-center rounded-lg text-body-muted transition-colors hover:bg-primary-soft hover:text-primary md:grid"
            aria-label="收起侧边栏"
            title="收起侧边栏"
          >
            <NavIcon name="chevron_left" size={20} />
          </button>
        ) : null}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3" aria-label="主导航">
        <ul className="flex flex-col gap-1">
          {items.map((item, index) => {
            if (isNavGroup(item)) {
              return (
                <li
                  key={`${item.label}-${index}`}
                  className="px-3 pb-1 pt-4 first:pt-1 text-[11px] font-semibold tracking-[0.06em] text-placeholder"
                >
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
                  title={item.hint}
                  className={({ isActive }) =>
                    `group relative flex min-h-[44px] items-center gap-3 overflow-hidden rounded-xl px-3 py-2 text-[14px] font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-soft text-primary'
                        : 'text-body-muted hover:bg-hover-overlay hover:text-ink'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* 纯图标，无色块底 */}
                      <span
                        className={`grid h-6 w-6 shrink-0 place-items-center transition-colors ${
                          isActive
                            ? 'text-primary'
                            : 'text-body-subtle group-hover:text-ink'
                        }`}
                      >
                        <NavIcon name={item.icon} size={22} />
                      </span>
                      <span className="min-w-0 flex-1 truncate leading-snug">
                        {item.label}
                      </span>
                      {isActive ? (
                        <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                      ) : null}
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User */}
      <div className="border-t border-hairline p-3">
        <div className="flex items-center gap-3 rounded-xl bg-canvas-parchment px-2.5 py-2.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-[13px] font-semibold text-on-primary">
            {user?.name?.[0] ?? 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-medium text-ink">
              {user?.name ?? '未登录用户'}
            </span>
            <span className="block text-[12px] text-placeholder">{roleLabel[role]}</span>
          </div>
          <button
            onClick={handleLogout}
            title="退出登录"
            className="grid h-9 w-9 place-items-center rounded-lg text-body-muted transition-colors hover:bg-canvas hover:text-error"
            aria-label="退出登录"
          >
            <NavIcon name="logout" size={20} />
          </button>
        </div>
      </div>
    </aside>
  );
}
