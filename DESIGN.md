---
name: Loto IA Vision
description: Studio spatial d'analyse des tirages du Loto — réseau LSTM entraîné dans le navigateur.
colors:
  void: "#020510"
  surface: "#060e20"
  surface-2: "#0b1630"
  line: "rgba(255, 255, 255, 0.08)"
  primary: "#2f7df6"
  primary-deep: "#1256b8"
  primary-soft: "#8fbaff"
  primary-button-top: "#1f6ae0"
  primary-button-bottom: "#0f4aa5"
  chance: "#ffd100"
  success: "#23c98b"
  danger: "#f2555a"
  ink: "#f6f8fc"
  muted: "#9fb0c9"
  faint: "#7b8aa3"
  ball-blue-highlight: "#5cb0ff"
  ball-blue-light: "#4aa3ff"
  ball-blue-core: "#1a70d8"
  ball-blue-shadow: "#0b2f63"
  ball-blue-deep: "#0a2856"
  ball-blue-void: "#061a36"
  ball-gold-highlight: "#fff4ad"
  ball-gold-shadow: "#d99b00"
  ball-gold-deep: "#7c5600"
  ball-gold-deep-sm: "#b57d00"
  ball-gold-ink: "#221a00"
typography:
  display:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 900
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 900
    lineHeight: 1.3
  body:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.6
  small:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.5
  label:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    letterSpacing: "0.08em"
  micro:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 700
    letterSpacing: "0.08em"
  numeric:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 800
    fontFeature: "tnum"
  ball-digit:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.35rem"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.03em"
    fontFeature: "tnum"
rounded:
  panel: "16px"
  control: "12px"
  focus: "8px"
  chip: "9999px"
spacing:
  panel: "20px"
  panel-sm: "24px"
  gutter: "16px"
  tight: "8px"
components:
  button-primary:
    backgroundColor: "{colors.primary-deep}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
  button-primary-hover:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
  button-ghost:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.muted}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "{spacing.panel}"
  chip:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.faint}"
    rounded: "{rounded.chip}"
    padding: "4px 10px"
  number-ball:
    backgroundColor: "{colors.primary-deep}"
    textColor: "{colors.ink}"
    rounded: "{rounded.chip}"
    size: "56px"
  number-ball-sm:
    backgroundColor: "{colors.primary-deep}"
    textColor: "{colors.ink}"
    rounded: "{rounded.chip}"
    size: "34px"
---

# Design System: Loto IA Vision

## Overview

**Creative North Star: « La Salle de Tirage en Apesanteur » ("The Antigravity Draw Room")**

L'interface est une salle de tirage flottant dans le vide : fond nuit quasi noir, un seul projecteur bleu royal en haut de page, des boules 3D chromées qui lévitent au-dessus d'une ombre de contact. Rien d'autre ne bouge. Le monde vient des boules elles-mêmes — verre, reflets, or — et tout le reste de l'écran est un instrument de mesure sobre : panneaux mats, chiffres tabulaires, libellés en petites capitales.

La densité est celle d'un tableau de bord de laboratoire, pas d'un site marketing : chaque panneau répond à une question (quelle grille, avec quelle conformité, entraînée comment, vérifiée sur quoi). L'ambition spatiale est portée par le décor (vide, halo bleu, lévitation) ; les données sont, elles, traitées avec une honnêteté stricte : aucun score inventé, aucune métrique décorative. Le ton ludique est concentré dans un seul geste — les boules — pour que le sérieux du reste soit crédible.

Résultat visé : un objet premium, calme et tactile, où l'on comprend en un regard ce que la machine propose et ce qu'elle ne promet pas.

**Key Characteristics:**
- Vide profond `#020510`, deux élévations de surface seulement, sombre de bout en bout.
- Un seul accent bleu royal ; l'or `#ffd100` est un privilège réservé à la boule Chance.
- Boules 3D photoréalistes en lévitation : le seul moment « authored » de l'interface.
- Chiffres tabulaires partout, libellés en 11 px capitales espacées.
- Aucune donnée inventée : tout indicateur affiché est calculé sur l'historique réel.

## Colors

