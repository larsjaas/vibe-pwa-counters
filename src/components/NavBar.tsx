import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IconButton } from './IconButton';
import { LayoutDashboard, BarChart3, UserCircle } from 'lucide-react';

export const NavBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const views = [
    { path: '/', icon: LayoutDashboard, label: 'Counters' },
    { path: '/stats', icon: BarChart3, label: 'Statistics' },
    { path: '/profile', icon: UserCircle, label: 'Account' },
  ] as const;

  return (
    <nav className="nav-bar">
      {views.map((view) => (
        <IconButton
          key={view.path}
          icon={view.icon}
          title={view.label}
          onClick={() => navigate(view.path)}
          backgroundColor={location.pathname === view.path ? '#e0e0e0' : 'transparent'}
        />
      ))}
    </nav>
  );
};
