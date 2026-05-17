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
