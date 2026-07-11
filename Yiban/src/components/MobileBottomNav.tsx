import { NavLink } from 'react-router-dom';
import { mobileNavByRole, type AppRole } from '../config/navigation';
import { useStore } from '../store/useStore';
import { NavIcon } from './icons/NavIcons';

export default function MobileBottomNav() {
  const role = (useStore((s) => s.currentUser?.role) ?? 'student') as AppRole;
  const items = mobileNavByRole[role];

  return (
    <nav className="mobile-bottom-nav md:hidden" aria-label="移动端主导航">
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path.split('/').length <= 2}
          className={({ isActive }) => `mobile-bottom-link ${isActive ? 'is-active' : ''}`}
        >
          <NavIcon name={item.icon} size={20} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
