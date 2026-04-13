import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface IconButtonProps {
    icon: LucideIcon;
    onClick: () => void;
    title?: string;
    backgroundColor?: string;
    color?: string;
    style?: React.CSSProperties;
}

export const IconButton: React.FC<IconButtonProps> = ({
    icon: Icon,
    onClick,
    title,
    backgroundColor = '#e0e0e0',
    color = '#333',
    style,
}) => {
    return (
        <button
            onClick={onClick}
            title={title}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '1.8rem',
                height: '1.8rem',
                borderRadius: '50%',
                background: backgroundColor,
                border: 'none',
                cursor: 'pointer',
                color: color,
                padding: 0,
                transition: 'opacity 0.2s',
                ...style,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
            <Icon size={20} strokeWidth={2} />
        </button>
    );
};

