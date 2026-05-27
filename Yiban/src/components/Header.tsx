import { useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';

const titleMap: Record<string, string> = {
  '/student': '工作台',
  '/student/competitions': '赛事大厅',
  '/student/calendar': '赛事日历',
  '/student/teams': '招募大厅',
  '/student/works': '光荣榜',
  '/student/registrations': '我的参赛',
  '/student/growth': '能力雷达',
  '/student/achievements/upload': '上传成果',
  '/teacher': '工作台',
  '/teacher/competitions': '赛事大厅',
  '/teacher/audit': '成果审批',
  '/teacher/student-competitions': '学生看板',
  '/teacher/student-growth': '学情分析',
  '/admin': '工作台',
  '/admin/competitions': '赛事管理',
  '/admin/publish': '赛事发布',
  '/admin/works': '作品库',
  '/admin/audit': '系统审核',
};

function resolveTitle(path: string): string {
  if (titleMap[path]) return titleMap[path];
  // Match dynamic detail routes
  if (/^\/student\/competitions\/.+/.test(path)) return '赛事详情';
  if (/^\/student\/registrations\/workbench\/.+/.test(path)) return '报名工作台';
  if (/^\/student\/upload\/.+/.test(path)) return '提交作品';
  return '易赛通';
}

interface HeaderProps {
  mobileNavOpen: boolean;
  onToggleMobileNav: () => void;
}

export default function Header({ mobileNavOpen, onToggleMobileNav }: HeaderProps) {
  const user = useStore((s) => s.currentUser);
  const location = useLocation();
  const title = resolveTitle(location.pathname);

  return (
    <header className="fixed left-0 right-0 top-0 z-30 flex h-[52px] items-center justify-between border-b border-hairline bg-canvas-parchment/85 px-md backdrop-blur-[20px] backdrop-saturate-150 sm:px-lg md:left-[260px] md:px-xl">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleMobileNav}
          className="grid h-9 w-9 place-items-center rounded-full text-ink md:hidden"
          aria-label={mobileNavOpen ? '关闭导航' : '打开导航'}
        >
          <span className="material-symbols-outlined text-[20px]">
            {mobileNavOpen ? 'close' : 'menu'}
          </span>
        </button>
        <h2 className="text-[21px] font-semibold tracking-tight text-ink leading-none">{title}</h2>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden lg:flex items-center h-9 w-[220px] rounded-pill bg-canvas border border-hairline focus-within:border-primary-focus transition-all">
          <span className="material-symbols-outlined text-[17px] text-ink-muted-48 ml-3.5">search</span>
          <input
            className="h-full flex-1 bg-transparent px-2 outline-none text-[14px] text-ink placeholder:text-ink-muted-48"
            placeholder="搜索赛事、团队、作品"
            type="text"
          />
          <kbd className="mr-2 px-1.5 py-0.5 rounded-xs bg-primary/8 text-[10px] text-ink-muted-48 font-mono">Ctrl K</kbd>
        </div>

        <button className="relative w-9 h-9 grid place-items-center rounded-full hover:bg-primary/6 active:scale-95 transition-all text-ink-muted-80 hover:text-ink">
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full ring-2 ring-canvas-parchment" />
        </button>

        <div className="flex items-center gap-2 cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-primary text-on-primary grid place-items-center text-[12px] font-semibold transition-transform group-active:scale-95">
            {user?.name?.[0] ?? 'U'}
          </div>
        </div>
      </div>
    </header>
  );
}
