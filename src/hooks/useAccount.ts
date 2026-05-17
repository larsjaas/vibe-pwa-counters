import { useState, useEffect } from 'react';
import { api } from '../services/api';

export interface UserInfo {
    email: string;
    name?: string;
}

export interface APIKey {
    id: number;
    apikey: string;
    createtime: string;
    lastused: string | null;
}

export interface TagShare {
    tag_id: number;
    tag_name: string;
    owner_email: string;
    user_email: string;
    access_level: number;
}

export interface TagInvite {
    id: number;
    tag_name: string;
    other_party_email: string;
    sender_id: number;
    access_level: number;
    is_sender: boolean;
    status: string;
}

export const useAccount = (refreshTrigger?: number, fetchInvitesCount?: () => Promise<void>) => {
    const [user, setUser] = useState<UserInfo | null>(null);
    const [apikeys, setApikeys] = useState<APIKey[]>([]);
    const [tagshares, setTagshares] = useState<TagShare[]>([]);
    const [invites, setInvites] = useState<TagInvite[]>([]);
    const [beVersion, setBeVersion] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tagSharing, setTagSharing] = useState(true);
    const [emailAlerts, setEmailAlerts] = useState(false);
    const [inviteReminders, setInviteReminders] = useState(false);

    const parseBool = (val: any, defaultVal: boolean) => {
        if (val === undefined || val === null) return defaultVal;
        return val === 'true' || val === true;
    };

    const fetchData = async () => {
        try {
            const [userData, infoData, keysData, sharesData, invitesData, settingsData] = await Promise.all([
                api.getAccount(),
                api.getSystemInfo(),
                api.getApiKeys(),
                api.getTagShares(),
                api.getInvites(),
                api.getSettings(),
            ]);

            setUser(userData);
            setBeVersion(infoData.version);
            setApikeys(keysData);
            setTagshares(sharesData);
            setInvites(invitesData);
            setTagSharing(parseBool(settingsData.tag_sharing, true));
            setEmailAlerts(parseBool(settingsData.tag_sharing_email, false));
            setInviteReminders(parseBool(settingsData.tag_sharing_reminder, false));
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [refreshTrigger]);

    const handleCreateAPIKey = async () => {
        try {
            await api.createApiKey();
            const keysData = await api.getApiKeys();
            setApikeys(keysData);
        } catch (e: any) {
            throw new Error(`Error creating API key: ${e.message}`);
        }
    };

    const handleDeleteAPIKey = async (id: number) => {
        try {
            await api.deleteApiKey(id);
            setApikeys(prev => prev.filter(key => key.id !== id));
        } catch (e: any) {
            throw new Error(`Error deleting API key: ${e.message}`);
        }
    };

    const handleDeleteTagShare = async (share: TagShare) => {
        try {
            await api.deleteTagShare(share.tag_id, share.user_email);
            setTagshares(prev => prev.filter(s => !(s.tag_id === share.tag_id && s.user_email === share.user_email)));
        } catch (e: any) {
            throw new Error(`Error removing tag share: ${e.message}`);
        }
    };

    const handleAcceptInvite = async (id: number) => {
        try {
            await api.acceptInvite(id);
            setInvites(prev => prev.filter(i => i.id !== id));
            const sharesData = await api.getTagShares();
            setTagshares(sharesData);
            if (fetchInvitesCount) await fetchInvitesCount();
        } catch (e: any) {
            throw new Error(`Error accepting invite: ${e.message}`);
        }
    };

    const handleRejectInvite = async (id: number) => {
        try {
            await api.rejectInvite(id);
            setInvites(prev => prev.filter(i => i.id !== id));
            if (fetchInvitesCount) await fetchInvitesCount();
        } catch (e: any) {
            throw new Error(`Error rejecting invite: ${e.message}`);
        }
    };

    const handleRetractInvite = async (id: number) => {
        try {
            await api.retractInvite(id);
            setInvites(prev => prev.filter(i => i.id !== id));
            if (fetchInvitesCount) await fetchInvitesCount();
        } catch (e: any) {
            throw new Error(`Error retracting invite: ${e.message}`);
        }
    };

    const handleSettingChange = async (setting: string, value: boolean, setter: (val: boolean) => void) => {
        setter(value);
        try {
            await api.updateSetting(setting, String(value));
        } catch (e: any) {
            throw new Error(`Error updating setting ${setting}: ${e.message}`);
        }
    };

    const handleDeleteAccount = async () => {
        try {
            await api.deleteAccount();
            window.location.href = '/landing_page/index.html';
        } catch (e: any) {
            throw new Error(`Error deleting account: ${e.message}`);
        }
    };

    return {
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
        setTagSharing,
        setEmailAlerts,
        setInviteReminders,
        handleCreateAPIKey,
        handleDeleteAPIKey,
        handleDeleteTagShare,
        handleAcceptInvite,
        handleRejectInvite,
        handleRetractInvite,
        handleSettingChange,
        handleDeleteAccount,
        refreshData: fetchData
    };
};
