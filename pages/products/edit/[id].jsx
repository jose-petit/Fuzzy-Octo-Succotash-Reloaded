import { ProductForm } from 'components/ProductForm';
import axios from 'axios';
import { useState } from 'react';
import { useRouter } from 'next/router';

const EditPage = ({ id = {} }) => {
  return <ProductForm />;
};

export default EditPage;

export const getServerSideProps = async ({ params }) => {
  const { data: product } = await axios.get(`http://localhost:3000/api/products/${params.id}`);

  return {
    props: {
      product,
    },
  };
};
