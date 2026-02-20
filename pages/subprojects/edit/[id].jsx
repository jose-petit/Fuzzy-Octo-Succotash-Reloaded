import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Layout } from 'components/Layout';
import axios from 'axios';

const EditSubprojectPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [subproject, setSubproject] = useState({
    nombre: '',
    descripcion: '',
    estado: 'activo',
    project_id: '0',
  });

  useEffect(() => {
    if (id) {
      fetchSubproject();
      fetchProjects();
    }
  }, [id]);

  const fetchSubproject = async () => {
    try {
      setIsLoading(true);
      const resp = await axios.get(`/api/subprojects/${id}`);
      setIsLoading(false);
      if (resp.data.status === 'success') {
        setSubproject(resp.data.subproject);
      }
    } catch (error) {
      console.error('Error fetching subproject:', error);
    }
  };

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

  const handleUpdateSubproject = async () => {
    if (subproject.project_id === '0') {
      alert('Selecciona un proyecto');
      return;
    }
    if (subproject.nombre === '') {
      alert('Ingresa un nombre');
      return;
    }
    if (subproject.descripcion === '') {
      alert('Ingresa una descripción');
      return;
    }

    try {
      const resp = await axios.put(`/api/subprojects/${id}`, subproject);
      if (resp.data.status === 'success') {
        alert('Subproyecto actualizado con éxito');
        router.push('/subprojects');
      } else {
        alert('Error actualizando subproyecto');
      }
    } catch (error) {
      console.error('Error updating subproject:', error);
    }
  };

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-4">Editar Subproyecto</h1>
      {isLoading ? (
        <p>Cargando...</p>
      ) : (
        <div className="bg-gray-100 p-4 rounded-lg shadow-lg">
          <div className="grid grid-cols-2 gap-2">
            <input
              className="w-full px-4 py-2 text-gray-700 bg-gray-200 rounded-md"
              type="text"
              placeholder="Nombre"
              value={subproject.nombre}
              onChange={(e) => setSubproject({ ...subproject, nombre: e.target.value })}
            />
            <input
              className="w-full px-4 py-2 text-gray-700 bg-gray-200 rounded-md"
              type="text"
              placeholder="Descripción"
              value={subproject.descripcion}
              onChange={(e) => setSubproject({ ...subproject, descripcion: e.target.value })}
            />
            <select
              className="w-full px-4 py-2 text-gray-700 bg-gray-200 rounded-md"
              value={subproject.project_id}
              onChange={(e) => setSubproject({ ...subproject, project_id: e.target.value })}
            >
              <option value="0">Selecciona un proyecto</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.nombre}
                </option>
              ))}
            </select>
          </div>
          <button
            className="mt-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            onClick={handleUpdateSubproject}
          >
            Actualizar Subproyecto
          </button>
        </div>
      )}
    </Layout>
  );
};

export default EditSubprojectPage;
