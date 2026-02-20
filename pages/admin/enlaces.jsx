import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from 'components/Layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Edit2, Trash2, Plus, Search, Link as LinkIcon } from 'lucide-react';

const EnlacesCompactPage = () => {
    const qc = useQueryClient();
    const [filter, setFilter] = useState('');
    const [selectedEnlace, setSelectedEnlace] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const { data: enlaces = [], isFetching } = useQuery(
        ['enlaces'],
        async () => {
            const res = await fetch('/api/enlace', { cache: 'no-store' });
            const json = await res.json();
            return json.enlaces || [];
        },
        { refetchOnWindowFocus: false, staleTime: 0 }
    );

    const syncMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/enlace?sync=true');
            if (!res.ok) throw new Error('Sync failed');
            return res.json();
        },
        onSuccess: () => qc.invalidateQueries(['enlaces']),
    });

    const updateMutation = useMutation({
        mutationFn: async (enlace) => {
            const payload = {
                id: enlace.id,
                enlace: {
                    name1: enlace.name1,
                    enlace1: Number(enlace.enlace1),
                    name2: enlace.name2,
                    enlace2: enlace.enlace2 !== '' ? Number(enlace.enlace2) : '',
                    umbral: Number(enlace.umbral),
                    raman1: Number(enlace.raman1) || 0,
                    raman2: Number(enlace.raman2) || 0,
                    hoa_rx1: Number(enlace.hoa_rx1) || 0,
                    hoa_rx2: Number(enlace.hoa_rx2) || 0,
                    line_initial1: Number(enlace.line_initial1) || 0,
                    loss_reference: Number(enlace.loss_reference) || 0,
                    isSingle: !!enlace.isSingle,
                },
            };
            const res = await fetch('/api/enlace', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error('Update failed');
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries(['enlaces']);
            setShowModal(false);
            setSelectedEnlace(null);
        },
    });

    const addMutation = useMutation({
        mutationFn: async (enlace) => {
            const res = await fetch('/api/enlace', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enlace }),
            });
            if (!res.ok) throw new Error('Add failed');
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries(['enlaces']);
            setShowModal(false);
            setIsCreating(false);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const res = await fetch('/api/enlace', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            if (!res.ok) throw new Error('Delete failed');
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries(['enlaces']);
            setShowModal(false);
            setSelectedEnlace(null);
        },
    });

    const filtered = useMemo(() => {
        if (!filter) return enlaces;
        const f = filter.toLowerCase();
        return enlaces.filter(
            (e) =>
                String(e.enlace1).includes(f) ||
                String(e.enlace2 || '').includes(f) ||
                (e.name1 || '').toLowerCase().includes(f) ||
                (e.name2 || '').toLowerCase().includes(f)
        );
    }, [enlaces, filter]);

    const openEditModal = (enlace) => {
        setSelectedEnlace(enlace);
        setIsCreating(false);
        setShowModal(true);
    };

    const openCreateModal = () => {
        setSelectedEnlace(null);
        setIsCreating(true);
        setShowModal(true);
    };

    return (
        <Layout>
            <div className="max-w-[1600px] mx-auto px-4 py-8 animate-fade-in">
                {/* HEADER */}
                <div className="flex flex-col md:flex-row items-center justify-between mb-8 pb-6 border-b border-gray-200 gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tighter flex items-center gap-4 italic uppercase">
                            <span className="bg-blue-600 text-white px-3 py-1 rounded-lg shadow-lg not-italic">ADM</span>
                            Gestión de Enlaces
                        </h1>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em]">
                                Topology Management Console v4.0
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <input
                                className="pl-11 pr-4 py-2.5 rounded-xl bg-white text-gray-900 border border-gray-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all w-80 text-sm font-bold placeholder:text-gray-300 shadow-sm"
                                placeholder="BUSCAR ENLACE / SERIAL..."
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                            />
                            <Search className="absolute left-4 top-3 text-gray-400" size={18} strokeWidth={3} />
                        </div>

                        <button
                            className={`px-6 py-2.5 rounded-xl font-black text-[10px] tracking-[0.2em] uppercase transition-all flex items-center gap-3 shadow-sm border ${syncMutation.isLoading
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                                : 'bg-gray-900 text-cyan-400 hover:bg-black hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] active:scale-95 border-gray-800'
                                }`}
                            onClick={() => syncMutation.mutate()}
                            disabled={syncMutation.isLoading}
                        >
                            <span className={`text-lg ${syncMutation.isLoading ? 'animate-spin' : ''}`}>
                                {syncMutation.isLoading ? '⚙️' : '📡'}
                            </span>
                            {syncMutation.isLoading ? 'Syncing...' : 'Sync Cloud'}
                        </button>

                        <button
                            onClick={openCreateModal}
                            className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-black text-[10px] tracking-[0.2em] uppercase hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2 border-b-4 border-blue-900"
                        >
                            <Plus size={16} strokeWidth={3} />
                            Nuevo Enlace
                        </button>
                    </div>
                </div>

                {/* STATS */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <StatCard label="Total Enlaces" value={enlaces.length} color="blue" icon="🔗" />
                    <StatCard label="Enlaces Duales" value={enlaces.filter(e => !e.isSingle).length} color="emerald" icon="⟷" />
                    <StatCard label="Standalone" value={enlaces.filter(e => e.isSingle).length} color="amber" icon="●" />
                    <StatCard label="Filtrados" value={filtered.length} color="gray" icon="🔍" />
                </div>

                {/* TABLE */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Tipo</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Origen</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Serial A</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Destino</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Serial B</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Pérdida Ref.</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Umbral</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filtered.map((item) => (
                                    <tr
                                        key={item.id}
                                        className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                                        onClick={() => openEditModal(item)}
                                    >
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${item.isSingle
                                                ? 'bg-amber-100 text-amber-700'
                                                : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {item.isSingle ? '● Single' : '⟷ Dual'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-sm text-gray-900">{item.name1 || '-'}</td>
                                        <td className="px-6 py-4 font-mono text-xs text-blue-600 font-bold">{item.enlace1}</td>
                                        <td className="px-6 py-4 font-bold text-sm text-gray-900">{item.isSingle ? '-' : (item.name2 || '-')}</td>
                                        <td className="px-6 py-4 font-mono text-xs text-emerald-600 font-bold">{item.isSingle ? '-' : (item.enlace2 || '-')}</td>
                                        <td className="px-6 py-4 font-mono text-xs text-gray-700 font-bold">{item.loss_reference || 0} dB</td>
                                        <td className="px-6 py-4 font-mono text-xs text-red-600 font-bold">{item.umbral || 0} dB</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openEditModal(item);
                                                    }}
                                                    className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 size={14} strokeWidth={2.5} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (confirm('¿Eliminar este enlace permanentemente?')) {
                                                            deleteMutation.mutate(item.id);
                                                        }
                                                    }}
                                                    className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={14} strokeWidth={2.5} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filtered.length === 0 && (
                        <div className="text-center py-16 bg-gray-50">
                            <LinkIcon className="mx-auto mb-4 text-gray-300" size={48} strokeWidth={1.5} />
                            <p className="text-gray-400 font-medium">No se encontraron enlaces coincidentes.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL */}
            {showModal && (
                <EnlaceModal
                    enlace={selectedEnlace}
                    isCreating={isCreating}
                    onClose={() => {
                        setShowModal(false);
                        setSelectedEnlace(null);
                        setIsCreating(false);
                    }}
                    onSubmit={(data) => {
                        if (isCreating) {
                            addMutation.mutate(data);
                        } else {
                            updateMutation.mutate({ ...data, id: selectedEnlace.id });
                        }
                    }}
                    onDelete={() => {
                        if (confirm('¿Eliminar este enlace permanentemente?')) {
                            deleteMutation.mutate(selectedEnlace.id);
                        }
                    }}
                    isLoading={updateMutation.isLoading || addMutation.isLoading}
                />
            )}
        </Layout>
    );
};