Une palette nocturne à un accent : bleu royal pour la structure et l'action, or pour la Chance, émeraude pour la validation. Le reste est du vide et du texte.

### Primary
- **Royal Signal** (`#2f7df6`) : l'unique accent. Halo du fond (`radial-gradient` en haut de page), anneaux de focus, barres de progression, pastilles sélectionnées, états « équilibré ».
- **Deep Royal** (`#1256b8`) : couleur de base des actions primaires (fond du bouton principal, logo) et des boules bleues.
- **Starfield Blue** (`#8fbaff`) : bleu d'appoint pour les icônes de titre, chiffres secondaires et textes d'accent sur fond sombre.

### Secondary
- **Jackpot Gold** (`#ffd100`) : réservé à la sphère Chance. Jamais utilisé comme couleur d'action, de lien ou de donnée générique.

### Tertiary
- **Emerald Confirm** (`#23c98b`) : réservé aux validations chiffrées (score de conformité ≥ 75, « 0 réussites » reste neutre, pas vert).
- **Alert Coral** (`#f2555a`) : erreurs et interruptions uniquement.

### Neutral
- **Void** (`#020510`) : fond de page unique ; les dégradés de page partent de là.
- **Surface / Surface-2** (`#060e20` / `#0b1630`) : les deux élévations des panneaux (dégradé vertical entre les deux).
- **Line** (`rgba(255,255,255,0.08)`) : filets et séparateurs internes, jamais des bordures décoratives de carte.
- **Ink** (`#f6f8fc`) : titres, valeurs, chiffres.
- **Muted** (`#9fb0c9`) : texte courant secondaire (contraste ≥ 4.5:1 sur les surfaces).
- **Faint** (`#7b8aa3`) : libellés, métadonnées, légendes (contraste ≥ 4.5:1).

### Shading stops
Les dégradés des deux objets signature ont leurs propres stops, documentés ici pour qu'ils soient des choix assumés et non des littéraux errants :
- **Boule bleue** — `ball-blue-highlight` (reflet), `ball-blue-light` (variante petite boule), `ball-blue-core` (corps), `ball-blue-shadow` / `ball-blue-deep` / `ball-blue-void` (creux, du plus clair au plus profond).
- **Boule Chance** — `ball-gold-highlight`, `chance` (cœur), `ball-gold-shadow`, `ball-gold-deep`, et `ball-gold-ink` (texte brun foncé, jamais noir).
- **Bouton primaire** — `primary-button-top` → `primary-button-bottom` (dégradé vertical du seul CTA plein).

### Named Rules

**The Chance Gold Rule.** L'or n'existe que pour la sphère Chance et ce qui la représente. Un écran sans Chance ne contient aucun pixel doré.

**The One Accent Rule.** Un seul accent bleu par écran, utilisé sur ≤ 10 % de la surface. Sa rareté fait sa force : si tout est bleu, plus rien ne l'est.

## Typography

**Display Font:** DM Sans (Google Fonts, chargée via `next/font`, fallback `ui-sans-serif, system-ui`)  
**Body Font:** DM Sans — une seule famille, jouée par le poids

**Character:** Une géométrique humaniste discrète, utilisée en graisses extrêmes (500 → 900) plutôt qu'en familles multiples. Le contraste vient du poids et de la casse, jamais d'une seconde police.

### Hierarchy
- **Display** (900, 20 px, −0.02em) : titre de page et de carte maîtresse (`text-xl font-black`). Utilisé une fois par vue.
- **Title** (900, 15 px) : titres de panneaux, avec icône 16 px en Starfield Blue.
- **Body** (500, 13 px, 1.6) : texte descriptif des panneaux ; les explications longues sont limitées à ~65 caractères utiles par bloc centré.
- **Small** (500, 12 px) : texte dense des listes, aides contextuelles, états vides. Sert de plancher pour le contenu explicatif.
- **Label** (700, 11 px, +0.08em, capitales) : libellés de tuiles, en-têtes de tableaux, mentions légales. Jamais en gras lourd.
- **Micro** (700, 10 px, +0.08em, capitales) : libellés internes aux tuiles techniques et aux lignes de l'architecture neuronale. Rien d'important ne descend à cette taille.
- **Ball digit** (900, 1.35rem, −0.03em) : les numéros à l'intérieur des sphères, en chiffres tabulaires. C'est la seule occurrence d'un texte à cette taille.
- **Numeric** (800, 14–16 px, `tnum`) : chaque chiffre affiché (compteurs, MAE, score, compte à rebours) est tabulaire pour que les colonnes ne bougent pas d'un tirage à l'autre.

