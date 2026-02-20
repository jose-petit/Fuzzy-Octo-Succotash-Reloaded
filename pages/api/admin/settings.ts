import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    if (req.method === 'GET') {
        const settings = await prisma.system_settings.findMany();
        const config = settings.reduce((acc: any, s) => ({ ...acc, [s.key]: s.value }), {});

        return res.status(200).json({
            status: 'success',
            settings: {
                // Padtec / General Settings
                telegram_chat_id: config.telegram_chat_id || process.env.TELEGRAM_CHAT_ID || '',
                telegram_header: config.telegram_header || '🔴 ALERTA DE TRANSPORTE',
                telegram_footer: config.telegram_footer || 'Equipo de Transporte Óptico - Monitoreo Activo',
                scan_interval: config.scan_interval || '5',
                loss_threshold: config.loss_threshold || '3.0',
                alert_rapid_increase_threshold: config.alert_rapid_increase_threshold || '1.5',
                alert_confirmation_samples: config.alert_confirmation_samples || '2',
                alert_jitter_threshold: config.alert_jitter_threshold || '0.3',
                ui_refresh_interval: config.ui_refresh_interval || '60',
                public_url: config.public_url || 'http://localhost:3001',
                maintenance_mode: config.maintenance_mode || 'false',
                maintenance_until: config.maintenance_until || '',
                weekly_report_enabled: config.weekly_report_enabled || 'true',
                monthly_report_enabled: config.monthly_report_enabled || 'true',
                report_criticality_threshold: config.report_criticality_threshold || '3.0',
                alert_drift_threshold: config.alert_drift_threshold || '2.0',

                // Cisco Span Processor Settings
                telegram_bot_token_cisco: config.telegram_bot_token_cisco || '',
                telegram_chat_id_cisco: config.telegram_chat_id_cisco || '',
                span_samples_per_day: config.span_samples_per_day || '4'
            }
        });
    }

    if (req.method === 'POST') {
        const { key, value } = req.body;
        if (!key || value === undefined) return res.status(400).json({ status: 'error', message: 'Faltan parámetros' });

        await prisma.system_settings.upsert({
            where: { key },
            update: { value: String(value) },
            create: { key, value: String(value) }
        });

        return res.status(200).json({ status: 'success', message: 'Ajuste guardado' });
    }

    return res.status(405).end();
}
