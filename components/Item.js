import Link from 'next/link';

export function Item({ item }) {
  return (
    <Link href={`/products/edit/${item.id}`} className="block p-6 max-w-sm bg-white rounded-lg border border-gray-200 shadow-md hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 mb-3" key={item.id}>
      <h5 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
        {item.ciudad}
      </h5>
      <p className="font-black text-gray-700 dark:text-gray-200">{item.proyecto}</p>
      <p className="font-black text-gray-700 dark:text-gray-200">{item.descripcion}</p>
      <p className="font-bold text-gray-800 dark:text-gray-100 text-2xl">{item.sub_proyecto} </p>

      {/* Nuevos campos */}
      <p className="mt-4 text-gray-600 text-right">
        Autorizado/Solicitado por: {item.autorizado_solicitado_por}
      </p>
      <p className="text-gray-600 text-right">Código GX: {item.codigo_gx}</p>

      {/* Fecha alineada a la derecha */}
      <p className="mt-4 text-gray-600 text-right">{item.fecha}</p>
    </Link>
  );
}