### Named Rules

**The One Family Rule.** Une seule famille de caractères. Toute hiérarchie passe par la graisse, la taille et la casse — jamais par une police additionnelle.

**The Tabular Rule.** Tout nombre aligné ou mis à jour en direct (`tabular-nums`) : un compteur qui « danse » est un bug visuel.

## Layout

Une grille de studio : colonne principale + colonne latérale (12 colonnes, `max-w-[1400px]`), qui s'empile en une seule colonne sur mobile. Les panneaux respirent à 20 px (`sm: 24 px`) et sont séparés par 16 px (`gap-4`) ; sur mobile, l'ordre suit l'importance : indicateurs, grille proposée, entraînement, audit, backtest, fréquences.

Les pages secondaires (Archives, Journal) partagent le même en-tête collant et une largeur de lecture plus serrée (`max-w-[1200px]`). Les archives se déploient en grille de cartes (1 / 2 / 3 / 4 colonnes selon la largeur) ; la pagination se fait par accumulation (« Afficher 24 tirages de plus »), jamais par page numérotée.

## Elevation & Depth

Système tonal, pas de flat design : la profondeur vient de deux choses seulement — un dégradé vertical de surface et une ombre douce portée vers le bas. Les panneaux n'ont volontairement **aucune bordure** : l'élévation est déclarée une fois (`linear-gradient` + `box-shadow`), jamais doublée par un contour décoratif.

### Shadow Vocabulary
- **Panneau posé** (`0 24px 48px -32px rgba(2,5,16,0.95), inset 0 1px 0 rgba(255,255,255,0.05)`) : toute surface `.panel`. L'ombre est large et très diffusée : elle suggère la masse, pas la découpe.
- **Bouton primaire** (`0 10px 22px -12px rgba(18,86,184,0.9), inset 0 1px 0 rgba(255,255,255,0.22)`) : halo bleu court, comme un éclairage de console.
- **Boule 3D** (`0 12px 20px -8px rgba(2,5,16,0.9)` + ombres internes) : l'ombre externe vend la lévitation, les internes vendent la sphère.
- **Ombre de contact** (`.ball-pedestal`, ellipse dégradée) : ancre au sol la seule chose qui flotte.

### Named Rules

**The Declared Elevation Rule.** Une surface = un dégradé + une ombre. Jamais de bordure pour « rassurer », jamais deux ombres sur un même plan.

## Shapes

Deux rayons, pas trois : **16 px** pour les panneaux (`--radius-panel`), **12 px** pour les contrôles (boutons, tuiles, champs, lignes de liste). Les pastilles fines sont entièrement rondes (`rounded-full`) ; les boules sont des cercles parfaits.

Le langage de forme est sphérique : la boule est l'objet de référence, tout le reste est un rectangle à coins doux qui l'accompagne. Il n'y a aucun angle droit dans les surfaces, et aucune forme organique décorative.

## Components

### Buttons
- **Shape** : rectangulaire arrondi 12 px ; jamais de bouton pilule.
- **Primary** : dégradé vertical Deep Royal (`#1f6ae0 → #0f4aa5`), texte blanc 14 px extra-bold, ombre bleue courte ; au survol : −1 px et halo bleu élargi ; à l'appui : +1 px. Désactivé : opacité 45 %.
- **Ghost** : fond `rgba(255,255,255,0.045)` avec reflet interne supérieur, texte Muted ; au survol, le fond monte à 0.09 et le texte passe à Ink. C'est le bouton par défaut pour tout ce qui n'est pas l'action principale d'un panneau.
- Un panneau ne contient **qu'un seul** bouton primaire.

