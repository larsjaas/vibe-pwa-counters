import React, { useState } from 'react';
import { Settings, User } from 'lucide-react';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { IconButton } from '../components/IconButton';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAccount } from '../hooks/useAccount';
import { AccountInfoSection } from '../components/AccountInfoSection';
import { TagSharingTable } from '../components/TagSharingTable';
import { InvitesTable } from '../components/InvitesTable';
import { APIKeyTable } from '../components/APIKeyTable';
import { AccountSettingsSection } from '../components/AccountSettingsSection';
import { AccountActions } from '../components/AccountActions';

interface AccountPageProps {
    fetchInvitesCount?: () => Promise<void>;
    refreshTrigger?: number;
}

const FRONTEND_VERSION = "0.9.14";

export const AccountPage: React.FC<AccountPageProps> = ({ fetchInvitesCount, refreshTrigger }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [apiKeyToDelete, setApiKeyToDelete] = useState<number | null>(null);
    const [tagShareToDelete, setTagShareToDelete] = useState<any | null>(null);

    const {
        user,
        apikeys,
        tagshares,
        invites,
        beVersion,
        loading,
        error,
        tagSharing,
        emailAlerts,
        inviteReminders,
        notificationEmail,
        setTagSharing,
        setEmailAlerts,
        setInviteReminders,
        setNotificationEmail,
        handleCreateAPIKey,
        handleDeleteAPIKey,
        handleDeleteTagShare,
        handleAcceptInvite,
        handleRejectInvite,
        handleRetractInvite,
        handleSettingChange,
        handleRequestNotificationEmail,
        handleDeleteAccount,
    } = useAccount(refreshTrigger, fetchInvitesCount);

    const view = location.pathname.endsWith('/settings') ? 'settings' : 'info';

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
                    <AccountInfoSection user={user} />

                    <TagSharingTable 
                        tagshares={tagshares} 
                        onRemoveShare={(share) => setTagShareToDelete(share)} 
                    />

                    <InvitesTable 
                        invites={invites} 
                        onAccept={handleAcceptInvite} 
                        onReject={handleRejectInvite} 
                        onRetract={handleRetractInvite} 
                    />

                    <APIKeyTable 
                        apikeys={apikeys} 
                        onCreate={handleCreateAPIKey} 
                        onDelete={(id) => setApiKeyToDelete(id)} 
                    />

                    <AccountActions 
                        onLogout={handleLogout} 
                        onDeleteAccountRequest={() => setShowDeleteModal(true)} 
                    />
                </>
            ) : (
                <AccountSettingsSection 
                    tagSharing={tagSharing}
                    emailAlerts={emailAlerts}
                    inviteReminders={inviteReminders}
                    notificationEmail={notificationEmail}
                    onSettingChange={(setting, value) => 
                        handleSettingChange(setting, value, 
                            setting === 'tag_sharing' ? setTagSharing : 
                            setting === 'tag_sharing_email' ? setEmailAlerts : 
                            setInviteReminders
                        )
                    }
                    onNotificationEmailChange={async (email) => {
                        try {
                            await handleRequestNotificationEmail(email);
                            alert('Verification email sent!');
                        } catch (e: any) {
                            alert(e.message);
                        }
                    }}
                />
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
