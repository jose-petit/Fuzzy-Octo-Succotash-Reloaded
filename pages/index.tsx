import React, { useEffect, useState } from 'react';
import { Layout } from 'components/Layout';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import {
    Activity,
    Download,
    Link as LinkIcon,
    AlertTriangle,
    Clock,
    ArrowRight,
    History,
    Database,
    Settings,
    ShieldCheck
} from 'lucide-react';
import Link from 'next/link';
import * as XLSX from 'xlsx';

// Metric Card Component
const MetricCard = ({ title, value, subValue, icon: Icon, color = 'blue', trend }: any) => {
    const colors = {
        blue: 'from-blue-500/10 to-indigo-500/5 dark:from-blue-500/20 dark:to-indigo-500/10 border-blue-200/20 dark:border-blue-500/20 text-blue-600 dark:text-blue-400',
        emerald: 'from-emerald-500/10 to-teal-500/5 dark:from-emerald-500/20 dark:to-teal-500/10 border-emerald-200/20 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
        orange: 'from-orange-500/10 to-amber-500/5 dark:from-orange-500/20 dark:to-amber-500/10 border-orange-200/20 dark:border-orange-500/20 text-orange-600 dark:text-orange-400',
        red: 'from-red-500/10 to-rose-500/5 dark:from-red-500/20 dark:to-rose-500/10 border-red-200/20 dark:border-red-500/20 text-red-600 dark:text-red-400',
    } as any;

    return (
        <div className={`relative overflow-hidden p-6 rounded-3xl border bg-gradient-to-br ${colors[color]} backdrop-blur-md shadow-sm transition-all hover:scale-[1.02] duration-300`}>
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-bold opacity-70 uppercase tracking-wider mb-1">{title}</p>
                    <h2 className="text-4xl font-black tracking-tight">{value}</h2>
                    {subValue && <p className="text-xs font-semibold opacity-60 mt-1">{subValue}</p>}
                </div>
                <div className={`p-3 rounded-2xl bg-white/40 dark:bg-gray-800/40 shadow-inner`}>
                    <Icon size={24} />
                </div>
            </div>
            {trend && (
                <div className="mt-4 flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700`}>
                        {trend}
                    </span>
                </div>
            )}
        </div>
    );
};

