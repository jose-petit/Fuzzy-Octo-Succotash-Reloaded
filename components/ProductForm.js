import axios from 'axios';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/router';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import moment from 'moment';

export function ProductForm({ onSubmit }) {
  const [product, setProduct] = useState({
    id: '',
    ciudad: '',
    proyecto: '',
    num_sub_proyecto: '',
    sub_proyecto: '',
    codigo_gx: '',
    num_parte: '',
    descripcion: '',
    observacion: '',
    cantidad: 0,
    autorizado_solicitado_por: '',
    fecha: moment(new Date()).format('YYYY-MM-DD'),
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const isEditing = Boolean(router.query.id);

  useEffect(() => {
    const fetchProduct = async (id) => {
      try {
        const { data } = await axios.get('/api/products/' + id);
        setProduct(data[0]);
      } catch (error) {
        console.error(error);
      }
    };

    if (isEditing) {
      fetchProduct(router.query.id);
    }
  }, [router.query.id]);

  const handleChange = ({ target: { name, value } }) => setProduct({ ...product, [name]: value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validaciones básicas de campos obligatorios
    if (!product.ciudad || !product.proyecto || !product.descripcion || !product.cantidad) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }
    try {
      setIsSubmitting(true);
      if (isEditing) {
        await axios.put('/api/products/' + router.query.id, product);
        toast.success('Producto actualizado', { position: 'bottom-center' });
      } else {
        await axios.post('/api/products', product);
        toast.success('Producto guardado', { position: 'bottom-center' });
      }

      router.push('/products');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al guardar');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-xs mx-auto">
      <form
        className="bg-white dark:bg-gray-800 shadow-md rounded px-8 pt-6 pb-8 mb-4"
        onSubmit={handleSubmit}
      >
        {/* Mostrar ID solo en edición */}
        {isEditing && (
          <div className="mb-4">
            <label
              htmlFor="id"
              className="block text-gray-700 dark:text-white text-sm font-bold mb-2"
            >
              ID
            </label>
            <input
              readOnly
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-500 bg-gray-200 cursor-not-allowed"
              type="text"
              id="id"
              name="id"
              value={product.id}
            />
          </div>
        )}

        <div className="mb-4">
          <label
            htmlFor="ciudad"
            className="block text-gray-700 dark:text-white font-bold mb-2 text-sm"
          >
            Ciudad<span className="text-red-500">*</span>
          </label>
          <input
            required
            type="text"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-600 dark:border-slate-900 dark:text-white"
            name="ciudad"
            placeholder="Ciudad"
            onChange={handleChange}
            value={product.ciudad}
          />
        </div>

        <div className="mb-2">
          <label
            htmlFor="proyecto"
            className="block text-gray-700 dark:text-white font-bold mb-2 text-sm"
          >
            Proyecto
          </label>
          <textarea
            name="proyecto"
            id="proyecto"
            rows="2"
            placeholder="Proyecto"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-600 dark:border-slate-900 dark:text-white"
            onChange={handleChange}
            value={product.proyecto}
          ></textarea>
        </div>

        <div className="mb-4">
          <label
            className="block text-gray-700 dark:text-white text-sm font-bold mb-2"
            htmlFor="num_sub_proyecto"
          >
            Número del Subproyecto
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-600 dark:border-slate-900 dark:text-white"
            type="text"
            placeholder="Número del Subproyecto"
            id="num_sub_proyecto"
            name="num_sub_proyecto"
            onChange={handleChange}
            value={product.num_sub_proyecto}
            autoComplete="off"
          />
        </div>

        <div className="mb-4">
          <label
            className="block text-gray-700 dark:text-white text-sm font-bold mb-2"
            htmlFor="sub_proyecto"
          >
            Subproyecto
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-600 dark:border-slate-900 dark:text-white"
            type="text"
            placeholder="Subproyecto"
            id="sub_proyecto"
            name="sub_proyecto"
            onChange={handleChange}
            value={product.sub_proyecto}
            autoComplete="off"
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="codigo_gx"
            className="block text-gray-700 dark:text-white font-bold mb-2 text-sm"
          >
            Código GX
          </label>
          <input
            type="text"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-600 dark:border-slate-900 dark:text-white"
            name="codigo_gx"
            placeholder="Código GX"
            onChange={handleChange}
            value={product.codigo_gx}
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="num_parte"
            className="block text-gray-700 dark:text-white font-bold mb-2 text-sm"
          >
            Número de Parte
          </label>
          <input
            type="text"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-600 dark:border-slate-900 dark:text-white"
            name="num_parte"
            placeholder="Número de Parte"
            onChange={handleChange}
            value={product.num_parte}
          />
        </div>

        <div className="mb-2">
          <label
            htmlFor="descripcion"
            className="block text-gray-700 dark:text-white font-bold mb-2 text-sm"
          >
            Descripción<span className="text-red-500">*</span>
          </label>
          <textarea
            required
            name="descripcion"
            id="descripcion"
            rows="3"
            placeholder="Descripción"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-600 dark:border-slate-900 dark:text-white"
            onChange={handleChange}
            value={product.descripcion}
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="observacion"
            className="block text-gray-700 dark:text-white font-bold mb-2 text-sm"
          >
            Observación
          </label>
          <input
            type="text"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-600 dark:border-slate-900 dark:text-white"
            name="observacion"
            placeholder="Observación"
            onChange={handleChange}
            value={product.observacion}
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="cantidad"
            className="block text-gray-700 dark:text-white font-bold mb-2 text-sm"
          >
            Cantidad<span className="text-red-500">*</span>
          </label>
          <input
            required
            type="number"
            min="0"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-600 dark:border-slate-900 dark:text-white"
            name="cantidad"
            onChange={handleChange}
            value={product.cantidad}
          />
        </div>

        <div className="mb-2">
          <label
            htmlFor="autorizado_solicitado_por"
            className="block text-gray-700 dark:text-white font-bold mb-2 text-sm"
          >
            Autorizado/Solicitado por
          </label>
          <textarea
            name="autorizado_solicitado_por"
            id="autorizado_solicitado_por"
            rows="2"
            placeholder="Autorizado/Solicitado por"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-600 dark:border-slate-900 dark:text-white"
            onChange={handleChange}
            value={product.autorizado_solicitado_por}
          ></textarea>
        </div>
        <div className="mb-4">
          <label
            htmlFor="fecha"
            className="block text-gray-700 dark:text-white font-bold mb-2 text-sm"
          >
            Fecha
          </label>
          <input
            type="date"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-600 dark:border-slate-900 dark:text-white"
            name="fecha"
            value={moment(new Date(product.fecha)).format('YYYY-MM-DD').toString()}
            onChange={handleChange}
          />
        </div>
        <div className="flex items-center justify-between">
          <button
            disabled={isSubmitting}
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            type="submit"
          >
            {isSubmitting
              ? isEditing
                ? 'Actualizando...'
                : 'Guardando...'
              : isEditing
                ? 'Actualizar'
                : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ProductForm;
