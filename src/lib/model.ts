import * as tf from '@tensorflow/tfjs';

export interface LotoDraw {
  day: string;
  month_year: string;
  num0: number;
  num1: number;
  num2: number;
  num3: number;
  num4: number;
  chance: number;
}

export interface ProcessedDraw extends LotoDraw {
  freq_num0: number;
  freq_num1: number;
  freq_num2: number;
  freq_num3: number;
  freq_num4: number;
  freq_chance: number;
  sum_diff: number;
  pair_chance: number;
  impair_chance: number;
  pair: number;
  impair: number;
  is_under_24: number;
  is_under_40: number;
}

const pairs = new Set([2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50]);
const impairs = new Set([1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 43, 45, 47, 49]);

function countPairs(nums: number[]) { return nums.filter(n => pairs.has(n)).length; }
function countImpairs(nums: number[]) { return nums.filter(n => impairs.has(n)).length; }
function countUnder(nums: number[], val: number) { return nums.filter(n => n <= val).length; }

export function processData(draws: LotoDraw[]): ProcessedDraw[] {
  // Invert the data so the oldest is first, just like Python code: df = df_tirage.iloc[::-1]
  const reversed = [...draws].reverse();
  
  // To compute frequency correctly as per python: "tab[0:pos].count(e)" -> count of occurrences of e up to current position
  const getFreq = (index: number, key: keyof LotoDraw, val: number) => {
    let count = 0;
    for (let i = 0; i <= index; i++) {
      if (reversed[i][key] === val) count++;
    }
    return count;
  };

  return reversed.map((d, i) => {
    const nums = [d.num0, d.num1, d.num2, d.num3, d.num4];
    return {
      ...d,
      freq_num0: getFreq(i, 'num0', d.num0),
      freq_num1: getFreq(i, 'num1', d.num1),
      freq_num2: getFreq(i, 'num2', d.num2),
      freq_num3: getFreq(i, 'num3', d.num3),
      freq_num4: getFreq(i, 'num4', d.num4),
      freq_chance: getFreq(i, 'chance', d.chance),
      sum_diff: Math.pow(d.num1 - d.num0, 2) + Math.pow(d.num2 - d.num1, 2) + Math.pow(d.num3 - d.num2, 2) + Math.pow(d.num4 - d.num3, 2),
      pair_chance: pairs.has(d.chance) ? 1 : 0,
      impair_chance: impairs.has(d.chance) ? 1 : 0,
      pair: countPairs(nums),
      impair: countImpairs(nums),
      is_under_24: countUnder(nums, 24),
      is_under_40: countUnder(nums, 40)
    };
  });
}

// StandardScaler implementation
export class StandardScaler {
  means: number[] = [];
  stds: number[] = [];

  fit(data: number[][]) {
    const rows = data.length;
    const cols = data[0].length;
    for (let j = 0; j < cols; j++) {
      let sum = 0;
      for (let i = 0; i < rows; i++) sum += data[i][j];
      const mean = sum / rows;
      this.means.push(mean);
      
      let sqSum = 0;
      for (let i = 0; i < rows; i++) sqSum += Math.pow(data[i][j] - mean, 2);
      // variance = sqSum / rows
      const std = Math.sqrt(sqSum / rows) || 1; // avoid div by 0
      this.stds.push(std);
    }
  }

  transform(data: number[][]): number[][] {
    return data.map(row => 
      row.map((val, j) => (val - this.means[j]) / this.stds[j])
    );
  }

  inverseTransform(data: number[][]): number[][] {
    return data.map(row => 
      row.map((val, j) => (val * this.stds[j]) + this.means[j])
    );
  }
}

export function createDataset(processed: ProcessedDraw[], windowLength: number = 12) {
  // We extract the numerical features. The python code selected:
  // ['num0', 'num1', 'num2', 'num3', 'num4', 'chance', 'freq_num0', 'freq_num1', 'freq_num2', 'freq_num3', 'freq_num4', 'freq_chance', 'sum_diff', 'pair_chance', 'impair_chance', 'pair', 'impair', 'is_under_24', 'is_under_40']
  const data = processed.map(d => [
    d.num0, d.num1, d.num2, d.num3, d.num4, d.chance,
    d.freq_num0, d.freq_num1, d.freq_num2, d.freq_num3, d.freq_num4, d.freq_chance,
    d.sum_diff, d.pair_chance, d.impair_chance, d.pair, d.impair, d.is_under_24, d.is_under_40
  ]);

  const scaler = new StandardScaler();
  scaler.fit(data);
  const scaled = scaler.transform(data);

  const X: number[][][] = [];
  const Y: number[][] = [];

  for (let i = 0; i < scaled.length - windowLength; i++) {
    const xWindow = scaled.slice(i, i + windowLength);
    // Labels are the first 6 features of the NEXT draw
    const yTarget = scaled[i + windowLength].slice(0, 6);
    X.push(xWindow);
    Y.push(yTarget);
  }

  return { X, Y, scaler, lastTwelve: scaled.slice(scaled.length - windowLength) };
}

