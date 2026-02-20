import React, { useEffect, useState } from 'react';
import { Layout } from 'components/Layout';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Briefcase,
  Plus,
  Trash2,
  Edit3,
  Search,
  Activity,
  FolderOpen,
  Calendar,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

const ProjectsPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [newProject, setNewProject] = useState({
    nombre: '',
    descripcion: '',
    estado: 'activo',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status]);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const resp = await axios.get('/api/projects');
      if (resp.data.status === 'success') {
        setProjects(resp.data.projects);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Error al cargar proyectos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProject.nombre || !newProject.descripcion) {
      toast.error('Todos los campos son obligatorios');
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading('Sincronizando proyecto...');
    try {
      const resp = await axios.post('/api/projects', newProject);
      if (resp.data.status === 'success') {
        toast.success('Proyecto registrado correctamente 📂', { id: toastId });
        setNewProject({ nombre: '', descripcion: '', estado: 'activo' });
        fetchProjects();
      } else {
        toast.error(resp.data.message || 'Error al crear proyecto', { id: toastId });
      }
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Error de red al crear proyecto', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProject = async (id) => {
    if (!confirm('¿Seguro que deseas eliminar este proyecto industrial?')) return;
    const toastId = toast.loading('Eliminando registro...');
    try {
      const resp = await axios.delete(`/api/projects/${id}`);
      if (resp.data.status === 'success') {
        toast.success('Registro eliminado', { id: toastId });
        fetchProjects();
      } else {
        toast.error(resp.data.message, { id: toastId });
      }
    } catch (error) {
      toast.error('Error en eliminación', { id: toastId });
    }
  };

  const filteredProjects = projects.filter(p =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              <Plus size={12} /> Industrial Assets
            </div>
            <h1 className="text-5xl font-black text-gray-900 tracking-tighter uppercase italic">
              Gestión de <span className="text-blue-600 not-italic">Proyectos</span>
            </h1>
          </div>
          <div className="px-6 py-3 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Líneas de Trabajo</span>
              <span className="text-2xl font-black text-blue-600 italic tracking-tighter">{projects.length} PROYECTOS</span>
            </div>
            <div className="p-3 bg-blue-600 text-white rounded-xl">
              <Briefcase size={20} />
            </div>
          </div>
        </div>

        {/* Input Module */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-blue-500/5 border border-gray-100 overflow-hidden">
          <div className="px-10 py-6 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
            <h2 className="text-sm font-black text-gray-900 uppercase italic flex items-center gap-2">
              <Plus size={16} className="text-blue-600" /> Registro de Nueva Línea
            </h2>
          </div>
          <div className="p-10 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className={labelClass}>Nombre del Proyecto</label>
                <input
                  className={inputClass}
                  type="text"
                  placeholder="Ej. Backbone Regional Sur"
                  value={newProject.nombre}
                  onChange={(e) => setNewProject({ ...newProject, nombre: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Descripción / Alcance</label>
                <input
                  className={inputClass}
                  type="text"
                  placeholder="Definición técnica del proyecto"
                  value={newProject.descripcion}
                  onChange={(e) => setNewProject({ ...newProject, descripcion: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                disabled={isSaving}
                className="px-10 py-4 bg-gray-900 hover:bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center gap-3 shadow-xl active:scale-95 disabled:bg-gray-400"
                onClick={handleCreateProject}
              >
                {isSaving ? <Activity size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                {isSaving ? 'Sincronizando...' : 'Registrar Proyecto'}
              </button>
            </div>
          </div>
        </div>

        {/* List Module */}
        <div className="bg-[#0a0c10] rounded-[2.5rem] overflow-hidden border border-gray-800 shadow-2xl">
          <div className="p-8 border-b border-gray-800 flex flex-col md:flex-row gap-6 justify-between items-center bg-gray-900/40">
            <h3 className="text-lg font-black text-white uppercase italic flex items-center gap-3">
              <FolderOpen size={20} className="text-blue-500" /> Directorio de Proyectos
            </h3>
            <div className="relative w-full md:w-80">
              <input
                className="w-full pl-12 pr-6 py-3 bg-gray-800/50 border border-gray-700 rounded-2xl text-white text-xs font-bold outline-none focus:border-blue-500 transition-all"
                type="text"
                placeholder="Filtrar por nombre o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-900/80 border-b border-gray-800">
                  <th className="px-8 py-5 text-left text-[9px] font-black text-gray-500 uppercase tracking-widest">Proyecto</th>
                  <th className="px-8 py-5 text-left text-[9px] font-black text-gray-500 uppercase tracking-widest">Información de Alcance</th>
                  <th className="px-8 py-5 text-left text-[9px] font-black text-gray-500 uppercase tracking-widest">Estatus</th>
                  <th className="px-8 py-5 text-right text-[9px] font-black text-gray-500 uppercase tracking-widest">Gestión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/30">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="py-20 text-center">
                      <Activity size={32} className="animate-spin text-blue-500 mx-auto" />
                    </td>
                  </tr>
                ) : filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-20 text-center text-gray-600 font-black uppercase italic tracking-widest text-xs">
                      No se encontraron registros activos
                    </td>
                  </tr>
                ) : filteredProjects.map((project) => (
                  <tr key={project.id} className="group hover:bg-blue-600/[0.03] transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-white group-hover:text-blue-400 transition-colors uppercase italic">{project.nombre}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar size={10} className="text-gray-600" />
                          <span className="text-[9px] text-gray-600 font-black uppercase tracking-tighter">Reg: Industrial_v1</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-tight line-clamp-1">{project.descripcion}</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase tracking-widest border border-emerald-500/20">
                        <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div>
                        {project.estado || 'ACTIVO'}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => router.push(`/projects/edit/${project.id}`)}
                          className="p-2.5 bg-gray-800 border border-gray-700 text-gray-500 hover:text-blue-400 hover:border-blue-500/30 rounded-xl transition-all"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteProject(project.id)}
                          className="p-2.5 bg-gray-800 border border-gray-700 text-gray-500 hover:text-red-500 hover:border-red-500/30 rounded-xl transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                        <button className="p-2.5 bg-gray-800 border border-gray-700 text-gray-600 rounded-xl opacity-20 group-hover:opacity-100 transition-all">
                          <ChevronRight size={14} />
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

export default ProjectsPage;
