import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Layout } from 'components/Layout';
import { Tabs } from 'components/Tabs';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { useSession } from 'next-auth/react';

interface PerformanceRecord {
    bus: string;
    card: string;
    ne: string;
    serial: number;
    type1: string;
    value1: number;
    type2?: string;
    value2?: number;
    type3?: string;
    value3?: number;
    type4?: string;
    value4?: number;
    type5?: string;
    value5?: number;
    type6?: string;
    value6?: number;
    type7?: string;
    value7?: number;
    type8?: string;
    value8?: number;
    enlace?: string;
    [key: string]: any;
}

interface Enlace {
    id: string;
    name1: string;
    enlace1: string;
    name2: string;
    enlace2: string;
    umbral: number;
    raman1: number;
    raman2: number;
    loss_reference?: number;
    hoa_rx1?: number;
    hoa_rx2?: number;
    url: string;
}


// Componente de Display LCD para valores (Estilo Industrial - Seguro)
const LCDisplay = ({ value, unit, label, color = 'green' }: { value?: number, unit: string, label: string, color?: 'green' | 'red' | 'blue' | 'amber' | 'gray' }) => {
    const colorClasses = {
        green: 'text-emerald-400 bg-emerald-950 border-emerald-800 shadow-[0_0_10px_rgba(16,185,129,0.2)]',
        red: 'text-red-500 bg-red-950 border-red-800 shadow-[0_0_10px_rgba(239,68,68,0.2)]',
        blue: 'text-cyan-400 bg-cyan-950 border-cyan-800 shadow-[0_0_10px_rgba(34,211,238,0.2)]',
        amber: 'text-amber-400 bg-amber-950 border-amber-800 shadow-[0_0_10px_rgba(251,191,36,0.2)]',
        gray: 'text-gray-400 bg-gray-900 border-gray-700'
    };

    return (
        <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500 pl-1">{label}</span>
            <div className={`font-mono text-xl px-3 py-1.5 rounded border ${colorClasses[color]} flex justify-between items-baseline relative overflow-hidden`}>
                <span className="relative z-10 font-bold tracking-widest text-shadow-glow">
                    {value !== undefined ? value.toFixed(2) : '--.--'}
                </span>
                <span className="text-[10px] opacity-70 ml-2">{unit}</span>
                {/* Scanline simple */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_2px] pointer-events-none opacity-50"></div>
            </div>
        </div>
    );
};

