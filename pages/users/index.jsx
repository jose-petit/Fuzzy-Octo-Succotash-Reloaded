import React, { useEffect, useState } from 'react';
import { Layout } from 'components/Layout';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Users,
  Plus,
  Trash2,
  Edit3,
  Activity,
  ShieldCheck,
  Mail,
  Lock,
  UserPlus,
  Search,
  ChevronRight,
  Fingerprint
} from 'lucide-react';

const UsersPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [newUser, setNewUser] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'usuario',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const resp = await axios.get('/api/users');
      if (resp.data.status === 'success') {
        setUsers(resp.data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error al sincronizar base de datos de personal');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.nombre || !newUser.email || !newUser.password) {
      toast.error('Todos los campos de identidad son requeridos');
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading('Encriptando credenciales y creando perfil...');
    try {
      const resp = await axios.post('/api/users', newUser);
      if (resp.data.status === 'success') {
        toast.success('Acceso concedido al nuevo operador 🔑', { id: toastId });
        setNewUser({ nombre: '', email: '', password: '', rol: 'usuario' });
        fetchUsers();
      } else {
        toast.error(resp.data.message || 'Fallo en la validación de seguridad', { id: toastId });
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(error.response?.data?.message || 'Error de protocolo en API', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!confirm('¿Seguro que deseas revocar el acceso a este usuario?')) return;
    const toastId = toast.loading('Eliminando perfiles de acceso...');
    try {
      const resp = await axios.delete(`/api/users/${id}`);
      if (resp.data.status === 'success') {
        toast.success('Permisos revocados con éxito', { id: toastId });
        fetchUsers();
      } else {
        toast.error(resp.data.message, { id: toastId });
      }
    } catch (error) {
      toast.error('Error crítico de red', { id: toastId });
    }
  };

  const filteredUsers = users.filter((user) =>
    user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.rol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const inputClass = "w-full px-5 py-3 bg-white/40 border border-gray-200/50 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-bold text-gray-700 backdrop-blur-sm shadow-inner";
  const labelClass = "block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1";

  if (status === 'loading') return null;

  return (
    <Layout>
      <div className="max-w-[1400px] mx-auto px-4 py-12 animate-fade-in space-y-12">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-gray-100 pb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-tighter mb-4 border border-blue-100 italic">
              <ShieldCheck size={12} /> Access Management
            </div>
            <h1 className="text-5xl font-black text-gray-900 tracking-tighter uppercase italic">
              Directorio de <span className="text-blue-600 not-italic">Operadores</span>
            </h1>
          </div>
          <div className="px-6 py-3 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Personal Autorizado</span>
              <span className="text-2xl font-black text-blue-600 italic tracking-tighter">{users.length} CUENTAS</span>
            </div>
            <div className="p-3 bg-blue-600 text-white rounded-xl">
              <Users size={20} />
            </div>
          </div>
        </div>

        {/* Create User Module */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-blue-500/5 border border-gray-100 overflow-hidden">
          <div className="px-10 py-6 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
            <h2 className="text-sm font-black text-gray-900 uppercase italic flex items-center gap-2">
              <Plus size={16} className="text-blue-600" /> Registro de Identidad Nueva
            </h2>
          </div>
          <div className="p-10 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className={labelClass}>Nombre Completo</label>
                <div className="relative">
                  <input
                    className={inputClass}
                    type="text"
                    placeholder="Ej. Jose Petit"
                    value={newUser.nombre}
                    onChange={(e) => setNewUser({ ...newUser, nombre: e.target.value })}
                  />
                  <Fingerprint size={16} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Correo Corporativo</label>
                <div className="relative">
                  <input
                    className={inputClass}
                    type="email"
                    placeholder="usuario@tuempresa.com"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  />
                  <Mail size={16} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Contraseña Segura</label>
                <div className="relative">
                  <input
                    className={inputClass}
                    type="password"
                    placeholder="••••••••"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  />
                  <Lock size={16} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Rol de Sistema</label>
                <select
                  className={inputClass}
                  onChange={(e) => setNewUser({ ...newUser, rol: e.target.value })}
                  value={newUser.rol}
                >
                  <option value="usuario">OPERADOR ESTÁNDAR</option>
                  <option value="admin">ADMINISTRADOR MAESTRO</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <button
                disabled={isSaving}
                className="px-10 py-4 bg-gray-900 hover:bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center gap-3 shadow-xl active:scale-95 disabled:bg-gray-400"
                onClick={handleCreateUser}
              >
                {isSaving ? <Activity size={16} className="animate-spin" /> : <UserPlus size={16} />}
                {isSaving ? 'Sincronizando...' : 'Habilitar Cuenta'}
              </button>
            </div>
          </div>
        </div>

        {/* List Module */}
        <div className="bg-[#0a0c10] rounded-[2.5rem] overflow-hidden border border-gray-800 shadow-2xl">
          <div className="px-10 py-8 border-b border-gray-800 bg-gray-900/40 backdrop-blur-2xl flex flex-col md:flex-row justify-between items-center gap-6">
            <h3 className="text-xl font-black text-white uppercase italic tracking-tight flex items-center gap-3">
              <ShieldCheck size={20} className="text-blue-500" /> Libro Mayor de Accesos
            </h3>

            <div className="relative w-full md:w-96 group">
              <input
                type="text"
                placeholder="Filtrar por nombre, correo o rol..."
                className="w-full bg-gray-950 border border-gray-800 rounded-2xl px-12 py-3 text-xs font-bold text-gray-300 outline-none focus:ring-4 focus:ring-blue-600/20 focus:border-blue-600 transition-all placeholder:text-gray-600"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-blue-500 transition-colors" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-900/80 border-b border-gray-800">
                  <th className="px-10 py-6 text-left text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Identidad / Credenciales</th>
                  <th className="px-10 py-6 text-left text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Nivel de Acceso</th>
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
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-20 text-center text-gray-600 font-black uppercase italic tracking-widest text-xs">
                      No se encontraron registros en este segmento
                    </td>
                  </tr>
                ) : filteredUsers.map((user) => (
                  <tr key={user.id} className="group hover:bg-blue-600/[0.03] transition-all">
                    <td className="px-10 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-white group-hover:text-blue-400 transition-colors uppercase italic tracking-tight">{user.nombre}</span>
                        <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest mt-1 opacity-70">{user.email}</span>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${user.rol === 'admin'
                          ? 'bg-blue-600/10 text-blue-400 border-blue-600/20'
                          : 'bg-gray-800/10 text-gray-500 border-gray-700/20'
                        }`}>
                        {user.rol === 'admin' ? <ShieldCheck size={10} /> : <Users size={10} />}
                        {user.rol}
                      </div>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => router.push(`/users/edit/${user.id}`)}
                          className="p-3 bg-gray-900 border border-gray-800 text-gray-500 hover:text-blue-400 hover:border-blue-500/30 rounded-2xl transition-all"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
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

export default UsersPage;
