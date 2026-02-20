import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { sendSuccess, sendError, sendUnauthorized, sendMethodNotAllowed } from '@/lib/api-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
        return sendUnauthorized(res);
    }

    if (req.method === 'GET') {
        try {
            const { unreadOnly, limit = 10 } = req.query;

            const where: any = {};
            if (unreadOnly === 'true') {
                where.is_read = false;
            }

            const [notifications, unreadCount] = await Promise.all([
                prisma.notifications.findMany({
                    where,
                    take: Number(limit),
                    orderBy: { fecha: 'desc' }
                }),
                prisma.notifications.count({
                    where: { is_read: false }
                })
            ]);

            return sendSuccess(res, { notifications, unreadCount });
        } catch (error: any) {
            return sendError(res, 'Error fetching notifications', 500, error);
        }
    }

    if (req.method === 'PATCH') {
        try {
            const { id, markAllAsRead } = req.body;

            if (markAllAsRead) {
                await prisma.notifications.updateMany({
                    where: { is_read: false },
                    data: { is_read: true }
                });
                return sendSuccess(res, {}, 'All notifications marked as read');
            }

            if (id) {
                await prisma.notifications.update({
                    where: { id: Number(id) },
                    data: { is_read: true }
                });
                return sendSuccess(res, {}, 'Notification marked as read');
            }

            return sendError(res, 'Missing parameters', 400);
        } catch (error: any) {
            return sendError(res, 'Error updating notifications', 500, error);
        }
    }

    return sendMethodNotAllowed(res);
}
