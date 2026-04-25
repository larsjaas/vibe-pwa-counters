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
    const [refreshCount, setRefreshCount] = useState(0);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);

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
            } else {
                setRefreshCount(prev => prev + 1);
            }
        };

        eventSource.onerror = (err) => {
            console.error('SSE connection error:', err);
            // EventSource automatically attempts to reconnect
        };

        return () => {
            eventSource.close();
        };
    }, []);

    const handleUpdateCounter = async (id: number, name: string, step: number) => {
        try {
            const res = await fetch('/api/counters', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, name, step }),
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

    return (
        <div className="app-container">
            
            {/* Main Content Area */}
            <div className="main-content">
                <Routes>
                    <Route path="/" element={
                        <CounterList 
                            onEdit={(c) => setEditingCounter(c)} 
                            onCreate={() => setShowCreateModal(true)} 
                            refreshTrigger={refreshCount}
                        />
                    } />
                    <Route path="/stats" element={<StatisticsPage />} />
                    <Route path="/profile" element={<AccountPage />} />
                </Routes>
            </div>

            <NavBar />

            {/* Modals Overlay */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowCreateModal(false)}>
                    <div className="modal-content">
                        <CounterCreate 
                            onCreated={() => {
                               setShowCreateModal(false);
                               setRefreshCount(prev => prev + 1);
                            }} 
                            onCancel={() => setShowCreateModal(false)} 
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
