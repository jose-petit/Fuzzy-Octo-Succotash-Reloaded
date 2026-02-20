import React, { useEffect, useState } from 'react';
import { Layout } from 'components/Layout';
import { Tabs } from 'components/Tabs';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import {
    Activity,
    Settings,
    Database,
    Link as LinkIcon,
    History,
    ArrowRight,
    AlertTriangle,
    Package,
    MapPin,
    Box
} from 'lucide-react';

interface Deposito { id: number; nombre: string; }
interface Proyecto { id: number; nombre: string; }
interface SubProyecto { id: number; nombre: string; }
interface Equipo {
    id: number;
    id_deposito: number;
    codigo_gx: string;
    num_parte: string;
    descripcion: string;
    cantidad: number;
    ciudad: string;
    fecha: string;
    proyectos?: Proyecto;
}

const ProductGrid = ({ data, loading }: { data: Equipo[], loading: boolean }) => {
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 space-y-4">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-blue-500/20 rounded-full"></div>
                    <div className="w-16 h-16 border-4 border-t-blue-600 rounded-full animate-spin absolute top-0 left-0"></div>
                </div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest animate-pulse">Analizando Lotes...</p>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="text-center py-24 bg-white/40 dark:bg-gray-950/40 rounded-[3rem] border-2 border-dashed border-gray-200 dark:border-gray-800 backdrop-blur-sm">
                <AlertTriangle className="mx-auto h-16 w-16 text-gray-200 dark:text-gray-800 mb-4" />
                <h3 className="text-xl font-black text-gray-900 dark:text-gray-100 uppercase italic">Sin stock en este HUB</h3>
                <p className="text-sm text-gray-500 font-medium mt-1">El inventario para esta ubicación se encuentra vacío en el snapshot actual.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-10 animate-fade-in-up">
            {data.map(item => (
                <div key={item.id} className="group relative bg-white/40 dark:bg-gray-900/40 rounded-[32px] p-8 border border-white/60 dark:border-gray-800/60 shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 backdrop-blur-md">
                    <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-10 transition-all duration-500 pointer-events-none text-white">
                        <Box size={80} />
                    </div>

                    <div className="flex justify-between items-start mb-6">
                        <span className="px-4 py-1 bg-blue-600 text-white text-[10px] font-black rounded-full shadow-lg shadow-blue-500/20 uppercase tracking-wider">
                            {item.codigo_gx || 'GX-N/A'}
                        </span>
                        <div className="flex flex-col items-end">
                            <History size={14} className="text-gray-300 dark:text-gray-600 group-hover:text-blue-400 transition-colors" />
                            <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase mt-1">
                                {item.fecha ? new Date(item.fecha).toLocaleDateString() : 'N/A'}
                            </span>
                        </div>
                    </div>

                    <h3 className="text-xl font-black text-gray-900 dark:text-gray-200 mb-4 line-clamp-2 min-h-[3.5rem] tracking-tight group-hover:text-blue-600 transition-colors" title={item.descripcion}>
                        {item.descripcion || 'HARDWARE NO IDENTIFICADO'}
                    </h3>

                    <div className="space-y-3 mb-8">
                        <div className="flex items-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight opacity-70">
                            <div className="w-6"><MapPin size={14} className="text-blue-500" /></div>
                            {item.ciudad || 'CENTRO LOGÍSTICO'}
                        </div>
                        {item.proyectos && (
                            <div className="flex items-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight opacity-70">
                                <div className="w-6"><LinkIcon size={14} className="text-blue-500" /></div>
                                {item.proyectos.nombre}
                            </div>
                        )}
                    </div>

                    <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                        <div>
                            <p className="text-[9px] text-gray-400 dark:text-gray-600 uppercase font-black tracking-widest mb-1">Disponibilidad</p>
                            <p className={`text-4xl font-black tracking-tighter ${item.cantidad > 0 ? 'text-gray-900 dark:text-white' : 'text-red-500 animate-pulse'}`}>
                                {item.cantidad ?? 0}<span className="text-sm ml-1 opacity-20">U</span>
                            </p>
                        </div>
                        <button className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 text-blue-600 dark:text-blue-400 hover:bg-blue-600 dark:hover:bg-blue-600 hover:text-white transition-all shadow-inner border border-gray-100 dark:border-gray-700">
                            <ArrowRight size={20} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

const ProductsPage = () => {
    const { status } = useSession();
    const [equipos, setEquipos] = useState<Equipo[]>([]);
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);

    // Catalogos
    const [depositos, setDepositos] = useState<Deposito[]>([]);
    const [proyectos, setProyectos] = useState<Proyecto[]>([]);
    const [subproyectos, setSubproyectos] = useState<SubProyecto[]>([]);

    // Filtros
    const [filters, setFilters] = useState({
        id_deposito: '',
        id_proyecto: '',
        id_sub_proyecto: '',
        codigo_gx: '',
        ciudad: '',
        search: ''
    });

    useEffect(() => {
        fetchCatalogs();
        fetchData();
    }, []);

    const fetchCatalogs = async () => {
        try {
            const [dep, pro] = await Promise.all([
                axios.get('/api/deposits'),
                axios.get('/api/projects')
            ]);
            setDepositos(dep.data.deposits || []);
            setProyectos(pro.data.projects || []);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const qs = new URLSearchParams();
            if (filters.id_deposito) qs.append('id_deposito', filters.id_deposito);
            if (filters.id_proyecto) qs.append('id_proyecto', filters.id_proyecto);
            if (filters.id_sub_proyecto) qs.append('id_sub_proyecto', filters.id_sub_proyecto);
            if (filters.codigo_gx) qs.append('codigo_gx', filters.codigo_gx);
            if (filters.ciudad) qs.append('ciudad', filters.ciudad);

            const res = await axios.get(`/api/equipos?${qs.toString()}`);
            if (res.data.status === 'success') {
                setEquipos(res.data.equipos || []);
            }
        } catch (err) {
            toast.error('Error cargando productos');
        } finally {
            setLoading(false);
        }
    };

    const handleProjectChange = async (pid: string) => {
        setFilters({ ...filters, id_proyecto: pid, id_sub_proyecto: '' });
        if (pid) {
            try {
                const res = await axios.get(`/api/subprojects/by-project/${pid}`);
                setSubproyectos(res.data.subprojects || []);
            } catch (e) { }
        } else {
            setSubproyectos([]);
        }
    };

    const filteredEquipos = equipos.filter(e => {
        if (!filters.search) return true;
        const txt = filters.search.toLowerCase();
        return (
            e.codigo_gx?.toLowerCase().includes(txt) ||
            e.descripcion?.toLowerCase().includes(txt) ||
            e.num_parte?.toLowerCase().includes(txt) ||
            e.ciudad?.toLowerCase().includes(txt)
        );
    });

    const tabs = [
        {
            label: 'RESUMEN GLOBAL',
            content: <ProductGrid data={filteredEquipos} loading={loading} />
        },
        ...depositos.map(d => ({
            label: d.nombre.toUpperCase(),
            content: <ProductGrid data={filteredEquipos.filter(e => e.id_deposito === d.id)} loading={loading} />
        }))
    ];

    const inputClass = "w-full px-4 py-2.5 bg-white/40 border border-gray-200/50 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-bold text-gray-700 backdrop-blur-sm shadow-inner";
    const labelClass = "block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1";

    if (status === 'unauthenticated') return null;

    return (
        <Layout>
            <div className="max-w-[1600px] mx-auto px-4 py-12 animate-fade-in space-y-10">

                {/* Glass Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="relative">
                        <div className="absolute -left-6 top-0 w-1.5 h-full bg-blue-600 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.4)]"></div>
                        <h1 className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter uppercase italic">
                            Almacén <span className="text-blue-600 not-italic">Global</span>
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg font-medium opacity-70">Sincronización de activos y stock de infraestructura óptica.</p>
                    </div>

                    <div className="flex items-center gap-4 bg-white/40 dark:bg-gray-900/40 border border-white/60 dark:border-gray-800/60 p-3 rounded-[2.5rem] shadow-xl shadow-blue-500/5 backdrop-blur-xl">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Activity className="h-4 w-4 text-blue-500" />
                            </div>
                            <input
                                type="text"
                                placeholder="Filtrar por GX, P/N o Descripción..."
                                className="pl-11 pr-6 py-3 bg-white/60 dark:bg-gray-800/60 border border-gray-200/50 dark:border-gray-700/50 rounded-3xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none w-72 lg:w-96 text-sm font-bold text-gray-700 dark:text-gray-200 shadow-inner transition-all"
                                value={filters.search}
                                onChange={e => setFilters({ ...filters, search: e.target.value })}
                            />
                        </div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`p-3.5 rounded-full transition-all duration-500 ${showFilters ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white/80 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:text-blue-500'}`}
                        >
                            <Settings className={`h-5 w-5 ${showFilters ? 'animate-spin-slow' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Industrial Tabs System */}
                <div className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl p-8 rounded-[3.5rem] border border-white/60 dark:border-gray-800/60 shadow-inner overflow-hidden">
                    <div className="flex items-center gap-3 mb-8 px-4">
                        <Package className="text-blue-600" size={24} />
                        <h2 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em]">Hardware Ledger Categorization</h2>
                    </div>

                    <div className="tabs-industrial-container">
                        <Tabs tabs={tabs} />
                    </div>
                </div>

                {/* Advanced Filters Panel */}
                <div className={`overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${showFilters ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                    <div className="bg-gradient-to-br from-white/80 to-blue-50/30 dark:from-gray-900/80 dark:to-blue-900/30 p-10 rounded-[3rem] shadow-2xl shadow-blue-500/5 border border-white/80 dark:border-gray-800 backdrop-blur-3xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:rotate-12 transition-transform duration-1000 text-white">
                            <Database size={200} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
                            <div>
                                <label className={labelClass}>Línea de Proyecto</label>
                                <select className={inputClass} value={filters.id_proyecto} onChange={e => handleProjectChange(e.target.value)}>
                                    <option value="">TODOS LOS PROYECTOS</option>
                                    {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Subcategoría WBS</label>
                                <select className={inputClass} value={filters.id_sub_proyecto} onChange={e => setFilters({ ...filters, id_sub_proyecto: e.target.value })}>
                                    <option value="">SIN FILTRO</option>
                                    {subproyectos.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Filtrar por Código GX</label>
                                <input type="text" placeholder="GX-XXXXX" className={inputClass} value={filters.codigo_gx} onChange={e => setFilters({ ...filters, codigo_gx: e.target.value })} />
                            </div>
                            <div>
                                <label className={labelClass}>Ciudad / Ubicación</label>
                                <input type="text" placeholder="Ej. Valencia" className={inputClass} value={filters.ciudad} onChange={e => setFilters({ ...filters, ciudad: e.target.value })} />
                            </div>

                            <div className="lg:col-span-4 flex justify-between items-center pt-6 border-t border-gray-100/50 dark:border-gray-800/50">
                                <span className="text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-[0.2em] italic">Deep Trace Inventory Analytics</span>
                                <button
                                    onClick={fetchData}
                                    className="px-10 py-4 bg-gray-900 dark:bg-blue-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-blue-600 dark:hover:bg-blue-500 transition-all shadow-xl shadow-gray-400/20 active:scale-95"
                                >
                                    Sincronizar Lotes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            <style jsx global>{`
                .tabs-industrial-container :global(button) {
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    font-weight: 900;
                    font-size: 10px;
                    border-radius: 1rem;
                    margin-right: 0.5rem;
                }
                .tabs-industrial-container :global(.text-primary) {
                    color: #2563eb !important;
                }
                .tabs-industrial-container :global(.border-primary) {
                    border-color: #2563eb !important;
                }
            `}</style>
        </Layout>
    );
};

export default ProductsPage;
