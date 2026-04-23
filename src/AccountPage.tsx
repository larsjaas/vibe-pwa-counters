import React, { useEffect, useState } from 'react';
import { IconButton } from './components/IconButton';
import { LogOut, Trash2 } from 'lucide-react';

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
    const [showDeleteModal, setShowDeleteModal] = useState(false);

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

    const handleDeleteAccount = async () => {
        try {
            const response = await fetch('/api/account', {
                method: 'DELETE',
            });
            if (response.ok) {
                window.location.href = '/landing_page/index.html';
            } else {
                alert('Failed to delete account. Please try again.');
            }
        } catch (e: any) {
            alert(`Error deleting account: ${e.message}`);
        }
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
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <IconButton 
                        icon={LogOut} 
                        onClick={handleLogout} 
                        title="Log Out" 
                    />
                    <span className="account-subtitle">Log Out</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <IconButton 
                        icon={Trash2} 
                        onClick={() => setShowDeleteModal(true)} 
                        title="Delete Account" 
                        backgroundColor="#ff4d4f" 
                        color="#fff"
                    />
                    <span className="account-subtitle" style={{ textAlign: 'center', whiteSpace: 'pre-line' }}>Delete{"\n"}Account</span>
                </div>
            </div>

            {showDeleteModal && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', 
                    justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <div className="modal-content" style={{
                        background: 'white', padding: '2rem', borderRadius: '12px',
                        textAlign: 'center', maxWidth: '320px', width: '90%',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    }}>
                        <h3 style={{ marginTop: 0 }}>Delete Account</h3>
                        <p>Are you sure? This action is permanent.</p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
                            <button 
                                onClick={() => setShowDeleteModal(false)} 
                                style={{ padding: '0.5rem 1rem', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ccc', background: '#eee' }}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={async () => {
                                    setShowDeleteModal(false);
                                    await handleDeleteAccount();
                                }} 
                                style={{ padding: '0.5rem 1rem', cursor: 'pointer', borderRadius: '4px', border: 'none', background: '#ff4d4f', color: 'white', fontWeight: 'bold' }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
}
