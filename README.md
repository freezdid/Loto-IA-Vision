# 🎱 Loto IA Vision • Lab Prédictif

![FDJ Theme](https://img.shields.io/badge/Theme-FDJ%20Official-blue)
![TensorFlow.js](https://img.shields.io/badge/Intelligence-TensorFlow.js-orange)
![Next.js](https://img.shields.io/badge/Framework-Next.js%2016-black)
![Vercel Blob](https://img.shields.io/badge/Sync-Vercel%20Blob-brightgreen)

**Loto IA Vision** est une plateforme d'analyse prédictive ultra-moderne utilisant des réseaux de neurones récurrents (**LSTM**) pour anticiper les tirages du Loto. Alliant design premium inspiré de la FDJ et intelligence artificielle de pointe, ce laboratoire permet de transformer des décennies de statistiques en visions stratégiques.

---

## 🚀 Fonctionnalités Clés

### 🧠 Intelligence Artificielle Avancée
- **Modèle LSTM Bidirectionnel** : Analyse les séquences de tirages dans les deux sens pour capturer les dépendances temporelles complexes.
- **Fine-Tuning en Temps Réel** : Mise à jour du modèle à chaque nouveau tirage sans réentraînement complet, préservant la mémoire à long terme du réseau.
- **Multi-Visions (1-10)** : Génération de jusqu'à 10 combinaisons uniques par injection de bruit neuronal contrôlé.

### 📊 Analyse & Filtres Mathématiques
- **Heatmap de Chaleur** : Visualisation instantanée des 10 numéros les plus fréquents et des numéros Chance favoris.
- **Vérificateur de Typicité** : Analyse automatique de la **Somme** et de l'**Équilibre Parité (Pair/Impair)** pour s'assurer que les prédictions respectent les lois statistiques du hasard.
- **Backtesting Intégré** : Module de simulation permettant de tester la précision du modèle sur les 50 derniers tirages réels avec barre de progression interactive.

### ☁️ Persistance & Synchronisation Cloud
- **Vercel Blob Sync** : Synchronisation automatique de vos données entre tous vos navigateurs et appareils.
- **Dual-Storage System** : Utilisation combinée de **SQLite** (côté serveur) et **IndexedDB** (côté client) pour une rapidité et une fiabilité maximale.
- **Export/Import JSON** : Sauvegarde physique de votre base de données locale en un clic.

---

## 🎨 Design System (FDJ Edition)

L'application arbore une interface "Dark Mode" premium utilisant les codes couleurs officiels de la Française des Jeux :
- **Bleu FDJ** (`#0055A4`) : Structure et actions principales.
- **Rouge Loto** (`#E1001A`) : Accents, alertes et analyses critiques.
- **Jaune Chance** (`#FFD100`) : Numéros Chance et indicateurs de succès.
- **Boules 3D** : Rendu réaliste des numéros avec éclairage dynamique et effets de verre.

---

## 🛠️ Installation & Configuration

### Pré-requis
- Node.js 20+
- Un compte Vercel pour le déploiement cloud

### Installation
```bash
git clone https://github.com/votre-repo/loto-ia-vision.git
cd loto-ia-vision
npm install
```

### Variables d'Environnement
Pour la persistance cloud, configurez votre store **Vercel Blob** et ajoutez le token :
```env
BLOB_READ_WRITE_TOKEN="votre_token_ici"
```

### Lancer le Lab
```bash
npm run dev
```

---

## 📜 Méthodologie

Le modèle traite chaque tirage comme un vecteur de 19 caractéristiques (numéros, fréquences, différences de somme, parité, etc.). Ces données sont normalisées via un `StandardScaler` avant d'être injectées dans une architecture neuronale profonde composée de :
1. **Couche Bidirectionnelle LSTM (128 unités)**
2. **Dropout (20%)**
3. **Couche Bidirectionnelle LSTM (64 unités)**
4. **Couches Denses (64 unités, ReLU)**
5. **Couche de Sortie (6 unités)**

---

## ⚖️ Avertissement Légal
Cette application est un outil d'expérimentation basé sur des probabilités mathématiques et de l'intelligence artificielle. **Les jeux d'argent comportent des risques : endettement, isolement, dépendance.** Pour être aidé, appelez le 09 74 75 13 13 (appel non surtaxé).

---
**Développé avec passion par Antigravity Intelligence • © 2026**