### Chips
- **Shape** : pilule, 11 px bold, padding 10×4 px.
- **Style** : fond neutre `rgba(255,255,255,0.05)` + texte Faint par défaut ; la couleur ne s'allume que pour un état réel (sélectionné = Deep Royal plein ; « Conformité ≥ 75 » = émeraude ; « nouveaux tirages » = or, car lié à une forme de gain potentiel).
- Jamais de chip cliquable qui ne se distingue pas d'un chip d'état : un chip de contrôle (sélecteur de mode, de fenêtre) utilise `aria-pressed` et le fond plein.

### Cards / Containers
- **Corner Style** : 16 px.
- **Background** : dégradé `#0b1630 → #060e20` (opacité 0.92 → 0.94), posé sur le vide.
- **Shadow Strategy** : voir *Panneau posé* — une seule ombre, point.
- **Border** : aucune. Les séparateurs internes sont des filets `rgba(255,255,255,0.08)`.
- **Internal Padding** : 20 px, 24 px à partir de `sm`. Les sous-blocs internes utilisent `rgba(255,255,255,0.035)` (`.panel-flat`, `.tile`).

### Inputs / Fields
- **Style** : fond `rgba(255,255,255,0.05)`, rayon 12 px, aucun contour, texte Ink 14 px ; les entrées numériques de l'audit sont centrées et tabulaires.
- **Focus** : anneau 2 px Royal Signal (`:focus-visible` global), décalé de 2 px ; le champ prend aussi `background 0.08` au survol et au focus.
- **Placeholder** : Faint, jamais un texte de substitution qui ressemble à une valeur.

### Navigation
- **Style** : barre collante translucide (`bg-void/85` + `backdrop-blur-xl`), filet inférieur `rgba(255,255,255,0.08)`. Marque à gauche (icône cerveau sur Deep Royal + nom), actions à droite en boutons ghost ; sur mobile les libellés disparaissent, seules les icônes restent, avec `aria-label`.
- Le compte à rebours du prochain tirage vit dans l'en-tête en chiffres tabulaires (`05h 41m 09s · Mercredi à 20h20`) et se recopie à l'identique dans la tuile KPI « Prochain tirage ».

### Signature Component: la Boule (`.number-ball` / `.number-ball-sm`)
- Sphère 56 px (34 px en petit) : `radial-gradient` décalé en haut à gauche (`#5cb0ff → #1a70d8 → #0b2f63 → #061a36`), ombre portée large + double ombre interne (creux bas, reflet haut).
- Version Chance : mêmes recettes en or (`#fff4ad → #ffd100 → #d99b00 → #7c5600`), texte brun foncé `#221a00`, halo doré de 22 px.
- Micro-interactions : survol +5 %, appui −5 %, clic = rotation 360° sur Y (0,7 s). La lévitation (translation verticale 4,6 s, décalée par index) et l'entrée en cascade des boules sont les seules animations « authorées » ; tout le reste de l'interface se limite à 200 ms.
- Toutes les animations de la boule sont en CSS pur (`ball-in`, `ball-float`, `ball-tap`) : identiques côté serveur et client, et désactivées par `prefers-reduced-motion`.

## Do's and Don'ts

### Do:
- **Do** réserver l'or (`#ffd100`) à la sphère Chance — *The Chance Gold Rule*.
- **Do** utiliser `font-variant-numeric: tabular-nums` pour tout chiffre, y compris les compteurs en direct.
- **Do** calculer chaque indicateur affiché sur l'historique réel ; un score sans données doit afficher « — », pas un chiffre plausible.
- **Do** garder un seul bouton primaire par panneau, et des ombres déclarées une fois (*The Declared Elevation Rule*).
- **Do** respecter `prefers-reduced-motion` en CSS (media query globale), jamais par une branche JavaScript au rendu.

### Don't:
- **Don't** utiliser l'or comme couleur d'action, de lien ou de graphique générique.
- **Don't** ajouter une bordure décorative à un panneau : l'élévation est déjà déclarée par l'ombre et le dégradé.
- **Don't** introduire une seconde famille de caractères ou un second accent coloré (pas de cyan, pas de violet).
- **Don't** afficher une valeur temporelle (compte à rebours, durée) rendue côté serveur : état vide déterministe au premier rendu, mise à jour au montage.
- **Don't** promettre un gain : l'interface dit « conformité statistique », jamais « probabilité de gagner ».
