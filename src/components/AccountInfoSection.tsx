import React from 'react';
import { UserInfo } from '../hooks/useAccount';

interface AccountInfoSectionProps {
    user: UserInfo | null;
}

export const AccountInfoSection: React.FC<AccountInfoSectionProps> = ({ user }) => {
    if (!user) return null;
    return (
        <div className="account-info">
            <div><strong>Email:</strong> {user.email}</div>
            {user.name && <div><strong>Name:</strong> {user.name}</div>}
        </div>
    );
};
