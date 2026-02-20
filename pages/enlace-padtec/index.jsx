'use client';
import React, { useState } from 'react';
import Layout from 'components/Layout';
import axios from 'axios';

export default function EnlacePadtecPage() {
  const [enlaces, setEnlaces] = useState([]);
  const [syncMessage, setSyncMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSync = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/enlace?sync=true');
      setSyncMessage(`Sincronizados ${res.data.count} enlaces.`);
    } catch (error) {
      console.error(error);
      setSyncMessage('Error durante la sincronización.');
    } finally {
      setLoading(false);
    }
  };

  const handleShow = async () => {
    try {
      setLoading(true);
      // Fetch Padtec (MySQL) and Firestore enlaces, then merge
      const padtecRes = await axios.get('/api/enlace-padtec');
      const padtec = padtecRes.data.enlaces || [];
      const fbRes = await axios.get('/api/enlace');
      const fbList = fbRes.data.enlaces || [];
      // Merge records on firebase_id (fb.id)
      const merged = fbList.map((fb) => {
        const match = padtec.find((p) => p.firebase_id === fb.id);
        return {
          id: fb.id,
          name1: fb.name1,
          name2: fb.name2,
          atenuacion_acumulada: match?.atenuacion_acumulada ?? 0,
          fecha: match?.fecha,
        };
      });
      // Sort by name1 then name2
      merged.sort((a, b) => {
        const cmp = a.name1.localeCompare(b.name1);
        if (cmp !== 0) return cmp;
        return (a.name2 || '').localeCompare(b.name2 || '');
      });
      setEnlaces(merged);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-4">Enlaces Padtec</h1>
      <div className="flex space-x-4 mb-6">
        <button
          onClick={handleSync}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Sincronizar enlaces
        </button>
        <button
          onClick={handleShow}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          Mostrar enlaces
        </button>
      </div>
      {syncMessage && <p className="mb-4">{syncMessage}</p>}
      <table className="min-w-full bg-transparent text-white">
        <thead>
          <tr>
            <th className="px-4 py-2 border text-white">ID</th>
            <th className="px-4 py-2 border text-white">Enlace</th>
            <th className="px-4 py-2 border text-white">Atenuación</th>
            <th className="px-4 py-2 border text-white">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {enlaces.map((e) => (
            <tr key={e.id}>
              <td className="px-4 py-2 border text-white">{e.id}</td>
              <td className="px-4 py-2 border text-white">
                {e.name1}
                {e.name2 ? ` → ${e.name2}` : ''}
              </td>
              <td className="px-4 py-2 border text-white">{e.atenuacion_acumulada}</td>
              <td className="px-4 py-2 border text-white">
                {e.fecha ? new Date(e.fecha).toLocaleString() : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Layout>
  );
}
