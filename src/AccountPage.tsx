import React, { useEffect, useState } from 'react';
import { IconButton } from './components/IconButton';
import { LogOut, Trash2, Plus, Key, Check, X, Settings, User } from 'lucide-react';
import { ConfirmationModal } from './components/ConfirmationModal';
import { useLocation, useNavigate } from 'react-router-dom';

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

interface TagShare {
    tag_id: number;
    tag_name: string;
    owner_email: string;
    user_email: string;
    access_level: number;
}

interface TagInvite {
    id: number;
    tag_name: string;
    other_party_email: string;
    sender_id: number;
    access_level: number;
    is_sender: boolean;
    status: string;
}

interface AccountPageProps {
    fetchInvitesCount?: () => Promise<void>;
    refreshTrigger?: number;
}

const FRONTEND_VERSION = "0.9.10";

const SettingSwitch = ({ label, checked, onChange }: { label: string, checked: boolean, onChange: (val: boolean) => void }) => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem 0',
        borderBottom: '1px solid #eee',
        width: '95%',
        margin: '0 auto'
    }}>
        <span style={{ fontSize: '1rem' }}>{label}</span>
        <div
            onClick={() => onChange(!checked)}
            style={{
                width: '40px',
                height: '20px',
                backgroundColor: checked ? '#4caf50' : '#ccc',
                borderRadius: '10px',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
            }}
        >
            <div style={{
                width: '16px',
                height: '16px',
                backgroundColor: 'white',
                borderRadius: '50%',
                position: 'absolute',
                top: '2px',
                left: checked ? '22px' : '2px',
                transition: 'left 0.2s'
            }} />
        </div>
    </div>
);

