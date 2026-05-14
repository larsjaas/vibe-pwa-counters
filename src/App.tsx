import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { CounterList, Counter } from './CounterList';
import { CounterCreate } from './CounterCreate';
import { CounterDetail } from './CounterDetail';
import { NavBar } from './components/NavBar';
import { AccountPage } from './AccountPage';
import { StatisticsPage } from './StatisticsPage';
import { AlertModal } from './components/AlertModal';


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

    const fetchInvitesCount = async () => {
        try {
            const res = await fetch('/api/invites');
            if (res.ok) {
                const data = await res.json();
                const receivedInvites = data.filter((i: any) => !i.is_sender);
                setPendingInvitesCount(receivedInvites.length);
            }
        } catch (e) {
            console.error('Failed to fetch invites', e);
        }
    };

    useEffect(() => {
        const fetchAccount = async () => {
            try {
                const res = await fetch('/api/account');
                if (res.ok) {
                    const data = await res.json();
                    setUserEmail(data.email);
                    await fetchInvitesCount();
                }
            } catch (e) {
                console.error('Failed to fetch account info', e);
            }
        };
        fetchAccount();
    }, []);

    useEffect(() => {

        const eventSource = new EventSource('/api/events');
        
        eventSource.onmessage = (event) => {
            console.log('SSE event received:', event.data);
            
            if (event.data.startsWith('ALERT ')) {
                try {
                    const jsonStr = event.data.substring(6);
                    const data = JSON.parse(jsonStr);
                    setAlertMessage(data.text);
                } catch (e) {
                    console.error('Failed to parse SSE alert JSON:', e);
                }
            } else if (event.data === 'UPDATED TAG_INVITES') {
                console.log('SSE event UPDATED TAG_INVITES received');
                fetchInvitesCount();
                setAccountRefreshCount(prev => prev + 1);
            } else if (event.data === 'UPDATED TAG_SHARES') {
                console.log('SSE event UPDATED TAG_SHARES received');
                setRefreshCount(prev => prev + 1);
                setAccountRefreshCount(prev => prev + 1);
            } else {
                setRefreshCount(prev => prev + 1);
                fetchInvitesCount();
            }
        };

        eventSource.addEventListener('UPDATED COUNTERS', () => {
            console.log('SSE event UPDATED COUNTERS received');
            setRefreshCount(prev => prev + 1);
        });

        eventSource.addEventListener('UPDATED COUNTS', () => {
            console.log('SSE event UPDATED COUNTS received');
            setRefreshCount(prev => prev + 1);
        });

        eventSource.onerror = (err) => {
            console.error('SSE connection error:', err);
            // EventSource automatically attempts to reconnect
        };

        return () => {
            eventSource.close();
        };
    }, []);

    const handleUpdateCounter = async (id: number, updates: any) => {
        try {
            const res = await fetch('/api/counters', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, ...updates }),
            });
            if (!res.ok) throw new Error('Update failed');
            setEditingCounter(null);
            setRefreshCount(prev => prev + 1);
        } catch (e) {
            alert('Failed to update counter');
        }
    };

    const handleDeleteCounter = async (id: number) => {
        try {
            const res = await fetch(`/api/counters/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');
            setEditingCounter(null);
            setRefreshCount(prev => prev + 1);
        } catch (e) {
            alert('Failed to delete counter');
        }
    };

    const handleArchiveCounter = async (id: number) => {
        const isArchived = editingCounter?.archivetime;
        const archiveValue = isArchived ? "" : new Date().toISOString();
        try {
            const res = await fetch(`/api/counters/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ archivetime: archiveValue }),
            });
            if (!res.ok) throw new Error('Archive failed');
            setEditingCounter(null);
            setRefreshCount(prev => prev + 1);
        } catch (e) {
            alert('Failed to archive counter');
        }
    };

    const handleResetCounter = async (id: number, initialValue: number) => {
        try {
            const res = await fetch('/api/counts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ counter: id, delta: 0 }),
            });
            if (!res.ok) throw new Error('Reset failed');
            
            if (initialValue !== 0) {
                await fetch('/api/counts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ counter: id, delta: initialValue }),
                });
            }
            
            setRefreshCount(prev => prev + 1);
        } catch (e) {
            alert('Failed to reset counter');
        }
    };

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
                            onArchive={handleArchiveCounter}
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
