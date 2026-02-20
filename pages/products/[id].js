import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { Layout } from 'components/Layout';
import moment from 'moment';

function ProductPage({ product }) {
  const router = useRouter();

  const handleDelete = async (id) => {
    try {
      await axios.delete('/api/products/' + id);
      toast.success('Task deleted');
      router.push('/');
    } catch (error) {
      console.error(error.response.data.message);
    }
  };

  return (
    <Layout>
      <div className="p-6 bg-white dark:bg-gray-800">
        <p>ID: {product[0].id}</p>
        <p>Ciudad: {product[0].ciudad}</p>
        <p>Proyecto: {product[0].proyecto}</p>
        <p>Número de sub-proyecto: {product[0].num_sub_proyecto}</p>
        <p>Sub-proyecto: {product[0].sub_proyecto}</p>
        <p>Código GX: {product[0].codigo_gx}</p>
        <p>Número de parte: {product[0].num_parte}</p>
        <p>Descripción: {product[0].descripcion}</p>
        <p>Observación: {product[0].observacion}</p>
        <p>Cantidad: {product[0].cantidad}</p>
        <p>Autorizado o solicitado por: {product[0].autorizado_solicitado_por}</p>
        <p>Fecha: {moment(product[0].fecha).format('DD-MM--YYYY')}</p>
      </div>

      <div className="mt-7 flex justify-center">
        <button
          className="bg-red-500 hover:bg-red-700 py-2 px-3 rounded"
          onClick={() => handleDelete(product[0].id)}
        >
          delete
        </button>
        <button
          className="bg-gray-500 hover:bg-gray-800 ml-2 py-2 px-5 rounded"
          onClick={() => router.push('/products/edit/' + product[0].id)}
        >
          Edit
        </button>
      </div>
    </Layout>
  );
}

export const getServerSideProps = async ({ query }) => {
  const { data: product } = await axios.get('http://localhost:3000/api/products/' + query.id);

  console.log(product);

  return {
    props: {
      product,
    },
  };
};

export default ProductPage;
