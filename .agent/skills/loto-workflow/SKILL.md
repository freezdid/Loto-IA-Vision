---
name: loto-workflow
description: Fast development, verification, git synchronization, and Vercel deployment workflow for Loto IA Vision. Use to automate quality checks, testing, Git commits/pushes, and live verification.
version: 1.0.0
---

# Loto IA Vision Workflow Skill

Cette compétence accélère le cycle de développement, de test et de déploiement de **Loto IA Vision**.

## 1. Architecture & Stack
- **Framework** : Next.js 16 (App Router) + React 19 + TypeScript
- **Styling** : Tailwind CSS v4 + Framer Motion (Lucide Icons)
- **IA** : TensorFlow.js (WebGPU / WebGL) + LSTM bidirectionnel
- **Persistance** : Vercel Blob (Cloud) + IndexedDB (Client) + SQLite fallback
- **Hébergement & CI/CD** : Vercel (déploiement automatique sur `git push origin main`)

## 2. Procédure de Vérification Rapide (Checklist)
Avant tout commit ou push :
1. **Typage TypeScript & Linting** :
   Vérifier l'absence d'erreurs de syntaxe, d'imports manquants ou d'incompatibilités React 19.
2. **Performance TensorFlow.js** :
   S'assurer que les tenseurs sont enveloppés dans `tf.tidy()` ou libérés avec `.dispose()` pour éviter les fuites mémoire.
3. **Persistance des Données** :
   Vérifier que les modifications d'historique et de pronostics appellent la synchronisation Vercel Blob sans bloquer l'UI locale.
4. **Design & Ergonomie (Impeccable Craft)** :
   - Contraste WCAG ≥ 4.5:1 sur les textes et éléments de données.
   - Boules 3D FDJ avec éclairage dynamique et boule Chance dorée.
   - Feedback instantané lors des calculs (skeleton/animation).
   - Bouton de copie rapide de grille pour jouer sur FDJ.

## 3. Déploiement & Synchronisation Git
Lorsque les modifications sont validées :
```bash
git add .
git commit -m "feat/fix: <description concise et explicite>"
git push origin main
```
> Le push sur `origin main` déclenche automatiquement le build et le déploiement sur Vercel.

## 4. Points de Contrôle Post-Déploiement
- Tester `/api/sync?type=draws` pour vérifier l'accès Vercel Blob.
- Tester `/api/loto` pour s'assurer du scraping des derniers tirages.
- Vérifier la console du navigateur (pas d'erreurs d'hydratation ou d'initialisation TF.js).
