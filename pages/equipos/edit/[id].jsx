import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Layout } from 'components/Layout';

export default function EditEquipo() {
  const router = useRouter();
  const { id } = router.query;
  const [equipo, setEquipo] = useState(null);
  const [depositos, setDepositos] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [subproyectos, setSubproyectos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);

  useEffect(() => {
    if (id) {
      fetchEquipo();
    }
  }, [id]);

  useEffect(() => {
    if (equipo) {
      fetchData();
    }
  }, [equipo]);

  const fetchEquipo = async () => {
    const resp = await axios.get(`/api/equipos/${id}`);
    if (resp.data.status === 'success') {
      const fetched = resp.data.equipo;
      // Normalize fecha to YYYY-MM-DD
      if (fetched.fecha) {
        // If format dd/mm/yyyy
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(fetched.fecha)) {
          const [d, m, y] = fetched.fecha.split('/');
          fetched.fecha = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        } else {
          // ISO or other, take first 10 chars
          fetched.fecha = fetched.fecha.substring(0, 10);
        }
      } else {
        // Default to today
        fetched.fecha = new Date().toISOString().substring(0, 10);
      }
      setEquipo(fetched);
    }
  };

  const fetchData = async () => {
    if (!equipo) return;
    const [dep, pro, sub, usr] = await Promise.all([
      axios.get('/api/deposits'),
      axios.get('/api/projects'),
      axios.get(`/api/subprojects/by-project/${equipo.id_proyecto}`),
      axios.get('/api/users'),
    ]);
    setDepositos(dep.data.deposits);
    setProyectos(pro.data.projects);
    setSubproyectos(sub.data.subprojects);
    setUsuarios(usr.data.users);
  };

  const handleProyectoChange = async (projectId) => {
    setEquipo({ ...equipo, id_proyecto: projectId, id_sub_proyecto: '' });

    if (projectId === '') {
      setSubproyectos([]);
      return;
    }

    try {
      const resp = await axios.get(`/api/subprojects/by-project/${projectId}`);
      setSubproyectos(resp.data.subprojects || []);
    } catch (err) {
      console.error('Error al cargar subproyectos', err);
      setSubproyectos([]);
    }
  };

  const handleSave = async () => {
    if (!equipo) return;
    if (!equipo.id_deposito) {
      alert('Por favor, selecciona un depósito.');
      return;
    }
    if (!equipo.id_proyecto) {
      alert('Por favor, selecciona un proyecto.');
      return;
    }
    if (!equipo.id_sub_proyecto) {
      alert('Por favor, selecciona un subproyecto.');
      return;
    }
    if (!equipo.codigo_gx) {
      alert('Por favor, ingresa un código GX.');
      return;
    }
    if (!equipo.num_parte) {
      alert('Por favor, ingresa un número de parte.');
      return;
    }
    if (!equipo.cantidad) {
      alert('Por favor, ingresa una cantidad.');
      return;
    }
    // Auto-fill fecha if not provided
    if (!equipo.fecha) {
      equipo.fecha = new Date().toISOString().substring(0, 10);
    }
    if (!equipo.autorizado_solicitado_por) {
      alert('Por favor, selecciona un autorizado.');
      return;
    }
    await axios.put(`/api/equipos/${id}`, equipo);
    router.push('/equipos');
  };

  if (!equipo) return <Layout>Cargando...</Layout>;

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-4">Editar Equipo</h1>
      <div className="grid grid-cols-2 gap-3">
        {/* Fecha: default today's or fetched, editable */}
        <input
          type="date"
          value={equipo.fecha || ''}
          onChange={(e) => setEquipo({ ...equipo, fecha: e.target.value })}
          className="w-full px-4 py-2 mb-2 text-gray-700 bg-gray-200 rounded-md"
        />
        {/* ...existing form fields... */}
        <select
          value={equipo.id_deposito}
          onChange={(e) => setEquipo({ ...equipo, id_deposito: e.target.value })}
          className="w-full px-4 py-2 mb-2 text-gray-700 bg-gray-200 rounded-md"
        >
          <option value="">Depósito</option>
          {depositos.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nombre}
            </option>
          ))}
        </select>
        <select
          value={equipo.id_proyecto}
          onChange={(e) => handleProyectoChange(e.target.value)}
          className="w-full px-4 py-2 mb-2 text-gray-700 bg-gray-200 rounded-md"
        >
          <option value="">Proyecto</option>
          {proyectos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
        <select
          value={equipo.id_sub_proyecto}
          onChange={(e) => setEquipo({ ...equipo, id_sub_proyecto: e.target.value })}
          className="w-full px-4 py-2 mb-2 text-gray-700 bg-gray-200 rounded-md"
        >
          <option value="">Subproyecto</option>
          {subproyectos.map((sp) => (
            <option key={sp.id} value={sp.id}>
              {sp.nombre}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={equipo.codigo_gx}
          onChange={(e) => setEquipo({ ...equipo, codigo_gx: e.target.value })}
          placeholder="Código GX"
          className="w-full px-4 py-2 mb-2 text-gray-700 bg-gray-200 rounded-md"
        />
        <input
          type="text"
          value={equipo.num_parte}
          onChange={(e) => setEquipo({ ...equipo, num_parte: e.target.value })}
          placeholder="Número de Parte"
          className="w-full px-4 py-2 mb-2 text-gray-700 bg-gray-200 rounded-md"
        />
        <input
          type="number"
          value={equipo.cantidad}
          onChange={(e) => setEquipo({ ...equipo, cantidad: parseInt(e.target.value) })}
          placeholder="Cantidad"
          className="w-full px-4 py-2 mb-2 text-gray-700 bg-gray-200 rounded-md"
        />
        <textarea
          value={equipo.descripcion}
          onChange={(e) => setEquipo({ ...equipo, descripcion: e.target.value })}
          placeholder="Descripción"
          className="w-full px-4 py-2 mb-2 text-gray-700 bg-gray-200 rounded-md"
        />
        <textarea
          value={equipo.observacion}
          onChange={(e) => setEquipo({ ...equipo, observacion: e.target.value })}
          placeholder="Observación"
          className="w-full px-4 py-2 mb-2 text-gray-700 bg-gray-200 rounded-md"
        />
        <input
          type="text"
          value={equipo.ciudad || ''}
          onChange={(e) => setEquipo({ ...equipo, ciudad: e.target.value })}
          placeholder="Ciudad"
          className="w-full px-4 py-2 mb-2 text-gray-700 bg-gray-200 rounded-md"
        />
        <input
          type="date"
          value={equipo.fecha?.substring(0, 10) || ''}
          onChange={(e) => setEquipo({ ...equipo, fecha: e.target.value })}
          className="w-full px-4 py-2 mb-2 text-gray-700 bg-gray-200 rounded-md"
        />
        <select
          value={equipo.autorizado_solicitado_por}
          onChange={(e) => setEquipo({ ...equipo, autorizado_solicitado_por: e.target.value })}
          className="w-full px-4 py-2 mb-2 text-gray-700 bg-gray-200 rounded-md"
        >
          <option value="">Autoriza</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nombre}
            </option>
          ))}
        </select>
      </div>
      <button onClick={handleSave} className="mt-4 bg-green-600 text-white px-4 py-2 rounded">
        Guardar Cambios
      </button>
    </Layout>
  );
}
