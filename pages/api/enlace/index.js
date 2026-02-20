import { app } from 'config/firebase';
import { connection } from 'config/db';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { sendSuccess, sendError, sendUnauthorized, sendMethodNotAllowed } from '@/lib/api-utils';
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  getDoc,
} from 'firebase/firestore';

const db = getFirestore(app);

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return sendUnauthorized(res);

  const { method, query } = req;

  if (method === 'GET' && query.sync === 'true') {
    return await syncEnlaces(req, res);
  }

  switch (method) {
    case 'GET':
      return await getEnlaceList(req, res);
    case 'POST':
      return await addEnlace(req, res);
    case 'PUT':
      return await updateenlace(req, res);
    case 'DELETE':
      return await deleteenlace(req, res);
    default:
      return sendMethodNotAllowed(res);
  }
}

// Sincroniza enlaces de Firebase a la tabla MySQL
async function syncEnlaces(req, res) {
  try {
    const enlacesCol = collection(db, 'enlaces_tarjetas');
    const enlacesSnapshot = await getDocs(enlacesCol);
    const batchValues = enlacesSnapshot.docs.map((docSnap) => [docSnap.id, docSnap.data().url]);

    if (batchValues.length) {
      // Inserta sin duplicados en tabla enlace_padtec
      await connection.query('INSERT IGNORE INTO enlace_padtec (firebase_id, url) VALUES ?', [batchValues]);

      // Backup completo de datos en data_firebase
      const backupValues = enlacesSnapshot.docs.map((docSnap) => [
        docSnap.id,
        JSON.stringify(docSnap.data()),
      ]);

      if (backupValues.length) {
        await connection.query(
          `INSERT INTO data_firebase (firebase_id, data) VALUES ? \
           ON DUPLICATE KEY UPDATE data = VALUES(data)`,
          [backupValues]
        );
      }
    }
    return sendSuccess(res, { count: batchValues.length }, 'Sincronización completada');
  } catch (error) {
    return sendError(res, 'Error en sincronización', 500, error);
  }
}

async function getEnlaceList(req, res) {
  try {
    const [rows] = await connection.query('SELECT firebase_id AS id, data FROM data_firebase');
    if (rows.length > 0) {
      const enlacesList = rows.map((r) => {
        let parsed;
        try {
          parsed = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
        } catch {
          parsed = {};
        }
        return { id: r.id, ...parsed };
      });
      return sendSuccess(res, { enlaces: enlacesList });
    }
  } catch (err) {
    console.warn('MySQL backup read failed, falling back to Firestore');
  }

  try {
    const enlacesCol = collection(db, 'enlaces_tarjetas');
    const enlacesSnapshot = await getDocs(enlacesCol);
    const enlacesList = enlacesSnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
    return sendSuccess(res, { enlaces: enlacesList });
  } catch (error) {
    return sendError(res, 'Error fetching enlaces', 500, error);
  }
}

async function addEnlace(req, res) {
  try {
    const { enlace } = req.body;
    if (!enlace) return sendError(res, 'Datos de enlace ausentes', 400);

    const docRef = await addDoc(collection(db, 'enlaces_tarjetas'), enlace);
    const { url } = enlace;

    await connection.query(
      'INSERT IGNORE INTO enlace_padtec (firebase_id, url, atenuacion_acumulada) VALUES (?, ?, 0)',
      [docRef.id, url || '']
    );

    await connection.query(
      `INSERT INTO data_firebase (firebase_id, data) VALUES (?, ?) \
       ON DUPLICATE KEY UPDATE data = VALUES(data)`,
      [docRef.id, JSON.stringify(enlace)]
    );

    return sendSuccess(res, { id: docRef.id }, 'Enlace added successfully');
  } catch (error) {
    return sendError(res, 'Error adding enlace', 500, error);
  }
}

async function updateenlace(req, res) {
  try {
    const { id, enlace: enlaceData } = req.body;
    if (!id || !enlaceData) {
      return sendError(res, 'ID y datos de enlace son obligatorios', 400);
    }

    const [oldRows] = await connection.query('SELECT data FROM data_firebase WHERE firebase_id = ?', [id]);
    const oldData = oldRows.length ? (typeof oldRows[0].data === 'string' ? JSON.parse(oldRows[0].data) : oldRows[0].data) : {};

    const enlacesCol = collection(db, 'enlaces_tarjetas');
    await updateDoc(doc(enlacesCol, id), enlaceData);

    const snap = await getDoc(doc(enlacesCol, id));
    const fullData = snap.exists() ? snap.data() : enlaceData;

    await connection.query(
      `INSERT INTO data_firebase (firebase_id, data) VALUES (?, ?) \
       ON DUPLICATE KEY UPDATE data = VALUES(data)`,
      [id, JSON.stringify(fullData)]
    );

    const session = await getServerSession(req, res, authOptions);
    const userId = session?.user?.id || 0;

    ['umbral', 'loss_reference', 'line_initial1', 'raman1', 'raman2'].forEach(field => {
      if (fullData[field] !== oldData[field]) {
        connection.query(
          'INSERT INTO enlace_logs (enlace_id, field_name, old_value, new_value, user_id) VALUES (?, ?, ?, ?, ?)',
          [id, field, String(oldData[field] || ''), String(fullData[field] || ''), userId]
        ).catch(err => console.error('Audit Log Error:', err));
      }
    });

    return sendSuccess(res, {}, 'Enlace actualizado correctamente');
  } catch (error) {
    return sendError(res, 'Error updating enlace', 500, error);
  }
}

async function deleteenlace(req, res) {
  try {
    const { id } = req.body;
    if (!id) return sendError(res, 'ID obligatorio', 400);

    const enlacesCol = collection(db, 'enlaces_tarjetas');
    await deleteDoc(doc(enlacesCol, id));

    await connection.query('DELETE FROM enlace_padtec WHERE firebase_id = ?', [id]);
    await connection.query('DELETE FROM data_firebase WHERE firebase_id = ?', [id]);

    return sendSuccess(res, {}, 'Enlace eliminado correctamente');
  } catch (error) {
    return sendError(res, 'Error deleting enlace', 500, error);
  }
}
