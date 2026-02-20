import React, { useEffect, useState } from 'react';
import { Layout } from 'components/Layout';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Plus,
  Trash2,
  Edit3,
  Activity,
  Warehouse,
  ShieldCheck,
  ChevronRight,
  Database,
  MapPin
} from 'lucide-react';

const DepositsPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deposits, setDeposits] = useState([]);
  const [newDeposit, setNewDeposit] = useState({ nombre: '', codigo: '' });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status]);

  useEffect(() => {
    fetchDeposits();
  }, []);

  const fetchDeposits = async () => {
    try {
      setIsLoading(true);
      const resp = await axios.get('/api/deposits');
      if (resp.data.status === 'success') {
        setDeposits(resp.data.deposits);
      }
    } catch (error) {
      console.error('Error fetching deposits:', error);
      toast.error('Error al cargar depósitos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDeposit = async () => {
    if (!newDeposit.nombre || !newDeposit.codigo) {
      toast.error('Todos los campos son obligatorios');
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading('Sincronizando HUB/Depósito...');
    try {
      const resp = await axios.post('/api/deposits', newDeposit);
      if (resp.data.status === 'success') {
        toast.success('Centro logístico registrado 🏢', { id: toastId });
        setNewDeposit({ nombre: '', codigo: '' });
        fetchDeposits();
      } else {
        toast.error(resp.data.message || 'Error en el sistema', { id: toastId });
      }
    } catch (error) {
      console.error('Error creating deposit:', error);
      toast.error('Fallo en la conexión API', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDeposit = async (id) => {
    if (!confirm('¿Seguro que deseas eliminar este depósito industrial?')) return;
    const toastId = toast.loading('Eliminando registro maestro...');
    try {
      const resp = await axios.delete(`/api/deposits/${id}`);
      if (resp.data.status === 'success') {
        toast.success('Punto de depósito eliminado', { id: toastId });
        fetchDeposits();
      } else {
        toast.error(resp.data.message, { id: toastId });
      }
    } catch (error) {
      toast.error('Error crítico en eliminación', { id: toastId });
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
              <MapPin size={12} /> Logistics Network
            </div>
            <h1 className="text-5xl font-black text-gray-900 tracking-tighter uppercase italic">
              Centros de <span className="text-blue-600 not-italic">Depósito</span>
            </h1>
          </div>
          <div className="px-6 py-3 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Capacidad Instalada</span>
              <span className="text-2xl font-black text-blue-600 italic tracking-tighter">{deposits.length} SEDES</span>
            </div>
            <div className="p-3 bg-blue-600 text-white rounded-xl">
              <Warehouse size={20} />
            </div>
          </div>
        </div>

        {/* New Deposit Module */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-blue-500/5 border border-gray-100 overflow-hidden">
          <div className="px-10 py-6 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
            <h2 className="text-sm font-black text-gray-900 uppercase italic flex items-center gap-2">
              <Plus size={16} className="text-blue-600" /> Nuevo Punto de Recepción
            </h2>
          </div>
          <div className="p-10 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className={labelClass}>Nombre Comercial de la Sede</label>
                <div className="relative">
                  <input
                    className={inputClass}
                    type="text"
                    placeholder="Ej. Almacén Central Guacara"
                    value={newDeposit.nombre}
                    onChange={(e) => setNewDeposit({ ...newDeposit, nombre: e.target.value })}
                  />
                  <Database size={16} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Código Industrial / ID Interno</label>
                <div className="relative">
                  <input
                    className={inputClass}
                    type="text"
                    placeholder="Ej. HUB-001"
                    value={newDeposit.codigo}
                    onChange={(e) => setNewDeposit({ ...newDeposit, codigo: e.target.value })}
                  />
                  <ShieldCheck size={16} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20" />
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <button
                disabled={isSaving}
                className="px-10 py-4 bg-gray-900 hover:bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center gap-3 shadow-xl active:scale-95 disabled:bg-gray-400"
                onClick={handleCreateDeposit}
              >
                {isSaving ? <Activity size={16} className="animate-spin" /> : <Warehouse size={16} />}
                {isSaving ? 'Sincronizando...' : 'Habilitar Depósito'}
              </button>
            </div>
          </div>
        </div>

        {/* List Module */}
        <div className="bg-[#0a0c10] rounded-[2.5rem] overflow-hidden border border-gray-800 shadow-2xl">
          <div className="px-10 py-8 border-b border-gray-800 bg-gray-900/40 backdrop-blur-2xl">
            <h3 className="text-xl font-black text-white uppercase italic tracking-tight flex items-center gap-3">
              <Database size={20} className="text-blue-500" /> Libro de Activos Logísticos
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-900/80 border-b border-gray-800">
                  <th className="px-10 py-6 text-left text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Identificación</th>
                  <th className="px-10 py-6 text-left text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Referencia</th>
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
                ) : deposits.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-20 text-center text-gray-600 font-black uppercase italic tracking-widest text-xs">
                      No hay sedes registradas en el sistema.
                    </td>
                  </tr>
                ) : deposits.map((deposit) => (
                  <tr key={deposit.id} className="group hover:bg-blue-600/[0.03] transition-all">
                    <td className="px-10 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-white group-hover:text-blue-400 transition-colors uppercase italic tracking-tight">{deposit.nombre}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse"></div>
                          <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Active Hub Status</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <span className="text-xs font-black text-gray-500 font-mono tracking-tighter uppercase p-2 bg-gray-900 border border-gray-800 rounded-lg">{deposit.codigo}</span>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => router.push(`/deposits/edit/${deposit.id}`)}
                          className="p-3 bg-gray-900 border border-gray-800 text-gray-500 hover:text-blue-400 hover:border-blue-500/30 rounded-2xl transition-all"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteDeposit(deposit.id)}
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

export default DepositsPage;
