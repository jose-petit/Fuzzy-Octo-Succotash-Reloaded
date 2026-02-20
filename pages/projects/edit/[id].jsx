import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { Layout } from 'components/Layout';
import toast from 'react-hot-toast';
import {
  Save,
  ArrowLeft,
  Briefcase,
  Activity,
  ShieldCheck,
  FileText,
  Clock
} from 'lucide-react';

const EditProject = () => {
  const router = useRouter();
  const { id } = router.query;

  const [project, setProject] = useState({
    nombre: '',
    descripcion: '',
    estado: 'activo',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProject();
    }
  }, [id]);

  const fetchProject = async () => {
    try {
      setIsLoading(true);
      const resp = await axios.get(`/api/projects/${id}`);
      if (resp.data.status === 'success') {
        setProject(resp.data.project);
      } else {
        toast.error('Proyecto no encontrado');
        router.push('/projects');
      }
    } catch (error) {
      toast.error('Error al cargar datos del proyecto');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!project.nombre || !project.descripcion) {
      toast.error('Todos los campos son obligatorios');
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading('Actualizando registro maestro...');
    try {
      const resp = await axios.put(`/api/projects/${id}`, project);
      if (resp.data.status === 'success') {
        toast.success('Cambios sincronizados con éxito 📂', { id: toastId });
        router.push('/projects');
      } else {
        toast.error(resp.data.message || 'Error en la actualización', { id: toastId });
      }
    } catch (error) {
      toast.error('Error de red al actualizar', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = "w-full px-5 py-3 bg-white/40 border border-gray-200/50 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-bold text-gray-700 backdrop-blur-sm shadow-inner";
  const labelClass = "block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1";

  if (isLoading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
          <Activity size={40} className="text-blue-600 animate-spin" />
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest animate-pulse">Cargando Registro...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-[1000px] mx-auto px-4 py-12 animate-fade-in space-y-10">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-100 pb-10">
          <div className="flex items-center gap-6">
            <button
              onClick={() => router.push('/projects')}
              className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-100 hover:text-blue-600 transition-all active:scale-95"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-tighter mb-2 border border-blue-100">
                <ShieldCheck size={12} /> Master File Editor
              </div>
              <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic">
                Editar <span className="text-blue-600 not-italic">Proyecto</span>
              </h1>
            </div>
          </div>
          <div className="px-6 py-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">ID Registro</span>
              <span className="text-xl font-black text-gray-900 italic tracking-tighter">PRJ-{id}</span>
            </div>
          </div>
        </div>

        {/* Form Panel */}
        <div className="bg-white rounded-[3rem] shadow-2xl shadow-blue-500/5 border border-gray-100 overflow-hidden relative">
          <div className="px-12 py-8 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
            <h2 className="text-sm font-black text-gray-900 uppercase italic flex items-center gap-3">
              <Briefcase size={18} className="text-blue-600" /> Atributos de la Línea
            </h2>
            <div className="flex items-center gap-2 text-[10px] font-black text-gray-300 uppercase tracking-widest">
              <Clock size={12} /> Auto-Sync enabled
            </div>
          </div>

          <div className="p-12 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="group/input">
                <label className={labelClass}>Denominación del Proyecto</label>
                <div className="relative">
                  <input
                    className={inputClass}
                    type="text"
                    value={project.nombre}
                    onChange={(e) => setProject({ ...project, nombre: e.target.value })}
                  />
                  <FileText size={16} className="absolute right-5 top-1/2 -translate-y-1/2 opacity-20" />
                </div>
              </div>

              <div className="group/input">
                <label className={labelClass}>Estatus de Operación</label>
                <select
                  className={inputClass}
                  value={project.estado}
                  onChange={(e) => setProject({ ...project, estado: e.target.value })}
                >
                  <option value="activo">LÍNEA ACTIVA</option>
                  <option value="inactivo">LÍNEA INACTIVA / ARCHIVADA</option>
                </select>
              </div>

              <div className="md:col-span-2 group/input">
                <label className={labelClass}>Descripción Técnica y Alcance</label>
                <textarea
                  className={`${inputClass} min-h-[120px] resize-none`}
                  value={project.descripcion}
                  onChange={(e) => setProject({ ...project, descripcion: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-10 pt-10 border-t border-gray-50 flex justify-between items-center">
              <p className="text-[10px] font-medium text-gray-400 max-w-[300px]">
                Nota: La modificación de este registro afectará a todos los subproyectos y equipos asociados.
              </p>
              <button
                disabled={isSaving}
                className="px-12 py-4 bg-gray-900 hover:bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center gap-4 shadow-xl active:scale-95 disabled:bg-gray-400"
                onClick={handleUpdate}
              >
                {isSaving ? <Activity size={18} className="animate-spin" /> : <Save size={18} />}
                {isSaving ? 'SINCRO EN CURSO...' : 'Actualizar Maestro'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default EditProject;
