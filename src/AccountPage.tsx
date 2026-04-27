import React, { useEffect, useState } from 'react';
import { IconButton } from './components/IconButton';
import { LogOut, Trash2, Plus, Key } from 'lucide-react';
import { ConfirmationModal } from './components/ConfirmationModal';

interface UserInfo {
    email: string;
    name?: string;
}

interface APIKey {
    id: number;
    apikey: string;
    createtime: string;
    lastused: string | null;
}

const FRONTEND_VERSION = "0.9.0";

export const AccountPage: React.FC = () => {
    const [user, setUser] = useState<UserInfo | null>(null);
    const [apikeys, setApikeys] = useState<APIKey[]>([]);
    const [beVersion, setBeVersion] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [apiKeyToDelete, setApiKeyToDelete] = useState<number | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [userRes, infoRes, keysRes] = await Promise.all([
                    fetch('/api/account'),
                    fetch('/api/info'),
                    fetch('/api/apikeys'),
                ]);
                
                if (!userRes.ok) throw new Error('Failed to fetch account information');
                if (!infoRes.ok) throw new Error('Failed to fetch system information');
                if (!keysRes.ok) throw new Error('Failed to fetch API keys');

                const userData = await userRes.json();
                const infoData = await infoRes.json();
                const keysData = await keysRes.json();

                setUser(userData);
                setBeVersion(infoData.version);
                setApikeys(keysData);
            } catch (e: any) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleCreateAPIKey = async () => {
        try {
            const res = await fetch('/api/apikeys/create', { method: 'POST' });
            if (!res.ok) throw new Error('Failed to create API key');
            
            // Refresh the list
            const keysRes = await fetch('/api/apikeys');
            if (!keysRes.ok) throw new Error('Failed to refresh API keys');
            const keysData = await keysRes.json();
            setApikeys(keysData);
        } catch (e: any) {
            alert(`Error creating API key: ${e.message}`);
        }
    };

    const handleDeleteAPIKey = async (id: number) => {
        try {
            const res = await fetch(`/api/apikeys/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete API key');
            
            setApikeys(prev => prev.filter(key => key.id !== id));
        } catch (e: any) {
            alert(`Error deleting API key: ${e.message}`);
        }
    };

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
            <h2 className="account-section">Account Information</h2>
            
            {user && (
                <div className="account-info">
                    <div><strong>Email:</strong> {user.email}</div>
                    {user.name && <div><strong>Name:</strong> {user.name}</div>}
                </div>
            )}

            <div style={{ marginTop: '2rem', marginBottom: '3rem' }}>
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: '1rem' 
                }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>API Keys</h3>
                    <IconButton 
                        icon={Plus} 
                        onClick={handleCreateAPIKey} 
                        title="Create New API Key" 
                        backgroundColor="#0070f3" 
                        color="#fff" 
                    />
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ 
                        width: '100%', 
                        borderCollapse: 'collapse', 
                        fontSize: '0.85rem',
                        textAlign: 'left'
                    }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #eee', color: '#888' }}>
                                <th style={{ padding: '8px 0' }}>Key</th>
                                <th style={{ padding: '8px 0', textAlign: 'right' }}>Created</th>
                                <th style={{ padding: '8px 0', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody style={{ textAlign: 'left' }}>
                            {apikeys.map(key => (
                                <tr key={key.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                                    <td style={{ padding: '8px 0', fontFamily: 'monospace' }}>{key.apikey}</td>
                                    <td style={{ padding: '8px 0', textAlign: 'right', color: '#666' }}>
                                        {new Date(key.createtime).toLocaleDateString()}
                                    </td>
                                    <td style={{ padding: '8px 0', textAlign: 'right' }}>
                                        <Trash2 
                                            size={16} 
                                            color="#d32f2f" 
                                            style={{ cursor: 'pointer' }} 
                                            onClick={() => setApiKeyToDelete(key.id)} 
                                        />
                                    </td>
                                </tr>
                            ))}
                            {apikeys.length === 0 && (
                                <tr>
                                    <td colSpan={3} style={{ padding: '1rem', textAlign: 'center', color: '#999' }}>
                                        No API keys found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

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

            {apiKeyToDelete !== null && (
                <ConfirmationModal 
                    message="Do you want to delete the selected API key?" 
                    onConfirm={async () => {
                        await handleDeleteAPIKey(apiKeyToDelete);
                        setApiKeyToDelete(null);
                    }} 
                    onCancel={() => setApiKeyToDelete(null)} 
                    confirmText="Delete"
                    cancelText="Cancel"
                />
            )}

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
                fontStyle: 'italic',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
            }}>
                <div style={{ textAlign: 'center' }}>Frontend version {FRONTEND_VERSION}, backend version {beVersion}</div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <a href="/privacy_policy.html" target="_blank" rel="noopener noreferrer" style={{ color: '#999', textDecoration: 'underline' }}>Privacy Policy</a>
                    <a href="/terms_of_service.html" target="_blank" rel="noopener noreferrer" style={{ color: '#999', textDecoration: 'underline' }}>Terms of Service</a>
                </div>
            </div>
        </div>
    );
}