// Main Dashboard Component
export default function Dashboard() {
    const { data: session } = useSession();
    const [perfBase, setPerfBase] = useState(() => {
        if (typeof window !== 'undefined') {
            const host = window.location.hostname || '10.4.4.124';
            const port = window.location.port;
            if (process.env.NEXT_PUBLIC_PERF_BACKEND_URL) return process.env.NEXT_PUBLIC_PERF_BACKEND_URL;
            const bPort = (port === '3000' || port === '3010' || port === '3005') ? '5001' : '5000';
            return `${window.location.protocol}//${host}:${bPort}`;
        }
        return 'http://10.4.4.124:5001';
    });

    useEffect(() => {
        // Guard for future dynamic changes
        if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_PERF_BACKEND_URL) {
            setPerfBase(process.env.NEXT_PUBLIC_PERF_BACKEND_URL);
        }
    }, []);

    // 1. Fetch Links (Config)
    const { data: enlaces = [] } = useQuery(['enlaces'], async () => {
        const { data } = await axios.get('/api/enlace');
        return data.enlaces || [];
    });

    // 2. Fetch Latest Performance Batch (History)
    const { data: spansRows = [] } = useQuery(['latestSpans', perfBase], async () => {
        if (!perfBase) return [];
        const { data } = await axios.get(`${perfBase}/api/spans?limit=50`);
        return data.spans || [];
    }, { enabled: !!perfBase });

    // 3. Fetch Real-time Spans (LIVE)
    const { data: liveSpans = [] } = useQuery(['liveSpans', perfBase], async () => {
        if (!perfBase) return [];
        const { data } = await axios.get(`${perfBase}/api/spans/live`);
        return data.spans || [];
    }, {
        enabled: !!perfBase,
        refetchInterval: 60000 // Poll every 1 min for live visual update
    });

    // 4. Fetch Inventory Data (Staging)
    const { data: inventory = [] } = useQuery(['inventory'], async () => {
        const { data } = await axios.get('/api/equipos');
        return data.equipos || [];
    });

    // Derive Metrics
    const activeLinksCount = enlaces.length;
    const lastBatchTime = spansRows.length > 0 ? new Date(spansRows[0].fecha_lote).toLocaleTimeString('es-VE') : '--:--';
    const totalInventoryCount = inventory.reduce((acc: number, item: any) => acc + (item.cantidad || 0), 0);
    const criticalSpansCount = liveSpans.filter((s: any) => {
        const threshold = (s.loss_reference || 25) + (s.umbral || 3);
        return s.perdida > threshold;
    }).length;

    const handleExportExcel = () => {
        const reportData = liveSpans.map((s: any) => {
            const threshold = (s.loss_reference || 25) + (s.umbral || 3);
            const status = s.perdida > threshold ? 'CRITICAL' : (s.perdida > threshold - 2 ? 'WARNING' : 'HEALTHY');
            return {
                Link: s.name1,
                Current_Loss_dB: s.perdida,
                Reference_dB: s.loss_reference || 25,
                Margin_dB: s.umbral || 3,
                Threshold_dB: threshold,
                Status: status,
                Timestamp: new Date().toLocaleString()
            };
        });

        const ws = XLSX.utils.json_to_sheet(reportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Health_Report");
        XLSX.writeFile(wb, `Network_Health_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <Layout>
            <div className="py-10 space-y-12">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-tighter mb-4 border border-blue-100 dark:border-blue-800 italic">
                            <Activity size={12} /> Live Network Status
                        </div>
                        <h1 className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter">
                            Bienvenido, <span className="text-blue-600 dark:text-blue-400 italic">
                                {session?.user?.name ? session.user.name.split(' ')[0] : 'Admin'}
                            </span>
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg font-medium">Aquí tienes el resumen ejecutivo de la red de transporte óptico.</p>
                    </div>
                    <div className="flex gap-3">
                        {session?.user?.rol === 'admin' && (
                            <button
                                onClick={handleExportExcel}
                                className="px-6 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 rounded-2xl font-bold text-sm shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center gap-2"
                            >
                                <Download size={18} className="text-blue-600 dark:text-blue-400" /> Exportar Salud
                            </button>
                        )}
                        <Link href="/performance" className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center gap-2">
                            Monitor Real-Time <ArrowRight size={18} />
                        </Link>
                    </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MetricCard
                        title="Enlaces Activos"
                        value={activeLinksCount}
                        subValue="Configurados en NMS"
                        icon={LinkIcon}
                        color="blue"
                        trend="Red OK"
                    />
                    <MetricCard
                        title="Alarmas Críticas"
                        value={criticalSpansCount}
                        subValue="Superan Umbral de Pérdida (LIVE)"
                        icon={AlertTriangle}
                        color={criticalSpansCount > 0 ? 'red' : 'emerald'}
                        trend={criticalSpansCount === 0 ? "Sin alarmas" : `${criticalSpansCount} secciones`}
                    />
                    <MetricCard
                        title="Última Sincronización"
                        value={lastBatchTime}
                        subValue="Lote de datos persistido"
                        icon={Clock}
                        color="orange"
                    />
                    <MetricCard
                        title="Stock en Almacén"
                        value={totalInventoryCount}
                        subValue={`${inventory.length} SKUs Registrados`}
                        icon={Database}
                        color="blue"
                        trend="Inventario OK"
                    />
                </div>

                {/* Detailed Sections Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Critical Sections List */}
                    <div className="lg:col-span-2 space-y-4">
                        <h3 className="text-xl font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <AlertTriangle className="text-orange-500" /> Secciones con Alta Pérdida (En Vivo)
                        </h3>
                        <div className="bg-white dark:bg-gray-900 rounded-[32px] border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50/50 dark:bg-gray-800/50">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Enlace</th>
                                        <th className="px-6 py-4 text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center">Pérdida</th>
                                        <th className="px-6 py-4 text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center">Umbral</th>
                                        <th className="px-6 py-4 text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-right">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                    {(liveSpans.length > 0 ? liveSpans.slice(0, 5) : [null, null, null, null, null]).map((span: any, i: number) => (
                                        <tr key={span?.serial1 || i} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                {span ? (
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-gray-900 dark:text-gray-100">{span.name1 || 'Sin Nombre'}</span>
                                                        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono tracking-tighter">{span.serial1}</span>
                                                    </div>
                                                ) : <div className="h-10 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl w-3/4"></div>}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {span ? (
                                                    <span className={`font-black text-lg ${span.perdida > (span.loss_reference || 25) + (span.umbral || 3) ? 'text-red-500' : 'text-blue-600 dark:text-blue-400'}`}>
                                                        {span.perdida.toFixed(2)} dB
                                                    </span>
                                                ) : <div className="h-6 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg w-12 mx-auto"></div>}
                                            </td>
                                            <td className="px-6 py-4 text-center text-sm font-bold text-gray-400 dark:text-gray-500 uppercase">
                                                {span ? `${(span.loss_reference || 25) + (span.umbral || 3)} dB` : '---'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {span ? (
                                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase ${span.perdida > (span.loss_reference || 25) + (span.umbral || 3) ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900'}`}>
                                                        <div className={`w-1.5 h-1.5 rounded-full ${span.perdida > (span.loss_reference || 25) + (span.umbral || 3) ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                                                        {span.perdida > (span.loss_reference || 25) + (span.umbral || 3) ? 'CRITICAL' : 'OPTIMAL'}
                                                    </div>
                                                ) : <div className="h-6 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-full w-20 ml-auto"></div>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {liveSpans.length === 0 && (
                                <div className="p-10 text-center text-gray-400 dark:text-gray-600 font-bold italic">
                                    No hay datos en vivo disponibles. Sincronizando NMS...
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Fast Navigation Section */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-black text-gray-900 dark:text-gray-100 flex items-center gap-2 italic">
                            <Settings className="text-blue-500" /> Acceso Rápido
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                            <NavigationTile
                                href="/historial-tarjetas"
                                title="Análisis Histórico"
                                desc="Auditoría de métricas y tendencias"
                                icon={History}
                                color="bg-indigo-600"
                            />
                            <NavigationTile
                                href="/admin/enlaces"
                                title="Gestión de Enlaces"
                                desc="Configuración de red y umbrales"
                                icon={Database}
                                color="bg-gray-800 dark:bg-gray-800"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

// Navigation Tile Component
const NavigationTile = ({ href, title, desc, icon: Icon, color }: any) => (
    <Link href={href}>
        <div className="group bg-white dark:bg-gray-900 p-6 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center gap-6">
            <div className={`p-4 rounded-2xl ${color} text-white shadow-lg shadow-gray-200 dark:shadow-none transition-transform group-hover:rotate-6`}>
                <Icon size={24} />
            </div>
            <div>
                <h4 className="font-black text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors uppercase tracking-tight">{title}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{desc}</p>
            </div>
        </div>
    </Link>
);
