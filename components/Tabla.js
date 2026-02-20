import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { useRouter } from 'next/router';

function Tabla(prods) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setProducts(prods.products);
    setIsLoading(prods.isLoading);
  }, [prods.products, prods.isLoading]);

  const searchHandler = (searchTerm) => {
    setSearchTerm(searchTerm);
    if (searchTerm !== '') {
      const newProductList = products.filter((product) => {
        return Object.values(product).join(' ').toLowerCase().includes(searchTerm.toLowerCase());
      });
      setProducts(newProductList);
    } else {
      setProducts(prods.products);
    }
  };

  const goEditForm = (id) => {
    router.push(`/equipos/edit/${id}`);
  };

  const handleExportExcel = () => {
    try {
      // Map current visible products to a flat structure matching table columns
      const rows = products.map((p, idx) => ({
        '#': idx + 1,
        'Código GX': p.codigo_gx || '',
        Depósito: p.deposito_nombre || '',
        Proyecto: p.proyecto_nombre || '',
        'Sub Proyecto': p.subproyecto_nombre || '',
        Descripción: p.descripcion || '',
        Observación: p.observacion || '',
        Cantidad: p.cantidad ?? '',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Productos');
      XLSX.writeFile(wb, `productos_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) {
      console.error('Error exporting to Excel:', e);
      alert('No se pudo exportar a Excel.');
    }
  };

  return (
    <>
      <label htmlFor="table-search" className="sr-only">
        Busqueda
      </label>
      <div className="relative mt-1 flex gap-2 items-center">
        {/* Input de búsqueda */}
        <input
          id="table-search"
          className="w-full px-4 py-2 text-gray-700 bg-gray-200 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          type="text"
          placeholder="Buscar"
          value={searchTerm}
          onChange={(e) => searchHandler(e.target.value)}
        />
        <button
          className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md whitespace-nowrap"
          onClick={handleExportExcel}
          type="button"
          title="Exportar Excel"
        >
          Exportar Excel
        </button>
      </div>
      <table className="w-full">
        <thead>
          {/* Encabezados de la tabla */}
          <tr>
            <th className="py-3 px-3 whitespace-nowrap">#</th>
            <th className="py-3 px-3 whitespace-nowrap">Código GX</th>
            <th className="py-3 px-3 whitespace-nowrap">Depósito</th>
            <th className="py-3 px-3 whitespace-nowrap">Proyecto</th>
            <th className="py-3 px-3 whitespace-nowrap">Sub Proyecto</th>
            <th className="py-3 px-3 whitespace-nowrap">Descripción</th>
            <th className="py-3 px-3 whitespace-nowrap">Observación</th>
            <th className="py-3 px-3 whitespace-nowrap">Cantidad</th>
          </tr>
        </thead>
        <tbody>
          {/* Contenido de la tabla */}
          {isLoading && (
            <tr className="border-b border-gray-200">
              <td
                className="py-3 px-3 whitespace-nowrap"
                colSpan={8} // match visible columns count
              >
                <div className="flex items-center">
                  <span className="font-medium">Cargando...</span>
                </div>
              </td>
            </tr>
          )}
          {products.length === 0 && !isLoading && (
            <tr className="border-b border-gray-200">
              <td className="py-3 px-3 whitespace-nowrap" colSpan={8}>
                <div className="flex items-center">
                  <span className="font-medium">No hay productos</span>
                </div>
              </td>
            </tr>
          )}
          {products.map((product, index) => (
            <tr
              key={product.id}
              className="border-b border-gray-200 hover:bg-primary hover:text-white cursor-pointer"
              onClick={() => goEditForm(product.id)}
            >
              {/* Row index and reordered fields */}
              <td className="py-3 px-3 whitespace-nowrap">{index + 1}</td>
              <td className="py-3 px-3 text-left whitespace-nowrap">{product.codigo_gx}</td>
              <td className="py-3 px-3 text-left">{product.deposito_nombre}</td>
              <td className="py-3 px-3 text-left">{product.proyecto_nombre}</td>
              <td className="py-3 px-3 text-left">{product.subproyecto_nombre}</td>
              <td className="py-3 px-3 text-left">{product.descripcion}</td>
              <td className="py-3 px-3 text-left">{product.observacion}</td>
              <td className="py-3 px-3 text-left">{product.cantidad}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-sm text-gray-700 dark:text-gray-400">
        Mostrando <span className="font-medium">{products.length}</span> de{' '}
        <span className="font-medium">{products.length}</span> entradas
      </p>
      <p className="text-sm text-gray-700 dark:text-gray-400">
        Esta tabla muestra los productos disponibles en Almacén
      </p>
    </>
  );
}

export default Tabla;
