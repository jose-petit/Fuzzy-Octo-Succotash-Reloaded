export interface SpanLink {
    id: number;
    link_identifier: string;
    source_node: string;
    dest_node: string;
    last_span: number;
    min_span: number;
    max_span: number;
    last_updated: string; // ISO date string
    upload_batch_id: string;
}

export interface NotificationType {
    id: number;
    type: 'success' | 'error' | 'info';
    message: string;
}

export interface CsvRow {
    LINK_IDENTIFIER: string;
    'SOURCE NODE': string;
    'DEST NODE': string;
    'LAST SPAN': string;
}
