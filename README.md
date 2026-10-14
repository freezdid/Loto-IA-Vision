# 🎱 Loto IA Vision • Lab Prédictif

![Theme](https://img.shields.io/badge/Theme-Antigravity%20Spatial-blue)
![TensorFlow.js](https://img.shields.io/badge/Intelligence-TensorFlow.js-orange)
![Next.js](https://img.shields.io/badge/Framework-Next.js%2016-black)
![Vercel Blob](https://img.shields.io/badge/Sync-Vercel%20Blob-brightgreen)

**Loto IA Vision** est une plateforme d'analyse prédictive et probabiliste indépendante utilisant des réseaux de neurones récurrents (**LSTM**) pour analyser les séquences de tirages du Loto. Alliant design spatial moderne (Antigravity Design) et intelligence artificielle de pointe, ce laboratoire permet d'explorer les lois statistiques et de générer des combinaisons optimisées.

---

## 🚀 Fonctionnalités Clés

### 🧠 Intelligence Artificielle Avancée
- **Modèle LSTM Bidirectionnel** : Analyse les séquences temporelles de tirages pour capturer les tendances complexes.
- **Fine-Tuning en Temps Réel** : Mise à jour du réseau à chaque nouveau tirage sans réentraînement complet, préservant la mémoire à long terme.
- **Multi-Visions (1-10)** : Génération de 1 à 10 combinaisons uniques par injection de perturbation contrôlée et sélection GTO (Game Theory Optimal).

### 📊 Analyse & Filtres Mathématiques
- **Heatmap de Chaleur** : Visualisation instantanée des 10 numéros les plus fréquents et des numéros Chance favoris.
- **Vérificateur de Typicité** : Analyse automatique de la **Somme** et de l'**Équilibre Parité (Pair/Impair)** pour s'assurer que les prédictions respectent les lois statistiques du hasard.
- **Backtesting Rétrospectif** : Module de simulation testant la précision du modèle sur les 50 derniers tirages réels avec barre de progression interactive.

### ☁️ Persistance & Synchronisation Cloud
- **Vercel Blob Sync** : Synchronisation automatique des données et des pronostics via le cloud.
- **Dual-Storage System** : Utilisation combinée de **IndexedDB** (côté client) et **Vercel Blob** (côté serveur).
- **Export/Import JSON** : Sauvegarde physique de vos grilles et modèles en un clic.

---

## 🎨 Design System (Antigravity Spatial Edition)

L'application arbore une interface "Dark Mode" spatiale haut de gamme :
- **Deep Void** (`#020511`) : Fond nuit immersif à faible éblouissement.
- **Bleu Royal Électrique** (`#0066CC`) : Éléments de structure et actions primaires.
- **Doré Lumineux** (`#FFD100`) : Boule Chance et indicateurs d'excellence.
- **Boules 3D en Lévitation** : Rendu sphérique photoréaliste avec éclairage dynamique, ombres douces et micro-interactions tactiles.

---

## 🛠️ Installation & Configuration

### Pré-requis
- Node.js 20+
- Compte Vercel pour le déploiement cloud

### Installation
```bash
git clone https://github.com/votre-repo/loto-ia-vision.git
cd loto-ia-vision
npm install
```

### Variables d'Environnement
Pour la persistance cloud, configurez votre store **Vercel Blob** dans `.env.local` :
```env
BLOB_READ_WRITE_TOKEN="votre_token_ici"
```

### Lancer le Lab en Local
```bash
npm run dev
```

---

## 📜 Méthodologie

Le modèle traite chaque tirage comme un vecteur de 25 caractéristiques (numéros, fréquences, différences de somme, parité, distance de récurrence, etc.). Ces données sont normalisées via un `StandardScaler` avant d'être injectées dans l'architecture neuronale composée de :
1. **Couche Bidirectionnelle LSTM (128 unités)**
2. **Dropout (20%)**
3. **Couche Bidirectionnelle LSTM (64 unités)**
4. **Couches Denses (64 unités, ReLU)**
5. **Couche de Sortie (6 unités)**

---

## ⚖️ Avertissement Légal & Indépendance
Cette application est un outil d'expérimentation indépendant basé sur des probabilités mathématiques et de l'intelligence artificielle. **Loto IA Vision n'est en aucun cas affiliée, sponsorisée ou liée à la société La Française des Jeux (FDJ).**

**Les jeux d'argent comportent des risques : endettement, isolement, dépendance.** Pour être aidé, appelez le 09 74 75 13 13 (appel non surtaxé).

---
**Développé avec passion par Antigravity Intelligence • © 2026**
