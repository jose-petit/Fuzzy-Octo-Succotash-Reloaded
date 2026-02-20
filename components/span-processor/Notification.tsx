import React, { useState, useEffect } from 'react';
import { NotificationType } from './types';

interface NotificationProps {
    notification: NotificationType;
    onClose: () => void;
}

const InfoIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const SuccessIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const ErrorIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);


const notificationConfig = {
    success: {
        bg: 'bg-green-500/90 border-green-400',
        icon: SuccessIcon,
    },
    error: {
        bg: 'bg-red-500/90 border-red-400',
        icon: ErrorIcon,
    },
    info: {
        bg: 'bg-blue-500/90 border-blue-400',
        icon: InfoIcon,
    },
};

const Notification: React.FC<NotificationProps> = ({ notification, onClose }) => {
    const [visible, setVisible] = useState(false);
    const config = notificationConfig[notification.type] || notificationConfig.info;
    const Icon = config.icon;

    useEffect(() => {
        setVisible(true);
    }, []);

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 300); // Wait for transition to finish
    }

    // Auto-cerrar notificación tras 6 segundos
    useEffect(() => {
        const timer = setTimeout(() => {
            handleClose();
        }, 6000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className={`fixed top-5 left-5 z-50 transform transition-all duration-300 ease-in-out ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full'} w-80 max-w-sm ${config.bg} border-l-4 shadow-lg rounded-lg pointer-events-auto`}>
            <div className="p-4 flex items-start">
                <div className="flex-shrink-0">
                    <Icon className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <div className="ml-3 w-0 flex-1">
                    <p className="text-sm font-medium text-white">{notification.message}</p>
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                    <button onClick={handleClose} className="inline-flex text-white rounded-md hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        <span className="sr-only">Close</span>
                        &times;
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Notification;
