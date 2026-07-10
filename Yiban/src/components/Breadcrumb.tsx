import { Link, useLocation } from 'react-router-dom';
import { labelForPath, labelForSegment, roleSectionLabel, type AppRole } from '../config/navigation';

interface BreadcrumbItem {
  label: string;
  path: string;
}

export default function Breadcrumb() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter(Boolean);

  if (pathnames.length === 0 || ['login', 'register', 'terms'].includes(pathnames[0])) {
    return null;
  }

  const role = pathnames[0] as AppRole;
  const breadcrumbs: BreadcrumbItem[] = [];

  if (['student', 'teacher', 'admin'].includes(role)) {
    breadcrumbs.push({
      label: roleSectionLabel[role] || role,
      path: `/${role}`,
    });
  }

  let currentPath = '';
  for (let i = 0; i < pathnames.length; i++) {
    const segment = pathnames[i];
    currentPath += `/${segment}`;
    if (i === 0 && ['student', 'teacher', 'admin'].includes(segment)) continue;

    // 跳过纯 id 段的原始展示，用整条路径解析名
    const isIdLike = /^\d+$/.test(segment) || segment.length > 20;
    const label = isIdLike
      ? labelForPath(currentPath)
      : labelForSegment(segment);

    // 避免与上一项重复（如片段与完整路径同名）
    if (breadcrumbs[breadcrumbs.length - 1]?.label === label) continue;

    breadcrumbs.push({ label, path: currentPath });
  }

  if (breadcrumbs.length <= 1) return null;

  return (
    <nav className="mb-4 flex items-center gap-1.5 text-[12.5px] text-placeholder" aria-label="面包屑">
      {breadcrumbs.map((item, index) => (
        <span key={`${item.path}-${index}`} className="flex items-center gap-1.5">
          {index > 0 && (
            <span className="material-symbols-outlined text-[14px] text-placeholder">chevron_right</span>
          )}
          {index === breadcrumbs.length - 1 ? (
            <span className="font-medium text-body-muted">{item.label}</span>
          ) : (
            <Link to={item.path} className="transition-colors hover:text-ink">
              {item.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
