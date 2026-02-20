import axios from 'axios';
import { Expo } from 'expo-server-sdk';
import { app } from 'config/firebase';
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
} from 'firebase/firestore';

export default async function handler(req, res) {
  switch (req.method) {
    case 'GET':
      return await getSessionToken(req, res);
    case 'POST':
      return await getPerformance(req, res);
    case 'PUT':
      return await sendNotification(req, res);
    default:
      return res.status(400).send('Method not allowed');
  }
}

const getSessionToken = async (req, res) => {
  const datos = {
    username: 'josepetit',
    password: 'jose123+',
  };

  const { data } = await axios.post('http://10.253.0.118/api/auth/login/', datos);
  console.log('Token obtenido: ', data.token);
  return res.status(200).json({ token: data.token });
};

const getPerformance = async (req, res) => {
  const headers = {
    Authorization: `Token ${req.body.token}`,
    Referer: 'http://10.253.0.118/measurementsPerformance',
  };
  const { data } = await axios.get(
    'http://10.253.0.118/api/ne/performance?metadata=true&page=1&per_page=10000',
    { headers }
  );
  return res.status(200).json({ performance: data });
};

const sendNotification = async (req, res) => {
  console.log('Body: ', req.body);
  const expo = new Expo();
  let messages = [];
  let pushTokens = [];
  let chunks = [];
  let ticketChunk = [];

  const db = getFirestore(app);
  const snapshot = await getDocs(collection(db, 'token_notifications'));

  snapshot.forEach((doc) => {
    pushTokens.push({
      id: doc.id,
      token: doc.data().exponentPushToken,
    });
  });
  // pushTokens.push({
  //   id: 1,
  //   token: "ExponentPushToken[_RwDohKhjSWOPa2K_K9Ijz]",
  // });

  console.log('pushTokens.length:', pushTokens.length);

  const promises = pushTokens.map(async (pushToken) => {
    let message = {
      to: pushToken.token,
      sound: 'default',
      title: req.body.title,
      body: req.body.message,
      data: req.body.data,
    };
    messages.push(message);
  });
  await Promise.all(promises).then(() => {
    chunks = expo.chunkPushNotifications(messages);

    console.log('largo chunks:', chunks.length);
    chunks.map(async (element, index) => {
      chunks[index].map(async (chunk) => {
        try {
          let tosend = [];
          let index = pushTokens.findIndex((item) => item.token === chunk.to);
          tosend.push(chunk);

          console.log('tosend:', tosend);
          ticketChunk = await expo.sendPushNotificationsAsync(tosend);
          console.log('Stuatus de notificacion: ', ticketChunk[0]);
        } catch (error) {
          console.error('Error sendPushNotificationsAsync:', error);
        }
      });
    });
  });

  return res.status(200).json({ estado: 'Enviado' });
};
