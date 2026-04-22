import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { CounterList, Counter } from './CounterList';
import { CounterCreate } from './CounterCreate';
import { CounterDetail } from './CounterDetail';
import { NavBar } from './components/NavBar';
import { AccountPage } from './AccountPage';
import { StatisticsPage } from './StatisticsPage';


const App: React.FC = () => {
    const [editingCounter, setEditingCounter] = useState<Counter | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [refreshCount, setRefreshCount] = useState(0);

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
        </div>
    );
};

export default App;
