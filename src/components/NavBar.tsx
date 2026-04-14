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
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '65px',
      backgroundColor: 'white',
      borderTop: '1px solid #ddd',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      zIndex: 1000
    }}>
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
