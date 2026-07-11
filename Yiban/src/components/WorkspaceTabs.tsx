import { NavLink, useLocation } from 'react-router-dom';
import { workspaceGroupsByRole, type AppRole } from '../config/navigation';
import { useStore } from '../store/useStore';
import { NavIcon } from './icons/NavIcons';

function pathMatches(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export default function WorkspaceTabs() {
  const location = useLocation();
  const role = (useStore((s) => s.currentUser?.role) ?? 'student') as AppRole;
  const group = workspaceGroupsByRole[role].find((item) =>
    item.paths.some((path) => pathMatches(location.pathname, path)),
  );

  if (!group || group.tabs.length < 2) return null;

  return (
    <nav className="workspace-tabs" aria-label={`${group.label}工作区`}>
      <span className="workspace-tabs-label">{group.label}</span>
      <div className="workspace-tabs-scroll no-scrollbar">
        {group.tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) => `workspace-tab ${isActive || pathMatches(location.pathname, tab.path) ? 'is-active' : ''}`}
          >
            {tab.icon ? <NavIcon name={tab.icon} size={17} /> : null}
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
