import React, { useState } from 'react';

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

interface AccountSettingsSectionProps {
    tagSharing: boolean;
    emailAlerts: boolean;
    inviteReminders: boolean;
    notificationEmail: string;
    onSettingChange: (setting: string, value: boolean) => void;
    onNotificationEmailChange: (email: string) => void;
}

export const AccountSettingsSection: React.FC<AccountSettingsSectionProps> = ({
    tagSharing,
    emailAlerts,
    inviteReminders,
    notificationEmail,
    onSettingChange,
    onNotificationEmailChange
}) => {
    const [emailInput, setEmailInput] = useState(notificationEmail);

    const handleSaveEmail = () => {
        onNotificationEmailChange(emailInput);
    };

    return (
        <div className="account-settings" style={{ width: '95%', margin: '0 auto' }}>
            <SettingSwitch
                label="Allow tag sharing"
                checked={tagSharing}
                onChange={(val) => onSettingChange('tag_sharing', val)}
            />
            <SettingSwitch
                label="Email alerts about tag sharing invites"
                checked={emailAlerts}
                onChange={(val) => onSettingChange('tag_sharing_email', val)}
            />
            <SettingSwitch
                label="Tag sharing invite reminder email"
                checked={inviteReminders}
                onChange={(val) => onSettingChange('tag_sharing_reminder', val)}
            />
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 0',
                borderBottom: '1px solid #eee',
                width: '95%',
                margin: '0 auto',
                gap: '10px'
            }}>
                <span style={{ fontSize: '1rem' }}>Notification Email</span>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                        type="email"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="Enter email..."
                        style={{
                            padding: '5px 10px',
                            borderRadius: '4px',
                            border: '1px solid #ccc',
                            fontSize: '1rem'
                        }}
                    />
                    <button 
                        onClick={handleSaveEmail}
                        style={{
                            padding: '5px 10px',
                            borderRadius: '4px',
                            border: 'none',
                            backgroundColor: '#4caf50',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '1rem'
                        }}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};
