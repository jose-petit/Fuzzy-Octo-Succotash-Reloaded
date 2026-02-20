import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: 'AIzaSyBs0m-qSJYCPZrKLbKMdTUNr7QzM8__rEA',
  authDomain: 'span-padtec.firebaseapp.com',
  projectId: 'span-padtec',
  storageBucket: 'span-padtec.appspot.com',
  messagingSenderId: '728675352166',
  appId: '1:728675352166:web:da0445e32fbc57fc8237a7',
  measurementId: 'G-P3KQZJ6K1N',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export { app };
