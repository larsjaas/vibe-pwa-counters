export interface Counter {
    id: number;
    name: string;
    step: number;
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

export interface CountUpdate {
    id: number;
    counter: number;
    delta: number;
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
    type?: 'standard' | 'repeating';
    frequency?: number;
    alert_window?: number;
    overdue?: number | null;
}
