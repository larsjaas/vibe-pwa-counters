// src/components/NavBar.tsx
import React from 'react';
import { IconButton } from './IconButton';

interface NavBarProps {
  currentView: string;
  setView: (view: string) => void;
}

export const NavBar: React.FC<NavBarProps> = ({ currentView, setView }) => {
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
      <IconButton
        icon="🏠"
        label="Home"
        isActive={currentView === 'home'}
        onClick={() => setView('home')}
      />
      <IconButton
        icon="⚙️ "
        label="Settings"
        isActive={currentView === 'settings'}
        onClick={() => setView('settings')}
      />
      <IconButton
        icon="👤"
        label="Profile"
        isActive={currentView === 'profile'}
        onClick={() => setView('profile')}
      />
    </nav>
  );
};
