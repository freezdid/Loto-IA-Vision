import * as tf from '@tensorflow/tfjs';
import type { EpochMetrics } from './model';
import { LotoDraw, SavedPrediction, TrainingMode } from './types';

export type { SavedPrediction } from './types';

const DB_NAME = 'LotoIAVisionDB';
const DB_VERSION = 3;
const DRAWS_STORE = 'draws';
const PREDICTIONS_STORE = 'predictions';
const METADATA_STORE = 'metadata';
const DRAWS_KEY = 'all_draws';
const HISTORY_KEY = 'history';
const LAST_PREDICTION_KEY = 'last_active';
const MODEL_META_KEY = 'model_meta';

/**
 * Everything needed to reuse a trained model on the next visit: the scaler is
 * as important as the weights, because the raw features must be normalized
 * exactly the way they were during training.
 */
export interface TrainingSnapshot {
  version: 1;
  mode: TrainingMode;
  window: number;
  params: number;
  trainedAt: number;
  bestValLoss: number | null;
  bestValMae: number | null;
  bestEpoch: number | null;
  epochsRun: number;
  totalEpochs: number;
  stoppedEarly: boolean;
  cancelled: boolean;
  fullTraining: boolean;
  durationMs: number | null;
  history: EpochMetrics[];
  scaler: { means: number[]; stds: number[] } | null;
}

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

// --- Training metadata (scaler + last run) ---------------------------------

export async function saveModelMeta(snapshot: TrainingSnapshot): Promise<boolean> {
  try {
    await putValue(METADATA_STORE, MODEL_META_KEY, snapshot);
    return true;
  } catch (error) {
    console.warn('Sauvegarde des métadonnées du modèle indisponible :', error);
    // Never leave a scaler that no longer matches the saved weights.
    await deleteModelMeta();
    return false;
  }
}

export async function loadModelMeta(): Promise<TrainingSnapshot | null> {
  try {
    const value = await getValue<TrainingSnapshot>(METADATA_STORE, MODEL_META_KEY);
    if (!value || value.version !== 1) return null;
    return value;
  } catch {
    return null;
  }
}

export async function deleteModelMeta(): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(METADATA_STORE, 'readwrite');
      tx.objectStore(METADATA_STORE).delete(MODEL_META_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Suppression des métadonnées impossible'));
    });
    db.close();
  } catch {
    /* nothing to delete */
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

export async function saveModel(model: tf.LayersModel): Promise<boolean> {
  try {
    await model.save(MODEL_PATH);
    return true;
  } catch (error) {
    console.warn('Sauvegarde locale du modèle indisponible :', error);
    return false;
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
  await deleteModelMeta();
}
