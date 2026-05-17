import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { CounterList } from './pages/CounterListPage';
import { Counter } from './types';
import { CounterCreate } from './CounterCreate';
import { CounterDetail } from './CounterDetail';
import { NavBar } from './components/NavBar';
import { AccountPage } from './pages/AccountPage';
import { StatisticsPage } from './pages/StatisticsPage';
import { AlertModal } from './components/AlertModal';
import { api } from './services/api';
import { useSSE } from './hooks/useSSE';
import { useCounterOperations } from './hooks/useCounterOperations';


const App: React.FC = () => {
    const [editingCounter, setEditingCounter] = useState<Counter | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createInitialTags, setCreateInitialTags] = useState<string | undefined>(undefined);
    const [createInitialType, setCreateInitialType] = useState<'standard' | 'repeating'>('standard');
    const [refreshCount, setRefreshCount] = useState(0);
    const [accountRefreshCount, setAccountRefreshCount] = useState(0);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [pendingInvitesCount, setPendingInvitesCount] = useState(0);

    const {
        handleUpdateCounter,
        handleDeleteCounter,
        handleArchiveCounter,
        handleResetCounter,
    } = useCounterOperations({
        onSuccess: () => {
            setEditingCounter(null);
            setRefreshCount(prev => prev + 1);
        }
    });

    const fetchInvitesCount = async () => {
        try {
            const invites = await api.getInvites();
            const receivedInvites = invites.filter((i: any) => !i.is_sender);
            setPendingInvitesCount(receivedInvites.length);
        } catch (e) {
            console.error('Failed to fetch invites', e);
        }
    };

    useEffect(() => {
        const fetchAccount = async () => {
            try {
                const data = await api.getAccount();
                setUserEmail(data.email);
                await fetchInvitesCount();
            } catch (e) {
                console.error('Failed to fetch account info', e);
            }
        };
        fetchAccount();
    }, []);

    useSSE({
        onRefresh: () => setRefreshCount(prev => prev + 1),
        onAccountRefresh: () => setAccountRefreshCount(prev => prev + 1),
        onAlert: (msg) => setAlertMessage(msg),
        onInvitesUpdate: () => fetchInvitesCount(),
    });

    return (
        <div className="app-container">

            {/* Main Content Area */}
            <div className="main-content">
                <Routes>
                    <Route path="/" element={
                        <CounterList
                            onEdit={(c) => setEditingCounter(c)}
                            onCreate={(tags, type) => {
                                setCreateInitialTags(tags);
                                if (type) setCreateInitialType(type);
                                setShowCreateModal(true);
                            }}
                            refreshTrigger={refreshCount}
                            userEmail={userEmail}
                        />
                    } />
                    <Route path="/stats" element={<StatisticsPage refreshTrigger={refreshCount} userEmail={userEmail} />} />
                    <Route path="/profile">
                        <Route index element={<AccountPage fetchInvitesCount={fetchInvitesCount} refreshTrigger={accountRefreshCount} />} />
                        <Route path="settings" element={<AccountPage fetchInvitesCount={fetchInvitesCount} refreshTrigger={accountRefreshCount} />} />
                    </Route>
                </Routes>
            </div>

            <NavBar pendingInvitesCount={pendingInvitesCount} />

            {/* Modals Overlay */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowCreateModal(false)}>
                    <div className="modal-content">
                        <CounterCreate
                            initialTags={createInitialTags}
                            initialType={createInitialType}
                            onCreated={() => {
                               setShowCreateModal(false);
                               setCreateInitialTags(undefined);
                               setCreateInitialType('standard');
                               setRefreshCount(prev => prev + 1);
                            }}
                            onCancel={() => {
                                setShowCreateModal(false);
                                setCreateInitialTags(undefined);
                            }}
                        />
                    </div>
                </div>
            )}

            {editingCounter && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setEditingCounter(null)}>
                    <div className="modal-content">
                        <CounterDetail
                            counter={editingCounter}
                            onBack={() => setEditingCounter(null)}
                            onUpdate={handleUpdateCounter}
                            onDelete={handleDeleteCounter}
                            onArchive={(id) => handleArchiveCounter(id, editingCounter?.archivetime !== null)}
                            onReset={handleResetCounter}
                        />
                    </div>
                </div>
            )}

            {alertMessage && (
                <AlertModal
                    message={alertMessage}
                    onClose={() => setAlertMessage(null)}
                />
            )}
        </div>
    );
};

export default App;
