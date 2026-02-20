import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../../components/Layout';
import { SpanLink, NotificationType } from '../../components/span-processor/types';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import {
    CloudUpload,
    Sparkles,
    Clock,
    Filter,
    X,
    Activity,
    Info,
    Settings
} from 'lucide-react';

// Imported components (now using local paths in the combined project)
import Header from '../../components/span-processor/Header';
import FileUpload from '../../components/span-processor/FileUpload';
import LinksTable from '../../components/span-processor/LinksTable';
import ActionButtons from '../../components/span-processor/ActionButtons';
import AnalysisModal from '../../components/span-processor/AnalysisModal';
import Notification from '../../components/span-processor/Notification';
import ActivityLog, { ActivityLogEntry } from '../../components/span-processor/ActivityLog';
import AdminMenu from '../../components/span-processor/AdminMenu';
import dynamic from 'next/dynamic';

const ThresholdsEditor = dynamic(() => import('../../components/span-processor/admin/ThresholdsEditor'), { ssr: false });
const DWDMMapViewer = dynamic(() => import('../../components/span-processor/admin/DWDMMapViewer'), { ssr: false });

export default function SpanProcessorPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    // Authentication Guard
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    const [links, setLinks] = useState<SpanLink[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
    const [showActivityLog, setShowActivityLog] = useState<boolean>(false);
    const [showAdminMenu, setShowAdminMenu] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
    const [showAnalysisModal, setShowAnalysisModal] = useState<boolean>(false);
    const [notifications, setNotifications] = useState<NotificationType[]>([]);
    const [spanCount, setSpanCount] = useState(0);
    const [uniqueLotes, setUniqueLotes] = useState<string[]>([]);
    const [selectedLote, setSelectedLote] = useState<string>('NO');
    const [includeHistory, setIncludeHistory] = useState<boolean>(false);
    const [analysisResult, setAnalysisResult] = useState<string>('');
    const [analysisTitle, setAnalysisTitle] = useState<string>('');

    const [view, setView] = useState<'home' | 'admin-thresholds' | 'admin-map'>('home');

    const isAdmin = session?.user?.rol === 'admin';
    const role = isAdmin ? 'admin' : 'lectura';

    // API Base
    const API_BASE = '/api/span-processor';

    const addNotification = (type: NotificationType['type'], message: string): void => {
        setNotifications((prev) => [...prev, { id: Date.now(), type, message }]);
    };

    const fetchBatches = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE}/batches`);
            setUniqueLotes(res.data.batches || []);
        } catch (error) {
            addNotification('error', 'Error al cargar lotes de carga');
        }
    }, []);

    const fetchLinks = useCallback(async () => {
        setIsLoading(true);
        try {
            let url = `${API_BASE}/spans?page=1&limit=500`;
            if (selectedLote && selectedLote !== 'NO') {
                url = `${API_BASE}/spans?batch=${encodeURIComponent(selectedLote)}&page=1&limit=30000`;
            }
            const response = await axios.get(url);
            setLinks(response.data.data || []);
            setSpanCount(response.data.total || 0);
        } catch (error) {
            addNotification('error', 'Error al cargar el historial de enlaces.');
        }
        setIsLoading(false);
    }, [selectedLote]);

    useEffect(() => {
        if (status === 'authenticated') {
            fetchBatches();
            fetchLinks();
        }
    }, [status, fetchLinks, fetchBatches]);

    const handleFileUpload = async (file: File) => {
        setIsProcessing(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await axios.post(`${API_BASE}/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            addNotification('success', `Archivo procesado: ${response.data.rows} filas.`);
            await fetchLinks();
            await fetchBatches();
        } catch (error) {
            addNotification('error', 'Error al procesar el archivo.');
        }
        setIsProcessing(false);
    };

    const handleGenerateSummary = async () => {
        if (links.length === 0) {
            addNotification('info', 'No hay datos para generar un resumen.');
            return;
        }
        setAnalysisTitle('Resumen Ejecutivo del Lote');
        setIsAnalyzing(true);
        setShowAnalysisModal(true);
        setAnalysisResult('');
        try {
            const response = await axios.post(`${API_BASE}/summary`, { links });
            setAnalysisResult(response.data.result);
        } catch (error) {
            setAnalysisResult('Error al generar el resumen con IA: ' + (error as any).message);
        }
        setIsAnalyzing(false);
    };

    const handleClearHistory = async () => {
        if (!selectedLote || selectedLote === 'NO') return;
        if (!window.confirm('¿Está seguro de eliminar este lote?')) return;

        setIsLoading(true);
        try {
            await axios.post(`${API_BASE}/delete-lote`, { upload_batch_id: selectedLote });
            addNotification('success', 'Lote eliminado exitosamente.');
            setSelectedLote('NO');
            await fetchLinks();
            await fetchBatches();
        } catch (error) {
            addNotification('error', 'Error al borrar el lote.');
        }
        setIsLoading(false);
    };

    if (status === 'loading') return <Layout><div>Cargando...</div></Layout>;

    return (
        <Layout>
            <div className="py-6 space-y-8 min-h-[calc(100vh-80px)]">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <Header spanCount={spanCount} />

                    {/* Admin Access Toggle - Floating style but in grid */}
                    <button
                        onClick={() => setShowAdminMenu(true)}
                        className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-glass font-black text-xs uppercase tracking-widest text-gray-900 dark:text-white hover:scale-105 active:scale-95 transition-all group"
                    >
                        <Settings size={18} className="text-primary group-hover:rotate-90 transition-transform duration-500" />
                        Ajustes de Sistema
                    </button>
                </div>

                {/* Admin Menu Sidebar/Overlay */}
                {showAdminMenu && (
                    <AdminMenu
                        links={links}
                        onUpdateThreshold={() => { }}
                        onClose={() => setShowAdminMenu(false)}
                        role={role}
                        onLogin={() => { }}
                        onLogout={() => { }}
                        showLogin={false}
                        setShowLogin={() => { }}
                        showNotification={(msg, type) => addNotification(type, msg)}
                        onNavigate={(r) => { setView(r); setShowAdminMenu(false); }}
                    />
                )}

                {view === 'admin-thresholds' ? (
                    <ThresholdsEditor onBack={() => setView('home')} />
                ) : view === 'admin-map' ? (
                    <div className="animate-fade-in flex flex-col h-[calc(100vh-150px)]">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tight">Explorador de Mapa DWDM</h2>
                            <button onClick={() => setView('home')} className="text-xs font-black uppercase tracking-widest text-primary hover:underline">
                                <X size={16} className="inline mr-1" />
                                Volver al inicio
                            </button>
                        </div>
                        <div className="flex-1 overflow-hidden rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-glass">
                            <DWDMMapViewer />
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Main Dashboard Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-glass group hover:border-primary/20 transition-all duration-500 animate-slide-up">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-inner transition-transform group-hover:scale-110">
                                        <CloudUpload size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tight">Carga de Datos</h3>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">CSV / EXCEL (CISCO EXPORT)</p>
                                    </div>
                                </div>
                                <FileUpload onUpload={handleFileUpload} isProcessing={isProcessing} />
                            </div>

                            <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-glass group hover:border-accent/20 transition-all duration-500 animate-slide-up [animation-delay:100ms]">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="p-3 rounded-2xl bg-accent/10 text-accent shadow-inner transition-transform group-hover:scale-110">
                                        <Sparkles size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tight">Análisis Inteligente</h3>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">SINTETIZADO POR GEMINI IA</p>
                                    </div>
                                </div>
                                <ActionButtons
                                    onGenerateSummary={handleGenerateSummary}
                                    isSummaryDisabled={links.length === 0 || isProcessing || isAnalyzing}
                                    role={role}
                                    hasSummary={!!analysisResult}
                                    onExportPDF={() => {
                                        const win = window.open('', '_blank');
                                        if (win) {
                                            win.document.write(`
                                            <html>
                                              <head>
                                                <title>${analysisTitle}</title>
                                                <style>
                                                  body { font-family: sans-serif; padding: 40px; line-height: 1.6; color: #333; }
                                                  h1 { color: #000; border-bottom: 2px solid #primary; padding-bottom: 10px; }
                                                  pre { white-space: pre-wrap; background: #f4f4f4; padding: 20px; border-radius: 8px; }
                                                  .footer { margin-top: 40px; font-size: 10px; color: #999; text-align: center; }
                                                </style>
                                              </head>
                                              <body>
                                                <h1>${analysisTitle}</h1>
                                                <div style="margin-bottom: 20px;">Fecha: ${new Date().toLocaleString()}</div>
                                                <div id="content">${analysisResult.replace(/\n/g, '<br/>')}</div>
                                                <div class="footer">Generado por Cisco Span IA Module - web-notifications-combined</div>
                                                <script>window.print();</script>
                                              </body>
                                            </html>
                                          `);
                                            win.document.close();
                                        }
                                    }}
                                />
                                <div className="flex items-center gap-3 mt-6 p-4 rounded-2xl bg-gray-50/50 dark:bg-gray-800/20 border border-gray-100/50 dark:border-gray-700/50">
                                    <div className="relative flex items-center">
                                        <input
                                            type="checkbox"
                                            id="includeHist"
                                            checked={includeHistory}
                                            onChange={e => setIncludeHistory(e.target.checked)}
                                            className="w-5 h-5 rounded-lg border-gray-300 dark:border-gray-600 text-accent focus:ring-accent bg-white dark:bg-gray-900 transition-all cursor-pointer"
                                        />
                                    </div>
                                    <label htmlFor="includeHist" className="text-xs font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest cursor-pointer select-none">
                                        Incluir análisis histórico por enlace
                                    </label>
                                    <div className="ml-auto text-gray-300 dark:text-gray-600">
                                        <Info size={16} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Inventory/History Table Area */}
                        <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-[2.5rem] p-10 border border-gray-100 dark:border-gray-800 shadow-glass space-y-8 animate-fade-in">
                            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                            <Filter size={18} />
                                        </div>
                                        <label className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] italic">Carga de Datos:</label>
                                    </div>
                                    <div className="relative group">
                                        <select
                                            className="bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl px-6 py-3 text-sm font-black text-gray-900 dark:text-white focus:ring-2 focus:ring-primary shadow-sm outline-none transition-all cursor-pointer appearance-none min-w-[240px] pr-12"
                                            value={selectedLote}
                                            onChange={e => setSelectedLote(e.target.value)}
                                        >
                                            <option value="NO">TODOS LOS REGISTROS (VISTA GLOBAL)</option>
                                            {uniqueLotes.map(lote => (
                                                <option key={lote} value={lote} className="font-bold">
                                                    📅 {new Date(lote).toLocaleString('es-VE', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                            <Clock size={16} />
                                        </div>
                                    </div>
                                </div>

                                {isAdmin && selectedLote !== 'NO' && (
                                    <button
                                        onClick={handleClearHistory}
                                        className="flex items-center gap-2 px-8 py-3 bg-red-50 hover:bg-red-600 dark:bg-red-900/10 dark:hover:bg-red-600 text-red-600 dark:text-red-400 hover:text-white font-black rounded-2xl transition-all text-xs uppercase tracking-widest border border-red-100 dark:border-red-900/20 active:scale-95 shadow-sm"
                                    >
                                        <X size={16} />
                                        Eliminar Lote
                                    </button>
                                )}
                            </div>

                            <LinksTable
                                links={links}
                                isLoading={isLoading}
                                showNotification={(msg, type) => addNotification(type, msg)}
                                role={role}
                            />
                        </div>
                    </>
                )}
            </div>

            <AnalysisModal
                isOpen={showAnalysisModal}
                onClose={() => setShowAnalysisModal(false)}
                title={analysisTitle}
                content={analysisResult}
                isLoading={isAnalyzing}
            />

            <div className="fixed top-24 right-8 z-[200] flex flex-col gap-4 pointer-events-none">
                {notifications.map((n) => (
                    <div key={n.id} className="pointer-events-auto">
                        <Notification notification={n} onClose={() => setNotifications((p) => p.filter((x) => x.id !== n.id))} />
                    </div>
                ))}
            </div>
        </Layout>
    );
}
