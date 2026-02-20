import { NextApiResponse } from 'next';

export const sendSuccess = (res: NextApiResponse, data: any = {}, message: string = 'Success') => {
    return res.status(200).json({
        status: 'success',
        message,
        ...data
    });
};

export const sendError = (res: NextApiResponse, message: string = 'Internal Server Error', status: number = 500, error: any = null) => {
    if (error) {
        console.error(`[API Error] ${message}:`, error);
    }
    return res.status(status).json({
        status: 'error',
        message,
        ...(process.env.NODE_ENV === 'development' && error ? { debug: error.message || error } : {})
    });
};

export const sendUnauthorized = (res: NextApiResponse) => {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
};

export const sendMethodNotAllowed = (res: NextApiResponse) => {
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
};
