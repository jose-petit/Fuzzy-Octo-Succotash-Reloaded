import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function logAudit({
    entity_type,
    entity_id,
    action,
    user_id,
    user_name,
    prev_data,
    new_data,
    description
}: {
    entity_type: string;
    entity_id?: number;
    action: string;
    user_id?: number;
    user_name?: string;
    prev_data?: any;
    new_data?: any;
    description?: string;
}) {
    try {
        await prisma.audit_logs.create({
            data: {
                entity_type,
                entity_id,
                action,
                user_id,
                user_name,
                prev_data: prev_data || undefined,
                new_data: new_data || undefined,
                description,
            },
        });
    } catch (error) {
        console.error('Failed to save audit log:', error);
    }
}
