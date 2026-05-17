import { useEffect } from 'react';

interface UseSSEProps {
    onRefresh: () => void;
    onAccountRefresh: () => void;
    onAlert: (message: string) => void;
    onInvitesUpdate: () => void;
}

export const useSSE = ({ onRefresh, onAccountRefresh, onAlert, onInvitesUpdate }: UseSSEProps) => {
    useEffect(() => {
        const eventSource = new EventSource('/api/events');

        eventSource.onmessage = (event) => {
            console.log('SSE event received:', event.data);

            if (event.data.startsWith('ALERT ')) {
                try {
                    const jsonStr = event.data.substring(6);
                    const data = JSON.parse(jsonStr);
                    onAlert(data.text);
                } catch (e) {
                    console.error('Failed to parse SSE alert JSON:', e);
                }
            } else if (event.data === 'UPDATED TAG_INVITES') {
                console.log('SSE event UPDATED TAG_INVITES received');
                onInvitesUpdate();
                onAccountRefresh();
            } else if (event.data === 'UPDATED TAG_SHARES') {
                console.log('SSE event UPDATED TAG_SHARES received');
                onRefresh();
                onAccountRefresh();
            } else {
                onRefresh();
                onInvitesUpdate();
            }
        };

        eventSource.addEventListener('UPDATED COUNTERS', () => {
            console.log('SSE event UPDATED COUNTERS received');
            onRefresh();
        });

        eventSource.addEventListener('UPDATED COUNTS', () => {
            console.log('SSE event UPDATED COUNTS received');
            onRefresh();
        });

        eventSource.onerror = (err) => {
            console.error('SSE connection error:', err);
        };

        return () => {
            eventSource.close();
        };
    }, [onRefresh, onAccountRefresh, onAlert, onInvitesUpdate]);
};
