import * as tf from '@tensorflow/tfjs';
import { LotoDraw, SavedPrediction } from './types';

export type { SavedPrediction } from './types';

const DB_NAME = 'LotoIAVisionDB';
const DB_VERSION = 2;
const DRAWS_STORE = 'draws';
const PREDICTIONS_STORE = 'predictions';
const DRAWS_KEY = 'all_draws';
const HISTORY_KEY = 'history';
const LAST_PREDICTION_KEY = 'last_active';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB indisponible'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of [DRAWS_STORE, PREDICTIONS_STORE, 'metadata']) {
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Ouverture IndexedDB impossible'));
  });
}

async function putValue(storeName: string, key: string, value: unknown): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Écriture IndexedDB impossible'));
    tx.onabort = () => reject(tx.error ?? new Error('Transaction IndexedDB annulée'));
  });
  db.close();
}

async function getValue<T>(storeName: string, key: string): Promise<T | null> {
  const db = await openDatabase();
  const value = await new Promise<T | null>((resolve) => {
    const request = db.transaction(storeName).objectStore(storeName).get(key);
    request.onsuccess = () => resolve((request.result as T) ?? null);
    request.onerror = () => resolve(null);
  });
  db.close();
  return value;
}

export async function saveDraws(draws: LotoDraw[]): Promise<void> {
  try {
    await putValue(DRAWS_STORE, DRAWS_KEY, draws);
  } catch (error) {
    console.warn('Sauvegarde locale des tirages indisponible :', error);
  }
}

export async function loadDraws(): Promise<LotoDraw[] | null> {
  try {
    return await getValue<LotoDraw[]>(DRAWS_STORE, DRAWS_KEY);
  } catch {
    return null;
  }
}

export async function savePredictions(predictions: SavedPrediction[]): Promise<void> {
  try {
    await putValue(PREDICTIONS_STORE, HISTORY_KEY, predictions);
  } catch (error) {
    console.warn('Sauvegarde locale du journal indisponible :', error);
  }
}

export async function loadPredictions(): Promise<SavedPrediction[] | null> {
  try {
    return await getValue<SavedPrediction[]>(PREDICTIONS_STORE, HISTORY_KEY);
  } catch {
    return null;
  }
}

/** Prediction currently displayed on the dashboard, restored on next visit. */
export async function saveLastPrediction(grids: number[][]): Promise<void> {
  try {
    await putValue(PREDICTIONS_STORE, LAST_PREDICTION_KEY, grids);
  } catch {
    /* non blocking */
  }
}

export async function loadLastPrediction(): Promise<number[][] | null> {
  try {
    return await getValue<number[][]>(PREDICTIONS_STORE, LAST_PREDICTION_KEY);
  } catch {
    return null;
  }
}

// --- Model persistence (TensorFlow.js IndexedDB handler) --------------------

const MODEL_PATH = `indexeddb://${DB_NAME}-model`;

export const hasSavedModel = async (): Promise<boolean> => {
  try {
    const models = await tf.io.listModels();
    return Boolean(models[MODEL_PATH]);
  } catch {
    return false;
  }
};

export async function saveModel(model: tf.LayersModel): Promise<void> {
  try {
    await model.save(MODEL_PATH);
  } catch (error) {
    console.warn('Sauvegarde locale du modèle indisponible :', error);
  }
}

export async function loadModel(): Promise<tf.LayersModel | null> {
  try {
    return await tf.loadLayersModel(MODEL_PATH);
  } catch {
    return null;
  }
}

export async function deleteModel(): Promise<void> {
  try {
    await tf.io.removeModel(MODEL_PATH);
  } catch {
    /* nothing to delete */
  }
}
