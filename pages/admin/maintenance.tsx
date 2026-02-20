import React, { useState, useMemo } from 'react';
import Layout from 'components/Layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Calendar,
    Clock,
    AlertCircle,
    CheckCircle2,
    Plus,
    Trash2,
    Edit2,
    X,
    History,
    Link as LinkIcon,
    Search,
    Filter
} from 'lucide-react';
import moment from 'moment';
import { toast } from 'react-hot-toast';

const MaintenancePage = () => {
    const qc = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [selectedMaint, setSelectedMaint] = useState(null);
    const [filter, setFilter] = useState('');
    const [activeTab, setActiveTab] = useState('windows'); // 'windows' or 'events'

    // Queries
    const { data: windows = [], isLoading: loadingWindows } = useQuery(['maintenance-windows'], async () => {
        const res = await fetch('/api/admin/maintenance');
        const json = await res.json();
        return json.windows || [];
    });

    const { data: events = [], isLoading: loadingEvents } = useQuery(['network-events'], async () => {
        const res = await fetch('/api/admin/events');
        const json = await res.json();
        return json.events || [];
    });

    const { data: enlaces = [] } = useQuery(['enlaces'], async () => {
        const res = await fetch('/api/enlace');
        const json = await res.json();
        return json.enlaces || [];
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: async (data) => {
            const res = await fetch('/api/admin/maintenance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries(['maintenance-windows']);
            setShowModal(false);
            toast.success('Ventana de mantenimiento creada');
        }
    });

    const updateMutation = useMutation({
        mutationFn: async (data) => {
            const res = await fetch('/api/admin/maintenance', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries(['maintenance-windows']);
            setShowModal(false);
            toast.success('Ventana actualizada');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const res = await fetch('/api/admin/maintenance', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries(['maintenance-windows']);
            toast.success('Ventana eliminada');
        }
    });

    const filteredWindows = useMemo(() => {
        return windows.filter(w =>
            w.title.toLowerCase().includes(filter.toLowerCase()) ||
            (w.entity_id || '').includes(filter)
        );
    }, [windows, filter]);

    const filteredEvents = useMemo(() => {
        return events.filter(e =>
            e.event_type.toLowerCase().includes(filter.toLowerCase()) ||
            (e.entity_id || '').includes(filter)
        );
    }, [events, filter]);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'active': return <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wider flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>Activa</span>;
            case 'completed': return <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-wider flex items-center gap-1"><CheckCircle2 size={10} />Finalizada</span>;
            case 'cancelled': return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-[10px] font-black uppercase tracking-wider flex items-center gap-1"><X size={10} />Cancelada</span>;
            default: return <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-wider flex items-center gap-1"><Clock size={10} />Programada</span>;
        }
    };

    const openMaintModal = (maint = null) => {
        setSelectedMaint(maint);
        setShowModal(true);
    };

    return (
        <Layout>
            <div className="max-w-[1600px] mx-auto space-y-8 animate-fade-in">
                {/* HEADER */}
                <div className="flex flex-col md:flex-row items-center justify-between pb-6 border-b border-gray-200 dark:border-gray-800 gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter flex items-center gap-4 italic uppercase">
                            <span className="bg-indigo-600 text-white px-3 py-1 rounded-lg shadow-lg not-italic">NMS</span>
                            Eventos & Mantenimiento
                        </h1>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                            Gestión de Ciclo de Vida de Red
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <input
                                className="pl-11 pr-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-800 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all w-80 text-sm font-bold placeholder:text-gray-300 dark:placeholder:text-gray-700 shadow-sm"
                                placeholder="BUSCAR SERIAL / EVENTO..."
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                            />
                            <Search className="absolute left-4 top-3 text-gray-400" size={18} strokeWidth={3} />
                        </div>

                        <button
                            onClick={() => openMaintModal()}
                            className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-black text-[10px] tracking-[0.2em] uppercase hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-2 border-b-4 border-indigo-900"
                        >
                            <Plus size={16} strokeWidth={3} />
                            Nueva Ventana
                        </button>
                    </div>
                </div>

                {/* TABS */}
                <div className="flex gap-4 p-1 bg-gray-100 dark:bg-gray-900 rounded-2xl w-fit">
                    <button
                        onClick={() => setActiveTab('windows')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'windows' ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Mantenimiento
                    </button>
                    <button
                        onClick={() => setActiveTab('events')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'events' ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Historial de Incidencias
                    </button>
                </div>

                {activeTab === 'windows' ? (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {filteredWindows.length > 0 ? filteredWindows.map((win) => (
                            <div key={win.id} className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all group overflow-hidden flex">
                                <div className={`w-2 shrink-0 ${win.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-indigo-100 dark:bg-indigo-900'}`}></div>
                                <div className="p-6 flex-grow">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase italic tracking-tight">{win.title}</h3>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                                    <LinkIcon size={10} /> {win.entity_id || 'Global'}
                                                </span>
                                                {getStatusBadge(win.status)}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openMaintModal(win)} className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-400 hover:text-indigo-600 transition-colors"><Edit2 size={14} /></button>
                                            <button onClick={() => confirm('Eliminar ventana?') && deleteMutation.mutate(win.id)} className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                                        </div>
                                    </div>

                                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-6 font-medium leading-relaxed">
                                        {win.description || 'Sin descripción detallada.'}
                                    </p>

                                    <div className="flex items-center gap-8 pt-4 border-t border-gray-50 dark:border-gray-900">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Inicio</span>
                                            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                                <Calendar size={14} className="text-indigo-500" />
                                                <span className="text-xs font-bold">{moment(win.start_date).format('DD MMM, HH:mm')}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Fin</span>
                                            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                                <Clock size={14} className="text-rose-500" />
                                                <span className="text-xs font-bold">{moment(win.end_date).format('DD MMM, HH:mm')}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="col-span-full py-20 bg-gray-50 dark:bg-gray-950 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 text-center">
                                <Calendar className="mx-auto text-gray-300 mb-4" size={48} strokeWidth={1} />
                                <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">No hay ventanas programadas</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Fecha</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Enlace</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Tipo de Evento</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Severidad</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Descripción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {filteredEvents.map(event => (
                                        <tr key={event.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-gray-900 dark:text-white">{moment(event.start_date).format('DD/MM/YYYY')}</span>
                                                    <span className="text-[10px] text-gray-400 font-medium">{moment(event.start_date).format('HH:mm:ss')}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{event.entity_id}</td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-black uppercase text-gray-700 dark:text-gray-300">{event.event_type}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${event.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                                                    event.severity === 'WARNING' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {event.severity}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 font-medium max-w-md truncate">{event.description}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* MODAL */}
                {showModal && (
                    <MaintenanceModal
                        maint={selectedMaint}
                        enlaces={enlaces}
                        onClose={() => setShowModal(false)}
                        onSubmit={(data) => {
                            if (selectedMaint) updateMutation.mutate({ ...data, id: selectedMaint.id });
                            else createMutation.mutate(data);
                        }}
                    />
                )}
            </div>
        </Layout>
    );
};

const MaintenanceModal = ({ maint, enlaces, onClose, onSubmit }) => {
    const [form, setForm] = useState({
        title: maint?.title || '',
        description: maint?.description || '',
        start_date: maint?.start_date ? moment(maint.start_date).format('YYYY-MM-DDTHH:mm') : moment().add(1, 'hour').format('YYYY-MM-DDTHH:mm'),
        end_date: maint?.end_date ? moment(maint.end_date).format('YYYY-MM-DDTHH:mm') : moment().add(3, 'hour').format('YYYY-MM-DDTHH:mm'),
        entity_id: maint?.entity_id || '',
        status: maint?.status || 'scheduled'
    });

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 dark:border-gray-800">
                <div className="px-10 pt-10 pb-6 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">
                            {maint ? 'Editar Ventana' : 'Nueva Programación'}
                        </h2>
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mt-1">Calendarización de Red</p>
                    </div>
                    <button onClick={onClose} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                        <X size={20} strokeWidth={3} />
                    </button>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="p-10 space-y-6">
                    <div className="space-y-4">
                        <label className="block">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Título de la Actividad</span>
                            <input
                                required
                                className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all dark:text-white"
                                value={form.title}
                                onChange={e => setForm({ ...form, title: e.target.value })}
                                placeholder="Ej: Cambio de Fibra Tramo Caracas-Valencia"
                            />
                        </label>

                        <div className="grid grid-cols-2 gap-4">
                            <label className="block">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Inicio Programado</span>
                                <input
                                    type="datetime-local"
                                    required
                                    className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all dark:text-white"
                                    value={form.start_date}
                                    onChange={e => setForm({ ...form, start_date: e.target.value })}
                                />
                            </label>
                            <label className="block">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Fin Programado</span>
                                <input
                                    type="datetime-local"
                                    required
                                    className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all dark:text-white"
                                    value={form.end_date}
                                    onChange={e => setForm({ ...form, end_date: e.target.value })}
                                />
                            </label>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <label className="block">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Enlace / Serial</span>
                                <select
                                    className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all dark:text-white appearance-none"
                                    value={form.entity_id}
                                    onChange={e => setForm({ ...form, entity_id: e.target.value })}
                                >
                                    <option value="">Global / Sin Enlace</option>
                                    {enlaces.map(en => (
                                        <option key={en.enlace1} value={en.enlace1}>{en.name1} ({en.enlace1})</option>
                                    ))}
                                </select>
                            </label>
                            <label className="block">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Estado Inicial</span>
                                <select
                                    className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all dark:text-white appearance-none"
                                    value={form.status}
                                    onChange={e => setForm({ ...form, status: e.target.value })}
                                >
                                    <option value="scheduled">Programado</option>
                                    <option value="active">Activo Ahora</option>
                                    <option value="completed">Finalizado</option>
                                    <option value="cancelled">Cancelado</option>
                                </select>
                            </label>
                        </div>

                        <label className="block">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Detalles Técnicos</span>
                            <textarea
                                rows={3}
                                className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all dark:text-white resize-none"
                                value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                                placeholder="Explicación detallada de los trabajos a realizar..."
                            />
                        </label>
                    </div>

                    <div className="flex gap-4 pt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-black uppercase text-[10px] tracking-widest hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-[2] py-4 rounded-2xl bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 active:scale-95 transition-all border-b-4 border-indigo-900"
                        >
                            {maint ? 'Guardar Cambios' : 'Confirmar Programación'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MaintenancePage;