export default function PerformancePage() {
    const router = useRouter();
    const { status } = useSession();
    const [registros, setRegistros] = useState<PerformanceRecord[]>([]);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [selectedRecord, setSelectedRecord] = useState<PerformanceRecord | null>(null);
    const [intervalMs, setIntervalMs] = useState(1800000);
    const [cardFilter, setCardFilter] = useState('EOA / HOA');
    const [prevRegistros, setPrevRegistros] = useState<PerformanceRecord[]>([]);

    const [perfBase, setPerfBase] = useState('/api/nms-proxy');

    useEffect(() => {
        if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_PERF_BACKEND_URL) {
            setPerfBase(process.env.NEXT_PUBLIC_PERF_BACKEND_URL);
        }
    }, []);

    const { data: enlaces = [], refetch: refetchEnlaces } = useQuery(['enlaces'], async () => {
        const { data } = await axios.get('/api/enlace');
        return data.enlaces || [];
    }, {
        refetchOnWindowFocus: true,
        staleTime: 5000,
    });

    useEffect(() => {
        fetch('/api/settings/interval').then(res => res.json()).then(data => {
            if (data.value && Number.isFinite(data.value)) setIntervalMs(data.value);
        }).catch(() => { });
    }, []);

    const getToken = async () => {
        try {
            const { data } = await axios.get('/api/performance');
            return data.token;
        } catch (e) {
            console.error("Auth Error", e);
            return null;
        }
    };

    const { data: token } = useQuery(['getToken'], getToken, {
        refetchOnWindowFocus: false,
        staleTime: 1000 * 60 * 60,
    });

    const getValueByType = (record: PerformanceRecord, keyword: string): number | undefined => {
        for (let i = 1; i <= 20; i++) {
            const type = record[`type${i}`];
            if (typeof type === 'string' && type.toLowerCase().includes(keyword.toLowerCase())) {
                return record[`value${i}`];
            }
        }
        return undefined;
    };

    // LOGICA: Prioridad a búsqueda por NOMBRE, falla a índice fijo si es necesario
    const getTemp = (r: PerformanceRecord) => {
        // 1. Board Temperature
        let t = getValueByType(r, 'Board Temperature');
        if (t !== undefined) return t;
        // 2. Generic Temperature
        t = getValueByType(r, 'Temperature');
        if (t !== undefined) return t;
        // 3. Fallback: value1 suele ser temperatura en muchas tarjetas
        return r.value1;
    };

    const getTxPower = (r: PerformanceRecord) => getValueByType(r, 'OUT Line') || getValueByType(r, 'Output Power') || r.value5;
    const getRxPower = (r: PerformanceRecord) => getValueByType(r, 'IN Line') || getValueByType(r, 'Input Power') || r.value3;

    const getTrend = (serial: number, currentVal?: number, typeKeyword: string = 'In Line') => {
        if (currentVal === undefined) return null;
        const prev = prevRegistros.find(r => String(r.serial) === String(serial));
        if (!prev) return null;

        let prevVal: number | undefined;
        if (typeKeyword === 'In Line') prevVal = getRxPower(prev);
        else if (typeKeyword === 'Out Line') prevVal = getTxPower(prev);
        else if (typeKeyword === 'Temp') prevVal = getTemp(prev);

        if (prevVal === undefined || Math.abs(currentVal - prevVal) < 0.01) return '→';
        return currentVal > prevVal ? '↑' : '↓';
    };

    const { data: aliases = [] } = useQuery(['link-aliases'], async () => {
        const { data } = await axios.get('/api/admin/aliases');
        return data.aliases || [];
    });

    const getAlias = (serial: number) => {
        const found = aliases.find((a: any) => String(a.serial) === String(serial));
        return found ? found.alias : null;
    };

    const { isFetching: isRefreshing, isLoading: isInitialLoading } = useQuery(
        ['getRegistros', perfBase],
        async () => {
            if (!perfBase) return;
            const { data } = await axios.get(`${perfBase}/api/performance/live`);
            const consolidated = data.records || [];

            setRegistros(current => {
                setPrevRegistros(current);
                return consolidated;
            });
            setLastUpdated(new Date());

            checkAlerts(consolidated, enlaces);
            return consolidated;
        },
        {
            refetchInterval: intervalMs,
            refetchOnWindowFocus: false,
            enabled: !!perfBase
        }
    );

    // Auto-persist is now handled globally by Navbar.js

    const convertRecordsToJSON = (records: any[], fields: any[]) => {
        return records.map(record => {
            const obj: any = {};
            fields.forEach((field, i) => {
                obj[field.name] = record[i];
            });
            return obj;
        }).filter(r =>
            r.card && (r.card.startsWith('OPS') || r.card.startsWith('FT-') || r.card.startsWith('EOA2') || r.card.startsWith('HOA2'))
        );
    };

    const makePivot = (rawRows: any[]) => {
        const groups = new Map<string, any>();
        rawRows.forEach((rec) => {
            const key = `${rec.bus}|${rec.ne}|${rec.serial}`;
            if (!groups.has(key)) {
                groups.set(key, { ...rec, entries: [] });
            }
            groups.get(key).entries.push(rec);
        });

        return Array.from(groups.values()).map((grp) => {
            const obj: any = {
                bus: grp.bus,
                card: grp.card,
                ne: grp.ne,
                serial: grp.serial,
            };
            grp.entries.forEach((e: any, i: number) => {
                obj[`type${i + 1}`] = e.type;
                obj[`value${i + 1}`] = e.value;
            });
            return obj as PerformanceRecord;
        });
    };

    const checkAlerts = (records: PerformanceRecord[], links: Enlace[]) => {
        links.forEach((link, idx) => {
            const sourceCard = records.find(r => String(r.serial) == String(link.enlace1));
            if (!sourceCard) return;
            const temp = getTemp(sourceCard);
            // Alert if temperature exceeds 55°C (Standard industrial safety)
            if (temp && temp >= 55) {
                toast.error(`⚠️ Temperatura crítica en ${link.name1}: ${temp.toFixed(2)}°C`, { id: `temp-${idx}`, duration: 5000 });
            }
        });
    };

    const filteredRegistros = registros.filter(r => {
        if (cardFilter === 'TODOS') return true;
        if (cardFilter === 'EOA / HOA') return r.card.includes('EOA') || r.card.includes('HOA');
        if (cardFilter === 'TMD / SPVL') return r.card.includes('TMD') || r.card.includes('TM800') || r.card.includes('SPVL');
        if (cardFilter === 'FAN') return r.card.includes('FAN') || r.card.includes('FT');
        return r.card.includes(cardFilter);
    });

    const uniqueBuses = Array.from(new Set(filteredRegistros.map(r => r.bus))).sort();
    const tabs = uniqueBuses.map(bus => ({
        label: bus,
        content: (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th className="px-6 py-3">Tarjeta</th>
                                <th className="px-6 py-3">Nodo</th>
                                <th className="px-6 py-3">Serial</th>
                                <th className="px-6 py-3 text-center">Temp (°C)</th>
                                <th className="px-6 py-3 text-right">Potencia Tx (dBm)</th>
                                <th className="px-6 py-3 text-right">Potencia Rx (dBm)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRegistros.filter(r => r.bus === bus).map((item, idx) => {
                                const temp = getTemp(item);
                                const tx = getTxPower(item);
                                const rx = getRxPower(item);
                                return (
                                    <tr
                                        key={item.serial}
                                        onClick={() => setSelectedRecord(item)}
                                        className="bg-white border-b hover:bg-blue-50 transition-colors group cursor-pointer"
                                        title="Click para ver detalles"
                                    >
                                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap flex items-center gap-2">
                                            <span className={`w-2.5 h-2.5 rounded-full shadow-sm ${temp && Math.abs(temp) > 50 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                                            <div className="flex flex-col">
                                                <span className="font-bold">{getAlias(item.serial) || item.card}</span>
                                                {getAlias(item.serial) && <span className="text-[10px] text-gray-400 italic">Padtec: {item.card}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">{item.ne}</td>
                                        <td className="px-6 py-4 font-mono text-xs text-gray-400 group-hover:text-gray-600">{item.serial}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-gray-50 border border-gray-100">
                                                <span className={`font-semibold ${temp && Math.abs(temp) > 50 ? 'text-red-600' : 'text-gray-700'}`}>
                                                    {temp?.toFixed(1) || '--'}
                                                </span>
                                                <span className="text-xs text-gray-400">°C</span>
                                                <span className="text-[10px] ml-1 opacity-50">{getTrend(item.serial, temp, 'Temp')}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {tx !== undefined ? (
                                                <div className="font-mono font-bold text-blue-600 flex items-center justify-end gap-1">
                                                    <span className="text-xs opacity-60">{getTrend(item.serial, tx, 'Out Line')}</span>
                                                    {tx.toFixed(2)} dBm
                                                </div>
                                            ) : <span className="text-gray-300">-</span>}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {rx !== undefined ? (
                                                <div className="font-mono font-bold text-emerald-600 flex items-center justify-end gap-1">
                                                    <span className="text-xs opacity-60">{getTrend(item.serial, rx, 'In Line')}</span>
                                                    {rx.toFixed(2)} dBm
                                                </div>
                                            ) : <span className="text-gray-300">-</span>}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        )
    }));

    if (status === 'loading') return (
        <Layout>
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500 font-mono text-sm uppercase tracking-widest">Iniciando Sesión...</p>
                </div>
            </div>
        </Layout>
    );

    if (status === 'unauthenticated') return null;

    return (
        <Layout>
            <div className="max-w-screen-2xl mx-auto px-4 py-8 animate-fade-in">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Monitor DWDM</h1>
                        <p className="text-sm text-gray-500 font-mono mt-1 uppercase tracking-wider">Sistema de Monitoreo de Señal en Tiempo Real</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex bg-gray-900/5 p-1 rounded-xl border border-gray-200 shadow-sm backdrop-blur-sm">
                            {['TODOS', 'EOA / HOA', 'TMD / SPVL', 'OPS', 'FAN'].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setCardFilter(f)}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${cardFilter === f
                                        ? 'bg-gray-800 text-cyan-400 shadow-lg scale-105 border border-cyan-500/30'
                                        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                                        }`}
                                >
                                    {f === 'FAN' ? 'FAN / FT' : f}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="p-2.5 bg-white border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all text-gray-600"
                            title="Recargar datos"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                        </button>
                    </div>
                </div>

                {/* Fix condition: show loading only on initial empty state if query is still working */}
                {(!registros.length && (isInitialLoading || isRefreshing)) ? (
                    <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-gray-300">
                        <div className="animate-pulse flex flex-col items-center">
                            <div className="h-10 w-10 bg-gray-200 rounded-full mb-4"></div>
                            <h3 className="text-lg font-medium text-gray-400">Cargando datos del sistema...</h3>
                        </div>
                    </div>
                ) : registros.length > 0 ? (
                    <Tabs tabs={tabs} />
                ) : (
                    <div className="text-center py-24 bg-white rounded-3xl border border-gray-100">
                        <p className="text-gray-500">No se encontraron registros activos en este momento.</p>
                    </div>
                )}

                {/* MODAL CON DISEÑO PREMIUM INDUSTRIAL RESTAURADO */}
                {selectedRecord && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur animate-fade-in" onClick={() => setSelectedRecord(null)}>
                        <div className="bg-gray-100 rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh] border border-gray-400" onClick={e => e.stopPropagation()}>

                            {/* Header estilo 'Device Panel' */}
                            <div className="px-6 py-4 bg-gradient-to-r from-gray-900 to-gray-800 text-white flex justify-between items-center shrink-0 border-b-4 border-gray-700 shadow-md">
                                <div>
                                    <h3 className="text-xl font-mono font-bold tracking-wider text-blue-100">{selectedRecord.ne}</h3>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-xs font-mono text-gray-400">SN: {selectedRecord.serial}</span>
                                        <span className="px-2 py-0.5 bg-gray-700 rounded text-[10px] font-bold uppercase tracking-widest text-gray-300">{selectedRecord.card}</span>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedRecord(null)} className="p-2 bg-gray-800 rounded-lg text-gray-400 hover:text-white border border-gray-600">✕</button>
                            </div>

                            <div className="p-6 overflow-y-auto flex-1 bg-gray-200">
                                {(() => {
                                    const link = enlaces.find(l => Number(l.enlace1) === Number(selectedRecord.serial) || Number(l.enlace2) === Number(selectedRecord.serial));
                                    const isNode1 = link ? Number(link.enlace1) === Number(selectedRecord.serial) : false;

                                    return (
                                        <>
                                            {/* 1. TOPOLOGÍA ACTIVA (Glass Panel) */}
                                            {link ? (() => {
                                                const localName = isNode1 ? link.name1 : link.name2;
                                                const remoteName = isNode1 ? link.name2 : link.name1;
                                                const remoteSerial = isNode1 ? link.enlace2 : link.enlace1;
                                                const localRole = selectedRecord.card.includes("HOA") ? "TX" : "RX";

                                                let remoteRecord = registros.find(r => String(r.serial) === String(remoteSerial) && (localRole === "TX" ? r.card.includes("EOA") : r.card.includes("HOA")));
                                                if (!remoteRecord) remoteRecord = registros.find(r => String(r.serial) === String(remoteSerial));

                                                const raman = isNode1 ? link.raman1 : link.raman2;
                                                const localTx = getTxPower(selectedRecord);
                                                const localRx = getRxPower(selectedRecord);
                                                const remoteTx = remoteRecord ? getTxPower(remoteRecord) : undefined;
                                                const remoteRx = remoteRecord ? getRxPower(remoteRecord) : undefined;
                                                const txVal = localRole === "TX" ? localTx : remoteTx;
                                                const rxVal = localRole === "TX" ? remoteRx : localRx;
                                                const spanLoss = (txVal !== undefined && rxVal !== undefined) ? (txVal - rxVal) : null;
                                                const totalLoss = spanLoss !== null ? (spanLoss - (raman || 0)) : null;

                                                const threshold = (link.loss_reference || 28) + (link.umbral || 3);
                                                const warningRange = threshold - 2;

                                                const linkStatusColor = totalLoss && totalLoss > threshold
                                                    ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]'
                                                    : (totalLoss && totalLoss > warningRange
                                                        ? 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.6)]'
                                                        : 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.6)]');

                                                return (
                                                    <div className="mb-8 p-6 bg-white rounded-xl shadow-sm border border-gray-300 relative overflow-hidden">
                                                        <div className="flex justify-between items-center relative z-10">
                                                            <div className="text-center group">
                                                                <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full border-2 border-gray-300 flex items-center justify-center shadow-inner mx-auto mb-2">
                                                                    <span className="text-2xl pt-1">🏢</span>
                                                                </div>
                                                                <p className="font-bold text-gray-800">{localName}</p>
                                                                <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded uppercase">{localRole}</span>
                                                            </div>

                                                            <div className="flex-1 px-8 relative flex flex-col items-center">
                                                                <div className="text-[10px] font-bold text-gray-400 mb-1 tracking-widest">FIBER SPAN</div>
                                                                <div className="h-2 bg-gray-200 w-full rounded-full relative overflow-hidden box-content border border-gray-300">
                                                                    <div className={`absolute inset-0 opacity-80 ${linkStatusColor} shadow-[0_0_10px_currentColor]`}></div>
                                                                </div>
                                                                <div className="mt-3 bg-gray-800 text-white px-4 py-1.5 rounded font-mono text-sm shadow-lg flex items-center gap-2">
                                                                    <span className="text-gray-400 text-xs">LOSS:</span>
                                                                    <span className="font-bold text-lg">{totalLoss ? totalLoss.toFixed(2) : '--'}</span>
                                                                    <span className="text-xs text-gray-500">dB</span>
                                                                </div>
                                                            </div>

                                                            <div className="text-center cursor-pointer hover:scale-105 transition-transform" onClick={() => remoteRecord && setSelectedRecord(remoteRecord)}>
                                                                <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center shadow-inner mx-auto mb-2 ${remoteRecord ? 'bg-gradient-to-br from-white to-gray-100 border-gray-300' : 'bg-gray-200 border-gray-300 opacity-50'}`}>
                                                                    <span className="text-2xl pt-1">🏭</span>
                                                                </div>
                                                                <p className="font-bold text-gray-800">{remoteName || 'Remoto'}</p>
                                                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase ${remoteRecord ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{remoteRecord ? 'ONLINE' : 'OFFLINE'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })() : (
                                                <div className="mb-8 p-4 bg-amber-50 rounded-lg border border-amber-200 text-amber-700 text-xs italic">
                                                    No se encontró información de enlace (Topología) para esta tarjeta en la base de datos.
                                                </div>
                                            )}

                                            {/* 2. PANEL DE INSTRUMENTOS (SCHEMATIC) */}
                                            <div className="bg-gray-300 rounded-xl p-6 shadow-inner border border-gray-400">
                                                <div className="flex justify-between mb-6 pb-2 border-b border-gray-400/50 items-center">
                                                    <h4 className="font-bold text-gray-700 uppercase tracking-widest text-shadow-sm flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.6)] animate-pulse"></div>
                                                        Monitor de Señal
                                                    </h4>
                                                    <div className="flex gap-2">
                                                        <LCDisplay label="Board Temp" value={getTemp(selectedRecord)} unit="°C" color="amber" />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    {/* Rx Stage Panel - ETAPA 1 */}
                                                    <div className="bg-gray-200 rounded-lg p-5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] border border-gray-100">
                                                        <div className="flex items-center gap-2 mb-4">
                                                            <div className="w-2 h-8 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.5)]"></div>
                                                            <h5 className="font-bold text-gray-600 uppercase tracking-wide text-sm">Input Stage (Rx) - Etapa 1</h5>
                                                        </div>

                                                        <div className="space-y-4">
                                                            {/* Señales principales Rx */}
                                                            {(() => {
                                                                const inLineVal = getValueByType(selectedRecord, 'IN Line');
                                                                const outDataVal = getValueByType(selectedRecord, 'OUT Data');
                                                                return (
                                                                    <>
                                                                        {inLineVal !== undefined ? (
                                                                            <LCDisplay label="IN Line (Optical)" value={inLineVal} unit="dBm" color="blue" />
                                                                        ) : (
                                                                            <div className="text-xs text-gray-400 italic">No Optical Input Detected</div>
                                                                        )}
                                                                        {selectedRecord.card.includes('HOA') && outDataVal !== undefined && (
                                                                            <LCDisplay label="OUT Data" value={outDataVal} unit="dBm" color="blue" />
                                                                        )}
                                                                    </>
                                                                );
                                                            })()}

                                                            {/* RAMAN / EDFA CALC UI (Etapa 1) */}
                                                            {(() => {
                                                                if (!selectedRecord.card.includes('HOA')) return null;

                                                                const configuredHoaRx = link ? (isNode1 ? link.hoa_rx1 : link.hoa_rx2) : undefined;
                                                                const ramanSignal = getValueByType(selectedRecord, 'Amplificador 1 (Raman)') || getValueByType(selectedRecord, 'Raman Gain');
                                                                const hoaRxSignal = getValueByType(selectedRecord, 'HOA Rx') || getValueByType(selectedRecord, 'Total Gain');
                                                                const edfaGainMedida = getValueByType(selectedRecord, 'EDFA Gain') || getValueByType(selectedRecord, 'Amplificador 1 (EDFA)');
                                                                const ramanOffsetSignal = getValueByType(selectedRecord, 'Offset de Ganancia Raman') || getValueByType(selectedRecord, 'Raman Offset');

                                                                const inLineEdfa = getValueByType(selectedRecord, 'IN Line (EDFA)') || getValueByType(selectedRecord, 'IN Line') || -99;
                                                                const outData = getValueByType(selectedRecord, 'OUT Data') || 0;
                                                                const inLine = getValueByType(selectedRecord, 'IN Line') || -99;

                                                                let ramanGain = 0;
                                                                let displayHoaRxSource = "NMS";
                                                                let displayHoaRxValue = 0;
                                                                let displayEdfaGain = 0;
                                                                let displayEdfaSource = "NMS";

                                                                if (configuredHoaRx && configuredHoaRx > 0) {
                                                                    displayHoaRxValue = configuredHoaRx;
                                                                    displayHoaRxSource = "Config";
                                                                } else if (hoaRxSignal !== undefined) {
                                                                    displayHoaRxValue = hoaRxSignal;
                                                                    displayHoaRxSource = "NMS";
                                                                } else {
                                                                    displayHoaRxValue = outData - inLine;
                                                                    displayHoaRxSource = "Calc";
                                                                }

                                                                if (edfaGainMedida !== undefined) {
                                                                    displayEdfaGain = edfaGainMedida;
                                                                    displayEdfaSource = "NMS";
                                                                } else {
                                                                    displayEdfaGain = outData - inLineEdfa;
                                                                    displayEdfaSource = "Calc";
                                                                }

                                                                ramanGain = ramanSignal !== undefined ? ramanSignal : (displayHoaRxValue - displayEdfaGain);
                                                                if (ramanGain < 0) ramanGain = 0;

                                                                return (
                                                                    <div className="mt-4 pt-4 border-t border-gray-300">
                                                                        <div className="bg-gray-800 rounded p-4 text-cyan-400 font-mono text-[13px] shadow-inner border border-gray-700">
                                                                            <div className="flex justify-between mb-1.5 opacity-80 items-center">
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <span>HOA Rx ({displayHoaRxSource}):</span>
                                                                                    {link && (
                                                                                        <button
                                                                                            onClick={() => router.push(`/admin/enlaces?filter=${encodeURIComponent(link.name1)}`)}
                                                                                            className="hover:text-white transition-colors cursor-pointer p-0.5 bg-gray-700 rounded hover:bg-blue-600 shadow-sm"
                                                                                            title="Editar Calibración en Admin"
                                                                                        >
                                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                                <span className="font-bold">{displayHoaRxValue.toFixed(2)} dB</span>
                                                                            </div>
                                                                            <div className="flex justify-between mb-1.5 opacity-80">
                                                                                <span>EDFA Gain ({displayEdfaSource}):</span>
                                                                                <span>{displayEdfaGain.toFixed(2)} dB</span>
                                                                            </div>
                                                                            <div className="flex justify-between mb-1.5 opacity-80">
                                                                                <span>Raman Gain:</span>
                                                                                <span>{ramanGain.toFixed(2)} dB</span>
                                                                            </div>
                                                                            {ramanOffsetSignal !== undefined && (
                                                                                <div className="flex justify-between mb-2 opacity-80">
                                                                                    <span>Offset Raman:</span>
                                                                                    <span>{ramanOffsetSignal.toFixed(2)} dB</span>
                                                                                </div>
                                                                            )}
                                                                            <div className="h-px bg-gray-600 mb-2"></div>
                                                                            <div className="flex justify-between text-base text-yellow-400 font-bold text-shadow-glow">
                                                                                <span className="flex items-center gap-1">
                                                                                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse"></span>
                                                                                    RAMAN NET:
                                                                                </span>
                                                                                <span>{ramanGain.toFixed(2)} dB</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}

                                                            {/* EOA CALC UI (Doble Etapa) */}
                                                            {(() => {
                                                                if (!selectedRecord.card.includes('EOA')) return null;

                                                                const in1 = getValueByType(selectedRecord, 'IN Line - Etapa 1') || getValueByType(selectedRecord, 'IN Line');
                                                                const out1 = getValueByType(selectedRecord, 'OUT Data - Etapa 1') || getValueByType(selectedRecord, 'OUT Data');
                                                                const in2 = getValueByType(selectedRecord, 'IN Data - Etapa 2') || getValueByType(selectedRecord, 'IN Data');
                                                                const out2 = getValueByType(selectedRecord, 'OUT Line - Etapa 2') || getValueByType(selectedRecord, 'OUT Line');

                                                                const gain1 = (out1 !== undefined && in1 !== undefined) ? out1 - in1 : null;
                                                                const gain2 = (out2 !== undefined && in2 !== undefined) ? out2 - in2 : null;

                                                                return (
                                                                    <div className="mt-4 pt-4 border-t border-gray-300 space-y-3">
                                                                        {gain1 !== null && (
                                                                            <div className="bg-gray-800 rounded p-3 text-emerald-400 font-mono text-xs shadow-inner border border-gray-700">
                                                                                <div className="text-[9px] uppercase text-gray-400 mb-1 tracking-tighter">Etapa 1 (Pre-Amp)</div>
                                                                                <div className="flex justify-between items-center">
                                                                                    <span>GANANCIA:</span>
                                                                                    <span className="text-sm font-bold">{gain1.toFixed(2)} dB</span>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                        {gain2 !== null && (
                                                                            <div className="bg-gray-800 rounded p-3 text-cyan-400 font-mono text-xs shadow-inner border border-gray-700">
                                                                                <div className="text-[9px] uppercase text-gray-400 mb-1 tracking-tighter">Etapa 2 (Booster)</div>
                                                                                <div className="flex justify-between items-center">
                                                                                    <span>GANANCIA:</span>
                                                                                    <span className="text-sm font-bold">{gain2.toFixed(2)} dB</span>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>

                                                    {/* Tx Stage Panel - ETAPA 2 */}
                                                    <div className="bg-gray-200 rounded-lg p-5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] border border-gray-100">
                                                        <div className="flex items-center gap-2 mb-4">
                                                            <div className="w-2 h-8 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                                            <h5 className="font-bold text-gray-600 uppercase tracking-wide text-sm">Output Stage (Tx) - Etapa 2</h5>
                                                        </div>
                                                        <div className="space-y-4">
                                                            {(() => {
                                                                const outLineVal = getValueByType(selectedRecord, 'OUT Line');
                                                                const inDataVal = getValueByType(selectedRecord, 'IN Data');
                                                                return (
                                                                    <>
                                                                        {inDataVal !== undefined && (
                                                                            <LCDisplay label="IN Data" value={inDataVal} unit="dBm" color="green" />
                                                                        )}
                                                                        {outLineVal !== undefined ? (
                                                                            <LCDisplay label="OUT Line (Optical)" value={outLineVal} unit="dBm" color="green" />
                                                                        ) : (
                                                                            <div className="text-xs text-gray-400 italic">No Optical Output Detected</div>
                                                                        )}
                                                                    </>
                                                                );
                                                            })()}

                                                            {/* EDFA Tx Gain (Etapa 2) */}
                                                            {(() => {
                                                                if (!selectedRecord.card.includes('HOA')) return null;

                                                                const outLine = getValueByType(selectedRecord, 'OUT Line');
                                                                const inData = getValueByType(selectedRecord, 'IN Data');
                                                                const edfaTxSignal = getValueByType(selectedRecord, 'Amplificador 2 (EDFA Tx)') || getValueByType(selectedRecord, 'EDFA Tx Gain');

                                                                let displayEdfaTx = 0;
                                                                let displayEdfaTxSource = "NMS";

                                                                if (edfaTxSignal !== undefined) {
                                                                    displayEdfaTx = edfaTxSignal;
                                                                    displayEdfaTxSource = "NMS";
                                                                } else if (outLine !== undefined && inData !== undefined) {
                                                                    displayEdfaTx = outLine - inData;
                                                                    displayEdfaTxSource = "Calc";
                                                                } else {
                                                                    return null;
                                                                }

                                                                return (
                                                                    <div className="mt-4 pt-4 border-t border-gray-300">
                                                                        <div className="bg-gray-800 rounded p-4 text-emerald-400 font-mono text-[13px] shadow-inner border border-gray-700">
                                                                            <div className="flex justify-between items-center mb-2 opacity-80">
                                                                                <span>EDFA Tx Gain ({displayEdfaTxSource}):</span>
                                                                                <span className="font-bold text-base">{displayEdfaTx.toFixed(2)} dB</span>
                                                                            </div>
                                                                            <div className="h-px bg-gray-600 mb-2"></div>
                                                                            <div className="text-xs text-gray-400 italic">Etapa 2 - Booster Stage</div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>

                                                        {/* Debug Raw signals simple list */}
                                                        <div className="mt-8 pt-4 border-t border-gray-300 opacity-80">
                                                            <details className="group cursor-pointer">
                                                                <summary className="text-[10px] uppercase font-bold text-gray-500 mb-2 hover:text-blue-600 transition-colors list-none flex items-center gap-1">
                                                                    <span className="group-open:rotate-90 transition-transform">▶</span> Show Raw Signals (Debug)
                                                                </summary>
                                                                <div className="max-h-40 overflow-y-auto pr-2 grid grid-cols-2 gap-2 text-[10px] font-mono text-gray-600 bg-gray-50 p-2 rounded border border-gray-200 shadow-inner">
                                                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(i => {
                                                                        const t = selectedRecord[`type${i}`];
                                                                        const v = selectedRecord[`value${i}`];
                                                                        if (!t || v === undefined || v === null) return null;
                                                                        return <div key={i} className="flex justify-between bg-white px-2 py-1 rounded shadow-sm border border-gray-200"><span>{t.substring(0, 18)}</span><span className="font-bold">{v.toFixed ? v.toFixed(2) : v}</span></div>
                                                                    })}
                                                                </div>
                                                            </details>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
