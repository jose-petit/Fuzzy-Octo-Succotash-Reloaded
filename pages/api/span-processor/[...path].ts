import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { path: routePath } = req.query;
    const pathString = Array.isArray(routePath) ? routePath.join('/') : routePath;

    // Use the service name defined in docker-compose.yml
    const SPAN_BACKEND_URL = process.env.NEXT_PUBLIC_SPAN_BACKEND_URL || 'http://span-backend:3001';
    const targetUrl = `${SPAN_BACKEND_URL}/${pathString}`;

    console.log(`[Proxy] Routing ${req.method} /api/span-processor/${pathString} -> ${targetUrl}`);

    try {
        const config: any = {
            method: req.method as any,
            url: targetUrl,
            headers: {
                'Content-Type': req.headers['content-type'] || 'application/json',
            },
            validateStatus: () => true, // Let us handle all status codes
        };

        if (req.method !== 'GET' && req.body) {
            config.data = req.body;
        }

        // Special handling for query params to avoid passing 'path' to the backend
        const cleanParams = { ...req.query };
        delete cleanParams.path;
        config.params = cleanParams;

        // Execute the request to the span-backend service
        const response = await axios(config);
        console.log(`[Proxy] Backend responded with ${response.status} for ${pathString}`);
        return res.status(response.status).json(response.data);
    } catch (error: any) {
        console.error(`[Proxy Error] (Span Processor): ${error.message} - Path: ${pathString}`);
        return res.status(error.response?.status || 500).json(
            error.response?.data || { error: 'Internal Server Error Proxying' }
        );
    }
}

// Disable body parsing for specific routes like upload if needed, 
// but for now, we'll keep it simple.
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '50mb',
        },
    },
};
