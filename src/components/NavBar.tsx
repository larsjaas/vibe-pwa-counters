import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IconButton } from './IconButton';
import { LayoutDashboard, BarChart3, UserCircle } from 'lucide-react';

interface NavBarProps {
  pendingInvitesCount?: number;
}

export const NavBar: React.FC<NavBarProps> = ({ pendingInvitesCount = 0 }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const views = [
    { path: '/', icon: LayoutDashboard, label: 'Counters' },
    { path: '/stats', icon: BarChart3, label: 'Statistics' },
    { path: '/profile', icon: UserCircle, label: 'Account', hasNotification: pendingInvitesCount > 0 },
  ] as const;

  return (
    <nav className="nav-bar">
      {views.map((view) => (
        <div key={view.path} style={{ position: 'relative' }}>
          <IconButton
            icon={view.icon}
            title={view.label}
            onClick={() => navigate(view.path)}
            backgroundColor={location.pathname === view.path ? '#e0e0e0' : 'transparent'}
          />
          {view.hasNotification !== undefined && view.hasNotification && (
            <div 
              style={{ 
                position: 'absolute', 
                top: '3px', 
                right: '3px', 
                width: '8px', 
                height: '8px', 
                backgroundColor: 'red', 
                borderRadius: '50%', 
                border: '1px solid white',
                zIndex: 1
              }} 
            />
          )}
        </div>
      ))}
    </nav>
  );
};
