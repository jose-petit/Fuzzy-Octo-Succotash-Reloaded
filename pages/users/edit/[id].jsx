import React, { useEffect, useState } from 'react';
import { Layout } from 'components/Layout';
import { useRouter } from 'next/router';
import axios from 'axios';

export default function EditUser() {
  const router = useRouter();
  const { id } = router.query;
  const [user, setUser] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'usuario',
  });

  useEffect(() => {
    if (id) {
      fetchUser();
    }
  }, [id]);

  const fetchUser = async () => {
    try {
      const resp = await axios.get(`/api/users/${id}`);
      console.log('Resp edit: ', resp.data);
      if (resp.data.status === 'success') {
        setUser(resp.data.user);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const handleUpdateUser = async () => {
    if (user.nombre === '') {
      alert('El nombre es requerido');
      return;
    }
    if (user.email === '') {
      alert('El email es requerido');
      return;
    }
    if (user.password === '') {
      alert('La contraseña es requerida');
      return;
    }
    const resp = await axios.put(`/api/users/${id}`, user);
    if (resp.data.status === 'success') alert(resp.data.message);
    router.push('/users');
  };

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-4">Editar Usuario</h1>

      <div className="space-y-2">
        <input
          className="w-full px-4 py-2 text-gray-700 bg-gray-200 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          type="text"
          placeholder="Nombre"
          value={user.nombre}
          onChange={(e) => setUser({ ...user, nombre: e.target.value })}
        />
        <input
          className="w-full px-4 py-2 text-gray-700 bg-gray-200 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          type="email"
          placeholder="Email"
          value={user.email}
          onChange={(e) => setUser({ ...user, email: e.target.value })}
        />
        <input
          className="w-full px-4 py-2 text-gray-700 bg-gray-200 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          type="password"
          placeholder="Contraseña"
          value={user.password}
          onChange={(e) => setUser({ ...user, password: e.target.value })}
        />
        <select
          className="w-full px-4 py-2 text-gray-700 bg-gray-200 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          onChange={(e) => setUser({ ...user, rol: e.target.value })}
          value={user.rol}
        >
          <option value="usuario">Usuario</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <button
        className="mt-4 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-700 w-full"
        onClick={handleUpdateUser}
      >
        Guardar Cambios
      </button>
    </Layout>
  );
}
