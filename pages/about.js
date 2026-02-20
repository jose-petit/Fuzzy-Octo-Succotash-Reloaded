import React from 'react';
import Layout from '../components/Layout';

function about() {
  return (
    <Layout>
      <div className="text-center p-10">
        <h1 className="font-bold text-2xl my-4">Acerca de</h1>

        <p className="text-black-300">
          Prueba de CRUD para llevar almacen de materiales de Transporte Óptico - Inter
        </p>
      </div>
    </Layout>
  );
}

export default about;