export function buildModel(windowLength: number, numFeatures: number, numLabels: number) {
  const model = tf.sequential();
  model.add(tf.layers.lstm({
    units: 100,
    inputShape: [windowLength, numFeatures],
    returnSequences: true
  }));
  model.add(tf.layers.lstm({
    units: 100,
    dropout: 0.1,
    returnSequences: false
  }));
  model.add(tf.layers.dense({ units: numLabels }));

  model.compile({
    loss: 'meanAbsoluteError', // 'mae'
    optimizer: 'adam',
    metrics: ['accuracy']
  });

  return model;
}

export function buildAdvancedModel(windowLength: number, numFeatures: number, numLabels: number) {
  const model = tf.sequential();
  
  // Couche Bidirectionnelle LSTM pour analyser dans les deux sens
  model.add(tf.layers.bidirectional({
    layer: tf.layers.lstm({ units: 128, returnSequences: true }) as any,
    inputShape: [windowLength, numFeatures],
    mergeMode: 'concat'
  }));
  
  model.add(tf.layers.dropout({ rate: 0.2 }));
  
  model.add(tf.layers.bidirectional({
    layer: tf.layers.lstm({ units: 64, returnSequences: false }) as any,
    mergeMode: 'concat'
  }));
  
  model.add(tf.layers.dropout({ rate: 0.2 }));
  
  // Couches denses profondes
  model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
  model.add(tf.layers.dense({ units: numLabels }));

  model.compile({
    loss: 'meanAbsoluteError',
    optimizer: tf.train.adam(0.001),
    metrics: ['accuracy']
  });

  return model;
}

export async function runBacktest(data: ProcessedDraw[], windowLength: number, testSize: number = 50, onProgress?: (p: number) => void) {
  if (data.length <= testSize + windowLength) return null;
  
  // Split data
  const trainData = data.slice(0, data.length - testSize);
  const testData = data.slice(data.length - testSize - windowLength);
  
  const { X: xTrain, Y: yTrain, scaler } = createDataset(trainData, windowLength);
  
  // Preparer les donnees de test avec le MEME scaler
  const testFeatures = testData.map(d => [
    d.num0, d.num1, d.num2, d.num3, d.num4, d.chance,
    d.freq_num0, d.freq_num1, d.freq_num2, d.freq_num3, d.freq_num4, d.freq_chance,
    d.sum_diff, d.pair_chance, d.impair_chance, d.pair, d.impair, d.is_under_24, d.is_under_40
  ]);
  const scaledTest = scaler.transform(testFeatures);
  const XTest: number[][][] = [];
  const YTest: number[][] = [];
  
  for (let i = 0; i < scaledTest.length - windowLength; i++) {
    XTest.push(scaledTest.slice(i, i + windowLength));
    YTest.push(scaledTest[i + windowLength].slice(0, 6));
  }
  
  const model = buildAdvancedModel(windowLength, 19, 6);
  
  // Train
  const xs = tf.tensor3d(xTrain);
  const ys = tf.tensor2d(yTrain);
  const epochs = 30; // Rapide pour le backtest
  await model.fit(xs, ys, { 
    epochs, 
    batchSize: 32, 
    shuffle: true,
    callbacks: {
      onEpochEnd: (epoch) => {
        if (onProgress) onProgress(Math.round(((epoch + 1) / epochs) * 100));
      }
    }
  });
  
  // Predict
  const xTestTensor = tf.tensor3d(XTest);
  const predictions = model.predict(xTestTensor) as tf.Tensor;
  const predArray = await predictions.array() as number[][];
  
  let totalBonsNumeros = 0;
  let grillesGagnantes = 0; // Au moins 2 bons numeros ou le numero chance
  
  const means = scaler.means.slice(0, 6);
  const stds = scaler.stds.slice(0, 6);
  
  for(let i=0; i<predArray.length; i++) {
    const p = predArray[i].map((val, j) => Math.round((val * stds[j]) + means[j]));
    const t = YTest[i].map((val, j) => Math.round((val * stds[j]) + means[j]));
    
    let bons = 0;
    const vraisNumeros = t.slice(0,5);
    for(let j=0; j<5; j++) {
      if (vraisNumeros.includes(p[j])) bons++;
    }
    const chanceOk = p[5] === t[5];
    
    totalBonsNumeros += bons;
    if (bons >= 2 || chanceOk) grillesGagnantes++;
  }
  
  // Clean up tensors
  xs.dispose();
  ys.dispose();
  xTestTensor.dispose();
  predictions.dispose();
  model.dispose();
  
  return {
    testSize: predArray.length,
    avgBonsNumeros: (totalBonsNumeros / predArray.length).toFixed(2),
    winRate: ((grillesGagnantes / predArray.length) * 100).toFixed(1)
  };
}

