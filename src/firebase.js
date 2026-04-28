import { initializeApp } from 'firebase/app';
import { getDatabase, push, ref, set } from 'firebase/database';
import { config, firebaseConfig, hasFirebaseConfig } from './config.js';

let database;

export const initFirebase = () => {
  if (!config.firebaseEnabled) {
    return { enabled: false, reason: 'FIREBASE_ENABLED=false' };
  }

  if (!hasFirebaseConfig) {
    return { enabled: false, reason: 'Configuração Firebase incompleta' };
  }

  const app = initializeApp(firebaseConfig);
  database = getDatabase(app);
  return { enabled: true };
};

export const pushToFirebase = async (payload) => {
  if (!database) return;
  const historyRef = ref(database, config.firebasePath);
  const newRef = push(historyRef);
  await set(newRef, payload);
};
