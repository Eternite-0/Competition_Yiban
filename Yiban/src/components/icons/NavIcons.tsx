/**
 * 易赛通侧栏矢量图标 — 稍粗描边、24 视口、无色块依赖。
 */
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function baseProps(size: number, props: IconProps) {
  const { size: _s, className, ...rest } = props;
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    className,
    'aria-hidden': true as const,
    ...rest,
  };
}

const s = {
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function IconDashboard(p: IconProps) {
  const size = p.size ?? 22;
  return (
    <svg {...baseProps(size, p)}>
      <path d="M4 4.75h6.5v6.5H4v-6.5Z" {...s} />
      <path d="M13.5 4.75H20v4H13.5v-4Z" {...s} />
      <path d="M13.5 11.25H20V19.5H13.5v-8.25Z" {...s} />
      <path d="M4 13.75h6.5V19.5H4v-5.75Z" {...s} />
    </svg>
  );
}

export function IconTrophy(p: IconProps) {
  const size = p.size ?? 22;
  return (
    <svg {...baseProps(size, p)}>
      <path d="M8 5h8v4a4 4 0 0 1-8 0V5Z" {...s} />
      <path d="M8 6.5H5.75A2.75 2.75 0 0 0 8.5 9.25" {...s} />
      <path d="M16 6.5h2.25A2.75 2.75 0 0 1 15.5 9.25" {...s} />
      <path d="M12 13v2.5" {...s} />
      <path d="M9.5 19.5h5" {...s} />
      <path d="M10 15.5h4v4h-4v-4Z" {...s} />
    </svg>
  );
}

export function IconCalendar(p: IconProps) {
  const size = p.size ?? 22;
  return (
    <svg {...baseProps(size, p)}>
      <rect x="3.75" y="5" width="16.5" height="14.5" rx="2.25" {...s} />
      <path d="M3.75 9.5h16.5" {...s} />
      <path d="M8 3.5v3.25M16 3.5v3.25" {...s} />
      <path d="M8 13.25h.02M12 13.25h.02M16 13.25h.02M8 16.5h.02M12 16.5h.02" {...s} />
    </svg>
  );
}

export function IconUsers(p: IconProps) {
  const size = p.size ?? 22;
  return (
    <svg {...baseProps(size, p)}>
      <circle cx="9" cy="8" r="3" {...s} />
      <path d="M3.5 19c.5-3 2.7-4.75 5.5-4.75S14 16 14.5 19" {...s} />
      <circle cx="16.75" cy="9" r="2.4" {...s} />
      <path d="M15.2 14.5c2 .4 3.55 1.55 4 3.5" {...s} />
    </svg>
  );
}

export function IconMedal(p: IconProps) {
  const size = p.size ?? 22;
  return (
    <svg {...baseProps(size, p)}>
      <circle cx="12" cy="13.75" r="5.25" {...s} />
      <path d="M9.25 9.2 7.75 3.75h3.1L12 7.4l1.15-3.65h3.1L14.75 9.2" {...s} />
      <path d="M10.25 13.75h3.5M12 12v3.5" {...s} />
    </svg>
  );
}

export function IconClipboard(p: IconProps) {
  const size = p.size ?? 22;
  return (
    <svg {...baseProps(size, p)}>
      <rect x="5" y="4.75" width="14" height="15.5" rx="2.25" {...s} />
      <path d="M9 4.75h6v2.4a1.1 1.1 0 0 1-1.1 1.1h-3.8A1.1 1.1 0 0 1 9 7.15V4.75Z" {...s} />
      <path d="M8.5 11.5h7M8.5 15h5" {...s} />
    </svg>
  );
}

export function IconProgress(p: IconProps) {
  const size = p.size ?? 22;
  return (
    <svg {...baseProps(size, p)}>
      <path d="M4 17.5 9.25 11l3.5 3.5L20 6.5" {...s} />
      <path d="M14.25 6.5H20V12.25" {...s} />
    </svg>
  );
}

export function IconRadar(p: IconProps) {
  const size = p.size ?? 22;
  return (
    <svg {...baseProps(size, p)}>
      <circle cx="12" cy="12" r="8.25" {...s} />
      <circle cx="12" cy="12" r="4.75" {...s} />
      <circle cx="12" cy="12" r="1.35" fill="currentColor" stroke="none" />
      <path d="M12 12 17.75 8" {...s} />
    </svg>
  );
}

export function IconAudit(p: IconProps) {
  const size = p.size ?? 22;
  return (
    <svg {...baseProps(size, p)}>
      <path d="M8.75 11.75 11 14l4.75-4.75" {...s} />
      <path d="M8 4.25h8l3.25 3.25V18.5A1.75 1.75 0 0 1 17.5 20.25h-11A1.75 1.75 0 0 1 4.75 18.5V6A1.75 1.75 0 0 1 6.5 4.25H8Z" {...s} />
    </svg>
  );
}

export function IconChart(p: IconProps) {
  const size = p.size ?? 22;
  return (
    <svg {...baseProps(size, p)}>
      <path d="M4 19.5h16" {...s} />
      <path d="M7 16.5V10" {...s} />
      <path d="M12 16.5V7" {...s} />
      <path d="M17 16.5v-5" {...s} />
    </svg>
  );
}

export function IconSchool(p: IconProps) {
  const size = p.size ?? 22;
  return (
    <svg {...baseProps(size, p)}>
      <path d="M3.5 10.25 12 5.75l8.5 4.5L12 14.75 3.5 10.25Z" {...s} />
      <path d="M7 12.25v4c0 .5.85 2 5 2s5-1.5 5-2v-4" {...s} />
      <path d="M20.5 10.25v5.5" {...s} />
    </svg>
  );
}

export function IconTrend(p: IconProps) {
  const size = p.size ?? 22;
  return (
    <svg {...baseProps(size, p)}>
      <path d="M3.75 16.75 9.25 11.25l3.5 3 7.5-7.5" {...s} />
      <path d="M15 6.75h5.25v5.25" {...s} />
    </svg>
  );
}

export function IconPlus(p: IconProps) {
  const size = p.size ?? 22;
  return (
    <svg {...baseProps(size, p)}>
      <circle cx="12" cy="12" r="8.25" {...s} />
      <path d="M12 8.25v7.5M8.25 12h7.5" {...s} />
    </svg>
  );
}

export function IconDraft(p: IconProps) {
  const size = p.size ?? 22;
  return (
    <svg {...baseProps(size, p)}>
      <path d="M7 3.75h7.25L19.25 9v10.5A1.75 1.75 0 0 1 17.5 21.25H7A1.75 1.75 0 0 1 5.25 19.5v-14A1.75 1.75 0 0 1 7 3.75Z" {...s} />
      <path d="M14 3.75V9h5.25" {...s} />
      <path d="M9 13.25h6M9 16.75h4" {...s} />
    </svg>
  );
}

export function IconCompass(p: IconProps) {
  const size = p.size ?? 22;
  return (
    <svg {...baseProps(size, p)}>
      <circle cx="12" cy="12" r="8.25" {...s} />
      <path d="m15.1 8.9-1.45 4.55-4.55 1.45 1.45-4.55L15.1 8.9Z" {...s} />
    </svg>
  );
}

export function IconMegaphone(p: IconProps) {
  const size = p.size ?? 22;
  return (
    <svg {...baseProps(size, p)}>
      <path d="M4.5 10.75v2.75c0 .9.75 1.6 1.65 1.6H7.5l2 3.9h2.15v-3.9H12l6.5 2.6V7.1L12 9.75H6.15c-.9 0-1.65.7-1.65 1.6Z" {...s} />
      <path d="M18.75 9.75c.75.65.75 2.55 0 3.2" {...s} />
    </svg>
  );
}

export function IconUserCheck(p: IconProps) {
  const size = p.size ?? 22;
  return (
    <svg {...baseProps(size, p)}>
      <circle cx="9" cy="8" r="3" {...s} />
      <path d="M3.5 19c.5-3 2.7-4.75 5.5-4.75 1.45 0 2.7.4 3.65 1.05" {...s} />
      <path d="m14 15.75 1.6 1.6 3.65-3.65" {...s} />
    </svg>
  );
}

export function IconSparkle(p: IconProps) {
  const size = p.size ?? 22;
  return (
    <svg {...baseProps(size, p)}>
      <path d="M12 3.5 13.55 9.25 19.25 10.8 13.55 12.35 12 18.1 10.45 12.35 4.75 10.8 10.45 9.25 12 3.5Z" {...s} />
      <path d="M18.1 15.6 18.75 17.7 20.85 18.4 18.75 19.1 18.1 21.2 17.45 19.1 15.35 18.4 17.45 17.7 18.1 15.6Z" {...s} />
    </svg>
  );
}

export function IconUsersCog(p: IconProps) {
  const size = p.size ?? 22;
  return (
    <svg {...baseProps(size, p)}>
      <circle cx="9" cy="8" r="3" {...s} />
      <path d="M3.5 19c.5-3 2.7-4.75 5.5-4.75s5 1.75 5.5 4.75" {...s} />
      <circle cx="17.5" cy="15.75" r="2.35" {...s} />
      <path d="M17.5 12.85v.7M17.5 18v.7M14.95 14.2l.5.5M19.55 16.8l.5.5M14.95 16.8l.5-.5M19.55 14.2l.5-.5" {...s} />
    </svg>
  );
}

export function IconRoster(p: IconProps) {
  const size = p.size ?? 22;
  return (
    <svg {...baseProps(size, p)}>
      <rect x="4" y="4" width="16" height="16" rx="2.25" {...s} />
      <path d="M8 8.75h8M8 12h8M8 15.25h5" {...s} />
    </svg>
  );
}

export function IconBuilding(p: IconProps) {
  const size = p.size ?? 22;
  return (
    <svg {...baseProps(size, p)}>
      <path d="M4.5 20.5h15" {...s} />
      <path d="M6 20.5V6.5a1.25 1.25 0 0 1 1.25-1.25h9.5A1.25 1.25 0 0 1 18 6.5v14" {...s} />
      <path d="M9.5 9h.02M14.5 9h.02M9.5 12.5h.02M14.5 12.5h.02M9.5 16h.02M14.5 16h.02" {...s} />
    </svg>
  );
}

export function IconClass(p: IconProps) {
  const size = p.size ?? 22;
  return (
    <svg {...baseProps(size, p)}>
      <rect x="3.5" y="5" width="17" height="11.5" rx="1.75" {...s} />
      <path d="M8 20.5h8M12 16.5v4" {...s} />
      <path d="M7 9.25h4.5M7 12.5h6.5" {...s} />
    </svg>
  );
}

export function IconLogout(p: IconProps) {
  const size = p.size ?? 22;
  return (
    <svg {...baseProps(size, p)}>
      <path d="M10 4.5H6.5A2.25 2.25 0 0 0 4.25 6.75v10.5A2.25 2.25 0 0 0 6.5 19.5H10" {...s} />
      <path d="M14.5 12H9.25" {...s} />
      <path d="m16.75 8.5 4 3.5-4 3.5" {...s} />
    </svg>
  );
}

export function IconBell(p: IconProps) {
  const size = p.size ?? 22;
  return (
    <svg {...baseProps(size, p)}>
      <path d="M6 16.75h12l-1.25-1.6V11a4.75 4.75 0 1 0-9.5 0v4.15L6 16.75Z" {...s} />
      <path d="M10.15 18.75a1.85 1.85 0 0 0 3.7 0" {...s} />
    </svg>
  );
}

export function IconMenu(p: IconProps) {
  const size = p.size ?? 22;
  return (
    <svg {...baseProps(size, p)}>
      <path d="M4.5 7h15M4.5 12h15M4.5 17h15" {...s} />
    </svg>
  );
}

export function IconChevronLeft(p: IconProps) {
  const size = p.size ?? 22;
  return (
    <svg {...baseProps(size, p)}>
      <path d="m14.5 6-5 6 5 6" {...s} />
    </svg>
  );
}

export function IconChevronRight(p: IconProps) {
  const size = p.size ?? 22;
  return (
    <svg {...baseProps(size, p)}>
      <path d="m9.5 6 5 6-5 6" {...s} />
    </svg>
  );
}

export function IconPanelLeft(p: IconProps) {
  const size = p.size ?? 22;
  return (
    <svg {...baseProps(size, p)}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.25" {...s} />
      <path d="M9 4.5v15" {...s} />
    </svg>
  );
}

export function IconSearch(p: IconProps) {
  const size = p.size ?? 22;
  return (
    <svg {...baseProps(size, p)}>
      <circle cx="11" cy="11" r="5.75" {...s} />
      <path d="m15.75 15.75 4 4" {...s} />
    </svg>
  );
}

export function IconClose(p: IconProps) {
  const size = p.size ?? 22;
  return (
    <svg {...baseProps(size, p)}>
      <path d="M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5" {...s} />
    </svg>
  );
}

export const navIconMap = {
  space_dashboard: IconDashboard,
  emoji_events: IconTrophy,
  calendar_month: IconCalendar,
  group_add: IconUsers,
  workspace_premium: IconMedal,
  assignment_ind: IconClipboard,
  timeline: IconProgress,
  insights: IconRadar,
  fact_check: IconAudit,
  analytics: IconChart,
  school: IconSchool,
  trending_up: IconTrend,
  add_circle: IconPlus,
  draft: IconDraft,
  travel_explore: IconCompass,
  campaign: IconMegaphone,
  how_to_reg: IconUserCheck,
  auto_awesome: IconSparkle,
  manage_accounts: IconUsersCog,
  group: IconRoster,
  class: IconClass,
  logout: IconLogout,
  notifications: IconBell,
  menu: IconMenu,
  close: IconClose,
  left_panel_close: IconPanelLeft,
  left_panel_open: IconPanelLeft,
  chevron_left: IconChevronLeft,
  chevron_right: IconChevronRight,
  search: IconSearch,
} as const;

export type NavIconName = keyof typeof navIconMap;

export function NavIcon({
  name,
  size = 22,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const Comp = navIconMap[name as NavIconName] ?? IconDashboard;
  return <Comp size={size} className={className} />;
}
