import { useEffect, useRef } from 'react';
import { redirectToAuth } from '../services/auth';

interface UseSSEProps {
    onRefresh: () => void;
    onAccountRefresh: () => void;
    onAlert: (message: string) => void;
    onInvitesUpdate: () => void;
}

export const useSSE = ({ onRefresh, onAccountRefresh, onAlert, onInvitesUpdate }: UseSSEProps) => {
    const errorCountRef = useRef(0);

    useEffect(() => {
        const eventSource = new EventSource('/api/events');

        eventSource.onmessage = (event) => {
            errorCountRef.current = 0; // Reset error count on successful message
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
            errorCountRef.current = 0;
            console.log('SSE event UPDATED COUNTERS received');
            onRefresh();
        });

        eventSource.addEventListener('UPDATED COUNTS', () => {
            errorCountRef.current = 0;
            console.log('SSE event UPDATED COUNTS received');
            onRefresh();
        });

        eventSource.onerror = (err) => {
            errorCountRef.current++;
            // After repeated failures, the session is likely expired.
            // EventSource for an unauthorized endpoint returns 401,
            // which causes persistent reconnection attempts.
            if (errorCountRef.current >= 5) {
                console.warn('SSE connection failed repeatedly; session may have expired.');
                eventSource.close();
                redirectToAuth();
            }
        };

        return () => {
            eventSource.close();
        };
    }, [onRefresh, onAccountRefresh, onAlert, onInvitesUpdate]);
};
