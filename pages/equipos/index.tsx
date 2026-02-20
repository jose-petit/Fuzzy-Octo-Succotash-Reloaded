import React, { useEffect, useState } from 'react';
import { Layout } from 'components/Layout';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  Activity,
  Plus,
  Trash2,
  Edit3,
  Database,
  Clock,
  User,
  MapPin,
  Package,
  FileText,
  Save,
  ChevronRight,
  TrendingDown,
  ShieldCheck
} from 'lucide-react';

interface Deposito {
  id: number;
  nombre: string;
}
interface Proyecto {
  id: number;
  nombre: string;
}
interface SubProyecto {
  id: number;
  nombre: string;
}
interface Usuario {
  id: number;
  nombre: string;
}

interface Equipo {
  id: number;
  codigo_gx: string;
  descripcion: string;
  cantidad: number;
}

interface NewEquipoState {
  id_deposito: string;
  id_proyecto: string;
  id_sub_proyecto: string;
  codigo_gx: string;
  num_parte: string;
  descripcion: string;
  observacion: string;
  cantidad: number;
  autorizado_solicitado_por: string;
  fecha: string;
  ciudad: string;
}

const EquiposPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [depositos, setDepositos] = useState<Deposito[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [subproyectos, setSubproyectos] = useState<SubProyecto[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [isSubprojectsLoading, setIsSubprojectsLoading] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [newEquipo, setNewEquipo] = useState<NewEquipoState>({
    id_deposito: '',
    id_proyecto: '',
    id_sub_proyecto: '',
    codigo_gx: '',
    num_parte: '',
    descripcion: '',
    observacion: '',
    cantidad: 1,
    autorizado_solicitado_por: '',
    fecha: new Date().toISOString().split('T')[0],
    ciudad: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status]);

  useEffect(() => {
    fetchEquipos();
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [dep, pro, usr] = await Promise.all([
        axios.get('/api/deposits'),
        axios.get('/api/projects'),
        axios.get('/api/users'),
      ]);
      setDepositos(dep.data.deposits || []);
      setProyectos(pro.data.projects || []);
      setUsuarios(usr.data.users || []);
    } catch (e) {
      console.error('Error cargando datos iniciales', e);
      toast.error('Error al cargar listas desplegables');
    }
  };

  const fetchEquipos = async () => {
    setIsLoading(true);
    try {
      const resp = await axios.get('/api/equipos');
      if (resp.data.status === 'success') {
        setEquipos(resp.data.equipos);
      }
    } catch (e: any) {
      console.error(e);
      toast.error('Error al cargar inventario');
    }
    setIsLoading(false);
  };

  const handleProyectoChange = async (projectId: string, existingSubProjectId?: string) => {
    setNewEquipo(prev => ({ ...prev, id_proyecto: projectId, id_sub_proyecto: existingSubProjectId || '' }));

    if (projectId === '') {
      setSubproyectos([]);
      return;
    }

    setIsSubprojectsLoading(true);
    try {
      const resp = await axios.get(`/api/subprojects/by-project/${projectId}`);
      setSubproyectos(resp.data.subprojects || []);
      if (existingSubProjectId) {
        setNewEquipo(prev => ({ ...prev, id_sub_proyecto: existingSubProjectId }));
      }
    } catch (err) {
      console.error('Error al cargar subproyectos', err);
      setSubproyectos([]);
    } finally {
      setIsSubprojectsLoading(false);
    }
  };

  const handleSubmit = async () => {
    const requiredFields = [
      { key: 'codigo_gx', label: 'Código GX' },
      { key: 'num_parte', label: 'Número de Parte' },
      { key: 'cantidad', label: 'Cantidad' },
      { key: 'id_deposito', label: 'Depósito' },
      { key: 'id_proyecto', label: 'Proyecto' }
    ];

    for (const field of requiredFields) {
      // @ts-ignore
      if (!newEquipo[field.key]) {
        toast.error(`${field.label} es obligatorio`);
        return;
      }
    }

    setIsSaving(true);
    const toastId = toast.loading(isEditing ? 'Actualizando registro...' : 'Guardando nuevo equipo...');
    try {
      if (isEditing && editingId) {
        await axios.put(`/api/equipos/${editingId}`, newEquipo);
        toast.success('Equipo actualizado con éxito 📋', { id: toastId });
      } else {
        await axios.post('/api/equipos', newEquipo);
        toast.success('Registro guardado correctamente 📥', { id: toastId });
      }
      resetForm();
      fetchEquipos();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error en la operación', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setNewEquipo({
      id_deposito: '',
      id_proyecto: '',
      id_sub_proyecto: '',
      codigo_gx: '',
      num_parte: '',
      descripcion: '',
      observacion: '',
      cantidad: 1,
      autorizado_solicitado_por: '',
      fecha: new Date().toISOString().split('T')[0],
      ciudad: '',
    });
    setSubproyectos([]);
  };

  const startEdit = (e: any) => {
    setIsEditing(true);
    setEditingId(e.id);
    setNewEquipo({
      id_deposito: String(e.id_deposito),
      id_proyecto: String(e.id_proyecto),
      id_sub_proyecto: String(e.id_sub_proyecto),
      codigo_gx: e.codigo_gx || '',
      num_parte: e.num_parte || '',
      descripcion: e.descripcion || '',
      observacion: e.observacion || '',
      cantidad: e.cantidad || 1,
      autorizado_solicitado_por: String(e.autorizado_solicitado_por || ''),
      fecha: e.fecha ? new Date(e.fecha).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      ciudad: e.ciudad || '',
    });
    handleProyectoChange(String(e.id_proyecto), String(e.id_sub_proyecto));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast('Modo Edición Activado', { icon: '✏️' });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Seguro que deseas eliminar este registro industrial?')) return;
    const toastId = toast.loading('Operación en curso...');
    try {
      await axios.delete(`/api/equipos/${id}`);
      toast.success('Registro eliminado', { id: toastId });
      fetchEquipos();
    } catch (e: any) {
      toast.error('Error en eliminación', { id: toastId });
    }
  };

  const inputClass = (value: any) => `w-full px-5 py-3 bg-white/40 border ${value ? 'border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.1)]' : 'border-gray-200/50'} rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-bold text-gray-700 backdrop-blur-sm shadow-inner group-hover/input:bg-white/60`;
  const labelClass = "block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center justify-between";

  if (status === 'loading') {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[80vh] space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] animate-pulse">Sincronizando Inventario...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-[1600px] mx-auto px-4 py-12 animate-fade-in space-y-12">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-gray-100 pb-10">
          <div className="relative">
            <div className="absolute -left-6 top-0 w-1.5 h-full bg-blue-600 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.4)]"></div>
            <h1 className="text-5xl font-black text-gray-900 tracking-tighter uppercase italic">
              Inventario <span className="text-blue-600 not-italic">Activos</span>
            </h1>
            <p className="text-gray-500 mt-2 text-lg font-medium opacity-70">Monitorización y registro de hardware de red óptica.</p>
          </div>
          <div className="px-6 py-3 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Registros Totales</span>
              <span className="text-2xl font-black text-blue-600 italic tracking-tighter">{equipos.length} ITEMS</span>
            </div>
            <div className="p-3 bg-blue-600 text-white rounded-xl">
              <Database size={20} />
            </div>
          </div>
        </div>

        {/* Advanced Input Module */}
        <div className="bg-gradient-to-br from-white/80 to-blue-50/30 rounded-[3rem] shadow-2xl shadow-blue-500/5 border border-white opacity-100 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none transition-transform duration-1000 group-hover:rotate-12">
            <Package size={240} />
          </div>

          <div className="px-12 py-8 border-b border-white/60 bg-white/20 backdrop-blur-md flex items-center justify-between relative z-10">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-3 uppercase italic tracking-tight">
              <span className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/30"><Plus size={20} /></span>
              Nueva Entrada de Inventario
            </h2>
            <div className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">Inventory_Control_v4.0</div>
          </div>

          <div className="p-12 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-8">
              {/* Row 1 */}
              <div className="group/input">
                <label className={labelClass}>
                  Depósito / HUB
                  {newEquipo.id_deposito && <ShieldCheck size={12} className="text-blue-500 animate-in zoom-in" />}
                </label>
                <select value={newEquipo.id_deposito} onChange={(e) => setNewEquipo({ ...newEquipo, id_deposito: e.target.value })} className={inputClass(newEquipo.id_deposito)}>
                  <option value="">SELECCIONAR DESTINO...</option>
                  {depositos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                </select>
              </div>
              <div className="group/input">
                <label className={labelClass}>
                  Línea de Proyecto
                  {newEquipo.id_proyecto && <ShieldCheck size={12} className="text-blue-500 animate-in zoom-in" />}
                </label>
                <select value={newEquipo.id_proyecto} onChange={(e) => handleProyectoChange(e.target.value)} className={inputClass(newEquipo.id_proyecto)}>
                  <option value="">ASIGNAR PROYECTO...</option>
                  {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <div className="group/input">
                <label className={labelClass}>
                  Estructura WBS / Subproyecto
                  {isSubprojectsLoading ? <Activity size={12} className="text-blue-500 animate-spin" /> : (newEquipo.id_sub_proyecto && <ShieldCheck size={12} className="text-blue-500 animate-in zoom-in" />)}
                </label>
                <select value={newEquipo.id_sub_proyecto} onChange={(e) => setNewEquipo({ ...newEquipo, id_sub_proyecto: e.target.value })} className={inputClass(newEquipo.id_sub_proyecto)} disabled={!newEquipo.id_proyecto || isSubprojectsLoading}>
                  <option value="">{isSubprojectsLoading ? 'SINCRONIZANDO...' : 'PENDIENTE ASIGNACIÓN...'}</option>
                  {subproyectos.map((sp) => <option key={sp.id} value={sp.id}>{sp.nombre}</option>)}
                </select>
              </div>

              {/* Row 2 */}
              <div className="group/input">
                <label className={labelClass}>
                  Identificador Industrial (GX)
                  {newEquipo.codigo_gx && <ShieldCheck size={12} className="text-blue-500 animate-in zoom-in" />}
                </label>
                <div className="relative">
                  <input type="text" className={inputClass(newEquipo.codigo_gx)} value={newEquipo.codigo_gx} onChange={(e) => setNewEquipo({ ...newEquipo, codigo_gx: e.target.value })} placeholder="GX-XXXXX" />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20"><MapPin size={16} /></div>
                </div>
              </div>
              <div className="group/input">
                <label className={labelClass}>
                  Número de Parte (HWID)
                  {newEquipo.num_parte && <ShieldCheck size={12} className="text-blue-500 animate-in zoom-in" />}
                </label>
                <div className="relative">
                  <input type="text" className={inputClass(newEquipo.num_parte)} value={newEquipo.num_parte} onChange={(e) => setNewEquipo({ ...newEquipo, num_parte: e.target.value })} placeholder="PN-XXXX" />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20"><Activity size={16} /></div>
                </div>
              </div>
              <div className="group/input">
                <label className={labelClass}>
                  Volumen / Cantidad
                  {newEquipo.cantidad > 0 && <ShieldCheck size={12} className="text-blue-500 animate-in zoom-in" />}
                </label>
                <input type="number" className={inputClass(newEquipo.cantidad > 0)} value={newEquipo.cantidad} onChange={(e) => setNewEquipo({ ...newEquipo, cantidad: parseInt(e.target.value) || 0 })} min="1" />
              </div>

              {/* Row 3 */}
              <div className="lg:col-span-2 group/input">
                <label className={labelClass}>
                  Descripción Técnica de Hardware
                  {newEquipo.descripcion && <ShieldCheck size={12} className="text-blue-500 animate-in zoom-in" />}
                </label>
                <div className="relative">
                  <input type="text" className={inputClass(newEquipo.descripcion)} value={newEquipo.descripcion} onChange={(e) => setNewEquipo({ ...newEquipo, descripcion: e.target.value })} placeholder="Ingresar descripción detallada..." />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20"><FileText size={16} /></div>
                </div>
              </div>
              <div className="group/input">
                <label className={labelClass}>
                  Fecha de Registro
                  {newEquipo.fecha && <ShieldCheck size={12} className="text-blue-500 animate-in zoom-in" />}
                </label>
                <input type="date" className={inputClass(newEquipo.fecha)} value={newEquipo.fecha} onChange={(e) => setNewEquipo({ ...newEquipo, fecha: e.target.value })} />
              </div>

              {/* Row 4 */}
              <div className="group/input">
                <label className={labelClass}>
                  Autorización / Responsable
                  {newEquipo.autorizado_solicitado_por && <ShieldCheck size={12} className="text-blue-500 animate-in zoom-in" />}
                </label>
                <select value={newEquipo.autorizado_solicitado_por} onChange={(e) => setNewEquipo({ ...newEquipo, autorizado_solicitado_por: e.target.value })} className={inputClass(newEquipo.autorizado_solicitado_por)}>
                  <option value="">BUSCAR USUARIO...</option>
                  {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                </select>
              </div>
              <div className="group/input">
                <label className={labelClass}>
                  Ciudad Operativa
                  {newEquipo.ciudad && <ShieldCheck size={12} className="text-blue-500 animate-in zoom-in" />}
                </label>
                <input type="text" className={inputClass(newEquipo.ciudad)} value={newEquipo.ciudad} onChange={(e) => setNewEquipo({ ...newEquipo, ciudad: e.target.value })} placeholder="Ej. Caracas, Valencia..." />
              </div>
              <div className="group/input">
                <label className={labelClass}>
                  Notas y Observaciones
                  {newEquipo.observacion && <ShieldCheck size={12} className="text-blue-500 animate-in zoom-in" />}
                </label>
                <input type="text" className={inputClass(newEquipo.observacion)} value={newEquipo.observacion} onChange={(e) => setNewEquipo({ ...newEquipo, observacion: e.target.value })} placeholder="Opcional..." />
              </div>
            </div>

            <div className="mt-12 flex justify-between items-center bg-white/30 p-6 rounded-[2rem] border border-white/50 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${isEditing ? 'bg-amber-500' : 'bg-blue-500'} animate-pulse`}></span>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">
                  {isEditing ? `Modificando Registro #${editingId}` : 'Listo para validación de datos'}
                </span>
                {isEditing && (
                  <button
                    onClick={resetForm}
                    className="ml-4 text-[9px] font-black text-red-500 uppercase tracking-widest hover:underline"
                  >
                    [ CANCELAR EDICIÓN ]
                  </button>
                )}
              </div>
              <button
                onClick={handleSubmit}
                disabled={isSaving}
                className={`px-12 py-4 rounded-2xl text-white font-black text-xs uppercase tracking-[0.2em] shadow-2xl transition-all flex items-center gap-4
                       ${isSaving ? 'bg-gray-400 cursor-not-allowed' : isEditing ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20' : 'bg-gray-900 hover:bg-blue-600 shadow-blue-500/20'}
                       active:scale-95
                    `}
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : isEditing ? <Edit3 size={18} /> : <Save size={18} />}
                {isSaving ? 'PROCESANDO...' : isEditing ? 'Actualizar Registro' : 'Sincronizar Item'}
              </button>
            </div>
          </div>
        </div>

        {/* Inventory Ledger Module with Industrial Table */}
        <div className="bg-[#0a0c10] rounded-[3rem] border border-gray-800 shadow-2xl overflow-hidden relative group">
          <div className="px-10 py-8 border-b border-gray-800 bg-gray-900/40 backdrop-blur-2xl flex justify-between items-center relative z-10">
            <h3 className="text-xl font-black text-white uppercase italic tracking-tight flex items-center gap-3">
              <div className="w-2 h-6 bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.4)]"></div>
              Libro Mayor de Inventario
            </h3>
            <div className="bg-gray-800/50 px-4 py-2 rounded-full border border-gray-700">
              <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Snapshot: Finalizado</span>
            </div>
          </div>

          <div className="overflow-x-auto relative z-10">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-900/80 border-b border-gray-800">
                  <th className="px-10 py-6 text-left text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Hardware GXID</th>
                  <th className="px-10 py-6 text-left text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Especificaciones Técnicas</th>
                  <th className="px-10 py-6 text-center text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Stock</th>
                  <th className="px-10 py-6 text-right text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Acciones Administrativas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-900/50">
                {isLoading && (
                  <tr>
                    <td colSpan={4} className="px-10 py-32 text-center">
                      <div className="flex flex-col items-center space-y-4">
                        <div className="w-10 h-10 border-4 border-blue-600/10 border-t-blue-600 rounded-full animate-spin"></div>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest animate-pulse">Requesting Ledger Data...</span>
                      </div>
                    </td>
                  </tr>
                )}
                {!isLoading && equipos.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-10 py-32 text-center text-gray-600 font-bold uppercase tracking-widest italic opacity-50">
                      Zero items found in this ledger snapshot.
                    </td>
                  </tr>
                )}
                {equipos.map((eq) => (
                  <tr key={eq.id} className="group hover:bg-blue-600/[0.03] transition-all duration-300">
                    <td className="px-10 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-white group-hover:text-blue-400 transition-colors uppercase font-mono tracking-tighter">{eq.codigo_gx}</span>
                        <span className="text-[9px] text-gray-600 font-bold uppercase mt-1 tracking-widest italic">Registered GXID</span>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex flex-col max-w-md">
                        <span className="text-xs font-bold text-gray-400 truncate uppercase tracking-tight">{eq.descripcion}</span>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-700"></div>
                          <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest">HW Revision: Standard</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className={`text-2xl font-black tracking-tighter ${eq.cantidad < 2 ? 'text-red-500' : 'text-gray-300'}`}>
                          {eq.cantidad.toString().padStart(2, '0')}
                        </span>
                        {eq.cantidad < 2 && (
                          <div className="flex items-center gap-1 text-[8px] font-black text-red-600/60 uppercase animate-pulse">
                            <TrendingDown size={10} /> CRITICAL STOCK
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <div className="flex justify-end items-center gap-3">
                        <button
                          onClick={() => startEdit(eq)}
                          className="p-3 bg-gray-900 border border-gray-800 text-gray-500 hover:text-blue-400 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/10 rounded-2xl transition-all active:scale-90"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(eq.id)}
                          className="p-3 bg-gray-900 border border-gray-800 text-gray-500 hover:text-red-500 hover:border-red-500/30 hover:shadow-lg hover:shadow-red-500/10 rounded-2xl transition-all active:scale-90"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button className="p-3 bg-gray-900 border border-gray-800 text-gray-700 hover:text-white rounded-2xl transition-all opacity-40 hover:opacity-100">
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-gray-900/60 px-10 py-5 border-t border-gray-800 flex justify-between items-center relative z-10 transition-colors group-hover:bg-gray-900/80">
            <div className="flex items-baseline gap-2">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">End of ledger: </span>
              <span className="text-xs font-black text-blue-500 italic tracking-tighter">{equipos.length} Industrial Records Loaded</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock size={12} className="text-gray-600" />
                <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Last Update: Just Now</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default EquiposPage;
