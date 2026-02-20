import React, { useEffect, useState } from 'react';
import { Layout } from 'components/Layout';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Layers,
  Plus,
  Trash2,
  Edit3,
  Activity,
  FolderOpen,
  Calendar,
  ShieldCheck,
  ChevronRight,
  GitBranch
} from 'lucide-react';

const SubprojectsPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [projects, setProjects] = useState([]);
  const [subprojects, setSubprojects] = useState([]);
  const [newSubproject, setNewSubproject] = useState({
    nombre: '',
    descripcion: '',
    estado: 'activo',
    project_id: '0',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status]);

  useEffect(() => {
    fetchProjects();
    fetchSubprojects();
  }, []);

  const fetchProjects = async () => {
    try {
      const resp = await axios.get('/api/projects');
      if (resp.data.status === 'success') {
        setProjects(resp.data.projects);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchSubprojects = async () => {
    try {
      setIsLoading(true);
      const resp = await axios.get('/api/subprojects');
      if (resp.data.status === 'success') {
        setSubprojects(resp.data.subprojects);
      }
    } catch (error) {
      console.error('Error fetching subprojects:', error);
      toast.error('Error al cargar subproyectos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSubproject = async () => {
    if (newSubproject.project_id === '0' || !newSubproject.nombre || !newSubproject.descripcion) {
      toast.error('Todos los campos son obligatorios');
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading('Sincronizando subproyecto...');
    try {
      const resp = await axios.post('/api/subprojects', newSubproject);
      if (resp.data.status === 'success') {
        toast.success('Subproyecto registrado con éxito 🌿', { id: toastId });
        setNewSubproject({
          nombre: '',
          descripcion: '',
          estado: 'activo',
          project_id: '0',
        });
        fetchSubprojects();
      } else {
        toast.error(resp.data.message || 'Error en la operación', { id: toastId });
      }
    } catch (error) {
      console.error('Error creating subproject:', error);
      toast.error('Error de red', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSubproject = async (id) => {
    if (!confirm('¿Seguro que deseas eliminar este subproyecto?')) return;
    const toastId = toast.loading('Eliminando registro...');
    try {
      const resp = await axios.delete(`/api/subprojects/${id}`);
      if (resp.data.status === 'success') {
        toast.success('Registro eliminado', { id: toastId });
        fetchSubprojects();
      } else {
        toast.error(resp.data.message, { id: toastId });
      }
    } catch (error) {
      toast.error('Error en eliminación', { id: toastId });
    }
  };

  const inputClass = "w-full px-5 py-3 bg-white/40 border border-gray-200/50 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-bold text-gray-700 backdrop-blur-sm";
  const labelClass = "block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1";

  if (status === 'loading') return null;

  return (
    <Layout>
      <div className="max-w-[1400px] mx-auto px-4 py-12 animate-fade-in space-y-12">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-gray-100 pb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-tighter mb-4 border border-blue-100 italic">
              <GitBranch size={12} /> Project Hierarchy
            </div>
            <h1 className="text-5xl font-black text-gray-900 tracking-tighter uppercase italic">
              Nodos de <span className="text-blue-600 not-italic">Subproyectos</span>
            </h1>
          </div>
          <div className="px-6 py-3 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">WBS Items Activos</span>
              <span className="text-2xl font-black text-blue-600 italic tracking-tighter">{subprojects.length} NODOS</span>
            </div>
            <div className="p-3 bg-blue-600 text-white rounded-xl">
              <Layers size={20} />
            </div>
          </div>
        </div>

        {/* Input Module */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-blue-500/5 border border-gray-100 overflow-hidden">
          <div className="px-10 py-6 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
            <h2 className="text-sm font-black text-gray-900 uppercase italic flex items-center gap-2">
              <Plus size={16} className="text-blue-600" /> Nuevo Nodo de Estructura
            </h2>
          </div>
          <div className="p-10 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className={labelClass}>Línea Madre / Proyecto</label>
                <select
                  className={inputClass}
                  value={newSubproject.project_id}
                  onChange={(e) => setNewSubproject({ ...newSubproject, project_id: e.target.value })}
                >
                  <option value="0">SELECCIONAR PROYECTO...</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Nombre del Subproyecto</label>
                <input
                  className={inputClass}
                  type="text"
                  placeholder="Ej. Tramo Óptico A-B"
                  value={newSubproject.nombre}
                  onChange={(e) => setNewSubproject({ ...newSubproject, nombre: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Especificaciones / Alcance</label>
                <input
                  className={inputClass}
                  type="text"
                  placeholder="Detalles específicos del nodo de trabajo"
                  value={newSubproject.descripcion}
                  onChange={(e) => setNewSubproject({ ...newSubproject, descripcion: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <button
                disabled={isSaving}
                className="px-10 py-4 bg-gray-900 hover:bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center gap-3 shadow-xl active:scale-95 disabled:bg-gray-400"
                onClick={handleCreateSubproject}
              >
                {isSaving ? <Activity size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                {isSaving ? 'Sincronizando...' : 'Registrar Subproyecto'}
              </button>
            </div>
          </div>
        </div>

        {/* List Module */}
        <div className="bg-[#0a0c10] rounded-[2.5rem] overflow-hidden border border-gray-800 shadow-2xl">
          <div className="px-10 py-8 border-b border-gray-800 bg-gray-900/40 backdrop-blur-2xl flex justify-between items-center">
            <h3 className="text-xl font-black text-white uppercase italic tracking-tight flex items-center gap-3">
              <FolderOpen size={20} className="text-blue-500" /> Libro Mayor de Subproyectos
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-900/80 border-b border-gray-800">
                  <th className="px-10 py-6 text-left text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Subproyecto / WBS</th>
                  <th className="px-10 py-6 text-left text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Asignación Maestra</th>
                  <th className="px-10 py-6 text-right text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Gestión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-900/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={3} className="py-20 text-center">
                      <Activity size={32} className="animate-spin text-blue-500 mx-auto" />
                    </td>
                  </tr>
                ) : subprojects.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-20 text-center text-gray-600 font-black uppercase italic tracking-widest text-xs">
                      No hay subproyectos en este ledger
                    </td>
                  </tr>
                ) : subprojects.map((subproject) => (
                  <tr key={subproject.id} className="group hover:bg-blue-600/[0.03] transition-all">
                    <td className="px-10 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-white group-hover:text-blue-400 transition-colors uppercase italic tracking-tight">{subproject.nombre}</span>
                        <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest mt-1 opacity-70">{subproject.descripcion}</span>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/10 text-blue-400 text-[10px] font-black uppercase tracking-widest border border-blue-600/20">
                        <FolderOpen size={10} />
                        {subproject.pro_nombre}
                      </div>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => router.push(`/subprojects/edit/${subproject.id}`)}
                          className="p-3 bg-gray-900 border border-gray-800 text-gray-500 hover:text-blue-400 hover:border-blue-500/30 rounded-2xl transition-all"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteSubproject(subproject.id)}
                          className="p-3 bg-gray-900 border border-gray-800 text-gray-500 hover:text-red-500 hover:border-red-500/30 rounded-2xl transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button className="p-3 bg-gray-900 border border-gray-800 text-gray-700 hover:text-white rounded-2xl transition-all opacity-20 group-hover:opacity-100">
                          <ChevronRight size={16} />
                        </button>
                      </div>
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

export default SubprojectsPage;
