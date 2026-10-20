# 🎱 Loto IA Vision • Studio d'analyse LSTM

![Theme](https://img.shields.io/badge/Theme-Antigravity%20Spatial-blue)
![TensorFlow.js](https://img.shields.io/badge/Intelligence-TensorFlow.js-orange)
![Next.js](https://img.shields.io/badge/Framework-Next.js%2016-black)
![Vercel Blob](https://img.shields.io/badge/Sync-Vercel%20Blob-brightgreen)

**Loto IA Vision** est un laboratoire d'analyse statistique indépendant : un réseau **LSTM** entraîné **entièrement dans le navigateur** (TensorFlow.js) lit l'historique officiel des tirages du Loto, en propose des combinaisons conformes aux régularités observées, et mesure honnêtement ce que ce type de modèle vaut vraiment. Tout est calculé sur les données réelles, rien n'est inventé.

---

## 🚀 Fonctionnalités clés

### 🧠 Réseau LSTM entraîné sur vos données
- **Deux niveaux d'entraînement** : **Turbo** (LSTM 64 unités + dense 32, 24 époques) pour un aller-retour rapide, **Elite** (Bi-LSTM 96 → Bi-LSTM 48 → attention → dense 64, 60 époques) pour l'analyse approfondie.
- **Apprentissage robuste** : perte **Huber**, suivi MAE, **cycle complet par défaut** (24/60 époques), **arrêt anticipé optionnel** dans les réglages avancés, restauration systématique du **meilleur checkpoint de validation**, **décroissance du taux d'apprentissage** sur plateau, découpage validation 10 %.
- **Affinage incrémental** : lorsqu'un modèle de même architecture existe déjà, « Affiner le modèle » réutilise ses poids et son `StandardScaler` au lieu de tout réentraîner ; un badge signale les nouveaux tirages depuis le dernier entraînement.
- **Reprise fidèle** : le `StandardScaler` et l'historique d'entraînement sont persistés avec le modèle, donc une grille générée après rechargement utilise exactement les mêmes normalisation et métriques.
- **Accélération matérielle** : WebGPU → WebGL → CPU, détecté et affiché dans l'en-tête (badge `WEBGPU` / `WEBGL` / `CPU`).

### 🎯 Génération de grilles & conformité
- **Grille proposée** : tirage gaussien guidé par les positions du LSTM, pondéré par la fréquence réelle des numéros, avec contrainte de **5 numéros distincts** et pénalité de recouvrement entre grilles. Plusieurs milliers de candidates sont explorées, puis classées par conformité et diversifiées.
- **Score de conformité calibré** : percentile **1 → 99** obtenu en comparant la grille à **2 000 grilles réellement aléatoires** ; 50 signifie « aussi conforme qu'une grille au hasard », et non un pourcentage de chances de gagner.
- **1 à 5 grilles** : la sélection privilégie la conformité **et** la diversité (recouvrement minimal), avec affichage de la couverture réelle des numéros et de la couverture Chance.
- **Audit de grille** : saisissez vos numéros, le score et les commentaires (somme, parité, répartition) se mettent à jour en direct.

### 📊 Analyse & validation
- **Numéros chauds & froids** : fréquences réelles sur l'historique complet, numéros les plus rares et boules Chance les plus sorties.
- **Backtest honnête** : un modèle est réentraîné sur le passé immédiat (30 époques, cycle complet) avec un `StandardScaler` ajusté **uniquement sur la tranche d'entraînement**, puis rejoué sur les 50 derniers tirages réels — distribution du nombre de bons numéros, taux de grilles ≥ 2 numéros, taux de Chance, et **référence uniforme exacte** (hasard) avec marge de bruit statistique.
- **Journal des pronostics** : chaque grille générée est horodatée et confrontée automatiquement aux tirages réels suivants.
- **Archives** : près de 2 900 tirages (oct. 2008 → aujourd'hui) avec recherche par jour, mois ou numéro.

### ☁️ Persistance
- **IndexedDB** côté client (historique, modèles, scaler, historique d'entraînement, pronostics) : l'application fonctionne hors ligne et reprend un modèle entraîné après rechargement.
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
Perte **Huber** (robuste aux tirages atypiques), métrique MAE, `validationSplit 10 %`, **cycle complet par défaut** (24 époques en Turbo, 60 en Elite), **décroissance du LR** sur plateau (facteur 0,5, plancher 1e-4). L'arrêt anticipé (patience 6/10) reste disponible dans les réglages avancés ; dans tous les cas, le **meilleur checkpoint de validation** est restauré à la fin, jamais le dernier état sur-ajusté. Le scaler est ajusté sur la tranche d'entraînement seule, et l'entraînement cède la main au navigateur entre les époques pour que l'interface reste vivante. Il peut être annulé à tout moment ; le modèle et son historique sont alors conservés.

### L'honnêteté
Un tirage reste aléatoire : ce studio mesure la **conformité statistique** d'une combinaison, pas une probabilité de gain. Le score est un percentile calibré contre 2 000 grilles aléatoires ; le backtest est la seule mesure de qualité revendiquée, il est conçu sans fuite de données et affiche la référence exacte du hasard ainsi que la marge de bruit. Un écart dans cette marge ne prouve aucune supériorité. Les tirages sont récupérés depuis le site public d'archives et mis en cache 10 minutes côté serveur.

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
