import React, { useEffect, useState } from 'react';
import { IconButton } from './components/IconButton';
import { LogOut } from 'lucide-react';

interface UserInfo {
    email: string;
    name?: string;
}

const FRONTEND_VERSION = "0.6";

export const AccountPage: React.FC = () => {
    const [user, setUser] = useState<UserInfo | null>(null);
    const [beVersion, setBeVersion] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [userRes, infoRes] = await Promise.all([
                    fetch('/api/account'),
                    fetch('/api/info'),
                ]);
                
                if (!userRes.ok) throw new Error('Failed to fetch account information');
                if (!infoRes.ok) throw new Error('Failed to fetch system information');

                const userData = await userRes.json();
                const infoData = await infoRes.json();

                setUser(userData);
                setBeVersion(infoData.version);
            } catch (e: any) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleLogout = () => {
        window.location.href = '/api/logout';
    };

    if (loading) {
        return (
            <div className="account-page-container">
                Loading...
            </div>
        );
    }

    if (error) {
        return (
            <div className="account-page-container account-error">
                <div>Error: {error}</div>
                <button onClick={() => window.location.reload()} className="btn-secondary" style={{ marginTop: '20px' }}>
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="account-page-container">
            <div className="account-section">Account Information</div>
            
            {user && (
                <div className="account-info">
                    <div><strong>Email:</strong> {user.email}</div>
                    {user.name && <div><strong>Name:</strong> {user.name}</div>}
                </div>
            )}

            <div className="account-actions">
                <IconButton 
                    icon={LogOut} 
                    onClick={handleLogout} 
                    title="Log Out" 
                />
                <span className="account-subtitle">Log Out</span>
            </div>
            <div style={{ 
                marginTop: '40px', 
                fontSize: '0.5em', 
                color: '#999', 
                fontStyle: 'italic' 
            }}>
                Frontend version {FRONTEND_VERSION}, backend version {beVersion}
            </div>
        </div>
    );
};
