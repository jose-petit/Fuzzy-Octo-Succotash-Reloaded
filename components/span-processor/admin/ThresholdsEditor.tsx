import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Save, ChevronLeft, Search, Database, AlertCircle, CheckCircle2 } from 'lucide-react';
import { SpanLink } from '../types';

interface Link {
    id: number;
    link_identifier: string;
    min_span: number;
    max_span: number;
}

const ThresholdsEditor: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [links, setLinks] = useState<Link[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<number | null>(null);
    const [successId, setSuccessId] = useState<number | null>(null);
    const [errorId, setErrorId] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const API_BASE = '/api/span-processor';

    useEffect(() => {
        fetchLinks();
    }, []);

    const fetchLinks = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/unique-spans`);
            const fetched = res.data?.data;
            setLinks(Array.isArray(fetched) ? fetched : []);
        } catch {
            setLinks([]);
        }
        setLoading(false);
    };

    const handleSave = async (id: number, min: number, max: number, link_identifier?: string) => {
        setSavingId(id);
        setErrorId(null);
        try {
            await axios.post(`${API_BASE}/update-threshold`, { link_identifier, min, max });
            setSuccessId(id);
            setTimeout(() => setSuccessId(null), 1500);
            // Actualizar el estado local sin refetch para mejor UX
            setLinks(prev => prev.map(l => l.id === id ? { ...l, min_span: min, max_span: max } : l));
        } catch {
            setErrorId(id);
            setTimeout(() => setErrorId(null), 2000);
        }
        setSavingId(null);
    };

    const filteredLinks = links.filter(l =>
        l.link_identifier.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 rounded-xl bg-accent/10 text-accent">
                            <Database size={20} />
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight uppercase italic">Configuración de Umbrales</h2>
                    </div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 italic">Define los límites operativos para alertas críticas y de advertencia.</p>
                </div>

                <button
                    onClick={onBack}
                    className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-black text-xs uppercase tracking-widest py-3 px-6 rounded-2xl transition-all active:scale-95 border border-gray-200 dark:border-gray-700 shadow-sm"
                >
                    <ChevronLeft size={16} />
                    Volver al Panel
                </button>
            </div>

            <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-[2.5rem] shadow-glass overflow-hidden">
                <div className="p-8 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
                    <div className="relative group max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-accent transition-colors">
                            <Search size={16} />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar enlace por nombre..."
                            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl pl-10 pr-4 py-3 text-sm text-gray-900 dark:text-white w-full focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all placeholder:text-gray-400 font-medium"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="p-20 text-center">
                        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-sm font-black text-gray-400 uppercase tracking-widest animate-pulse">Cargando Umbrales...</p>
                    </div>
                ) : filteredLinks.length === 0 ? (
                    <div className="p-20 text-center">
                        <div className="inline-flex p-6 rounded-3xl bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-700 mb-4">
                            <Database size={48} />
                        </div>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight italic uppercase">No se encontraron enlaces</h3>
                        <p className="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">Verifique que haya cargado al menos un archivo CSV.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 dark:bg-gray-800/20 border-b border-gray-100 dark:border-gray-800">
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Enlace DWDM</th>
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Mínimo (dB)</th>
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Máximo (dB)</th>
                                    <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {filteredLinks.map(link => (
                                    <tr key={link.id} className="group hover:bg-accent/5 transition-all duration-300">
                                        <td className="px-8 py-6">
                                            <span className="text-base font-black text-gray-900 dark:text-white tracking-tight leading-tight uppercase italic">{link.link_identifier}</span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <input
                                                id={`min-${link.id}`}
                                                type="number"
                                                step="0.1"
                                                className="bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-2 text-sm font-black text-gray-900 dark:text-white w-24 focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all shadow-sm"
                                                defaultValue={link.min_span}
                                                disabled={savingId === link.id}
                                            />
                                        </td>
                                        <td className="px-8 py-6">
                                            <input
                                                id={`max-${link.id}`}
                                                type="number"
                                                step="0.1"
                                                className="bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-2 text-sm font-black text-gray-900 dark:text-white w-24 focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all shadow-sm"
                                                defaultValue={link.max_span}
                                                disabled={savingId === link.id}
                                            />
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-3 translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                                                {savingId === link.id ? (
                                                    <div className="flex items-center gap-2 text-accent font-black text-[10px] uppercase tracking-widest animate-pulse p-2">
                                                        <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                                                        Guardando
                                                    </div>
                                                ) : successId === link.id ? (
                                                    <div className="flex items-center gap-2 text-status-success font-black text-[10px] uppercase tracking-widest p-2 bg-status-success/10 rounded-xl">
                                                        <CheckCircle2 size={16} />
                                                        Listo
                                                    </div>
                                                ) : errorId === link.id ? (
                                                    <div className="flex items-center gap-2 text-status-error font-black text-[10px] uppercase tracking-widest p-2 bg-status-error/10 rounded-xl">
                                                        <AlertCircle size={16} />
                                                        Error
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            const min = Number((document.getElementById(`min-${link.id}`) as HTMLInputElement)?.value ?? link.min_span);
                                                            const max = Number((document.getElementById(`max-${link.id}`) as HTMLInputElement)?.value ?? link.max_span);
                                                            handleSave(link.id, min, max, link.link_identifier);
                                                        }}
                                                        className="bg-gray-900 dark:bg-accent text-white hover:bg-black dark:hover:bg-accent-dark px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md active:scale-90 flex items-center gap-2"
                                                    >
                                                        <Save size={14} />
                                                        Guardar
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ThresholdsEditor;
