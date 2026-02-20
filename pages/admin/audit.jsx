import React, { useEffect, useState } from 'react';
import { Layout } from 'components/Layout';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import axios from 'axios';
import {
    ShieldCheck,
    History,
    Search,
    Activity,
    User,
    Box,
    Link as LinkIcon,
    ChevronRight,
    Clock,
    Database
} from 'lucide-react';
import moment from 'moment';

const AuditPage = () => {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        } else if (session?.user?.rol !== 'admin') {
            router.push('/');
        }
    }, [status, session]);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            setIsLoading(true);
            const { data } = await axios.get('/api/admin/audit');
            if (data.status === 'success') {
                setLogs(data.logs);
            }
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredLogs = logs.filter(log =>
        log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entity_type?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getEntityIcon = (type) => {
        switch (type) {
            case 'USER': return <User size={16} />;
            case 'EQUIPMENT': return <Box size={16} />;
            case 'LINK': return <LinkIcon size={16} />;
            default: return <Database size={16} />;
        }
    };

    const getActionColor = (action) => {
        switch (action) {
            case 'CREATE': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'UPDATE': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'DELETE': return 'bg-red-500/10 text-red-500 border-red-500/20';
            default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
        }
    };

    if (status === 'loading' || !session) return null;

    return (
        <Layout>
            <div className="max-w-[1400px] mx-auto px-4 py-12 animate-fade-in space-y-12">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-gray-100 dark:border-gray-800 pb-10">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-tighter mb-4 border border-blue-100 dark:border-blue-800 italic">
                            <ShieldCheck size={12} /> System Integrity Audit
                        </div>
                        <h1 className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter uppercase italic">
                            Dashboard de <span className="text-blue-600 not-italic">Auditoría</span>
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg font-medium opacity-70">Trazabilidad completa de acciones y cambios en el ecosistema.</p>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <button
                            onClick={async () => {
                                const html2pdf = (await import('html2pdf.js')).default;
                                const element = document.getElementById('report-template');
                                element.style.display = 'block';
                                const opt = {
                                    margin: 10,
                                    filename: `Reporte_Sistema_${moment().format('YYYY-MM-DD')}.pdf`,
                                    image: { type: 'jpeg', quality: 0.98 },
                                    html2canvas: { scale: 2, useCORS: true },
                                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                                };
                                await html2pdf().from(element).set(opt).save();
                                element.style.display = 'none';
                            }}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 whitespace-nowrap active:scale-95"
                        >
                            <Database size={18} /> Generar Reporte Diario
                        </button>
                        <div className="relative group w-full md:w-96">
                            <input
                                type="text"
                                placeholder="Buscar en el historial de eventos..."
                                className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl px-12 py-3 text-sm font-bold text-gray-700 dark:text-gray-200 outline-none focus:ring-4 focus:ring-blue-600/20 focus:border-blue-600 transition-all shadow-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        </div>
                    </div>
                </div>

                {/* Hidden Report Template */}
                <div id="report-template" style={{ display: 'none' }} className="p-10 bg-white text-black font-sans">
                    <div className="flex justify-between items-center border-b-2 border-blue-600 pb-6 mb-8">
                        <div>
                            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-blue-600">Reporte Ejecutivo de Red</h1>
                            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Sistema de Monitoreo Inter-Padtec v2.5</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Generado el</p>
                            <p className="text-sm font-bold text-black">{moment().format('DD MMMM, YYYY · HH:mm')}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6 mb-10">
                        <div className="border border-gray-200 p-4 rounded-xl bg-gray-50">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Operaciones Totales</p>
                            <p className="text-2xl font-black text-blue-600">{logs.length}</p>
                        </div>
                        <div className="border border-gray-200 p-4 rounded-xl bg-gray-50">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Eventos Filtrados</p>
                            <p className="text-2xl font-black text-orange-600">{filteredLogs.length}</p>
                        </div>
                        <div className="border border-gray-200 p-4 rounded-xl bg-gray-50">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Estado General</p>
                            <p className="text-2xl font-black text-emerald-600">ÓPTIMO</p>
                        </div>
                    </div>

                    <h2 className="text-lg font-black text-gray-900 mb-4 border-b border-gray-100 pb-2 uppercase italic">Detalle de Actividad Reciente</h2>
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-gray-100 uppercase font-black text-gray-500 tracking-widest border-b border-gray-200">
                                <th className="p-3">Timestamp / Operador</th>
                                <th className="p-3">Entidad</th>
                                <th className="p-3">Acción</th>
                                <th className="p-3">Descripción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.slice(0, 50).map((log) => (
                                <tr key={log.id} className="border-b border-gray-100">
                                    <td className="p-3">
                                        <p className="font-bold">{log.user_name}</p>
                                        <p className="text-[9px] text-gray-400">{moment(log.fecha).format('DD/MM/YYYY HH:mm')}</p>
                                    </td>
                                    <td className="p-3 font-bold uppercase">{log.entity_type}</td>
                                    <td className="p-3">
                                        <span className="bg-gray-100 px-2 py-0.5 rounded text-[9px] font-black uppercase text-gray-600 border border-gray-200">{log.action}</span>
                                    </td>
                                    <td className="p-3 text-gray-600 font-medium">{log.description}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="mt-12 text-center border-t border-gray-100 pt-6">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.4em]">Propiedad de Inter · División de Transporte Óptico</p>
                    </div>
                </div>

                {/* Audit Feed */}
                <div className="bg-[#0a0c10] border border-gray-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <div className="px-10 py-8 border-b border-gray-800 bg-gray-900/40 backdrop-blur-2xl flex items-center justify-between">
                        <h3 className="text-xl font-black text-white uppercase italic tracking-tight flex items-center gap-3">
                            <History size={20} className="text-blue-500" /> Registro Maestro de Eventos
                        </h3>
                        <button onClick={fetchLogs} className="p-2.5 rounded-xl bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-all active:scale-95">
                            <Activity size={18} />
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-900/80 border-b border-gray-800">
                                    <th className="px-10 py-6 text-left text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Timestamp / Operador</th>
                                    <th className="px-10 py-6 text-left text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Entidad / Acción</th>
                                    <th className="px-10 py-6 text-left text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Descripción del Cambio</th>
                                    <th className="px-10 py-6 text-right text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Detalles</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-900/50">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={4} className="py-20 text-center">
                                            <Activity size={32} className="animate-spin text-blue-500 mx-auto" />
                                        </td>
                                    </tr>
                                ) : filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="py-20 text-center text-gray-600 font-black uppercase italic tracking-widest text-xs">
                                            No se detectaron eventos registrados en este snapshot
                                        </td>
                                    </tr>
                                ) : filteredLogs.map((log) => (
                                    <tr key={log.id} className="group hover:bg-blue-600/[0.03] transition-all">
                                        <td className="px-10 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1.5 mb-1.5 opacity-60">
                                                    <Clock size={10} /> {moment(log.fecha).format('DD MMM YYYY · HH:mm:ss')}
                                                </span>
                                                <span className="text-sm font-black text-white group-hover:text-blue-400 transition-colors uppercase italic mb-0.5">
                                                    {log.user_name || 'System Operator'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6">
                                            <div className="flex flex-col gap-2">
                                                <div className="inline-flex items-center gap-1.5 text-[9px] font-black text-gray-500 uppercase tracking-widest">
                                                    {getEntityIcon(log.entity_type)} {log.entity_type}
                                                </div>
                                                <div className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border w-fit ${getActionColor(log.action)}`}>
                                                    {log.action}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6">
                                            <p className="text-xs font-bold text-gray-400 group-hover:text-gray-300 transition-colors leading-relaxed tracking-tight max-w-md">
                                                {log.description}
                                            </p>
                                        </td>
                                        <td className="px-10 py-6 text-right">
                                            <button className="p-3 bg-gray-900 border border-gray-800 text-gray-700 hover:text-white hover:border-blue-500/30 rounded-2xl transition-all shadow-inner group-hover:bg-blue-600/10">
                                                <ChevronRight size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default AuditPage;
