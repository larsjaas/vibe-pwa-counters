import React from 'react';

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
    onSettingChange: (setting: string, value: boolean) => void;
}

export const AccountSettingsSection: React.FC<AccountSettingsSectionProps> = ({
    tagSharing,
    emailAlerts,
    inviteReminders,
    onSettingChange
}) => {
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
        </div>
    );
};
