import React from 'react';
import { IconButton } from './IconButton';
import { LogOut, Trash2 } from 'lucide-react';

interface AccountActionsProps {
    onLogout: () => void;
    onDeleteAccountRequest: () => void;
}

export const AccountActions: React.FC<AccountActionsProps> = ({ onLogout, onDeleteAccountRequest }) => {
    return (
        <div className="account-actions">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <IconButton
                    icon={LogOut}
                    onClick={onLogout}
                    title="Log Out"
                />
                <span className="account-subtitle">Log Out</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <IconButton
                    icon={Trash2}
                    onClick={onDeleteAccountRequest}
                    title="Delete Account"
                    backgroundColor="#ff4d4f"
                    color="#fff"
                />
                <span className="account-subtitle" style={{ textAlign: 'center', whiteSpace: 'pre-line' }}>Delete{"\n"}Account</span>
            </div>
        </div>
    );
};
