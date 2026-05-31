import { Counter, Tag, CountUpdate, CreateCounterPayload, UpdateCounterPayload } from '../types';
import { redirectToAuth } from './auth';

const BASE_URL = '/api';

/**
 * Custom error to signal an authentication failure so callers
 * can distinguish it from other API errors.
 */
export class AuthError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AuthError';
    }
}

let isRedirecting = false;

async function handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 401) {
        // Session expired or invalid — redirect to auth
        if (!isRedirecting) {
            isRedirecting = true;
            redirectToAuth();
        }
        throw new AuthError('Session expired');
    }
    if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    const text = await response.text();
    if (!text) {
        return undefined as any as T;
    }
    return JSON.parse(text);
}

export const api = {
    // --- Account ---
    async getAccount(): Promise<{ email: string; name?: string }> {
        const res = await fetch(`${BASE_URL}/account`);
        return handleResponse<{ email: string; name?: string }>(res);
    },

    async deleteAccount(): Promise<void> {
        const res = await fetch(`${BASE_URL}/account`, {
            method: 'DELETE',
        });
        await handleResponse<void>(res);
    },

    async getSystemInfo(): Promise<{ version: string }> {
        const res = await fetch(`${BASE_URL}/info`);
        return handleResponse<{ version: string }>(res);
    },

    async getSettings(): Promise<Record<string, string>> {
        const res = await fetch(`${BASE_URL}/settings`);
        return handleResponse<Record<string, string>>(res);
    },

    async updateSetting(setting: string, value: string): Promise<void> {
        const res = await fetch(`${BASE_URL}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ setting, value }),
        });
        await handleResponse<void>(res);
    },

    async requestNotificationEmail(email: string): Promise<void> {
        const res = await fetch(`${BASE_URL}/account/notification-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        if (!res.ok) {
            throw new Error(`API Error: ${res.status} ${res.statusText}`);
        }
    },

    async verifyNotificationEmail(token: string): Promise<void> {
        const res = await fetch(`${BASE_URL}/verify-notification-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
        });
        await handleResponse<void>(res);
    },

    async getApiKeys(): Promise<any[]> {
        const res = await fetch(`${BASE_URL}/apikeys`);
        return handleResponse<any[]>(res);
    },

    async createApiKey(): Promise<void> {
        const res = await fetch(`${BASE_URL}/apikeys/create`, {
            method: 'POST',
        });
        await handleResponse<void>(res);
    },

    async deleteApiKey(id: number): Promise<void> {
        const res = await fetch(`${BASE_URL}/apikeys/${id}`, {
            method: 'DELETE',
        });
        await handleResponse<void>(res);
    },

    async getTagShares(): Promise<any[]> {
        const res = await fetch(`${BASE_URL}/tags/shares/me`);
        return handleResponse<any[]>(res);
    },

    async deleteTagShare(tagId: number, userEmail: string): Promise<void> {
        const res = await fetch(`${BASE_URL}/tags/${tagId}/shares/${userEmail}`, {
            method: 'DELETE',
        });
        await handleResponse<void>(res);
    },

    async getInvites(): Promise<any[]> {
        const res = await fetch(`${BASE_URL}/invites`);
        return handleResponse<any[]>(res);
    },

    async acceptInvite(id: number): Promise<void> {
        const res = await fetch(`${BASE_URL}/invites/${id}/accept`, {
            method: 'POST',
        });
        await handleResponse<void>(res);
    },

    async rejectInvite(id: number): Promise<void> {
        const res = await fetch(`${BASE_URL}/invites/${id}/reject`, {
            method: 'POST',
        });
        await handleResponse<void>(res);
    },

    async retractInvite(id: number): Promise<void> {
        const res = await fetch(`${BASE_URL}/invites/${id}`, {
            method: 'DELETE',
        });
        await handleResponse<void>(res);
    },

    // --- Counters ---
    async getCounters(): Promise<Counter[]> {
        const res = await fetch(`${BASE_URL}/counters`);
        return handleResponse<Counter[]>(res);
    },

    async createCounter(payload: CreateCounterPayload): Promise<Counter> {
        const res = await fetch(`${BASE_URL}/counters`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        return handleResponse<Counter>(res);
    },

    async updateCounter(id: number, payload: UpdateCounterPayload): Promise<void> {
        const res = await fetch(`${BASE_URL}/counters`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...payload }),
        });
        await handleResponse<void>(res);
    },

    async deleteCounter(id: number): Promise<void> {
        const res = await fetch(`${BASE_URL}/counters/${id}`, {
            method: 'DELETE',
        });
        await handleResponse<void>(res);
    },

    // --- Counts ---
    async getCounts(): Promise<CountUpdate[]> {
        const res = await fetch(`${BASE_URL}/counts`);
        return handleResponse<CountUpdate[]>(res);
    },

    async addCount(counterId: number, delta: number): Promise<void> {
        const res = await fetch(`${BASE_URL}/counts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ counter: counterId, delta }),
        });
        await handleResponse<void>(res);
    },

    async deleteCount(updateId: number): Promise<void> {
        const res = await fetch(`${BASE_URL}/counts/${updateId}`, {
            method: 'DELETE',
        });
        await handleResponse<void>(res);
    },

    // --- Tags ---
    async getTags(): Promise<Tag[]> {
        const res = await fetch(`${BASE_URL}/tags`);
        return handleResponse<Tag[]>(res);
    },

    async createTag(name: string): Promise<Tag> {
        const res = await fetch(`${BASE_URL}/tags`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
        });
        return handleResponse<Tag>(res);
    },

    async getCountersForTag(tagId: number): Promise<number[]> {
        const res = await fetch(`${BASE_URL}/tags/${tagId}/counters`);
        return handleResponse<number[]>(res);
    },

    async associateTagWithCounter(tagId: number, counterId: number): Promise<void> {
        const res = await fetch(`${BASE_URL}/tags/${tagId}/counters/${counterId}`, {
            method: 'POST',
        });
        await handleResponse<void>(res);
    },

    async dissociateTagFromCounter(tagId: number, counterId: number): Promise<void> {
        const res = await fetch(`${BASE_URL}/tags/${tagId}/counters/${counterId}`, {
            method: 'DELETE',
        });
        await handleResponse<void>(res);
    },

    async getTagSetting(tagId: number, key: string): Promise<{ [key: string]: string }> {
        const res = await fetch(`${BASE_URL}/tags/${tagId}/settings?key=${key}`);
        return handleResponse<{ [key: string]: string }>(res);
    },
};
