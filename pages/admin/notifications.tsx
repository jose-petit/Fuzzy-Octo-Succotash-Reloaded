import React, { useState } from 'react';
import Layout from 'components/Layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import moment from 'moment';
import {
    Bell,
    Trash2,
    CheckCheck,
    AlertTriangle,
    Info,
    Clock,
    Settings,
    ShieldAlert,
    Filter,
    ChevronRight,
    Search
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Notification {
    id: number;
    type: string;
    title: string;
    message: string;
    is_read: boolean;
    severity: string;
    entity_type: string;
    entity_id: number;
    fecha: string;
}

const NotificationManager = () => {
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    const { data, isLoading } = useQuery(['admin-notifications'], async () => {
        const { data } = await axios.get('/api/notifications?limit=100');
        return data;
    }, {
        refetchInterval: 30000,
    });

    const { data: telegramStatus } = useQuery(['telegram-status'], async () => {
        const { data } = await axios.get(`${process.env.NEXT_PUBLIC_PERF_BACKEND_URL || 'http://10.4.4.124:5001'}/api/telegram-status`);
        return data;
    });

    const notifications: Notification[] = data?.notifications || [];

    const markAsReadMutation = useMutation(async (id: number) => {
        await axios.patch('/api/notifications', { id });
    }, {
        onSuccess: () => {
            queryClient.invalidateQueries(['admin-notifications']);
            toast.success('Notificación marcada como leída');
        }
    });

    const markAllReadMutation = useMutation(async () => {
        await axios.patch('/api/notifications', { markAllAsRead: true });
    }, {
        onSuccess: () => {
            queryClient.invalidateQueries(['admin-notifications']);
            toast.success('Todas las notificaciones marcadas como leídas');
        }
    });

    const filteredNotifications = notifications.filter(n => {
        const matchesFilter = filter === 'ALL' ||
            (filter === 'UNREAD' && !n.is_read) ||
            (filter === 'CRITICAL' && n.severity === 'CRITICAL');
        const matchesSearch = n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            n.message.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const getSeverityStyles = (severity: string) => {
        switch (severity) {
            case 'CRITICAL': return 'bg-red-500/10 text-red-600 border-red-200 dark:border-red-900/50 dark:text-red-400';
            case 'WARNING': return 'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-900/50 dark:text-amber-400';
            default: return 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-900/50 dark:text-blue-400';
        }
    };

    const getIcon = (type: string, severity: string) => {
        if (severity === 'CRITICAL') return <ShieldAlert size={18} />;
        if (severity === 'WARNING') return <AlertTriangle size={18} />;
        return <Info size={18} />;
    };

    return (
        <Layout>
            <div className="max-w-[1400px] mx-auto px-4 py-8 animate-fade-in">
                {/* HEADER INDUSTRIAL */}
                <div className="flex flex-col md:flex-row items-center justify-between mb-8 pb-8 border-b border-gray-200/60 dark:border-gray-800/60 gap-8">
                    <div className="relative group">
                        <div className="absolute -left-4 top-0 w-1 h-full bg-blue-500 rounded-full opacity-60 group-hover:opacity-100 transition-all duration-500 shadow-[0_0_15px_rgba(59,130,246,0.4)]"></div>
                        <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter italic uppercase flex items-center gap-4">
                            Gestión de Alertas
                            <span className="text-sm font-mono not-italic font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800 shadow-sm animate-pulse-slow">
                                Admin Center
                            </span>
                        </h1>
                        <p className="text-xs font-bold text-gray-400 mt-2 uppercase tracking-[0.3em] font-mono">
                            Centro de Control de Notificaciones de Red
                        </p>
                    </div>

                    <div className="flex items-center gap-4 bg-gray-50/80 dark:bg-gray-900/80 p-3 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-[0_4px_20px_rgba(0,0,0,0.03)] backdrop-blur-md">
                        <button
                            onClick={() => markAllReadMutation.mutate()}
                            disabled={notifications.every(n => n.is_read)}
                            className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:scale-100"
                        >
                            <CheckCheck size={16} />
                            Marcar Todo como Leído
                        </button>
                    </div>
                </div>

                {/* FILTROS Y BUSQUEDA */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="md:col-span-3 flex flex-wrap gap-3">
                        {['ALL', 'UNREAD', 'CRITICAL'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${filter === f
                                    ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20'
                                    : 'bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-500 border-gray-100 dark:border-gray-800 hover:border-blue-400 dark:hover:border-blue-600 hover:text-blue-500'
                                    }`}
                            >
                                {f === 'ALL' ? 'Todas' : f === 'UNREAD' ? 'No Leídas' : 'Críticas'}
                            </button>
                        ))}
                    </div>
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar en el log..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl text-xs font-bold text-gray-700 dark:text-gray-300 outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-all shadow-sm"
                        />
                    </div>
                </div>

                {/* LOG DE NOTIFICACIONES */}
                <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-xl overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                        <Bell size={120} />
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-100/50 dark:bg-gray-800/30 backdrop-blur-md">
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] border-b border-gray-100 dark:border-gray-800">Estado</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] border-b border-gray-100 dark:border-gray-800">Evento</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] border-b border-gray-100 dark:border-gray-800">Detalles</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] border-b border-gray-100 dark:border-gray-800">Fecha</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] border-b border-gray-100 dark:border-gray-800 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-12 text-center">
                                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
                                            <p className="mt-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sincronizando log...</p>
                                        </td>
                                    </tr>
                                ) : filteredNotifications.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-20 text-center">
                                            <div className="bg-gray-50 dark:bg-gray-800/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-gray-200 dark:border-gray-700">
                                                <Info className="text-gray-300 dark:text-gray-600" size={32} />
                                            </div>
                                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">No se encontraron alertas en este registro</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredNotifications.map((notif) => (
                                        <tr key={notif.id} className={`group hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-all border-b border-gray-50 dark:border-gray-800 ${!notif.is_read ? 'bg-blue-50/10 dark:bg-blue-900/5' : ''}`}>
                                            <td className="px-8 py-6">
                                                {!notif.is_read ? (
                                                    <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-black text-[10px] uppercase tracking-tighter italic">
                                                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                                        Nuevo
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 dark:text-gray-600 font-bold text-[10px] uppercase tracking-tighter">
                                                        Procesado
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-110 ${getSeverityStyles(notif.severity)}`}>
                                                        {getIcon(notif.type, notif.severity)}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">
                                                            {notif.title}
                                                        </p>
                                                        <span className="text-[10px] font-bold text-gray-400 opacity-60">ID: {notif.id}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium max-w-xs leading-relaxed">
                                                    {notif.message}
                                                </p>
                                            </td>
                                            <td className="px-8 py-6 font-mono text-[10px] text-gray-400">
                                                <div className="flex flex-col">
                                                    <span>{moment(notif.fecha).format('DD/MM/YYYY')}</span>
                                                    <span className="opacity-60">{moment(notif.fecha).format('HH:mm:ss')}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                {!notif.is_read && (
                                                    <button
                                                        onClick={() => markAsReadMutation.mutate(notif.id)}
                                                        className="p-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl hover:scale-110 transition-all opacity-0 group-hover:opacity-100 shadow-lg"
                                                        title="Marcar como leído"
                                                    >
                                                        <CheckCheck size={16} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* INFO PANEL */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl text-white shadow-xl shadow-blue-500/20 relative overflow-hidden group">
                        <Settings className="absolute -bottom-4 -right-4 h-24 w-24 opacity-10 group-hover:rotate-45 transition-transform duration-1000" />
                        <h4 className="text-sm font-black uppercase tracking-widest mb-2 italic flex items-center gap-2">
                            Telegram Bot
                            {telegramStatus?.configured ?
                                <span className="bg-emerald-400 w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px_#34d399]"></span> :
                                <span className="bg-red-400 w-2 h-2 rounded-full shadow-[0_0_8px_#f87171]"></span>
                            }
                        </h4>
                        <p className="text-[10px] font-medium text-blue-100 leading-relaxed mb-4">
                            {telegramStatus?.configured ?
                                'Configuración activa: Las alarmas críticas se retransmiten a @Toptibot_bot.' :
                                'Advertencia: El bot de Telegram no está completamente configurado en .env.'}
                        </p>
                        <div className="flex gap-2">
                            <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full border ${telegramStatus?.bot_token_present ? 'bg-emerald-500/20 border-emerald-400' : 'bg-red-500/20 border-red-400'}`}>TOKEN</span>
                            <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full border ${telegramStatus?.chat_id_present ? 'bg-emerald-500/20 border-emerald-400' : 'bg-red-500/20 border-red-400'}`}>CHAT_ID</span>
                        </div>
                    </div>
                    <div className="md:col-span-2 p-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-2xl text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">Depuración de Log</h4>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Sincronización cada 30 segundos</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6 pr-4">
                            <div className="text-right">
                                <p className="text-xs font-black text-gray-900 dark:text-white">{notifications.filter(n => !n.is_read).length}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Pendientes</p>
                            </div>
                            <div className="w-px h-8 bg-gray-100 dark:bg-gray-800"></div>
                            <div className="text-right">
                                <p className="text-xs font-black text-gray-900 dark:text-white">{notifications.length}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Total</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default NotificationManager;