const StatCard = ({ label, value, color, icon }) => {
    const colorMap = {
        blue: 'bg-blue-50 border-blue-200 text-blue-600',
        emerald: 'bg-emerald-50 border-emerald-200 text-emerald-600',
        amber: 'bg-amber-50 border-amber-200 text-amber-600',
        gray: 'bg-gray-50 border-gray-200 text-gray-600',
    };

    return (
        <div className={`p-4 rounded-xl border ${colorMap[color]} shadow-sm`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</p>
                    <p className="text-2xl font-black mt-1">{value}</p>
                </div>
                <span className="text-3xl opacity-20">{icon}</span>
            </div>
        </div>
    );
};

const EnlaceModal = ({ enlace, isCreating, onClose, onSubmit, onDelete, isLoading }) => {
    const [form, setForm] = useState({
        name1: enlace?.name1 || '',
        enlace1: enlace?.enlace1 || '',
        name2: enlace?.name2 || '',
        enlace2: enlace?.enlace2 ?? '',
        umbral: enlace?.umbral ?? 3.0,
        raman1: enlace?.raman1 ?? 0,
        raman2: enlace?.raman2 ?? 0,
        hoa_rx1: enlace?.hoa_rx1 ?? 0,
        hoa_rx2: enlace?.hoa_rx2 ?? 0,
        line_initial1: enlace?.line_initial1 ?? 0,
        loss_reference: enlace?.loss_reference ?? 0,
        isSingle: !!enlace?.isSingle,
    });

    const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* MODAL HEADER */}
                <div className="sticky top-0 bg-white border-b border-gray-100 px-8 py-6 flex items-center justify-between z-10">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">
                            {isCreating ? 'Nuevo Enlace' : 'Editar Enlace'}
                        </h2>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">
                            {isCreating ? 'Configuración Inicial' : `ID: ${enlace?.id}`}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                        <X size={24} strokeWidth={2.5} className="text-gray-400" />
                    </button>
                </div>

                {/* MODAL BODY */}
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        onSubmit(form);
                    }}
                    className="p-8"
                >
                    <div className={`grid grid-cols-1 ${form.isSingle ? '' : 'lg:grid-cols-2'} gap-8`}>
                        {/* NODE A */}
                        <div className="space-y-4 p-6 bg-blue-50/50 rounded-2xl border border-blue-100">
                            <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] mb-4 border-l-4 border-blue-500 pl-3">
                                {form.isSingle ? 'Device Parameters' : 'Source - Node A'}
                            </h3>
                            <TextInput label="Identificador Nodo" value={form.name1} onChange={(v) => set('name1', v)} placeholder="Ej: CARACAS" />
                            <NumberInput label="Serial Tarjeta (NMS)" value={form.enlace1} onChange={(v) => set('enlace1', v)} required placeholder="100XXX" />
                            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-blue-200/50">
                                <NumberInput label="Raman Calib." value={form.raman1} onChange={(v) => set('raman1', v)} />
                                <NumberInput label="HOA Rx Calib." value={form.hoa_rx1} onChange={(v) => set('hoa_rx1', v)} />
                            </div>
                        </div>

                        {/* NODE B */}
                        {!form.isSingle && (
                            <div className="space-y-4 p-6 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                                <h3 className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em] mb-4 border-r-4 border-emerald-500 pr-3 text-right">
                                    Destination - Node B
                                </h3>
                                <TextInput label="Identificador Nodo" value={form.name2} onChange={(v) => set('name2', v)} placeholder="Ej: VALENCIA" />
                                <NumberInput label="Serial Tarjeta (NMS)" value={form.enlace2} onChange={(v) => set('enlace2', v)} placeholder="100XXX" />
                                <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-emerald-200/50">
                                    <NumberInput label="Raman Calib." value={form.raman2} onChange={(v) => set('raman2', v)} />
                                    <NumberInput label="HOA Rx Calib." value={form.hoa_rx2} onChange={(v) => set('hoa_rx2', v)} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* THRESHOLD CONFIG */}
                    <div className="mt-8 p-6 bg-gray-50 rounded-2xl border border-gray-200">
                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <span className="w-1 h-4 bg-red-500 rounded-full"></span>
                            Configuración de Inteligencia de Red
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <NumberInput label="Pérdida Ref. (dB)" value={form.loss_reference} onChange={(v) => set('loss_reference', v)} placeholder="22.5" />
                            <NumberInput label="Margen Alerta (+dB)" value={form.umbral} onChange={(v) => set('umbral', v)} required placeholder="3.0" />
                            <NumberInput label="Potencia Inicial (dBm)" value={form.line_initial1} onChange={(v) => set('line_initial1', v)} placeholder="-5.0" />

                            <div>
                                <label className="text-[8px] uppercase tracking-[0.2em] font-black text-gray-400 mb-2 block">Modo Operativo</label>
                                <div className="h-[42px] flex items-center justify-between px-4 rounded-xl border bg-white shadow-sm">
                                    <span className={`text-[8px] font-black uppercase ${form.isSingle ? 'text-gray-400' : 'text-blue-600'}`}>Dual</span>
                                    <button
                                        type="button"
                                        onClick={() => set('isSingle', !form.isSingle)}
                                        className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all duration-300 ${form.isSingle ? 'bg-amber-500 shadow-[0_2px_8px_rgba(245,158,11,0.3)]' : 'bg-blue-600 shadow-[0_2px_8px_rgba(37,99,235,0.3)]'
                                            }`}
                                    >
                                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${form.isSingle ? 'translate-x-6' : 'translate-x-0.5'
                                            }`} />
                                    </button>
                                    <span className={`text-[8px] font-black uppercase ${form.isSingle ? 'text-amber-600' : 'text-gray-400'}`}>Single</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ACTIONS */}
                    <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t border-gray-100">
                        {!isCreating && onDelete && (
                            <button
                                type="button"
                                onClick={onDelete}
                                className="px-6 py-3 rounded-xl bg-white text-red-500 hover:bg-red-500 hover:text-white font-black transition-all text-[10px] uppercase border-2 border-red-100 hover:border-red-500 active:scale-95 shadow-sm"
                            >
                                Eliminar
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 font-black transition-all text-[10px] uppercase active:scale-95"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-10 py-3 rounded-xl bg-blue-600 text-white font-black uppercase tracking-[0.1em] hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-[10px] border-b-4 border-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Guardando...' : (isCreating ? 'Crear Enlace' : 'Guardar Cambios')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const TextInput = ({ label, value, onChange, placeholder }) => (
    <div className="flex flex-col">
        <label className="text-[9px] uppercase tracking-[0.2em] font-black text-gray-400 mb-2 ml-1">{label}</label>
        <input
            type="text"
            className="w-full px-4 py-3 rounded-xl bg-white text-gray-900 border border-gray-200 outline-none transition-all placeholder:text-gray-300 font-bold text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-sm"
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
        />
    </div>
);

const NumberInput = ({ label, value, onChange, required, placeholder }) => (
    <div className="flex flex-col">
        <label className="text-[8px] uppercase tracking-[0.2em] font-black text-gray-400 mb-2 ml-1">{label}</label>
        <input
            type="number"
            step="any"
            className="w-full px-3 py-2.5 rounded-xl bg-gray-900 text-blue-400 font-mono font-black border border-gray-700 outline-none transition-all focus:ring-4 focus:ring-blue-500/20 shadow-sm text-sm"
            value={value}
            required={required}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
        />
    </div>
);

export default EnlacesCompactPage;
