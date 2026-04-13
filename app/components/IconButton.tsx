// src/components/IconButton.tsx
import React from 'react';

interface IconButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  isActive?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({ icon, label, onClick, isActive }) => {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        padding: '10px',
        cursor: 'pointer',
        border: 'none',
        backgroundColor: isActive ? '#e2e8f0' : 'transparent',
        borderRadius: '8px',
        color: isActive ? '#2563eb' : '#64748b',
        transition: 'all 0.2s',
        fontSize: '12px',
        fontWeight: isActive ? 'bold' : 'normal'
      }}
    >
      <span style={{ fontSize: '20px' }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
};
