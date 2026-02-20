import React, { useState, useEffect } from 'react';
import Layout from 'components/Layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
    Settings,
    Bell,
    ShieldAlert,
    Send,
    Database,
    ShieldCheck,
    Save,
    RefreshCcw,
    AlertCircle,
    UserCircle,
    Copy,
    Check,
    Smartphone,
    Users,
    Activity,
    Zap,
    Clock,
    AlertTriangle,
    Trash2,
    TrendingUp,
    Search,
    Plus,
    Filter,
    Info,
    Map as MapIcon,
    ChevronDown,
    CheckCircle,
    SmartphoneNfc
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useSession } from 'next-auth/react';
// Eliminado componente redundante de destinos manager

// Subcomponente para manejar los estados locales de cada fila de umbrales
const LinkThresholdRow = ({ link, onSave }: { link: any, onSave: (min: number, max: number) => void }) => {
    const [localMin, setLocalMin] = useState(link.min_span || 0);
    const [localMax, setLocalMax] = useState(link.max_span || 10);

    const hasChanged = localMin !== (link.min_span || 0) || localMax !== (link.max_span || 10);

    return (
        <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row items-center gap-6 group/row hover:border-orange-200 dark:hover:border-orange-900/40 transition-all">
            <div className="flex-1 min-w-0 w-full text-center md:text-left">
                <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-tight truncate">{link.alias || link.link_identifier}</p>
                <p className="text-[9px] text-gray-400 font-bold font-mono mt-1 opacity-60 truncate">{link.link_identifier}</p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="flex flex-col gap-1 w-full md:w-24">
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest text-center">Min (dB)</span>
                    <input
                        type="number"
                        step="0.1"
                        value={localMin}
                        onChange={(e) => setLocalMin(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-[10px] font-bold text-center outline-none focus:border-orange-500 transition-all"
                    />
                </div>
                <div className="flex flex-col gap-1 w-full md:w-24">
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest text-center">Max (dB)</span>
                    <input
                        type="number"
                        step="0.1"
                        value={localMax}
                        onChange={(e) => setLocalMax(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-[10px] font-bold text-center outline-none focus:border-orange-500 transition-all"
                    />
                </div>
                <button
                    onClick={() => onSave(localMin, localMax)}
                    className={`p-3 rounded-xl transition-all shadow-md group-hover/row:scale-105 ${hasChanged ? 'bg-orange-600 text-white shadow-orange-500/30' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}
                    title="Guardar Límites"
                >
                    <Save size={18} />
                </button>
            </div>
        </div>
    );
};

const SystemSettings = () => {
    const { data: session } = useSession();
    const queryClient = useQueryClient();
    const [testMessage, setTestMessage] = useState('🧪 Prueba de conexión del Sistema de Notificaciones DWDM');
    const [copiedId, setCopiedId] = useState<number | null>(null);

    // Form states for settings
    const [scanInterval, setScanInterval] = useState('5');
    const [lossThreshold, setLossThreshold] = useState('3.0');
    const [activeChatId, setActiveChatId] = useState('');
    const [tgHeader, setTgHeader] = useState('🔴 ALERTA DE TRANSPORTE');
    const [tgFooter, setTgFooter] = useState('Equipo de Transporte Óptico - Monitoreo Activo');
    const [uiRefresh, setUiRefresh] = useState('60');
    const [publicUrl, setPublicUrl] = useState('http://10.4.4.124:3005');
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [maintenanceUntil, setMaintenanceUntil] = useState('');
    const [weeklyReport, setWeeklyReport] = useState(true);
    const [monthlyReport, setMonthlyReport] = useState(true);
    const [reportCriticality, setReportCriticality] = useState('3.0');
    const [rapidIncreaseThreshold, setRapidIncreaseThreshold] = useState('1.5');

    // Link Aliases State
    const [aliases, setAliases] = useState<any[]>([]);
    const [newSerial, setNewSerial] = useState('');
    const [newAlias, setNewAlias] = useState('');
    const [confirmationSamples, setConfirmationSamples] = useState('2');
    const [jitterThreshold, setJitterThreshold] = useState('0.3');
    const [driftThreshold, setDriftThreshold] = useState('2.0');

    // Telegram Multi-Select State
    const [selectedChats, setSelectedChats] = useState<string[]>([]);
    const [isTgSectionOpen, setIsTgSectionOpen] = useState(false);
    const [isIncidentsOpen, setIsIncidentsOpen] = useState(true);
    const [isAliasesOpen, setIsAliasesOpen] = useState(false);
    const [isNetEngineOpen, setIsNetEngineOpen] = useState(true);
    const [isInhibitionsOpen, setIsInhibitionsOpen] = useState(false);
    const [isCiscoSectionOpen, setIsCiscoSectionOpen] = useState(false);

    // Cisco Specific States
    const [tgTokenCisco, setTgTokenCisco] = useState('');
    const [tgChatIdCisco, setTgChatIdCisco] = useState('');
    const [newSpanIdentifier, setNewSpanIdentifier] = useState('');
    const [newSpanAlias, setNewSpanAlias] = useState('');
    const [isSpanAliasesOpen, setIsSpanAliasesOpen] = useState(false);
    const [isSpanLinksOpen, setIsSpanLinksOpen] = useState(false);
    const [spanSearch, setSpanSearch] = useState('');
    const [spanSamplesPerDay, setSpanSamplesPerDay] = useState('4');

    const { data: aliasData, refetch: refetchAliases } = useQuery(['link-aliases'], async () => {
        const { data } = await axios.get('/api/admin/aliases');
        return data.aliases || [];
    });

    useEffect(() => {
        if (aliasData) setAliases(aliasData);
    }, [aliasData]);

    const { data: inhibitedSerials, refetch: refetchInhibitions } = useQuery(['link-inhibitions'], async () => {
        const { data } = await axios.get('/api/admin/inhibitions');
        return data.inhibitions || [];
    });

    const removeInhibitionMutation = useMutation(async (serial: string) => {
        await axios.delete('/api/admin/inhibitions', { data: { serial } });
    }, {
        onSuccess: () => {
            toast.success('Monitoreo reactivado para el equipo');
            refetchInhibitions();
        }
    });

    const addAliasMutation = useMutation(async ({ serial, alias }: { serial: string, alias: string }) => {
        await axios.post('/api/admin/aliases', { serial, alias });
    }, {
        onSuccess: () => {
            toast.success('Alias guardado correctamente');
            refetchAliases();
            setNewSerial('');
            setNewAlias('');
        }
    });

    const sendTestCiscoMutation = useMutation(async () => {
        const toastId = toast.loading('Enviando señal de prueba Cisco...');
        try {
            await axios.post('/api/admin/telegram-test', {
                chatId: tgChatIdCisco,
                message: '🧪 Prueba de conexión: Cisco Span Processor Alert System',
                isCisco: true
            });
            toast.success('¡Señal recibida en Telegram! (Cisco) 📡', { id: toastId });
        } catch (e) {
            toast.error('Fallo en la conexión Cisco ❌', { id: toastId });
        }
    });

    const deleteAliasMutation = useMutation(async (serial: string) => {
        await axios.delete('/api/admin/aliases', { data: { serial } });
    }, {
        onSuccess: () => {
            toast.success('Alias eliminado');
            refetchAliases();
        }
    });

    const syncAliasesMutation = useMutation(async () => {
        await axios.patch('/api/admin/aliases', { syncFromTopology: true });
    }, {
        onSuccess: () => {
            toast.success('Escaneo de topología completado 📡');
            refetchAliases();
        },
        onError: () => toast.error('Error al sincronizar con la topología')
    });

    // 1. Obtener chats recientes de Telegram desde la API
    const { data: telegramData, isFetching: loadingChats, refetch: refetchChats } = useQuery(['telegram-chats'], async () => {
        const { data } = await axios.get('/api/admin/telegram-chats');
        return data.chats || [];
    });

    const { data: spanAliases, refetch: refetchSpanAliases } = useQuery(['span-aliases'], async () => {
        const { data } = await axios.get('/api/admin/span-aliases');
        return data.aliases || [];
    });

    const { data: spanLinks } = useQuery(['span-links-list'], async () => {
        const { data } = await axios.get('/api/admin/span-links');
        return data.data || [];
    });

    const addSpanAliasMutation = useMutation(async ({ id, alias }: { id: string, alias: string }) => {
        await axios.post('/api/admin/span-aliases', { link_identifier: id, alias });
    }, {
        onSuccess: () => {
            toast.success('Alias de Cisco guardado');
            refetchSpanAliases();
            setNewSpanIdentifier('');
            setNewSpanAlias('');
        }
    });

    const removeSpanAliasMutation = useMutation(async (id: number) => {
        await axios.delete('/api/admin/span-aliases', { data: { id } });
    }, {
        onSuccess: () => {
            toast.success('Alias eliminado');
            refetchSpanAliases();
        }
    });

    const updateSpanThresholdMutation = useMutation(async ({ id, min, max }: { id: string, min: number, max: number }) => {
        await axios.post('/api/admin/span-links', { link_identifier: id, min, max });
    }, {
        onSuccess: () => {
            toast.success('Umbrales actualizados correctamente');
            queryClient.invalidateQueries(['span-links-list']);
        },
        onError: () => toast.error('Error al actualizar umbrales')
    });

    // 2. Obtener incidentes activos
    const { data: activeAlarms } = useQuery(['active-alarms'], async () => {
        const { data } = await axios.get('/api/admin/active-alarms');
        return data.alarms || [];
    }, {
        refetchInterval: (Number(uiRefresh) || 60) * 1000,
    });
    const { data: savedSettings, isSuccess: settingsLoaded } = useQuery(['system-perf-settings'], async () => {
        const { data } = await axios.get('/api/admin/settings');
        return data.settings;
    });

    useEffect(() => {
        if (settingsLoaded && savedSettings) {
            setScanInterval(savedSettings.scan_interval || '5');
            setLossThreshold(savedSettings.loss_threshold || '3.0');
            setActiveChatId(savedSettings.telegram_chat_id || '');
            setTgHeader(savedSettings.telegram_header || '🔴 ALERTA DE TRANSPORTE');
            setTgFooter(savedSettings.telegram_footer || 'Equipo de Transporte Óptico - Monitoreo Activo');
            setUiRefresh(savedSettings.ui_refresh_interval || '60');
            setPublicUrl(savedSettings.public_url || 'http://localhost:3005');
            setMaintenanceMode(savedSettings.maintenance_mode === 'true');
            setMaintenanceUntil(savedSettings.maintenance_until || '');
            setWeeklyReport(savedSettings.weekly_report_enabled !== 'false');
            setMonthlyReport(savedSettings.monthly_report_enabled !== 'false');
            setReportCriticality(savedSettings.report_criticality_threshold || '3.0');
            setRapidIncreaseThreshold(savedSettings.alert_rapid_increase_threshold || '1.5');
            setConfirmationSamples(savedSettings.alert_confirmation_samples || '2');
            setJitterThreshold(savedSettings.alert_jitter_threshold || '0.3');
            setTgTokenCisco(savedSettings.telegram_bot_token_cisco || '');
            setTgChatIdCisco(savedSettings.telegram_chat_id_cisco || '');
            setDriftThreshold(savedSettings.alert_drift_threshold || '2.0');
            setSpanSamplesPerDay(savedSettings.span_samples_per_day || '4');
        }
    }, [settingsLoaded, savedSettings]);

    // 4. Mutación para guardar ajustes
    const simulateMutation = useMutation(async (type: string) => {
        const perfBase = '/api/nms-proxy';
        await axios.post(`${perfBase}/api/spans/simulate`, { type });
    }, {
        onSuccess: (_, type) => toast.success(`Simulación ${type} enviada`),
        onError: () => toast.error('Error al procesar simulación')
    });

    const saveSettingMutation = useMutation(async ({ key, value }: { key: string, value: string }) => {
        await axios.post('/api/admin/settings', { key, value });
    }, {
        onSuccess: () => {
            toast.success('Configuración sincronizada con el motor de red 🚀');
            queryClient.invalidateQueries(['system-perf-settings']);
        }
    });

    // 5. Mutación para clarear alarma
    const clearAlarmMutation = useMutation(async (entityId: string) => {
        await axios.delete(`/api/admin/active-alarms?entityId=${entityId}`);
    }, {
        onSuccess: () => {
            toast.success('Incidente removido del monitor');
            queryClient.invalidateQueries(['active-alarms']);
        }
    });

    // 5b. Mutación para Aceptar (ACK) alarma
    const ackAlarmMutation = useMutation(async (entityId: string) => {
        await axios.patch(`/api/admin/active-alarms`, { entityId });
    }, {
        onSuccess: () => {
            toast.success('Incidente aceptado por el operador ✅');
            queryClient.invalidateQueries(['active-alarms']);
        }
    });

    // 6. Mutación para calibración masiva (Nuclear Reset)
    const calibrateAllMutation = useMutation(async () => {
        const toastId = toast.loading('Calculando nuevos registros de base...');
        const perfUrl = '/api/nms-proxy';
        await axios.post(`${perfUrl}/api/spans/calibrate-all`);
        return toastId;
    }, {
        onSuccess: (toastId) => {
            toast.success('¡Red calibrada a Niveles Actuales! 🏁', { id: toastId });
            queryClient.invalidateQueries(['active-alarms']);
        },
        onError: (err: any, vars, toastId: any) => {
            toast.error('Fallo en la calibración masiva', { id: toastId });
        }
    });

    // 7. Mutación para probar mensaje
    const sendTestMutation = useMutation(async (chatId: number | string) => {
        const toastId = toast.loading('Enviando señal de prueba...');
        try {
            await axios.post('/api/admin/telegram-test', { chatId, message: testMessage });
            toast.success('¡Señal recibida en Telegram! 🏁', { id: toastId });
        } catch (e) {
            toast.error('Fallo en la conexión ❌', { id: toastId });
        }
    });

    const copyToClipboard = (id: number | string) => {
        navigator.clipboard.writeText(String(id));
        setCopiedId(Number(id));
        toast.success('ID copiado al portapapeles');
        setTimeout(() => setCopiedId(null), 2000);
    };


    const toggleChatSelection = async (chatId: string) => {
        const isCurrentlySelected = selectedChats.includes(chatId);

        setSelectedChats(prev =>
            isCurrentlySelected ? prev.filter(id => id !== chatId) : [...prev, chatId]
        );

        try {
            // Find in unified list instead of just telegramData
            const chat = visibleChats.find((c: any) => String(c.id) === chatId);
            if (chat) {
                await axios.post('/api/admin/telegram-destinations', {
                    chat_id: chatId,
                    chat_name: chat.title || `${chat.first_name || ''} ${chat.last_name || ''}`.trim(),
                    chat_type: chat.type || 'group',
                    is_active: !isCurrentlySelected
                });
                queryClient.invalidateQueries(['telegram-destinations']);
                toast.success(`Broadcast ${!isCurrentlySelected ? 'activado' : 'desactivado'}`);
            } else {
                console.error('Chat not found for toggle:', chatId);
            }
        } catch (err) {
            toast.error('Error al sincronizar broadcast');
            setSelectedChats(prev => isCurrentlySelected ? [...prev, chatId] : prev.filter(id => id !== chatId));
        }
    };

    const updateAliasMutation = useMutation(async ({ chatId, alias }: { chatId: string, alias: string }) => {
        const chat = visibleChats.find((c: any) => String(c.id) === chatId);
        await axios.post('/api/admin/telegram-destinations', {
            chat_id: chatId,
            chat_name: chat?.title || 'Desconocido',
            alias
        });
    }, {
        onSuccess: () => {
            toast.success('Alias actualizado');
            queryClient.invalidateQueries(['telegram-destinations']);
        }
    });

    const toggleCanQuery = async (chatId: string) => {
        const dest = (destinationData || []).find((d: any) => String(d.chat_id) === String(chatId));
        const isCurrentlyAuthorized = dest?.can_query || false;

        try {
            const chat = visibleChats.find((c: any) => String(c.id) === chatId);
            await axios.post('/api/admin/telegram-destinations', {
                chat_id: chatId,
                chat_name: chat?.title || dest?.chat_name || 'Desconocido',
                can_query: !isCurrentlyAuthorized
            });
            queryClient.invalidateQueries(['telegram-destinations']);
            toast.success(`Acceso a comandos ${!isCurrentlyAuthorized ? 'autorizado' : 'revocado'}`);
        } catch (err) {
            toast.error('Error al actualizar permisos');
        }
    };

    const deleteChatDestinationMutation = useMutation(async (chatId: string) => {
        await axios.post('/api/admin/telegram-destinations', {
            chat_id: String(chatId),
            last_hidden_at: new Date().toISOString(),
            is_active: false,
            can_query: false
        });
    }, {
        onSuccess: (_, chatId) => {
            toast.success('Dispositivo ocultado 🗑️');
            setSelectedChats(prev => prev.filter(id => id !== String(chatId)));
            queryClient.invalidateQueries(['telegram-destinations']);
        }
    });

    // Remove the saveDestinationsMutation as it's now individual
    const saveDestinationsMutation = { mutate: () => { }, isLoading: false };
    // We keep the shell to avoid breakage in UI calls, but it won't do anything mass-destructive.


    const { data: destinationData } = useQuery(['telegram-destinations'], async () => {
        const { data } = await axios.get('/api/admin/telegram-destinations');
        return data.destinations || [];
    });

    useEffect(() => {
        const activeChatIds = (destinationData || [])
            .filter((d: any) => d.is_active)
            .map((d: any) => String(d.chat_id));
        setSelectedChats(activeChatIds);
    }, [destinationData]);

    // Unify chats from bot (recent) and database (persisted)
    const visibleChats = React.useMemo(() => {
        const freshChats = (telegramData || []).map((c: any) => ({
            id: String(c.id),
            title: c.title || `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.username || 'Sin nombre',
            first_name: c.first_name || '',
            last_name: c.last_name || '',
            type: c.type || 'group',
            date: c.date || 0
        }));

        const savedDests = (destinationData || [])
            .map((d: any) => ({
                id: String(d.chat_id),
                title: d.chat_name,
                type: d.chat_type,
                alias: d.alias,
                is_active: d.is_active,
                last_hidden_at: d.last_hidden_at,
                date: 0
            }));

        const mergedMap = new Map();
        // 1. Fill with saved ones (these ARE the source of truth for the UI list)
        savedDests.forEach(d => mergedMap.set(d.id, d));

        // 2. Merge with fresh ones to see if there are NEW chats not yet in DB
        freshChats.forEach(c => {
            if (mergedMap.has(c.id)) {
                // Update with fresh date if available
                const existing = mergedMap.get(c.id);
                mergedMap.set(c.id, { ...existing, date: c.date || existing.date, hasFreshData: true });
            } else {
                // New chat!
                mergedMap.set(c.id, { ...c, is_active: false, hasFreshData: true });
            }
        });

        const allMerged = Array.from(mergedMap.values()) as any[];

        return allMerged.filter(chat => {
            // Always show if active or if it has NO hide timestamp
            if (chat.is_active || !chat.last_hidden_at) return true;

            // Smart Hide Logic
            const hiddenDate = new Date(chat.last_hidden_at);
            const msgDate = chat.date ? new Date(chat.date * 1000) : null;

            // Reappear only if there is a NEWER message than the hide date
            if (msgDate && msgDate > hiddenDate) return true;

            return false;
        });
    }, [telegramData, destinationData]);

    return (
        <Layout>
            <div className="max-w-[1400px] mx-auto px-4 py-8 animate-fade-in font-sans">
                {/* CYBER-HEADER */}
                <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-8 border-b border-gray-100 dark:border-gray-800 pb-10">
                    <div className="flex items-center gap-8">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-blue-500 rounded-[2rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                            <div className="relative p-6 bg-gray-900 dark:bg-blue-600 rounded-[2rem] shadow-2xl text-white transform group-hover:rotate-6 transition-transform">
                                <Settings size={40} strokeWidth={2.5} />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter uppercase italic leading-none">
                                Panel de Control
                            </h1>
                            <div className="flex items-center gap-3 mt-3">
                                <span className="h-1 w-12 bg-blue-600 rounded-full"></span>
                                <p className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.4em] font-mono">
                                    Configuración de Infraestructura
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-white dark:bg-gray-950 p-2 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-xl">
                        <div className="flex items-center gap-2 px-6 py-3 bg-emerald-500/10 text-emerald-600 rounded-[1.5rem] border border-emerald-500/20">
                            <Zap size={18} className="animate-pulse" />
                            <span className="text-xs font-black uppercase tracking-widest italic">Sistema ONLINE</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

                    {/* COLUMNA IZQUIERDA: ESTADO DE RED & INCIDENTES */}
                    <div className="lg:col-span-2 space-y-10">
                        <div className="bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 p-10 shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                                <Activity size={150} />
                            </div>

                            <div
                                onClick={() => setIsIncidentsOpen(!isIncidentsOpen)}
                                className="flex items-center justify-between mb-10 cursor-pointer group/header"
                            >
                                <div className="flex items-center gap-5">
                                    <div className={`p-4 rounded-2xl transition-all ${isIncidentsOpen ? 'bg-red-600 text-white shadow-lg' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                                        <ShieldAlert size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">
                                            Motor de Incidentes Activos
                                        </h3>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Fallas en estado de seguimiento (Auto-Clear activo)</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-500/20">
                                        {activeAlarms?.length || 0} Fallas
                                    </span>
                                    <div className={`transition-transform duration-500 ${isIncidentsOpen ? 'rotate-180' : ''}`}>
                                        <Zap size={24} className="text-gray-300 group-hover/header:text-red-500 transition-colors" />
                                    </div>
                                </div>
                            </div>

                            <div className={`transition-all duration-700 ease-in-out overflow-hidden ${isIncidentsOpen ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'}`}>

                                <div className="space-y-4">
                                    {!activeAlarms || activeAlarms.length === 0 ? (
                                        <div className="py-20 text-center border-2 border-dashed border-gray-50 dark:border-gray-800 rounded-[2.5rem] bg-gray-50/20">
                                            <ShieldCheck className="mx-auto text-emerald-400 mb-4 opacity-40" size={48} />
                                            <p className="text-sm font-black text-gray-400 uppercase tracking-widest">No hay incidentes críticos en curso</p>
                                            <p className="text-[10px] text-gray-400 mt-2">La red se encuentra bajo los umbrales de seguridad</p>
                                        </div>
                                    ) : (
                                        activeAlarms.map((alarm: any) => (
                                            <div key={alarm.id} className="p-6 bg-red-50/30 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 group hover:border-red-400 transition-all">
                                                <div className="flex items-center gap-6 w-full">
                                                    <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-red-500/20 animate-pulse">
                                                        <AlertTriangle size={32} />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-lg font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">
                                                            {alarm.entity_id}
                                                        </p>
                                                        <div className="flex flex-wrap gap-3">
                                                            {alarm.acknowledged ? (
                                                                <span className="text-[10px] font-black bg-blue-500 text-white px-3 py-0.5 rounded-full uppercase tracking-tighter flex items-center gap-1">
                                                                    <Check size={10} /> Aceptado por {alarm.acknowledged_by}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] font-black bg-red-600 text-white px-3 py-0.5 rounded-full uppercase tracking-tighter">Crítico</span>
                                                            )}
                                                            <span className="text-[10px] font-bold text-gray-400 font-mono flex items-center gap-1">
                                                                <Clock size={12} /> Iniciado: {new Date(alarm.fecha_inicio).toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-8 w-full md:w-auto px-6 whitespace-nowrap">
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase">Pérdida Actual</p>
                                                        <p className="text-2xl font-black text-red-600 font-mono tracking-tighter">{alarm.current_value} <span className="text-sm italic">dB</span></p>
                                                    </div>
                                                    <div className="w-px h-10 bg-red-100 dark:bg-red-900/30"></div>
                                                    <div className="flex gap-3">
                                                        {!alarm.acknowledged && (
                                                            <button
                                                                onClick={() => ackAlarmMutation.mutate(alarm.entity_id)}
                                                                className="p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                                                                title="Aceptar Incidente"
                                                            >
                                                                <ShieldCheck size={20} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => clearAlarmMutation.mutate(alarm.entity_id)}
                                                            className="p-4 bg-white dark:bg-gray-800 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-sm border border-red-100 dark:border-red-900/30"
                                                            title="Clarear Alarma Manualmente"
                                                        >
                                                            <Trash2 size={20} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="mt-8 p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-3xl border border-blue-100 dark:border-blue-900/30">
                                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold leading-relaxed flex items-center gap-3 italic">
                                        <Activity size={16} />
                                        EL SISTEMA SUPRIME NOTIFICACIONES REPETIDAS. SOLO SE NOTIFICARÁ EL INICIO Y EL RESTABLECIMIENTO (AUTO-CLEAR).
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* TELEGRAM MANAGEMENT ACCORDION */}
                        <div
                            onClick={() => setIsTgSectionOpen(!isTgSectionOpen)}
                            className="flex items-center justify-between mb-8 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 p-4 rounded-3xl transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`p-4 rounded-2xl transition-all ${isTgSectionOpen ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                                    <Smartphone size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">
                                        Gestión de Destinatarios Telegram
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                            {visibleChats.length} dispositivos detectados
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={(e) => { e.stopPropagation(); refetchChats(); }}
                                    className="p-3 bg-gray-50 dark:bg-gray-800 text-blue-600 rounded-2xl hover:rotate-180 transition-all duration-500 border border-gray-100 dark:border-gray-700"
                                    title="Refrescar Chats"
                                >
                                    <RefreshCcw size={20} className={loadingChats ? 'animate-spin' : ''} />
                                </button>
                                <div className={`transition-transform duration-500 ${isTgSectionOpen ? 'rotate-180' : ''}`}>
                                    <Zap size={24} className="text-gray-300" />
                                </div>
                            </div>
                        </div>

                        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden transition-all duration-700 ease-in-out ${isTgSectionOpen ? 'max-h-[2000px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                            {(() => {
                                if (visibleChats.length === 0) {
                                    return (
                                        <div className="md:col-span-2 px-6 py-16 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-[2.5rem] bg-gray-50/30 dark:bg-gray-800/20">
                                            <AlertCircle className="mx-auto text-gray-300 dark:text-gray-700 mb-4" size={48} />
                                            <p className="text-sm font-black text-gray-400 uppercase tracking-widest leading-relaxed">
                                                No se detectaron interacciones.<br />
                                                <span className="text-[10px] normal-case font-medium">Envía cualquier mensaje al Bot para que aparezcan aquí.</span>
                                            </p>
                                        </div>
                                    );
                                }

                                return visibleChats.map((chat: any) => {
                                    const dest = (destinationData || []).find((d: any) => String(d.chat_id) === String(chat.id));
                                    const isSelected = selectedChats.includes(String(chat.id));

                                    return (
                                        <div
                                            key={chat.id}
                                            className={`p-6 rounded-[2rem] border transition-all duration-500 group relative ${isSelected ? 'bg-blue-500/5 border-blue-500/40 shadow-xl' : 'bg-gray-50/50 dark:bg-gray-800/20 border-gray-100 dark:border-gray-800 hover:border-blue-400/50'}`}
                                        >
                                            {/* ACTION TOGGLES */}
                                            <div className="absolute top-6 right-6 z-10 flex gap-2">
                                                {/* BROADCAST TOGGLE */}
                                                <button
                                                    onClick={() => toggleChatSelection(String(chat.id))}
                                                    className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center shadow-lg border-2 ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 hover:border-blue-400'}`}
                                                    title={isSelected ? "Desactivar Broadcast" : "Activar Broadcast"}
                                                >
                                                    <Send size={18} className={isSelected ? 'animate-pulse' : ''} />
                                                </button>

                                                {/* COMMAND AUTH TOGGLE */}
                                                <button
                                                    onClick={() => toggleCanQuery(String(chat.id))}
                                                    className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center shadow-lg border-2 ${dest?.can_query ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 hover:border-emerald-400'}`}
                                                    title={dest?.can_query ? "Revocar Acceso a Comandos" : "Autorizar Comandos Bot"}
                                                >
                                                    <ShieldCheck size={18} />
                                                </button>
                                            </div>

                                            <div className="flex items-start gap-5 mb-5">
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-inner transition-all duration-500 ${isSelected ? 'bg-blue-600 text-white rotate-6 scale-110' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'}`}>
                                                    {(chat.title || chat.first_name || '?')[0].toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-xs font-black text-gray-900 dark:text-white mb-1 truncate group-hover:text-blue-600 transition-colors uppercase italic">
                                                        {dest?.alias || chat.title || `${chat.first_name || ''} ${chat.last_name || ''}`.trim()}
                                                    </h4>
                                                    <div className="flex flex-wrap gap-2 items-center">
                                                        <span className="px-2 py-0.5 bg-gray-200/50 dark:bg-gray-700/50 rounded-lg text-[8px] font-black text-gray-500 uppercase tracking-widest border border-gray-200/50">
                                                            {chat.type === 'private' ? 'Personal' : 'Grupo'}
                                                        </span>
                                                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[8px] font-black font-mono border transition-colors shadow-sm ${isSelected ? 'bg-blue-800 text-white border-blue-600' : 'bg-gray-950 text-gray-400 border-gray-800'}`}>
                                                            <Activity size={10} className={isSelected ? 'text-blue-300' : 'text-blue-500'} />
                                                            ID: {chat.id}
                                                        </div>
                                                        {isSelected && (
                                                            <span className="px-2 py-0.5 bg-blue-500 text-white rounded-lg text-[8px] font-black uppercase tracking-widest border border-blue-400">
                                                                📡 Broadcast
                                                            </span>
                                                        )}
                                                        {dest?.can_query && (
                                                            <span className="px-2 py-0.5 bg-emerald-500 text-white rounded-lg text-[8px] font-black uppercase tracking-widest border border-emerald-400">
                                                                🔐 Comandos
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* ALIAS INPUT */}
                                            <div className="mb-4 relative">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                                    <UserCircle size={14} />
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="Alias personalizado..."
                                                    defaultValue={dest?.alias || ''}
                                                    onBlur={(e) => updateAliasMutation.mutate({ chatId: String(chat.id), alias: e.target.value })}
                                                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-xl text-[10px] font-bold focus:border-blue-500 transition-all outline-none"
                                                />
                                            </div>

                                            <div className="grid grid-cols-3 gap-2">
                                                <button
                                                    onClick={() => copyToClipboard(chat.id)}
                                                    className="py-2.5 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-900 border border-transparent hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                                >
                                                    <Copy size={12} /> ID
                                                </button>
                                                <button
                                                    onClick={() => sendTestMutation.mutate(chat.id)}
                                                    className="py-2.5 bg-gray-50 dark:bg-gray-900/50 hover:bg-emerald-600 border border-transparent hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                                    title="Enviar Prueba"
                                                >
                                                    <Zap size={12} /> Test
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm('¿Ocultar este chat? Volverá a aparecer si el usuario escribe de nuevo.')) {
                                                            deleteChatDestinationMutation.mutate(String(chat.id));
                                                        }
                                                    }}
                                                    className="py-2.5 bg-gray-50 dark:bg-gray-900/50 hover:bg-red-600 border border-transparent hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                                    title="Ocultar"
                                                >
                                                    <Trash2 size={12} /> Hide
                                                </button>
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>

                        {/* DICCIONARIO DE ENLACES (ALIAS) */}
                        <div className="bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 p-10 shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                                <Database size={150} />
                            </div>

                            <div
                                onClick={() => setIsAliasesOpen(!isAliasesOpen)}
                                className="flex items-center justify-between mb-10 cursor-pointer group/header"
                            >
                                <div className="flex items-center gap-5">
                                    <div className={`p-4 rounded-2xl transition-all ${isAliasesOpen ? 'bg-emerald-600 text-white shadow-lg' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                                        <Database size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">
                                            Diccionario de Enlaces
                                        </h3>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Nombres amigables para seriales Padtec</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); syncAliasesMutation.mutate(); }}
                                        disabled={syncAliasesMutation.isLoading}
                                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-600 rounded-xl font-black text-[10px] tracking-widest uppercase hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50"
                                    >
                                        <RefreshCcw className={syncAliasesMutation.isLoading ? 'animate-spin' : ''} size={14} />
                                        {syncAliasesMutation.isLoading ? 'Sincronizando...' : 'Sincronizar'}
                                    </button>
                                    <div className={`transition-transform duration-500 ${isAliasesOpen ? 'rotate-180' : ''}`}>
                                        <Activity size={24} className="text-gray-300 group-hover/header:text-emerald-500 transition-colors" />
                                    </div>
                                </div>
                            </div>

                            <div className={`transition-all duration-700 ease-in-out overflow-hidden ${isAliasesOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>

                                <div className="flex flex-col md:flex-row gap-4 mb-8">
                                    <input
                                        type="text"
                                        placeholder="Serial (ej: 123456)"
                                        value={newSerial}
                                        onChange={(e) => setNewSerial(e.target.value)}
                                        className="flex-1 px-6 py-4 bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-blue-500 rounded-2xl text-sm font-bold"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Alias (ej: Link Caracas-Valencia)"
                                        value={newAlias}
                                        onChange={(e) => setNewAlias(e.target.value)}
                                        className="flex-1 px-6 py-4 bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-blue-500 rounded-2xl text-sm font-bold"
                                    />
                                    <button
                                        onClick={() => addAliasMutation.mutate({ serial: newSerial, alias: newAlias })}
                                        className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all"
                                    >
                                        Guardar
                                    </button>
                                </div>

                                <div className="max-h-[300px] overflow-y-auto pr-2 space-y-3">
                                    {aliases.map((a: any) => (
                                        <div key={a.serial} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                                            <div>
                                                <p className="text-xs font-black text-gray-900 dark:text-white uppercase">{a.alias}</p>
                                                <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Serial: {a.serial}</p>
                                            </div>
                                            <button
                                                onClick={() => deleteAliasMutation.mutate(a.serial)}
                                                className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    {aliases.length === 0 && (
                                        <p className="text-center py-10 text-xs text-gray-400 uppercase font-black tracking-widest italic border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-3xl">No hay alias definidos</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* GESTIÓN DE HARDWARE INHIBIDO */}
                        <div id="inhibition-manager" className="bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 p-10 shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                                <ShieldAlert size={150} />
                            </div>

                            <div className="mb-10">
                                <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">
                                    Gestión de Hardware Inhibido
                                </h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Equipos con alertas silenciadas permanentemente</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {(inhibitedSerials || []).map((inh: any) => (
                                    <div key={inh.serial1} className="p-6 bg-amber-50/30 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-3xl flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                                                <Smartphone size={24} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-gray-900 dark:text-white font-mono group-hover:text-amber-600 transition-colors uppercase tracking-widest">
                                                    {inh.serial1}
                                                </p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter italic">
                                                    Por: {inh.inhibited_by || 'Bot'}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeInhibitionMutation.mutate(inh.serial1)}
                                            className="p-3 bg-white dark:bg-gray-850 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm border border-red-100 dark:border-red-900/30"
                                            title="Reactivar Monitoreo"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                                {(inhibitedSerials || []).length === 0 && (
                                    <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-3xl">
                                        <ShieldCheck className="mx-auto text-emerald-400 mb-2 opacity-50" size={32} />
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">Todo el hardware está bajo monitoreo activo</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* CISCO SPAN CONFIGURATION SECTION */}
                        <div className="bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 p-10 shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                                <Activity size={150} />
                            </div>

                            <div
                                onClick={() => setIsCiscoSectionOpen(!isCiscoSectionOpen)}
                                className="flex items-center justify-between mb-10 cursor-pointer group/header"
                            >
                                <div className="flex items-center gap-5">
                                    <div className={`p-4 rounded-2xl transition-all ${isCiscoSectionOpen ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                                        <Database size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">
                                            Cisco Span Processor
                                        </h3>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Configuración del motor de análisis de fibra Cisco</p>
                                    </div>
                                </div>
                                <div className={`transition-transform duration-500 ${isCiscoSectionOpen ? 'rotate-180' : ''}`}>
                                    <Zap size={24} className="text-gray-300 group-hover/header:text-blue-500 transition-colors" />
                                </div>
                            </div>

                            <div className={`transition-all duration-700 ease-in-out overflow-hidden ${isCiscoSectionOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Telegram Token Cisco */}
                                    <div className="space-y-4">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Telegram Bot Token (Cisco)</label>
                                        <div className="relative">
                                            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" size={18} />
                                            <input
                                                type="password"
                                                value={tgTokenCisco}
                                                onChange={(e) => setTgTokenCisco(e.target.value)}
                                                onBlur={() => saveSettingMutation.mutate({ key: 'telegram_bot_token_cisco', value: tgTokenCisco })}
                                                className="w-full pl-12 pr-6 py-4 bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-blue-500 rounded-2xl text-[11px] font-bold outline-none transition-all"
                                                placeholder="Token del Bot para Cisco..."
                                            />
                                        </div>
                                    </div>

                                    {/* Telegram Chat ID Cisco */}
                                    <div className="space-y-4">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Destino de Alertas (Chat ID)</label>
                                        <div className="relative flex gap-2">
                                            <div className="relative flex-1">
                                                <Send className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" size={18} />
                                                <input
                                                    type="text"
                                                    value={tgChatIdCisco}
                                                    onChange={(e) => setTgChatIdCisco(e.target.value)}
                                                    onBlur={() => saveSettingMutation.mutate({ key: 'telegram_chat_id_cisco', value: tgChatIdCisco })}
                                                    className="w-full pl-12 pr-6 py-4 bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-blue-500 rounded-2xl text-[11px] font-bold outline-none transition-all"
                                                    placeholder="ID del Grupo o Usuario..."
                                                />
                                            </div>
                                            <button
                                                onClick={() => sendTestCiscoMutation.mutate()}
                                                disabled={!tgChatIdCisco || !tgTokenCisco}
                                                className="px-6 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all font-black text-[10px] uppercase tracking-widest disabled:opacity-30 flex items-center gap-2"
                                            >
                                                <Zap size={16} /> Test
                                            </button>
                                        </div>
                                    </div>

                                    {/* Muestras por Día Cisco */}
                                    <div className="space-y-4">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Frecuencia: Muestras por Día</label>
                                        <div className="relative">
                                            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" size={18} />
                                            <input
                                                type="number"
                                                value={spanSamplesPerDay}
                                                onChange={(e) => setSpanSamplesPerDay(e.target.value)}
                                                onBlur={() => saveSettingMutation.mutate({ key: 'span_samples_per_day', value: spanSamplesPerDay })}
                                                className="w-full pl-12 pr-6 py-4 bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-blue-500 rounded-2xl text-[11px] font-bold outline-none transition-all shadow-inner"
                                                placeholder="Ej: 4"
                                            />
                                            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white dark:bg-gray-900 px-3 py-1 rounded-lg">Muestras</span>
                                        </div>
                                        <p className="mt-2 text-[9px] text-gray-400 font-medium italic px-2">
                                            Ajusta esto según la programación del equipo Cisco. Se usa para calcular la <b>Vista Mensual</b> ({Number(spanSamplesPerDay || 4) * 30} muestras).
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-8 p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-3xl border border-dashed border-blue-200 dark:border-blue-900/30">
                                    <div className="flex items-center gap-4 text-blue-600 dark:text-blue-400">
                                        <Activity size={20} />
                                        <p className="text-[11px] font-medium leading-relaxed italic">
                                            Esta configuración es <b>independiente</b> de la red Padtec. Los comandos permitidos para este bot deben empezar con <code>/span_</code>.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CISCO ALIASES SECTION */}
                        <div className="bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 p-10 shadow-2xl relative overflow-hidden group">
                            <div
                                onClick={() => setIsSpanAliasesOpen(!isSpanAliasesOpen)}
                                className="flex items-center justify-between mb-10 cursor-pointer group/header"
                            >
                                <div className="flex items-center gap-5">
                                    <div className={`p-4 rounded-2xl transition-all ${isSpanAliasesOpen ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                                        <MapIcon size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">
                                            Diccionario de Aliases (Cisco)
                                        </h3>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Nombres personalizados para tramos de fibra</p>
                                    </div>
                                </div>
                                <div className={`transition-transform duration-500 ${isSpanAliasesOpen ? 'rotate-180' : ''}`}>
                                    <ChevronDown size={24} className="text-gray-300 group-hover/header:text-indigo-500 transition-colors" />
                                </div>
                            </div>

                            <div className={`transition-all duration-700 ease-in-out overflow-hidden ${isSpanAliasesOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-800/50 p-6 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Enlace Cisco (ID)</label>
                                            <select
                                                value={newSpanIdentifier}
                                                onChange={(e) => setNewSpanIdentifier(e.target.value)}
                                                className="w-full px-5 py-4 bg-white dark:bg-gray-900 border border-transparent focus:border-indigo-500 rounded-2xl text-[11px] font-bold outline-none shadow-sm"
                                            >
                                                <option value="">Seleccione un Enlace...</option>
                                                {(spanLinks || []).map((l: any) => (
                                                    <option key={l.link_identifier} value={l.link_identifier}>{l.link_identifier}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Nombre Amigable (Alias)</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={newSpanAlias}
                                                    onChange={(e) => setNewSpanAlias(e.target.value)}
                                                    placeholder="Ej: Maturín -> El Tigre"
                                                    className="flex-1 px-5 py-4 bg-white dark:bg-gray-900 border border-transparent focus:border-indigo-500 rounded-2xl text-[11px] font-bold outline-none shadow-sm"
                                                />
                                                <button
                                                    onClick={() => addSpanAliasMutation.mutate({ id: newSpanIdentifier, alias: newSpanAlias })}
                                                    disabled={!newSpanIdentifier || !newSpanAlias}
                                                    className="px-6 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all font-black text-[10px] uppercase tracking-widest disabled:opacity-30"
                                                >
                                                    <Plus size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                                        {(spanAliases || []).map((a: any) => (
                                            <div key={a.id} className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl border border-gray-100 dark:border-gray-800 group/item hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-600">
                                                        <MapIcon size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-black text-gray-800 dark:text-white uppercase tracking-tight">{a.alias}</p>
                                                        <p className="text-[9px] text-gray-400 font-bold font-mono">{a.link_identifier}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => removeSpanAliasMutation.mutate(a.id)}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all opacity-0 group-hover/item:opacity-100"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CISCO LINK THRESHOLDS SECTION */}
                        <div className="bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 p-10 shadow-2xl relative overflow-hidden group mt-10">
                            <div
                                onClick={() => setIsSpanLinksOpen(!isSpanLinksOpen)}
                                className="flex items-center justify-between mb-10 cursor-pointer group/header"
                            >
                                <div className="flex items-center gap-5">
                                    <div className={`p-4 rounded-2xl transition-all ${isSpanLinksOpen ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                                        <TrendingUp size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">
                                            Límites Operativos (Cisco)
                                        </h3>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Configurar umbrales Min/Max por tramo</p>
                                    </div>
                                </div>
                                <div className={`transition-transform duration-500 ${isSpanLinksOpen ? 'rotate-180' : ''}`}>
                                    <ChevronDown size={24} className="text-gray-300 group-hover/header:text-orange-500 transition-colors" />
                                </div>
                            </div>

                            <div className={`transition-all duration-700 ease-in-out overflow-hidden ${isSpanLinksOpen ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className="space-y-4">
                                    <div className="flex flex-col md:flex-row items-center gap-4 bg-orange-50/50 dark:bg-orange-900/10 p-5 rounded-3xl border border-dashed border-orange-200 dark:border-orange-900/30 mb-6">
                                        <div className="flex items-center gap-4 flex-1">
                                            <Info className="text-orange-600 shrink-0" size={20} />
                                            <p className="text-[10px] text-orange-700 dark:text-orange-400 font-medium italic">
                                                Define el rango de operación normal (dB) para cada enlace. Se utilizará para calcular el estado <b>CRÍTICO</b> y <b>PRECAUCIÓN</b> en Telegram y el Monitor.
                                            </p>
                                        </div>
                                        <div className="relative w-full md:w-64">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400" size={14} />
                                            <input
                                                type="text"
                                                placeholder="Buscar por tramo o nodo..."
                                                value={spanSearch}
                                                onChange={(e) => setSpanSearch(e.target.value)}
                                                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-950 border border-orange-100 dark:border-orange-900/30 rounded-2xl text-[10px] font-bold outline-none focus:border-orange-500 transition-all placeholder:text-gray-400"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        {(spanLinks || [])
                                            .filter((l: any) => {
                                                const searchStr = spanSearch.toLowerCase();
                                                return (l.alias || '').toLowerCase().includes(searchStr) ||
                                                    (l.link_identifier || '').toLowerCase().includes(searchStr);
                                            })
                                            .map((l: any) => (
                                                <LinkThresholdRow
                                                    key={l.link_identifier}
                                                    link={l}
                                                    onSave={(min, max) => updateSpanThresholdMutation.mutate({ id: l.link_identifier, min, max })}
                                                />
                                            ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* EMERGENCY DRILL (SIMULATION) ACCORDION */}
                        {session?.user?.rol === 'admin' && (
                            <div className="bg-white dark:bg-gray-950/50 rounded-[3rem] border border-gray-100 dark:border-gray-800 overflow-hidden transition-all shadow-2xl mt-10">
                                <button
                                    onClick={() => setIsCiscoSectionOpen(!isCiscoSectionOpen)}
                                    className="w-full flex items-center justify-between p-10 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-all text-left"
                                >
                                    <div className="flex items-center gap-5">
                                        <div className="p-4 bg-red-600 rounded-2xl text-white shadow-lg shadow-red-500/20">
                                            <ShieldAlert size={24} />
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">🚨 Centro de Simulacros</h4>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Validación de Alertas y Eventos (Telegram)</p>
                                        </div>
                                    </div>
                                    <div className={`transition-transform duration-500 ${isCiscoSectionOpen ? 'rotate-180' : ''}`}>
                                        <ChevronDown size={28} className="text-gray-300" />
                                    </div>
                                </button>

                                <div className={`p-10 pt-0 space-y-6 transition-all duration-700 overflow-hidden ${isCiscoSectionOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <p className="text-[11px] text-gray-400 font-medium leading-relaxed italic border-t border-gray-100 dark:border-gray-800 pt-8">
                                        Esta sección permite disparar eventos de prueba al canal de Telegram configurado para Cisco. Úselo para validar la conectividad antes de finalizar el despliegue.
                                    </p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={() => simulateMutation.mutate('critical')}
                                            className="py-4 bg-red-600/10 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all border border-red-600/20 shadow-sm"
                                        >
                                            🔥 Alerta Crítica (Test)
                                        </button>
                                        <button
                                            onClick={() => simulateMutation.mutate('recovery')}
                                            className="py-4 bg-emerald-600/10 text-emerald-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all border border-emerald-600/20 shadow-sm"
                                        >
                                            🟢 Recuperación (Test)
                                        </button>
                                        <button
                                            onClick={() => simulateMutation.mutate('maintenance')}
                                            className="py-4 bg-amber-600/10 text-amber-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 hover:text-white transition-all border border-amber-600/20 shadow-sm"
                                        >
                                            🛠️ Mantenimiento (Test)
                                        </button>
                                        <button
                                            onClick={() => simulateMutation.mutate('report')}
                                            className="py-4 bg-blue-600/10 text-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all border border-blue-600/20 shadow-sm"
                                        >
                                            📊 Reporte Salud (Test)
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* COLUMNA DERECHA: PARAMETERS */}
                    <div className="space-y-10">
                        <div className="bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 p-10 shadow-2xl relative overflow-hidden h-full">
                            <div
                                onClick={() => setIsNetEngineOpen(!isNetEngineOpen)}
                                className="flex items-center justify-between mb-10 cursor-pointer group/header"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-4 rounded-2xl transition-all ${isNetEngineOpen ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                                        <Activity size={24} />
                                    </div>
                                    <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">
                                        Motor de Red
                                    </h3>
                                </div>
                                <div className={`transition-transform duration-500 ${isNetEngineOpen ? 'rotate-180' : ''}`}>
                                    <Zap size={24} className="text-gray-300 group-hover/header:text-emerald-500 transition-colors" />
                                </div>
                            </div>

                            <div className={`transition-all duration-700 ease-in-out overflow-hidden ${isNetEngineOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>

                                <div className="space-y-8">
                                    <div className="relative group/field">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-2">Frecuencia de Escaneo</label>
                                        <div className="relative">
                                            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <select
                                                value={scanInterval}
                                                onChange={(e) => {
                                                    setScanInterval(e.target.value);
                                                    saveSettingMutation.mutate({ key: 'scan_interval', value: e.target.value });
                                                }}
                                                className="w-full pl-12 pr-6 py-4 bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-blue-500 focus:bg-white rounded-2xl text-sm font-black text-gray-700 dark:text-gray-300 outline-none transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="1">Cada 1 minuto (Tiempo Real)</option>
                                                <option value="5">Cada 5 minutos (Recomendado)</option>
                                                <option value="10">Cada 10 minutos (Optimizado)</option>
                                                <option value="30">Cada 30 minutos (Ahorro)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="relative group/field">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-2">Umbral Crítico de Pérdida</label>
                                        <div className="relative">
                                            <AlertTriangle className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={lossThreshold}
                                                onChange={(e) => setLossThreshold(e.target.value)}
                                                onBlur={() => saveSettingMutation.mutate({ key: 'loss_threshold', value: lossThreshold })}
                                                className="w-full pl-12 pr-6 py-4 bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-blue-500 focus:bg-white rounded-2xl text-sm font-black text-gray-700 dark:text-gray-300 outline-none transition-all shadow-inner"
                                            />
                                            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white dark:bg-gray-900 px-3 py-1 rounded-lg">dB</span>
                                        </div>
                                        <p className="mt-4 text-[11px] text-gray-400 font-medium leading-relaxed italic px-2">
                                            Se enviará una alerta a Telegram cuando la degradación sea superior a este valor (Alerta de Estado).
                                        </p>
                                    </div>

                                    <div className="relative group/field">
                                        <label className="block text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-3 ml-2">Smart Alert: Incremento Rápido</label>
                                        <div className="relative">
                                            <Zap className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400" size={18} />
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={rapidIncreaseThreshold}
                                                onChange={(e) => setRapidIncreaseThreshold(e.target.value)}
                                                onBlur={() => saveSettingMutation.mutate({ key: 'alert_rapid_increase_threshold', value: rapidIncreaseThreshold })}
                                                className="w-full pl-12 pr-6 py-4 bg-blue-50/30 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 focus:border-blue-500 rounded-2xl text-sm font-black text-blue-700 dark:text-blue-300 outline-none transition-all shadow-inner"
                                            />
                                            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-blue-400 uppercase tracking-widest bg-white dark:bg-gray-900 px-3 py-1 rounded-lg">dB</span>
                                        </div>
                                        <p className="mt-4 text-[11px] text-gray-400 font-medium leading-relaxed italic px-2">
                                            Detecta <b>micro-cortes o fluctuaciones súbitas</b>. Se dispara si la pérdida sube más de este valor en la ventana de confirmación.
                                        </p>
                                    </div>

                                    <div className="relative group/field">
                                        <label className="block text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mb-3 ml-2">Smart Alert: Degradación Acumulada</label>
                                        <div className="relative">
                                            <TrendingUp className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-400" size={18} />
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={driftThreshold}
                                                onChange={(e) => setDriftThreshold(e.target.value)}
                                                onBlur={() => saveSettingMutation.mutate({ key: 'alert_drift_threshold', value: driftThreshold })}
                                                className="w-full pl-12 pr-6 py-4 bg-amber-50/30 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 focus:border-amber-500 rounded-2xl text-sm font-black text-amber-700 dark:text-amber-300 outline-none transition-all shadow-inner"
                                            />
                                            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-amber-400 uppercase tracking-widest bg-white dark:bg-gray-900 px-3 py-1 rounded-lg">dB</span>
                                        </div>
                                        <p className="mt-4 text-[11px] text-gray-400 font-medium leading-relaxed italic px-2">
                                            Detecta <b>tendencias lentas</b> (12h). Se basa en el mínimo histórico del día. Un valor de 2.0dB es lo recomendado.
                                        </p>
                                    </div>

                                    <div className="relative group/field">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-2">Confirmación de Muestras</label>
                                        <div className="relative">
                                            <Database className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <select
                                                value={confirmationSamples}
                                                onChange={(e) => {
                                                    setConfirmationSamples(e.target.value);
                                                    saveSettingMutation.mutate({ key: 'alert_confirmation_samples', value: e.target.value });
                                                }}
                                                className="w-full pl-12 pr-6 py-4 bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-blue-500 focus:bg-white rounded-2xl text-sm font-black text-gray-700 dark:text-gray-300 outline-none transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="2">2 Muestras (Sensible)</option>
                                                <option value="3">3 Muestras (Equilibrado)</option>
                                                <option value="4">4 Muestras (Conservador)</option>
                                                <option value="5">5 Muestras (Alta Inmunidad a Ruido)</option>
                                            </select>
                                        </div>
                                        <p className="mt-3 text-[10px] text-gray-400 italic px-2">Evita falsas alarmas requiriendo que la falla se mantenga durante varios ciclos.</p>
                                    </div>

                                    <div className="relative group/field">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-2">Filtrado de Jitter (Antíoscialización)</label>
                                        <div className="relative">
                                            <Activity className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="range"
                                                min="0.3"
                                                max="1.5"
                                                step="0.1"
                                                value={jitterThreshold}
                                                onChange={(e) => setJitterThreshold(e.target.value)}
                                                onMouseUp={() => saveSettingMutation.mutate({ key: 'alert_jitter_threshold', value: jitterThreshold })}
                                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600 mt-6 mb-2"
                                            />
                                            <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">
                                                <span>0.3 dB</span>
                                                <span className="text-blue-600 dark:text-blue-400">Actual: {jitterThreshold} dB</span>
                                                <span>1.5 dB</span>
                                            </div>
                                        </div>
                                        <p className="mt-4 text-[11px] text-gray-400 font-medium leading-relaxed italic px-2">
                                            Ignora oscilaciones térmicas o ruidos de fondo menores a este valor para no saturar el canal de alertas.
                                        </p>
                                    </div>

                                    <div className="relative group/field">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-2">Encabezado de Alerta (Telegram)</label>
                                        <div className="relative">
                                            <Bell className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="text"
                                                value={tgHeader}
                                                onChange={(e) => setTgHeader(e.target.value)}
                                                onBlur={() => saveSettingMutation.mutate({ key: 'telegram_header', value: tgHeader })}
                                                className="w-full pl-12 pr-6 py-4 bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-blue-500 focus:bg-white rounded-2xl text-[11px] font-black text-gray-700 dark:text-gray-300 outline-none transition-all"
                                                placeholder="Ej: 🔴 ALERTA CRÍTICA"
                                            />
                                        </div>
                                    </div>

                                    <div className="relative group/field">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-2">Pie de Mensaje (Telegram)</label>
                                        <div className="relative">
                                            <Database className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="text"
                                                value={tgFooter}
                                                onChange={(e) => setTgFooter(e.target.value)}
                                                onBlur={() => saveSettingMutation.mutate({ key: 'telegram_footer', value: tgFooter })}
                                                className="w-full pl-12 pr-6 py-4 bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-blue-500 focus:bg-white rounded-2xl text-[11px] font-black text-gray-700 dark:text-gray-300 outline-none transition-all"
                                                placeholder="Ej: Revise el NOC nacional"
                                            />
                                        </div>
                                    </div>

                                    <div className="relative group/field">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-2">Intervalo de Refresco en Vivo</label>
                                        <div className="relative">
                                            <RefreshCcw className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <select
                                                value={uiRefresh}
                                                onChange={(e) => {
                                                    setUiRefresh(e.target.value);
                                                    saveSettingMutation.mutate({ key: 'ui_refresh_interval', value: e.target.value });
                                                }}
                                                className="w-full pl-12 pr-6 py-4 bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-blue-500 focus:bg-white rounded-2xl text-sm font-black text-gray-700 dark:text-gray-300 outline-none transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="60">Cada 1 minuto (Tiempo Real)</option>
                                                <option value="300">Cada 5 minutos (Ahorro API)</option>
                                            </select>
                                        </div>
                                        <p className="mt-3 text-[10px] text-gray-400 italic px-2">Controla qué tan rápido el motor consulta al NMS y qué tan rápido se actualiza el Dashboard.</p>
                                    </div>

                                    <div className="p-8 bg-gray-50 dark:bg-gray-800/50 rounded-[2.5rem] border border-gray-100 dark:border-gray-800">
                                        <div className="flex items-center justify-between mb-6">
                                            <div>
                                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">🛠️ Ventana de Mantenimiento</h4>
                                                <p className="text-[9px] text-gray-400 mt-1 italic">Silencia alertas recurrentes y añade prefijo interactivo</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const newVal = !maintenanceMode;
                                                    setMaintenanceMode(newVal);
                                                    saveSettingMutation.mutate({ key: 'maintenance_mode', value: String(newVal) });
                                                }}
                                                className={`relative w-14 h-7 rounded-full transition-all flex items-center px-1 ${maintenanceMode ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-700'}`}
                                            >
                                                <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-all ${maintenanceMode ? 'translate-x-7' : 'translate-x-0'}`} />
                                            </button>
                                        </div>

                                        {maintenanceMode && (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                                <label className="block text-[9px] font-bold text-gray-400 uppercase ml-2">Activo hasta:</label>
                                                <input
                                                    type="datetime-local"
                                                    value={maintenanceUntil}
                                                    onChange={(e) => setMaintenanceUntil(e.target.value)}
                                                    onBlur={() => saveSettingMutation.mutate({ key: 'maintenance_until', value: maintenanceUntil })}
                                                    className="w-full px-6 py-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl text-[11px] font-black outline-none focus:border-amber-500 transition-all"
                                                />
                                            </div>
                                        )}
                                    </div>


                                    {/* REPORT CONFIGURATION */}
                                    <div className="p-8 bg-gray-50 dark:bg-gray-800/50 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 space-y-6">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200 dark:border-gray-700 pb-3">📅 Reportes de Salud (Criticality)</h4>

                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase">Reporte Semanal</p>
                                            <button
                                                onClick={() => {
                                                    const newVal = !weeklyReport;
                                                    setWeeklyReport(newVal);
                                                    saveSettingMutation.mutate({ key: 'weekly_report_enabled', value: String(newVal) });
                                                }}
                                                className={`relative w-12 h-6 rounded-full transition-all flex items-center px-1 ${weeklyReport ? 'bg-blue-500' : 'bg-gray-300'}`}
                                            >
                                                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-all ${weeklyReport ? 'translate-x-6' : 'translate-x-0'}`} />
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase">Reporte Mensual</p>
                                            <button
                                                onClick={() => {
                                                    const newVal = !monthlyReport;
                                                    setMonthlyReport(newVal);
                                                    saveSettingMutation.mutate({ key: 'monthly_report_enabled', value: String(newVal) });
                                                }}
                                                className={`relative w-12 h-6 rounded-full transition-all flex items-center px-1 ${monthlyReport ? 'bg-indigo-500' : 'bg-gray-300'}`}
                                            >
                                                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-all ${monthlyReport ? 'translate-x-6' : 'translate-x-0'}`} />
                                            </button>
                                        </div>

                                        <div className="pt-2">
                                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Umbral de Criticidad (Exportación)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={reportCriticality}
                                                onChange={(e) => setReportCriticality(e.target.value)}
                                                onBlur={() => saveSettingMutation.mutate({ key: 'report_criticality_threshold', value: reportCriticality })}
                                                className="w-full px-6 py-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl text-[11px] font-black focus:border-blue-500 outline-none transition-all shadow-inner"
                                            />
                                        </div>
                                    </div>

                                    {/* SECCIÓN DE TELEGRAM MANAGER ELIMINADA POR REDUNDANCIA - TODO INTEGRADO ARRIBA */}


                                    {/* HIDDEN: Technical Note - See README for details */}

                                    {/* HIDDEN: Global Calibration - See README for usage
                                <div className="pt-8 mt-5 border-t border-gray-100 dark:border-gray-800">
                                    <button
                                        onClick={() => {
                                            if (confirm('🚨 ¿Desea resetear los niveles de referencia de TODA la red a los valores actuales? Esto detendrá todas las alarmas en curso.')) {
                                                calibrateAllMutation.mutate();
                                            }
                                        }}
                                        className="w-full py-4 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-600 dark:hover:bg-red-600 hover:text-white transition-all shadow-xl flex items-center justify-center gap-3"
                                    >
                                        <Database size={16} />
                                        Calibrar Referencias Globales
                                    </button>
                                </div>
                                */}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};


export default SystemSettings;
