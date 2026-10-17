# 🎱 Loto IA Vision • Studio d'analyse LSTM

![Theme](https://img.shields.io/badge/Theme-Antigravity%20Spatial-blue)
![TensorFlow.js](https://img.shields.io/badge/Intelligence-TensorFlow.js-orange)
![Next.js](https://img.shields.io/badge/Framework-Next.js%2016-black)
![Vercel Blob](https://img.shields.io/badge/Sync-Vercel%20Blob-brightgreen)

**Loto IA Vision** est un laboratoire d'analyse statistique indépendant : un réseau **LSTM** entraîné **entièrement dans le navigateur** (TensorFlow.js) lit l'historique officiel des tirages du Loto, en propose des combinaisons conformes aux régularités observées, et mesure honnêtement ce que ce type de modèle vaut vraiment. Tout est calculé sur les données réelles, rien n'est inventé.

---

## 🚀 Fonctionnalités clés

### 🧠 Réseau LSTM entraîné sur vos données
- **Deux niveaux d'entraînement** : **Turbo** (LSTM 64 unités + dense 32, 24 époques max) pour un aller-retour rapide, **Elite** (Bi-LSTM 96 → Bi-LSTM 48 → attention → dense 64, 60 époques max) pour l'analyse approfondie.
- **Apprentissage robuste** : perte **Huber**, suivi MAE, **early stopping** (patience 6/10) avec restauration des meilleurs poids, **décroissance du taux d'apprentissage** sur plateau, découpage validation 10 %.
- **Affinage incrémental** : lorsqu'un modèle de même architecture existe déjà, « Affiner le modèle » réutilise ses poids et son `StandardScaler` au lieu de tout réentraîner ; un badge signale les nouveaux tirages depuis le dernier entraînement.
- **Accélération matérielle** : WebGPU → WebGL → CPU, détecté et affiché dans l'en-tête (badge `WEBGPU` / `WEBGL` / `CPU`).

### 🎯 Génération de grilles & conformité
- **Grille proposée** : la combinaison la plus conforme aux patterns de l'historique, classée par un **score de conformité** calculé sur le profil statistique réel (somme, parité, répartition haut/bas, écarts, fréquences) — jamais un score inventé.
- **1 à 5 grilles** : génération Monte-Carlo multi-rounds (4 passes d'exploration croissante) puis sélection des meilleures, dédoublonnées.
- **Audit de grille** : saisissez vos numéros, le score et les commentaires (somme, parité, répartition) se mettent à jour en direct.

### 📊 Analyse & validation
- **Numéros chauds & froids** : fréquences réelles sur l'historique complet, numéros les plus rares et boules Chance les plus sorties.
- **Backtest honnête** : un modèle est réentraîné sur le passé immédiat (30 époques max) avec un `StandardScaler` ajusté **uniquement sur la tranche d'entraînement**, puis rejoué sur les 50 derniers tirages réels — distribution du nombre de bons numéros, taux de grilles ≥ 2 numéros, taux de Chance.
- **Journal des pronostics** : chaque grille générée est horodatée et confrontée automatiquement aux tirages réels suivants.
- **Archives** : les 2 895 tirages (oct. 2008 → aujourd'hui) avec recherche par jour, mois ou numéro.

### ☁️ Persistance
- **IndexedDB** côté client (historique, modèles, pronostics) : l'application fonctionne hors ligne.
- **Vercel Blob** côté serveur pour le partage cloud (historique de référence, pronostics, métadonnées du modèle), avec repli silencieux sur le cache local si le cloud est indisponible.

---

## 🎨 Design system

L'interface suit le monde visuel **« Salle de tirage en apesanteur »** : vide profond, un seul accent bleu royal, or réservé à la boule Chance, boules 3D en lévitation. Les tokens et règles complètes sont documentés dans [`DESIGN.md`](./DESIGN.md).

---

## 🛠️ Installation & configuration

### Pré-requis
- Node.js 20+ (développé sous Node 24)
- Compte Vercel pour le déploiement et la synchronisation cloud

### Installation
```bash
git clone https://github.com/freezdid/Loto-IA-Vision.git
cd loto-ia-vision
npm install
```

### Variables d'environnement
Pour la synchronisation cloud, configurez un store **Vercel Blob** dans `.env.local` :
```env
BLOB_READ_WRITE_TOKEN="votre_token_ici"
```
Sans token, l'application reste pleinement fonctionnelle : tout vit dans le navigateur.

### Lancer le studio en local
```bash
npm run dev
```

### Vérifications
```bash
npx tsc --noEmit   # types
npx eslint src     # lint
npm run build      # build de production
```

---

## 📜 Méthodologie

### Le corpus
Chaque tirage est un vecteur de **25 caractéristiques** : les 5 numéros et la Chance, mais aussi leurs écarts, la somme, la parité, la répartition bas/haut, la distance de récurrence de chaque numéro, la fréquence glissante… Ces données sont normalisées par un `StandardScaler` (moyenne/écart-type calculés sur le corpus d'entraînement uniquement) avant d'être découpées en **fenêtres glissantes de 12 tirages** (réglable : 8, 12 ou 16).

### Les architectures
**Turbo** — `LSTM(64, dropout 10 %, recurrentDropout 10 %)` → `Dense(32, relu)` → `Dense(6)`
**Elite** — `Bi-LSTM(96)` → `Dropout(20 %)` → `Bi-LSTM(48)` → `attention` → `Dense(64, relu)` → `Dropout(10 %)` → `Dense(6)`

La sortie prédit les 6 numéros (5 principaux + Chance) du tirage suivant.

### L'entraînement
Perte **Huber** (robuste aux tirages atypiques), métrique MAE, `validationSplit 10 %`, **early stopping** avec restauration des meilleurs poids, **décroissance du LR** sur plateau (facteur 0,5, plancher 1e-4). L'entraînement cède la main au navigateur entre les époques pour que l'interface reste vivante, et peut être annulé à tout moment.

### L'honnêteté
Un tirage reste aléatoire : ce studio mesure la **conformité statistique** d'une combinaison, pas une probabilité de gain. Le backtest est la seule mesure de qualité revendiquée, et il est conçu sans fuite de données. Les tirages sont récupérés depuis le site public d'archives et mis en cache 10 minutes côté serveur.

---

## 🧱 Stack

| Brique | Rôle |
| --- | --- |
| Next.js 16 (App Router) + React 19 | Interface et routes API |
| TensorFlow.js 4 | Réseau LSTM, entraînement et inférence dans le navigateur |
| Tailwind CSS 4 + Framer Motion | Design system et animations |
| IndexedDB natif + Vercel Blob | Persistance locale et synchronisation cloud |
| Cheerio | Lecture de la source publique des tirages |

---

## ⚖️ Avertissement légal & indépendance

Cette application est un outil d'expérimentation indépendant fondé sur des probabilités mathématiques et l'intelligence artificielle. **Loto IA Vision n'est en aucun cas affiliée, sponsorisée ou liée à la société La Française des Jeux (FDJ).**

**Les jeux d'argent comportent des risques : endettement, isolement, dépendance.** Pour être aidé, appelez le 09 74 75 13 13 (appel non surtaxé).

---

**Développé avec passion par Antigravity Intelligence • © 2026**
