import { ProcessedDraw } from './model';
import * as tf from '@tensorflow/tfjs';

const DB_NAME = 'LotoIAVisionDB';
const DB_VERSION = 1;
const DRAWS_STORE = 'draws';
const METADATA_STORE = 'metadata';

export async function initDB() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DRAWS_STORE)) {
        db.createObjectStore(DRAWS_STORE);
      }
      if (!db.objectStoreNames.contains(METADATA_STORE)) {
        db.createObjectStore(METADATA_STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveDraws(draws: ProcessedDraw[]) {
  const db = await initDB();
  const tx = db.transaction(DRAWS_STORE, 'readwrite');
  const store = tx.objectStore(DRAWS_STORE);
  store.put(draws, 'all_draws');
  return new Promise((resolve) => (tx.oncomplete = resolve));
}

export async function loadDraws(): Promise<ProcessedDraw[] | null> {
  const db = await initDB();
  return new Promise((resolve) => {
    const request = db.transaction(DRAWS_STORE).objectStore(DRAWS_STORE).get('all_draws');
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => resolve(null);
  });
}

// Model persistence using TensorFlow.js built-in IndexedDB support
const MODEL_PATH = `indexeddb://${DB_NAME}-model`;

export async function saveModel(model: tf.Sequential) {
  await model.save(MODEL_PATH);
}

export async function loadModel(): Promise<tf.LayersModel | null> {
  try {
    const model = await tf.loadLayersModel(MODEL_PATH);
    return model;
  } catch (e) {
    return null;
  }
}

export async function hasSavedModel(): Promise<boolean> {
  const models = await tf.io.listModels();
  return !!models[MODEL_PATH];
}