export const AccountPage: React.FC<AccountPageProps> = ({ fetchInvitesCount, refreshTrigger }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [user, setUser] = useState<UserInfo | null>(null);
    const [apikeys, setApikeys] = useState<APIKey[]>([]);
    const [tagshares, setTagshares] = useState<TagShare[]>([]);
    const [invites, setInvites] = useState<TagInvite[]>([]);
    const [beVersion, setBeVersion] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [apiKeyToDelete, setApiKeyToDelete] = useState<number | null>(null);
    const [tagShareToDelete, setTagShareToDelete] = useState<TagShare | null>(null);
    const [tagSharing, setTagSharing] = useState(true);
    const [emailAlerts, setEmailAlerts] = useState(false);
    const [inviteReminders, setInviteReminders] = useState(false);

    const view = location.pathname.endsWith('/settings') ? 'settings' : 'info';

    const fetchData = async () => {
        console.log('AccountPage: Fetching data...');
        try {
            const [userRes, infoRes, keysRes, sharesRes, invitesRes, settingsRes] = await Promise.all([
                fetch('/api/account'),
                fetch('/api/info'),
                fetch('/api/apikeys'),
                fetch('/api/tags/shares/me'),
                fetch('/api/invites'),
                fetch('/api/settings'),
            ]);

            if (!userRes.ok) throw new Error('Failed to fetch account information');
            if (!infoRes.ok) throw new Error('Failed to fetch system information');
            if (!keysRes.ok) throw new Error('Failed to fetch API keys');
            if (!sharesRes.ok) throw new Error('Failed to fetch tag shares');
            if (!invitesRes.ok) throw new Error('Failed to fetch invites');
            if (!settingsRes.ok) throw new Error('Failed to fetch settings');

            const userData = await userRes.json();
            const infoData = await infoRes.json();
            const keysData = await keysRes.json();
            const sharesData = await sharesRes.json();
            const invitesData = await invitesRes.json();
            const settingsData = await settingsRes.json();

            const parseBool = (val: any, defaultVal: boolean) => {
                if (val === undefined || val === null) return defaultVal;
                return val === 'true' || val === true;
            };

            console.log('AccountPage: Data fetched successfully');
            setUser(userData);
            setBeVersion(infoData.version);
            setApikeys(keysData);
            setTagshares(sharesData);
            setInvites(invitesData);
            setTagSharing(parseBool(settingsData.tag_sharing, true));
            setEmailAlerts(parseBool(settingsData.tag_sharing_email, false));
            setInviteReminders(parseBool(settingsData.tag_sharing_reminder, false));
        } catch (e: any) {
            console.error('AccountPage: Fetch error:', e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        console.log('AccountPage: useEffect triggered with refreshTrigger:', refreshTrigger);
        fetchData();
    }, [refreshTrigger]);

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

    const handleDeleteTagShare = async (share: TagShare) => {
        try {
            const res = await fetch(`/api/tags/${share.tag_id}/shares/${share.user_email}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to remove tag share');

            setTagshares(prev => prev.filter(s => !(s.tag_id === share.tag_id && s.user_email === share.user_email)));
        } catch (e: any) {
            alert(`Error removing tag share: ${e.message}`);
        }
    };

    const handleAcceptInvite = async (id: number) => {
        try {
            const res = await fetch(`/api/invites/${id}/accept`, { method: 'POST' });
            if (!res.ok) throw new Error('Failed to accept invite');

            setInvites(prev => prev.filter(i => i.id !== id));

            // Refresh tag shares list
            const sharesRes = await fetch('/api/tags/shares/me');
            if (sharesRes.ok) {
                const sharesData = await sharesRes.json();
                setTagshares(sharesData);
            }

            if (fetchInvitesCount) {
                await fetchInvitesCount();
            }
        } catch (e: any) {
            alert(`Error accepting invite: ${e.message}`);
        }
    };

    const handleRejectInvite = async (id: number) => {
        try {
            const res = await fetch(`/api/invites/${id}/reject`, { method: 'POST' });
            if (!res.ok) throw new Error('Failed to reject invite');

            setInvites(prev => prev.filter(i => i.id !== id));

            if (fetchInvitesCount) {
                await fetchInvitesCount();
            }
        } catch (e: any) {
            alert(`Error rejecting invite: ${e.message}`);
        }
    };

    const handleRetractInvite = async (id: number) => {
        try {
            const res = await fetch(`/api/invites/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to retract invite');

            setInvites(prev => prev.filter(i => i.id !== id));

            if (fetchInvitesCount) {
                await fetchInvitesCount();
            }
        } catch (e: any) {
            alert(`Error retracting invite: ${e.message}`);
        }
    };

    const handleSettingChange = async (setting: string, value: boolean, setter: (val: boolean) => void) => {
        setter(value);
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ setting: setting, value: String(value) }),
            });
            if (!res.ok) throw new Error(`Failed to update ${setting}`);
        } catch (e: any) {
            alert(`Error updating setting ${setting}: ${e.message}`);
            // Optionally revert the state here if we want to be strict, but for now just alert.
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
        <div className="account-page-container" style={{ position: 'relative' }}>
            <h2 className="account-section">
                {view === 'info' ? 'Account Information' : 'Account Settings'}
            </h2>
            <IconButton
                style={{ position: 'absolute', top: '15px', right: '15px' }}
                icon={view === 'info' ? Settings : User}
                onClick={() => navigate(view === 'info' ? '/profile/settings' : '/profile')}
                title={view === 'info' ? 'Account Settings' : 'Account Information'}
            />

            {view === 'info' ? (
                <>
                    {user && (
                        <div className="account-info">
                            <div><strong>Email:</strong> {user.email}</div>
                            {user.name && <div><strong>Name:</strong> {user.name}</div>}
                        </div>
                    )}

            <div style={{ marginTop: '2rem', marginBottom: '2rem', width: '95%' }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1rem'
                }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Tag Sharing</h3>
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
                               <th style={{ padding: '8px 0' }}>Tag Name</th>
                               <th style={{ padding: '8px 0' }}>Owner</th>
                               <th style={{ padding: '8px 0' }}>User</th>
                               <th style={{ padding: '8px 0', textAlign: 'center' }}>RW?</th>
                               <th style={{ padding: '8px 0', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody style={{ textAlign: 'left' }}>
                            {tagshares.map((share, index) => (
                               <tr key={`${share.tag_id}-${index}`} style={{ borderBottom: '1px solid #f9f9f9' }}>
                                   <td style={{ padding: '8px 0' }}>{share.tag_name}</td>
                                   <td style={{ padding: '8px 0', color: '#666' }}>{share.owner_email}</td>
                                   <td style={{ padding: '8px 0', color: '#666' }}>{share.user_email}</td>
                                   <td style={{ padding: '8px 0', textAlign: 'center' }}>
                                       {share.access_level === 2 && <Check size={14} color="#4caf50" />}
                                   </td>
                                   <td style={{ padding: '8px 0', textAlign: 'right' }}>
                                       <X
                                           size={16}
                                           color="#f44336"
                                           style={{ cursor: 'pointer' }}
                                           onClick={() => setTagShareToDelete(share)}
                                       />
                                   </td>
                               </tr>
                            ))}
                            {tagshares.length === 0 && (
                               <tr>
                                    <td colSpan={5} style={{ padding: '1rem', textAlign: 'center', color: '#999' }}>
                                        No shared tags found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div style={{ marginTop: '2rem', marginBottom: '2rem', width: '95%' }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1rem'
                }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Invites</h3>
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
                               <th style={{ padding: '8px 0' }}>Tag Name</th>
                               <th style={{ padding: '8px 0' }}>User</th>
                               <th style={{ padding: '8px 0', textAlign: 'center' }}>RW?</th>
                               <th style={{ padding: '8px 0', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody style={{ textAlign: 'left' }}>
                            {invites.map((invite, index) => (
                                <tr key={`${invite.id}-${index}`} style={{ borderBottom: '1px solid #f9f9f9' }}>
                                   <td style={{ padding: '8px 0' }}>{invite.tag_name}</td>
                                    <td style={{ padding: '8px 0', color: '#666' }}>{invite.other_party_email}</td>
                                    <td style={{ padding: '8px 0', textAlign: 'center' }}>
                                        {invite.access_level === 2 && <Check size={14} color="#4caf50" />}
                                    </td>
                                    <td style={{ padding: '8px 0', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                        {!invite.is_sender ? (
                                            <>
                                                <Check
                                                    size={16}
                                                    color="#4caf50"
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => handleAcceptInvite(invite.id)}
                                                />
                                                <X
                                                    size={16}
                                                    color="#f44336"
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => handleRejectInvite(invite.id)}
                                                />
                                            </>
                                        ) : (
                                            <Trash2
                                                size={16}
                                                color="#888"
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => handleRetractInvite(invite.id)}
                                            />
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {invites.length === 0 && (
                               <tr>
                                   <td colSpan={4} style={{ padding: '1rem', textAlign: 'center', color: '#999' }}>
                                       No pending invites.
                                   </td>
                               </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div style={{ marginTop: '2rem', marginBottom: '3rem', width: '95%' }}>
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
                </>
            ) : (
                <div className="account-settings" style={{ width: '95%', margin: '0 auto' }}>
                    <SettingSwitch
                        label="Allow tag sharing"
                        checked={tagSharing}
                        onChange={(val) => handleSettingChange('tag_sharing', val, setTagSharing)}
                    />
                    <SettingSwitch
                        label="Email alerts about tag sharing invites"
                        checked={emailAlerts}
                        onChange={(val) => handleSettingChange('tag_sharing_email', val, setEmailAlerts)}
                    />
                    <SettingSwitch
                        label="Tag sharing invite reminder email"
                        checked={inviteReminders}
                        onChange={(val) => handleSettingChange('tag_sharing_reminder', val, setInviteReminders)}
                    />
                </div>
            )}

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

            {tagShareToDelete !== null && (
                <ConfirmationModal
                    message={`Do you want to remove sharing for tag "${tagShareToDelete.tag_name}"?`}
                    onConfirm={async () => {
                        await handleDeleteTagShare(tagShareToDelete);
                        setTagShareToDelete(null);
                    }}
                    onCancel={() => setTagShareToDelete(null)}
                    confirmText="Remove"
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
