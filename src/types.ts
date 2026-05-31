export interface Counter {
    id: number;
    name: string;
    step: number;
    initial_value: number;
    count: number;
    createtime: string;
    archivetime: string | null;
    user_email: string;
    type: 'standard' | 'repeating';
    priority_score: number;
    repeat_status: string;
    frequency: number | null;
    alert_window: number | null;
    overdue: number | null;
    last_performed_at: string | null;
}

export interface Tag {
    id: number;
    name: string;
    user_email: string;
}

export interface Count {
    id: number;
    counter: number;
    delta: number;
    operation?: 'count' | 'reset' | 'punt' | 'init';
    user_email?: string;
    when?: string;
}

export interface CreateCounterPayload {
    name: string;
    initial: number;
    step: number;
    type: 'standard' | 'repeating';
    last_performed_at: number;
    frequency?: number;
    alert_window?: number;
    overdue?: number | null;
}

export interface UpdateCounterPayload {
    name?: string;
    step?: number;
    initial_value?: number;
    type?: 'standard' | 'repeating';
    frequency?: number;
    alert_window?: number;
    overdue?: number | null;
}

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
