import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    const { path, ...queryParams } = req.query;
    const pathString = Array.isArray(path) ? path.join('/') : path;

    // El backend de performance está en el mismo stack de docker o accesible vía URL
    const BACKEND_URL = process.env.NEXT_PUBLIC_PERF_BACKEND_URL || 'http://performance-backend:5000';
    const targetUrl = `${BACKEND_URL}/${pathString}`;

    try {
        const isBodyMethod = !['GET', 'HEAD', 'DELETE'].includes(req.method || '');

        const axiosConfig: any = {
            method: req.method as any,
            url: targetUrl,
            params: queryParams,
            headers: {},
            timeout: 60000
        };

        if (isBodyMethod) {
            axiosConfig.data = req.body;
            axiosConfig.headers['Content-Type'] = 'application/json';
        }

        const response = await axios(axiosConfig);

        return res.status(response.status).json(response.data);
    } catch (error: any) {
        console.error(`Proxy error for ${targetUrl}:`, error.response?.data || error.message);
        return res.status(error.response?.status || 500).json(error.response?.data || { status: 'error', message: 'Proxy error' });
    }
}
