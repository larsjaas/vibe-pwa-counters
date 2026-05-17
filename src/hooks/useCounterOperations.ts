import { api } from '../services/api';

interface UseCounterOperationsProps {
    onSuccess: () => void;
}

export const useCounterOperations = ({ onSuccess }: UseCounterOperationsProps) => {
    const handleUpdateCounter = async (id: number, updates: any) => {
        try {
            await api.updateCounter(id, updates);
            onSuccess();
            return { success: true };
        } catch (e) {
            alert('Failed to update counter');
            return { success: false, error: e };
        }
    };

    const handleDeleteCounter = async (id: number) => {
        try {
            await api.deleteCounter(id);
            onSuccess();
            return { success: true };
        } catch (e) {
            alert('Failed to delete counter');
            return { success: false, error: e };
        }
    };

    const handleArchiveCounter = async (id: number, isArchived: boolean) => {
        const archiveValue = isArchived ? "" : new Date().toISOString();
        try {
            await api.updateCounter(id, { archivetime: archiveValue });
            onSuccess();
            return { success: true };
        } catch (e) {
            alert('Failed to archive counter');
            return { success: false, error: e };
        }
    };

    const handleResetCounter = async (id: number, initialValue: number) => {
        try {
            await api.addCount({ counter: id, delta: 0 });
            if (initialValue !== 0) {
                await api.addCount({ counter: id, delta: initialValue });
            }
            onSuccess();
            return { success: true };
        } catch (e) {
            alert('Failed to reset counter');
            return { success: false, error: e };
        }
    };

    return {
        handleUpdateCounter,
        handleDeleteCounter,
        handleArchiveCounter,
        handleResetCounter,
    };
};
