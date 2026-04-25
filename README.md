# 🎰 Loto IA Vision

![Next.js](https://img.shields.io/badge/Next.js-14+-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react)
![TensorFlow.js](https://img.shields.io/badge/TensorFlow.js-Orange?style=for-the-badge&logo=tensorflow)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-06B6D4?style=for-the-badge&logo=tailwindcss)

**Loto IA Vision** est une application web de prédiction de dernière génération. Basée sur un modèle de réseau de neurones **LSTM (Long Short-Term Memory)**, elle permet de récupérer en temps réel l'historique des tirages du Loto français et d'entraîner une Intelligence Artificielle **directement dans votre navigateur**.

Ce projet est une réécriture complète, moderne et fullstack d'un projet original Jupyter Notebook (Keras/Python), transformé en une puissante application React/Next.js.

---

## ✨ Fonctionnalités Principales

- **Scraping Automatique** : Route API Next.js dédiée pour collecter les milliers de tirages historiques du Loto en temps réel de manière fiable et rapide.
- **Deep Learning In-Browser** : Entraînement complet du modèle LSTM (feature engineering, scaling, séquences temporelles) propulsé par `@tensorflow/tfjs` sans backend Python.
- **Monitoring Visuel** : Suivi de l'apprentissage en direct grâce aux graphiques interactifs de la fonction de perte (Loss).
- **Design "Glassmorphism" Premium** : Interface dynamique au thème "Rouge & Noir", animations fluides via `framer-motion`, et retour utilisateur immersif.

---

## 🛠️ Architecture Technique

1. **Backend (API)** :
   - `src/app/api/loto/route.ts` : Proxy de scraping utilisant `cheerio` pour récupérer et nettoyer le DOM html de l'historique du loto de façon structurée.
   
2. **IA & Mathématiques** :
   - `src/lib/model.ts` : Implémente la logique d'analyse (paires, impaires, fréquences, sommes des écarts), un `StandardScaler` natif et la topologie séquentielle LSTM de TensorFlow.js.
   
3. **Frontend (UI)** :
   - Dashboard principal gérant l'état global, la construction dynamique du réseau de neurones et l'orchestration des données via des graphiques `recharts`.

---

## 🚀 Installation & Démarrage

### Pré-requis
- **Node.js** (v18.0.0 ou supérieur)
- **NPM** (inclus avec Node.js)

### Lancer le projet
1. **Cloner le repository** (ou télécharger les fichiers) :
   ```bash
   git clone <votre-lien-repo>
   cd loto
   ```

2. **Installer les dépendances** :
   ```bash
   npm install
   ```

3. **Lancer le serveur de développement / production** :
   ```bash
   npm run build
   npm start
   ```

4. **Accéder à l'application** :  
   Ouvrez votre navigateur web et accédez à [http://localhost:3000](http://localhost:3000).

---

## 💡 Mode d'emploi
1. Cliquez sur **Acquérir les Données** pour lancer le crawler sur les serveurs d'archives.
2. Une fois collectées, cliquez sur **Lancer l'Entraînement**. Attendez que le modèle ajuste ses poids mathématiques sur les données temporelles.
3. Observez la chute de la courbe d'erreur de prédiction sur le graphe.
4. Cliquez sur **Calculer** pour générer les probabilités et la prédiction du tout prochain tirage.

---

*Note: Ce projet est fourni à des fins expérimentales et éducatives pour illustrer l'apprentissage du Machine Learning sur les séries temporelles.*
