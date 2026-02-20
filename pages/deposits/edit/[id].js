import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Layout } from 'components/Layout';

const EditDeposit = () => {
  const router = useRouter();
  const { id } = router.query;
  const [deposit, setDeposit] = useState({ nombre: '', codigo: '' });

  useEffect(() => {
    if (id) {
      fetchDeposit();
    }
  }, [id]);

  const fetchDeposit = async () => {
    const resp = await axios.get(`/api/deposits/${id}`);
    if (resp.data.status === 'success') {
      setDeposit(resp.data.deposit);
    }
  };

  const handleUpdate = async () => {
    if (!deposit.nombre || !deposit.codigo) {
      alert('Todos los campos son obligatorios');
      return;
    }
    await axios.put(`/api/deposits/${id}`, deposit);
    alert('Depósito actualizado correctamente');
    router.push('/deposits');
  };

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-4">Editar Depósito</h1>
      <input
        className="w-full px-4 py-2 mb-2 text-gray-700 bg-gray-200 rounded-md"
        type="text"
        placeholder="Nombre"
        value={deposit.nombre}
        onChange={(e) => setDeposit({ ...deposit, nombre: e.target.value })}
      />
      <input
        className="w-full px-4 py-2 mb-2 text-gray-700 bg-gray-200 rounded-md"
        type="text"
        placeholder="Código"
        value={deposit.codigo}
        onChange={(e) => setDeposit({ ...deposit, codigo: e.target.value })}
      />
      <button
        className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        onClick={handleUpdate}
      >
        Guardar Cambios
      </button>
      <button
        className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-700 ml-2"
        onClick={() => router.push('/deposits')}
      >
        Cancelar
      </button>
    </Layout>
  );
};

export default EditDeposit;
