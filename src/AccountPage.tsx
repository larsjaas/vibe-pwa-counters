import React, { useEffect, useState } from 'react';
import { IconButton } from './components/IconButton';
import { LogOut } from 'lucide-react';

interface UserInfo {
    email: string;
    name?: string;
}

export const AccountPage: React.FC = () => {
    const [user, setUser] = useState<UserInfo | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await fetch('/api/account');
                if (!res.ok) throw new Error('Failed to fetch account information');
                const data = await res.json();
                setUser(data);
            } catch (e: any) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, []);

    const handleLogout = () => {
        window.location.href = '/api/logout';
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '1.5em' }}>
                Loading...
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '1.5em', color: 'red' }}>
                <div>Error: {error}</div>
                <button onClick={() => window.location.reload()} style={{ marginTop: '20px', padding: '8px 16px', cursor: 'pointer' }}>
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100vh', 
            fontSize: '1.5em', 
            padding: '20px',
            textAlign: 'center'
        }}>
            <div style={{ marginBottom: '30px', fontWeight: 'bold' }}>Account Information</div>
            
            {user && (
                <div style={{ marginBottom: '40px', lineHeight: '1.6' }}>
                    <div><strong>Email:</strong> {user.email}</div>
                    {user.name && <div><strong>Name:</strong> {user.name}</div>}
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <IconButton 
                    icon={LogOut} 
                    onClick={handleLogout} 
                    title="Log Out" 
                />
                <span style={{ fontSize: '0.6em', color: '#666' }}>Log Out</span>
            </div>
        </div>
    );
};
